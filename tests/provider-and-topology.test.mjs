import test from "node:test";
import assert from "node:assert/strict";
import { providerConfig, NEMOTRON_MODEL } from "../lib/ai-provider.ts";
import { parseEngineerPrompt, explainApprovedChange } from "../lib/ai.ts";
import { DEFAULT_CAMERA, projectPoint, userCategory } from "../lib/topology-view.ts";
import { defaultScenario, simulate } from "../lib/simulation.ts";

const envSnapshots = new WeakMap();
function setEnv(t, name, value) {
  if (!envSnapshots.has(t)) {
    const original = new Map();
    envSnapshots.set(t, original);
    t.after(() => { for (const [key, previous] of original) { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; } });
  }
  const original = envSnapshots.get(t);
  if (!original.has(name)) original.set(name, process.env[name]);
  process.env[name] = value;
}

test("provider selection requires a matching server key and honors explicit local mode", (t) => {
  setEnv(t, "AI_MODE", "openrouter");
  setEnv(t, "OPENROUTER_API_KEY", "");
  assert.equal(providerConfig().mode, "mock");
  setEnv(t, "OPENROUTER_API_KEY", "test-placeholder");
  setEnv(t, "OPENROUTER_MODEL", "");
  assert.deepEqual(providerConfig(), { mode: "openrouter", model: NEMOTRON_MODEL });
  setEnv(t, "AI_MODE", "mock");
  assert.equal(providerConfig().mode, "mock");
  setEnv(t, "AI_MODE", "gemini");
  setEnv(t, "GEMINI_API_KEY", "gemini-placeholder");
  assert.equal(providerConfig().mode, "gemini");
});

function setupProvider(t, handler) {
  setEnv(t, "AI_MODE", "openrouter");
  setEnv(t, "OPENROUTER_API_KEY", "test-placeholder");
  setEnv(t, "OPENROUTER_MODEL", NEMOTRON_MODEL);
  t.mock.method(globalThis, "fetch", handler);
}
const proposal = { status: "proposal", siteId: "cell-b", deltaPowerDb: 3, interpretation: "Increase Central Hub transmit power.", question: "" };
const completion = (data) => Response.json({ choices: [{ message: { content: JSON.stringify(data) }, finish_reason: "stop" }] });

test("OpenRouter requests bounded structured JSON and labels only validated responses live", async (t) => {
  setupProvider(t, async (url, options) => {
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(options.body);
    assert.equal(body.model, NEMOTRON_MODEL);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.response_format.json_schema.schema.additionalProperties, false);
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal("tools" in body, false);
    return completion(proposal);
  });
  const result = await parseEngineerPrompt("Increase Cell B by 3 dB");
  assert.equal(result.source, "OPENROUTER_LIVE");
  assert.deepEqual(result.change, { siteId: "cell-b", deltaPowerDb: 3 });
});

test("provider errors, malformed JSON, empty and truncated content safely fall back", async (t) => {
  const cases = [() => new Response("private-provider-details", { status: 401 }), () => Response.json({ error: "quota" }), () => Response.json({ choices: [{ message: { content: "{broken" } }] }), () => Response.json({ choices: [{ message: { content: JSON.stringify(proposal) }, finish_reason: "length" }] })];
  setupProvider(t, async () => cases.shift()());
  for (let i = 0; i < 4; i++) {
    const result = await parseEngineerPrompt("Increase Cell B by 3 dB");
    assert.equal(result.source, "MOCK_FALLBACK");
    assert.deepEqual(result.change, { siteId: "cell-b", deltaPowerDb: 3 });
    assert.ok(!JSON.stringify(result).includes("private-provider-details"));
  }
});

test("AI cannot bypass site, integer or power bounds", async (t) => {
  const cases = [{ ...proposal, siteId: "cell-z" }, { ...proposal, deltaPowerDb: 2.5 }, { ...proposal, deltaPowerDb: 99 }];
  setupProvider(t, async () => completion(cases.shift()));
  for (let i = 0; i < 3; i++) {
    const result = await parseEngineerPrompt("Increase Cell B by 3 dB");
    assert.ok(result.source === "MOCK_FALLBACK" || result.change === null);
  }
});

test("network timeout falls back for parsing and review without exposing upstream details", async (t) => {
  setupProvider(t, async () => { throw new DOMException("private-upstream-timeout-details", "TimeoutError"); });
  const parsed = await parseEngineerPrompt("Increase Cell B by 3 dB");
  const review = await explainApprovedChange({ siteId: "cell-b", deltaPowerDb: 3 });
  for (const result of [parsed, review]) {
    assert.equal(result.source, "MOCK_FALLBACK");
    assert.ok(!JSON.stringify(result).includes("private-upstream-timeout-details"));
  }
  assert.deepEqual(parsed.change, { siteId: "cell-b", deltaPowerDb: 3 });
  assert.ok(review.observations.join(" ").includes(String(simulate(defaultScenario(), parsed.change).proposed.coveragePct)));
});

test("live review preserves engine observations and rejects invented numerical claims", async (t) => {
  const responses = [{ summary: "Synthetic model only; engineering review remains necessary.", checks: ["Review measured interference."], rollback: ["Record the prior power setting."] }, { summary: "Coverage will improve by 99 percent.", checks: ["Review measured interference."], rollback: ["Record the prior setting."] }];
  setupProvider(t, async () => completion(responses.shift()));
  const change = { siteId: "cell-b", deltaPowerDb: 3 };
  const result = await explainApprovedChange(change);
  assert.equal(result.source, "OPENROUTER_LIVE");
  const outcome = simulate(defaultScenario(), change);
  assert.ok(result.observations.join(" ").includes(String(outcome.proposed.coveragePct)));
  const invalid = await explainApprovedChange(change);
  assert.equal(invalid.source, "MOCK_FALLBACK");
  assert.deepEqual(result.observations, invalid.observations);
});

test("2D projection preserves distances and all 3D sites stay in frame through a full rotation", () => {
  const a = projectPoint(0, 0, 0, DEFAULT_CAMERA);
  const b = projectPoint(100, 0, 0, DEFAULT_CAMERA);
  const c = projectPoint(0, 100, 0, DEFAULT_CAMERA);
  assert.ok(Math.abs((b.x - a.x) - (c.y - a.y)) < 1e-10);
  for (let rotation = -Math.PI; rotation <= Math.PI; rotation += 0.1) {
    for (const cell of defaultScenario().cells) {
      for (const z of [0, 105]) {
        const p = projectPoint(cell.x, cell.y, z, { ...DEFAULT_CAMERA, mode: "3d", rotation });
        assert.ok(p.x > 75 && p.x < 925 && p.y > 60 && p.y < 590, JSON.stringify(p));
      }
    }
  }
});

test("user statuses use baseline facts and the selected before/after phase", () => {
  const outcome = simulate(defaultScenario(), { siteId: "cell-c", deltaPowerDb: -6 });
  for (const user of outcome.before) assert.equal(userCategory(user.id, user, outcome, "before"), user.covered ? "covered" : "uncovered");
  for (const id of outcome.proposed.newlyUncovered) assert.equal(userCategory(id, outcome.after.find((u) => u.id === id), outcome, "after"), "lost");
  assert.equal(userCategory("unknown", undefined, null, "before"), "unknown");
});

import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { defaultScenario, simulate } from "../lib/simulation.ts";

const base = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "Integration checks must target a local server");
const health = await (await fetch(new URL("/api/health", base))).json();
assert.equal(health.aiMode, "mock", "Start an isolated server with AI_MODE=mock; these tests must not make paid AI calls");

// Reserved documentation IP hints isolate test runs, not authorization.
const runTag = randomBytes(4).toString("hex");
const client = (index) => `2001:db8:${runTag.slice(0, 4)}:${runTag.slice(4)}::${index}`;
async function request(endpoint, body, options = {}) {
  const response = await fetch(new URL(endpoint, base), {
    method: body === undefined ? "GET" : "POST",
    ...options,
    headers: { "Content-Type": "application/json", "x-forwarded-for": client(20), ...options.headers },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
  const data = await response.json();
  assert.match(response.headers.get("content-type"), /application\/json/);
  return { response, data };
}
const change = { siteId: "cell-b", deltaPowerDb: 3 };

test("scenario is repeatable and its initial evidence matches the engine", async () => {
  const a = await request("/api/scenario");
  const b = await request("/api/scenario");
  assert.equal(a.response.status, 200);
  assert.equal(a.response.headers.get("cache-control"), "no-store");
  assert.deepEqual(a.data, b.data);
  assert.equal(a.data.scenario.cells.length, 5);
  assert.equal(a.data.scenario.users.length, 100);
  assert.equal(a.data.baseline.coverage.tiles.length, 625);
  assert.deepEqual(a.data.baseline.metrics, simulate(defaultScenario(), change).baseline);
});

test("health and key summaries disclose configuration metadata without credential fields", async () => {
  const status = await request("/api/health");
  const key = await request("/api/key");
  assert.equal(status.data.aiMode, "mock");
  assert.equal(status.data.providerConfigured, false);
  assert.deepEqual(Object.keys(key.data).sort(), ["configured", "mode", "model"]);
  assert.equal(key.data.configured, false);
  assert.equal(key.response.headers.get("cache-control"), "no-store");
});

test("real local parser handles proposals, ambiguity and strict request validation", async () => {
  const options = { headers: { "x-forwarded-for": client(21) } };
  const valid = await request("/api/ai/parse", { prompt: "Increase Cell B power by 3 dB" }, options);
  assert.equal(valid.response.status, 200);
  assert.equal(valid.data.source, "MOCK_LOCAL");
  assert.deepEqual(valid.data.change, change);
  const unclear = await request("/api/ai/parse", { prompt: "Cell B power 3 dB" }, options);
  assert.equal(unclear.data.status, "clarify");
  assert.equal(unclear.data.change, null);
  for (const body of [{ prompt: "" }, { prompt: "x".repeat(321) }, { prompt: 42 }, { prompt: "Increase Cell B by 3 dB", extra: true }, "{broken"]) {
    const result = await request("/api/ai/parse", body, options);
    assert.equal(result.response.status, 400);
    assert.equal(typeof result.data.error, "string");
  }
});

test("all sites accept −6, zero and +6 through the real simulation route", async () => {
  for (const siteId of ["cell-a", "cell-b", "cell-c", "cell-d", "cell-e"]) {
    for (const deltaPowerDb of [-6, 0, 6]) {
      const input = { siteId, deltaPowerDb };
      const { response, data } = await request("/api/simulate", input);
      assert.equal(response.status, 200, JSON.stringify(input));
      const expected = simulate(defaultScenario(), input);
      for (const key of ["baseline", "proposed", "delta", "before", "after", "cellsAfter"]) assert.deepEqual(data[key], expected[key]);
      assert.equal(data.coverage.tiles.length, 625);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
  }
});

test("simulation rejects unknown sites, fractional/oversized deltas and injected metadata", async () => {
  for (const body of [null, [], {}, { siteId: "cell-z", deltaPowerDb: 3 }, { siteId: "cell-b", deltaPowerDb: 6.1 }, { siteId: "cell-b", deltaPowerDb: -7 }, { siteId: "cell-b", deltaPowerDb: "3" }, { ...change, approved: true }, { ...change, proposed: { coveragePct: 100 } }]) {
    const { response, data } = await request("/api/simulate", JSON.stringify(body));
    assert.equal(response.status, 400);
    assert.equal(typeof data.error, "string");
  }
});

test("POST routes reject cross-origin, wrong content types and oversized bodies", async () => {
  for (const endpoint of ["/api/ai/parse", "/api/simulate", "/api/ai/explain"]) {
    const options = { headers: { "x-forwarded-for": client(22) } };
    const cross = await request(endpoint, change, { headers: { ...options.headers, Origin: "https://untrusted.invalid" } });
    assert.equal(cross.response.status, 403);
    const wrongType = await request(endpoint, change, { headers: { ...options.headers, "Content-Type": "text/plain" } });
    assert.equal(wrongType.response.status, 400);
    const tooLarge = await request(endpoint, { prompt: "x".repeat(2100) }, options);
    assert.equal(tooLarge.response.status, 400);
  }
  const alias = await request("/api/simulate", change, { headers: { Origin: `http://localhost:${base.port}` } });
  assert.equal(alias.response.status, 200);
});

test("review recomputes evidence and rejects client-provided KPI claims", async () => {
  const valid = await request("/api/ai/explain", change, { headers: { "x-forwarded-for": client(23) } });
  assert.equal(valid.response.status, 200);
  assert.equal(valid.data.source, "MOCK_LOCAL");
  assert.ok(valid.data.observations.join(" ").includes(String(simulate(defaultScenario(), change).proposed.coveragePct)));
  const forged = await request("/api/ai/explain", { ...change, metrics: { coveragePct: 100 } }, { headers: { "x-forwarded-for": client(23) } });
  assert.equal(forged.response.status, 400);
});

test("unsupported credential writes and simulation reads return 405", async () => {
  const write = await fetch(new URL("/api/key", base), { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  assert.equal(write.status, 405);
  const read = await fetch(new URL("/api/simulate", base));
  assert.equal(read.status, 405);
});

test("environment, Git and server source paths are not exposed as public files", async () => {
  for (const endpoint of ["/.env.local", "/.git/config", "/lib/ai-provider.ts", "/this-route-does-not-exist"]) {
    const response = await fetch(new URL(endpoint, base));
    assert.equal(response.status, 404, endpoint);
    assert.match(await response.text(), /This workspace route does not exist/);
  }
});

test("AI parser rate limit returns 429 without compromising the next client's local bucket", async () => {
  for (let i = 0; i < 13; i++) {
    const result = await request("/api/ai/parse", { prompt: "Increase Cell B power by 3 dB" }, { headers: { "x-forwarded-for": client(24) } });
    assert.equal(result.response.status, i < 12 ? 200 : 429);
    if (i === 12) assert.match(result.data.error, /limit/i);
  }
  const independent = await request("/api/ai/parse", { prompt: "Increase Cell B power by 3 dB" }, { headers: { "x-forwarded-for": client(25) } });
  assert.equal(independent.response.status, 200);
});

import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { PRESET_SCENARIOS } from "../lib/safety-case-export.ts";
import { defaultScenario, simulate } from "../lib/simulation.ts";

const base = new URL(process.env.BASE_URL || "http://127.0.0.1:3000");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "Feature tests must target a local server");
assert.equal((await (await fetch(new URL("/api/health", base))).json()).aiMode, "mock", "Feature tests require AI_MODE=mock and must not call a paid provider");
const name = process.env.BROWSER || "chromium";
const type = { chromium, firefox, webkit }[name];
assert.ok(type, "BROWSER must be chromium, firefox or webkit");
const output = process.env.UI_SCREENSHOT_DIR || `artifacts/features-${name}`;
await fs.mkdir(output, { recursive: true });
const browser = await type.launch();
const report = [];
const runTag = randomBytes(4).toString("hex");
const cases = [
  { theme: "dark", width: 1440, height: 1000, method: "describe", change: { siteId: "cell-b", deltaPowerDb: 3 } },
  { theme: "light", width: 1440, height: 1000, method: "manual", change: { siteId: "cell-c", deltaPowerDb: -6 } },
  { theme: "dark", width: 390, height: 844, method: "preset", change: { siteId: "cell-a", deltaPowerDb: 6 } },
  { theme: "light", width: 390, height: 844, method: "manual", change: { siteId: "cell-d", deltaPowerDb: 0 } },
];
try {
  for (const [index, scenario] of cases.entries()) {
    const { theme, width, height, method, change } = scenario;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", acceptDownloads: true, extraHTTPHeaders: { "x-forwarded-for": `2001:db8:${runTag.slice(0, 4)}:${runTag.slice(4)}::${40 + index}` } });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(base.href, { waitUntil: "domcontentloaded" });
      await page.locator("#site option").nth(4).waitFor({ state: "attached" });
      if (theme === "light") await page.getByRole("button", { name: "Switch to light theme" }).click();
      const confirm = page.getByRole("checkbox", { name: "I confirm this change for simulation" });
      const run = page.getByRole("button", { name: "Run simulation", exact: true });
      assert.ok(await run.isDisabled());

      if (method === "manual") {
        await page.getByRole("button", { name: "Set manually", exact: true }).click();
        await page.locator("#site").selectOption(change.siteId);
        await page.locator("#delta").fill(String(change.deltaPowerDb));
      } else {
        if (method === "preset") {
          await page.locator(".examples summary").click();
          const preset = PRESET_SCENARIOS.find((item) => item.siteId === change.siteId && item.deltaPowerDb === change.deltaPowerDb);
          await page.getByRole("button", { name: preset.shortLabel, exact: true }).click();
        }
        if (index === 0) {
          await page.route("**/api/ai/parse", (route) => route.fulfill({ status: 503, json: { error: "Interpretation unavailable. Retry your instruction." } }), { times: 1 });
          await page.getByRole("button", { name: "Interpret change", exact: true }).click();
          await page.locator('.notice[role="alert"]').waitFor();
          assert.ok(await confirm.isDisabled());
          assert.ok(await run.isDisabled());
          await page.getByRole("button", { name: "Dismiss alert" }).click();
        }
        const parsedResponse = page.waitForResponse((response) => response.url().endsWith("/api/ai/parse") && response.status() === 200);
        await page.getByRole("button", { name: "Interpret change", exact: true }).click();
        const parsed = await (await parsedResponse).json();
        assert.equal(parsed.source, "MOCK_LOCAL");
        assert.deepEqual(parsed.change, change);
      }
      await confirm.click();
      assert.equal(await confirm.getAttribute("aria-checked"), "true");
      const resultResponse = page.waitForResponse((response) => response.url().endsWith("/api/simulate") && response.status() === 200);
      await run.click();
      const result = await (await resultResponse).json();
      await page.getByRole("heading", { name: "Change impact", exact: true }).waitFor();
      assert.deepEqual(result.change, change);
      assert.deepEqual(result.proposed, simulate(defaultScenario(), change).proposed);
      assert.equal(await page.getByRole("button", { name: "After", exact: true }).getAttribute("aria-pressed"), "true");

      if (index === 0) {
        // A failed rerun must not advertise the last successful run as the new result.
        await page.route("**/api/simulate", (route) => route.fulfill({ status: 503, json: { error: "Simulation unavailable. Try again." } }), { times: 1 });
        await run.click();
        await page.locator('.notice[role="alert"]').waitFor();
        await page.screenshot({ path: `${output}/rerun-failure-${theme}.png`, fullPage: true });
        assert.equal(await page.getByRole("link", { name: "View results", exact: true }).count(), 0, "A failed rerun must clear stale completion feedback");
        assert.ok(!(await page.locator("#simulation-guidance").innerText()).includes("Simulation complete"));
        await page.getByRole("button", { name: "Dismiss alert" }).click();
        await run.click();
        await page.getByRole("heading", { name: "Change impact", exact: true }).waitFor();
      }

      await page.getByRole("button", { name: "Generate review", exact: true }).click();
      await page.getByText("Validation checklist", { exact: true }).waitFor();
      assert.equal(await page.locator("#ai-review").getAttribute("aria-busy"), "false");
      if (index === 0) {
        await page.route("**/api/ai/explain", (route) => route.fulfill({ status: 503, json: { error: "Review unavailable. Try again." } }), { times: 1 });
        await page.getByRole("button", { name: "Refresh review", exact: true }).click();
        await page.locator('.notice[role="alert"]').waitFor();
        assert.ok(await page.getByText("Validation checklist", { exact: true }).isVisible(), "A failed refresh preserves the last valid review");
        await page.getByRole("button", { name: "Dismiss alert" }).click();
        await page.getByRole("button", { name: "Refresh review", exact: true }).click();
        await page.waitForFunction(() => document.querySelector("#ai-review").getAttribute("aria-busy") === "false");
      }

      for (const format of ["JSON data", "Markdown report"]) {
        const event = page.waitForEvent("download");
        await page.getByRole("button", { name: format, exact: true }).click();
        const download = await event;
        const content = await fs.readFile(await download.path(), "utf8");
        if (format === "JSON data") {
          const exported = JSON.parse(content);
          assert.equal(exported.proposal.siteId, change.siteId);
          assert.equal(exported.proposal.deltaPowerDb, change.deltaPowerDb);
          assert.equal(exported.proposal.parseSource, method === "manual" ? "MANUAL_CONTROL" : "MOCK_LOCAL");
          assert.equal(exported.engineeringReview.source, "MOCK_LOCAL");
          assert.deepEqual(exported.impactSummary.proposed, result.proposed);
        } else assert.match(content, /Rollback/);
        assert.match(content, /synthetic/i);
      }

      const expand = page.locator(".expand-ids-btn");
      if (await expand.count()) {
        assert.ok(await page.locator(".affected-ue-row").count() <= 8);
        await expand.click();
        assert.ok(await page.locator(".affected-ue-row").count() > 8);
        await expand.click();
      }
      const rows = page.locator(".affected-ue-row");
      if (await rows.count()) {
        await rows.first().focus();
        assert.ok(await rows.first().evaluate((element) => element.classList.contains("ue-row-highlighted")));
        assert.equal(await page.locator('.network-svg circle[stroke="var(--text)"]').count(), 1, "Evidence focus highlights its map user");
      }
      await page.getByRole("button", { name: "3D spatial", exact: true }).click();
      await page.getByRole("button", { name: "Rotate view right", exact: true }).click();
      await page.getByRole("button", { name: "2D plan", exact: true }).click();
      assert.equal(await confirm.getAttribute("aria-checked"), "true", "Camera changes preserve approval");
      const otherTheme = theme === "dark" ? "light" : "dark";
      await page.getByRole("button", { name: `Switch to ${otherTheme} theme` }).click();
      assert.ok(await page.getByRole("heading", { name: "Change impact", exact: true }).isVisible());
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("#site option").nth(4).waitFor({ state: "attached" });
      assert.equal(await page.locator("html").getAttribute("data-theme"), otherTheme);
      assert.equal(await confirm.getAttribute("aria-checked"), "false", "Approval does not survive a new page session");
      assert.ok(await run.isDisabled());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(errors.length, 0, errors.join("\n"));
      report.push({ browser: name, theme, width, method, change, status: "passed" });
      console.log(JSON.stringify(report.at(-1)));
    } catch (error) {
      await page.screenshot({ path: `${output}/failure-${index}.png`, fullPage: true });
      throw error;
    } finally { await context.close(); }
  }
  const bootstrap = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  try {
    const page = await bootstrap.newPage();
    await page.route("**/api/scenario", (route) => route.fulfill({ status: 503, json: { error: "Network unavailable" } }), { times: 1 });
    await page.goto(base.href, { waitUntil: "domcontentloaded" });
    await page.locator('.notice[role="alert"]').waitFor();
    assert.ok(await page.getByRole("checkbox", { name: "I confirm this change for simulation" }).isDisabled());
    assert.ok(await page.getByRole("button", { name: "Run simulation", exact: true }).isDisabled());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#site option").nth(4).waitFor({ state: "attached" });
    assert.equal(await page.locator('.notice[role="alert"]').count(), 0);
    assert.ok(await page.getByRole("button", { name: "Interpret change", exact: true }).isEnabled());
    report.push({ browser: name, theme: "dark", width: 390, method: "bootstrap-recovery", status: "passed" });
    console.log(JSON.stringify(report.at(-1)));
  } finally { await bootstrap.close(); }
  await fs.writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
} finally { await browser.close(); }

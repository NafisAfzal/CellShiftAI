import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { simpleParse } from "../lib/ai.ts";
import { defaultScenario, safetyCase, simulate } from "../lib/simulation.ts";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const screenshotDir = process.env.UI_SCREENSHOT_DIR || "artifacts/ui";
await fs.mkdir(screenshotDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const viewports = [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }, { name: "laptop", width: 1280, height: 800 }, { name: "tablet", width: 768, height: 1024 }];
const report = [];
try {
  for (const viewport of viewports) {
   for (const theme of ["dark", "light"]) {
    const capture = viewport.name === "desktop" || viewport.name === "mobile";
    const suffix = `${viewport.name}-${theme}`;
    const animated = viewport.name === "desktop" && theme === "dark";
    const liveFixture = viewport.name === "desktop" && theme === "light";
    const fallbackFixture = viewport.name === "mobile" && theme === "light";
    const context = await browser.newContext({ viewport, reducedMotion: animated ? "no-preference" : "reduce", acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    // Keep UI regression deterministic, including when the paid provider is offline.
    await page.route("**/api/ai/parse", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.fulfill({ json: { ...simpleParse(route.request().postDataJSON().prompt), source: liveFixture ? "OPENROUTER_LIVE" : fallbackFixture ? "MOCK_FALLBACK" : "MOCK_LOCAL", model: liveFixture ? "nvidia/nemotron-3.5-lightning" : "local rule parser", ...(fallbackFixture ? { fallbackReason: "AI is unavailable. Your instruction was interpreted locally." } : {}) } });
    });
    await page.route("**/api/ai/explain", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const change = route.request().postDataJSON();
      await route.fulfill({ json: { ...safetyCase(simulate(defaultScenario(), change)), source: fallbackFixture ? "MOCK_FALLBACK" : "MOCK_LOCAL", model: "deterministic templates", ...(fallbackFixture ? { fallbackReason: "Showing a local review of the computed evidence." } : {}) } });
    });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    if (theme === "light") {
      await page.getByRole("button", { name: "Switch to light theme" }).click();
      assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
      await page.reload({ waitUntil: "domcontentloaded" });
    }
    await page.locator("#site option").nth(4).waitFor({ state: "attached" });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("html").getAttribute("data-theme"), theme);
    assert.match(await page.locator(".workflow-steps [aria-current=step]").innerText(), /Propose/);
    assert.match(await page.locator("#simulation-guidance").innerText(), /Interpret your instruction/);
    assert.equal(await page.getByRole("link", { name: "Start a change", exact: true }).getAttribute("href"), "#change-panel");
    const brand = await page.locator(".wordmark").boundingBox();
    const header = await page.locator(".topbar").boundingBox();
    const headerActions = await page.locator(".top-right").boundingBox();
    assert.ok(brand.x + brand.width < headerActions.x, "Wordmark and header actions must not overlap");
    assert.ok(Math.abs((brand.x + brand.width / 2) - (header.x + header.width / 2)) <= 1, "Wordmark should be centered in the header");
    assert.ok(await page.locator(".wordmark").evaluate((el) => parseFloat(getComputedStyle(el).fontSize) >= 23));
    assert.ok(!(await page.locator("body").innerText()).match(/nemotron|gemini|openrouter/i), "No provider or model names in the ordinary interface");
    await page.locator("#prompt").fill("");
    assert.ok(await page.locator(".parse-action").isDisabled());
    assert.match(await page.locator("#interpret-help").innerText(), /at least 8 characters/);
    await page.locator("#prompt").fill("Increase Cell B power by 3 dB");
    assert.equal(await page.locator(".coverage-fill").count(), 5);
    await page.getByRole("button", { name: "Coverage", exact: true }).click();
    assert.ok(await page.locator(".coverage-layer").evaluate((el) => el.classList.contains("coverage-hidden")));
    await page.getByRole("button", { name: "Coverage", exact: true }).click();
    const wave = page.locator(".signal-wave").first();
    assert.equal(await wave.evaluate((el) => getComputedStyle(el).animationName), animated ? "tower-signal" : "none");
    await page.getByRole("button", { name: "Pause signal motion" }).click();
    if (animated) assert.equal(await wave.evaluate((el) => getComputedStyle(el).animationPlayState), "paused");
    assert.equal(await page.locator(".map-tower").count(), 5);
    assert.ok(await page.getByRole("button", { name: "Run simulation", exact: true }).isDisabled());
    const baselineText = await page.locator(".kpi-grid").innerText();
    assert.ok(!baselineText.includes("—"), "Baseline evidence must be available before simulation");
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo({ top: 0, behavior: "instant" }); });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    assert.equal(await page.evaluate(() => scrollY), 0);
    const initialRun = await page.getByRole("button", { name: "Run simulation", exact: true }).boundingBox();
    console.log(JSON.stringify({ viewport: viewport.name, theme, initialRunBottom: Math.round(initialRun.y + initialRun.height) }));
    if (viewport.width >= 1280) assert.ok(initialRun.y + initialRun.height < 880, "Confirmation and Run must fit in a 900px viewport");
    if (capture) await page.screenshot({ path: `${screenshotDir}/${suffix}.png`, fullPage: true, animations: "disabled" });
    await page.getByRole("button", { name: "3D spatial", exact: true }).click();
    const firstProjection = await page.locator(".ground-plane").getAttribute("points");
    if (viewport.width < 600) {
      for (const selector of [".motion-toggle", ".map-display-options > summary", ".camera-controls button", ".map-toolbar .segmented button"]) {
        const targets = await page.locator(selector).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
        assert.ok(targets.every((height) => height >= 44), `${selector}: touch target below 44px`);
      }
    }
    await page.getByRole("button", { name: "Rotate view right", exact: true }).click();
    assert.notEqual(await page.locator(".ground-plane").getAttribute("points"), firstProjection);
    await page.getByRole("button", { name: "Reset 3D view", exact: true }).click();
    assert.equal(await page.locator(".ground-plane").getAttribute("points"), firstProjection);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    const beforeCoverage = await page.locator(".coverage-fill").evaluateAll((els) => els.map((el) => el.getAttribute("d")).join(""));
    if (capture) await page.screenshot({ path: `${screenshotDir}/${suffix}-3d.png`, fullPage: true, animations: "disabled" });
    await page.getByRole("button", { name: "Interpret change", exact: true }).click();
    assert.ok(await page.locator("#delta").isDisabled());
    await page.getByText(liveFixture ? "AI assisted" : fallbackFixture ? "Local fallback" : "Local assistant", { exact: true }).first().waitFor();
    await page.waitForFunction(() => document.activeElement?.classList.contains("confirmation-control"));
    assert.match(await page.locator(".workflow-steps [aria-current=step]").innerText(), /Confirm & run/);
    assert.ok(!(await page.locator("body").innerText()).match(/nemotron|gemini|openrouter/i), "Successful live-model metadata remains out of product copy");
    const confirm = page.getByRole("checkbox", { name: "I confirm this change for simulation" });
    await confirm.click();
    assert.equal(await confirm.getAttribute("aria-checked"), "true");
    assert.match(await page.locator(".workflow-steps [aria-current=step]").innerText(), /Confirm & run/);
    assert.equal(await page.locator(".completion-link").count(), 0, "Confirmation is not a completed simulation");
    await page.getByRole("button", { name: "Run simulation", exact: true }).click();
    await page.getByRole("heading", { name: "Change impact", exact: true }).waitFor();
    assert.match(await page.locator(".workflow-steps [aria-current=step]").innerText(), /Review impact/);
    assert.match(await page.locator("#simulation-guidance").innerText(), /Simulation complete/);
    await page.getByRole("link", { name: "View results", exact: true }).click();
    await page.waitForFunction(() => {
      const box = document.querySelector("#impact").getBoundingClientRect();
      return box.top >= -1 && box.top < innerHeight;
    });
    const afterCoverage = await page.locator(".coverage-fill").evaluateAll((els) => els.map((el) => el.getAttribute("d")).join(""));
    assert.notEqual(afterCoverage, beforeCoverage, "The coverage field must update after the confirmed change");
    assert.equal(await page.getByRole("button", { name: "After", exact: true }).getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "Before", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Before", exact: true }).getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "After", exact: true }).click();
    assert.match(await page.locator("#export-scope").innerText(), /Simulation evidence is ready/);
    const evidenceDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "JSON data", exact: true }).click();
    const evidenceDownload = await evidenceDownloadPromise;
    assert.equal(JSON.parse(await fs.readFile(await evidenceDownload.path(), "utf8")).engineeringReview, null);
    assert.match(await page.locator(".download-status").innerText(), /JSON download started/);
    const reviewActionTop = await page.locator(".explain-action-btn").evaluate((el) => el.getBoundingClientRect().top + scrollY);
    const exportTop = await page.locator(".artifact-btn-row").evaluate((el) => el.getBoundingClientRect().top + scrollY);
    await page.getByRole("button", { name: "Generate review", exact: true }).click();
    assert.equal(await page.locator("#ai-review").getAttribute("aria-busy"), "true");
    assert.ok(await page.locator(".export-json").isDisabled());
    await page.getByText("Validation checklist", { exact: true }).waitFor();
    assert.match(await page.locator("#export-scope").innerText(), /current engineering review/);
    assert.equal(await page.locator(".observation-item .text-emerald").count(), 0, "Observations do not imply favorable outcomes");
    assert.ok(Math.abs(await page.locator(".explain-action-btn").evaluate((el) => el.getBoundingClientRect().top + scrollY) - reviewActionTop) < 1, "Review action must stay in place when content arrives");
    assert.ok(Math.abs(await page.locator(".artifact-btn-row").evaluate((el) => el.getBoundingClientRect().top + scrollY) - exportTop) < 1, "Exports must stay in place when content arrives");
    await page.getByRole("button", { name: "Refresh review", exact: true }).click();
    assert.equal(await page.locator("#ai-review").getAttribute("aria-busy"), "true");
    await page.getByRole("button", { name: "Refresh review", exact: true }).waitFor();
    assert.equal(await page.locator("#ai-review").getAttribute("aria-busy"), "false");
    assert.ok(!(await page.locator("body").innerText()).match(/nemotron|gemini|openrouter|firestore|local parser|evidence template/i), "Product copy must remain free of provider and implementation terms");
    if (viewport.name === "desktop") {
      await page.getByRole("button", { name: `Switch to ${theme === "dark" ? "light" : "dark"} theme` }).click();
      assert.ok(await page.getByRole("heading", { name: "Change impact", exact: true }).isVisible());
      assert.equal(await confirm.getAttribute("aria-checked"), "true");
      await page.getByRole("button", { name: `Switch to ${theme} theme` }).click();
    }
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "JSON data", exact: true }).click();
    const download = await downloadPromise;
    const exported = JSON.parse(await fs.readFile(await download.path(), "utf8"));
    assert.equal(exported.proposal.humanApprovedForSimulation, true);
    assert.equal(exported.proposal.siteId, "cell-b");
    assert.equal(exported.impactSummary.proposed.coveragePct, simulate(defaultScenario(), { siteId: "cell-b", deltaPowerDb: 3 }).proposed.coveragePct);
    assert.ok(exported.engineeringReview);
    const markdownPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Markdown report", exact: true }).click();
    const markdown = await markdownPromise;
    assert.ok(markdown.suggestedFilename().endsWith(".md"));
    const markdownText = await fs.readFile(await markdown.path(), "utf8");
    assert.ok(markdownText.includes(exported.engineeringReview.headline));
    assert.ok(markdownText.includes("Rollback"));
    assert.match(await page.locator(".download-status").innerText(), /Markdown download started/);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    if (capture) await page.screenshot({ path: `${screenshotDir}/${suffix}-impact.png`, fullPage: true, animations: "disabled" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `${viewport.name}: horizontal overflow`);
    // Choosing the current site keeps results; changing a parameter revokes approval.
    await page.getByRole("button", { name: "Select Central Hub", exact: true }).click();
    assert.ok(await page.getByRole("heading", { name: "Change impact", exact: true }).isVisible());
    await page.locator(".parameter-editor summary").click();
    await page.locator("#delta").fill("2");
    assert.equal(await confirm.getAttribute("aria-checked"), "false");
    assert.ok(await page.getByRole("button", { name: "Run simulation", exact: true }).isDisabled());
    await page.getByRole("button", { name: "Describe", exact: true }).click();
    await page.locator("#prompt").fill("Cell B 3 dB");
    await page.getByRole("button", { name: "Interpret change", exact: true }).click();
    await page.locator(".parse-result p").filter({ hasText: "Please specify whether to increase" }).waitFor();
    assert.ok(await confirm.isDisabled(), "Clarification must block approval of an unrelated draft");
    await page.getByRole("button", { name: "Set manually", exact: true }).click();
    assert.ok(await confirm.isEnabled());
    await page.getByRole("button", { name: "Reset scenario to baseline", exact: true }).click();
    assert.ok(await page.getByRole("heading", { name: "Network baseline", exact: true }).isVisible());
    assert.equal(errors.length, 0, errors.join("\n"));
    report.push({ viewport: viewport.name, theme, width: viewport.width, overflow, errors, workflow: "passed", initialRunBottom: Math.round(initialRun.y + initialRun.height), screenshots: capture ? [`${suffix}.png`, `${suffix}-3d.png`, `${suffix}-impact.png`] : [] });
    await context.close();
   }
  }
  await fs.writeFile(`${screenshotDir}/ui-regression.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }

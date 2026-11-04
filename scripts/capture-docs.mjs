import { chromium } from "playwright";
import fs from "node:fs/promises";
import { simpleParse } from "../lib/ai.ts";
import { defaultScenario, safetyCase, simulate } from "../lib/simulation.ts";

// Actual UI screenshots; intercepted AI routes ensure no paid provider calls.
const base = process.env.BASE_URL || "http://127.0.0.1:3000";
await fs.mkdir("docs/media", { recursive: true });
const browser = await chromium.launch();
try {
  for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/ai/parse", (route) => route.fulfill({ json: { ...simpleParse(route.request().postDataJSON().prompt), source: "MOCK_LOCAL", model: "local deterministic parser" } }));
    await page.route("**/api/ai/explain", (route) => route.fulfill({ json: { ...safetyCase(simulate(defaultScenario(), route.request().postDataJSON())), source: "MOCK_LOCAL", model: "deterministic templates" } }));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.locator("#site option").nth(4).waitFor({ state: "attached" });
    if (theme === "light") await page.getByRole("button", { name: "Switch to light theme" }).click();
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: "2D plan", exact: true }).click();
    await page.locator(".topology-panel").screenshot({ path: `docs/media/topology-2d-${theme}.jpg`, type: "jpeg", quality: 92, animations: "disabled" });
    await page.getByRole("button", { name: "3D spatial", exact: true }).click();
    await page.locator(".topology-panel").screenshot({ path: `docs/media/topology-3d-${theme}.jpg`, type: "jpeg", quality: 92, animations: "disabled" });
    await page.locator("#prompt").fill("Increase Cell B power by 3 dB");
    await page.getByRole("button", { name: "Interpret change", exact: true }).click();
    await page.getByRole("checkbox", { name: "I confirm this change for simulation" }).click();
    await page.getByRole("button", { name: "Run simulation", exact: true }).click();
    await page.getByRole("heading", { name: "Change impact", exact: true }).waitFor();
    await page.getByRole("button", { name: "Generate review", exact: true }).click();
    await page.getByText("Validation checklist", { exact: true }).waitFor();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `docs/media/workspace-${theme}.jpg`, type: "jpeg", quality: 92, animations: "disabled" });
    await page.locator(".review-panel").screenshot({ path: `docs/media/review-${theme}.jpg`, type: "jpeg", quality: 92, animations: "disabled" });
    if (theme === "dark") {
      await page.setViewportSize({ width: 390, height: 1000 });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.screenshot({ path: "docs/media/mobile-dark.jpg", type: "jpeg", quality: 92, animations: "disabled" });
    }
    if (errors.length) throw new Error(`${theme}: ${errors.length} browser errors`);
    await context.close();
    console.log(`${theme}: captured workspace, 2D/3D topology and review.`);
  }
} finally { await browser.close(); }

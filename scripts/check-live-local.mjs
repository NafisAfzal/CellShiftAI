import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator("#site option").nth(4).waitFor({ state: "attached" });
  const beforeStatus = await page.locator(".top-right").innerText();
  assert.ok(!beforeStatus.match(/nemotron|gemini|openrouter/i));
  const parseResponsePromise = page.waitForResponse((r) => r.url().endsWith("/api/ai/parse"));
  await page.getByRole("button", { name: "Interpret change", exact: true }).click();
  const parsed = await (await parseResponsePromise).json();
  assert.equal(parsed.source, "OPENROUTER_LIVE");
  await page.getByRole("checkbox", { name: "I confirm this change for simulation" }).click();
  await page.getByRole("button", { name: "Run simulation", exact: true }).click();
  await page.getByRole("heading", { name: "Change impact", exact: true }).waitFor();
  const reviewResponsePromise = page.waitForResponse((r) => r.url().endsWith("/api/ai/explain"));
  await page.getByRole("button", { name: "Generate review", exact: true }).click();
  const review = await (await reviewResponsePromise).json();
  assert.equal(review.source, "OPENROUTER_LIVE");
  assert.ok(await page.locator(".parse-result").getByText("AI assisted", { exact: true }).isVisible());
  assert.ok(!(await page.locator("body").innerText()).match(/nemotron|gemini|openrouter/i));
  console.log(JSON.stringify({ intent: parsed.source, review: review.source, model: review.model, humanConfirmation: true, numericObservations: review.observations.length }));
} finally { await browser.close(); }

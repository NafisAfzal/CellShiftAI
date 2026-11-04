import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const output = process.env.UI_SCREENSHOT_DIR || "artifacts/topology";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const widths = [320, 390, 600, 601, 768, 1024, 1280, 1440, 1920];

async function inspect(page, compact, requireFullPlane = true) {
  const geometry = await page.evaluate(({ compact, requireFullPlane }) => {
    const box = (el) => { const r = el.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom }; };
    const contains = (outer, inner) => inner.x >= outer.x-1 && inner.y >= outer.y-1 && inner.right <= outer.right+1 && inner.bottom <= outer.bottom+1;
    const svg = box(document.querySelector(".network-svg"));
    const toolbar = box(document.querySelector(".map-toolbar"));
    const failures = [];
    for (const el of document.querySelectorAll(".map-toolbar > div")) if (!contains(toolbar, box(el))) failures.push(`Toolbar overflow: ${el.className}`);
    for (const el of document.querySelectorAll(".map-tower > rect,.tower-letter,.tower-hit-area")) {
      if (!el.checkVisibility()) continue;
      const bounds = box(el);
      if (!contains(svg, bounds)) failures.push(`Clipped ${el.getAttribute("class") || "site label"}`);
      if (compact && el.matches(".tower-hit-area") && bounds.width < 44-0.1) failures.push(`Small site target ${bounds.width}`);
    }
    if (requireFullPlane && !contains(svg, box(document.querySelector(".ground-plane")))) failures.push("Default field cropped");
    const status = box(document.querySelector(".map-status"));
    if (status.y < svg.bottom-1) failures.push("Readout covers plot");
    const cameraEl = document.querySelector(".camera-controls");
    if (cameraEl && box(cameraEl).bottom > svg.y+1) failures.push("Camera controls cover plot");
    if (document.documentElement.scrollWidth > innerWidth) failures.push("Page overflow");
    return { failures, svg, ground:box(document.querySelector(".ground-plane")), status };
  }, { compact, requireFullPlane });
  assert.deepEqual(geometry.failures, []);
  return geometry;
}

try {
  for (const width of widths) for (const theme of ["dark", "light"]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(baseUrl);
    if (theme === "light") await page.getByRole("button", { name: "Switch to light theme" }).click();
    await page.locator("#site option").nth(4).waitFor({ state: "attached" });
    await page.evaluate(() => document.fonts.ready);
    const modes = [];
    for (const mode of ["2D plan", "3D spatial"]) {
      await page.getByRole("button", { name: mode, exact: true }).click();
      const geometry = await inspect(page, width <= 600);
      modes.push({ mode, ...geometry });
      if ([390,768,1440].includes(width)) {
        await page.mouse.move(0,0);
        await page.evaluate(() => document.activeElement?.blur());
        await page.locator(".topology-panel").screenshot({ path:`${output}/${width}-${theme}-${mode.startsWith("2D")?"2d":"3d"}.png`, animations:"disabled" });
      }
    }
    const initialFrame = await page.locator(".network-svg").getAttribute("viewBox");
    await page.getByRole("button", { name: "Select Harbor", exact: true }).click();
    assert.equal(await page.locator(".network-svg").getAttribute("viewBox"), initialFrame, "Selecting must not reframe the camera");
    // Browser sweep complements the exhaustive pure geometry tests.
    if ([390,1440].includes(width)) {
      for (const tilt of ["0.45","1.15"]) {
        await page.locator(".map-display-options summary").click();
        await page.locator("#tilt").fill(tilt);
        await page.locator(".map-display-options summary").click();
        for (const zoom of ["min","max"]) {
          const zoomButton = page.getByRole("button", { name: zoom === "min" ? "Zoom out" : "Zoom in", exact:true });
          while (await zoomButton.isEnabled()) await zoomButton.click();
          const frame = await page.locator(".network-svg").getAttribute("viewBox");
          for (let step=0; step<21; step++) {
            await page.getByRole("button", { name:"Rotate view right", exact:true }).click();
            await inspect(page, width<=600, false);
            assert.equal(await page.locator(".network-svg").getAttribute("viewBox"), frame, "Rotation must not breathe the frame");
          }
        }
      }
      await page.getByRole("button", { name:"Reset 3D view", exact:true }).click();
      assert.equal(await page.locator(".network-svg").getAttribute("viewBox"), initialFrame);
    }
    if (width === 390) {
      await page.getByRole("checkbox", { name:"I confirm this change for simulation" }).click();
      await page.getByRole("button", { name:"Run simulation", exact:true }).click();
      await page.getByRole("heading", { name:"Change impact", exact:true }).waitFor();
      assert.equal(await page.locator(".network-svg").getAttribute("viewBox"), initialFrame, "Simulation must not recenter the scene");
      await page.getByRole("button", { name:"Before", exact:true }).click();
      assert.equal(await page.locator(".network-svg").getAttribute("viewBox"), initialFrame);
      await page.getByRole("button", { name:"After", exact:true }).click();
      await page.setViewportSize({ width:1440, height:900 });
      await inspect(page, false);
      await page.setViewportSize({ width, height:1000 });
      await page.waitForFunction(() => document.querySelector(".network-svg").classList.contains("compact"));
      await inspect(page, true);
    }
    assert.deepEqual(errors, []);
    results.push({ width, theme, modes, errors, status:"passed" });
    console.log(JSON.stringify({ width, theme, status:"passed" }));
    await context.close();
  }
  await fs.writeFile(`${output}/report.json`, JSON.stringify(results,null,2));
} finally { await browser.close(); }

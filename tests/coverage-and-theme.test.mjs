import test from "node:test";
import assert from "node:assert/strict";
import { buildCoverageField } from "../lib/coverage-field.ts";
import { coverageEdges } from "../lib/coverage-geometry.ts";
import { defaultScenario, simulate } from "../lib/simulation.ts";
import { resolveTheme } from "../lib/theme.ts";

test("coverage sampling covers the fictional XY plane with deterministic, unique probes", () => {
  const field = buildCoverageField(defaultScenario());
  assert.equal(field.tiles.length, 625);
  assert.equal(new Set(field.tiles.map((tile) => `${tile.x},${tile.y}`)).size, 625);
  assert.deepEqual(field, buildCoverageField(defaultScenario()));
  assert.ok(field.tiles.every((tile) => tile.x >= 0 && tile.y >= 0 && tile.x + field.step <= 1000 && tile.y + field.step <= 1000));
});

test("coverage tiles match the original engine for the exact same locations and approved change", () => {
  const scenario = defaultScenario();
  const change = { siteId: "cell-c", deltaPowerDb: -4 };
  const field = buildCoverageField(scenario, change);
  const probes = field.tiles.map((tile, index) => ({ id: `probe-${index}`, x: tile.x + field.step / 2, y: tile.y + field.step / 2, demand: 1 }));
  const result = simulate({ ...scenario, users: probes }, change);
  assert.deepEqual(field.tiles.map((tile) => tile.serving), result.after.map((state) => state.serving));
});

test("drawing coverage cannot mutate the user sample or change its KPI results", () => {
  const scenario = defaultScenario();
  const change = { siteId: "cell-b", deltaPowerDb: 3 };
  const snapshot = structuredClone(scenario);
  const before = simulate(scenario, change);
  const field = buildCoverageField(scenario, change);
  assert.deepEqual(scenario, snapshot);
  assert.deepEqual(simulate(scenario, change), before);
  assert.equal(scenario.users.length, 100);
  assert.notDeepEqual(field, buildCoverageField(scenario));
  assert.deepEqual(buildCoverageField(scenario), buildCoverageField(scenario, { siteId: "cell-b", deltaPowerDb: 0 }));
});

test("coverage boundaries omit interior edges and retain separate disconnected regions", () => {
  const field = { step: 40, tiles: [{ x: 0, y: 0, serving: "cell-a" }, { x: 40, y: 0, serving: "cell-a" }, { x: 120, y: 0, serving: "cell-a" }, { x: 80, y: 0, serving: "cell-b" }] };
  const edges = coverageEdges(field, "cell-a");
  assert.equal(edges.length, 10);
  assert.ok(!edges.some(([x1,y1,x2,y2]) => x1 === 40 && x2 === 40 && Math.min(y1,y2) === 0));
  assert.equal(coverageEdges(field, "cell-e").length, 0);
});

test("coverage honors the same bounded cell/delta validation as the main simulation", () => {
  assert.throws(() => buildCoverageField(defaultScenario(), { siteId: "cell-z", deltaPowerDb: 2 }));
  assert.throws(() => buildCoverageField(defaultScenario(), { siteId: "cell-b", deltaPowerDb: 9 }));
});

test("theme cookies accept only known themes and have a predictable safe default", () => {
  assert.equal(resolveTheme("light"), "light");
  for (const value of ["dark", "system", undefined, null, "<script>", {}]) assert.equal(resolveTheme(value), "dark");
});

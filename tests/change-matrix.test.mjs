import test from "node:test";
import assert from "node:assert/strict";
import { defaultScenario, simulate, SITE_IDS, validateChange } from "../lib/simulation.ts";
import { buildCoverageField } from "../lib/coverage-field.ts";

test("all 65 allowed changes preserve baseline, bounded metrics, population and evidence consistency", () => {
  const scenario = defaultScenario();
  const original = structuredClone(scenario);
  const baseline = simulate(scenario, { siteId: "cell-b", deltaPowerDb: 0 }).baseline;
  const userIds = scenario.users.map(({ id }) => id).sort();
  for (const siteId of SITE_IDS) {
    for (let deltaPowerDb = -6; deltaPowerDb <= 6; deltaPowerDb++) {
      const change = { siteId, deltaPowerDb };
      const label = `${siteId} ${deltaPowerDb} dB`;
      assert.equal(validateChange(change, scenario), null, label);
      const result = simulate(scenario, change);
      assert.deepEqual(result, simulate(scenario, change), `${label}: deterministic`);
      assert.deepEqual(result.baseline, baseline, `${label}: stable baseline`);
      assert.deepEqual(scenario, original, `${label}: no input mutation`);
      assert.deepEqual(result.after.map(({ id }) => id).sort(), userIds, `${label}: same population`);
      assert.equal(result.proposed.coveredUsers, result.after.filter(({ covered }) => covered).length, label);
      assert.equal(result.proposed.coveragePct, result.proposed.coveredUsers, `${label}: 100-user percent`);
      assert.equal(result.proposed.handovers, result.proposed.associationChanges.length, label);
      const before = new Map(result.before.map((user) => [user.id, user]));
      assert.deepEqual(result.proposed.newlyUncovered, result.after.filter((user) => before.get(user.id).covered && !user.covered).map(({ id }) => id), label);
      assert.deepEqual(result.proposed.newlyCovered, result.after.filter((user) => !before.get(user.id).covered && user.covered).map(({ id }) => id), label);
      for (const cell of result.cellsAfter) {
        const old = original.cells.find(({ id }) => id === cell.id);
        assert.equal(cell.powerDbm, old.powerDbm + (cell.id === siteId ? deltaPowerDb : 0), label);
        assert.ok(cell.powerDbm >= 30 && cell.powerDbm <= 46, label);
      }
      for (const value of [result.proposed.coveragePct, result.proposed.avgSinrDb, result.proposed.avgRateProxy]) assert.ok(Number.isFinite(value), label);
      const coverage = buildCoverageField(scenario, change);
      assert.equal(coverage.tiles.length, 625, `${label}: independent field probe population`);
      assert.ok(coverage.tiles.every((tile) => tile.serving === null || SITE_IDS.includes(tile.serving)), label);
      if (deltaPowerDb === 0) {
        assert.deepEqual(result.proposed, baseline, `${label}: unchanged result`);
        assert.deepEqual(result.delta, { coveragePct: 0, avgSinrDb: 0, avgRateProxy: 0 }, label);
      }
    }
  }
});

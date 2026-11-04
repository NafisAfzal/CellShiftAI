import { simulate, type Change, type Scenario, type SiteId } from "./simulation.ts";

export type CoverageTile = { x: number; y: number; serving: SiteId | null };
export type CoverageField = { step: number; tiles: CoverageTile[] };

/** A schematic field sampled with the same engine, independent of the 100-user KPI sample. */
export function buildCoverageField(scenario: Scenario, change: Change = { siteId: "cell-b", deltaPowerDb: 0 }): CoverageField {
  const step = 40;
  const probes = Array.from({ length: 625 }, (_, index) => ({
    id: `probe-${index}`, x: (index % 25) * step + step / 2,
    y: Math.floor(index / 25) * step + step / 2, demand: 1,
  }));
  const sampled = simulate({ ...scenario, users: probes }, change);
  return { step, tiles: probes.map((probe, index) => ({ x: probe.x - step / 2, y: probe.y - step / 2, serving: sampled.after[index].serving })) };
}

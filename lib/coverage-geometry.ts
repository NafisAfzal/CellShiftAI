import type { CoverageField } from "./coverage-field.ts";
import type { SiteId } from "./simulation.ts";

/** Boundaries between sampled regions; presentation geometry, never RF calculations. */
export function coverageEdges(field: CoverageField, siteId: SiteId) {
  const occupied = new Set(field.tiles.filter((tile) => tile.serving === siteId).map((tile) => `${tile.x},${tile.y}`));
  const edges: [number, number, number, number][] = [];
  const s = field.step;
  for (const tile of field.tiles) {
    if (tile.serving !== siteId) continue;
    const { x, y } = tile;
    if (!occupied.has(`${x},${y-s}`)) edges.push([x, y, x+s, y]);
    if (!occupied.has(`${x+s},${y}`)) edges.push([x+s, y, x+s, y+s]);
    if (!occupied.has(`${x},${y+s}`)) edges.push([x+s, y+s, x, y+s]);
    if (!occupied.has(`${x-s},${y}`)) edges.push([x, y+s, x, y]);
  }
  return edges;
}

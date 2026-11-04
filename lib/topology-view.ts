import type { Cell, Outcome, UEState } from "./simulation.ts";

export type ViewCamera = { mode: "2d" | "3d"; rotation: number; tilt: number; zoom: number };
export const DEFAULT_CAMERA: ViewCamera = { mode: "2d", rotation: -0.38, tilt: 0.78, zoom: 1 };
export const MIN_CAMERA_ZOOM = 0.8;
export const MAX_CAMERA_ZOOM = 1.2;
export const TOWER_HEIGHT = 105;
export const COMPACT_TOWER_HIT_RADIUS = 66;
const SPATIAL_SPAN = 700;

/** Orthographic schematic. Z is illustrative tower height, never measured RF data. */
export function projectPoint(x: number, y: number, z: number, camera: ViewCamera) {
  if (camera.mode === "2d") return { x: 500 + (x - 500) * 0.57, y: 335 + (y - 500) * 0.57 };
  const cos = Math.cos(camera.rotation);
  const sin = Math.sin(camera.rotation);
  // Bound scale by the full XY plane so rotation never crops the network at default zoom.
  const scale = SPATIAL_SPAN / (1000 * (Math.abs(cos) + Math.abs(sin)));
  const dx = x - 500;
  const dy = y - 500;
  return {
    x: 500 + (dx * cos - dy * sin) * scale * camera.zoom,
    y: 375 + ((dx * sin + dy * cos) * Math.sin(camera.tilt) - z * Math.cos(camera.tilt)) * scale * camera.zoom,
  };
}

/** Presentation frame only. Keep XY proportions and reserve space for actual glyphs. */
export function topologyFrame(camera: ViewCamera, cells: readonly Pick<Cell, "x" | "y">[], compact: boolean) {
  // Full-plane bounds are rotation invariant under projectPoint's normalized scale.
  const reference = { ...camera, rotation: 0, zoom: 1 };
  const corners = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]].map(([x, y]) => projectPoint(x, y, 0, reference));
  let left = Math.min(...corners.map((p) => p.x));
  let right = Math.max(...corners.map((p) => p.x));
  let top = Math.min(...corners.map((p) => p.y));
  let bottom = Math.max(...corners.map((p) => p.y));
  const hit = compact ? COMPACT_TOWER_HIT_RADIUS : 30;
  for (const cell of cells) {
    if (camera.mode === "2d") {
      const p = projectPoint(cell.x, cell.y, 0, reference);
      left = Math.min(left, p.x - Math.max(hit, compact ? 0 : 76));
      right = Math.max(right, p.x + Math.max(hit, compact ? 0 : 76));
      top = Math.min(top, p.y - hit);
      bottom = Math.max(bottom, p.y + Math.max(hit, compact ? 0 : 80));
    } else {
      // A weighted sine/cosine average never exceeds this L-infinity radius.
      // This envelope avoids camera breathing while rotating or selecting a site.
      const radius = Math.max(Math.abs(cell.x - 500), Math.abs(cell.y - 500)) * (SPATIAL_SPAN / 1000) * camera.zoom;
      const yRadius = radius * Math.sin(camera.tilt);
      const mast = TOWER_HEIGHT * (SPATIAL_SPAN / 1000) * camera.zoom * Math.cos(camera.tilt);
      const horizontal = Math.max(hit, compact ? 0 : 76);
      left = Math.min(left, 500 - radius - horizontal);
      right = Math.max(right, 500 + radius + horizontal);
      top = Math.min(top, 375 - yRadius - mast - Math.max(hit, compact ? 48 : 34));
      bottom = Math.max(bottom, 375 + yRadius + Math.max(hit, compact ? 0 : 80));
    }
  }
  const padding = 20;
  return { x: left - padding, y: top - padding, width: right - left + padding * 2, height: bottom - top + padding * 2 };
}

export type UserCategory = "covered" | "uncovered" | "reassociated" | "lost" | "gained" | "unknown";
export function userCategory(id: string, current: UEState | undefined, outcome: Outcome | null, phase: "before" | "after"): UserCategory {
  if (!current) return "unknown";
  if (outcome && phase === "after") {
    if (outcome.proposed.newlyUncovered.includes(id)) return "lost";
    if (outcome.proposed.newlyCovered.includes(id)) return "gained";
    if (outcome.proposed.associationChanges.includes(id)) return "reassociated";
  }
  return current.covered ? "covered" : "uncovered";
}

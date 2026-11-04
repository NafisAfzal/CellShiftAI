import test from "node:test";
import assert from "node:assert/strict";
import { defaultScenario } from "../lib/simulation.ts";
import { COMPACT_TOWER_HIT_RADIUS, DEFAULT_CAMERA, TOWER_HEIGHT, projectPoint, topologyFrame } from "../lib/topology-view.ts";

const cells = defaultScenario().cells;
const contains = (frame, x, y) => x >= frame.x && x <= frame.x + frame.width && y >= frame.y && y <= frame.y + frame.height;

test("framing retains the full baseline plane and tower labels through camera rotation, tilt and zoom", () => {
  for (const compact of [false, true]) {
    for (const tilt of [0.45, 0.78, 1.15]) {
      for (const zoom of [0.8, 1, 1.2]) {
        for (let rotation = -Math.PI; rotation <= Math.PI; rotation += 0.1) {
          const camera = { ...DEFAULT_CAMERA, mode: "3d", tilt, zoom, rotation };
          const frame = topologyFrame(camera, cells, compact);
          if (zoom <= 1) for (const [x, y] of [[0,0], [1000,0], [1000,1000], [0,1000]]) {
            const p = projectPoint(x, y, 0, camera);
            assert.ok(contains(frame, p.x, p.y), "Baseline field cropped");
          }
          for (const cell of cells) {
            const p = projectPoint(cell.x, cell.y, 0, camera);
            const mast = projectPoint(cell.x, cell.y, TOWER_HEIGHT, camera);
            const hit = compact ? COMPACT_TOWER_HIT_RADIUS : 30;
            assert.ok(contains(frame, p.x-hit, p.y-hit) && contains(frame, p.x+hit, p.y+hit), "Base target clipped");
            const topExtent = compact ? hit : 34;
            assert.ok(contains(frame, mast.x-topExtent, mast.y-topExtent) && contains(frame, mast.x+topExtent, mast.y+topExtent), "Mast target or letter clipped");
            if (!compact) assert.ok(contains(frame, p.x-72, p.y+30) && contains(frame, p.x+72, p.y+76), "Site label clipped");
          }
        }
      }
    }
  }
});

test("framing is stable on rotation and power-only outcomes, and zoom remains meaningful", () => {
  for (const compact of [false, true]) for (const tilt of [0.45, 0.78, 1.15]) {
    const camera = { ...DEFAULT_CAMERA, mode: "3d", tilt };
    const frame = topologyFrame(camera, cells, compact);
    assert.deepEqual(topologyFrame({ ...camera, rotation: 2.5 }, cells, compact), frame);
    assert.deepEqual(topologyFrame(camera, cells.map(c => ({ ...c, powerDbm: c.powerDbm+3 })), compact), frame);
    for (const [width, height] of [[288,260],[356,260],[928,575],[1176,600]]) {
      const sizes = [0.8, 1, 1.2].map(zoom => {
        const f = topologyFrame({ ...camera, zoom }, cells, compact);
        return zoom * Math.min(width/f.width, height/f.height);
      });
      assert.ok(sizes[0] < sizes[1] && sizes[1] < sizes[2], "Automatic safety bounds canceled user zoom");
    }
  }
});

test("plan framing preserves XY proportions and compact targets remain at least 44px", () => {
  for (const compact of [false, true]) {
    const frame = topologyFrame(DEFAULT_CAMERA, cells, compact);
    assert.ok(frame.width < 1000 && frame.height < 680, "Arbitrary outer padding retained");
    const a = projectPoint(100,100,0,DEFAULT_CAMERA), b = projectPoint(200,100,0,DEFAULT_CAMERA), c = projectPoint(100,200,0,DEFAULT_CAMERA);
    assert.equal(b.x-a.x, c.y-a.y);
  }
  for (const tilt of [0.45,0.78,1.15]) for (const zoom of [0.8,1,1.2]) {
    const f = topologyFrame({ ...DEFAULT_CAMERA, mode:"3d", tilt, zoom }, cells, true);
    const diameter = COMPACT_TOWER_HIT_RADIUS*2*Math.min(288/f.width,260/f.height);
    assert.ok(diameter >= 44, `Target diameter ${diameter}`);
  }
});

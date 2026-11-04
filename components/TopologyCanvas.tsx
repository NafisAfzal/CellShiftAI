"use client";

import { memo, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Box, Layers2, Minus, Plus, RotateCcw, RotateCw, SlidersHorizontal, RadioTower, Scan, Pause, Play } from "lucide-react";
import type { Outcome, Scenario, SiteId, UEState } from "@/lib/simulation";
import { COMPACT_TOWER_HIT_RADIUS, DEFAULT_CAMERA, MAX_CAMERA_ZOOM, MIN_CAMERA_ZOOM, TOWER_HEIGHT, projectPoint, topologyFrame, userCategory, type ViewCamera, type UserCategory } from "@/lib/topology-view";
import type { CoverageField } from "@/lib/coverage-field";
import { CoverageLayer } from "./CoverageLayer";

export const CELL_THEMES: Record<SiteId, { hex: string; name: string }> = {
  "cell-a": { hex: "var(--cell-a)", name: "North Gate" },
  "cell-b": { hex: "var(--cell-b)", name: "Central Hub" },
  "cell-c": { hex: "var(--cell-c)", name: "Harbor" },
  "cell-d": { hex: "var(--cell-d)", name: "South Park" },
  "cell-e": { hex: "var(--cell-e)", name: "Eastpoint" },
};
const USER_COLORS: Record<UserCategory, string> = {
  covered: "var(--user-covered)", uncovered: "var(--user-uncovered)", reassociated: "var(--purple)", lost: "var(--danger)", gained: "var(--warning)", unknown: "var(--user-uncovered)",
};
const CATEGORY_LABELS: Record<UserCategory, string> = {
  covered: "Covered", uncovered: "Uncovered", reassociated: "Changed cell", lost: "Lost coverage", gained: "Gained coverage", unknown: "Baseline loading",
};
const EMPTY_STATES: UEState[] = [];
const mobileQuery = "(max-width: 600px)";
const subscribeMobile = (callback: () => void) => {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const mobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const serverSnapshot = () => false;
type Props = {
  scenario: Scenario | null; baselineStates?: UEState[]; outcome: Outcome | null;
  coverage?: CoverageField;
  phase: "before" | "after"; onPhaseChange: (phase: "before" | "after") => void;
  selected: SiteId; delta: number; onSelect: (id: SiteId) => void;
  hoveredUeId?: string | null; onHoverUe?: (id: string | null) => void; disabled?: boolean;
};

export const TopologyCanvas = memo(function TopologyCanvas({ scenario, baselineStates, coverage, outcome, phase, onPhaseChange, selected, onSelect, hoveredUeId, onHoverUe, disabled }: Props) {
  const gradientId = useId();
  const [camera, setCamera] = useState<ViewCamera>(DEFAULT_CAMERA);
  const compact = useSyncExternalStore(subscribeMobile, mobileSnapshot, serverSnapshot);
  const [filter, setFilter] = useState("all");
  const activeFilter = filter === "affected" && !outcome ? "all" : filter;
  const [showLinks, setShowLinks] = useState(false);
  const [showCoverage, setShowCoverage] = useState(true);
  const [motionOn, setMotionOn] = useState(true);
  const [hover, setHover] = useState<string | null>(null);
  const pointer = useRef<{ id: number; x: number; rotation: number; moved: boolean } | null>(null);
  const activeId = hoveredUeId ?? hover;
  const states = phase === "after" && outcome ? outcome.after : outcome?.before ?? baselineStates ?? EMPTY_STATES;
  const stateMap = useMemo(() => new Map(states.map((u) => [u.id, u])), [states]);
  const cells = phase === "after" && outcome ? outcome.cellsAfter : scenario?.cells ?? [];
  const selectedCell = cells.find((c) => c.id === selected);
  const selectedLoad = states.filter((u) => u.serving === selected).length;
  const active = activeId ? stateMap.get(activeId) : undefined;
  const is3d = camera.mode === "3d";
  const frame = topologyFrame(camera, cells, compact);
  const point = (x: number, y: number, z = 0) => projectPoint(x, y, z, camera);
  const plane = [[0, 0], [1000, 0], [1000, 1000], [0, 1000]].map(([x, y]) => point(x, y));
  function switchView(mode: "2d" | "3d") { setCamera({ ...DEFAULT_CAMERA, mode }); }
  function highlight(id: string | null) { setHover(id); onHoverUe?.(id); }
  const grid = Array.from({ length: 11 }, (_, i) => i * 100);

  return (
    <section className="topology-panel surface" aria-labelledby="topology-heading">
      <div className="panel-section-heading"><div className="section-identity"><span className="section-icon network-icon"><RadioTower size={20} /></span><div><h2 id="topology-heading">Network overview</h2><p>Select a cell. Explore its coverage.</p></div></div><span className="network-count">5 sites<span>100 simulated users</span></span></div>
      <div className="map-toolbar">
        <div className="map-view-controls">
        <div className="segmented" role="group" aria-label="Topology view">
          <button type="button" aria-pressed={!is3d} onClick={() => switchView("2d")}><Layers2 size={14} />2D plan</button>
          <button type="button" aria-pressed={is3d} onClick={() => switchView("3d")}><Box size={14} />3D spatial</button>
        </div>
        <button type="button" className="coverage-toggle" disabled={!coverage} aria-pressed={showCoverage} onClick={() => setShowCoverage((value) => !value)} title="Coverage estimated by the synthetic simulation"><Scan size={14} />Coverage</button>
        </div>
        {is3d && <div className="camera-controls" role="group" aria-label="3D camera controls">
          <button type="button" aria-label="Rotate view left" title="Rotate left" onClick={() => setCamera((v) => ({ ...v, rotation: v.rotation - 0.3 }))}><RotateCcw size={15} /></button>
          <button type="button" aria-label="Rotate view right" title="Rotate right" onClick={() => setCamera((v) => ({ ...v, rotation: v.rotation + 0.3 }))}><RotateCw size={15} /></button>
          <button type="button" aria-label="Zoom out" title="Zoom out" disabled={camera.zoom <= MIN_CAMERA_ZOOM} onClick={() => setCamera((v) => ({ ...v, zoom: Math.max(MIN_CAMERA_ZOOM, v.zoom - 0.1) }))}><Minus size={15} /></button>
          <button type="button" aria-label="Zoom in" title="Zoom in" disabled={camera.zoom >= MAX_CAMERA_ZOOM} onClick={() => setCamera((v) => ({ ...v, zoom: Math.min(MAX_CAMERA_ZOOM, v.zoom + 0.1) }))}><Plus size={15} /></button>
          <button type="button" aria-label="Reset 3D view" title="Reset 3D view" onClick={() => switchView("3d")}><RotateCcw size={15} /></button>
        </div>}
        <div className="segmented phase-toggle" role="group" aria-label="Simulation comparison">
          <button type="button" aria-pressed={phase === "before"} onClick={() => onPhaseChange("before")}>Before</button>
          <button type="button" aria-pressed={phase === "after"} disabled={!outcome} onClick={() => onPhaseChange("after")}>After</button>
        </div>
      </div>
      <div className={`map-stage ${is3d ? "spatial" : "plan"} ${!scenario ? "is-loading" : ""}`}>
        <div className="map-context"><span className="status-dot" />{phase === "after" && outcome ? "Simulated change" : "Baseline network"}<span>{showCoverage ? "Modeled coverage" : "Coverage hidden"}</span></div>
        {!scenario && <div className="map-loading" role="status">Loading the synthetic network…</div>}
        <svg className={`network-svg ${compact ? "compact" : ""}`} viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`} preserveAspectRatio="xMidYMid meet" aria-label={`${is3d ? "3D schematic" : "2D plan"} of five fictional cell sites and one hundred simulated users`}
          onPointerDown={(event) => {
            if (!is3d || event.button !== 0 || (event.target as Element).closest('[role="button"]')) return;
            pointer.current = { id: event.pointerId, x: event.clientX, rotation: camera.rotation, moved: false };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = pointer.current;
            if (!drag || drag.id !== event.pointerId) return;
            const offset = event.clientX - drag.x;
            if (Math.abs(offset) > 4) drag.moved = true;
            if (drag.moved) setCamera((prev) => ({ ...prev, rotation: drag.rotation + offset * 0.006 }));
          }}
          onPointerUp={() => { pointer.current = null; }} onPointerCancel={() => { pointer.current = null; }}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="var(--ground-top)" /><stop offset="1" stopColor="var(--ground-bottom)" /></linearGradient></defs>
          <polygon points={plane.map((p) => `${p.x},${p.y}`).join(" ")} className="ground-plane" />
          <polygon points={plane.map((p) => `${p.x},${p.y}`).join(" ")} fill={`url(#${gradientId})`} />
          {coverage && <CoverageLayer field={coverage} camera={camera} selected={selected} visible={showCoverage} />}
          <g className="map-grid" aria-hidden="true">
            {grid.map((n) => {
              const a = point(n, 0); const b = point(n, 1000); const c = point(0, n); const d = point(1000, n);
              return <g key={n}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} /><line x1={c.x} y1={c.y} x2={d.x} y2={d.y} /></g>;
            })}
          </g>
          {scenario?.users.map((user) => {
            const state = stateMap.get(user.id);
            const category = userCategory(user.id, state, outcome, phase);
            const affected = ["lost", "gained", "reassociated"].includes(category);
            if (activeFilter === "affected" && !affected || activeFilter === "uncovered" && state?.covered) return null;
            const cell = cells.find((c) => c.id === state?.serving);
            if (!cell || !(activeId === user.id || showLinks && cell.id === selected)) return null;
            const p = point(user.x, user.y, 8); const q = point(cell.x, cell.y, is3d ? TOWER_HEIGHT : 0);
            return <line key={`link-${user.id}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={CELL_THEMES[cell.id].hex} strokeOpacity={activeId === user.id ? 0.85 : 0.22} strokeWidth={activeId === user.id ? 2 : 1} />;
          })}
          {scenario?.users.map((user) => {
            const state = stateMap.get(user.id);
            const category = userCategory(user.id, state, outcome, phase);
            const affected = ["lost", "gained", "reassociated"].includes(category);
            const dimmed = activeFilter === "affected" && !affected || activeFilter === "uncovered" && state?.covered;
            const p = point(user.x, user.y, 8);
            const focused = activeId === user.id;
            return <g key={user.id} opacity={dimmed ? 0.13 : 1} onPointerEnter={() => highlight(user.id)} onPointerLeave={() => highlight(null)}>
              {(affected || focused) && <circle cx={p.x} cy={p.y} r={focused ? 12 : 8} fill="none" stroke={USER_COLORS[category]} strokeWidth={1.4} />}
              <circle cx={p.x} cy={p.y} r={affected ? 4.8 : 3.7} fill={USER_COLORS[category]} stroke={focused ? "var(--text)" : "var(--map-bg)"} strokeWidth={1.5} />
              <circle cx={p.x} cy={p.y} r={10} fill="transparent"><title>{user.id}: {CATEGORY_LABELS[category]}{state ? `; SINR ${state.sinrDb} dB` : ""}</title></circle>
            </g>;
          })}
          {[...cells].sort((a, b) => point(a.x, a.y).y - point(b.x, b.y).y).map((cell) => {
            const p = point(cell.x, cell.y); const top = point(cell.x, cell.y, TOWER_HEIGHT);
            const chosen = cell.id === selected; const color = CELL_THEMES[cell.id].hex;
            const wavePath = chosen ? Array.from({ length: 49 }, (_, index) => {
              const angle = index / 48 * Math.PI * 2;
              const q = point(cell.x + Math.cos(angle) * 155, cell.y + Math.sin(angle) * 155);
              return `${index ? "L" : "M"}${(q.x-p.x).toFixed(2)},${(q.y-p.y).toFixed(2)}`;
            }).join("") + "Z" : "";
            return <g key={cell.id} role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled} aria-pressed={chosen} aria-label={`Select ${cell.name}`} className="map-tower"
              onClick={() => { if (!disabled) onSelect(cell.id); }} onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect(cell.id); } }}>
              {chosen && <g transform={`translate(${p.x},${p.y})`} aria-hidden="true" className={`signal-rings ${motionOn ? "" : "motion-paused"}`} style={{ color }}><path d={wavePath} className="signal-wave" /><path d={wavePath} className="signal-wave signal-wave-delayed" /></g>}
              <circle className="tower-hit-area" cx={p.x} cy={p.y} r={compact ? COMPACT_TOWER_HIT_RADIUS : 30} fill="transparent" />
              {is3d && <circle className="tower-hit-area" cx={top.x} cy={top.y} r={compact ? COMPACT_TOWER_HIT_RADIUS : 22} fill="transparent" />}
              <ellipse cx={p.x} cy={p.y} rx={chosen ? 29 : 19} ry={is3d ? 10 : chosen ? 29 : 19} fill={color} fillOpacity={0.09} stroke={color} strokeOpacity={chosen ? 0.65 : 0.25} />
              {is3d && <g stroke={chosen ? color : "var(--tower-stroke)"} strokeWidth={2} fill="none"><path d={`M${p.x-10},${p.y} L${top.x},${top.y} L${p.x+10},${p.y} M${p.x-6},${p.y-20} L${p.x+6},${p.y-20}`} /><circle cx={top.x} cy={top.y} r={8} fill="var(--panel)" stroke={color} /></g>}
              {!is3d && <circle cx={p.x} cy={p.y} r={19} fill={chosen ? color : "var(--tower-fill)"} stroke={color} strokeWidth={1.6} />}
              <text x={top.x} y={is3d ? top.y-19 : top.y+5} textAnchor="middle" className="tower-letter" fill={chosen && !is3d ? "var(--site-selected-ink)" : color}>{cell.id.at(-1)?.toUpperCase()}</text>
              <rect x={p.x-72} y={p.y+30} width={144} height={46} rx={5} fill="var(--map-label)" fillOpacity={0.97} />
              <text x={p.x} y={p.y+49} textAnchor="middle" className="tower-label">{cell.name}</text>
              <text x={p.x} y={p.y+66} textAnchor="middle" className="tower-power">{cell.powerDbm} dBm{chosen ? " · selected" : ""}</text>
            </g>;
          })}
        </svg>

      </div>
      <div className="map-options">
        <div className="legend" aria-label="Simulated user legend">
          {(["covered", "uncovered", ...(outcome && phase === "after" ? ["lost", "gained", "reassociated"] : [])] as UserCategory[]).map((key) => <span key={key}><i style={{ background: USER_COLORS[key] }} />{CATEGORY_LABELS[key]}</span>)}
        </div>
        <div className="map-utility-actions"><button type="button" className="motion-toggle" aria-label={motionOn ? "Pause signal motion" : "Resume signal motion"} aria-pressed={motionOn} onClick={() => setMotionOn((value) => !value)}>{motionOn ? <Pause size={13} /> : <Play size={13} />}<span>Signal motion</span></button>
        <details className="map-display-options" onToggle={(event) => {
          const details = event.currentTarget;
          const popup = details.querySelector<HTMLElement>(".display-popover");
          popup?.getAnimations().forEach((animation) => animation.cancel());
          if (!details.open || !popup || window.matchMedia("(prefers-reduced-motion: reduce)").matches || details.querySelector("summary")?.matches(":focus-visible")) return;
          const style = getComputedStyle(popup);
          popup.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: parseFloat(style.getPropertyValue("--duration")), easing: style.getPropertyValue("--ease-out").trim() });
        }}><summary><SlidersHorizontal size={14} />Display</summary>
          <div className="display-popover">
            <label htmlFor="user-filter">Show users<select id="user-filter" value={activeFilter} onChange={(e) => setFilter(e.target.value)}><option value="all">All users</option><option value="uncovered">Uncovered</option><option value="affected" disabled={!outcome}>Affected by change</option></select></label>
            <label className="checkbox-label"><input type="checkbox" checked={showLinks} onChange={(e) => setShowLinks(e.target.checked)} />Selected cell connections</label>
            {is3d && <label htmlFor="tilt">Viewing angle<input id="tilt" type="range" min="0.45" max="1.15" step="0.05" value={camera.tilt} onChange={(e) => setCamera((v) => ({ ...v, tilt: Number(e.target.value) }))} /></label>}
          </div>
        </details>
        </div>
      </div>
      <div className="site-selector" role="group" aria-label="Select a target cell">
        {cells.map((cell) => <button key={cell.id} type="button" disabled={disabled} aria-pressed={cell.id === selected} onClick={() => onSelect(cell.id)}><span className="site-letter" style={{ color: CELL_THEMES[cell.id].hex }}>{cell.id.at(-1)?.toUpperCase()}</span><span><strong>{cell.name}</strong><small>{cell.powerDbm} dBm</small></span></button>)}
      </div>
      <div className="map-footnote">
        <div className="map-status" aria-live="polite">
          {activeId && active ? <><strong>{activeId}</strong><span>{CATEGORY_LABELS[userCategory(activeId, active, outcome, phase)]} · SINR {active.sinrDb} dB · {active.serving?.replace("cell-", "Cell ").toUpperCase() ?? "no serving cell"}</span></> : <><strong>{selectedCell?.name ?? "Network"}</strong><span>{selectedCell ? `${selectedCell.powerDbm} dBm · ${selectedLoad} / ${selectedCell.capacityUsers} users` : "Loading baseline"}</span></>}
        </div>
        <p className="map-guidance">{is3d ? "Drag to rotate · " : ""}Pulses mark the selected tower</p>
      </div>
    </section>
  );
});

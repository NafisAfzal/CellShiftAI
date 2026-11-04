"use client";

import { memo, useMemo } from "react";
import type { CoverageField } from "@/lib/coverage-field";
import { coverageEdges } from "@/lib/coverage-geometry";
import { projectPoint, type ViewCamera } from "@/lib/topology-view";
import type { SiteId } from "@/lib/simulation";

const SITES: SiteId[] = ["cell-a", "cell-b", "cell-c", "cell-d", "cell-e"];
export const CoverageLayer = memo(function CoverageLayer({ field, camera, selected, visible }: { field: CoverageField; camera: ViewCamera; selected: SiteId; visible: boolean }) {
  const regions = useMemo(() => {
    const p = (x: number, y: number) => { const value = projectPoint(x, y, 0, camera); return `${value.x.toFixed(2)},${value.y.toFixed(2)}`; };
    return SITES.map((site) => ({
      site,
      fill: field.tiles.filter((tile) => tile.serving === site).map(({ x, y }) => `M${p(x,y)}L${p(x+field.step,y)}L${p(x+field.step,y+field.step)}L${p(x,y+field.step)}Z`).join(""),
      edge: coverageEdges(field, site).map(([x1,y1,x2,y2]) => `M${p(x1,y1)}L${p(x2,y2)}`).join(""),
    }));
  }, [field, camera]);
  return <g className={`coverage-layer ${visible ? "" : "coverage-hidden"}`} aria-hidden="true">{regions.map((region) => <g key={region.site} className={`coverage-region ${region.site === selected ? "is-selected" : ""}`} style={{ color: `var(--${region.site})` }}><path className="coverage-fill" d={region.fill} /><path className="coverage-edge" d={region.edge} /></g>)}</g>;
});

"use client";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Metrics, Outcome } from "@/lib/simulation";
export function KpiGrid({ outcome, baseline }: { outcome: Outcome | null; baseline?: Metrics }) {
  const before = outcome?.baseline ?? baseline;
  const after = outcome?.proposed;
  const rows = [
    { name: "Coverage", b: before?.coveragePct, a: after?.coveragePct, unit: "%", diffUnit: " pp", decimals: 1, note: "Covered simulated users" },
    { name: "Mean SINR", b: before?.avgSinrDb, a: after?.avgSinrDb, unit: " dB", diffUnit: " dB", decimals: 2, note: "Covered-user signal quality proxy" },
    { name: "Rate proxy", b: before?.avgRateProxy, a: after?.avgRateProxy, unit: "", diffUnit: "", decimals: 2, note: "Relative model units · not Mbps" },
    { name: "Cell re-associations", b: before ? 0 : undefined, a: after?.handovers, unit: "", diffUnit: " users", decimals: 0, note: "Users with a changed serving cell", neutral: true },
  ];
  return <div className="kpi-grid" aria-label="Server-computed synthetic KPI comparison">{rows.map((r) => {
    const diff = r.a !== undefined && r.b !== undefined ? r.a - r.b : null;
    return <div className="kpi-card" key={r.name}><div className="kpi-label">{r.name}<span>{outcome ? "After" : "Baseline"}</span></div><div className="kpi-number">{(r.a ?? r.b)?.toFixed(r.decimals) ?? "—"}<small>{r.unit}</small></div><div className="kpi-comparison">{outcome ? <><span>Before {r.b?.toFixed(r.decimals)}{r.unit}</span><span className={`delta ${r.neutral || diff === 0 ? "flat" : (diff ?? 0) > 0 ? "good" : "bad"}`}>{diff !== null && <>{diff > 0 ? <ArrowUpRight size={13} /> : diff < 0 ? <ArrowDownRight size={13} /> : <Minus size={13} />}{diff > 0 ? "+" : ""}{diff.toFixed(r.decimals)}{r.diffUnit}</>}</span></> : <span>{r.note}</span>}</div></div>;
  })}</div>;
}

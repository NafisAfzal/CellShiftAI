"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Check, ChevronDown, LoaderCircle, Play, RotateCcw, ShieldCheck, Sparkles, SlidersHorizontal } from "lucide-react";
import { PRESET_SCENARIOS } from "@/lib/safety-case-export";
import type { Scenario, SiteId } from "@/lib/simulation";
import type { ParsedProposal } from "@/lib/types";
import { SourceBadge } from "./SourceBadge";

type Props = {
  scenario: Scenario | null; prompt: string; onPromptChange: (value: string) => void;
  inputMode: "describe" | "manual"; onInputModeChange: (mode: "describe" | "manual") => void;
  onSelectPreset: (prompt: string, site: SiteId, delta: number) => void; onParse: () => void;
  parsed: ParsedProposal | null; selected: SiteId; delta: number;
  onSelectSite: (id: SiteId) => void; onSelectDelta: (d: number) => void;
  approved: boolean; simulated: boolean; onApprove: () => void; onClearProposal: () => void;
  onRunSimulation: () => void; loading: "parse" | "sim" | "explain" | null; elapsedSec: number;
};
export function ProposalControlPanel({ scenario, prompt, inputMode, onInputModeChange, onPromptChange, onSelectPreset, onParse, parsed, selected, delta, onSelectSite, onSelectDelta, approved, simulated, onApprove, onClearProposal, onRunSimulation, loading, elapsedSec }: Props) {
  const cell = scenario?.cells.find((c) => c.id === selected);
  const power = cell?.powerDbm ?? 38;
  const withinBounds = power + delta >= 30 && power + delta <= 46;
  const blocked = !scenario || loading !== null || !withinBounds || parsed?.status === "clarify" || inputMode === "describe" && parsed?.status !== "proposal";
  const confirmRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const handledParse = useRef<ParsedProposal | null>(null);
  useEffect(() => {
    if (!parsed) { handledParse.current = null; return; }
    if (loading || handledParse.current === parsed) return;
    handledParse.current = parsed;
    if (parsed.status === "proposal") confirmRef.current?.focus();
    else promptRef.current?.focus();
  }, [parsed, loading]);
  const guidance = !scenario ? "Loading the network…" : loading === "parse" ? "Interpreting your instruction…" : loading === "sim" ? "Calculating the comparison. Results will appear below." : !withinBounds ? "Adjust the power to stay within 30–46 dBm." : parsed?.status === "clarify" ? "Update your instruction, then interpret it again." : inputMode === "describe" && parsed?.status !== "proposal" ? "Interpret your instruction to enable confirmation." : !approved ? "Check the target and power above, then confirm." : simulated ? "Simulation complete. Your results are ready." : "Confirmed. Run to compare with the baseline.";
  return <aside id="change-panel" className="surface control-panel" aria-labelledby="change-heading">
    <div className="inspector-heading"><div className="section-identity"><span className="section-icon proposal-icon"><SlidersHorizontal size={18} aria-hidden="true" /></span><h2 id="change-heading">Propose a change</h2></div><span className={`draft-state ${approved ? "success" : ""}`}>{loading === "sim" ? "Running" : loading === "parse" ? "Interpreting" : simulated ? "Simulated" : approved ? "Confirmed" : "Draft"}</span></div>
    <div className="input-mode" role="group" aria-label="Change input method"><button type="button" aria-pressed={inputMode === "describe"} disabled={!!loading} onClick={() => { onInputModeChange("describe"); onClearProposal(); }}><Sparkles size={14} />Describe</button><button type="button" aria-pressed={inputMode === "manual"} disabled={!!loading} onClick={() => { onInputModeChange("manual"); onClearProposal(); }}>Set manually</button></div>
    {inputMode === "describe" ? <div className="intent-input">
      {parsed?.status === "proposal" ? <button type="button" className="text-button edit-instruction" disabled={!!loading} onClick={() => { onClearProposal(); requestAnimationFrame(() => promptRef.current?.focus()); }}>Edit instruction<ArrowRight size={13} /></button> : <>
      <label htmlFor="prompt">What would you like to change?</label>
      <textarea ref={promptRef} id="prompt" name="instruction" autoComplete="off" aria-describedby={`interpret-help${parsed?.status === "clarify" ? " interpreted-change" : ""}`} value={prompt} onChange={(e) => onPromptChange(e.target.value)} maxLength={320} rows={2} disabled={!!loading} placeholder="Increase Cell B power by 3 dB" />
      <details className="examples"><summary>Try an example<ChevronDown size={13} /></summary><div>{PRESET_SCENARIOS.map((p) => <button type="button" key={p.id} disabled={!!loading} onClick={() => onSelectPreset(p.prompt, p.siteId, p.deltaPowerDb)}>{p.shortLabel}</button>)}</div></details>
      <button type="button" className="outline-btn parse-action tinted-action" aria-describedby="interpret-help" onClick={onParse} disabled={!scenario || !!loading || prompt.trim().length < 8}>{loading === "parse" ? <><LoaderCircle size={15} className="spin" aria-hidden="true" />Interpreting · {elapsedSec.toFixed(0)}s</> : <><Sparkles size={15} aria-hidden="true" />Interpret change<ArrowRight size={15} aria-hidden="true" /></>}</button>
      <p id="interpret-help" className="action-help">{prompt.trim().length < 8 ? "Enter a cell and power change (at least 8 characters)." : "Turn your instruction into a proposal to review."}</p>
      </>}
      {parsed && <div id="interpreted-change" className="parse-result" role="status"><SourceBadge source={parsed.source} fallbackReason={parsed.fallbackReason} /><p>{parsed.status === "clarify" ? parsed.question : parsed.interpretation}</p>{parsed.source === "MOCK_FALLBACK" && <small>{parsed.fallbackReason}</small>}</div>}
    </div> : <p className="manual-note">Select a site on the map or use the controls below. AI interpretation is optional.</p>}

    <div className="change-fields">
      <div className="draft-summary"><span>Cell {selected.at(-1)?.toUpperCase()} · {cell?.name ?? "Loading"}</span><strong>{delta > 0 ? "+" : ""}{delta} dB</strong></div>
      <div className="power-comparison"><span>Transmit power</span><strong>{power}<span>→</span>{power + delta} <small>dBm</small></strong></div>
      <details className="parameter-editor" open={inputMode === "manual" ? true : undefined}><summary>Adjust parameters<ChevronDown size={13} /></summary><div className="parameter-fields">
      <label htmlFor="site">Target cell<select id="site" value={selected} disabled={!!loading || !scenario} onChange={(e) => onSelectSite(e.target.value as SiteId)}>{scenario?.cells.map((c) => <option value={c.id} key={c.id}>Cell {c.id.at(-1)?.toUpperCase()} · {c.name}</option>)}</select></label>
      <div className="delta-label"><label htmlFor="delta">Power adjustment</label><output htmlFor="delta">{delta > 0 ? "+" : ""}{delta} <span>dB</span></output></div>
      <input id="delta" type="range" min={-6} max={6} step={1} value={delta} disabled={!!loading} onChange={(e) => onSelectDelta(Number(e.target.value))} />
      <div className="range-labels"><span>−6 dB</span><span>0</span><span>+6 dB</span></div>
      </div></details>
      {!withinBounds && <p className="inline-warning" role="alert">Choose a change that stays within 30–46 dBm.</p>}
      {delta === 0 && <p className="manual-note">0 dB checks the unchanged baseline.</p>}
    </div>
    <div className={`confirmation ${approved ? "is-approved" : ""}`}>
      <p id="simulation-guidance" className="confirmation-hint">{guidance}</p>
      <button ref={confirmRef} type="button" className="confirmation-control" role="checkbox" aria-checked={approved} aria-describedby="simulation-guidance" disabled={blocked} onClick={approved ? onClearProposal : onApprove}><span className="check-box">{approved && <Check size={13} aria-hidden="true" />}</span><span>I confirm this change for simulation</span></button>
      <span className="confirmation-scope"><ShieldCheck size={13} />Synthetic users only. No network commands.</span>
    </div>
    <button type="button" className="primary-btn run-btn" aria-describedby="simulation-guidance" onClick={onRunSimulation} disabled={!approved || blocked}>{loading === "sim" ? <><LoaderCircle size={16} className="spin" aria-hidden="true" />Calculating impact…</> : <><Play size={15} aria-hidden="true" />Run simulation<ArrowRight size={16} aria-hidden="true" /></>}</button>
    {simulated && loading !== "sim" && <a href="#impact" className="completion-link">View results<ArrowRight size={15} aria-hidden="true" /></a>}
    {approved && <button type="button" className="text-button revoke-button" disabled={!!loading} onClick={onClearProposal}><RotateCcw size={12} />Revoke confirmation</button>}
  </aside>;
}

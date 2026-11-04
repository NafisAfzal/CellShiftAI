"use client";
import { FlaskConical, RotateCcw } from "lucide-react";
import { ThemeToggle } from "./ThemeProvider";
export function Topbar({ onReset, busy }: { onReset: () => void; busy?: boolean }) {
  return <header className="topbar"><span className="workspace-label">Engineering workspace</span><a href="#workspace" className="wordmark" aria-label="CellShiftAI workspace" translate="no">CellShift<span>AI</span></a><div className="top-right">
    <span className="local-badge"><FlaskConical size={13} aria-hidden="true" />Synthetic sandbox</span>
    <ThemeToggle />
    <button type="button" className="icon-button reset-button" onClick={onReset} disabled={busy} aria-label="Reset scenario to baseline" title="Reset scenario"><RotateCcw size={15} /><span>Reset</span></button>
  </div></header>;
}

"use client";
import { Activity, Network, RadioTower, ShieldCheck } from "lucide-react";
export type NavSectionId = "workspace" | "impact";
export function Sidebar({ activeSection, onSelectSection }: { activeSection: NavSectionId; onSelectSection: (id: NavSectionId) => void }) {
  return <aside className="sidebar" aria-label="Workspace navigation">
    <a href="#workspace" className="brand-mark" aria-label="CellShift AI workspace"><RadioTower size={25} /></a>
    <nav>{([{ id: "workspace", label: "Change workspace", shortLabel: "Network", Icon: Network }, { id: "impact", label: "Impact analysis", shortLabel: "Impact", Icon: Activity }] as const).map(({ id, label, shortLabel, Icon }) => <a key={id} href={`#${id}`} className={`nav-link ${activeSection === id ? "current" : ""}`} aria-label={label} title={label} aria-current={activeSection === id ? "location" : undefined} onClick={() => onSelectSection(id)}><Icon size={21} aria-hidden="true" /><span>{shortLabel}</span></a>)}</nav>
    <div className="sidebar-bottom" title="Synthetic sandbox · No live network control"><ShieldCheck size={20} /><span>LOCAL</span></div>
  </aside>;
}

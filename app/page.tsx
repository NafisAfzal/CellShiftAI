"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CircleAlert,
  Check,
  ArrowDownRight,
  Activity,
  X,
} from "lucide-react";
import { BlastRadiusPanel } from "@/components/BlastRadiusPanel";
import { EngineeringReviewPanel } from "@/components/EngineeringReviewPanel";
import { KpiGrid } from "@/components/KpiGrid";
import { ProposalControlPanel } from "@/components/ProposalControlPanel";
import { Sidebar, type NavSectionId } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { TopologyCanvas } from "@/components/TopologyCanvas";
import {
  buildSafetyCasePayload,
  downloadTextFile,
  formatSafetyCaseMarkdown,
} from "@/lib/safety-case-export";
import type { Change, Outcome, Scenario, SiteId } from "@/lib/simulation";
import type {
  EngineeringExplanation,
  ParsedProposal,
  ScenarioResponse,
  SimulationResponse,
} from "@/lib/types";

const SEED_PROMPT = "Increase Cell B power by 3 dB";

function riskClass(risk: Outcome["risk"]) {
  return risk === "HIGH" ? "danger" : risk === "MODERATE" ? "warning" : "success";
}

async function postJSON<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const obj =
      data && typeof data === "object" && "error" in data
        ? (data as { error: string })
        : { error: `Request failed (${response.status})` };
    throw new Error(obj.error || `Request failed (${response.status})`);
  }
  return data as T;
}

export default function HomePage() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [baseline, setBaseline] = useState<ScenarioResponse["baseline"]>();
  const [activeSection, setActiveSection] = useState<NavSectionId>("workspace");
  const [selected, setSelected] = useState<SiteId>("cell-b");
  const [delta, setDelta] = useState(3);
  const [prompt, setPrompt] = useState(SEED_PROMPT);
  const [inputMode, setInputMode] = useState<"describe" | "manual">("describe");
  const [parsed, setParsed] = useState<ParsedProposal | null>(null);
  const [approved, setApproved] = useState(false);
  const [outcome, setOutcome] = useState<SimulationResponse | null>(null);
  const [explanation, setExplanation] = useState<EngineeringExplanation | null>(
    null
  );
  const [phase, setPhase] = useState<"before" | "after">("before");
  const [loading, setLoading] = useState<"parse" | "sim" | "explain" | null>(
    null
  );
  const [elapsedSec, setElapsedSec] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [liveStatusMsg, setLiveStatusMsg] = useState<string>("");
  const [log, setLog] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const [hoveredUeId, setHoveredUeId] = useState<string | null>(null);

  const isFirebaseConfigured =
    process.env.NEXT_PUBLIC_ENABLE_FIREBASE === "true" &&
    Boolean(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    );

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [...prev.slice(-19), msg]);
  }, []);

  // Load server-computed baseline and coverage together.
  useEffect(() => {
    let alive = true;
    fetch("/api/scenario", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("Scenario unavailable"); return r.json(); })
      .then((s: ScenarioResponse) => {
        if (alive) {
          setScenario(s.scenario);
          setBaseline(s.baseline);
          addLog("Baseline scenario loaded · 5 sites / 100 deterministic UEs");
        }
      })
      .catch(() => {
        if (alive) {
          setNotice("Local API not ready. Check npm run dev and refresh.");
        }
      });
    return () => {
      alive = false;
    };
  }, [addLog]);

  // Load initial Firebase saved-run count when configured
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let alive = true;
    import("@/lib/firebase-client")
      .then(({ countSavedRuns }) => countSavedRuns())
      .then((count) => {
        if (alive && typeof count === "number") {
          setSavedCount(count);
        }
      })
      .catch(() => {
        // Ignore optional Firebase count error on bootstrap
      });
    return () => {
      alive = false;
    };
  }, [isFirebaseConfigured]);

  // Elapsed timer for async AI requests
  useEffect(() => {
    if (!loading) {
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      setElapsedSec((Date.now() - started) / 1000);
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  // Scrollspy for section navigation
  useEffect(() => {
    const sectionIds: NavSectionId[] = ["workspace", "impact"];
    const handleScroll = () => {
      const scrollPos = window.scrollY + 220;
      let current: NavSectionId = "workspace";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollPos) {
          current = id;
        }
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const draft: Change = { siteId: selected, deltaPowerDb: delta };

  const editSite = useCallback((id: SiteId) => {
    if (id === selected || loading) return;
    setInputMode("manual");
    setSelected(id);
    setApproved(false);
    setOutcome(null);
    setExplanation(null);
    setParsed(null);
    setNotice(null);
    setPhase("before");
  }, [selected, loading]);

  const editDelta = useCallback((d: number) => {
    if (d === delta || loading) return;
    setInputMode("manual");
    setDelta(d);
    setApproved(false);
    setOutcome(null);
    setExplanation(null);
    setParsed(null);
    setNotice(null);
    setPhase("before");
  }, [delta, loading]);

  const handlePromptChange = useCallback((value: string) => {
    setInputMode("describe");
    setPrompt(value);
    setParsed(null);
    setApproved(false);
    setOutcome(null);
    setExplanation(null);
    setNotice(null);
    setPhase("before");
  }, []);

  const handleSelectPreset = useCallback(
    (presetPrompt: string, siteId: SiteId, deltaPowerDb: number) => {
      setPrompt(presetPrompt);
      setInputMode("describe");
      setSelected(siteId);
      setDelta(deltaPowerDb);
      setParsed(null);
      setApproved(false);
      setOutcome(null);
      setExplanation(null);
      setNotice(null);
      setPhase("before");
      addLog(`Loaded preset · ${siteId} ${deltaPowerDb > 0 ? "+" : ""}${deltaPowerDb}dB`);
    },
    [addLog]
  );

  const clearProposal = useCallback(() => {
    setParsed(null);
    setApproved(false);
    setOutcome(null);
    setExplanation(null);
    setNotice(null);
    setPhase("before");
    addLog("Proposal and approval state revoked by engineer");
    setLiveStatusMsg("Proposal state cleared. Ready for new input.");
  }, [addLog]);

  async function parse() {
    if (loading) return;
    setLoading("parse");
    setInputMode("describe");
    setElapsedSec(0);
    setPhase("before");
    setNotice(null);
    setApproved(false);
    setOutcome(null);
    setExplanation(null);
    try {
      const p = await postJSON<ParsedProposal>("/api/ai/parse", { prompt });
      setParsed(p);
      if (p.status === "proposal" && p.change) {
        setSelected(p.change.siteId);
        setDelta(p.change.deltaPowerDb);
        addLog("Instruction interpreted; awaiting confirmation");
        setLiveStatusMsg(
          `Change interpreted: ${p.change.siteId.toUpperCase()} ${p.change.deltaPowerDb > 0 ? "+" : ""}${p.change.deltaPowerDb} dB. Awaiting your confirmation.`
        );
      } else {
        addLog("Instruction needs clarification");
        setLiveStatusMsg(
          `Clarification requested: ${p.question}`
        );
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not parse proposal");
    } finally {
      setLoading(null);
    }
  }

  function approve() {
    if (!scenario || loading || parsed?.status === "clarify" || inputMode === "describe" && parsed?.status !== "proposal") return;
    setApproved(true);
    setOutcome(null);
    setExplanation(null);
    setNotice(null);
    const msg = `Human approved SIMULATION only · ${selected} ${delta > 0 ? "+" : ""}${delta}dB`;
    addLog(msg);
    setLiveStatusMsg(
      `Approved ${selected.toUpperCase()} ${delta > 0 ? "+" : ""}${delta} dB for synthetic simulation.`
    );
  }

  async function runSimulation() {
    if (loading || parsed?.status === "clarify") return;
    if (!approved) {
      setNotice("Confirm the proposal for simulation first.");
      return;
    }
    setLoading("sim");
    setElapsedSec(0);
    setNotice(null);
    setOutcome(null);
    setPhase("before");
    setExplanation(null);
    try {
      const o = await postJSON<SimulationResponse>("/api/simulate", draft);
      setOutcome(o);
      setPhase("after");
      addLog(`Deterministic impact computed · ${o.risk} review priority`);
      setLiveStatusMsg(
        `Simulation complete: ${o.risk} review priority. Coverage ${o.baseline.coveragePct}% to ${o.proposed.coveragePct}%, SINR ${o.baseline.avgSinrDb} to ${o.proposed.avgSinrDb} dB.`
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setLoading(null);
    }
  }

  async function explain() {
    if (!outcome) return;
    setLoading("explain");
    setElapsedSec(0);
    setNotice(null);
    try {
      const e = await postJSON<EngineeringExplanation>("/api/ai/explain", draft);
      setExplanation(e);
      addLog("Engineering review generated");
      setLiveStatusMsg(
        `Engineering review ready: ${e.headline}`
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "AI review failed");
    } finally {
      setLoading(null);
    }
  }

  function handleExportJson() {
    if (!scenario || !outcome) return;
    const payload = buildSafetyCasePayload({
      prompt,
      scenario,
      outcome,
      parsed,
      explanation,
    });
    const sign = outcome.change.deltaPowerDb >= 0 ? `plus${outcome.change.deltaPowerDb}` : `minus${Math.abs(outcome.change.deltaPowerDb)}`;
    const filename = `cellshift-safety-case-${outcome.change.siteId}-${sign}dB.json`;
    downloadTextFile(
      filename,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
    addLog(`Exported safety case JSON · ${filename}`);
  }

  function handleExportMarkdown() {
    if (!scenario || !outcome) return;
    const payload = buildSafetyCasePayload({
      prompt,
      scenario,
      outcome,
      parsed,
      explanation,
    });
    const md = formatSafetyCaseMarkdown(payload);
    const sign = outcome.change.deltaPowerDb >= 0 ? `plus${outcome.change.deltaPowerDb}` : `minus${Math.abs(outcome.change.deltaPowerDb)}`;
    const filename = `cellshift-safety-case-${outcome.change.siteId}-${sign}dB.md`;
    downloadTextFile(filename, md, "text/markdown");
    addLog(`Exported safety case Markdown · ${filename}`);
  }

  async function saveToFirebase() {
    if (!outcome) return;
    setSaving(true);
    setSavedStatus(null);
    try {
      const {
        firebaseEnabled,
        saveSyntheticChange,
        countSavedRuns,
      } = await import("@/lib/firebase-client");
      if (!firebaseEnabled()) {
        setSavedStatus(
          "Saving isn't available. You can still download this run."
        );
        return;
      }
      await saveSyntheticChange(draft);
      const total = await countSavedRuns();
      setSavedCount(total);
      setSavedStatus(
        "Run saved to your private history."
      );
      addLog("Saved run to private history");
    } catch {
      setSavedStatus(
        "Saving is unavailable. You can still download this run."
      );
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (loading) return;
    setSavedStatus(null);
    setPrompt(SEED_PROMPT);
    setInputMode("describe");
    setParsed(null);
    setApproved(false);
    setOutcome(null);
    setExplanation(null);
    setSelected("cell-b");
    setDelta(3);
    setPhase("before");
    setNotice(null);
    addLog("Scenario reset to baseline");
    setLiveStatusMsg("Scenario reset to baseline.");
  }

  return (
    <div className="app-shell">
      <a href="#workspace" className="skip-link">
        Skip to main workspace
      </a>

      <div className="sr-only" aria-live="polite">
        {liveStatusMsg}
      </div>

      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />

      <main id="workspace" className="main">
        <Topbar
          onReset={reset}
          busy={loading !== null}
        />

        <div className="content">
          <div className="workspace-hero"><div><h1>Every change has a ripple effect.</h1><p>Explore your network. Test a change. Make the next decision with a clearer picture.</p></div><a className="results-shortcut" href={outcome ? "#impact" : "#change-panel"}>{outcome ? "View impact" : "Start a change"}<ArrowDownRight size={16} aria-hidden="true" /></a></div>
          <ol className="workflow-steps" aria-label="Review progress">{["Propose", "Confirm & run", "Review impact"].map((label, index) => {
            const stage = loading === "sim" ? 1 : outcome ? 2 : inputMode === "manual" || parsed?.status === "proposal" ? 1 : 0;
            return <li key={label} className={index < stage ? "complete" : index === stage ? "active" : ""} aria-current={index === stage ? "step" : undefined}><span className="step-index">{index < stage ? <Check size={11} /> : index + 1}</span>{label}</li>;
          })}</ol>

          {notice && <div className="notice" role="alert"><CircleAlert size={18} /><span>{notice}</span><button type="button" aria-label="Dismiss alert" onClick={() => setNotice(null)}><X size={16} /></button></div>}

          {/* Network topology and change controls */}
          <section className="overview" aria-label="Network and proposed change">
            <div className="topology-and-controls">
              <TopologyCanvas
                scenario={scenario}
                baselineStates={baseline?.states}
                coverage={phase === "after" && outcome ? outcome.coverage : baseline?.coverage}
                outcome={outcome}
                phase={phase}
                onPhaseChange={setPhase}
                selected={selected}
                delta={delta}
                onSelect={editSite}
                hoveredUeId={hoveredUeId}
                onHoverUe={setHoveredUeId}
                disabled={loading !== null}
              />

              <ProposalControlPanel
                scenario={scenario}
                prompt={prompt}
                inputMode={inputMode}
                onInputModeChange={setInputMode}
                onPromptChange={handlePromptChange}
                onSelectPreset={handleSelectPreset}
                onParse={parse}
                parsed={parsed}
                selected={selected}
                delta={delta}
                onSelectSite={editSite}
                onSelectDelta={editDelta}
                approved={approved}
                simulated={!!outcome}
                onApprove={approve}
                onClearProposal={clearProposal}
                onRunSimulation={runSimulation}
                loading={loading}
                elapsedSec={loading ? elapsedSec : 0}
              />
            </div>
          </section>

          {/* Impact Analysis & AI Engineering Review */}
          <section
            id="impact"
            className="impact-section"
            aria-labelledby="impact-heading"
          >
            <div className="section-heading">
              <div className="section-identity"><span className="section-icon metrics-icon"><Activity size={19} /></span><div>
                <h2 id="impact-heading">{outcome ? "Change impact" : "Network baseline"}</h2>
                <p>{outcome ? "The gains, the trade-offs, and the users affected." : "Your starting point. Run a simulation to see what changes."}</p>
              </div></div>
              {outcome ? (
                <span className={`pill ${riskClass(outcome.risk)}`}>
                  <CircleAlert size={13} aria-hidden="true" />
                  <span>{outcome.risk} REVIEW PRIORITY</span>
                </span>
              ) : (
                <span className="pill neutral">Simulated metrics</span>
              )}
            </div>

            <KpiGrid outcome={outcome} baseline={baseline?.metrics} />

            {outcome ? <div className="two-column">
              <BlastRadiusPanel
                outcome={outcome}
                hoveredUeId={hoveredUeId}
                onHoverUe={setHoveredUeId}
              />

              <EngineeringReviewPanel
                outcome={outcome}
                explanation={explanation}
                loading={loading}
                elapsedSec={loading ? elapsedSec : 0}
                onExplain={explain}
                onExportJson={handleExportJson}
                onExportMarkdown={handleExportMarkdown}
                isFirebaseConfigured={isFirebaseConfigured}
                saving={saving}
                savedStatus={savedStatus}
                savedCount={savedCount}
                onSaveToFirebase={saveToFirebase}
              />
            </div> : <p className="results-ready-note">Run a simulation to reveal affected users, review signals and rollback checks.</p>}
          </section>
          <details className="model-details"><summary>About this simulation</summary><ul>{(outcome?.limitations ?? ["Sites and users are fictional. Coverage is a synthetic estimate, not a field measurement.", "The coverage layer samples the same model as the user simulation; it does not show measured radio footprints.", "AI helps interpret instructions and review evidence. Numerical results come from the simulation engine.", "No real network configuration is changed."]).map((item) => <li key={item}>{item}</li>)}</ul></details>
          <details className="audit-details"><summary>Run details</summary><ol>{log.map((entry, i) => <li key={`${i}-${entry}`}>{entry}</li>)}</ol></details>
          <footer className="footer"><strong>CellShift AI · Pre-change review sandbox</strong><span>Synthetic evidence. Engineering judgment required.</span></footer>
        </div>
      </main>
    </div>
  );
}

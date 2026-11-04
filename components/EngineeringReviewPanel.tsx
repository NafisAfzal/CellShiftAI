"use client";

import { useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  CircleDot,
  Download,
  FileJson,
  FileText,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
} from "lucide-react";
import type { Outcome } from "@/lib/simulation";
import type { EngineeringExplanation } from "@/lib/types";
import { SourceBadge } from "./SourceBadge";

type EngineeringReviewPanelProps = {
  outcome: Outcome | null;
  explanation: EngineeringExplanation | null;
  loading: "parse" | "sim" | "explain" | null;
  elapsedSec: number;
  onExplain: () => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  isFirebaseConfigured: boolean;
  saving: boolean;
  savedStatus: string | null;
  savedCount: number | null;
  onSaveToFirebase: () => void;
};

export function EngineeringReviewPanel({
  outcome,
  explanation,
  loading,
  elapsedSec,
  onExplain,
  onExportJson,
  onExportMarkdown,
  isFirebaseConfigured,
  saving,
  savedStatus,
  savedCount,
  onSaveToFirebase,
}: EngineeringReviewPanelProps) {
  const [download, setDownload] = useState<{ outcome: Outcome; format: "JSON" | "Markdown" } | null>(null);
  function exportArtifact(format: "JSON" | "Markdown") {
    if (!outcome || loading) return;
    if (format === "JSON") onExportJson();
    else onExportMarkdown();
    setDownload({ outcome, format });
  }

  return (
    <div id="ai-review" className="surface review-panel" aria-busy={loading === "explain"}>
      <div className="panel-title">
        <div className="panel-title-left">
          <span className="section-icon review-icon"><BrainCircuit size={18} aria-hidden="true" /></span>
          <div className="panel-heading-text">
            <h3 className="panel-main-label">Engineering review</h3>
          </div>
        </div>
        <SourceBadge
          source={explanation?.source}
          fallbackReason={explanation?.fallbackReason}
        />
      </div>

      <p className="panel-hint">
        A summary of trade-offs, checks to make, and a rollback plan.
      </p>

      {/* Action Button */}
      <button
        type="button"
        className="outline-btn explain-action-btn tinted-action"
        onClick={onExplain}
        disabled={!outcome || loading !== null}
        title={explanation ? "Re-evaluate this simulated change using the current evidence" : "Create validation checks and rollback preparation from the computed evidence"}
      >
        {loading === "explain" ? (
          <>
            <RefreshCw size={16} className="spin" aria-hidden="true" />
            <span>Generating review ({elapsedSec.toFixed(1)}s)…</span>
          </>
        ) : (
          <>
            {explanation ? <RefreshCw size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
            <span>
              {explanation
                ? "Refresh review"
                : "Generate review"}
            </span>
            <ArrowRight size={15} aria-hidden="true" />
          </>
        )}
      </button>

      {/* Artifact Export Panel */}
      {outcome && (
        <div className="artifact-actions-box">
          <div className="artifact-box-header">
            <Download size={15} className="text-cyan" aria-hidden="true" />
            <span>Download evidence</span>
          </div>
          <p id="export-scope" className="export-scope">{explanation ? "Includes simulation evidence and the current engineering review." : "Simulation evidence is ready. Generate a review above to include validation and rollback checks."}</p>

          <div className="artifact-btn-row">
            <button
              type="button"
              className="export-btn export-json"
              onClick={() => exportArtifact("JSON")}
              disabled={loading !== null}
              aria-describedby="export-scope"
              title="Download structured simulation evidence as a JSON (.json) file"
            >
              <FileJson size={14} aria-hidden="true" />
              <span>JSON data</span>
            </button>

            <button
              type="button"
              className="export-btn export-md"
              onClick={() => exportArtifact("Markdown")}
              disabled={loading !== null}
              aria-describedby="export-scope"
              title="Download the readable safety case as a Markdown (.md) report"
            >
              <FileText size={14} aria-hidden="true" />
              <span>Markdown report</span>
            </button>
          </div>
          {download?.outcome === outcome && <p className="download-status" role="status"><Download size={13} aria-hidden="true" />{download.format} download started.</p>}

          {/* Optional Firebase Save */}
          {isFirebaseConfigured && (
            <div className="firebase-save-row">
              <button
                type="button"
                className="firebase-btn"
                onClick={onSaveToFirebase}
                disabled={saving}
              >
                {saving ? (
                  <RefreshCw size={14} className="spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>
                  {saving ? "Saving run…" : "Save run"}
                </span>
              </button>
              {typeof savedCount === "number" && (
                <span className="saved-count-tag">
                  {savedCount} runs saved
                </span>
              )}
            </div>
          )}

          {savedStatus && (
            <div className="firebase-status-note" role="status">
              <span>{savedStatus}</span>
            </div>
          )}
        </div>
      )}

      {explanation?.fallbackReason && explanation.source === "MOCK_FALLBACK" && (
        <div className="fallback-reason-note review-fallback" role="status">
          <span>{explanation.fallbackReason}</span>
        </div>
      )}

      {explanation && (
        <div className="review-content">
          <div className="headline-badge-row">
            <Sparkles size={16} className="text-cyan" />
            <h3>{explanation.headline}</h3>
          </div>

          <div className="subheading">Computed observations</div>
          {explanation.observations.map((x, i) => (
            <div key={i} className="observation-item">
              <CircleDot size={15} className="observation-marker" aria-hidden="true" />
              <span>{x}</span>
            </div>
          ))}

          <div className="subheading">Validation checklist</div>
          {explanation.checks.map((x, i) => (
            <div key={i} className="list-note">
              <span className="check-number">{i + 1}</span>
              <span>{x}</span>
            </div>
          ))}

          <div className="subheading">Rollback preparation</div>
          {explanation.rollback.map((x, i) => (
            <div key={i} className="list-note rollback-note">
              <RotateCcw size={14} className="text-amber" aria-hidden="true" />
              <span>{x}</span>
            </div>
          ))}

          <p className="tiny-caveat">{explanation.limitation}</p>
        </div>
      )}


    </div>
  );
}

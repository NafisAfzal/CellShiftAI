"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Layers,
} from "lucide-react";
import type { Outcome, UEState } from "@/lib/simulation";

export function BlastRadiusPanel({
  outcome,
  hoveredUeId,
  onHoverUe,
}: {
  outcome: Outcome | null;
  hoveredUeId?: string | null;
  onHoverUe?: (id: string | null) => void;
}) {
  const [showAllUsers, setShowAllUsers] = useState(false);

  const affectedDetails = useMemo(() => {
    if (!outcome) return [];
    const beforeMap = new Map<string, UEState>(
      outcome.before.map((u) => [u.id, u])
    );
    const afterMap = new Map<string, UEState>(
      outcome.after.map((u) => [u.id, u])
    );

    const priorityIds = Array.from(
      new Set([
        ...outcome.proposed.newlyUncovered,
        ...outcome.proposed.newlyCovered,
        ...outcome.proposed.associationChanges,
      ])
    );

    return priorityIds.map((id) => {
      const b = beforeMap.get(id);
      const a = afterMap.get(id);
      const isUncovered = outcome.proposed.newlyUncovered.includes(id);
      const isNewlyCovered = outcome.proposed.newlyCovered.includes(id);
      const category = isUncovered
        ? "UNCOVERED"
        : isNewlyCovered
          ? "COVERED"
          : "REASSOC";
      return {
        id,
        category,
        beforeCell: b?.serving ? b.serving.replace("cell-", "").toUpperCase() : "NONE",
        afterCell: a?.serving ? a.serving.replace("cell-", "").toUpperCase() : "NONE",
        sinrDelta:
          b && a ? Math.round((a.sinrDb - b.sinrDb) * 100) / 100 : 0,
      };
    });
  }, [outcome]);

  const visibleUsers = showAllUsers
    ? affectedDetails
    : affectedDetails.slice(0, 8);

  return (
    <div className="surface evidence-panel glow-panel">
      <div className="panel-title">
        <div className="panel-title-left">
          <span className="section-icon evidence-icon"><Layers size={18} aria-hidden="true" /></span>
          <div className="panel-heading-text">
            <h3 className="panel-main-label">Affected users &amp; evidence</h3>
          </div>
        </div>
      </div>

      {!outcome ? (
        <div className="empty-state">
          <FlaskConical size={32} className="text-cyan mb-2" aria-hidden="true" />
          <strong>No Impact Analysis Yet</strong>
          <p>
            Approve a proposal and execute the deterministic simulation to reveal
            affected synthetic users, handover cascades, and guardrail signals.
          </p>
        </div>
      ) : (
        <>
          {/* Evidence Counter Triad */}
          <div className="evidence-grid">
            <div className="evidence-tile negative-tile">
              <span className="evidence-num negative">
                {outcome.proposed.newlyUncovered.length}
              </span>
              <span className="evidence-label">Lost coverage</span>
            </div>
            <div className="evidence-tile positive-tile">
              <span className="evidence-num positive">
                {outcome.proposed.newlyCovered.length}
              </span>
              <span className="evidence-label">Gained coverage</span>
            </div>
            <div className="evidence-tile warning-tile">
              <span className="evidence-num warning">
                {outcome.proposed.overloadedCells}
              </span>
              <span className="evidence-label">Overloaded cells</span>
            </div>
          </div>

          <div className="subheading">Review signals</div>
          <div className="evidence-reasons">
            {outcome.reasons.map((r, i) => (
              <div key={i} className="reason-item">
                <AlertTriangle size={15} className="text-amber" aria-hidden="true" />
                <span>{r}</span>
              </div>
            ))}
          </div>

          <div className="subheading-row">
            <div className="subheading">
              Affected simulated users ({affectedDetails.length})
            </div>
            {affectedDetails.length > 8 && (
              <button
                type="button"
                className="expand-ids-btn"
                aria-expanded={showAllUsers}
                aria-controls="affected-users"
                onClick={() => setShowAllUsers((prev) => !prev)}
              >
                {showAllUsers ? (
                  <>
                    <span>Show top 8</span>
                    <ChevronUp size={13} aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <span>View all {affectedDetails.length}</span>
                    <ChevronDown size={13} aria-hidden="true" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Interactive affected user chip list */}
          <p id="affected-user-help" className="evidence-interaction-hint">Hover or focus a user to locate it on the map.</p>
          <div id="affected-users" className="affected-users-list" role="list" aria-describedby="affected-user-help">
            {visibleUsers.map((item) => {
              const isHovered = hoveredUeId === item.id;
              return (
                <div
                  key={item.id}
                  role="listitem"
                  tabIndex={0}
                  className={`affected-ue-row ${isHovered ? "ue-row-highlighted" : ""}`}
                  onMouseEnter={() => onHoverUe && onHoverUe(item.id)}
                  onMouseLeave={() => onHoverUe && onHoverUe(null)}
                  onFocus={() => onHoverUe?.(item.id)}
                  onBlur={() => onHoverUe?.(null)}
                >
                  <div className="ue-row-left">
                    <span className="ue-id-text">{item.id.toUpperCase()}</span>
                    <span
                      className={`ue-category-badge cat-${item.category.toLowerCase()}`}
                    >
                      {item.category}
                    </span>
                  </div>
                  <div className="ue-row-right">
                    <span className="ue-cell-shift">
                      {item.beforeCell} → {item.afterCell}
                    </span>
                    <span
                      className={`ue-sinr-diff ${
                        item.sinrDelta > 0
                          ? "positive"
                          : item.sinrDelta < 0
                            ? "negative"
                            : ""
                      }`}
                    >
                      {item.sinrDelta > 0 ? `+${item.sinrDelta}` : item.sinrDelta} dB
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

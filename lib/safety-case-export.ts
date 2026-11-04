import { LIMITATIONS, MODEL_VERSION, type Outcome, type Scenario } from "./simulation.ts";
import type {
  EngineeringExplanation,
  ParsedProposal,
  PresetScenario,
  SafetyCaseExport,
} from "./types";

export const DETERMINISTIC_SEED = 29731;

export const SYNTHETIC_DISCLAIMER =
  "SYNTHETIC PRE-CHANGE REVIEW SANDBOX — Educational deterministic proxy only. Not a calibrated 3GPP RF propagation model, drive-test replacement, or live RAN controller.";

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: "preset-cell-b-plus-3",
    siteId: "cell-b",
    deltaPowerDb: 3,
    shortLabel: "+3 dB · Cell B",
    siteName: "Central Hub",
    prompt: "Increase Cell B power by 3 dB",
    expectedSummary: "Expands Central Hub footprint and shifts neighbor associations",
  },
  {
    id: "preset-cell-c-minus-4",
    siteId: "cell-c",
    deltaPowerDb: -4,
    shortLabel: "−4 dB · Cell C",
    siteName: "Harbor",
    prompt: "Reduce Cell C power by 4 dB",
    expectedSummary: "Tests Harbor coverage contraction and edge UE drop risk",
  },
  {
    id: "preset-cell-a-plus-6",
    siteId: "cell-a",
    deltaPowerDb: 6,
    shortLabel: "+6 dB · Cell A",
    siteName: "North Gate",
    prompt: "Increase Cell A power by 6 dB",
    expectedSummary: "Maximum +6 dB boundary check on North Gate interference",
  },
  {
    id: "preset-cell-d-minus-3",
    siteId: "cell-d",
    deltaPowerDb: -3,
    shortLabel: "−3 dB · Cell D",
    siteName: "South Park",
    prompt: "Decrease Cell D power by 3 dB",
    expectedSummary: "Evaluates South Park power trim and neighbor offload",
  },
];

export function buildSafetyCasePayload(params: {
  prompt: string;
  scenario: Scenario;
  outcome: Outcome;
  parsed: ParsedProposal | null;
  explanation: EngineeringExplanation | null;
  exportedAtIso?: string;
}): SafetyCaseExport {
  const { prompt, scenario, outcome, parsed, explanation, exportedAtIso } = params;
  const baseCell = scenario.cells.find((c) => c.id === outcome.change.siteId);
  const baselinePowerDbm = baseCell ? baseCell.powerDbm : 38;
  const siteName = baseCell ? baseCell.name : outcome.change.siteId.toUpperCase();
  const matchesParsed =
    parsed?.status === "proposal" &&
    parsed.change?.siteId === outcome.change.siteId &&
    parsed.change?.deltaPowerDb === outcome.change.deltaPowerDb;

  return {
    schemaVersion: "cellshift-safety-case-v1.0",
    exportedAtIso: exportedAtIso ?? new Date().toISOString(),
    modelVersion: outcome.scenarioVersion || MODEL_VERSION,
    deterministicSeed: DETERMINISTIC_SEED,
    syntheticDisclaimer: SYNTHETIC_DISCLAIMER,
    proposal: {
      prompt: prompt.trim(),
      siteId: outcome.change.siteId,
      siteName,
      baselinePowerDbm,
      deltaPowerDb: outcome.change.deltaPowerDb,
      proposedPowerDbm: baselinePowerDbm + outcome.change.deltaPowerDb,
      parseSource: matchesParsed && parsed ? parsed.source : "MANUAL_CONTROL",
      parseModel: matchesParsed && parsed ? parsed.model : "manual engineer override",
      humanApprovedForSimulation: true,
    },
    impactSummary: {
      riskPriority: outcome.risk,
      triggeredReasons: outcome.reasons,
      baseline: outcome.baseline,
      proposed: outcome.proposed,
      delta: outcome.delta,
    },
    engineeringReview: explanation,
    limitations: outcome.limitations?.length ? outcome.limitations : LIMITATIONS,
    signOffPlaceholder: {
      reviewerRole: "Lead RF / RAN Change Review Engineer",
      approvalScope: "SYNTHETIC PRE-REVIEW ONLY — NOT AUTHORIZED FOR LIVE OSS/RAN EXECUTION",
      rollbackVerified: false,
    },
  };
}

export function formatSafetyCaseMarkdown(safetyCase: SafetyCaseExport): string {
  const { proposal, impactSummary, engineeringReview, limitations, signOffPlaceholder } =
    safetyCase;
  const sign = proposal.deltaPowerDb > 0 ? "+" : "";
  const covSign = impactSummary.delta.coveragePct > 0 ? "+" : "";
  const sinrSign = impactSummary.delta.avgSinrDb > 0 ? "+" : "";
  const rateSign = impactSummary.delta.avgRateProxy > 0 ? "+" : "";

  const lines: string[] = [
    `# CellShift AI — Synthetic Pre-Change Safety Case`,
    ``,
    `> **IMPORTANT DISCLAIMER:** ${safetyCase.syntheticDisclaimer}`,
    ``,
    `## 1. Change Metadata & Provenance`,
    `- **Schema Version:** \`${safetyCase.schemaVersion}\``,
    `- **Simulation Engine:** \`${safetyCase.modelVersion}\` (Seed: \`${safetyCase.deterministicSeed}\`)`,
    `- **Exported At:** \`${safetyCase.exportedAtIso}\``,
    `- **Target Site:** \`${proposal.siteId}\` (${proposal.siteName})`,
    `- **Transmit Power Change:** \`${proposal.baselinePowerDbm} dBm -> ${proposal.proposedPowerDbm} dBm (${sign}${proposal.deltaPowerDb} dB)\``,
    `- **Engineer Prompt:** ${JSON.stringify(proposal.prompt)}`,
    `- **Proposal Provenance:** \`${proposal.parseSource}\` (${proposal.parseModel})`,
    `- **Human Gate:** Explicitly confirmed for synthetic simulation`,
    ``,
    `## 2. Deterministic Proxy KPI Comparison`,
    `| Metric (Synthetic Proxy) | Baseline | Proposed | Delta |`,
    `| :--- | :---: | :---: | :---: |`,
    `| **Covered Users (of 100)** | ${impactSummary.baseline.coveredUsers} (${impactSummary.baseline.coveragePct.toFixed(1)}%) | ${impactSummary.proposed.coveredUsers} (${impactSummary.proposed.coveragePct.toFixed(1)}%) | ${covSign}${impactSummary.delta.coveragePct.toFixed(2)} pp |`,
    `| **Mean SINR Proxy** | ${impactSummary.baseline.avgSinrDb.toFixed(2)} dB | ${impactSummary.proposed.avgSinrDb.toFixed(2)} dB | ${sinrSign}${impactSummary.delta.avgSinrDb.toFixed(2)} dB |`,
    `| **Mean Rate Proxy** | ${impactSummary.baseline.avgRateProxy.toFixed(2)} | ${impactSummary.proposed.avgRateProxy.toFixed(2)} | ${rateSign}${impactSummary.delta.avgRateProxy.toFixed(2)} |`,
    `| **Overloaded Cells** | ${impactSummary.baseline.overloadedCells} | ${impactSummary.proposed.overloadedCells} | ${impactSummary.proposed.overloadedCells - impactSummary.baseline.overloadedCells} |`,
    `| **Cell Re-associations** | 0 (baseline ref) | ${impactSummary.proposed.handovers} | +${impactSummary.proposed.handovers} |`,
    ``,
    `## 3. Blast Radius & Guardrail Signals`,
    `- **Review Priority Tier:** **${impactSummary.riskPriority}**`,
    `- **Newly Uncovered UEs (${impactSummary.proposed.newlyUncovered.length}):** ${impactSummary.proposed.newlyUncovered.length ? impactSummary.proposed.newlyUncovered.map((id) => `\`${id}\``).join(", ") : "None"}`,
    `- **Newly Covered UEs (${impactSummary.proposed.newlyCovered.length}):** ${impactSummary.proposed.newlyCovered.length ? impactSummary.proposed.newlyCovered.map((id) => `\`${id}\``).join(", ") : "None"}`,
    `- **Re-associated UEs (${impactSummary.proposed.associationChanges.length}):** ${impactSummary.proposed.associationChanges.length ? impactSummary.proposed.associationChanges.map((id) => `\`${id}\``).join(", ") : "None"}`,
    ``,
    `### Triggered Review Signals`,
    ...impactSummary.triggeredReasons.map((r) => `- ${r}`),
    ``,
  ];

  if (engineeringReview) {
    lines.push(
      `## 4. Qualitative Engineering Review (\`${engineeringReview.source}\` · ${engineeringReview.model})`,
      `**Headline:** ${engineeringReview.headline}`,
      ``,
      `### Deterministic Observations`,
      ...engineeringReview.observations.map((obs) => `- ${obs}`),
      ``,
      `### Pre-Change Validation Checklist`,
      ...engineeringReview.checks.map((chk, idx) => `${idx + 1}. ${chk}`),
      ``,
      `### Rollback Preparation`,
      ...engineeringReview.rollback.map((rb, idx) => `${idx + 1}. ${rb}`),
      ``,
      `> *Review Caveat:* ${engineeringReview.limitation}`,
      ``
    );
  } else {
    lines.push(
      `## 4. Qualitative Engineering Review`,
      `_AI engineering review was not requested prior to export._`,
      ``
    );
  }

  lines.push(
    `## 5. Model Limitations & Sign-Off Placeholder`,
    ...limitations.map((lim) => `- ${lim}`),
    ``,
    `- **Reviewer Role:** ${signOffPlaceholder.reviewerRole}`,
    `- **Approval Scope:** ${signOffPlaceholder.approvalScope}`,
    `- **Rollback Plan Verified:** [ ] Pending human engineer verification`,
    ``
  );

  return lines.join("\n");
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string
): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

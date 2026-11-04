import type { Change, Metrics, Outcome, Scenario, SiteId, UEState } from "./simulation";
import type { CoverageField } from "./coverage-field";

/**
 * Strict provenance states for AI operations.
 * - GEMINI_LIVE: Verified response from Google Gemini API (@google/genai)
 * - OPENROUTER_LIVE: Validated response from the configured OpenRouter model
 * - MOCK_LOCAL: Deterministic local rule parser / template (when AI_MODE=mock or no API key)
 * - MOCK_FALLBACK: Deterministic local fallback triggered after Gemini timeout, quota, network, or validation error
 */
export type AISource = "GEMINI_LIVE" | "OPENROUTER_LIVE" | "MOCK_LOCAL" | "MOCK_FALLBACK";

export type ParsedProposal = {
  status: "proposal" | "clarify";
  interpretation: string;
  question: string;
  change: Change | null;
  source: AISource;
  model: string;
  fallbackReason?: string;
};

export type EngineeringExplanation = {
  source: AISource;
  model: string;
  headline: string;
  observations: string[];
  checks: string[];
  rollback: string[];
  limitation: string;
  fallbackReason?: string;
};

export type HealthStatus = {
  status: "ok";
  model: string;
  aiMode: "gemini" | "openrouter" | "mock";
  aiModel: string;
  providerConfigured: boolean;
  geminiKeyConfigured: boolean;
  deployment: string;
};

export type ScenarioResponse = {
  scenario: Scenario;
  baseline: { metrics: Metrics; states: UEState[]; coverage: CoverageField };
  limitations: string[];
  source: "SYNTHETIC_SEEDED";
};

export type SimulationResponse = Outcome & { coverage: CoverageField };

export type PresetScenario = {
  id: string;
  siteId: SiteId;
  deltaPowerDb: number;
  shortLabel: string;
  siteName: string;
  prompt: string;
  expectedSummary: string;
};

export type SafetyCaseExport = {
  schemaVersion: "cellshift-safety-case-v1.0";
  exportedAtIso: string;
  modelVersion: string;
  deterministicSeed: number;
  syntheticDisclaimer: string;
  proposal: {
    prompt: string;
    siteId: SiteId;
    siteName: string;
    baselinePowerDbm: number;
    deltaPowerDb: number;
    proposedPowerDbm: number;
    parseSource: AISource | "MANUAL_CONTROL";
    parseModel: string;
    humanApprovedForSimulation: true;
  };
  impactSummary: {
    riskPriority: Outcome["risk"];
    triggeredReasons: string[];
    baseline: Outcome["baseline"];
    proposed: Outcome["proposed"];
    delta: Outcome["delta"];
  };
  engineeringReview: EngineeringExplanation | null;
  limitations: string[];
  signOffPlaceholder: {
    reviewerRole: string;
    approvalScope: string;
    rollbackVerified: boolean;
  };
};

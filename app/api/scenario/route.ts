import { NextResponse } from "next/server";
import { defaultScenario, LIMITATIONS, simulate } from "@/lib/simulation";
import type { ScenarioResponse } from "@/lib/types";
import { buildCoverageField } from "@/lib/coverage-field";

export const runtime = "nodejs";

export async function GET() {
  const scenario = defaultScenario();
  const baseline = simulate(scenario, { siteId: "cell-b", deltaPowerDb: 0 });
  const payload: ScenarioResponse = {
    scenario,
    baseline: { metrics: baseline.baseline, states: baseline.before, coverage: buildCoverageField(scenario) },
    limitations: LIMITATIONS,
    source: "SYNTHETIC_SEEDED",
  };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}

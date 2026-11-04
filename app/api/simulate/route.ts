import { NextRequest, NextResponse } from "next/server";
import { changeSchema } from "@/lib/ai";
import { defaultScenario, simulate } from "@/lib/simulation";
import { jsonError, rateLimit, readSmallJSON, sameOrigin } from "@/lib/http";
import { buildCoverageField } from "@/lib/coverage-field";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError("Origin rejected", 403);
  if (!rateLimit(req, 50)) {
    return jsonError("Too many simulation requests", 429);
  }
  try {
    const change = changeSchema.parse(await readSmallJSON(req));
    const scenario = defaultScenario();
    const outcome = simulate(scenario, change);
    return NextResponse.json({ ...outcome, coverage: buildCoverageField(scenario, change) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return jsonError(
      "Change rejected; only Cell A–E and integer delta -6..6 within 30–46 dBm are allowed."
    );
  }
}

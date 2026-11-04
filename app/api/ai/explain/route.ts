import { NextRequest, NextResponse } from "next/server";
import { changeSchema, explainApprovedChange } from "@/lib/ai";
import { jsonError, rateLimit, readSmallJSON, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError("Origin rejected", 403);
  if (!rateLimit(req, 12)) {
    return jsonError("Demo request limit reached; retry later", 429);
  }
  try {
    const data = changeSchema.parse(await readSmallJSON(req));
    return NextResponse.json(await explainApprovedChange(data), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return jsonError(
      "Invalid change request. Cell A–E, integer dB delta -6..6 required."
    );
  }
}

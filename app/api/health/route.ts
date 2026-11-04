import { NextResponse } from "next/server";
import { aiMode } from "@/lib/ai";
import { providerConfig } from "@/lib/ai-provider";
import { MODEL_VERSION } from "@/lib/simulation";
import type { HealthStatus } from "@/lib/types";

export async function GET() {
  const payload: HealthStatus = {
    status: "ok",
    model: MODEL_VERSION,
    aiMode: aiMode(),
    aiModel: providerConfig().model,
    providerConfigured: aiMode() !== "mock",
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    deployment: "localhost demo",
  };
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}

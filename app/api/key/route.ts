import { NextResponse } from "next/server";
import { providerConfig } from "@/lib/ai-provider";

/** Read-only configuration summary. Credentials are managed in server environment files. */
export async function GET() {
  const { mode, model } = providerConfig();
  return NextResponse.json({ configured: mode !== "mock", mode, model }, { headers: { "Cache-Control": "no-store" } });
}

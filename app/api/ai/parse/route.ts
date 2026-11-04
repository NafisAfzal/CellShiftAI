import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseEngineerPrompt } from "@/lib/ai";
import { jsonError, rateLimit, readSmallJSON, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

const schema = z
  .object({
    prompt: z.string().trim().min(8).max(320),
  })
  .strict();

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError("Origin rejected", 403);
  if (!rateLimit(req, 12)) {
    return jsonError("Demo request limit reached; retry later", 429);
  }
  try {
    const data = schema.parse(await readSmallJSON(req));
    const result = await parseEngineerPrompt(data.prompt);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return jsonError(
      e instanceof z.ZodError
        ? "Enter an engineer instruction (8–320 characters)."
        : e instanceof Error
          ? e.message
          : "Invalid request"
    );
  }
}

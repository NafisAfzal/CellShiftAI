import type { NextRequest } from "next/server";

export type RequestLike = Pick<NextRequest, "headers" | "nextUrl" | "text">;

/**
 * Localhost demo rate-limit store.
 * Note: In-memory buckets keyed by path and client IP hint are suitable for single-instance
 * localhost demonstrations only; public deployments require authenticated user quotas.
 */
const buckets = new Map<string, { start: number; count: number }>();

export function jsonError(message: string, status = 400): Response {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export function rateLimit(req: RequestLike, limit = 20): boolean {
  const clientHint =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 45) ||
    "local";
  const key = `${req.nextUrl.pathname}:${clientHint}`;
  const now = Date.now();
  const prev = buckets.get(key);
  const state =
    prev && now - prev.start < 60_000 ? prev : { start: now, count: 0 };
  state.count++;
  buckets.set(key, state);

  if (buckets.size > 500) {
    for (const [k, v] of buckets) {
      if (now - v.start > 60_000) buckets.delete(k);
    }
  }
  return state.count <= limit;
}

export async function readSmallJSON(req: RequestLike): Promise<unknown> {
  const contentType = req.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new Error("Content-Type must be application/json");
  }
  const text = await req.text();
  if (text.length > 2000) {
    throw new Error("Request too large");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Invalid JSON");
  }
}

export function sameOrigin(req: RequestLike): boolean {
  // In localhost mode browser origins must match; CLI scripts/tests without Origin are permitted.
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const reqHost = req.nextUrl.host;
    if (originHost === reqHost) return true;
    const normalize = (h: string) => h.replace(/^127\.0\.0\.1(?=:|$)/, "localhost");
    return normalize(originHost) === normalize(reqHost);
  } catch {
    return false;
  }
}

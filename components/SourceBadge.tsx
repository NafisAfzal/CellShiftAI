"use client";

import { CircleHelp, FlaskConical, Sparkles } from "lucide-react";
import type { AISource } from "@/lib/types";

export function SourceBadge({
  source,
  fallbackReason,
}: {
  source?: AISource;
  fallbackReason?: string;
}) {
  if (!source) {
    return (
      <span className="pill neutral" title="No AI or local parse call executed yet">
        <CircleHelp size={13} aria-hidden="true" />
        <span>Not generated</span>
      </span>
    );
  }

  const live = source === "GEMINI_LIVE" || source === "OPENROUTER_LIVE";
  const isFallback = source === "MOCK_FALLBACK";
  const label = live
    ? "AI assisted"
    : isFallback
      ? "Local fallback"
      : "Local assistant";

  const tooltip = [
    live ? "AI response received and validated." : isFallback ? "AI is unavailable. Local interpretation was used." : "Interpreted locally without an AI request.",
    fallbackReason ? `Note: ${fallbackReason}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      className={`pill ${live ? "success" : isFallback ? "warning" : "neutral"}`}
      title={tooltip}
      aria-label={tooltip}
    >
      {live ? (
        <Sparkles size={13} aria-hidden="true" />
      ) : (
        <FlaskConical size={13} aria-hidden="true" />
      )}
      <span>{label}</span>
    </span>
  );
}

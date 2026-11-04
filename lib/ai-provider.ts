import { GoogleGenAI } from "@google/genai";

export const NEMOTRON_MODEL = "nvidia/nemotron-3.5-lightning";
export type ProviderMode = "openrouter" | "gemini" | "mock";

export function providerConfig() {
  const requested = process.env.AI_MODE;
  const mode: ProviderMode = requested === "openrouter" && process.env.OPENROUTER_API_KEY?.trim()
    ? "openrouter" : requested === "gemini" && process.env.GEMINI_API_KEY?.trim() ? "gemini" : "mock";
  return {
    mode,
    model: mode === "openrouter" ? process.env.OPENROUTER_MODEL?.trim() || NEMOTRON_MODEL
      : mode === "gemini" ? process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash" : "local deterministic parser",
  };
}

export async function runStructuredInteraction(input: string, schema: Record<string, unknown>): Promise<{ text: string; usedModel: string; source: "OPENROUTER_LIVE" | "GEMINI_LIVE" }> {
  const config = providerConfig();
  if (config.mode === "mock") throw new Error("No live provider configured");
  if (config.mode === "openrouter") {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!.trim()}`, "Content-Type": "application/json", "X-OpenRouter-Title": "CellShift AI local sandbox" },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "system", content: "Return only the requested structured JSON. No tools, commands or network actions are available." }, { role: "user", content: input }],
        response_format: { type: "json_schema", json_schema: { name: "cellshift_response", strict: true, schema: { ...schema, additionalProperties: false } } },
        provider: { require_parameters: true },
        reasoning: { enabled: false },
        temperature: 0,
        max_tokens: 1400,
      }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    // Provider bodies can contain request details; never surface them to the browser or logs.
    if (!response.ok) throw new Error(`OpenRouter request failed (${response.status})`);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("choices" in data) || !Array.isArray(data.choices)) throw new Error("Invalid provider response");
    const choice = data.choices[0] as { message?: { content?: unknown }; finish_reason?: string } | undefined;
    const content = choice?.message?.content;
    if (typeof content !== "string" || !content.trim() || content.length > 16000 || choice?.finish_reason === "length") throw new Error("Incomplete provider response");
    return { text: content, usedModel: config.model, source: "OPENROUTER_LIVE" };
  }
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!.trim(), httpOptions: { timeout: 15000 } });
  const response = await client.models.generateContent({ model: config.model, contents: input, config: { responseMimeType: "application/json", responseJsonSchema: schema } });
  if (!response.text) throw new Error("Empty Gemini response");
  return { text: response.text, usedModel: config.model, source: "GEMINI_LIVE" };
}

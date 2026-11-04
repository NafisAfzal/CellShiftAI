# AI provider setup

Keep provider keys in the gitignored `.env.local`, with no `NEXT_PUBLIC_` prefix. The browser has no credential-entry dialog or writable key endpoint.

```dotenv
AI_MODE=openrouter
OPENROUTER_API_KEY=your-server-key
OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning
```

The model identifier is documented on [OpenRouter's Nemotron 3.5 Lightning page](https://openrouter.ai/nvidia/nemotron-3.5-lightning). Requests use the [Chat Completions structured-output format](https://openrouter.ai/docs/guides/features/structured-outputs), require schema support, request no tools, and time out after fifteen seconds. Server-side Zod validation remains authoritative.

Use `AI_MODE=mock` for no-key/offline operation. For the optional Gemini provider, use `AI_MODE=gemini`, `GEMINI_API_KEY`, and `GEMINI_MODEL=gemini-2.5-flash`. Restart the local server after changing environment settings.

Configured credentials are never treated as evidence of a successful response. OpenRouter provenance is `OPENROUTER_LIVE`, Google is `GEMINI_LIVE`, local-only is `MOCK_LOCAL`, and failure is `MOCK_FALLBACK`. These are API/export metadata. The product UI uses plain **AI assisted / Local assistant / Local fallback** labels and hides provider/model branding. Model failure falls back locally without trying unrelated paid models. Numerical review observations always come from re-simulation on the server.

Check the real browser flow with `BASE_URL` set to the running local address, then `node scripts/check-live-local.mjs`. It makes an intent request, confirms a synthetic change, runs the model, requests a review, and reports only provenance and model metadata. This is an optional live-provider check, separate from deterministic `npm run test:ui`.

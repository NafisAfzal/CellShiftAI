# API contracts

These endpoints serve the localhost sandbox. They are not authenticated operator APIs. All examples use fictional data. Type definitions live in `lib/types.ts` and `lib/simulation.ts`; server input schemas in `lib/ai.ts` are authoritative.

## Read-only endpoints

| Endpoint | Response |
| --- | --- |
| `GET /api/scenario` | Seeded `scenario`, server-computed `baseline` metrics/states/coverage, `limitations` and `source: SYNTHETIC_SEEDED` |
| `GET /api/health` | Engine version, deployment mode, selected AI mode/model and boolean configuration status; no key value |
| `GET /api/key` | `configured`, `mode`, `model`; accepts no credential writes |

The scenario has five sites and one hundred users. Coverage is a separate grid of `{step, tiles}`; tiles contain a synthetic XY origin and serving site or null.

## Interpret a change

`POST /api/ai/parse`

```json
{ "prompt": "Increase Cell B power by 3 dB" }
```

The trimmed prompt must be 8–320 characters. A successful response contains `status: proposal | clarify`, `change: {siteId, deltaPowerDb} | null`, `interpretation`, `question`, `source`, `model` and an optional fixed `fallbackReason`. Clarification is not an approved change.

## Simulate

`POST /api/simulate`

```json
{ "siteId": "cell-b", "deltaPowerDb": 3 }
```

Only `cell-a` through `cell-e` and integer −6..+6 dB are accepted. The resulting site power must remain within 30–46 dBm. Extra properties are rejected.

The response includes `baseline`, `proposed`, `delta`, `risk`, `reasons`, `before`, `after`, `cellsAfter`, `change`, `scenarioVersion`, `limitations` and `coverage`. The engine computes numerical values with no AI call. Repeated identical inputs yield identical simulation values.

Confirmation is enforced by the browser workflow, not by a server-side approval record. Direct local API requests remain possible.

## Generate a review

`POST /api/ai/explain` accepts the same bounded change object. It recomputes the simulation on the server; browser-supplied KPI fields are not accepted.

The response includes `source`, `model`, `headline`, `observations`, `checks`, `rollback`, `limitation` and optional `fallbackReason`. Observations are grounded in engine evidence. Provider text is validated and cannot replace numerical facts.

## Provenance

| API/export value | Meaning | Ordinary UI label |
| --- | --- | --- |
| `OPENROUTER_LIVE` | Successful validated OpenRouter response | AI assisted |
| `GEMINI_LIVE` | Successful validated Gemini response | AI assisted |
| `MOCK_LOCAL` | Intent/review handled locally | Local assistant |
| `MOCK_FALLBACK` | Live attempt failed; local result used | Local fallback |

Configuration alone never counts as live success. Provider/model metadata is retained in exports, without advertising it in the workspace.

## HTTP behavior and limits

POST routes require JSON, reject disallowed origins when an Origin header is present, validate the parsed body, and use local in-memory rate limits. The body helper rejects text longer than 2,000 characters after reading it; it is not a reverse-proxy streaming upload limit. Invalid requests return a JSON `error` with 4xx status; limit exhaustion returns 429. Unsupported methods return 405.

Origin checks permit loopback aliases and CLI requests without Origin. They are not authentication or public-internet CSRF protection. See the [threat model](05-security-threat-model.md).

## Exports and persistence

JSON and Markdown exports are built in the browser from the current server evidence. A numerical-evidence export may have `engineeringReview: null` until a review is generated. The payload records the proposed change, UI confirmation, engine/model provenance, limitations and computed evidence.

Optional Firebase writes only bounded synthetic change metadata to `users/{uid}/runs/{runId}`. There is no `/api/runs` endpoint. The JSON files in `contracts/` are reference schemas/examples, including provider-output shapes; they do not replace the runtime Zod schemas.

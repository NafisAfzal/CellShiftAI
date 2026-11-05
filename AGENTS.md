# CELLShift AI — Agent Policy (always-on Antigravity workspace instructions)

Read `START_HERE.md`, `PROMPT_ORDER.md`, and relevant `docs/` before modifying code. **Existing executable project is the baseline; do not scaffold over it.** All requested changes must preserve the live local app at http://127.0.0.1:3000.

## Product
Telco engineer change impact **pre-review** sandbox with 5 fictional cellular sites, 100 deterministic simulated users, validated AI-assisted intent parsing, explicit human confirmation, deterministic proxy KPI comparison, explainable evidence and rollback checklist. Nothing here is a validated radio-network optimizer or a live network controller.

## Mandatory constraints
- Providers: OpenRouter with the configured model, optional Gemini via official `@google/genai`, and deterministic local fallback. Keep provider calls server-only. Firebase Auth/Firestore is optional and enabled only when configured. Do not force geographic maps onto fictional XY data; use the precise synthetic topology visualization.
- AI can PROPOSE change parameters and write qualitative grounded review. AI must **never** calculate or invent numerical RF KPI values, and may never run shell/network-control commands through app tools.
- Engine (`lib/simulation.ts`) computes all numeric figures, seeded and reproducible; never pass browser-computed metrics as facts to AI.
- Allowed synthetic action: integer delta -6..+6 dB for only `cell-a`..`cell-e`. Validate on server with Zod. No real tower coordinates, IMSI/MSISDN, production OSS, Subscriber DB or telecom system credentials.
- Human confirmation BEFORE running the proposed simulation. Clearly label **synthetic**, **simulated**, and plain AI/local/fallback status. Exact `OPENROUTER_LIVE`, `GEMINI_LIVE`, `MOCK_LOCAL` and `MOCK_FALLBACK` provenance belongs in API/export metadata; do not advertise provider/model names in ordinary product screens.
- No AI provider key in `NEXT_PUBLIC_*`, browser code, logs, screenshots, Git or ZIP. `.env.local` is gitignored. Optional Firebase browser SDK configuration is public by design and relies on Auth and Firestore rules for access control.
- Preserve offline/no-key fallback. `npm run dev` should render UI without provider account access after dependencies and fonts are available.
- Add tests for any changed logic; run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` when dependencies and time permit.
- Never claim 'production ready', RF accuracy, ROI or actual operator integration without evidence.
- Use the assigned working branches and request `@NafisAfzal` review before merging into `main`. Read `docs/REPOSITORY.md` for main rules and release status. Do not change visibility, transfer ownership or grant administration without explicit owner authorization.

## Workflow
1. Explain the current-state files and smallest safe change.
2. Show diff; name modified files and reasoning.
3. Run checks and report actual output, not imagined success.
4. Preserve a stable localhost demo after every milestone.
5. Stop and request approval for destructive commands, secrets or external deployment. Do not ask for cosmetic clarification.

## UX quality
Dark navy + soft cyan/emerald, dense but legible NOC dashboard, top hero, live network topology with affected UE markers, Before/After KPIs, approval panel, review evidence, clear model limitations. Keyboard-accessible controls, mobile fallback. Keep supplied UI usable and polished; do not replace with generic chat layout.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

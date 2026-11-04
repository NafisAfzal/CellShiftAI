# Testing

Use Node.js 24 and the committed lockfile. CI runs in explicit local mode with Firebase disabled and no provider secrets.

## Routine checks

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run security:check
npm audit --audit-level=moderate
```

Unit tests use Node's built-in runner. They cover the seeded engine, non-mutation, allowed bounds, parser ambiguity, provider request/output handling, fallback, grounded review, exports, HTTP helpers, coverage, theme validation, projection/framing and the publication guard.

The change matrix checks all 65 allowed site/delta combinations. Repository-policy tests invoke PowerShell with a fake `gh` function: no real GitHub requests are made. They verify that wrong identity, unavailable plans, failed writes, unsafe bypass roles and ineffective rules cannot send collaborator invitations. Windows uses Windows PowerShell; Linux CI uses the runner's installed `pwsh`. On a local machine without PowerShell, that single policy test is explicitly skipped; CI requires it. The local main-push guard is also tested.

A production build checks the actual Next.js routes. `next/font/google` may need internet on a clean build. The production server can be checked with `npm start` after building.

## Browser workflow

Start `npm run dev` or `npm start` in another terminal, then:

```sh
npx playwright install chromium
npm run test:ui
npm run test:topology
```

Linux machines may need `npx playwright install --with-deps chromium`.

| Check | Coverage |
| --- | --- |
| `test:ui` | Dark/light at 1440, 1280, 768 and 390 px; propose, clarification, confirm, run, before/after, review/refresh, JSON/Markdown downloads, reset, theme persistence, keyboard focus and console errors |
| `test:topology` | Dark/light at nine widths from 320 to 1920 px; 2D/3D bounds, selected labels, touch targets, camera rotation/tilt/zoom, stable framing and overflow |
| `test:api` | Real HTTP routes: deterministic scenarios, all sites at −6/0/+6, malformed input, content types, body/origin limits, forged KPI rejection, read-only key endpoint and rate limits |
| `test:features` | Real local parser/review, describe/manual/preset modes, zero delta, failed interpretation/simulation/review and recovery, exports, evidence focus, camera changes and theme persistence |
| `capture-docs.mjs` | Reproducible documentation screenshots, not a replacement for assertions |

The workflow uses deterministic browser fixtures for AI parsing/review, including live-label and fallback cases. It calls the real scenario and simulation endpoints and reads actual downloads. It does **not** test paid-provider availability. The topology check makes no AI requests.

The additional API and feature checks require a **loopback server with `AI_MODE=mock`** and refuse a live provider mode. They use real local route handlers rather than replacing successful AI requests in the browser. Intentional 503 fixtures exercise failure paths. Reserved documentation IP hints isolate local rate buckets; they are not an authorization mechanism.

For an isolated production check, build the app, set `AI_MODE=mock` and `NEXT_PUBLIC_ENABLE_FIREBASE=false` in the server shell, and run `npm start -- --port 3031`. In a second shell:

```powershell
$env:BASE_URL = 'http://127.0.0.1:3031'
npm run test:api
npm run test:features
$env:BROWSER = 'firefox'
npm run test:features
$env:BROWSER = 'webkit'
npm run test:features
```

Install the selected engines with `npx playwright install chromium firefox webkit`. `test:features` defaults to Chromium. CI runs the additional Firefox and WebKit cases in separate jobs, with real local AI mode and no provider credentials. The six main check names are recorded in the prepared main ruleset.

Artifacts go to ignored `artifacts/`. Set `UI_SCREENSHOT_DIR` to override the output directory.

For a server on another port:

```powershell
$env:BASE_URL = 'http://127.0.0.1:3010'
npm run test:ui
npm run test:topology
```

```sh
BASE_URL=http://127.0.0.1:3010 npm run test:ui
BASE_URL=http://127.0.0.1:3010 npm run test:topology
```

## Security checks

`npm run security:check` inspects publishable files for credential filenames, common key formats, oversized files, personal machine paths and exact matches to local credentials when available. `node scripts/check-repository.mjs --staged` reads Git's staged content. It deliberately reports locations without values.

Gitleaks scans the sanitized tree and Git history. CI uses a fixed Gitleaks release and a verified SHA-256 archive. CI actions are pinned to full commit hashes, use read-only permissions and do not run with pull-request-target privileges. Dependency updates arrive as reviewable pull requests.

## Scope and gaps

Chromium, Firefox and WebKit automation is not a full screen-reader or real-device audit; WebKit is not a claim of testing every Safari release. Firebase emulator rules, cloud infrastructure and provider account availability are separate checks. A passing scanner is not proof of production security. See [security review](SECURITY_REVIEW.md) and [feature verification](FEATURE_VERIFICATION.md) for actual results and limitations.

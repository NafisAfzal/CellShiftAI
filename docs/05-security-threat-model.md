# Threat model

## Scope

CellShiftAI runs on loopback as a single-instance demonstration. Its data is synthetic. Provider credentials, optional Firebase access and Git publication are the sensitive boundaries. There is no production telecom connection, shell execution tool, uploaded network file or real subscriber database.

## Boundaries and controls

| Boundary | Implemented controls | Limits |
| --- | --- | --- |
| Browser → route handlers | Strict Zod input, five site IDs, integer/range checks, JSON content type, post-read body-length check | No production authentication or server-side approval identity |
| Local HTTP requests | Origin-host checks when present; loopback alias support; in-memory path/client-hint quotas | Missing Origin is allowed; forwarded IP is untrusted; quotas are per process |
| Server → AI provider | Fixed provider endpoints, server-only key, bounded structured output, timeout, response validation | Paid endpoint abuse needs authenticated quotas before hosting |
| AI → evidence | Site/power bounds revalidated; explain recomputes evidence; numerical observations remain engine-owned | Prompt injection is treated as untrusted input, not an authorization mechanism |
| UI → simulation | Explicit confirmation, invalidation after edits, disabled/loading feedback | This is a workflow safeguard; direct localhost API calls can bypass the UI |
| Browser → Firestore | Optional Auth, UID-owned paths, allowlisted create fields, deny update/delete and all other paths | Emulator verification remains required; anonymous accounts are not durable identities |
| Local files → GitHub | Ignored secrets/artifacts, staged-byte guard, local hooks, Gitleaks, dependency audit | Scanners are imperfect; hooks are bypassable; plan currently prevents private branch enforcement |

React renders provider strings as text; the application does not use raw provider HTML, arbitrary outbound URLs, shell commands or network-control tools. Provider failures use fixed fallback messages rather than upstream response bodies. The key endpoint is read-only and exposes configuration status, not credential values.

## Publication risks

The repository starts with sanitized history. Local source backups, browser state, internal reports, environment files and generated exports are excluded. Only inspected synthetic screenshots are published. A real key shared outside Git still needs rotation at the issuer.

Nafis owns the private repository. Collaborators receive write access without administration. The current GitHub plan cannot enforce main-branch rules for a private repository; see [governance](REPOSITORY.md). CODEOWNERS alone is not an access-control mechanism.

## Before exposing a server publicly

1. Authenticate and authorize users on paid endpoints, with durable account-scoped budgets and quotas.
2. Review proxy trust, request streaming limits, origin/session/CSRF handling and deployment headers.
3. Put secrets in an appropriate managed secret store and restrict service identities.
4. Decide logging, prompt retention, redaction and deletion policies. Do not log credentials or commercial network data.
5. Verify Firebase rules in an emulator if persistence is enabled; review account linking and tenant isolation.
6. Keep the numerical engine separate from provider text and preserve explicit model limitations.

The current review is not a penetration test, ASVS certification or proof of production safety. See [security-review evidence](SECURITY_REVIEW.md).

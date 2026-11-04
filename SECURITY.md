# Security policy

CellShiftAI is a localhost demonstration using fictional network data. It is not a production service or a live network controller. The maintained security target is the latest `main` branch; there is no separate supported-release schedule yet.

## Report privately

Do not open a public issue containing a vulnerability, API key, private log or sensitive network information. While the repository is private, report a minimal, redacted reproduction in a private repository issue addressed to `@NafisAfzal`. If the repository becomes public, use GitHub's **Security → Report a vulnerability** when private vulnerability reporting has been enabled. If that option is absent, ask the owner for a private reporting channel without disclosing exploit details.

Include the affected commit, entry point, reproduction steps and expected impact. Do not send working credentials or real subscriber data. No response-time guarantee or bug-bounty program is implied.

## Credentials

- Store provider keys in ignored `.env.local`, or in a server-side secret store for an authorized future deployment.
- Never expose AI provider keys through `NEXT_PUBLIC_*`, source, browser code, screenshots, logs, issues or exports.
- `.env.example` contains only empty credentials and non-secret defaults.
- If a credential was shared in a chat, terminal recording or commit, rotate it at its issuer. Removing the text is not revocation.
- Local hooks, the publication guard and Gitleaks reduce accidental leakage; they cannot prove that every possible secret is absent.

## Publication and deployment

The repository stays private until the owner chooses otherwise. A [public-release checklist](docs/PUBLIC_RELEASE.md) covers history, screenshots, invitations, branch rules, licensing and reporting settings.

Public source does not mean the demo server is ready for internet traffic. Paid AI endpoints need authentication, durable quotas and abuse controls before deployment. Same-origin checks, forwarded-IP hints and in-memory rate limits are local-demo controls. Firebase rules need emulator tests before relying on optional cloud persistence.

See the [threat model](docs/05-security-threat-model.md) and [scoped security-review record](docs/SECURITY_REVIEW.md) for implemented protections and remaining gaps.

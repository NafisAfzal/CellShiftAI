# Publication security review

Review date: **5 November 2026**. Scope: this application's publishable source, dependency lockfile, screenshots, repository controls and new Git history. This is a scoped review, not a penetration test or a production-security certification.

## Findings and changes

| Finding | Action |
| --- | --- |
| Local environment, browser profiles, source backups and historical delivery reports were mixed into the project folder | Excluded them from Git; published only maintained source, curated documentation and synthetic screenshots |
| Firestore pinned a vulnerable transitive `@grpc/grpc-js` | Targeted override to 1.14.7; regenerated lockfile and ran application checks |
| TypeScript ESLint pulled a vulnerable `minimatch` | Targeted override to 11.0.4 for that parser; lint/type checks remain passing |
| No publication guard or history scan existed | Added staged-byte checks, optional local hooks, Gitleaks CI and dependency audits |
| Private main-branch rules are unavailable on the current GitHub plan | Kept the repository private, documented the limitation and committed an owner-focused ruleset for later activation |

The dependency advisories are [gRPC certificate authorization](https://github.com/grpc/grpc-node/security/advisories/GHSA-m9gg-hp2v-232j), [gRPC error disclosure](https://github.com/grpc/grpc-node/security/advisories/GHSA-f596-whhp-79r4), and [minimatch pattern amplification](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249). The Firestore client is optional and not configured in CI; the minimatch finding affects tooling. Neither was dismissed solely because of that context. Overrides should be removed when parent packages adopt patched versions.

## Review questions

This review used [OWASP Top 10:2025](https://top10.owasp.org/2025/), [ASVS 5.0.0](https://github.com/OWASP/ASVS/releases/tag/v5.0.0_release), and the [Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) as references, checked on the review date. These are scope mappings, not claims of full compliance.

| Question | Reference | Evidence / limitation |
| --- | --- | --- |
| Can untrusted input escape site/power bounds or inject numerical facts? | ASVS V2.2.1; Top 10 A05 | Strict schemas, allowed IDs/ranges, server recomputation and adversarial unit tests |
| Can the user skip confirmation? | ASVS V2.3.1 | UI prevents it and invalidates approval on edits; direct local API calls can bypass the UI, so this is not server authorization |
| Are access boundaries explicit? | ASVS V8.1.1; A01/A07 | Localhost scope documented; public authentication and durable quotas remain absent |
| Are credentials excluded from source and artifacts? | ASVS V13.3.1; A02/A04 | Ignored server configuration, staged-value guard, sanitized snapshot/history scans; no managed vault in this local demo |
| Do failures expose provider internals? | ASVS V16.5.1; A10 | Fixed fallback messages; no upstream error bodies returned to the browser |
| Are dependency and workflow changes reviewable? | A03/A08 | Committed lockfile, targeted fixes, SHA-pinned Actions, read-only default token, Dependabot and npm audit |

## Checks actually performed locally

- **31/31 unit tests passed**, including a new guard test proving staged secrets cannot be concealed by a clean working copy and values are not printed.
- **Type checking, ESLint and the production build passed.**
- **8/8 browser workflows passed** across both themes and four widths. Actual server simulation and JSON/Markdown downloads were checked; AI routes used local fixtures.
- **18/18 topology viewport/theme cases passed**, including camera-bound checks. Screenshots were captured from the running app and representative desktop/mobile images were visually inspected.
- **npm audit:** zero reported vulnerabilities after the overrides, including development dependencies.
- **Gitleaks 8.30.1:** sanitized publication-tree scan passed with redacted output. Git history is also scanned before pushing and in CI.
- **Trivy 0.76.1:** filesystem vulnerability, secret and misconfiguration scan ran against the sanitized snapshot; the second run included 508 package entries with development dependencies. Both runs reported zero vulnerabilities and zero secrets. The database was updated on 4 November 2026 UTC. No supported deployment/IaC configuration was detected, so this is not infrastructure validation.
- **Semgrep 1.177.0:** local Windows invocation of the explicit `p/javascript` ruleset failed during core rule validation. It is not counted as a successful local scan. A Linux CI job runs the same explicit ruleset with metrics disabled, no token and no source upload.

## Remote verification

The [initial GitHub CI run](https://github.com/NafisAfzal/CellShiftAI/actions/runs/41915229974) passed all four jobs: **Quality**, **Browser workflow**, **Static analysis** and **Secrets**. This independently verified a fresh Linux installation, dependency audit, 31 tests, type checking, lint, production builds, browser workflows and history scanning. Semgrep succeeded on Linux; the local Windows failure remains recorded above.

All 22 maintained Markdown files were checked for missing local links, with none found. The 26 generated browser assets were compared against configured local credential values; none contained a match. Only `.env.example` is tracked among environment files.

The workflow's current remote results are available in [GitHub Actions](https://github.com/NafisAfzal/CellShiftAI/actions/workflows/ci.yml). Local reports, scanner databases, logs and browser profiles stay untracked.

## Remaining gaps

Private main protection requires a supported plan. Firebase rules were reviewed but not emulator-tested in this pass. Live provider availability, cloud infrastructure, internet abuse resistance, full screen-reader coverage and non-Chromium browsers were not verified. No container image exists, so no container scan was performed. Scanners cannot guarantee the absence of every possible credential or vulnerability.

Rotate credentials that were shared outside Git before broader use. Publishing a sanitized repository does not revoke an exposed key or make the local server suitable for public hosting.

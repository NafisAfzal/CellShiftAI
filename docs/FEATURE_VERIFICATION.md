# Feature and repository verification

Review date: **5 November 2026**. This pass expands the existing checks and enforces the owner's requirement that other people cannot update `main`.

## Access outcome

The repository remains private under **NafisAfzal**. GitHub again returned HTTP 403 for private branch rules on the current plan. Because granting a personal-repository collaborator write access would include `main`, the three pending invitations were withdrawn. The owner is now the only human with write access; the `main`, `nafis`, `jabir`, `junaid` and `sami` branches remain.

The protection setup can restore the requested invitations only after GitHub reports an active administrator-only main update rule. Seven fixture scenarios test that setup without contacting GitHub, including successful protection without invitations by default. A separate test verifies that the local hook rejects a direct push to `main`. These checks do not claim that local hooks enforce GitHub permissions.

## Bug found and fixed

A successful simulation followed by a failed rerun left the previous outcome in state. The interface still showed “Simulation complete” and “View results”, even though the latest request failed.

The new feature regression reproduced this before the fix. Starting a simulation now clears the old outcome and returns the comparison to Before while the new request runs. A failure leaves clear error feedback and allows a retry; it no longer presents stale completion. Successful comparison, review and export behavior is preserved. A failed review refresh retains the last valid review with explicit failure feedback.

## Local results

| Check | Result |
| --- | --- |
| Node unit/regression suite | 35 passed; includes all 65 allowed site/delta combinations, timeout fallback, protection fixtures and the main-push hook |
| Real API integration | 10 groups passed; covers all five sites at −6/0/+6, deterministic evidence, invalid requests, origins/content types/body limits, forged KPI fields, private-file exposure checks, 405 responses and 429 rate limits |
| Additional feature workflows | 15 passed: five scenarios each in Chromium, Firefox and WebKit |
| Existing responsive workflow | 8/8 passed across both themes at four widths |
| Existing topology checks | 18/18 viewport/theme cases passed |
| Production build | Passed after the failed-rerun fix |
| Dependency audit | Zero reported vulnerabilities |

The feature cases cover Describe, manual inputs, a preset, a zero-delta change, confirmation, real server computation, real local parsing/review, intentionally failed interpretation/rerun/refresh and recovery, initial network-load failure and recovery, both download formats, affected-user expansion/focus, camera changes and theme/session behavior. Desktop and mobile cases run in both themes. Downloads are read and compared with engine evidence. Failed-rerun feedback was also visually inspected in the running application.

Type checking and ESLint passed. The first lint invocation included downloaded browser code in a local cache; generated caches and reports are now excluded while source rules remain unchanged. A repeated API-test invocation correctly hit rate buckets left by the preceding run; per-run reserved test hints now isolate those checks without changing application limits. Browser installation on the system drive ran out of space; WebKit was installed in the ignored workspace cache and all of its checks passed there.

The API and feature checks refuse a live AI provider mode. Only deliberate error cases are intercepted; successful parsing, simulation and review use the running local server. No paid provider call or production system is involved.

## Verification limits

Chromium, Firefox and WebKit automation does not replace real-device or screen-reader testing. Firebase cloud persistence and emulator rules were not exercised in this pass. Live provider availability was not tested. The current private plan still cannot support the requested single-repository collaboration safely; teammate access remains withheld until effective main protection or an approved separate-workspace arrangement is available.

See [testing instructions](TESTING.md), [governance](REPOSITORY.md), and the [security-review record](SECURITY_REVIEW.md). CI runs the API checks and Chromium features alongside the existing browser/topology suite, with separate Firefox and WebKit feature jobs.

The first branch run passed all six GitHub jobs. A duplicate PR run stalled during Chromium installation before executing browser tests; a subsequent workflow update superseded it. Full checks now run for PRs and main updates on a pinned Ubuntu 24.04 runner, avoiding duplicate full runs and floating operating-system changes. Current remote results remain visible in GitHub Actions.

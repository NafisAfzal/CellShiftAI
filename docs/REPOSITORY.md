# Repository ownership and workflow

**Repository:** [NafisAfzal/CellShiftAI](https://github.com/NafisAfzal/CellShiftAI)

**Visibility:** private

**Owner and administrator:** NafisAfzal

Only Nafis should change visibility, transfer ownership, manage collaborators or approve the final merge into `main`. Collaborators are invited with write permission, not administration. Invitations must be accepted before access works.

| Branch | Purpose |
| --- | --- |
| `main` | Shared, reviewed baseline |
| `nafis` | Nafis's work |
| `jabir` | Jabir's work |
| `junaid` | Junaid's work |
| `sami` | Sami's work |

These are working conventions, not per-person branch permissions. A collaborator's write role is repository-wide.

## Main protection: current limitation

GitHub returned **HTTP 403: upgrade to GitHub Pro or make this repository public** when enabling rulesets for this private repository. The repository remains private. No billing or visibility change was made.

At the current plan, CODEOWNERS identifies Nafis as reviewer but cannot prevent direct pushes or merges. The team must follow the pull-request policy voluntarily until enforceable rules are available. Repository ownership and administration still belong to Nafis.

Official reference: [GitHub ruleset availability](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets).

## Prepared protection

[`.github/main-ruleset.json`](../.github/main-ruleset.json) targets only `main` and requests:

- Restrict updates and deletion to bypass actors.
- Block force pushes and require linear history.
- Require pull requests, one approval, Nafis as code owner, resolved discussions and dismissal of stale approvals.
- Require the `Quality`, `Browser workflow` and `Secrets` GitHub Actions checks.
- Allow repository administrators to bypass. In this personal repository, administration belongs to Nafis.

When a supported plan is active, authenticate `gh` as NafisAfzal and run:

```powershell
./scripts/protect-main.ps1
```

The script creates or updates the named ruleset. It does not change visibility, purchase a plan or invite anyone. Verify the resulting rule in **Settings → Rules → Rulesets** and test it using a non-owner collaborator before treating it as enforced. Owner bypass is intentional; Nafis should still merge through reviewed, passing pull requests.

## Repository settings

Squash merging is enabled; merge commits, rebase merging and auto-merge are disabled. Named working branches are not automatically deleted after merge. Issues are enabled, and documentation lives in the repository rather than a separate wiki.

CI has read-only repository permissions. It receives no provider secrets. The default Actions token cannot approve pull requests. Dependabot proposes dependency and action updates for review.

Before making the repository public, complete [PUBLIC_RELEASE.md](PUBLIC_RELEASE.md). Source publication does not deploy the application or grant an open-source license.

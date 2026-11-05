# Repository ownership and collaboration

Owner and final merger: **NafisAfzal**. The public-release workflow publishes the source, verifies main protection, then sends the requested collaborator invitations. Invitation acceptance is a separate action by each teammate.

| Person | GitHub account | Working branch |
| --- | --- | --- |
| Nafis | NafisAfzal | `nafis` |
| Junaid | Junaid-redart | `junaid` |
| Jabir | tasnimjabir | `jabir` |
| Sami | mostahidhossainsami | `sami` |

`main` is the reviewed baseline. Branch names assign a working convention, not exclusive permissions to individual working branches. Collaborators receive write access, never administration.

## Main rules

Two independent active rulesets target only `refs/heads/main`:

1. **Main - Nafis approval and checked changes** restricts updates and requires pull requests with code-owner review. Only the repository administrator can bypass through a pull request. Direct pushes are not included in this bypass.
2. **Main - Required checks and history** requires all six CI checks, linear history, and blocks deletion and force pushes. It has no bypass actors, including the owner.

CODEOWNERS assigns every file to `@NafisAfzal`. Teammates may leave advisory reviews, but cannot merge into main. Nafis cannot approve his own GitHub PR; his PR-only administrator bypass permits merging his own work after required CI passes. For teammate PRs, Nafis reviews and makes the final merge decision.

The six required checks are Quality, Browser workflow, Static analysis, Secrets, Feature workflows (firefox), and Feature workflows (webkit). Automatic merging is disabled.

## Everyday workflow

Work on your assigned branch, push it, and open a pull request to `main`. Nafis reviews the diff and merges the passing PR. Pull the updated main and merge it into your working branch before the next change. See [CONTRIBUTING.md](../CONTRIBUTING.md) for commands.

Local hooks add publication checks and block direct main pushes in clones where enabled. They are bypassable; the GitHub rulesets provide the remote restrictions.

## Applying the configuration

Authenticate `gh` as NafisAfzal and run:

```powershell
./scripts/protect-main.ps1
```

The script applies both checked-in rulesets and verifies their effective rules on main. The explicit `-InviteCollaborators` option restores the three requested invitations only after verification succeeds. It does not change visibility or billing. Fixture tests cover failed identity, plan access, application, unsafe bypass and ineffective rules without making real GitHub requests.

Public repositories support branch rules on GitHub Free. Private repositories require a supported paid plan for these restrictions. See [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets).

## Release records

The earlier owner-only arrangement and withheld invitations are historical decisions recorded in [feature verification](FEATURE_VERIFICATION.md). The current release audit is in [PRE_RELEASE_CHECK.md](PRE_RELEASE_CHECK.md). Keep source publishing separate from deploying a public app: the localhost API still needs a separate authentication and abuse review before hosting.

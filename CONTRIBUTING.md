# Contributing to CellShiftAI

Keep changes focused and reviewable. Describe the user problem, the resulting behavior, and how you checked it.

## Branch workflow

Nafis works on `nafis`; Junaid on `junaid`, Jabir on `jabir`, and Sami on `sami`. `main` is the owner-controlled baseline. Teammates must accept their collaborator invitations before pushing.

```sh
git clone https://github.com/NafisAfzal/CellShiftAI.git
cd CellShiftAI
git switch jabir
git pull --ff-only origin jabir
git fetch origin
git merge origin/main
```

Replace `jabir` with your branch. Commit and push there, then open a pull request to `main` and request `@NafisAfzal`. Keep titles concrete, for example `Fix clipped tower labels on narrow screens`. Prefer a squash merge after review. The four named working branches are retained after merging.

GitHub does not assign ownership to working-branch names. Main is restricted by server-side rules: PRs are required, only Nafis can make main updates through PRs, and six CI checks have no bypass. Teammates can leave advisory reviews. Nafis uses PR-only administrator bypass for his own PRs because GitHub does not permit self-approval. Local hooks are additional, bypassable safeguards. See [governance](docs/REPOSITORY.md).

Nafis's normal workflow is:

```sh
git switch nafis
git pull --ff-only origin nafis
# make and check the change
git add <changed-files>
git commit -m "Describe the change"
git push origin nafis
gh pr create --base main --head nafis
gh pr checks <number> --watch
# Nafis reviews the diff and merges the passing pull request on GitHub.
git fetch origin
git switch main
git pull --ff-only origin main
git switch nafis
git merge origin/main
```

Use `git pull` to update your local copy of `main`; a pull request brings changes from `nafis` into remote `main`. Do not force-push either branch.

## Local setup and hooks

Use Node.js 24, run `npm ci`, and start `npm run dev`. No provider key is required. Enable the checked-in publication hooks for your clone:

```sh
git config core.hooksPath .githooks
```

The commit hook inspects **staged bytes**, not just the working copy. The push hook runs the publication guard and scans history if [Gitleaks](https://github.com/gitleaks/gitleaks) is installed. Hooks are local safeguards and can be bypassed; CI also scans history. Never treat an ignored file as safe to force-add.

## Checks before a pull request

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run security:check
npm audit --audit-level=moderate
```

For UI changes, run `npm run test:ui` against a running local server and inspect both themes at desktop and mobile widths. For topology changes, also run `npm run test:topology`. Include screenshots when they help review. [Testing](docs/TESTING.md) explains what these checks cover.

## Boundaries to preserve

- Numerical KPIs come from `lib/simulation.ts`, using the fixed synthetic scenario.
- Changes are server-validated: five allowed sites, integer −6..+6 dB, permitted resulting power range.
- Human confirmation precedes a simulation in the UI. Parameter edits revoke it.
- AI output is untrusted. Validate it, preserve local fallback, and keep provider credentials server-only.
- Never add real tower locations, subscriber identities, production credentials or live network controls.
- Reuse components and theme tokens. Preserve the dark palette, keyboard controls and reduced-motion behavior.
- Do not add dependencies or change contracts without explaining the need.

## Dependency overrides

Two targeted overrides currently address upstream advisories: Firestore's `@grpc/grpc-js` and the TypeScript ESLint parser's `minimatch`. See [security review](docs/SECURITY_REVIEW.md). Remove an override once its parent dependency supports a patched version, after running the full checks. Do not use `npm audit fix --force` as a routine update strategy.

## Reporting problems

Use an issue for reproducible bugs or focused improvements. Follow [SECURITY.md](SECURITY.md) for vulnerabilities and never include credentials or private network data. Code has no open-source license at present; contribution access does not grant redistribution rights.

# Development workflow

The runnable application is the baseline. Inspect and improve it; do not scaffold over it.

1. Read `AGENTS.md`, `README.md` and the documentation for the affected area.
2. Trace inputs, validation, state changes and server responses before editing.
3. Describe the smallest useful change and its risks.
4. Implement it using the existing components and semantic theme tokens.
5. Add focused tests for changed behavior. Check both themes and mobile for UI changes.
6. Run unit tests, type checking, lint, build and the publication guard. Run relevant browser checks.
7. Inspect the entire diff and staged files for regressions, secrets and generated artifacts.
8. Open a pull request to `main` and request Nafis's review.

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch commands and [testing](docs/TESTING.md) for verification scope. Original workshop prompts are local reference material, not instructions to rebuild this project.

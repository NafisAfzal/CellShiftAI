# Before making the repository public

Nafis controls the visibility decision. Do not automate it.

- [ ] Rotate any provider credential previously shared in chat, a recording or another untrusted location. This is separate from checking Git.
- [ ] Run `npm run security:check`, `npm audit --audit-level=moderate`, unit tests, type checking, lint and a clean build.
- [ ] Scan **all Git history and all branches** with Gitleaks, not only the current working tree.
- [ ] Confirm `.env.local`, service-account files, local browser state, raw logs, internal reports, exported data and source backups remain untracked.
- [ ] Inspect screenshots, issue attachments and Actions artifacts for credentials or private information. CI evidence should remain synthetic.
- [ ] Review open issues, pull requests, commit messages, repository description and contributor privacy.
- [ ] Verify the owner, collaborators and any deploy keys or installed apps. Remove access that is no longer needed.
- [ ] Keep the repository owner-only until an effective owner-only main restriction has been verified. A private personal repository cannot give teammates read-only access on the current plan.
- [ ] Apply and verify main protection on a supported plan, or after public visibility makes branch rules available. Check code-owner approval, required checks, force-push blocking and owner bypass with a non-owner account.
- [ ] Enable GitHub secret scanning/push protection and private vulnerability reporting where available. Confirm the reporting instructions in SECURITY.md.
- [ ] Decide on an explicit license before inviting public reuse. The current code is marked `UNLICENSED`; it is not automatically open source.
- [ ] Read the README and gallery as a first-time visitor. Keep the synthetic-data and RF-model limits visible.
- [ ] If publishing a hosted demo separately, perform an authentication, quota, secret-management and abuse review first. Source visibility is not approval to expose paid endpoints.

After publication, verify the settings again. [GitHub documents visibility changes](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility); available protection features can differ between private and public repositories.

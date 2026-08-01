# Proposal: ACP-001 Open-Source Practices Maturation

## 1. Context and Problem Statement
While the repository possesses a highly advanced zero-trust architectural governance layer (`AGENTS.md`, `.agents/lock_mission.sh`), it lacks several standard open-source and enterprise software engineering practices. Specifically, there is no formal release management (Changelogs, SemVer), no physical boundary enforcement in version control (`CODEOWNERS`), and no continuous integration pipeline in a remote environment (e.g., GitHub Actions) to mirror our local verification gates.

This creates friction in tracking historical changes and reduces human audibility over the AI agent's execution lifecycle.

## 2. Proposed Solution
We propose implementing the following standard workflow practices under Mission 8 (Phase 5: Maturation):

1. **Release Management**: Adopt `CHANGELOG.md` following the "Keep a Changelog" standard and integrate Semantic Versioning (SemVer).
2. **Physical Ownership**: Implement a `.github/CODEOWNERS` file to map the conceptual boundaries defined in `SYSTEM_CONTEXT.md` to explicit Git review requirements.
3. **Commit Conventions**: Standardize Conventional Commits and integrate `commitlint` via Husky to ensure every commit is traceable back to an Active Mission or ADR.
4. **Remote Verification**: Translate `.agents/scripts/lock_mission.sh` into a remote `.github/workflows/ci.yml` pipeline to guarantee repository integrity regardless of the execution environment.
5. **Standard Templates**: Implement `.github/ISSUE_TEMPLATE/` and `PULL_REQUEST_TEMPLATE.md` mapped to our existing Mission and Proposal structures.

## 3. Alternative Options
*   **Do Nothing**: Continue relying solely on `.agents/` local hooks and raw Markdown files. *Rejected* because it limits the ability of human product owners to quickly audit versions and requires reviewers to manually enforce boundary reviews rather than relying on Git mechanisms.

## 4. Consequences
*   **Positive**: Complete end-to-end traceability from Proposal -> Mission -> Commit -> Release. Stronger physical protection of architectural boundaries via Git.
*   **Negative**: Introduces slightly more friction to the execution workflow (e.g., stricter commit message formats).

## 5. Affected Documents
*   `governance/DEBT.md` (Resolves TD-002)
*   `governance/ROADMAP.md` (Fulfills Mission 8)
*   `package.json` (Requires adding `commitlint` and release management tools)
*   `AGENTS.md` (Will require an update to enforce the Conventional Commits policy)

## 6. Action Items
- [ ] Create `CHANGELOG.md` template.
- [ ] Install and configure `@commitlint/config-conventional`.
- [ ] Create `.github/CODEOWNERS` and populate with `SYSTEM_CONTEXT.md` boundaries.
- [ ] Create `.github/workflows/ci.yml` mirroring the 5-Gate AVP-001 checks.
- [ ] Create Issue and PR templates in `.github/`.

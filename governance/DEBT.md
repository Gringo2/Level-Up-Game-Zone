# Technical Debt Governance

This is a governed backlog for technical debt. Instead of using inline comments like `// fix later`, track technical debt here.

## Active Debt

| ID | Reason | Impact | Priority | Owner | Resolution Mission |
| :--- | :--- | :--- | :--- | :--- | :--- |
| — | No active debt | — | — | — | — |

## Resolved Debt

| ID | Resolution Details | Date |
| :--- | :--- | :--- |
| TD-001 | Refactored `requireAuth` to use `makeRequireAuth` with injectable `TokenVerifier`. Added `auth.test.ts` with 4 unit tests (no-token, bad-header, invalid-token, valid-token). | 2026-08-11 |
| TD-002 | Created `CHANGELOG.md` (Keep a Changelog format, seeded with Missions 1–7) and `CODEOWNERS` at repo root. | 2026-08-11 |

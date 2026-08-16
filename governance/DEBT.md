# Technical Debt Governance

This is a governed backlog for technical debt. Instead of using inline comments like `// fix later`, track technical debt here.

## Active Debt

| ID | Reason | Impact | Priority | Owner | Resolution Mission |
| :--- | :--- | :--- | :--- | :--- | :--- |
| — | No active debt | — | — | — | — |

## Resolved Debt

| ID | Resolution Details | Date |
| :--- | :--- | :--- |
| TD-003 | 100% missing integration coverage on large controller blocks closed: `verifyExpense`/`verifyKeno`/`deleteKeno` (M-32), `resolveMissedData`/`updateRole`/`deleteUser` (M-33). | 2026-08-14 |
| TD-004 | "Not Found" negative-path integration tests added for shifts (`closeShift`, `updateFloat`) and users (`updateRole`, `deleteUser`) plus keno/expenses in M-32. | 2026-08-14 |
| TD-005 | 500 DB-crash fallback tests added for every shifts and users controller operation, plus keno/expenses in M-32. | 2026-08-14 |
| TD-006 | Branch-coverage gap closed on the two weakest controllers: expenses 62.5% -> 100% branch, auditLogs 50% -> 100% branch; verifyExpense fully covered (M-34). | 2026-08-14 |
| TD-007 | Remaining branch-coverage gap closed on sales/credits/gameRates/employees (all -> 100% branch); every controller now >= 90.9% stmts / 100% funcs (M-35). | 2026-08-14 |
| TD-008 | Last statement-coverage gap in the Express composition root + schemas closed: app.ts 83.3% -> 100% stmts, schemas/index.ts 91.2% -> 100% stmts; health endpoint, global error handler, and zod errorMaps covered (M-36). | 2026-08-15 |
| TD-009 | Pre-fix schema/controller mismatch resolved (ACP-004, M-38): `reason` missing from `UpdateCreditSchema` and `shift_id` missing from `ResolveMissedDaySchema` — credit `reason` updates now persist and stale-shift resolution works again. | 2026-08-16 |
| TD-001 | Refactored `requireAuth` to use `makeRequireAuth` with injectable `TokenVerifier`. Added `auth.test.ts` with 4 unit tests (no-token, bad-header, invalid-token, valid-token). | 2026-08-11 |
| TD-002 | Created `CHANGELOG.md` (Keep a Changelog format, seeded with Missions 1–7) and `CODEOWNERS` at repo root. | 2026-08-11 |

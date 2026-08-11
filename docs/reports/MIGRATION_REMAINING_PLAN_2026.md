# Migration Remaining Work Plan

## Evidence Summary

This artifact is generated from the current workspace observation and verification evidence. It is a remediation plan for the implementation gap between the migration milestone summary in [monorepo_migration_state.md](monorepo_migration_state.md) and the present runtime/architecture evidence.

## Observed Remaining Findings

### 1. Thin Client Migration is only partial
Observed evidence:
- The code still imports Firestore APIs from the client side in multiple pages and contexts, including [packages/client/src/pages/GameSales.tsx](packages/client/src/pages/GameSales.tsx), [packages/client/src/pages/Keno.tsx](packages/client/src/pages/Keno.tsx), [packages/client/src/pages/Expenses.tsx](packages/client/src/pages/Expenses.tsx), [packages/client/src/pages/Credits.tsx](packages/client/src/pages/Credits.tsx), [packages/client/src/pages/Admin.tsx](packages/client/src/pages/Admin.tsx), [packages/client/src/pages/AuditLogs.tsx](packages/client/src/pages/AuditLogs.tsx), [packages/client/src/contexts/AuthContext.tsx](packages/client/src/contexts/AuthContext.tsx), and [packages/client/src/contexts/ShiftContext.tsx](packages/client/src/contexts/ShiftContext.tsx).
- The client still initializes a Firestore runtime via [packages/client/src/firebase.ts](packages/client/src/firebase.ts).

Conclusion:
- The migration memo's claim that the frontend has been fully reworked to a Thin Client architecture is not supported by the current codebase.

### 2. Registration & auth flow alignment is incomplete
Observed evidence:
- The migration memo claims the registration state fix occurred in the `onAuthStateChanged` path, but the current client state not matching should be verified through live code flow.
- Current client auth logic is present in [packages/client/src/contexts/AuthContext.tsx](packages/client/src/contexts/AuthContext.tsx), but the registration fix described in the memo is not directly visible in present code.

Conclusion:
- The design-level bug is not presently evidenced as solved in the current implementation.

### 3. Governance / mission state drift is active
Observed evidence:
- [governance/MISSION.md](governance/MISSION.md) reports a locked mission with `Status: Locked`.
- The WAKE summary produced from [ .agents/scripts/wake_summary.sh](.agents/scripts/wake_summary.sh) reports the active mission as `Phase 4 Client Refactoring` with a `Locked` status.
- The infrastructure test in [packages/client/src/__tests__/infrastructure.test.ts](packages/client/src/__tests__/infrastructure.test.ts) expects the WAKE protocol to surface an `Active` mission status and the `mission_gate.sh` guard to allow edits.

Conclusion:
- The repository’s execution and test contracts disagree about whether the active mission is a live implementation phase or a frozen stabilization phase.

### 4. Automated verification is not all green
Observed evidence:
- `npx vitest run` executed inside the repository reports `2 failed | 10 passed` across the current infrastructure test file, with failures in [packages/client/src/__tests__/infrastructure.test.ts](packages/client/src/__tests__/infrastructure.test.ts).
- `npx playwright test --reporter=line` executed successfully with `3 passed (7.1s)` under the current Playwright suite.

Conclusion:
- E2E smoke coverage is positive, but the infrastructure/mission contract gate is not yet green.

## Remaining Work Items

### Thin Client route replacement matrix

| Client source | Current direct evidence | Server contract to use | Gap class |
| --- | --- | --- | --- |
| [packages/client/src/pages/GameSales.tsx](packages/client/src/pages/GameSales.tsx) | `collection(db, "game_rates")`, `collection(db, "game_sales_logs")`, `onSnapshot` | `GET /api/rates`, `GET /api/sales`, `POST /api/sales`, `PUT /api/sales/:id`, `DELETE /api/sales/:id` | Still reads from Firestore directly |
| [packages/client/src/pages/Keno.tsx](packages/client/src/pages/Keno.tsx) | `collection(db, "keno_logs")`, `onSnapshot` | `GET /api/keno`, `POST /api/keno`, `PUT /api/keno/:id`, `DELETE /api/keno/:id` | Still reads from Firestore directly |
| [packages/client/src/pages/Expenses.tsx](packages/client/src/pages/Expenses.tsx) | `collection(db, "expenses")`, `onSnapshot` | `GET /api/expenses`, `POST /api/expenses`, `PUT /api/expenses/:id`, `DELETE /api/expenses/:id`, `PUT /api/expenses/:id/verify` | Still reads from Firestore directly |
| [packages/client/src/pages/Credits.tsx](packages/client/src/pages/Credits.tsx) | `collection(db, "credits")`, `onSnapshot` | `GET /api/credits`, `POST /api/credits`, `PUT /api/credits/:id`, `DELETE /api/credits/:id` | Still reads from Firestore directly |
| [packages/client/src/pages/Admin.tsx](packages/client/src/pages/Admin.tsx) | `collection(db, "game_rates")`, `onSnapshot` | `GET /api/rates` plus admin mutation endpoints | Still reads from Firestore directly |
| [packages/client/src/pages/AuditLogs.tsx](packages/client/src/pages/AuditLogs.tsx) | `collection(db, "audit_logs")`, `onSnapshot` | `GET /api/audit-logs` if present or an approved report service | Missing server contract or boundary mismatch |
| [packages/client/src/pages/Reports.tsx](packages/client/src/pages/Reports.tsx) | multiple `collection(db, ...)` queries and `onSnapshot` | Report API contract required under [packages/server/src/index.ts](packages/server/src/index.ts) | Reporting API contract incomplete |
| [packages/client/src/pages/SalaryReport.tsx](packages/client/src/pages/SalaryReport.tsx) | `collection(db, "credits")`, `onSnapshot` | `GET /api/credits` filtered report view | Still reads from Firestore directly |
| [packages/client/src/pages/Dashboard.tsx](packages/client/src/pages/Dashboard.tsx) | `collection(db, ...)` queries with date filters | Dashboard aggregation API | Server API missing or not exposed |
| [packages/client/src/components/UserManagement.tsx](packages/client/src/components/UserManagement.tsx) | `collection(db, "users")`, `onSnapshot` | `GET /api/users` and role verification endpoints | Still reads from Firestore directly |
| [packages/client/src/contexts/ShiftContext.tsx](packages/client/src/contexts/ShiftContext.tsx) | `collection(db, "shifts")`, `where("status", "==", "OPEN")`, `onSnapshot` | `GET /api/shifts` with authorization | Still reads from Firestore directly |
| [packages/client/src/contexts/AuthContext.tsx](packages/client/src/contexts/AuthContext.tsx) | `getDoc(doc(db, "users", firebaseUser.uid))` | `GET /api/users/:id` or auth bootstrap contract | Auth bootstrap still trusts client Firestore |

1. Finish the Thin Client boundary audit
   - Replace remaining client-side Firestore read/write lifecycle usage with backend API or approved shared abstraction wrappers.
   - Reconcile UI page-level data providers with the server API surface.

2. Reproduce and lock the auth/registration fix requirement
   - Verify whether the described registration resolution is implemented in runtime code or only referenced in historical migration notes.
   - If a runtime fix is still missing, add an explicit regression test around the user bootstrap path.

3. Fix engineering governance drift
   - Align [governance/MISSION.md](governance/MISSION.md) with the actual active mission status expected by the infrastructure tests.
   - Decide whether the mission should remain `Locked` or be moved to an active implementation phase and update the `WAKE`/`mission_gate` expectations accordingly.

4. Close the infrastructure verification gap
   - Correct the failing infrastructure assertions or the mission metadata that they derive from.
   - Ensure the infrastructure gate reflects the real mission contract rather than an outdated expectation.

## Proposed Execution Sequence

1. Audit current client-side Firestore usage and classify each binding as allowed or forbidden under the Thin Client policy.
2. Build a backend API usage map for every client UI page that currently enumerates collections.
3. Implement the client adaptation layer or API route wiring so each page is sourced from server contracts instead of direct Firestore read subscriptions.
4. Re-run the infrastructure metatest suite and confirm the mission gate can parse the active mission state consistently.
5. Mark the migration as complete only after the end-to-end integration and infrastructure gates are green with evidence.

## Success Criteria

- No client page or context initializes Firestore direct data subscriptions outside the approved design boundary.
- User registration/auth bootstrap path is demonstrably reproducible and covered by a regression test.
- [governance/MISSION.md](governance/MISSION.md) and the runtime WAKE snapshot agree on the active mission status.
- Vitest infrastructure tests pass in a fresh run.
- Playwright e2e coverage remains stable against the final API shape.

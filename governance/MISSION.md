# Active Mission: Mission 17 — Shift Guard & Audit Log Alignment

## 1. Mission Context
**Status:** Locked
**Type:** Hardening & UI Field Alignment
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
1. Harden `shiftsController.ts` by rejecting `startShift` if an active `status === "OPEN"` shift already exists in Firestore.
2. Refactor `AuditLogs.tsx` to consume the canonical `@level-up/shared` `AuditLog` interface (`user_id`, `reason_for_change`, `old_value`, `new_value`, `table_affected`, `timestamp`), restoring full rendering to system activity logs.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/server/src/controllers/shiftsController.ts`
  - `packages/client/src/pages/AuditLogs.tsx`
- **Out of Scope:**
  - Database schema changes.

## Evidence Payload
- `shiftsController.ts`: Added check in `startShift` querying `status === "OPEN"` shifts and rejecting duplicate start requests with HTTP 400.
- `AuditLogs.tsx`: Refactored Activity Log UI to consume canonical `@level-up/shared` `AuditLog` interface (`user_id`, `reason_for_change`, `old_value`, `new_value`, `table_affected`, `timestamp`), restoring complete data rendering to audit logs.
- **Verification:** All 23 vitest unit tests passed. Biome linter (83 files) and Knip dead-code checks clean. TypeScript typecheck clean.

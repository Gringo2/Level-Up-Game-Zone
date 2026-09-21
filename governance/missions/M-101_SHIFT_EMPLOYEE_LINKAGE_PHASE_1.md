# Active Mission: M-101 Shift Close Audit Log & Shift-Employee Linkage (ACP-010 Phase 1)

## 1. Mission Context
**Status:** Locked  
**Type:** Feature / Tech Debt  
**Phase:** Locked  
**Primary Owner:** AI Implementor  
**Authorising ACP:** ACP-010 (approved 2026-09-22)  
**Related Debt:** TD-030, TD-040  

## 2. Objective
Resolve TD-030 and TD-040 from the deferred debt backlog:
1. **TD-030:** Add atomic audit logging to `closeShift` inside `db.runTransaction` in `shiftsController.ts`.
2. **TD-040:** Add optional `employee_id?: string` to `Shift` in `@level-up/shared`, and auto-resolve `employee_id` in `startShift` and `autoOpenShift` when `user.uid` matches an active employee record.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/shared/src/index.ts` (`employee_id?: string` on `Shift`).
  - `packages/server/src/controllers/shiftsController.ts` (`closeShift` audit record, `startShift` and `autoOpenShift` employee resolution).
  - `packages/server/src/__tests__/shiftsController.test.ts` (test coverage for close audit log & employee attribution).
  - Rebuilding `@level-up/shared` package dist.
- **Out of Scope:**
  - Frontend linkage UI for `Admin.tsx` / `EmployeeRoster.tsx` (Phase 2 / TD-038).
  - Modifying client pages or context hooks.

## 4. Execution Gates
- [x] Functional Verification (39/39 shiftsController tests pass, 298/298 server tests pass, 299/299 client tests pass).
- [x] Architectural Verification (AVP-001: atomic transactions, zero schema breaks, backwards-compatible optional field).
- [x] Dependency Graph Clean (Knip reports 0 issues).
- [x] Biome Formatter and Linter Clean (157 files checked, 0 errors, 0 warnings).
- [x] User Approval (Product Owner authorized implementation).

## Evidence Payload
- [x] Functional Verification: `npx vitest run packages/server/src/__tests__/shiftsController.test.ts` (39/39 passed); `npx vitest run packages/server` (298/298 passed); `npx vitest run packages/client` (299/299 passed).
- [x] Architectural Verification (AVP-001): Audit log in `closeShift` committed atomically via `transaction.set(auditRef, ...)` alongside `transaction.update(shiftRef, updateData)`; `employee_id?: string` optional on `Shift`; unlinked staff operate normally without error.
- [x] Dependency Graph Clean: `npm run knip` succeeded with 0 issues reported.
- [x] ADR Compliance: Conforms to ACP-010 (Shift-Employee Linkage Policy), ADR-001 (Single authoritative composition root), and AGENTS.md § 28 (Time determinism and negative validation).


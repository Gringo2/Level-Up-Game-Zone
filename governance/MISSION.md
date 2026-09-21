# CURRENT MISSION

**Type:** Feature / Tech Debt  
**Mission:** M-101 Shift Close Audit Log & Shift-Employee Linkage (ACP-010 Phase 1)  
**Status:** Locked  

## 1. Objective
Resolve TD-030 and TD-040 from the deferred debt backlog:
1. **TD-030:** Add atomic audit logging to `closeShift` inside `db.runTransaction` in `shiftsController.ts`.
2. **TD-040:** Add optional `employee_id?: string` to `Shift` in `@level-up/shared`, and auto-resolve `employee_id` in `startShift` and `autoOpenShift` when `user.uid` matches an active employee record.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/shared/src/index.ts`
  - `packages/server/src/controllers/shiftsController.ts`
  - `packages/server/src/__tests__/shiftsController.test.ts`
- **Out of Scope:**
  - Frontend linkage UI (Phase 2 / TD-038).

## 4. Design Notes
- Audit log on shift close uses action `UPDATE`, table `shifts`, recording old status/float and new updateData.
- Auto-resolves `employee_id` from `employees` collection where `user_uid == user.uid` and `isActive == true`.

## 5. Testing Strategy
- Server shifts integration tests: `shiftsController.test.ts` (39/39 passing)
- Gates: `tsc`, `vitest`, `knip`, `biome` all passing clean.

## 6. Evidence Payload
- [x] Functional Verification: All 39 shifts controller tests pass; 298/298 server tests pass; 299/299 client tests pass.
- [x] Architectural Verification (AVP-001): Atomic audit log inside `db.runTransaction` in `closeShift`; optional `employee_id?: string` in `Shift` preserves backward compatibility.
- [x] Dependency Graph Clean: Knip clean (0 issues).
- [x] ADR Compliance: Conforms to ACP-010, ADR-001, and AGENTS.md § 28.


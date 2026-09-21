# CURRENT MISSION

**Type:** Feature / Tech Debt  
**Mission:** M-102 Employee-User Linkage UI & Uniqueness Enforcement (ACP-010 Phase 2)  
**Status:** Locked  

## 1. Objective
Resolve TD-038 from the deferred debt backlog:
1. Enforce 1-to-1 uniqueness constraint on `user_uid` in `employeesController.ts` (`createEmployee` and `updateEmployee`).
2. Add optional "Linked System Account" selector to Admin employee creation (`Admin.tsx`) and edit modal (`EmployeeRoster.tsx`).
3. Display linked employee badge in `UserManagement.tsx` and linked system account in `EmployeeRoster.tsx`.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/server/src/schemas/index.ts`
  - `packages/server/src/controllers/employeesController.ts`
  - `packages/server/src/__tests__/employeesController.test.ts`
  - `packages/client/src/pages/Admin.tsx`
  - `packages/client/src/pages/EmployeeRoster.tsx`
  - `packages/client/src/components/UserManagement.tsx`
- **Out of Scope:**
  - Altering User document schema.
  - Altering shift models.

## 4. Design Notes
- 1-to-1 uniqueness on active employees (`isActive == true`).
- Allow `null` or empty string to cleanly unlink.
- Return 409 Conflict (`DUPLICATE_USER_LINKAGE`) if `user_uid` is already linked to another active employee.

## 5. Testing Strategy
- Integration tests in `employeesController.test.ts`.
- Client component & page unit tests in `Admin.test.tsx`, `EmployeeRoster.test.tsx`, and `UserManagement.test.tsx`.
- Repository gates: `tsc`, `vitest`, `knip`, `biome`.

## 6. Evidence Payload
- [x] Functional Verification: 608/608 vitest tests passing (304 server, 304 client).
- [x] Architectural Verification (AVP-001): Express backend authoritative validation, 1-to-1 active uniqueness, seamless unlinking.
- [x] Dependency Graph Clean: `knip` reports 0 issues.
- [x] Code Hygiene: `tsc` clean across packages; `biome lint .` 0 errors, 0 warnings.
- [x] ADR Compliance: ACP-010 Phase 2, TD-038 resolved.



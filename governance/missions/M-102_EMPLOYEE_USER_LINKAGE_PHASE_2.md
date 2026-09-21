# Active Mission: M-102 Employee-User Linkage UI & Uniqueness Enforcement (ACP-010 Phase 2)

## 1. Mission Context
**Status:** Locked  
**Type:** Feature / Tech Debt  
**Phase:** Completed / Verification  
**Primary Owner:** AI Implementor  
**Authorising ACP:** ACP-010 (approved 2026-09-22)  
**Related Debt:** TD-038 (Resolved)  

## 2. Objective
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
  - Relevant client test suites (`Admin.test.tsx`, `EmployeeRoster.test.tsx`, `UserManagement.test.tsx`).
- **Out of Scope:**
  - Altering User document schema (User remains auth/role-centric).
  - Altering shift models (completed in M-101).

## 4. Execution Gates
- [x] Functional Verification (All server and client tests pass: 608 tests across 39 test files).
- [x] Architectural Verification (AVP-001: 1-to-1 uniqueness enforced at Express composition root, backward compatibility preserved).
- [x] Dependency Graph Clean (Knip reports 0 issues).
- [x] Biome Formatter and Linter Clean (157 files checked, 0 errors, 0 warnings).
- [x] User Approval (Plan approved by Product Owner).

## Evidence Payload
- [x] Functional Verification:
  - `npx vitest run packages/server`: 18 test files, 304 passed (including 6 dedicated M-102 uniqueness integration tests in `employeesController.test.ts`).
  - `npx vitest run packages/client`: 21 test files, 304 passed (including 30 in `Admin.test.tsx`, 17 in `EmployeeRoster.test.tsx`, 19 in `UserManagement.test.tsx`).
  - Total tests passing: 608/608.
- [x] Architectural Verification (AVP-001):
  - Express backend is the authoritative composition root.
  - Transaction-level uniqueness check prevents duplicate active linkage with HTTP 409 (`DUPLICATE_USER_LINKAGE`).
  - Unlinking supported via `user_uid: null`.
  - Inactive employees release their linkage so accounts can be re-linked to active employees.
- [x] Dependency Graph & Code Hygiene:
  - `npm run build`: Shared, client, and server build clean with zero errors.
  - `npm run knip`: 0 issues found.
  - `npm run lint`: Biome checked 157 files with 0 errors and 0 warnings.
- [x] ADR Compliance:
  - Compliant with ADR-001 and ACP-010 Phase 2. TD-038 resolved and recorded in `governance/DEBT.md`.

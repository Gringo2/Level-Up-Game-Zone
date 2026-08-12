# Active Mission: Mission 15 — Employee Roster & Salary Reconciliation

## 1. Mission Context
**Status:** Locked
**Type:** Feature & Domain Alignment
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
Implement a managed Employee Roster capability (`/admin/employees`) for store staff members (including `hired_date` and nullable `break_day`). Connect this roster to `Credits.tsx` via a dropdown selector to guarantee accurate, typo-free salary reconciliation and deduction reports.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/shared/src/index.ts`
  - `packages/server/src/schemas/index.ts`
  - `packages/server/src/controllers/employeesController.ts`
  - `packages/server/src/routes/employees.ts`
  - `packages/server/src/index.ts`
  - `packages/client/src/pages/EmployeeRoster.tsx`
  - `packages/client/src/pages/Credits.tsx`
  - `packages/client/src/layouts/Layout.tsx`
  - `packages/client/src/App.tsx`
- **Out of Scope:**
  - Changes to user authentication routes or Firestore rules.

## Evidence Payload
- `shared/src/index.ts`: Added `Employee` interface and `BreakDay` type definition.
- `schemas/index.ts`: Added `CreateEmployeeSchema` and `UpdateEmployeeSchema` with validation for `hired_date` and nullable `break_day`.
- `employeesController.ts`: Implemented `listEmployees`, `createEmployee`, and `updateEmployee` with mandatory audit logging.
- `routes/employees.ts` & `server/src/index.ts`: Exposed and registered `/api/employees`.
- `EmployeeRoster.tsx`: Built store employee management page (`/admin/employees`) with complete CRUD and local state mutation.
- `App.tsx` & `Layout.tsx`: Registered `/admin/employees` route and added sidebar link for `admin` and `manager` roles.
- `Credits.tsx`: Integrated Employee Roster dropdown selector to eliminate freeform name typos in IOUs.
- **Verification:** All 23 vitest unit tests passed. Biome linter (83 files) and Knip dead-code checks clean. TypeScript typecheck clean.

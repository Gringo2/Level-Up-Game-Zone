# Proposal: ACP-010 Shift-Employee Linkage Policy & Shift Close Audit

## 1. Context and Problem Statement
The repository backlog in `governance/DEBT.md` contains three deferred items parked pending a Product Owner policy decision on the Shift / Employee identity model:
1. **TD-030:** `closeShift` does not write an audit log entry (`shiftsController.ts:119-240`), causing shift closures to be missing from the Audit Logs ledger, unlike `startShift` and `updateFloat`.
2. **TD-038:** `Employee` and `User` are disconnected entities in the UI. While `@level-up/shared` and `employeesController` already support an optional `user_uid?: string` field on the `Employee` document, there is no UI affordance in `Admin.tsx` or `EmployeeRoster.tsx` to link an employee to an authenticated user account, nor validation ensuring 1-to-1 linkage.
3. **TD-040:** `Shift` documents record only `manager_id: user.uid` (the Firebase Auth UID) and `manager_name`. There is no connection to the store's employee roster (`employee_id`). As a result, payroll and operational reporting cannot programmatically determine which store employee worked a shift.

## 2. Proposed Architecture & Policy

### 2.1 Entity Boundaries & Linkage Policy (Resolves TD-038)
- **Distinct Identities:**
  - `User`: Authentication and RBAC identity (Google Auth UID, email, role: `admin` | `manager` | `staff`).
  - `Employee`: Store operational and payroll record (name, position, base salary, hiring date, break day, active status).
- **Link Direction:**
  - The link is stored on the `Employee` record as `user_uid?: string` (existing field in schema and shared types).
  - An employee can exist without a system user login (e.g., attendants, cashiers who do not operate the app).
  - A system user can exist without an employee record (e.g., store owner, IT administrator).
  - **Cardinality Constraint:** Exactly 1-to-1 for linked pairs. A `user_uid` may only be associated with at most one active `Employee`.
- **UI Management:**
  - On `Admin.tsx` ("Add Store Employee") and `EmployeeRoster.tsx` (Edit modal): add an optional "Linked System Account" selector displaying active system users (`email` / `role`).
  - On `UserManagement.tsx`: display linked Employee name badge when a user is bridged to a store employee.

### 2.2 Shift-Employee Connection (Resolves TD-040)
- **Schema & Type Update:**
  - Add optional `employee_id?: string` to `Shift` interface in `packages/shared/src/index.ts`.
- **Auto-Resolution on Start Shift:**
  - In `shiftsController.ts:startShift`, during shift initialization, the backend queries `db.collection("employees").where("user_uid", "==", user.uid).where("isActive", "==", true).limit(1)`.
  - If a matching employee is found, the shift document stores:
    - `manager_id: user.uid` (authoritative auth identity)
    - `manager_name: managerName || user.email`
    - `employee_id: employeeDoc.id` (store payroll/roster identity)
  - If no employee is linked, `employee_id` remains omitted, maintaining full backward compatibility.

### 2.3 Shift Close Audit Log (Resolves TD-030)
- In `shiftsController.ts:closeShift`, inside the atomic transaction, insert an audit log record into `COLLECTIONS.AUDIT_LOGS`:
  ```ts
  const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();
  transaction.set(auditRef, {
    action: "UPDATE",
    table_affected: "shifts",
    record_id: id,
    old_value: {
      status: shiftData.status,
      opening_float: shiftData.opening_float,
    },
    new_value: updateData,
    reason_for_change: shortageReason ? `Closed shift (${shortageReason})` : "Closed shift",
    user_id: user.uid,
    timestamp: new Date().toISOString(),
  });
  ```

## 3. Alternative Options Considered
- **Bi-directional Foreign Keys (`user.employee_id` and `employee.user_uid`):** Rejected because dual foreign keys create synchronization anomalies and split transactions. Storing `user_uid` on `Employee` preserves `User` as an immutable auth-first entity.
- **Manual Employee Selection on Start Shift:** Rejected because operators could misattribute shifts to colleagues. Resolving `employee_id` securely from the authenticated session's `user.uid` ensures zero-trust attribution.

## 4. Implementation Phasing
1. **Phase 1 (Backend & TD-030):**
   - Add audit logging to `closeShift` (`TD-030`).
   - Add `employee_id` to `Shift` type and automatic resolution in `startShift` (`TD-040`).
2. **Phase 2 (Frontend Linkage UI & TD-038):**
   - Add user selector to `Admin.tsx` employee creation and `EmployeeRoster.tsx` edit modal.
   - Enforce 1-to-1 uniqueness check on `user_uid` in `employeesController`.

## 5. Affected Documents
- `packages/shared/src/index.ts`
- `packages/server/src/controllers/shiftsController.ts`
- `packages/server/src/controllers/employeesController.ts`
- `packages/server/src/schemas/index.ts`
- `packages/client/src/pages/Admin.tsx`
- `packages/client/src/pages/EmployeeRoster.tsx`
- `packages/client/src/pages/UserManagement.tsx`
- `governance/DEBT.md`
- Respective unit and integration test suites.

## 6. Decision & Approval Required
- [ ] Product Owner approval of the 1-to-1 link direction (`employee.user_uid`).
- [ ] Product Owner approval of automatic `employee_id` enrichment in `startShift`.
- [ ] Authorization to move `TD-030`, `TD-038`, and `TD-040` into Active implementation missions.

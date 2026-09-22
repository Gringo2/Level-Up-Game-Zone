# Architecture Change Proposal (ACP-020): Cross-Flow State Synchronization & Range Guard Hardening

**Author:** System Architecture & Execution  
**Status:** Approved  
**Date:** 2026-09-22  
**Target:** Client State Synchronization, In-Flight Mutation Protection, Input Range Validation  

---

## 1. Problem Statement
Following the completion of Mission M-111, a comprehensive system-wide flow stability audit was conducted across all 12 operational flows in `@level-up/client` and `@level-up/server` (recorded in `system_flow_stability_audit.md`).

Four specific presentation-tier edge cases were identified where client state synchronization and input range validation lacked consistency with established repository patterns:
1. **Dashboard (`Dashboard.tsx`):** In `handleUpdateFloat`, the "Save" button lacks an `isSubmittingFloat` state guard, creating a double-click window where concurrent `PUT /api/shifts/:id/float` requests can be fired. Pre-flight client validation for `isNaN` or `< 0` was also absent.
2. **Expenses (`Expenses.tsx`):** While `GameSales` and `Keno` implement `isWithinActiveRange` (M-92/M-93/M-95) to prevent backdated entries from polluting active date filters, `Expenses.tsx` unconditionally prepends new/updated expenses to the local list, causing state desynchronization until the page is refreshed.
3. **Reports & Salary Report (`Reports.tsx`, `SalaryReport.tsx`):** Inverted date inputs (`From > To`) permit submitting requests where `startDate > endDate`, querying the backend without warning and returning silent empty datasets.
4. **Credits (`Credits.tsx`):** When filtered to a specific employee, creating or editing credits for other employees unconditionally prepends to the active list until manual refetch.

---

## 2. Proposed Architecture & Solution

### A. Dashboard Float In-Flight Guard
- Introduce `isSubmittingFloat` state in `Dashboard.tsx`.
- Add pre-flight validation checking `floatAmount >= 0` and `!isNaN(floatAmount)`.
- Set `isSubmittingFloat` to `true` during the `authFetch` call and reset in a `finally` block.
- Disable both "Save" and "Cancel" buttons while `isSubmittingFloat` is true, displaying `"Saving..."`.

### B. Expenses Range Containment
- Introduce `isWithinActiveRange(date: string): boolean` in `Expenses.tsx` using `getShopDateString(new Date(date))` compared against `filterDateFrom` and `filterDateTo`.
- In `handleSubmit` (create), only prepend `newExpense` if `isWithinActiveRange(newExpense.date)`.
- In `handleSubmit` (edit), remove the item from the active filtered view if `!isWithinActiveRange(updated.date)`.

### C. Date Range Inversion Guards
- In `Reports.tsx` and `SalaryReport.tsx`, compute `isRangeValid = inputStartDate <= inputEndDate`.
- In `handleApply`, block submission with a toast error if `!isRangeValid`.
- Disable the "Apply" button when `!isRangeValid || loading`.
- Render an inline amber warning message (`From date must be on or before To date`) when dates are inverted.

### D. Credits Filter Containment
- In `Credits.tsx`, check `!filterEmployeeId || newCredit.employee_id === filterEmployeeId` before prepending new credits.
- Remove edited credits from the active view if their `employee_id` does not match the active filter.

---

## 3. Invariants & Guardrails
- **Zero API Mutation:** All backend routes, database models, and Express controllers remain unchanged.
- **Zero-Trust Thin Client:** Presentation layer adds safeguards without bypassing backend Zod validation.
- **Timezone Determinism:** Date containment logic uses `Africa/Addis_Ababa` local time helpers from `dateUtils.ts`.
- **Test-Negative Validation (Rule 28):** Red state proven prior to applying fixes.

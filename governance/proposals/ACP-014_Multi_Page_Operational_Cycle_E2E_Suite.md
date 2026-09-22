# ACP-014: End-to-End Multi-Page Operational Cycle Test Suite

## 1. Context and Problem Statement
Phase 8 has introduced critical operational safeguards across the store lifecycle:
- Automated & manual shift recovery (`M-99`, `M-100`)
- Atomic shift close audit logging (`M-101`)
- 1-to-1 Employee-User identity linkage (`M-102`)
- Cash reconciliation and drawer audit analytics in Financial Reports (`M-105`)

While unit test coverage is comprehensive (610/610 unit tests) and page-level E2E tests exist for isolated workflows (16 tests across 6 spec files), the repository lacks an end-to-end integration test that verifies the entire cross-page store lifecycle in a single coherent flow:
1. Manager starts shift with opening float.
2. Manager records sales transactions on the Game Sales page.
3. Manager issues store credit / cash advances on the Credits page.
4. Manager closes the shift with blind cash count, variance entry, shortage explanation, and ConfirmDialog verification.
5. Admin verifies the closed shift, drawer discrepancy KPIs, and audit table in Financial Reports.
6. Admin verifies the immutable atomic audit trail entry in Activity Logs.

Without an end-to-end operational cycle spec, regressions that span multi-page state transitions, client router navigation, and cross-feature calculations could slip past isolated unit tests.

## 2. Proposed Solution
Create a comprehensive Playwright test suite `tests/e2e/store_operations_cycle.spec.ts`:
- **Stateful In-Memory Router Harness:** Intercepts `/api/**` calls hermetically, maintaining consistent shared state (rates, employees, shifts, sales, credits, audit logs) throughout the browser session.
- **Step 1: Shift Opening:** Manager opens shift with $100.00 float, verifying active shift status.
- **Step 2: Operational Logging:** Navigates to `/games`, logs game sale ($30.00), navigates to `/credits`, logs credit advance ($15.00).
- **Step 3: Shift Closure:** Manager closes shift entering counted cash ($110.00 vs $115.00 expected), supplies shortage note, confirms via `ConfirmDialog`.
- **Step 4: Reporting Audit:** Admin navigates to `/reports`, verifying Cash Drawer Integrity KPIs ($ -5.00 Net Variance, 0 / 1 Balanced) and Shift Cash Reconciliation & Drawer Audit table.
- **Step 5: Activity Log Verification:** Admin navigates to `/audit-logs`, verifying the recorded `UPDATE` audit log for the closed shift.

## 3. Alternative Options
- **Option 1: Rely solely on isolated page-level unit tests**
  - *Rejected:* Unit tests mock all hooks at component boundaries and do not test actual browser routing, multi-page state carryover, or DOM event propagation across page transitions.
- **Option 2: Live Firebase backend execution**
  - *Rejected:* Violates E2E hermeticity (TD-055). Live database writes risk rate limits, credential leakage, and cross-test interference. Client-side route interception is deterministic, fast, and hermetic.

## 4. Consequences
- **Positive:**
  - Complete confidence that the entire core business operational loop functions cohesively.
  - Verifies multi-page navigation and role transitions.
  - Zero performance degradation: runs hermetically in seconds without database side-effects.
- **Negative:**
  - Adds one test file to `tests/e2e/`, requiring maintenance if core route URLs change.

## 5. Affected Documents
- `governance/proposals/ACP-014_Multi_Page_Operational_Cycle_E2E_Suite.md` (New)
- `governance/missions/M-106_OPERATIONAL_CYCLE_E2E_SUITE.md` (New)
- `tests/e2e/store_operations_cycle.spec.ts` (New)
- `governance/MISSION.md`
- `governance/TASKS.md`
- `governance/ROADMAP.md`
- `governance/SYSTEM_CONTEXT.md`

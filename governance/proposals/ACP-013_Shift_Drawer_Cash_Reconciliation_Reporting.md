# ACP-013: Shift Drawer Cash Reconciliation & Discrepancy Analytics in Reports

## 1. Context and Problem Statement
Level-Up Game Zone operates on strict daily cash drawer accountability. During each shift, managers open the register with an opening float, collect cash for game sessions and keno tickets, disburse verified expenses or salary advances, and perform a blind cash count upon closing. Any variance between expected cash and actual cash counted is calculated and recorded, requiring a mandatory explanation when the variance exceeds $2.00.

While `Reports.tsx` fetches `shifts` for the selected reporting range, it currently only computes an aggregated `Avg Shift Variance` number in a top KPI card and aggregates total variances by cashier name in the Staff Accountability table. Store managers and owners currently have no way to:
1. Inspect individual shift drawer reconciliation details (opening float, expected cash, actual counted cash, variance, and shortage explanation).
2. Monitor register integrity metrics across the date range (e.g. count of balanced shifts vs shifts with discrepancies, total cash collected).
3. Review open or missed shifts that fall within the period.
4. Print a consolidated period cash drawer audit report alongside the revenue mix and expense burn breakdown.

## 2. Proposed Solution
Enhance `Reports.tsx` with dedicated **Shift Drawer Cash Reconciliation & Discrepancy Analytics**:

### A. Cash Drawer Integrity KPI Row
Add an enhanced drawer reconciliation KPI card / metric group:
- **Net Drawer Variance:** Total cumulative discrepancy across all closed shifts in the period (color-coded: red for net shortage, emerald for surplus, neutral for balanced).
- **Drawer Discrepancy Rate:** Count of balanced shifts (variance = $0.00) vs discrepancy shifts (variance != $0.00, with sub-breakdown of shortages vs overages).
- **Total Cash Processed:** Sum of `actual_cash_counted` across all closed shifts.

### B. Shift Cash Reconciliation & Drawer Audit Table
Introduce a dedicated, responsive, and printable ledger card **"Shift Cash Reconciliation & Drawer Audit"**:
- **Columns:**
  - `Shift Window`: Local date and start time -> end time (`h:mm a`).
  - `Cashier / Manager`: Name of shift manager.
  - `Status`: Badge indicator (`CLOSED`, `OPEN`, `MISSED`).
  - `Opening Float`: Dollar amount allocated at shift start.
  - `Expected Cash`: Calculated cash drawer expectation at close.
  - `Actual Counted`: Blind counted cash submitted by manager.
  - `Variance & Notes`: Variance dollar amount (color-coded) with inline shortage reason / explanation notes when present.
- **Empty State:** Friendly banner when no shifts exist in the selected period.
- **Print Optimization:** Formatted with `print:break-inside-avoid` and clean contrast for physical paper auditing.

### C. Architecture & Boundary Preservation
- **Thin Client Compliance (ADR-001):** Reuses the existing `GET /api/shifts?startDate=...&endDate=...` query already executed by `Reports.tsx`. No new backend endpoints or database queries are introduced.
- **Pure Domain Contracts:** Reuses the existing `Shift` interface from `@level-up/shared`.

## 3. Alternative Options
- **Option 1: New Dedicated Backend Aggregation Endpoint (`/api/reports/drawer-reconciliation`)**
  - *Rejected:* `Reports.tsx` already fetches the full list of `Shift` objects for the selected date range. Aggregating client-side preserves zero-latency date filtering, reduces backend load, and adheres to the Reusability Principle (ADR-003 / Rule 25).
- **Option 2: Shift Drawer Drill-Down in Popup Modal Only**
  - *Rejected:* Store owners print historical reports for accountant and owner sign-off. Modal-only presentation cannot be printed cleanly via the browser's print engine.

## 4. Consequences
- **Positive:**
  - Full operational transparency: Store owners can instantly identify which shifts incurred cash shortages and read the manager's explanation.
  - Paper audit capability: Complete shift reconciliation ledger included on printed report slips.
  - Zero backend regression risk: Operates entirely on the client presentation layer using existing verified endpoints.
- **Negative:**
  - Increases vertical length of `Reports.tsx`, mitigated by clean responsive layout and empty state handling.

## 5. Affected Documents
- `governance/proposals/ACP-013_Shift_Drawer_Cash_Reconciliation_Reporting.md` (New)
- `packages/client/src/pages/Reports.tsx` (Component enhancement)
- `packages/client/src/__tests__/pages/Reports.test.tsx` (Unit test expansion)
- `governance/MISSION.md` (Mission pointer)
- `governance/missions/M-105_SHIFT_RECONCILIATION_REPORTING.md` (Mission doc)

## 6. Action Items
1. Submit ACP-013 for User / Product Owner approval.
2. Formulate Mission M-105 Technical Implementation Plan.
3. Update `Reports.tsx` with Drawer KPI cards and Shift Cash Reconciliation table.
4. Expand `Reports.test.tsx` unit test suite with Red-Green validation.
5. Verify zero regression across Vitest, Playwright, Biome, and Knip gates.
6. Lock mission and record evidence payload.

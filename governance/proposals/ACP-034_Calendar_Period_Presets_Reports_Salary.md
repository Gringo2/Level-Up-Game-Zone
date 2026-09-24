# Proposal: ACP-034 Calendar Period Presets in Reports & Salary Report

## 1. Context and Problem Statement
Historical Reports (`/reports`) and Payroll & Salary Slips (`/salary`) are the primary managerial review and financial reconciliation surfaces in the application:
- While daily cashier shift reconciliation uses `Today` and `Yesterday`, managerial financial analysis and payroll settlement rely on weekly and monthly accounting cycles.
- In `Reports.tsx`, the horizontal preset bar includes "Today", "Yesterday", "This Week", "This Month", "Last 7 Days", and "Last 30 Days", but omits:
  - **"Last Week"**: The previous calendar week (Monday–Sunday), which is the standard retail payroll/reconciliation cycle.
  - **"Last Month"**: The previous full calendar month (e.g., Aug 1–Aug 31 when in September), which is required for closed-month accounting and audits.
- In `SalaryReport.tsx`, presets currently only include `Today` and `Yesterday`. Because salaries and employee credit deductions are settled on a monthly or weekly basis, store managers must manually select the first and last day of each month or week via date pickers.

## 2. Proposed Solution
1. **Centralized Date Range Generators (`packages/client/src/lib/dateUtils.ts`)**:
   In adherence to Rule 25 (Reusability & Anti-Reinvention Protocol), export pure, reusable helper functions anchored to shop timezone (`SHOP_TIMEZONE = "Africa/Addis_Ababa"`):
   - `getShopThisWeekRange(date?: Date): { from: string; to: string }`
   - `getShopLastWeekRange(date?: Date): { from: string; to: string }`
   - `getShopThisMonthRange(date?: Date): { from: string; to: string }`
   - `getShopLastMonthRange(date?: Date): { from: string; to: string }`

2. **Historical Reports (`packages/client/src/pages/Reports.tsx`)**:
   Add `Last Week` and `Last Month` to the `presets` array:
   - `Today`
   - `Yesterday`
   - `This Week`
   - `Last Week` (NEW)
   - `This Month`
   - `Last Month` (NEW)
   - `Last 7 Days`
   - `Last 30 Days`

3. **Payroll & Salary Report (`packages/client/src/pages/SalaryReport.tsx`)**:
   Add `This Month`, `Last Month`, and `This Week` preset buttons to the toolbar with immediate application and period-aware contextual description updates:
   - `"This month's net salary calculations and itemized IOU deductions for store staff."`
   - `"Last month's net salary calculations and itemized IOU deductions for store staff."`
   - `"This week's net salary calculations and itemized IOU deductions for store staff."`

4. **Testing (Rule 28 Red-Green Protocol)**:
   - Add unit tests in `dateUtils.test.ts` for each range function with deterministic fake timers.
   - Add Red-Green unit tests in `Reports.test.tsx` verifying "Last Week" and "Last Month" presets.
   - Add Red-Green unit tests in `SalaryReport.test.tsx` verifying "This Month", "Last Month", and "This Week" presets.

## 3. Alternative Options
- **Leave Presets in SalaryReport as Today/Yesterday only (Rejected)**: Inconveniences managers who run monthly payroll by requiring manual date picker input on every review.
- **Calculate Ranges Locally in Each Component (Rejected)**: Violates Rule 25 (monorepo reusability); range logic must be centralized in `dateUtils.ts`.

## 4. Consequences
- **Positive**: Immediate one-click access to weekly and monthly financial reporting and payroll settlement.
- **Positive**: Consistent calendar range calculations across the entire application anchored to shop timezone.
- **Positive**: Zero backend schema or database changes required.

## 5. Affected Documents
- `packages/client/src/lib/dateUtils.ts`
- `packages/client/src/__tests__/lib/dateUtils.test.ts`
- `packages/client/src/pages/Reports.tsx`
- `packages/client/src/__tests__/pages/Reports.test.tsx`
- `packages/client/src/pages/SalaryReport.tsx`
- `packages/client/src/__tests__/pages/SalaryReport.test.tsx`
- `governance/proposals/ACP-034_Calendar_Period_Presets_Reports_Salary.md`
- `governance/missions/M-126_CALENDAR_PERIOD_PRESETS_REPORTS_SALARY.md`
- `governance/MISSION.md`
- `governance/SYSTEM_CONTEXT.md`
- `governance/TASKS.md`
- `governance/ROADMAP.md`
- `docs/reports/M-126_Blast_Radius_Report.md`

## 6. Action Items
1. Formalize Mission M-126 under ACP-034.
2. Add unit tests for new range helpers in `dateUtils.test.ts` and verify.
3. Write Red unit tests in `Reports.test.tsx` and `SalaryReport.test.tsx`.
4. Implement range helpers in `dateUtils.ts`.
5. Update `Reports.tsx` and `SalaryReport.tsx`.
6. Run full verification suite (Vitest, Playwright, Biome, Knip, build) and lock M-126.

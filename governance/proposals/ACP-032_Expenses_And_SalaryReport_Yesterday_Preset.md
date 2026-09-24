# Proposal: ACP-032 Expenses & SalaryReport Yesterday Date Filter Presets

## 1. Context and Problem Statement
Following Missions M-122 (Historical Reports "Yesterday" preset) and M-123 (Game Sales, Keno, and Sports Betting "Yesterday" presets), two pages remained without a quick-set "Yesterday" shortcut:
- Expenses (`/expenses`)
- Salary Report (`/salary-report`)

On `/expenses`, the filter toolbar currently provides manual `From` and `To` date pickers without any quick-set presets (`Today` or `Yesterday`).
On `/salary-report`, the toolbar provides manual `inputStartDate` and `inputEndDate` pickers with an `Apply` button, requiring manual date entry and an explicit click.
Physical store managers regularly audit previous-day petty cash expenses and previous-day salary payouts or IOU deductions during shift handovers. Manually typing yesterday's date in both pickers across these pages creates unnecessary friction and risks operational typos.

## 2. Proposed Solution
1. **Expenses Page (`packages/client/src/pages/Expenses.tsx`)**:
   - Import `getShopYesterdayString` and `getShopDateString` from `dateUtils.ts`.
   - Add `Today` and `Yesterday` buttons to the history card filter toolbar.
   - Update `CardDescription` to contextually display `"Today's expenses."` or `"Yesterday's expenses."` when both date boundaries match.
   - Update empty state to display `"No expenses logged today yet."` or `"No expenses logged yesterday."`.
2. **Salary Report Page (`packages/client/src/pages/SalaryReport.tsx`)**:
   - Import `getShopYesterdayString` and `getShopDateString` from `dateUtils.ts`.
   - Add `Today` and `Yesterday` buttons to the date selection toolbar.
   - Implement immediate-apply logic: clicking either preset updates both input states (`inputStartDate`/`inputEndDate`) and applied query states (`appliedStartDate`/`appliedEndDate`) simultaneously, triggering instant re-fetch.
   - Update header subtitle to contextually indicate today's or yesterday's payroll calculations when selected.
3. **Red-Green Unit Testing (Constitution Rule 28)**:
   - Add Red unit tests in `Expenses.test.tsx` verifying the presence and behavior of `Yesterday` and `Today` buttons and contextual description.
   - Add Red unit tests in `SalaryReport.test.tsx` verifying the presence and immediate-apply behavior of `Yesterday` and `Today` buttons.
   - Verify green pass after component updates.

## 3. Alternative Options
- **Leave manual selection (Rejected)**: Inconsistent with the other four operational pages (`/reports`, `/games`, `/keno`, `/betting`), creating an erratic user experience.
- **Require clicking "Apply" on SalaryReport presets (Rejected)**: Redundant friction. One-click presets should immediately execute the filter (consistent with `Reports.tsx`).

## 4. Consequences
- **Positive**: 100% date filter UX parity across all 6 pages with date ranges in the application.
- **Positive**: Zero backend, database, or shared type changes (confined to UI presentation).
- **Positive**: Full responsiveness preserved across mobile, tablet, and desktop viewports.

## 5. Affected Documents
- `packages/client/src/pages/Expenses.tsx`
- `packages/client/src/__tests__/pages/Expenses.test.tsx`
- `packages/client/src/pages/SalaryReport.tsx`
- `packages/client/src/__tests__/pages/SalaryReport.test.tsx`
- `governance/missions/M-124_EXPENSES_AND_SALARY_REPORT_YESTERDAY_PRESET.md`
- `governance/MISSION.md`
- `governance/SYSTEM_CONTEXT.md`
- `governance/TASKS.md`
- `governance/ROADMAP.md`
- `docs/reports/M-124_Blast_Radius_Report.md`

## 6. Action Items
1. Formalize Mission M-124 under ACP-032.
2. Write failing (Red) tests in `Expenses.test.tsx` and `SalaryReport.test.tsx`.
3. Implement `Yesterday` and `Today` buttons in `Expenses.tsx`.
4. Implement `Yesterday` and `Today` buttons with immediate apply in `SalaryReport.tsx`.
5. Verify unit tests, Playwright E2E suite, Biome lint, Knip, and build.
6. Lock M-124.

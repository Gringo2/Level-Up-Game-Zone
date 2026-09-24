# Proposal: ACP-033 Credits Yesterday & Date Filter Presets

## 1. Context and Problem Statement
Following Missions M-122 (Reports Yesterday preset), M-123 (Game Sales, Keno, Sports Betting presets), and M-124 (Expenses and Salary Report presets), Store Credits (`/credits`) is the only operational history ledger in the application without date range filtering:
- The "Recent Credits" card currently offers an employee dropdown filter ("All Employees"), but unconditionally fetches up to 200 credits with no date constraints.
- Operators conducting daily shift balancing or cross-verifying store credit advances logged today or yesterday must scroll through a flat, unsegmented list.
- The Express backend (`creditsController.ts`) and Firestore indexes already fully support `startDate` and `endDate` query parameters.

## 2. Proposed Solution
1. **Store Credits Page (`packages/client/src/pages/Credits.tsx`)**:
   - Import `getShopYesterdayString`, `getShopStartOfDay`, and `getShopEndOfDay` from `../lib/dateUtils`.
   - Add `filterDateFrom` and `filterDateTo` state (defaulting to today's shop date).
   - Add `listLoading` state for visual query feedback.
   - Pass `startDate` and `endDate` ISO strings to `GET /api/credits` during `loadCredits` and `loadOlderCredits`.
   - Add `From` and `To` date pickers, alongside `Today` and `Yesterday` quick-set ghost buttons in the card header toolbar.
   - Update `CardDescription` to contextually display `"Today's employee IOUs."`, `"Yesterday's employee IOUs."`, or range dates.
   - Display a range summary banner (`data-testid="credits-range-summary"`) showing total credit count and dollar amount.
   - Enforce ACP-020: newly created credits are only prepended if `entryDate` falls within `[filterDateFrom, filterDateTo]`.
2. **Red-Green Unit Testing (Constitution Rule 28)**:
   - Add Red unit test in `Credits.test.tsx` verifying the presence and behavior of `Yesterday` and `Today` buttons and contextual description.
   - Verify green pass after page implementation.

## 3. Alternative Options
- **Leave Credits without date filtering (Rejected)**: Inconsistent with all other 6 operational screens in the application, leaving operators with incomplete reconciliation tools.

## 4. Consequences
- **Positive**: 100% complete date filtering and preset parity across all operational screens in the application.
- **Positive**: Zero backend controller, schema, or database changes required.
- **Positive**: Full responsiveness preserved across mobile, tablet, and desktop viewports without overflow.

## 5. Affected Documents
- `packages/client/src/pages/Credits.tsx`
- `packages/client/src/__tests__/pages/Credits.test.tsx`
- `governance/proposals/ACP-033_Credits_Yesterday_And_Date_Filter_Presets.md`
- `governance/missions/M-125_CREDITS_YESTERDAY_AND_DATE_FILTER_PRESETS.md`
- `governance/MISSION.md`
- `governance/SYSTEM_CONTEXT.md`
- `governance/TASKS.md`
- `governance/ROADMAP.md`
- `docs/reports/M-125_Blast_Radius_Report.md`

## 6. Action Items
1. Formalize Mission M-125 under ACP-033.
2. Write failing (Red) tests in `Credits.test.tsx`.
3. Implement `Yesterday` and `Today` buttons and date range filtering in `Credits.tsx`.
4. Verify unit tests, Playwright E2E suite, Biome lint, Knip, and build.
5. Lock M-125.

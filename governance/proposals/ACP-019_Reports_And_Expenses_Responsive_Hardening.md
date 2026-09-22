# ACP-019: Reports and Expenses Responsive Layout Hardening

## 1. Problem Statement
Following the completion of M-110, an exhaustive 44-checkpoint route and viewport audit across all 11 client pages revealed 3 specific horizontal container overflow points:
1. **`/reports` @ 320px (`mobile-xs`)**: `+31px` horizontal overflow caused by side-by-side date inputs with minimum intrinsic width exceeding the 288px available container space.
2. **`/reports` @ 768px (`tablet`)**: `+125px` horizontal overflow caused by `sm:flex-row` forcing page title and date range controls onto the same horizontal line in the 480px main column beside the 256px permanent sidebar.
3. **`/expenses` @ 768px (`tablet`)**: `+7px` horizontal overflow caused by `sm:flex-nowrap` on the history card header controls colliding with the title in the 446px column beside the sidebar.

## 2. Proposed Architecture & Layout Solution
1. **`Reports.tsx` Mobile Date Filter Stacking:**
   - In `Reports.tsx` line 303-318, replace static side-by-side flex layout with `flex-col min-[360px]:flex-row`.
   - On screens < 360px (e.g. 320px), date inputs stack cleanly with full container width. On screens $\ge$ 360px, they render side-by-side.
2. **`Reports.tsx` Tablet Breakpoint Harmonization:**
   - In `Reports.tsx` line 271, upgrade `sm:flex-row` to `lg:flex-row` and `sm:items-center` to `lg:items-center` (mirroring the proven pattern established in `SalaryReport.tsx` under M-109).
   - Prevents collision between title and date controls on viewports between 640px and 1024px when the 256px sidebar is active.
3. **`Expenses.tsx` History Card Header Flex-Wrap:**
   - In `Expenses.tsx` line 551 & 560, remove `sm:flex-nowrap`, allowing controls to wrap cleanly into a second row when width is constrained by the tablet sidebar.
   - Adjust input width from static `sm:w-[150px]` to `sm:w-[130px]` or flexible sizing.

## 3. Scope & Containment
- **In Scope:**
  - `packages/client/src/pages/Reports.tsx`
  - `packages/client/src/pages/Expenses.tsx`
  - `tests/e2e/history_row_responsive.spec.ts`
  - Governance artifacts (`ACP-019`, `M-111`, `MISSION.md`, `TASKS.md`, `ROADMAP.md`)
  - Deployment bundle refresh (`cpanel-deploy.tar.gz`, `cpanel-deploy.zip`)
- **Out of Scope:**
  - Database schema, API endpoints, backend logic, or routing definitions.

## 4. Verification Plan
- Playwright responsive audit verifying 0px overflow across `/reports` and `/expenses` at 320px, 375px, 768px, and 1280px.
- Vitest unit suite: 620/620 passing.
- Playwright E2E suite: 19/19 passing.
- Quality gates: `npm run lint`, `npm run knip`, `npm run build`.

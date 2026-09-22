# ACP-017: Multi-Device Responsive Overflow Hardening

## 1. Context and Problem Statement
Following the rollout of M-108 (collapsible mobile navigation drawer and date picker improvements), a full-battery empirical responsiveness audit across all 11 client routes and 4 critical viewports (320px, 375px, 768px, 1024px) detected three concrete horizontal overflow bugs and one squishing vulnerability:
1. **UserManagement (`/admin/users`):** The staff accounts `<table>` is rendered directly in `<CardContent>` without an `overflow-x-auto` wrapper, expanding the main content area by +254px on 320px, +199px on 375px, and +78px on 768px tablet width.
2. **SalaryReport (`/salary-report`):** The date filter controls bar (`flex items-center gap-2`) containing 2 date inputs, label, Apply button, and Print button does not wrap. At 768px tablet width, the desktop sidebar consumes 256px leaving 512px, but the header's `sm:flex-row` forces the title (~300px) and controls (~440px) side-by-side, overflowing by +135px. On mobile, it overflows by up to +327px.
3. **EmployeeRoster (`/admin/employees`):** Staff card headers place the name, position badge, active/inactive badge, and linked account email badge inside `<div className="flex items-center gap-2">` without `flex-wrap`, overflowing the container by +356px on 320px and +164px on 768px when staff names or account emails are long.
4. **Admin (`/admin`):** Current Rates and Expense Categories list items use `flex justify-between items-center` without responsive wrapping, risking button squeeze against titles on narrow screens.

## 2. Proposed Solution
1. **Table Encapsulation:** Wrap the staff accounts table in `UserManagement.tsx` in a `<div className="overflow-x-auto">` container with a defined minimum table width (`min-w-[560px]`) so horizontal scrolling is localized cleanly within the card.
2. **Responsive Date Control Wrapping:** In `SalaryReport.tsx`, shift the header breakpoint from `sm:flex-row` to `lg:flex-row` to prevent tablet collision with the desktop sidebar. Add `flex-wrap` and mobile input full-width behavior to the date filter bar.
3. **Badge Bar Flex-Wrapping:** In `EmployeeRoster.tsx`, add `flex-wrap` and truncation to the staff row badge container to prevent unconstrained horizontal expansion.
4. **Admin Row Stacking:** In `Admin.tsx`, add responsive stacking (`flex-col sm:flex-row items-start sm:items-center`) to rate and category rows.
5. **E2E Responsive Regression Gate:** Add explicit assertions to `tests/e2e/history_row_responsive.spec.ts` guaranteeing that `main.scrollWidth <= main.clientWidth` across all viewports.

## 3. Alternative Options
- **Hide columns on mobile:** Rejected; hiding staff emails, roles, or action buttons degrades managerial functionality. Local horizontal scrolling in a card preserves 100% data accessibility.
- **Shrink font sizes:** Rejected; reducing font size below readable thresholds violates mobile accessibility standards.

## 4. Consequences
- **Positive:** Eliminates all horizontal scrollbars and layout breaking across mobile, tablet, and desktop viewports. All tables and control bars remain cleanly usable.
- **Negative:** None. Strictly presentation-layer hardening in `@level-up/client`.

## 5. Affected Documents
- `packages/client/src/components/UserManagement.tsx`
- `packages/client/src/pages/SalaryReport.tsx`
- `packages/client/src/pages/EmployeeRoster.tsx`
- `packages/client/src/pages/Admin.tsx`
- `tests/e2e/history_row_responsive.spec.ts`
- `governance/missions/M-109_RESPONSIVE_OVERFLOW_HARDENING.md`
- `governance/MISSION.md`
- `governance/TASKS.md`

## 6. Action Items
1. Apply table overflow container to `UserManagement.tsx`.
2. Apply responsive flex wrapping and header breakpoint adjustment to `SalaryReport.tsx`.
3. Apply flex-wrap and badge truncation to `EmployeeRoster.tsx`.
4. Apply responsive stacking to `Admin.tsx`.
5. Add automated E2E tests in `tests/e2e/history_row_responsive.spec.ts` for all 4 pages.
6. Verify via Vitest, Playwright, Biome lint, Knip, and monorepo build.

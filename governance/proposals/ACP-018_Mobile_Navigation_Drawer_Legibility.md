# ACP-018: Mobile Navigation Drawer Link Legibility & Contrast Hardening

## 1. Problem Statement
Following the rollout of M-108's mobile collapsible drawer, user inspection on mobile devices identified that navigation links inside the expanded drawer are difficult to read ("links are not visible enough").

### Root Cause Analysis (RCA)
1. In `packages/client/src/layouts/Layout.tsx`, the mobile drawer container (`[data-testid="mobile-nav-drawer"]`) applies background `bg-zinc-900/95` without declaring a foreground text color class (unlike the desktop `<aside>`, which declares `text-zinc-300`).
2. The inactive link styling in the drawer only specified hover pseudo-classes (`hover:bg-zinc-800 hover:text-white`) with no base text color class (e.g. `text-zinc-200` or `text-zinc-300`).
3. Because touch devices do not have persistent cursor hover states, inactive links defaulted to the inherited body text color (dark zinc-900 / black), rendering virtually invisible against the dark `bg-zinc-900` container.

## 2. Proposed Architecture & Styling Solution
1. **Container Foreground Class:** Add explicit `text-zinc-100` to the mobile drawer container to guarantee light text inheritance across all child elements.
2. **Explicit High-Contrast Link Classes:**
   - **Inactive Link:** `text-zinc-200 hover:text-white hover:bg-zinc-800/80` with icon `text-zinc-400`.
   - **Active Link:** `bg-zinc-800 text-white font-semibold shadow-sm ring-1 ring-zinc-700/60` with active icon accent `text-indigo-400`.
3. **Mobile Touch Target Optimization:** Increase padding to `px-3.5 py-3` with `rounded-lg` and `text-sm font-medium` to comfortably satisfy WCAG 44x44px touch targets.
4. **Sign Out Button Visibility:** Explicitly apply `text-zinc-200 hover:text-white hover:bg-zinc-800 py-3` to the mobile sign out button.
5. **Desktop Sidebar Consistency:** Explicitly apply `text-zinc-300` to desktop inactive links to prevent any ambient inheritance drifts.

## 3. Scope & Blast Radius
- `packages/client/src/layouts/Layout.tsx`: Presentation only; no routing or state logic altered.
- `packages/client/src/__tests__/layouts/Layout.test.tsx`: Unit test coverage for high-contrast classes.
- `tests/e2e/history_row_responsive.spec.ts`: E2E verification of mobile link contrast and visibility.

## 4. Verification Plan
- Vitest unit tests: `npm run test -- packages/client/src/__tests__/layouts/Layout.test.tsx`
- Playwright E2E: `npx playwright test tests/e2e/history_row_responsive.spec.ts`
- Monorepo quality gates: `npm run lint`, `npm run knip`, `npm run build`

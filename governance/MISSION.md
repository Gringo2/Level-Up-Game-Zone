# CURRENT MISSION

**Type:** UX / Refactoring  
**Mission:** M-108 Mobile UX Modernization & Responsive Layout Hardening  
**Status:** Locked  
**Proposal:** ACP-016  

## 1. Objective
Modernize mobile navigation and harden responsive layouts across `@level-up/client`:
1. Implement a collapsible mobile navigation drawer and compact header in `Layout.tsx`.
2. Implement resilient date formatting in `dateUtils.ts` and apply to `Dashboard.tsx` to eliminate `RangeError: Invalid time value` crashes.
3. Make date filter rows wrap responsively across `GameSales.tsx`, `Keno.tsx`, and `Expenses.tsx`.
4. Wrap `Reports.tsx` date range presets in a horizontal scroll container on mobile.

## 2. Context
Empirical multi-device testing revealed that `<aside>` in `Layout.tsx` stacks 11 navigation links vertically at the top on viewports `< 768px`, taking up ~450px of vertical space before page content begins. In addition, date filter toolbars on small devices clip the `Apply` action buttons, and invalid shift dates can trigger unhandled formatting crashes in `Dashboard.tsx`.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/layouts/Layout.tsx`
  - `packages/client/src/__tests__/layouts/Layout.test.tsx`
  - `packages/client/src/lib/dateUtils.ts`
  - `packages/client/src/__tests__/lib/dateUtils.test.ts`
  - `packages/client/src/pages/Dashboard.tsx`
  - `packages/client/src/pages/GameSales.tsx`
  - `packages/client/src/pages/Keno.tsx`
  - `packages/client/src/pages/Expenses.tsx`
  - `packages/client/src/pages/Reports.tsx`
  - `tests/e2e/history_row_responsive.spec.ts`
  - `tests/e2e/store_operations_cycle.spec.ts`
  - `governance/proposals/ACP-016_Mobile_UX_And_Responsive_Layout.md`
  - `governance/missions/M-108_MOBILE_UX_AND_RESPONSIVE_LAYOUT.md`
  - `governance/MISSION.md`
- **Out of Scope:**
  - Server endpoints or database schemas (strictly client presentation layer).

## 4. Testing Strategy
- Unit tests: `npx vitest run packages/client/src/__tests__/layouts/Layout.test.tsx` and `dateUtils.test.ts`.
- ADR-006 / AGENTS.md Rule 28 Red-Green protocol.
- Full Vitest suite: `npx vitest run`.
- Full Playwright battery: `npx playwright test`.
- Hygiene checks: `npm run lint`, `npm run knip`, `npm run build`.

## 5. Evidence Payload
- [x] Functional Verification: Mobile navigation drawer and responsive date filter bars verified across mobile and desktop.
- [x] Test-Negative Validation: Red failure captured prior to green completion.
- [x] Full Battery Health: All unit (619/619) and E2E (18/18) tests passing.
- [x] Monorepo Hygiene: Biome (159 files checked, 0 errors, 0 warnings), Knip (0 issues), and build clean across shared, client, and server.
- [x] Governance Synchronization: Mission locked upon completion.

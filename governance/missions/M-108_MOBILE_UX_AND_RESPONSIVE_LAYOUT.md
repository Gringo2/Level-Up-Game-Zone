# Mission 108: Mobile UX Modernization & Responsive Layout Hardening

**Type:** UX / Refactoring  
**Status:** Locked  
**Proposal:** ACP-016  
**Related ADRs:** ADR-001 (Thin Client), ADR-006 (Test-Negative Gating)  
**Verification Date:** 2026-09-22  

---

## 1. Objective

Harden responsiveness and modernize the mobile user experience across `@level-up/client`:
1. Implement a collapsible mobile navigation drawer and compact sticky header in `Layout.tsx`.
2. Implement resilient date formatting in `dateUtils.ts` and apply to `Dashboard.tsx` to eliminate `RangeError: Invalid time value` crashes.
3. Make date filter rows wrap responsively across `GameSales.tsx`, `Keno.tsx`, and `Expenses.tsx`.
4. Wrap `Reports.tsx` date range presets in a horizontal scroll container on mobile.

---

## 2. In Scope & Out of Scope

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
- **Out of Scope:**
  - Server endpoints or database schemas (strictly client presentation layer).

---

## 3. Verification & Evidence

- [x] **Test-Negative Red-Green Gating (ADR-006):**
  - Proved Red state on `dateUtils.test.ts` (2 failed prior to `formatSafeDate` implementation).
  - Proved Red state on `Layout.test.tsx` (2 failed prior to mobile hamburger implementation).
- [x] **Component Unit Tests:**
  - `Layout.test.tsx`: 10/10 tests green.
  - `dateUtils.test.ts`: 8/8 tests green.
  - `Dashboard.test.tsx`: 18/18 tests green.
  - `GameSales.test.tsx`, `Keno.test.tsx`, `Expenses.test.tsx`, `Reports.test.tsx`: 110/110 tests green.
- [x] **E2E Playwright Suite:**
  - `history_row_responsive.spec.ts`: 3/3 tests green across mobile (375px) and desktop (1280px) viewports.
  - Full Playwright battery: 18/18 tests green across 7 test files.
- [x] **Monorepo Battery:**
  - Vitest: 619/619 tests green across 39 test files.
  - Biome: 159 files checked, 0 errors, 0 warnings.
  - Knip: 0 issues found.
  - Monorepo build: Clean build across `@level-up/shared`, `@level-up/client`, and `@level-up/server`.
  - Lock guard: Exited with code 0.

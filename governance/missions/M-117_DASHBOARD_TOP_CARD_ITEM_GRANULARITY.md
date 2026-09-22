# Mission M-117: Dashboard Top Card Game Sales Item Granularity

**Status:** Locked  
**Type:** Feature / UX  
**Proposal:** ACP-025  
**Owner:** Execution  
**ADR References:** ADR-001, ADR-004, ADR-006  

---

## 1. Context & Objective
In Mission M-116 (ACP-024), item-level granularity was introduced in a dedicated table card below the main KPI row. However, the top Game Sales KPI card (`data-testid="kpi-game-sales"`) still rendered a large aggregate currency amount (`$totalGameSales.toFixed(2)`). Per the Product Owner's selection of **Option B**, this mission updates the top Game Sales card to directly display item pills, counts, and mini distribution bars, eliminating the scalar aggregate headline from the top card while preserving the dedicated breakdown table below.

**Objective:**
Transform the top Game Sales KPI card into a granular item overview card displaying item pills, quantities, subtotals, and a mini distribution bar, verified with ADR-006 Red-Green testing.

---

## 2. In Scope & Out of Scope
- **In Scope:**
  - `packages/client/src/pages/Dashboard.tsx`
  - `packages/client/src/__tests__/pages/Dashboard.test.tsx`
  - `governance/proposals/ACP-025_Dashboard_Top_Card_Item_Granularity.md`
  - `governance/missions/M-117_DASHBOARD_TOP_CARD_ITEM_GRANULARITY.md`
  - `governance/MISSION.md`
  - `governance/SYSTEM_CONTEXT.md`
  - `governance/TASKS.md`
  - `governance/ROADMAP.md`
- **Out of Scope:**
  - Backend API routes, database collections, and shared schemas.
  - Modifying other pages (`GameSales.tsx`, `Reports.tsx`, `Keno.tsx`).
  - Git mutating operations.

---

## 3. Tasks
- [x] Task 117.1: Write failing unit tests in `Dashboard.test.tsx` asserting on top card item pills, quantities, subtotals, and distribution bars (ADR-006 Red phase).
- [x] Task 117.2: Refactor `kpi-game-sales` in `Dashboard.tsx` to display item rows/pills with distribution bar per Option B.
- [x] Task 117.3: Verify tests pass green in `Dashboard.test.tsx` (ADR-006 Green phase).
- [x] Task 117.4: Execute repository fitness battery (`npm run lint`, `npm run knip`, `npm run build`, `npx vitest run`).
- [x] Task 117.5: Execute local Playwright browser probe to capture high-res rendered UI screenshot.
- [x] Task 117.6: Lock Mission M-117 and submit evidence package.

---

## 4. Verification & Lock Evidence
- **Red-Green Proof (ADR-006):** Verified failing test execution prior to implementation (2 tests failed due to missing top-card item elements), followed by clean passing tests (22/22 passed in `Dashboard.test.tsx`).
- **Visual Browser Verification:** Playwright local browser session captured and verified:
  - Multi-item sales: PS5 (3.5 hrs, $175.00), 8-Ball Pool (4 games, $60.00), and segmented color distribution bar (`dashboard_local_rendered.png`).
  - Empty state: Clean `"No sales logged this shift"` badge (`dashboard_local_empty_state.png`).
- **Biome Linter:** Checked 160 files in 267ms; 0 errors, 0 warnings.
- **Knip Code Hygiene:** 0 unused exports, 0 orphaned dependencies.
- **Monorepo Build:** Clean compilation of `@level-up/shared`, `@level-up/client`, and `@level-up/server`.
- **Vitest Suite:** 633/633 tests passing across 39 files (100% green).


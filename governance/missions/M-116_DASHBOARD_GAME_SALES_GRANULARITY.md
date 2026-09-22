# Mission M-116: Dashboard Game Sales Item Granularity

**Status:** Locked  
**Type:** Feature / UX  
**Proposal:** ACP-024  
**Owner:** Execution  
**ADR References:** ADR-001, ADR-004, ADR-006  

---

## 1. Context & Objective
The Dashboard previously showed only an aggregate lump-sum dollar figure (`$totalGameSales.toFixed(2)`) for Game Sales. Store managers and operators lacked visibility into which items/games were sold, the unit breakdown (hours/games), or itemized revenue.

**Objective:**
Implement granular item-level aggregation and presentation for Game Sales on the Dashboard, enrich the KPI card with item metrics, provide an itemized breakdown card on screen, and itemize game sales in the printable Safe Slip (Z-Report).

---

## 2. In Scope & Out of Scope
- **In Scope:**
  - `packages/client/src/pages/Dashboard.tsx`
  - `packages/client/src/__tests__/pages/Dashboard.test.tsx`
  - `governance/proposals/ACP-024_Dashboard_Game_Sales_Item_Granularity.md`
  - `governance/missions/M-116_DASHBOARD_GAME_SALES_GRANULARITY.md`
  - `governance/MISSION.md`
  - `governance/SYSTEM_CONTEXT.md`
  - `governance/TASKS.md`
  - `governance/ROADMAP.md`
  - `docs/reports/M-116_BLAST_RADIUS_AND_CORRECTNESS_REPORT.md`
- **Out of Scope:**
  - Backend API routes, database collections, and shared schemas.
  - Modifying other pages (`GameSales.tsx`, `Reports.tsx`, `Keno.tsx`).
  - Git mutating operations.

---

## 3. Tasks
- [x] Task 116.1: Write failing unit tests in `Dashboard.test.tsx` verifying item aggregation, table rendering, unit formatting, empty state, and safe slip itemization (ADR-006 Red phase).
- [x] Task 116.2: Implement `gameSalesByItem` aggregation in `Dashboard.tsx` with sum conservation and division-by-zero protection.
- [x] Task 116.3: Enhance Game Sales KPI Card with item count subtitle and `data-testid="kpi-game-sales"`.
- [x] Task 116.4: Add responsive "Shift Game Sales by Item" Card with itemized table and empty state.
- [x] Task 116.5: Update printable Safe Slip (Z-Report) with itemized game sales list.
- [x] Task 116.6: Verify tests pass green in `Dashboard.test.tsx` and across the full monorepo suite (`npm run lint`, `npm run knip`, `npm run build`, `npx vitest run`).
- [x] Task 116.7: Lock Mission M-116 and record evidence.

---

## 4. Verification & Lock Evidence
- **Red-Green Proof (ADR-006):** Verified failing test execution prior to implementation (3 tests failed, 19 passed), followed by clean passing tests (22/22 passed in `Dashboard.test.tsx`).
- **Sum Conservation Invariant:** Verified that item subtotals match the total game sales KPI ($235.00 total across $175.00 PS5 and $60.00 8-Ball Pool).
- **Biome Linter:** 0 errors, 0 warnings across 160 files.
- **Knip Code Hygiene:** 0 unused exports.
- **Monorepo Build:** Clean compilation of `@level-up/shared`, `@level-up/client`, and `@level-up/server`.
- **Vitest Suite:** 633/633 tests passing across 39 files (100% green).

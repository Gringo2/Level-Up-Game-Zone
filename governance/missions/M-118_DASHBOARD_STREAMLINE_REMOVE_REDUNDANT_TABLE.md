# Mission M-118: Dashboard Streamline & Redundant Table Removal

**Status:** Locked  
**Type:** Refactor / UX  
**Proposal:** ACP-026  
**Owner:** Execution  
**ADR References:** ADR-001, ADR-004, ADR-006  

---

## 1. Context & Objective
Following the completion of Mission M-117 (Option B), the top Game Sales KPI card now directly renders item pills, quantities, subtotals, and a segmented distribution bar. Having the separate "Shift Game Sales by Item" table card directly below it creates data redundancy and pushes Shift Management controls down the page.

**Objective:**
Streamline the Dashboard by removing the redundant `<Card data-testid="shift-game-sales-items">` from `Dashboard.tsx`, while maintaining the itemized top card and printable Safe Slip itemization, validated by ADR-006 Red-Green testing.

---

## 2. In Scope & Out of Scope
- **In Scope:**
  - `packages/client/src/pages/Dashboard.tsx`
  - `packages/client/src/__tests__/pages/Dashboard.test.tsx`
  - `governance/proposals/ACP-026_Dashboard_Streamline_Remove_Redundant_Table.md`
  - `governance/missions/M-118_DASHBOARD_STREAMLINE_REMOVE_REDUNDANT_TABLE.md`
  - `governance/MISSION.md`
  - `governance/SYSTEM_CONTEXT.md`
  - `governance/TASKS.md`
  - `governance/ROADMAP.md`
- **Out of Scope:**
  - Backend API routes, database collections, and shared schemas.
  - Modifying other client pages.
  - Modifying the printable Safe Slip (itemization remains intact).
  - Git mutating operations.

---

## 3. Tasks
- [x] Task 118.1: Update `Dashboard.test.tsx` to assert table card absence and top card itemization (ADR-006 Red phase).
- [x] Task 118.2: Remove `<Card data-testid="shift-game-sales-items">` from `Dashboard.tsx`.
- [x] Task 118.3: Verify tests pass green in `Dashboard.test.tsx` (ADR-006 Green phase).
- [x] Task 118.4: Execute repository fitness battery (`npm run lint`, `npm run knip`, `npm run build`, `npx vitest run`).
- [x] Task 118.5: Execute local Playwright browser probe to capture high-res rendered UI screenshot of streamlined dashboard.
- [x] Task 118.6: Lock Mission M-118 and submit evidence package.

---

## 4. Verification & Lock Evidence
- **Red-Green Proof (ADR-006):** Verified failing test state prior to table removal (2 tests failed due to presence of `shift-game-sales-items`), followed by clean green state (22/22 passed in `Dashboard.test.tsx`).
- **Visual Browser Verification:** Playwright local browser session captured and verified:
  - Streamlined Dashboard with top card items and direct Shift Management controls without duplicate table (`dashboard_local_streamlined.png`).
- **Biome Linter:** Checked 160 files in 820ms; 0 errors, 0 warnings.
- **Knip Code Hygiene:** 0 unused exports, 0 orphaned dependencies.
- **Monorepo Build:** Clean compilation of `@level-up/shared`, `@level-up/client`, and `@level-up/server`.
- **Vitest Suite:** 633/633 tests passing across 39 files (100% green).


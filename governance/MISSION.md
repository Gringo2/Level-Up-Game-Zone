# CURRENT MISSION

**Type:** Feature / UX Polish  
**Mission:** M-119 Dashboard Game Sales Sum & Item Integration  
**Status:** Locked  
**Proposal:** ACP-027  

## 1. Objective
Restore the authoritative total game sales aggregate sum (`$totalGameSales.toFixed(2)`) to the Dashboard top KPI card (`kpi-game-sales`) in prominent `text-2xl font-bold` typography, displayed directly above the item-level micro-breakdown (quantities, subtotals, and segmented distribution bar) introduced in M-117.

## 2. Context & Root Cause
In M-117 (Option B), the top KPI card's scalar headline (`$totalGameSales.toFixed(2)`) was replaced with item pills and distribution bars. In M-118, the lower table card ("Shift Game Sales by Item") was removed to eliminate redundant table clutter. As a consequence, while operators could see individual item subtotals (e.g., PS5: $175.00, Pool: $60.00), the overall total sum (e.g., `$235.00`) was completely absent from the Dashboard. Mission M-119 integrates BOTH within `kpi-game-sales`.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Dashboard.tsx`
  - `packages/client/src/__tests__/pages/Dashboard.test.tsx`
  - `governance/proposals/ACP-027_Dashboard_Game_Sales_Sum_And_Item_Integration.md`
  - `governance/missions/M-119_DASHBOARD_GAME_SALES_SUM_AND_ITEM_INTEGRATION.md`
  - `governance/MISSION.md`
  - `governance/SYSTEM_CONTEXT.md`
  - `governance/TASKS.md`
  - `governance/ROADMAP.md`
- **Out of Scope:**
  - Backend controllers, schemas, or database collections.
  - Other client pages.
  - Re-adding the redundant lower table card.
  - Git mutating operations.

## 4. Testing Strategy
- Vitest unit tests in `Dashboard.test.tsx` with Red-Green gating (ADR-006).
- Fitness gates: `npm run lint`, `npm run knip`, `npm run build`, `npx vitest run`.
- Local Playwright browser probe capturing rendered screenshot.

## 5. Evidence Payload
- [x] Functional Verification: Top card displays both authoritative total sum and granular item micro-breakdown; empty state displays $0.00 with badge.
- [x] Red-Green Validation: Verified failing test state asserting `$235.00` and `$0.00` in `kpi-game-sales` before implementation (2 failed, 20 passed), followed by 100% green state (22/22 passed in `Dashboard.test.tsx`).
- [x] Visual Browser Verification: Local Playwright browser probe verified rendered UI for active sales (`dashboard_local_streamlined.png`) and empty states (`dashboard_local_empty_state.png`).
- [x] Monorepo Hygiene: Biome lint (0 errors, 0 warnings across 160 files), Knip (0 issues), clean TypeScript build, and full Vitest suite (633/633 passed across 39 files).
- [x] Governance Traceability: ACP-027 approved, M-119 logged in TASKS.md and ROADMAP.md, and locked in MISSION.md.

# Mission M-119: Dashboard Game Sales Sum & Item Integration

**Status:** Locked  
**Type:** Feature / UX Polish  
**Proposal:** ACP-027  
**Owner:** Execution  

## 1. Objective
Restore the authoritative total game sales aggregate sum (`$totalGameSales.toFixed(2)`) to the Dashboard top KPI card (`kpi-game-sales`) in prominent `text-2xl font-bold` typography, displayed directly alongside the item-level micro-breakdown (quantities, subtotals, and segmented distribution bar) introduced in M-117.

## 2. Context & Root Cause
- In M-117 (Option B), the top KPI card's scalar headline (`$totalGameSales.toFixed(2)`) was replaced with item pills and distribution bars.
- In M-118, the lower table card ("Shift Game Sales by Item") was removed to eliminate redundant table clutter and surface Shift Management immediately.
- As a consequence, while operators could see individual item subtotals (e.g., PS5: $175.00, Pool: $60.00), the overall total sum (e.g., `$235.00`) was completely absent from the Dashboard.
- Mission M-119 integrates BOTH:
  1. Authoritative Total Sum headline (`text-2xl font-bold`).
  2. Granular item micro-rows & distribution bar underneath.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Dashboard.tsx`: Render `${totalGameSales.toFixed(2)}` as a `text-2xl font-bold` headline inside `kpi-game-sales`, with item breakdown and distribution bar rendered below. Empty state renders `$0.00` with the "No sales logged this shift" badge.
  - `packages/client/src/__tests__/pages/Dashboard.test.tsx`: Test assertions for both total sum and item breakdown in `kpi-game-sales`.
  - Governance tracking: `MISSION.md`, `SYSTEM_CONTEXT.md`, `TASKS.md`, `ROADMAP.md`, `ACP-027`.
- **Out of Scope:**
  - Server packages (`packages/server`).
  - Shared schemas (`packages/shared`).
  - Re-adding the redundant lower table card.
  - Mutating git commands.

## 4. Red-Green Testing Protocol
1. **Red Phase:** Added assertion `expect(within(kpiCard).getByText("$235.00")).toBeInTheDocument()` to multi-item test and `$0.00` to empty state test in `Dashboard.test.tsx`. Verified failing test state (2 failed, 20 passed).
2. **Green Phase:** Updated `Dashboard.tsx` to render `<div className="text-2xl font-bold">${totalGameSales.toFixed(2)}</div>`. Verified 22/22 unit tests passing.
3. **Fitness Verification:** Full monorepo lint (0 errors, 0 warnings across 160 files), knip (0 issues), clean TypeScript build, and Vitest suite (633/633 passed across 39 files).
4. **Visual Verification:** Local Playwright browser probe captured and verified rendered UI in both active sales and empty states (`dashboard_local_streamlined.png` and `dashboard_local_empty_state.png`).

## 5. Evidence Checklist
- [x] Red-Green Test Verification
- [x] Full Vitest Suite (633/633 tests passing)
- [x] Monorepo Typecheck & Build
- [x] Biome Lint & Knip
- [x] Playwright Local UI Screenshot

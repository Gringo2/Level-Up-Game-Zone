# Architecture Change Proposal (ACP-024): Dashboard Game Sales Item Granularity

**Author:** System Architecture & Execution  
**Status:** Approved  
**Date:** 2026-09-22  
**Target:** `packages/client/src/pages/Dashboard.tsx`  
**Governing ADRs:** ADR-001 (Thin Client Composition Roots), ADR-004 (Observability & Traceability), ADR-006 (Test-Negative Gating)  

---

## 1. Problem Statement
The Dashboard (`packages/client/src/pages/Dashboard.tsx`) serves as the operational command center and safe reconciliation portal for store managers and staff. While `Dashboard.tsx` fetches all active shift sales logs via `GET /api/sales?startDate=${start}`, it currently aggregates all game sales into a single lump-sum figure (`$totalGameSales.toFixed(2)`).

As a result:
1. Store operators and managers cannot view which games/items were sold, how many units/hours were logged, or the revenue distribution across game types during the shift.
2. The physical Safe Slip (Z-Report) printed at shift close only records a high-level `Games Total: $X.XX`, preventing audit verification of individual game sales receipts against cash counted in the drawer.
3. Lack of item-level granularity forces managers to navigate away from the Dashboard to the Reports or Game Sales history pages to inspect basic shift performance.

---

## 2. Proposed Architecture & Solution
Enhance `packages/client/src/pages/Dashboard.tsx` with client-side itemized aggregation and granular display without modifying backend APIs, database collections, or shared contracts:

1. **Itemized Aggregation Engine:**
   Aggregate `gameSales: GameSalesLog[]` in memory by `game_name`:
   - Compute `totalQuantity`, `totalRevenue`, `unitType`, and transaction count for each unique game.
   - Calculate revenue percentage share guarded against zero-division.
   - Sort items descending by total revenue.

2. **Game Sales KPI Card Subtitle:**
   Enrich the top Game Sales KPI card with an item count and game type summary (e.g., `4 items sold across 2 game types`), with explicit `data-testid="kpi-game-sales"`.

3. **Dedicated "Shift Game Sales by Item" Card:**
   Add a responsive, styled card below the KPI cards (above Shift Management) featuring:
   - Item name with `Gamepad2` icon.
   - Unit Type badge/text (`Hour` or `Game`).
   - Formatted quantity sold (e.g., `3.5 hrs`, `4 games`).
   - Subtotal revenue and share percentage.
   - Responsive `overflow-x-auto` table container complying with ACP-016/ACP-017 responsive layout standards.
   - Accessible empty state with contextual icon when no sales exist.

4. **Printable Safe Slip (Z-Report) Granularity:**
   Expand the Safe Slip print template under `Revenue` to itemize games and quantities beneath `Games Total`, providing complete physical audit traceability.

---

## 3. Invariants & Guardrails
- **Thin Client Architecture (ADR-001):** Purely frontend presentation and aggregation; zero backend routes or database schema changes.
- **Sum Conservation Invariant:**
  $$\sum \text{subtotal}_i \equiv \text{totalGameSales}$$
- **Zero Mutating Git Commands (Rule 1):** Implementor does not execute version control mutating commands.
- **Test-Negative Validation (Rule 28 / ADR-006):** Red-Green test discipline applied to `Dashboard.test.tsx`.
- **Fitness Functions (AVP-001):** Biome linter, Knip hygiene, build compilation, and full Vitest suite must remain 100% clean.

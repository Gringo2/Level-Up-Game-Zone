# Blast Radius & Correctness Report: Mission M-116

**Mission:** M-116 (Dashboard Game Sales Item Granularity)  
**Proposal:** ACP-024  
**Date:** 2026-09-22  
**Target:** `packages/client/src/pages/Dashboard.tsx`  
**Author:** AI Implementor / System Architecture  

---

## 1. Problem & Root Cause Analysis (RCA)

### Verified Defect
On the Dashboard (`packages/client/src/pages/Dashboard.tsx`), Game Sales only displays an aggregate sum (`$totalGameSales.toFixed(2)`) inside a high-level KPI card and Safe Slip. There is no breakdown of the items/games sold, the units sold, or the revenue per game.

### Root Cause
While `Dashboard.tsx` already fetches all `GameSalesLog` objects for the active shift via `GET /api/sales?startDate=${start}`, the component reduces the logs strictly into a single numeric total:
```ts
const totalGameSales = gameSales.reduce((sum, log) => sum + log.calculated_total, 0);
```
The raw logs (`gameSales`) are stored in component state but never mapped or grouped for item-level presentation.

---

## 2. Structural Blast Radius Analysis

### Dependency Cruiser Scan Results
A structural audit via `dependency-cruiser` (`npx depcruise packages/client/src/pages/Dashboard.tsx --output-type json`) verifies:

```mermaid
graph TD
    App[packages/client/src/App.tsx] --> Dashboard[packages/client/src/pages/Dashboard.tsx]
    Dashboard --> AuthContext[packages/client/src/contexts/AuthContext.tsx]
    Dashboard --> ShiftContext[packages/client/src/contexts/ShiftContext.tsx]
    Dashboard --> Shared[@level-up/shared]
    Dashboard --> UIComponents[packages/client/src/components/ui/*]
    Dashboard --> DateUtils[packages/client/src/lib/dateUtils.ts]
    Dashboard --> API[packages/client/src/lib/api.ts]
    DashboardTest[packages/client/src/__tests__/pages/Dashboard.test.tsx] -. tests .-> Dashboard
```

### Blast Radius Findings
1. **Zero External Consumers:** `Dashboard.tsx` is a leaf node in the client routing graph. No other page, component, context, or utility imports from `Dashboard.tsx`.
2. **Zero Backend Impact:** The Express backend (`packages/server`), schemas (`packages/shared`), and database routes remain 100% untouched.
3. **Downstream Package Containment:**
   - `packages/shared`: ZERO changes.
   - `packages/server`: ZERO changes.
   - `packages/client`: Confined strictly to `Dashboard.tsx` and its test suite `Dashboard.test.tsx`.
4. **E2E Test Impact:**
   - `tests/e2e/dashboard_flow.spec.ts`: Tests `h2:has-text('Dashboard')` and `Shift Management`. Completely unaffected.
   - `tests/e2e/store_operations_cycle.spec.ts`: Tests shift operations, ConfirmDialog, and float updates. Completely unaffected.
5. **Unit Test Sensitivity Point (Preventative Finding):**
   - In `Dashboard.test.tsx` line 145: `expect(screen.getByText("$10.00")).toBeInTheDocument()`.
   - If `$10.00` appears identically in both the top KPI card and the new items table row, `screen.getByText("$10.00")` would encounter multiple matches and throw.
   - **Resolution:** Provide explicit testids (`data-testid="kpi-game-sales"`, `data-testid="shift-game-sales-items"`) and update test assertions to target specific scopes or use `getAllByText`.

---

## 3. Correctness & Mathematical Aggregation Invariants

The item aggregation logic in `Dashboard.tsx` will adhere to the following strict mathematical invariants:

1. **Sum Equality Invariant:**
   $$\sum_{i \in \text{Items}} \text{subtotal}_i \equiv \text{totalGameSales}$$
   The sum of all item subtotals must exactly match the overall Game Sales total.

2. **Multi-Log Consolidation:**
   Multiple sales logs for the same `game_name` must be grouped into a single row, summing `quantity_sold` and `calculated_total`.

3. **Division-by-Zero Guard:**
   Share percentage:
   ```ts
   const share = totalGameSales > 0 ? (item.totalRevenue / totalGameSales) * 100 : 0;
   ```
   Guarantees zero `NaN%` occurrences when total revenue is zero.

4. **Empty State Determinism:**
   When `gameSales.length === 0`, display an accessible empty state with a Lucide icon rather than an empty table.

5. **Responsive Table Containment:**
   Wrap the items table in `overflow-x-auto` to preserve responsive safety on mobile screens (320px–375px) per ACP-016 / ACP-017 standards.

---

## 4. Verification Battery

| Verification Layer | Target | Success Metric |
|---|---|---|
| **Structural** | `dependency-cruiser` | 0 rule violations, clean boundaries |
| **Unit Testing** | `Dashboard.test.tsx` | All existing + new item granularity tests pass |
| **Monorepo Suite** | `npx vitest run` | 630+ / 630+ tests passing (100% green) |
| **Biome Linter** | `npm run lint` | 0 errors, 0 warnings |
| **Knip Hygiene** | `npm run knip` | 0 unused exports |
| **Compilation** | `npm run build` | Clean build across shared, client, and server |

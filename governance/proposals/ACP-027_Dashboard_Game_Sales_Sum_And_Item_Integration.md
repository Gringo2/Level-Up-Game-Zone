# Proposal: ACP-027 Dashboard Game Sales Sum & Item Integration

## 1. Context and Problem Statement
In Mission M-117, replacing the scalar currency headline with item rows removed the overall total sum (`$totalGameSales.toFixed(2)`) from the top Game Sales KPI card. In Mission M-118, the lower table card (which contained "Shift Total: $235.00") was removed to eliminate duplicate tables. As a result, the total shift game sales sum is currently missing from the Dashboard entirely. Operators can see individual game subtotals, but cannot see the aggregated total game revenue for the shift at a glance.

## 2. Proposed Solution
Integrate both the **authoritative total sum** and the **item-level granularity** directly into `Card data-testid="kpi-game-sales"`:
1. **Prominent Total Sum Headline:**
   - Display `${totalGameSales.toFixed(2)}` in `text-2xl font-bold`, restoring parity with Keno Net, Pending Credits, and Expenses.
2. **Item-Level Micro-Breakdown Underneath:**
   - Retain the compact item rows directly beneath the total:
     - Game name
     - Quantity badge (`X hrs` / `Y games`)
     - Item subtotal (`$XX.XX`)
   - Retain the segmented color distribution bar.
3. **Empty State:**
   - When no sales are logged: display `$0.00` with the `"No sales logged this shift"` badge.
4. **Preserve Shift Management & Safe Slip:**
   - Shift Management remains directly accessible below the KPI cards without duplicate tables.
   - Safe Slip printout retains line-by-line itemization and overall Games Total.

## 3. Alternative Options
- **Re-add Lower Table (Rejected):** Causes the duplicate table clutter that M-118 was specifically created to eliminate.

## 4. Consequences
- **Positive:** Total shift game sales sum is clearly visible alongside Keno Net, Credits, and Expenses.
- **Positive:** Item-level breakdown remains visible without scrolling or separate tables.
- **Positive:** Clean, unified layout that satisfies all operator needs.

## 5. Affected Documents
- `packages/client/src/pages/Dashboard.tsx`
- `packages/client/src/__tests__/pages/Dashboard.test.tsx`
- `governance/MISSION.md`
- `governance/SYSTEM_CONTEXT.md`
- `governance/TASKS.md`
- `governance/ROADMAP.md`
- `governance/missions/M-119_DASHBOARD_GAME_SALES_SUM_AND_ITEM_INTEGRATION.md`

## 6. Action Items
1. Formalize Mission M-119 under ACP-027.
2. Update `Dashboard.test.tsx` to assert both the total sum ($235.00) AND the item elements inside `kpi-game-sales` (Red phase).
3. Update `Dashboard.tsx` to render the total sum headline above the item micro-rows.
4. Verify tests pass green in `Dashboard.test.tsx` and full monorepo suite.
5. Capture updated local browser screenshot with Playwright probe.
6. Lock M-119 and submit evidence package.

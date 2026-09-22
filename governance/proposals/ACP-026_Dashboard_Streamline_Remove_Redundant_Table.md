# Proposal: ACP-026 Dashboard Streamlining & Redundant Table Removal

## 1. Context and Problem Statement
In Mission M-116, a dedicated table card ("Shift Game Sales by Item") was added below the KPI row to display game sales granularity. In Mission M-117, the top Game Sales KPI card was transformed (Option B) to directly display item pills, quantities, subtotals, and a segmented distribution bar. 

Now that the top KPI card directly shows the item-level breakdown at a glance, having the large separate "Shift Game Sales by Item" table card directly below it is redundant. It duplicates the exact same data on the same screen, pushing the Shift Management controls further down.

## 2. Proposed Solution
1. **Remove Duplicate Table Card:** Remove `<Card data-testid="shift-game-sales-items">` from `packages/client/src/pages/Dashboard.tsx`.
2. **Preserve Top Card Granularity:** Retain the top Game Sales KPI card's item micro-breakdown, quantity pills, subtotal currency, and segmented distribution bar.
3. **Preserve Safe Slip Itemization:** Retain line-by-line itemized game sales on the printable Safe Slip (Z-Report) for paper store reconciliation.
4. **Update Unit Tests:** Update `packages/client/src/__tests__/pages/Dashboard.test.tsx` to assert that the redundant table card is absent and all item granularity is validated through the top card and Safe Slip.

## 3. Alternative Options
- **Retain Both Cards (Rejected by PO):** Leaves duplicate information on the dashboard and clutters the UI.

## 4. Consequences
- **Positive:** Clean, compact dashboard without data duplication.
- **Positive:** Shift Management controls (Start/Close shift, float, variance) are immediately visible without excess scrolling.
- **Positive:** Physical auditability via Safe Slip is preserved.

## 5. Affected Documents
- `packages/client/src/pages/Dashboard.tsx`
- `packages/client/src/__tests__/pages/Dashboard.test.tsx`
- `governance/MISSION.md`
- `governance/SYSTEM_CONTEXT.md`
- `governance/TASKS.md`
- `governance/ROADMAP.md`
- `governance/missions/M-118_DASHBOARD_STREAMLINE_REMOVE_REDUNDANT_TABLE.md`

## 6. Action Items
1. Formalize Mission M-118 under ACP-026.
2. Update `Dashboard.test.tsx` to verify the table card removal (Red phase).
3. Remove `<Card data-testid="shift-game-sales-items">` from `Dashboard.tsx`.
4. Verify tests pass green in `Dashboard.test.tsx` and full monorepo suite.
5. Capture updated local browser screenshot with Playwright probe.
6. Lock M-118 and submit evidence package.

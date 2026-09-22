# Proposal: ACP-025 Dashboard Top Card Game Sales Item Granularity

## 1. Context and Problem Statement
In Mission M-116 (ACP-024), item-level granularity was added to the Dashboard via a dedicated responsive table card ("Shift Game Sales by Item") positioned below the primary KPI cards. However, the top **Game Sales** KPI card (`data-testid="kpi-game-sales"`) retained a large scalar currency total (`$totalGameSales.toFixed(2)`) as its primary headline. The Product Owner observed that the top card remains an aggregate and selected **Option B**: replace the aggregate currency headline in the top card with direct item pills/bars and quantities.

## 2. Proposed Solution
Modify `Card data-testid="kpi-game-sales"` in `packages/client/src/pages/Dashboard.tsx`:
1. **Remove Scalar Aggregate Headline:** Remove the primary `text-2xl font-bold $totalGameSales.toFixed(2)` display from the top card.
2. **Embed Item Micro-Breakdown:** Render compact itemized rows/pills directly inside `CardContent`:
   - For each game: Game name, total quantity with unit label (`X hrs` / `Y games`), and item subtotal (`$XX.XX`).
   - Include a segmented progress/distribution bar visualizing revenue share per game.
   - If more than 3 games exist in a shift, provide a compact summary indicator (`+N more`) directing to the full table below.
3. **Empty State:** When no sales are logged during the shift, render a clean badge (`No sales logged for this shift`).
4. **Preserve Dedicated Table Card:** Retain the "Shift Game Sales by Item" card below for comprehensive shift auditing and safe slip consistency.
5. **Update Unit Tests:** Update `Dashboard.test.tsx` to assert item presence directly inside `kpi-game-sales`.

## 3. Alternative Options
- **Option A (Rejected by PO):** Retain aggregate currency header with subtitle summary in top card.
- **Option C (Rejected):** Eliminate the top card entirely and rely exclusively on the table below.

## 4. Consequences
- **Positive:** Immediate item-level visibility in the primary KPI dashboard row without scrolling.
- **Positive:** Shift operators instantly see which stations are generating revenue directly in the top row.
- **Trade-off:** Top Game Sales card format differs visually from the single-number format of Keno/Credits/Expenses cards, but aligns with operator requirements.

## 5. Affected Documents
- `packages/client/src/pages/Dashboard.tsx`
- `packages/client/src/__tests__/pages/Dashboard.test.tsx`
- `governance/MISSION.md`
- `governance/SYSTEM_CONTEXT.md`
- `governance/TASKS.md`
- `governance/ROADMAP.md`
- `governance/missions/M-117_DASHBOARD_TOP_CARD_ITEM_GRANULARITY.md`

## 6. Action Items
1. Formalize Mission M-117 under ACP-025.
2. Update `Dashboard.tsx` top card layout per Option B specification.
3. Update `Dashboard.test.tsx` assertions and verify with Vitest.
4. Execute fitness battery: Biome lint, Knip, TypeScript build, and Playwright local probe.
5. Lock M-117 and submit evidence package.

# Proposal: ACP-031 Entry Pages Yesterday Date Filter Presets

## 1. Context and Problem Statement
Following the addition of the "Yesterday" date preset to Historical Reports (`/reports` under M-122 / ACP-030), a usability gap was identified on the three primary operational entry pages:
- Game Sales (`/games`)
- Keno (`/keno`)
- Sports Betting (`/betting`)

Currently, each of these three pages provides manual `From` and `To` date pickers and a single `Today` reset shortcut. In physical store operations, checking the previous day's shift transactions, verifying tickets, and resolving customer inquiries from yesterday are high-frequency daily workflows. Operators are required to manually enter yesterday's date in both pickers and click `Apply`.

## 2. Proposed Solution
1. **Shared Client Date Utility (`packages/client/src/lib/dateUtils.ts`)**:
   - Export pure helper `getShopYesterdayString(date: Date = new Date()): string` utilizing `subDays(getShopDate(date), 1)`.
   - Centralizes timezone math to `Africa/Addis_Ababa` (+03:00) without duplicating date logic.
2. **Page Updates (`GameSales.tsx`, `Keno.tsx`, `SportsBetting.tsx`)**:
   - Add a `Yesterday` button directly beside the `Today` button.
   - Update `CardDescription` to indicate `"logged yesterday"` when filtered to yesterday.
   - Update empty state messages to indicate `"logged yesterday"` when no records exist for yesterday.
3. **Red-Green Unit Testing (ADR-006)**:
   - Add unit tests verifying the existence and click behavior of the `Yesterday` button in `GameSales.test.tsx`, `Keno.test.tsx`, and `SportsBetting.test.tsx`.
   - Add unit test for `getShopYesterdayString` in `dateUtils.test.ts`.

## 3. Alternative Options
- **Leave manual selection (Rejected)**: Causes continuous friction for daily cash and ticket audits on operational entry pages.
- **Full multi-preset bar like Reports (Rejected)**: Excessive on compact entry page layouts where `Today` and `Yesterday` represent 95%+ of quick-filter needs.

## 4. Consequences
- **Positive**: One-click verification of yesterday's game sales, keno tickets, and betting slips.
- **Positive**: Strict blast radius containment (0 server, database, or shared type changes).
- **Positive**: Full responsiveness preserved across mobile (320px, 375px), tablet, and desktop viewports.

## 5. Affected Documents
- `packages/client/src/lib/dateUtils.ts`
- `packages/client/src/__tests__/lib/dateUtils.test.ts`
- `packages/client/src/pages/GameSales.tsx`
- `packages/client/src/__tests__/pages/GameSales.test.tsx`
- `packages/client/src/pages/Keno.tsx`
- `packages/client/src/__tests__/pages/Keno.test.tsx`
- `packages/client/src/pages/SportsBetting.tsx`
- `packages/client/src/__tests__/pages/SportsBetting.test.tsx`
- `governance/MISSION.md`
- `governance/SYSTEM_CONTEXT.md`
- `governance/TASKS.md`
- `governance/ROADMAP.md`
- `docs/reports/M-123_Blast_Radius_Report.md`

## 6. Action Items
1. Formalize Mission M-123 under ACP-031.
2. Implement and test `getShopYesterdayString` in `dateUtils.ts`.
3. Write Red tests in `GameSales.test.tsx`, `Keno.test.tsx`, and `SportsBetting.test.tsx`.
4. Implement `Yesterday` button and status labels in all three pages (Green).
5. Verify unit tests, Playwright E2E suite, Biome lint, Knip, and build.
6. Lock M-123.

# Mission M-123: Entry Pages Yesterday Date Filter Presets

**Status:** Locked  
**Type:** Feature / UX Polish  
**Proposal:** ACP-031  
**Owner:** Execution  

## 1. Objective
Add a dedicated "Yesterday" date preset button alongside the existing "Today" button across Game Sales, Keno, and Sports Betting history toolbars, enabling one-click reconciliation and inspection of the previous day's operational entries.

## 2. Context & Root Cause
- Following Mission M-122 (Historical Reports "Yesterday" preset), retail store operators reviewing daily logs on entry pages (`/games`, `/keno`, and `/betting`) had to manually enter yesterday's date in both `From` and `To` date pickers.
- While each entry page provided a quick `Today` button, none offered a `Yesterday` shortcut.
- Mission M-123 introduces a centralized `getShopYesterdayString` helper in `dateUtils.ts` and adds the `Yesterday` button across all three pages, updating range state, card descriptions, and empty state messaging.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/lib/dateUtils.ts`: Export pure helper `getShopYesterdayString(date: Date = new Date()): string`.
  - `packages/client/src/__tests__/lib/dateUtils.test.ts`: Add unit test verifying `getShopYesterdayString`.
  - `packages/client/src/pages/GameSales.tsx`: Add `Yesterday` button, yesterday card description, and empty state handling.
  - `packages/client/src/pages/Keno.tsx`: Add `Yesterday` button, yesterday card description, and empty state handling.
  - `packages/client/src/pages/SportsBetting.tsx`: Add `Yesterday` button, yesterday card description, and empty state handling.
  - `packages/client/src/__tests__/pages/GameSales.test.tsx`: Red-Green unit tests.
  - `packages/client/src/__tests__/pages/Keno.test.tsx`: Red-Green unit tests.
  - `packages/client/src/__tests__/pages/SportsBetting.test.tsx`: Red-Green unit tests.
  - Governance tracking: `MISSION.md`, `SYSTEM_CONTEXT.md`, `TASKS.md`, `ROADMAP.md`, `ACP-031`.
- **Out of Scope:**
  - Backend schema or Express controller modifications.
  - Other client pages (`Expenses.tsx`, `SalaryReport.tsx` tracked separately).
  - Mutating git commands.

## 4. Execution & Verification Gates
- [x] Red-Green Test Verification: Verify failing assertions in `GameSales.test.tsx`, `Keno.test.tsx`, and `SportsBetting.test.tsx` prior to page implementation, followed by 100% green pass.
- [x] Timezone Parity: Calculated via `getShopYesterdayString` matching `Africa/Addis_Ababa` (+03:00).
- [x] Monorepo Fitness Gates: Biome lint (0 errors, 0 warnings), Knip (0 issues), clean TypeScript build across shared, client, and server.

## 5. Evidence Payload
- [x] Vitest Unit Tests: 695/695 tests passing green across 42 test files.
- [x] Playwright E2E Suite: 26/26 tests passing green.
- [x] Monorepo Build: Clean build across all workspaces.
- [x] Biome Lint & Knip: Clean.
- [x] Traceability: Authorized by ACP-031 and formal approval.


# Mission M-122: Reports Yesterday Date Filter Preset

**Status:** Locked  
**Type:** Feature / UX Polish  
**Proposal:** ACP-030  
**Owner:** Execution  

## 1. Objective
Add a dedicated "Yesterday" date preset button to the Historical Reports page (`/reports`), enabling one-click reconciliation and performance analysis of the previous day's operations.

## 2. Context & Root Cause
- In physical retail shop operations, checking yesterday's shift, sales, and drawer reconciliation figures first thing in the morning is one of the most frequent operational tasks.
- Previously, the Historical Reports page provided presets for `Today`, `This Week`, `This Month`, `Last 7 Days`, and `Last 30 Days`, but lacked a direct `Yesterday` button.
- Operators had to manually select yesterday's date in both `From` and `To` date pickers and click `Apply`.
- Mission M-122 introduces a `Yesterday` button placed immediately after `Today`, which sets and applies yesterday's shop date with a single click.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Reports.tsx`: Added `yesterdayStr` derived from `shopToday` via `subDays(shopToday, 1)` and registered `{ label: "Yesterday", from: yesterdayStr, to: yesterdayStr }` in the `presets` array.
  - `packages/client/src/__tests__/pages/Reports.test.tsx`: Added Red-Green unit test asserting the presence and click behavior of the `Yesterday` button.
  - Governance ledgers (`MISSION.md`, `SYSTEM_CONTEXT.md`, `TASKS.md`, `ROADMAP.md`).
- **Out of Scope:**
  - Backend schema or controller modifications.
  - Other client pages.
  - Mutating git commands.

## 4. Execution & Verification Gates
- [x] Red-Green Test Verification: Verified failing test assertion in `Reports.test.tsx` prior to implementation, followed by 100% green pass (13/13 tests passing).
- [x] Timezone Parity: Calculated via `toShopDateStr(subDays(shopToday, 1))` matching `SHOP_TIMEZONE`.
- [x] Monorepo Hygiene: Biome lint (0 errors, 0 warnings across 168 files), Knip (0 issues), clean TypeScript build across shared, client, and server.

## 5. Evidence Payload
- [x] Vitest Unit Tests: 13/13 tests passing in `Reports.test.tsx`.
- [x] Monorepo Build: Shared, client, and server build without errors.
- [x] Biome Lint & Knip: 0 errors, 0 warnings across 168 files; Knip clean.
- [x] Traceability: Traceable to ACP-030.

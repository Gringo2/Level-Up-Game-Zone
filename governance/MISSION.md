# CURRENT MISSION

**Type:** Feature / UX  
**Mission:** M-116 Dashboard Game Sales Item Granularity  
**Status:** Locked  
**Proposal:** ACP-024  

## 1. Objective
Implement item-level granularity for Game Sales on the Dashboard (`Dashboard.tsx`):
1. Compute itemized sales aggregation (`gameSalesByItem`) grouping shift sales by game name, unit type, quantity sold, and total revenue.
2. Enhance the Game Sales KPI summary card with item metrics and scoped testid.
3. Introduce a dedicated responsive "Shift Game Sales by Item" breakdown card with formatted table and empty state.
4. Itemize game sales in the printable Safe Slip (Z-Report) for physical store auditability.
5. Provide comprehensive unit tests in `Dashboard.test.tsx` following ADR-006 Red-Green validation.

## 2. Context
User reported: "dashboard granurality issues game sales doesnt show items". The existing Dashboard aggregated all shift game sales into a single numeric total, depriving operators of item-level visibility. This mission provides client-side itemized granularity with zero backend mutations.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Dashboard.tsx`
  - `packages/client/src/__tests__/pages/Dashboard.test.tsx`
  - `governance/proposals/ACP-024_Dashboard_Game_Sales_Item_Granularity.md`
  - `governance/missions/M-116_DASHBOARD_GAME_SALES_GRANULARITY.md`
  - `governance/MISSION.md`
  - `governance/SYSTEM_CONTEXT.md`
  - `governance/TASKS.md`
  - `governance/ROADMAP.md`
  - `docs/reports/M-116_BLAST_RADIUS_AND_CORRECTNESS_REPORT.md`
- **Out of Scope:**
  - Backend controllers, schemas, or database collections.
  - Other client pages.
  - Git mutating operations.

## 4. Testing Strategy
- Vitest unit tests in `Dashboard.test.tsx` with Red-Green gating (ADR-006).
- Fitness gates: `npm run lint`, `npm run knip`, `npm run build`, `npx vitest run`.

## 5. Evidence Payload
- [x] Functional Verification: Itemized breakdown table, KPI subtitle, and Safe Slip render accurate data with sum conservation.
- [x] Red-Green Validation: Negative test execution recorded prior to implementation (3 failed, 19 passed; post-implementation 22 passed).
- [x] Monorepo Hygiene: Biome lint (0 errors, 0 warnings across 160 files), Knip (0 issues), clean TypeScript build, and Vitest suite (633/633 tests passing across 39 files).
- [x] Governance Traceability: ACP-024 approved, M-116 logged in TASKS.md and ROADMAP.md, and locked in MISSION.md.

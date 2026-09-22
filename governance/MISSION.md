# CURRENT MISSION

**Type:** Feature / UX  
**Mission:** M-117 Dashboard Top Card Game Sales Item Granularity  
**Status:** Locked  
**Proposal:** ACP-025  

## 1. Objective
Refactor the top Game Sales KPI card (`kpi-game-sales`) on the Dashboard (`Dashboard.tsx`) to display direct item-level granularity per Product Owner approved Option B:
1. Replace scalar aggregate currency headline with compact itemized micro-rows and quantity badges.
2. Render segmented distribution bar visualizing proportional revenue share per game.
3. Provide clean empty state badge when zero shift game sales exist.
4. Retain the dedicated "Shift Game Sales by Item" breakdown table card below for auditability.
5. Provide comprehensive unit tests in `Dashboard.test.tsx` following ADR-006 Red-Green validation.

## 2. Context
In Mission M-116 (ACP-024), item-level granularity was provided in a table card below the KPI row, but the top card retained a scalar aggregate dollar amount. The Product Owner approved Option B to make the top card itself itemized, eliminating the aggregate-only headline from the top row.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Dashboard.tsx`
  - `packages/client/src/__tests__/pages/Dashboard.test.tsx`
  - `governance/proposals/ACP-025_Dashboard_Top_Card_Item_Granularity.md`
  - `governance/missions/M-117_DASHBOARD_TOP_CARD_ITEM_GRANULARITY.md`
  - `governance/MISSION.md`
  - `governance/SYSTEM_CONTEXT.md`
  - `governance/TASKS.md`
  - `governance/ROADMAP.md`
- **Out of Scope:**
  - Backend controllers, schemas, or database collections.
  - Other client pages.
  - Git mutating operations.

## 4. Testing Strategy
- Vitest unit tests in `Dashboard.test.tsx` with Red-Green gating (ADR-006).
- Fitness gates: `npm run lint`, `npm run knip`, `npm run build`, `npx vitest run`.
- Local Playwright browser probe capturing rendered screenshot.

## 5. Evidence Payload
- [x] Functional Verification: Top Game Sales KPI card renders item micro-rows, quantity pills, subtotal amounts, and segmented distribution bar.
- [x] Red-Green Validation: Verified failing test state prior to implementation (2 failed, 20 passed), followed by 100% green state (22 passed in `Dashboard.test.tsx`).
- [x] Visual Browser Verification: Local Playwright browser probe verified both active multi-item rendering and clean empty-state badge.
- [x] Monorepo Hygiene: Biome lint (0 errors, 0 warnings across 160 files), Knip (0 issues), clean TypeScript build, and Vitest suite (633/633 tests passing across 39 files).
- [x] Governance Traceability: ACP-025 approved, M-117 logged in TASKS.md and ROADMAP.md, and locked in MISSION.md.

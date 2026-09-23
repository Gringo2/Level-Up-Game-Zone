# Mission M-120: Sports Betting Income Stream Integration

**Status:** Locked  
**Type:** Feature / Financial Domain  
**Proposal:** ACP-028  
**Architecture Record:** ADR-009  
**Owner:** Execution  

## 1. Objective
Implement full-stack integration for the Sports Betting revenue stream at Level-Up Game Zone. Provide secure, role-gated logging of net sports betting profit/loss, integrate sports betting income directly into physical cash register drawer balancing (`expected_cash_calculated`), introduce a dedicated management page (`/betting`), surface sports betting in the 5th Dashboard KPI card and Safe Slip (Z-Report), and aggregate sports betting in Financial Reports and Revenue Mix.

## 2. Context & Root Cause
- Level-Up Game Zone operates an independent Sports Betting terminal that generates daily net revenue.
- Previously, the system lacked a sports betting data model, API endpoints, drawer formula representation, or user interface.
- Operators had no system mechanism to log net betting returns or balance them against physical cash in the shift drawer.
- Per ACP-028 and ADR-009, Sports Betting follows the simple net income model (analogous to Keno), restricted to Managers and Admins, with full audit trail logging and register drawer integration.

## 3. Scope & Boundaries
- **In Scope:**
  - `@level-up/shared`: `COLLECTIONS.SPORTS_BETTING_LOGS`, `SportsBettingLog` interface.
  - `packages/server`:
    - Schemas: `CreateSportsBettingSchema`, `UpdateSportsBettingSchema` with JSON-NaN hole guards.
    - Controller & Routes: `sportsBettingController.ts` & `routes/sportsBetting.ts` (CRUD, verify, manager/admin role gate, atomic `audit_logs` logging).
    - Shift Balancing: `shiftsController.ts` updated with `expectedCash = opening_float + gameSales + kenoNet + bettingNet - expenses - pendingCredits`.
  - `packages/client`:
    - Pure validator: `parseNetAmountInput` in `inputUtils.ts` (reused across Keno and SportsBetting).
    - Navigation & Routing: `Trophy` icon nav item in `Layout.tsx`, `/betting` route in `App.tsx` gated to Manager/Admin.
    - Dedicated Page: `pages/SportsBetting.tsx` with date-range filters, cursor pagination, day grouping, period summary, inline edit/delete/verify modals, and `visibilitychange` refetch.
    - Dashboard: `pages/Dashboard.tsx` 5th KPI card (`kpi-sports-betting`), 5-column responsive grid, drawer variance calculation, and Safe Slip printout.
    - Reports: `pages/Reports.tsx` parallel fetch, `totalSportsBettingNet` aggregation, Revenue Mix entry, Total Revenue calculation parity, and ledger section.
- **Out of Scope:**
  - Automated terminal hardware integration or scrapers.
  - Individual bet ticket tracking (handled by external sports betting software).
  - Mutating git commands.

## 4. Red-Green Testing Protocol
1. **Red Phase:** Wrote test suites T-1 through T-7 with failing assertions for pure input parsing, controller operations, shift expected cash calculation, route guards, UI rendering, 5th KPI card, and financial report aggregation.
2. **Green Phase:** Implemented shared schemas, server controllers/routes/shift calculation, client navigation/pages/dashboard/reports. Verified all 42 test files and 690 unit tests pass 100% green.
3. **Fitness Verification:** Biome lint (0 errors, 0 warnings across 167 files), Knip (0 issues), clean TypeScript build across shared/client/server, and full Vitest suite passing with coverage exceeding thresholds (Lines: 94.32%, Funcs: 96.21%).

## 5. Evidence Checklist
- [x] Functional Verification: Full-stack CRUD, drawer balancing, dashboard KPI card, reports ledger, and safe slip verified.
- [x] Red-Green Test Verification: Test suites T-1 to T-7 verified (690/690 vitest tests passing).
- [x] Coverage Thresholds: Met all thresholds across client and server.
- [x] Monorepo Typecheck & Build: Shared, client, and server build cleanly.
- [x] Biome Lint & Knip: 0 errors, 0 warnings across 167 files; Knip clean.
- [x] Traceability & ADR Compliance: Traceable to ACP-028 and ADR-009.

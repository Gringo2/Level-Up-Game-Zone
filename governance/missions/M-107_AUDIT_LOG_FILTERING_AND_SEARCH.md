# Mission M-107: Activity Audit Log Multi-Filter & Search

**Type:** Feature / Observability  
**Status:** Locked  
**Proposal Reference:** ACP-015  

## 1. Objective
Enhance `packages/client/src/pages/AuditLogs.tsx` with robust, client-side filtering and full-text search:
1. Action selector (`ALL`, `CREATE`, `UPDATE`, `DELETE`).
2. Collection / Table selector (`ALL`, `shifts`, `game_sales`, `keno_tickets`, `expenses`, `credits`, `employees`, `users`, `game_rates`, `expense_categories`).
3. Full-text search input covering operator UID, reason for change, table affected, and JSON payload values.
4. Active results count banner and "Clear Filters" button.
5. Filter empty state banner when no logs match the active query.

## 2. Context
Administrators frequently need to audit specific operations (e.g. shift closures, salary adjustments, or role promotions). Multi-filtering and quick search make activity logs actionable and transparent without requiring server-side Firestore composite indexes.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/AuditLogs.tsx`
  - `packages/client/src/__tests__/pages/AuditLogs.test.tsx`
  - `governance/proposals/ACP-015_Audit_Log_Filtering_And_Quick_Search.md`
  - `governance/missions/M-107_AUDIT_LOG_FILTERING_AND_SEARCH.md`
  - `governance/MISSION.md`
- **Out of Scope:**
  - Server controllers or API changes (strictly Thin Client presentation).
  - Firestore schema or index mutations.

## 4. Execution Gates
- [x] Functional Verification: AuditLogs unit tests passing with filter/search assertions (12/12 passed).
- [x] Test-Negative Validation: ADR-006 / Rule 28 Red failure captured prior to green completion (5 failing tests on initial probe).
- [x] Full Battery Health: Vitest (615/615 tests across 39 files) and Playwright (17/17 tests across 7 files) green.
- [x] Monorepo Hygiene: Biome (159 files checked, 0 errors, 0 warnings), Knip (0 issues), build clean across shared, client, and server.
- [x] Governance Synchronization: Mission locked upon completion.

## Evidence Payload
- [x] Functional Verification: AuditLogs unit tests passing (12/12 tests green).
- [x] Test-Negative Validation: Red failure captured prior to green completion.
- [x] Full Battery Health: All unit (615) and E2E (17) tests passing.
- [x] Monorepo Hygiene: Biome, Knip, and Lock Guard clean.
- [x] Governance Synchronization: Mission locked upon completion.

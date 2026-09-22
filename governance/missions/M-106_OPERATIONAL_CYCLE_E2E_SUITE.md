# Mission M-106: Multi-Page Operational Cycle E2E Test Suite

**Type:** Test / Quality Assurance  
**Status:** Locked  
**Proposal Reference:** ACP-014  

## 1. Objective
Build an end-to-end browser test suite (`tests/e2e/store_operations_cycle.spec.ts`) that executes and verifies the complete store operational day across multiple pages:
1. Manager starts shift with opening float on Dashboard (`/`).
2. Manager records game session sales on Game Sales (`/games`).
3. Manager records employee store credit / cash advances on Credits (`/credits`).
4. Manager closes register shift with blind cash count, shortage discrepancy reason, and `ConfirmDialog` confirmation on Dashboard (`/`).
5. Admin reviews shift reconciliation and drawer integrity metrics on Reports (`/reports`).
6. Admin verifies the immutable transaction audit entry on Activity Log (`/audit-logs`).

## 2. Architectural Boundaries
- Conforms to ADR-001 (Thin Client Composition Roots).
- Conforms to ADR-006 / AGENTS.md Rule 28 (Test-Negative Validation):
  Must prove an empirical Red failure state before achieving Green pass.
- Conforms to TD-055 (E2E Hermeticity): Hermetic route mocking, zero external network or database leakage.

## 3. Scope
- **In Scope:**
  - `tests/e2e/store_operations_cycle.spec.ts`
  - `governance/proposals/ACP-014_Multi_Page_Operational_Cycle_E2E_Suite.md`
  - `governance/missions/M-106_OPERATIONAL_CYCLE_E2E_SUITE.md`
  - `governance/MISSION.md`
- **Out of Scope:**
  - Modifying existing application components or server controllers (pure verification mission).

## 4. Evidence Payload Requirements
- [x] Test-Negative Validation: Red failure captured prior to green completion (failing probe assertion captured in task-3272).
- [x] Green Suite Verification: New test passing in Chromium browser (`store_operations_cycle.spec.ts` passed in 5.6s).
- [x] Full Battery Health: 17/17 Playwright E2E tests passing, 610/610 Vitest tests passing.
- [x] Monorepo Hygiene: Biome (159 files checked, 0 errors, 0 warnings), Knip (0 issues), build clean across shared, client, and server.
- [x] Governance Synchronization: Mission locked upon completion.

# Active Mission: M-105 Cash Reconciliation & Shift Drawer Analytics in Reports

## 1. Mission Context
**Status:** Locked  
**Type:** Feature / Financial Analytics  
**Phase:** Phase 8 — Shift Operational Integrity & Identity Bridge  
**Primary Owner:** AI Implementor  
**Authorising ACP:** ACP-013  
**Governing ADRs:** ADR-001 (Thin Client Composition Roots), ADR-003 (Reusability & Anti-Reinvention), ADR-006 (Test-Negative Validation Protocol), ADR-008 (Non-Blocking Shifts & Backdated Entry)  

## 2. Objective
Enhance `Reports.tsx` with comprehensive shift drawer reconciliation and cash discrepancy reporting per ACP-013:
1. Provide high-level Drawer Integrity KPIs: Net Drawer Variance, Balanced Shifts count, Shortage vs Overage count, and Total Cash Processed.
2. Provide a detailed, responsive, and print-ready "Shift Cash Reconciliation & Drawer Audit" ledger table showing each shift's operational window, cashier name, status badge, opening float, expected cash, actual counted cash, variance, and shortage explanation.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Reports.tsx` (KPIs & Shift Cash Reconciliation table).
  - `packages/client/src/__tests__/pages/Reports.test.tsx` (unit test suite expansion & Red-Green verification).
  - `governance/missions/M-105_SHIFT_RECONCILIATION_REPORTING.md`.
  - `governance/MISSION.md`.
- **Out of Scope:**
  - Server controllers or API endpoints (reusing existing `GET /api/shifts?startDate=...&endDate=...`).
  - Shared package schema mutations.
  - Modifying other pages or layout files.

## 4. Execution Gates
- [x] Functional Verification: Reports unit tests passing (10/10 tests).
- [x] Test-Negative Validation: ADR-006 / AGENTS.md Rule 28 Red-Green proven empirically.
- [x] Full Battery Verification: 610/610 Vitest tests passing across 39 files; 16/16 Playwright E2E tests passing.
- [x] Architectural Verification (AVP-001): Zero backend code drift; strictly client-presentation layer.
- [x] User Approval / Lock.

## Evidence Payload
- Functional Verification: `Reports.tsx` renders Drawer Integrity KPIs (Net Drawer Variance, Balanced Shifts count, Total Cash Processed) and Shift Cash Reconciliation & Drawer Audit table with float, expected, actual, and variance.
- Test-Negative Validation: Red state captured prior to implementation (2 failed tests in `task-3084`), transitioning to 10/10 Green state after component update.
- Battery & Hygiene: Full Vitest suite green at 610/610 passed; Playwright battery green at 16/16 passed; `biome lint .` clean (0 errors, 0 warnings); `knip` clean (0 issues); `npm run build` completed cleanly.
- Architectural Verification: Thin client composition intact per ADR-001; reuses existing `GET /api/shifts` without backend mutations.

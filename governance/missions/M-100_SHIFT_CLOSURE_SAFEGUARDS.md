# Active Mission: M-100 Shift Closure Safeguards & Manual Start Recovery

## 1. Mission Context
**Status:** Locked  
**Type:** Feature / UX Resilience  
**Phase:** Locked  
**Primary Owner:** AI Implementor  
**Authorising ACP:** ACP-012 (approved 2026-09-22)  
**Related ACP:** ACP-011  

## 2. Objective
Enhance shift management resilience on the Dashboard by:
1. Adding a `ConfirmDialog` confirmation step before shift closure to prevent irreversible accidental closures.
2. Adding a manual "Start Shift" card/form on `Dashboard.tsx` when `!activeShift` to eliminate the dead-end state and allow manual recovery or consecutive shift execution.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Dashboard.tsx` (ConfirmDialog on close + Start Shift card on null shift).
  - `packages/client/src/__tests__/pages/Dashboard.test.tsx` (tests for close confirmation & manual start flows).
- **Out of Scope:**
  - Backend schema or route modifications (reusing existing `POST /api/shifts`).
  - Employee linkage (ACP-010).
  - ShiftContext modifications (refetchShift already functions as required).

## 4. Execution Gates
- [x] Functional Verification (All 18 unit tests in Dashboard.test.tsx pass).
- [x] Architectural Verification (AVP-001: zero contract/boundary leaks; thin client composition intact).
- [x] Dependency Graph Clean (Knip reports 0 issues).
- [x] Biome Formatter and Linter Clean.
- [x] User Approval.

## Evidence Payload
- Functional Verification: 18/18 Dashboard tests, 9/9 ShiftContext tests, 33/33 server shift tests passing (60 total).
- Architectural Verification (AVP-001): Only `Dashboard.tsx` modified; reuses existing `ConfirmDialog` and `POST /api/shifts`.
- Dependency Graph Clean: Knip checked workspace, 0 issues.
- ADR Compliance: Reusability and Anti-Reinvention Protocol (§25) followed by consuming existing `ConfirmDialog`.

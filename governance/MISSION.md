# CURRENT MISSION

**Type:** Feature / UX Resilience  
**Mission:** M-100 Shift Closure Safeguards & Manual Start Recovery  
**Status:** Locked  

## 1. Objective
Enhance shift management resilience on the Dashboard by:
1. Adding a `ConfirmDialog` confirmation step before shift closure to prevent irreversible accidental closures.
2. Adding a manual "Start Shift" card/form on `Dashboard.tsx` when `!activeShift` to eliminate the dead-end state and allow manual recovery or consecutive shift execution.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Dashboard.tsx`
  - `packages/client/src/__tests__/pages/Dashboard.test.tsx`
- **Out of Scope:**
  - Backend schema or route modifications.
  - Employee linkage (ACP-010).
  - ShiftContext modifications.

## 4. Design Notes
- Uses repository-standard `ConfirmDialog` from `components/ui/confirm-dialog.tsx`.
- Calls existing `POST /api/shifts` (`StartShiftSchema`) for manual start.
- Sourced managerName from authenticated user session (`user.displayName || user.email || "Unknown"`).

## 5. Testing Strategy
- Dashboard unit tests: `Dashboard.test.tsx` (18 tests passing)
- ShiftContext tests: `ShiftContext.test.tsx` (9 tests passing)
- Server regression: `shiftsController.test.ts` (33 tests passing)
- Gates: `tsc` ✓, `vitest` ✓, `knip` ✓, `biome` ✓.

## 6. Evidence Payload
- [x] Functional Verification: 60 shift-related unit & integration tests passing.
- [x] Architectural Verification (AVP-001): Zero boundary leaks; pure UI additive enhancement.
- [x] Dependency Graph Clean: Knip reports 0 unused exports/dependencies.
- [x] ADR Compliance: ADR-001 & ADR-003 compliant.
- [x] User Approval: Option 1 explicitly approved by Product Owner (2026-09-22).

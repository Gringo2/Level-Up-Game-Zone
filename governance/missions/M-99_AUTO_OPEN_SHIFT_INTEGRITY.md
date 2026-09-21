# Active Mission: M-99 Auto-Open Shift Integrity

## 1. Mission Context
**Status:** Active
**Type:** Feature / Debt
**Phase:** Implementation
**Primary Owner:** AI Implementor
**Authorising ACP:** ACP-011 (Option B, approved 2026-09-22)
**Related Debt:** TD-030, TD-040

## 2. Objective
Resolve five integrity defects (D1–D5) in the auto-open shift logic by promoting it from a
side-effect inside `getMissedData` to a dedicated `POST /api/shifts/auto-open` endpoint.
Remove the silent side-effect. The client ShiftContext stops silently creating shifts on load.

## 3. Scope & Boundaries
- **In Scope:**
  - Remove auto-open block from `getMissedData` controller.
  - Add `autoOpenShift` controller with D1–D5 fixes applied.
  - Add `AutoOpenShiftSchema` Zod schema.
  - Register `POST /api/shifts/auto-open` route.
  - Update `ShiftContext.tsx` to remove `newlyOpenedShift` consumption.
  - Update server and client tests to reflect the changes.
- **Out of Scope:**
  - Manual `startShift` / `closeShift` flow.
  - Employee linkage (ACP-010).
  - `autoLabelStaleShifts` logic.
  - Float prompt UI (OQ-1 — deferred to follow-on mission).

## 4. Execution Gates
- [ ] Functional Verification
- [ ] Architectural Verification (AVP-001)
- [ ] Dependency Graph Clean
- [ ] ADR Compliance
- [ ] User Approval

## Evidence Payload
- [ ] Functional Verification:
- [ ] Architectural Verification (AVP-001):
- [ ] Dependency Graph Clean:
- [ ] ADR Compliance:

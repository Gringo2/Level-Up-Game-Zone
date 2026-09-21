# CURRENT MISSION

**Type:** Feature / Debt
**Mission:** M-99 Auto-Open Shift Integrity
**Status:** Locked

## 1. Objective
Resolve five integrity defects (D1–D5, per ACP-011) in the auto-open shift logic by promoting it
from a side-effect inside `getMissedData` to a dedicated `POST /api/shifts/auto-open` endpoint.
The `getMissedData` read endpoint is now read-only.

## 3. Scope & Boundaries
- **In Scope:**
  - Remove auto-open block from `getMissedData`.
  - Add `autoOpenShift` controller with all five defect fixes.
  - Add `AutoOpenShiftSchema` Zod schema.
  - Register `POST /api/shifts/auto-open` route.
  - Update `ShiftContext.tsx` to remove `newlyOpenedShift` consumption.
  - Update server and client tests.
- **Out of Scope:**
  - Manual `startShift` / `closeShift` flow.
  - Employee linkage (ACP-010).
  - Float prompt UI (OQ-1 — deferred).

## 4. Design Notes
- D1: `opening_float` sourced from caller body, not hardcoded.
- D2: `manager_name` sourced from caller body, not user email.
- D3: Read endpoint stays read-only; writes moved to dedicated POST endpoint.
- D4: Same-business-day guard queries recent CLOSED shifts and compares local date.
- D5: Transaction return-value pattern; closure variable no longer used.
- Blast radius: 6 source files + 1 governance file. No shared interface changes.

## 5. Testing Strategy
- Server: 33 tests (shiftsController.test.ts) — all passing.
- Client: 6 tests (ShiftContext.test.tsx) — all passing.
- Gates: tsc ✓, vitest ✓, knip ✓, biome ✓.

## 6. Evidence Payload
- [x] Functional Verification: 39 tests passing; getMissedData no longer calls runTransaction.
- [x] Architectural Verification (AVP-001): Zero boundary violations; no package contracts touched.
- [x] Dependency Graph Clean: Knip reports zero issues.
- [x] ADR Compliance: No ADR change required; extends existing shift API pattern.
- [x] User Approval: Option B approved explicitly by Product Owner (2026-09-22).

# Active Mission: Mission 29 — Auto-Open Daily Shifts

## 1. Mission Context
**Status:** Locked
**Type:** Feature
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
Automatically open a new shift for the current day (with a default float of $0) in two scenarios:
1. When a user requests shift data and there are no existing gaps, missed shifts, or active open shifts for today.
2. Immediately after a user resolves the final blocking gap/missed shift for the timeline.

Additionally, provide a new backend endpoint and frontend mechanism for managers to manually update the "Opening Float" of an active shift, since the shift now starts automatically at $0.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/server/src/controllers/shiftsController.ts` (Auto-open logic & float update logic)
  - `packages/server/src/routes/shifts.ts` (New PUT route)
  - `packages/client/src/contexts/ShiftContext.tsx` (Remove manual start block)
  - `packages/client/src/pages/Dashboard.tsx` (Add Update Float UI)
- **Out of Scope:**
  - Changes to other financial calculation paradigms.
  - Automated closing of shifts (this is strictly auto-open).

## Evidence Payload
- [x] Functional Verification: Shift auto-opens; Float can be updated dynamically.
- [x] Architectural Verification (AVP-001): Passed full 6-gate lock suite.
- [x] Dependency Graph Clean: Zero circular dependencies or forbidden imports.
- [x] ADR Compliance: Conforms to existing frontend component paradigms and Express backend composition root.

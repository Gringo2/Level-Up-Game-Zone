# Mission 30: Edge Case Concurrency & Validation Fixes

**Status:** Locked
**Phase:** Execution

## Objective
Resolve the critical race conditions and validation loopholes discovered in the M-29 auto-open and float update logic.

## 3. Scope & Boundaries
- **In Scope:**
  - Fixing `getMissedData` auto-open race condition using Firestore transactions.
  - Fixing `updateFloat` race condition using Firestore transactions.
  - Adding Zod schema validation to `PUT /api/shifts/:id/float`.
- **Out of Scope:**
  - Any UI modifications on the frontend.
  - Changes to other endpoints outside of shift auto-open and float updates.

## Architecture Constraints
- All backend routes must validate input using Zod via `validateBody`.
- Concurrency logic involving reads dependent on writes must occur strictly within `db.runTransaction()`.

## Evidence Payload
- [x] Functional Verification: Concurrent calls do not create multiple shifts or overwrite closed shifts.
- [x] Architectural Verification (AVP-001): Passed full 6-gate lock suite.
- [x] Dependency Graph Clean: Zero circular dependencies or forbidden imports.
- [x] ADR Compliance: Conforms to existing frontend component paradigms and Express backend composition root.

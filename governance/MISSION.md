# CURRENT MISSION

**Mission ID:** M-31
**Status:** Locked
**Title:** Test Suite Compliance Refactoring

## Description
Refactor the backend testing architecture to comply with the Test-Negative Validation Protocol (Rule 28). Eliminate vacuous tests, replace isolated controller tests with true Express/Zod integration tests via `supertest`, and prove negative failure paths alongside true golden paths.

## References
- ACP-001 (Monorepo Architecture)
- ADR-001 (Express Backend as single authoritative composition root)
- AGENTS.md (Rule 28: Test-Negative Validation Protocol)
- STABILITY_GAP_ANALYSIS.md

## 3. Scope & Boundaries
- **In Scope:** 
  - Install `supertest`.
  - Refactor Express `app` instantiation to decouple from listener (`app.ts` & `index.ts`).
  - Create global unified Firebase mock for integration tests (`setupTests.ts`).
  - Rewrite `shiftsController.test.ts` to test Express routes (Golden Path & Negative).
  - Rewrite `usersController.test.ts` to test Express routes (Golden Path & Negative).
  - Remove vacuous `baseline.test.ts` from `packages/shared`.
- **Out of Scope:** 
  - Modifying client package tests.
  - Modifying internal logic of controllers (purely testing architecture changes).
  - Adding tests for routes that currently lack tests entirely (focusing on existing controller tests).

## Evidence Payload
- `app.ts` created to properly export Express instance for `supertest`.
- `setupTests.ts` created, injecting unified Firebase `db` and `auth` middleware mocks.
- `shiftsController.test.ts` fully rebuilt, asserting golden paths (including auto-opening a missed shift) and 400 validations.
- `usersController.test.ts` fully rebuilt, asserting full auth flow and admin-only role blocks.
- **Fitness verification passed:** `vitest` suite executes perfectly with 100% pass rate and increased structural controller coverage (approaching 60%).
- [x] Architectural Verification (AVP-001): Passed full 6-gate lock suite.
- [x] Dependency Graph Clean: Zero circular dependencies or forbidden imports.
- [x] ADR Compliance: Conforms to existing frontend component paradigms and Express backend composition root.

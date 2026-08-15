# CURRENT MISSION

**Mission:** M-36 Backend Coverage Completion — App Composition Root & Schemas
**Status:** Locked (2026-08-15)

## 1. Objective
Close the remaining statement coverage gap in the Express composition root and its validation schemas by bringing `app.ts` (was 83.3% stmts) and `schemas/index.ts` (was 91.2%) to 100% statement coverage with Rule-28 compliant integration tests, exercising the health endpoint, the global Express error handler, and the previously-uncovered zod errorMap callbacks.

## 2. Evidence Payload
- `npx vitest run` -> 181 passing tests across 13 suites (up from 176).
- Target file statement coverage (measured, `coverage/coverage-final.json`, 2026-08-15): app.ts 83.3% -> 100.0% stmts (0 zero-stmt lines remaining); schemas/index.ts 91.2% -> 100.0% stmts (0 zero-stmt lines remaining). Overall stmts 91.9% -> 93.8%.
- Added 5 integration tests across 3 suites (app 0 -> 2, gameRates 13 -> 14, users 29 -> 31) covering:
  - `GET /api/health` -> 200 `{ status: "ok", message: "Server is running properly!" }`.
  - Global Express error handler via malformed JSON body (express.json() SyntaxError) -> 500 "Internal server error".
  - `PUT /api/rates/:id` with invalid unit_type -> 400 "Unit type must be 'Hour' or 'Game'" (UpdateGameRateSchema errorMap, line 132).
  - `POST /api/users/invite` with invalid role -> 400 "Role must be 'admin', 'manager', or 'staff'" (InviteUserSchema errorMap).
  - `POST /api/users` with invalid role -> 400 "Role must be 'admin', 'manager', or 'staff'" (CreateUserSchema errorMap).
- Rule 28 red-green proven: temporarily changing the global error handler status to 200 made the malformed-JSON test fail (red), then restored to 500 (green).
- Architecture Verify Protocol `AVP-001` gates re-run clean: lint exit 0 (48 warnings, consistent with prior baselines), server `tsc` exit 0, client build exit 0, `knip` exit 0, `depcruise` 0 violations (39 modules), `vitest` 181/181.

## 3. Scope & Boundaries
- **In Scope:**
  - `app.test.ts` (new, 2 tests: health endpoint + global error handler)
  - `gameRatesController.test.ts` (expanded from 10 to 11 tests)
  - `usersController.test.ts` (expanded from 24 to 26 tests)
- **Out of Scope:** Frontend React tests; any production-code changes (none made; coverage achieved entirely via tests; `git diff` confirms app.ts and schemas/index.ts pristine after red-green revert).

## 4. Referenced Architecture
- ADR-005: Global testing mock patterns.
- ADR-006: Test-Negative Gating (Red-Green proof).
- AGENTS.md (Rule 28: Test-Negative Validation Protocol)
- [x] Architectural Verification (AVP-001): Passed full gate suite.
- [x] Dependency Graph Clean: Zero circular dependencies or forbidden imports.
- [x] ADR Compliance: Conforms to existing Express backend composition root and keno test paradigms.

# CURRENT MISSION

**Mission:** M-35 Backend Coverage Completion — Final 4 Controllers (Sales, Credits, GameRates, Employees)
**Status:** Locked (2026-08-14)

## 1. Objective
Close the final statement/branch coverage gap across Express controllers by bringing `salesController` (was 76.8% stmts / 72.7% branch), `creditsController` (was 75.6% / 75.0%), `gameRatesController` (was 75.0% / 76.9%), and `employeesController` (was 73.3% / 80.0%) above the 90% statement threshold with Rule-28 compliant integration tests (Golden, Negative, Not-Found, DB-Crash, partial-field updates).

## 2. Evidence Payload
- `npx vitest run` -> 176 passing tests across 12 suites (up from 140).
- Controller statement/branch coverage (measured, `coverage/coverage-final.json`, 2026-08-14):
  - In scope (this mission): sales 76.8% -> 91.3% stmts / 72.7% -> 100% branch; credits 75.6% -> 92.3% / 75.0% -> 100%; gameRates 75.0% -> 92.9% / 76.9% -> 100%; employees 73.3% -> 93.3% / 80.0% -> 100%.
  - All 9 Express controllers now >= 90.9% statement coverage and all at 100% function coverage. Overall stmts 91.9%, overall branch 90.0%.
- Added 23 integration tests across 4 suites (sales 7 -> 17, credits 7 -> 14, gameRates 5 -> 10, employees 5 -> 10) covering:
  - DB-crash 500 fallback for list/create/update(/delete) on every operation of every controller.
  - Not-Found contract (500) for update/delete on non-existent documents.
  - Partial-field update branches (status resolution in credits; name/position/hired_date/break_day/isActive in employees; game_name/unit_type/isActive in gameRates).
  - 401 unauthorized without bearer token on each HTTP verb.
- Rule 28 red-green proven: disabling the `updateSale` not-found guard made its test fail (red, "returns 500 when updating a non-existent sale"), then restored (green).
- Architecture Verify Protocol `AVP-001` gates re-run clean: lint exit 0 (48 warnings, consistent with prior baselines), server `tsc` exit 0, client build exit 0, `knip` exit 0, `depcruise` 0 violations (38 modules), `vitest` 176/176.

## 3. Scope & Boundaries
- **In Scope:**
  - `salesController.test.ts` (expanded from 7 to 17 tests)
  - `creditsController.test.ts` (expanded from 7 to 14 tests)
  - `gameRatesController.test.ts` (expanded from 5 to 10 tests)
  - `employeesController.test.ts` (expanded from 5 to 10 tests)
- **Out of Scope:** Frontend React tests; any production-code changes (none made; coverage achieved entirely via tests; `git diff` confirms all controllers pristine after red-green revert).

## 4. Referenced Architecture
- ADR-005: Global testing mock patterns.
- AGENTS.md (Rule 28: Test-Negative Validation Protocol)
- [x] Architectural Verification (AVP-001): Passed full gate suite.
- [x] Dependency Graph Clean: Zero circular dependencies or forbidden imports.
- [x] ADR Compliance: Conforms to existing Express backend composition root and keno test paradigms.

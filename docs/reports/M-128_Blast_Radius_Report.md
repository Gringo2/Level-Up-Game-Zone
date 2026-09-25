# Structural Blast Radius Report: Mission M-128
**Mission:** M-128 Game Sales Unit Decoupling & Elimination of Hardcoded "Hour"  
**Proposal:** ACP-036  
**Date:** September 25, 2026  
**Auditor:** System Implementor  

---

## 1. Executive Summary
Mission M-128 decouples the hardcoded "Hour" unit assumption from game sales, rates, and dashboard presentations, replacing it with "Game" as the standard default and supporting "Game" and "Match" across the system:
1. Replaces `UNIT_TYPES.HOUR` with `UNIT_TYPES.GAME` as the primary default unit across `@level-up/shared`.
2. Seeds `DEFAULT_GAME_RATES` with `unit_type: "Game"` for both `PS4` and `Pool`.
3. Adds `Match` to supported unit types in server rate schemas while preserving non-breaking backward compatibility for legacy `Hour` records.
4. Updates `Admin.tsx` to default to `Game` and provide `Per Game` and `Per Match` options.
5. Updates `Dashboard.tsx` to eliminate hardcoded `|| "Hour"` fallbacks and replaces binary `hour` vs `game` logic with dynamic pluralization ("1 game" / "2 games", "1 match" / "2 matches").

---

## 2. File & Component Dependency Analysis

### 2.1 Direct Mutations
| Target File | Scope of Change | Downstream Dependencies |
| :--- | :--- | :--- |
| `packages/shared/src/constants.ts` | Update `UNIT_TYPES` (`GAME: "Game"`, `MATCH: "Match"`) and `DEFAULT_GAME_RATES`. | Server controllers, Client pages, Validation schemas |
| `packages/shared/src/index.ts` | Update `GameRate` type definition to include `"Game" \| "Match" \| "Hour"`. | Shared package consumers |
| `packages/server/src/schemas/index.ts` | Update `createGameRateSchema` and `updateGameRateSchema` to accept `Match`. | `packages/server/src/controllers/gameRatesController.ts` |
| `packages/client/src/pages/Admin.tsx` | Default `unitType` to `Game`; options `Per Game` and `Per Match`. | `packages/client/src/App.tsx` |
| `packages/client/src/pages/Dashboard.tsx` | Fallback to `Game`; dynamic unit pluralization for thermal Safe Slip and Top Card. | `packages/client/src/App.tsx` |
| `packages/client/src/pages/GameSales.tsx` | Default seeds update to `Game`. | `packages/client/src/App.tsx` |

### 2.2 Boundary Invariants Check
- **Zero-Trust Thin Client:** Preserved. No direct DB access from client.
- **Express Backend API:** Preserved. Schema expands to permit `Match` in addition to `Game` and legacy `Hour`.
- **Pure Shared Baseline:** Preserved. Pure TypeScript constants and type definitions.
- **Fitness Functions:** All test suites, Biome checks, Knip checks, and build steps remain passing.

---

## 3. Test Coverage & Negative Gating (Rule 28)
- `packages/client/src/__tests__/pages/Dashboard.test.tsx`:
  - Verified Safe Slip renders `(2 games)` instead of `(2 hrs)`.
  - Verified fallback unit is `Game` rather than `Hour`.
  - Verified `(2 matches)` is rendered for `Match` units.
- `packages/client/src/__tests__/pages/Admin.test.tsx`:
  - Verified new rate form defaults to `Game` and provides `Per Match` and `Per Game` options.
- `packages/server/src/__tests__/validation.test.ts`:
  - Verified validation schema accepts `Game`, `Match`, and `Hour`.
  - Verified rejection error message: `"Unit type must be 'Game', 'Match', or 'Hour'"`.
- `packages/server/src/__tests__/gameRatesController.test.ts`:
  - Verified rate creation with `unit_type: "Match"` returns 201 Created.

---

## 4. Empirical Verification & Evidence Chain
- **Build:** Clean build across `@level-up/shared`, `@level-up/client`, and `@level-up/server`.
- **Biome Linter:** 169 files checked in 278ms, 0 errors, 0 warnings.
- **Knip Dead Code Scanner:** 0 issues found.
- **Vitest Unit Battery:** 42 test suites, 713/713 tests passed.
- **Vitest Coverage Gating:** 93.45% statements, 78.36% branch, 96.55% functions, 94.73% lines (all directory-level thresholds satisfied).
- **Playwright E2E Battery:** 26/26 browser integration tests passed across mobile, tablet, and desktop viewports.
- **Dependency Cruiser:** Exit code 0, zero architecture boundary violations.

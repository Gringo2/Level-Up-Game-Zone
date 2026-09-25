# Proposal: ACP-036 Game Sales Unit Decoupling & Elimination of Hardcoded "Hour"
**Status:** Implemented

## 1. Context and Problem Statement
In Level-Up Game Zone, games are not sold on hours. However, legacy initial prototypes and default seeds hardcoded `"Hour"` across multiple layers of the system:
1. **Shared Defaults:** In `packages/shared/src/constants.ts`, `DEFAULT_GAME_RATES` seeded `PS4` with `unit_type: UNIT_TYPES.HOUR`.
2. **Dashboard Fallbacks & Slip Print:** In `Dashboard.tsx:151`, logs with missing or legacy units fell back to `"Hour"`. Lines 344–351 and 401–408 hardcoded `"Hour"` to format as `"hr"` / `"hrs"`, printing `PS5 (2 hrs): $100.00` on safe slip thermal receipts.
3. **Admin Settings Defaults:** In `Admin.tsx:41, 509`, rate creation defaulted to `Per Hour` (`UNIT_TYPES.HOUR`).
4. **Domain Realignment:** The Product Owner has clarified: games are sold per game or per match, not per hour. Standardizing on `"Game"` as the default unit (with `"Match"` supported for competitive/multiplayer games) aligns the operational software with actual physical store business reality.

## 2. Proposed Solution
1. **Shared Constants & Types (`@level-up/shared`):**
   - Update `UNIT_TYPES` to define standard units:
     ```typescript
     export const UNIT_TYPES = {
       GAME: "Game",
       MATCH: "Match",
     } as const;
     ```
   - Update `DEFAULT_GAME_RATES` so both `PS4` and `Pool` seed with `UNIT_TYPES.GAME`.
   - Maintain backward compatibility in type definitions by allowing `"Game" | "Match" | "Hour"`.
2. **Server Validation Schema (`packages/server`):**
   - In `packages/server/src/schemas/index.ts`, update `createGameRateSchema` and `updateGameRateSchema` to accept `[UNIT_TYPES.GAME, UNIT_TYPES.MATCH, "Hour"]` (preserving non-breaking compatibility for legacy records while supporting Match).
3. **Client Presentation & Admin Management (`packages/client`):**
   - In `Admin.tsx`:
     - Default new rate unit select to `UNIT_TYPES.GAME`.
     - Offer options: `Per Game` (`UNIT_TYPES.GAME`) and `Per Match` (`UNIT_TYPES.MATCH`).
   - In `Dashboard.tsx`:
     - Replace fallback `log.unit_type || "Hour"` with `log.unit_type || "Game"`.
     - Replace binary `hour` vs `game` formatting in Safe Slip (lines 344–351) and Top Card (lines 401–408) with a dynamic formatter:
       - `"match"` $\rightarrow$ `1 match` / `N matches`
       - `"game"` $\rightarrow$ `1 game` / `N games`
       - Fallback $\rightarrow$ `1 {unit}` / `N {unit}s`
   - In `GameSales.tsx`:
     - Update default seed fallbacks.
4. **Red-Green Test Verification:**
   - Add tests verifying `Dashboard.tsx` safe slip and KPI card render `"games"` / `"matches"` instead of `"hrs"`.
   - Add tests verifying `Admin.tsx` defaults to `Game` and supports `Match`.

## 3. Alternative Options
- **Fully Arbitrary Text Input for Units:** Allowing cashiers to type arbitrary strings (e.g. "coin", "round", "turn"). Rejected because standardized rate options ("Game" and "Match") prevent typos and ensure clean grouping across reports and slips.
- **Omit Units Completely:** Only displaying plain quantities (e.g. `PS5 (2): $100.00`). Rejected because differentiating "2 games" of PS5 vs "1 match" of FIFA is operationally important for the venue.

## 4. Consequences
- **Positive:**
  - Complete elimination of incorrect "Hour" / "hrs" labels from thermal safe slips, receipts, and dashboard cards.
  - Matches the physical reality of the store (games sold per game or per match).
  - Clean backward compatibility for any existing logs in Firestore.
- **Negative / Risks:**
  - Minor test adjustments in test files that previously mocked `unit_type: "Hour"`.

## 5. Affected Documents
- `packages/shared/src/constants.ts`
- `packages/shared/src/index.ts`
- `packages/server/src/schemas/index.ts`
- `packages/client/src/pages/Admin.tsx`
- `packages/client/src/pages/Dashboard.tsx`
- `packages/client/src/pages/GameSales.tsx`
- `packages/client/src/__tests__/pages/Admin.test.tsx`
- `packages/client/src/__tests__/pages/Dashboard.test.tsx`
- `packages/client/src/__tests__/pages/GameSales.test.tsx`
- `packages/server/src/__tests__/gameRatesController.test.ts`
- `packages/server/src/__tests__/validation.test.ts`

## 6. Action Items
1. Formulate Mission M-128 and Blast Radius Report.
2. Submit ACP-036 for User Review and Approval.
3. Write Red tests demonstrating failure when asserting "Game" / "Match" default behavior.
4. Implement shared constants, server schema, and client display logic.
5. Verify 100% green test suite across monorepo and lock M-128.

# Active Mission: M-128 Game Sales Unit Decoupling & Elimination of Hardcoded "Hour"

## 1. Mission Context
**Status:** Active  
**Type:** Feature / Domain Alignment  
**Phase:** Implementation  
**Primary Owner:** AI Implementor  
**Governing Proposal:** [ACP-036](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/governance/proposals/ACP-036_Game_Sales_Unit_Decoupling.md)  
**Evidence Source:** User Clarification & Senior UI/UX Audit

## 2. Objective
Realign the game billing unit model with physical store operations by:
1. Replacing "Hour" with "Game" as the standard default unit across shared seeds, admin creation, and fallback logic.
2. Supporting both "Game" and "Match" in rate definition and sales logging.
3. Updating Dashboard KPI item breakdown and thermal Safe Slip printouts to dynamically format pluralized unit labels ("1 game" / "2 games", "1 match" / "2 matches") rather than hardcoding "hrs".
4. Preserving backward compatibility for existing records in Firestore.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/shared/src/constants.ts`: Update `UNIT_TYPES` and `DEFAULT_GAME_RATES`.
  - `packages/shared/src/index.ts`: Update `GameRate` type definition.
  - `packages/server/src/schemas/index.ts`: Update validation schemas for rate creation/update.
  - `packages/client/src/pages/Admin.tsx`: Update rate form defaults and unit selection options to Game and Match.
  - `packages/client/src/pages/Dashboard.tsx`: Replace "Hour" fallback with "Game"; replace binary hour formatting with dynamic unit pluralization.
  - `packages/client/src/pages/GameSales.tsx`: Update default seed references.
  - Unit & E2E tests: Red-Green verification of updated unit behavior.
- **Out of Scope:**
  - Modifying financial balance or cash reconciliation math.
  - Removing existing Firestore fields or dropping collections.

## 4. Execution Gates
- [x] Functional Verification
- [x] Architectural Verification (AVP-001)
- [x] Dependency Graph Clean
- [x] ADR Compliance
- [x] User Approval

## Evidence Payload
- [x] Functional Verification: 713/713 unit tests passed across 42 suites; 26/26 Playwright E2E browser scenarios passed.
- [x] Architectural Verification (AVP-001): Zero TypeScript errors, Biome clean (0 errors, 0 warnings), Knip clean (0 issues), zero boundary violations.
- [x] Dependency Graph Clean: Dependency cruiser verification exit code 0 across monorepo packages.
- [x] ADR Compliance: Pure shared baseline preserved; Zero-Trust Thin Client preserved; server-authoritative schemas preserved.
- [x] Traceability: Authorized by ACP-036, documented in `M-128_Blast_Radius_Report.md`.

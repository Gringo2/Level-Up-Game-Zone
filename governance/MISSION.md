# CURRENT MISSION

**Type:** Testing / Quality Assurance  
**Mission:** M-104 Phase 8 Playwright E2E Suite Expansion  
**Status:** Locked  

## 1. Objective
Expand the Playwright end-to-end browser test suite to verify Phase 8 operational safeguards and identity bridge features:
1. Manual shift start recovery workflow and shift closure `ConfirmDialog` modal lifecycle on `Dashboard.tsx` (ACP-012).
2. Store employee & system user account linkage on `Admin.tsx`, `UserManagement.tsx`, and `EmployeeRoster.tsx`: collision prevention in account selectors and linked identity badges (ACP-010).

## 3. Scope & Boundaries
- **In Scope:**
  - `tests/e2e/shift_cycle.spec.ts` (expanded coverage for manual start & closure confirm modal).
  - `tests/e2e/identity_linkage.spec.ts` (new E2E suite for account linkage dropdowns and badges).
  - `governance/missions/M-104_PHASE_8_E2E_SUITE_EXPANSION.md`.
  - `governance/MISSION.md`.
- **Out of Scope:**
  - Production application source code in `packages/client`, `packages/server`, `packages/shared`.
  - Vitest unit tests (already green at 608/608).

## 4. Design Notes
- Utilize Playwright route interception (`page.route`) and client `window.__E2E_USER__` injection for fast, hermetic execution without requiring live Firebase writes.
- Satisfy ADR-006 / Rule 28 Red-Green negative testing protocol.

## 5. Testing Strategy
- Playwright E2E test runs: `npx playwright test`.
- Vitest regression check: `npx vitest run`.
- Hygiene checks: `npm run lint`, `npm run build`, `npm run knip`.

## 6. Evidence Payload
- [x] Functional Verification: 16/16 Playwright tests passing across 6 test files (100% green).
- [x] Test-Negative Validation (ADR-006 / AGENTS.md Rule 28): Red-Green captured on shift start & linkage probes.
- [x] Vitest Baseline Preserved: 608/608 vitest unit/integration tests passing across 39 files.
- [x] Dependency Graph Clean: `knip` reports 0 issues.
- [x] Code Hygiene & Types: `biome lint .` 0 errors, 0 warnings; `npm run build` succeeds cleanly.
- [x] Architectural Verification (AVP-001): Zero production code drift.

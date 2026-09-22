# Active Mission: M-104 Phase 8 Playwright E2E Suite Expansion

## 1. Mission Context
**Status:** Locked  
**Type:** Testing / Quality Assurance  
**Phase:** Phase 8 — Shift Operational Integrity & Identity Bridge  
**Primary Owner:** AI Implementor  
**Authorising ACPs:** ACP-010, ACP-012  
**Governing ADRs:** ADR-006 (Test-Negative Validation Protocol), ADR-008 (Non-Blocking Shifts)  

## 2. Objective
Expand the Playwright end-to-end browser test suite to rigorously test Phase 8 features:
1. Shift operational safeguards on `Dashboard.tsx`: manual shift start recovery workflow and shift closure `ConfirmDialog` modal lifecycle (ACP-012).
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

## 4. Execution Gates
- [x] Functional Verification (Playwright tests pass with 0 failures: 16/16 passing across 6 test files).
- [x] Test-Negative Validation (ADR-006 / AGENTS.md Rule 28 Red-Green proven on shift start & linkage probes).
- [x] Full Battery Verification (Vitest 608/608 passing across 39 files, Knip clean, Biome clean, tsc clean).
- [x] Architectural Verification (AVP-001: zero production code drift).
- [x] User Approval / Lock.

## Evidence Payload
- Functional Verification: Playwright battery expanded from 11 tests in 5 files to 16 tests in 6 files, 100% green:
  - `shift_cycle.spec.ts`: Unauthenticated redirect, manual shift start recovery form with opening float submission, and shift close `ConfirmDialog` modal cancellation vs confirmation lifecycle.
  - `identity_linkage.spec.ts`: Add Employee account dropdown collision disabling in `Admin.tsx`, linked employee badges in `UserManagement.tsx`, and linked system account badges + edit form in `EmployeeRoster.tsx`.
- Test-Negative Validation: Red failure captured empirically via injected probes and strict mode checks before transitioning to clean Green state.
- Preserved Baselines: 608/608 Vitest unit/integration tests passing across 39 test files; `npm run build` succeeds cleanly; `biome lint .` 0 errors, 0 warnings; `knip` 0 issues.
- Architectural Verification: Zero production mutations; pure testing & governance expansion adhering to Thin Client and Authoritative Express principles.

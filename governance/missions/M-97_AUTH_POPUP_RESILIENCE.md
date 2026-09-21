# Active Mission: M-97 Auth Pop-up Resilience & Fallback Resolution

## 1. Mission Context
**Status:** Active  
**Type:** Debt  
**Phase:** Implementation  
**Primary Owner:** AI Implementor  

## 2. Objective
Eliminate transient `auth/popup-blocked` errors and broken redirect states by:
1. Disabling the Google sign-in button during in-flight sign-in requests in `Login.tsx` to prevent rapid double-click races.
2. Handling `getRedirectResult(auth)` proactively upon initialization in `AuthContext.tsx` to ensure redirect-based sign-in resolves credentials and surfaces redirect errors.

## 3. Scope & Boundaries
- **In Scope:**
  - Add `isSubmitting` state and button disabled state in `packages/client/src/pages/Login.tsx`.
  - Add `getRedirectResult(auth)` handling with error toast in `packages/client/src/contexts/AuthContext.tsx`.
  - Add unit test coverage in `packages/client/src/__tests__/pages/Login.test.tsx` and `packages/client/src/__tests__/contexts/AuthContext.test.tsx`.
  - Follow Red-Green testing requirements (Rule 28).
- **Out of Scope:**
  - Changes to server routes, schemas, database, or permissions.
  - Redesign of the Login page UI beyond button submitting state.
  - Upstream Firebase SDK changes.

## 4. Execution Gates
- [x] Functional Verification
- [x] Architectural Verification (AVP-001)
- [x] Dependency Graph Clean
- [x] ADR Compliance
- [x] User Approval

## Evidence Payload
- [x] Functional Verification: Unit tests passed (39 files, 577/577 tests), Red-Green gating verified on Login submitting state and AuthContext redirect failure, Playwright E2E passed (11/11 tests).
- [x] Architectural Verification (AVP-001): Thin Client and Express backend boundaries preserved; no server schemas or API contracts altered.
- [x] Dependency Graph Clean: No new external packages or cross-package dependencies added; blast radius contained to client auth layer (see `docs/reports/M-97_Blast_Radius_Report.md`).
- [x] ADR Compliance: Aligned with ADR-001 (Thin Client composition) and ACP-009.
- [x] User Approval: Plan approved by Product Owner on 2026-09-22.


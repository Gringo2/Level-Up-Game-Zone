# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## [Unreleased]

### Changed (2026-09-02 — M-87)
- Completed deployment infrastructure, Firebase credential hardening, pagination, admin-gated employee deletion, structured logging, and RBAC verification.
- Upgraded `firebase-admin` to 14 and pinned the `uuid` override to 11.1.1; current audit leaves 3 moderate `qs` advisories in the Express 4 dependency range.

### Added (Mission 33 — Backend Coverage Completion: Shifts & Users)
- Expanded `shiftsController.test.ts` 8 -> 29 tests and `usersController.test.ts` 6 -> 29 tests (Rule-28 golden + negative + not-found + DB-crash paths).
- Coverage: shifts 55.6% -> 93.1%, users 38.2% -> 91.7% statement coverage (both 100% funcs); all 9 Express controllers now >= 62.9%.
- Closed TD-003/004/005 (DEBT.md); suite now 125 tests across 12 files.
- Rule 28 red-green proven on the `updateFloat` non-OPEN guard.

### Changed (2026-08-14 — AFR-002 M-32 re-verification)
- Reopened and re-locked M-32 with corrected evidence: keno controller coverage 46.1% -> 92.1%; all in-scope controllers >= 62.9%.
- Added 16 integration tests (deleteKeno, verifyKeno, staff-create, not-found contract, DB-crash fallback, unauthorized) proving Rule 28 red-green on the `verifyKeno` guard.
- Corrected MISSION.md evidence payload (the original locked payload overstated coverage).
- Synced SYSTEM_CONTEXT/ROADMAP/TASKS to missions 10-32; confirmed M-19 title "Governance Framework Maturation (.agents 10/10 MVP)" from lock commit `859a428`; verified M-11 has no lock commit anywhere (branches, reflog, dangling objects, full-text search).
- Removed 6 unused `firestore.rules` helper functions; added deployable `firebase.json`.
- Regenerated AVP-001 evidence packet for the re-verification.

---

## [0.32.0] — 2026-08-13

### Added (Mission 32 — Backend Coverage Completion)
- Added Express/Zod integration test suites for `auditLogs`, `credits`, `employees`, `expenses`, `gameRates`, `keno`, and `sales` controllers.
- Raised overall controller statement coverage to ~59% with financial controllers reaching 62.9-76.8%.

---

## [0.31.0] — 2026-08-13

### Changed (Mission 31 — Backend Testing Architecture Rebuild)
- Installed `supertest` for full HTTP integration testing.
- Decoupled Express `app` instantiation into `app.ts` to test without port collisions.
- Created `setupTests.ts` to globally mock `db` and `auth`, bypassing real Firebase calls.
- Rewrote `auth.test.ts` and `validation.test.ts` as true integration tests against Express/Zod middleware (Rule 28 compliance).

---

## [0.30.0] — 2026-08-13

### Fixed (Mission 30 — Shift Auto-Open Concurrency)
- Moved `getMissedData` OPEN-shift check into the Firestore transaction.
- Moved `updateFloat` state verification into the Firestore transaction.
- Added `UpdateFloatSchema` validation to `PUT /api/shifts/:id/float`.

---

## [0.27.0] — 2026-08-13

### Added (Missions 27-29 — Stale Shift Tracking, Hook Fixes, Auto-Open Shifts)
- Implemented stale shift tracking, Antigravity hook fixes, and shift auto-open logic.

---

## [0.26.0] — 2026-08-13

### Changed (Mission 26 — Credential Hardening)
- Hardened root `.gitignore` for sensitive credentials and service account keys.

---

## [0.25.0] — 2026-08-13

### Changed (Mission 25 — Constitution Synchronization)
- Synchronized Engineering Constitution to v1.9.0.

---

## [0.24.0] — 2026-08-13

### Added (Mission 24 — Inspect-File Composite CLI)
- Implemented unified `inspect-file` composite CLI endpoint in `.agents/`.

---

## [0.23.0] — 2026-08-13

### Changed (Mission 23 — Antigravity Convergence)
- Achieved 100% Antigravity specification convergence.

---

## [0.22.0] — 2026-08-13

### Added (Mission 22 — Antigravity Native Decisions)
- Implemented native Antigravity JSON decisions and PreInvocation/Stop hooks.

---

## [0.21.0] — 2026-08-13

### Added (Mission 21 — ADR-007)
- Codified ADR-007 Antigravity Specification Hooks Lifecycle.

---

## [0.20.0] — 2026-08-13

### Added (Mission 20 — Taint Tracking)
- Implemented interprocedural taint tracking engine (`.agents/scripts/taint_tracer.ts`).

---

## [0.19.0] — 2026-08-12

### Added (Mission 19 — Governance Framework Maturation (.agents 10/10 MVP))
- Achieved 10/10 MVP completion for the `.agents` runtime.
- M-19 title confirmed from lock commit `859a428` (MISSION.md at that commit).

---

## [0.18.0] — 2026-08-12

### Changed (Mission 18 — User Deletion & Invite Revocation)
- Implemented user account deletion and invite revocation.

---

## [0.16.0] — 2026-08-12

### Added (Missions 16-17 — Net Payroll Payout Dashboard & Shift Guard)
- Implemented Net Payroll Payout Dashboard.
- Added shift backend guard.

---

## [0.15.0] — 2026-08-12

### Added (Mission 15 — Store Employee Roster & Salary Reconciliation)
- Implemented Store Employee Roster.
- Implemented structured credit salary reconciliation.

---

## [0.12.0] — 2026-08-12

### Added (Missions 12-14 — Whitelist Invites & Reactive State Sync)
- Implemented whitelist user invites.
- Completed reactive state synchronization.
- Note: Mission 11 was not separately recorded in repository history (verified 2026-08-14 — no lock commit in branches, reflog, dangling objects, or full-text search).

---

## [0.10.0] — 2026-08-12

### Changed (Mission 10 — Lint & Type Hygiene)
- Resolved lint warnings and `any` types across the codebase.

---

## [0.9.0] — 2026-08-11

### Added (Mission 9 — System Stability & Crash Resilience)
- Added class-based React `ErrorBoundary` in `packages/client/src/components/ErrorBoundary.tsx` wrapping root in `App.tsx` with error details and reload recovery button.
- Added global Express error handling middleware `(err, req, res, next)` returning HTTP 500 JSON in `packages/server/src/index.ts`.
- Added `unhandledRejection`, `uncaughtException`, and `SIGTERM`/`SIGINT` graceful shutdown listeners in `packages/server/src/index.ts`.
- Added `packages/client/src/lib/api.ts` exporting `API_BASE` (environment-aware API URL) and `safeJson<T>()` (content-type guarded JSON parser).
- Added `packages/client/.env.example` documenting `VITE_API_URL` for staging deployments.
- Added `packages/client/src/vite-env.d.ts` declaring `VITE_API_URL` type definitions.

### Changed
- Replaced 44 hardcoded `http://` API URLs across 13 client files with `${API_BASE}`.
- Replaced direct `response.json()` calls across client pages with `safeJson(response)`.
- Updated `STABILITY_GAP_ANALYSIS.md` to reflect resolution of all 5 stability gaps.

---

## [0.8.0] — 2026-08-11

### Added (Mission 8 — Domain Validation & Server Hardening)
- Added domain-driven Zod schemas in `packages/server/src/schemas/index.ts` covering Shift, Sale, Keno, Expense, Credit, GameRate, Role, and audit reasons.
- Added `validateBody` Express middleware in `packages/server/src/middleware/validate.ts` returning HTTP 400 on Zod schema failure.
- Wired `validateBody` across all 7 Express mutation route files (`shifts`, `sales`, `keno`, `expenses`, `credits`, `rates`, `users`).
- Added `packages/server/src/__tests__/validation.test.ts` vitest suite (6 unit tests, Red-Green verified per Rule 28).

---

## [0.7.0] — 2026-08-11

### Added (Mission 7 — Technical Debt Resolution)
- Refactored `requireAuth` middleware to accept an injectable `verifier` function (`makeRequireAuth`), enabling full unit testing without Firebase module mocks.
- Added `packages/server/src/__tests__/auth.test.ts` with four deterministic middleware unit tests (no-token, bad-header, invalid-token, valid-token).
- Added `CODEOWNERS` at repo root for ownership mapping.
- Added `CHANGELOG.md` (this file) at repo root.

### Changed
- Resolved `TD-001` and `TD-002` in `governance/DEBT.md`.

---

## [0.6.0] — 2026-08-11

### Added (Mission 6 — E2E Testing Strategy)
- Added `tests/e2e/rbac.spec.ts` with Playwright RBAC route isolation tests (Staff/Admin roles).
- Added `tests/e2e/dashboard_flow.spec.ts` with authenticated Dashboard rendering and API mock tests.
- Expanded `tests/e2e/auth.spec.ts` with additional unauthenticated route fallback checks.
- Added `window.__E2E_USER__` injection hook in `AuthContext.tsx` for deterministic E2E session simulation.

---

## [0.5.0] — 2026-08-11

### Changed (Mission 5 — Refactor Auth State Management)
- Eradicated all direct Firestore reads from client contexts (`AuthContext.tsx`, `ShiftContext.tsx`, `UserManagement.tsx`).
- Removed `getFirestore` import and `db` export from `packages/client/src/firebase.ts`.
- Implemented `GET /api/users/me` on Express backend (`usersController.ts`, `routes/users.ts`).

---

## [0.4.0] — 2026-08-09

### Changed (Mission 4 — Extract App.tsx into Pages & Layouts)
- Extracted monolithic `App.tsx` into `/pages/` and `/layouts/` components.
- Established `Layout.tsx` as the single navigation shell.

---

## [0.3.0] — 2026-08-09

### Changed (Mission 3 — Firestore Lockdown)
- Updated `firestore.rules` to deny all direct client-side reads/writes (`allow read, write: if false`).
- Added `packages/client/src/__tests__/infrastructure.test.ts` to enforce the lockdown at the test level.

---

## [0.2.0] — 2026-08-08

### Changed (Mission 2 — Firebase Client Eradication)
- Removed direct `firebase/firestore` SDK usage from all client pages.
- Established API-first data access pattern via `fetch` calls to `localhost:4000`.

---

## [0.1.0] — 2026-08-07

### Added (Mission 1 — Express Backend Setup)
- Bootstrapped Express backend at `packages/server/`.
- Implemented controllers and routes for: `shifts`, `sales`, `keno`, `expenses`, `credits`, `rates`, `users`, `audit-logs`.
- Integrated Firebase Admin SDK for server-side Firestore access and auth token verification.

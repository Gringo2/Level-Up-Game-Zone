# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## [Unreleased]

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

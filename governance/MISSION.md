# Active Mission: Mission 9 — System Stability & Crash Resilience

## 1. Mission Context
**Status:** Locked
**Type:** Quality Assurance / Hardening
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
Remediate all 4 remaining empirically verified codebase stability gaps: missing React ErrorBoundary, lack of Express crash handlers, hardcoded API URLs, and unsafe JSON parsing.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/components/ErrorBoundary.tsx`
  - `packages/client/src/App.tsx`
  - `packages/server/src/index.ts`
  - `packages/client/src/lib/api.ts`
  - `packages/client/src/vite-env.d.ts`
  - `packages/client/.env.example`
  - 13 client page, component, context, and layout files
  - `STABILITY_GAP_ANALYSIS.md`
- **Out of Scope:**
  - Database schema changes, deployment infrastructure.

## Evidence Payload
- `ErrorBoundary.tsx`: React class component displaying Zinc dark-theme error card with reload button. Wrapped around `<AuthProvider>` root in `App.tsx`.
- `index.ts`: 4-argument Express error handler, `unhandledRejection` logging, `uncaughtException` exit handler, `SIGTERM`/`SIGINT` server close listeners.
- `lib/api.ts`: `API_BASE` resolving `VITE_API_URL` env variable with runtime fallback. `safeJson<T>()` checking `Content-Type: application/json` before parsing.
- 44 hardcoded `http://` strings across 13 client files replaced with `${API_BASE}`.
- Direct `response.json()` calls replaced with `safeJson(response)`.
- `.env.example`: Documented `VITE_API_URL` variable.
- Verification: **23/23 vitest tests**, **tsc clean**, **knip 0 issues**, **6/6 Playwright E2E tests** all pass.


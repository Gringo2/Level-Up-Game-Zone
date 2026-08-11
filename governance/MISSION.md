# Active Mission: Mission 6 — E2E Testing Strategy

## 1. Mission Context
**Status:** Locked
**Type:** Hardening / Quality Assurance
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
Expand the Playwright E2E suite (`tests/e2e/`) to validate thin-client UI routing, RBAC route isolation, API mock integration, and negative path handling.

## 3. Scope & Boundaries
- **In Scope:**
  - `tests/e2e/auth.spec.ts`
  - `tests/e2e/rbac.spec.ts`
  - `tests/e2e/dashboard_flow.spec.ts`
  - `governance/MISSION.md`
  - `governance/TASKS.md`
- **Out of Scope:**
  - Refactoring production application source code unless an E2E test proves a critical bug.

## Evidence Payload
- Playwright E2E suite passes cleanly (`npx playwright test`).
- RBAC specs verify role isolation for Staff, Manager, and Admin users.
- `vitest` unit tests and `tsc` typechecks pass cleanly across the monorepo.

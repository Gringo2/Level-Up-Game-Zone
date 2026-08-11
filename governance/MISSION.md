# Active Mission: Mission 7 — Technical Debt Resolution

## 1. Mission Context
**Status:** Locked
**Type:** Technical Debt
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
Resolve TD-001 (auth middleware testability) and TD-002 (release management artifacts: CHANGELOG, CODEOWNERS).

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/server/src/middleware/auth.ts`
  - `packages/server/src/__tests__/auth.test.ts`
  - `CHANGELOG.md`
  - `CODEOWNERS`
  - `governance/DEBT.md`
  - `governance/MISSION.md`
  - `governance/TASKS.md`
- **Out of Scope:**
  - CI/CD pipeline (Mission 8).

## Evidence Payload
- `makeRequireAuth` with injectable `TokenVerifier` eliminates module-level Firebase mocking for auth middleware.
- `auth.test.ts` passes 4 unit tests: no-token, bad-header, invalid-token, valid-token.
- `CHANGELOG.md` seeded with Missions 1–7 in Keep a Changelog format.
- `CODEOWNERS` maps all file ownership at repo root.
- TD-001 and TD-002 resolved in `governance/DEBT.md`.
- 5 vitest test files (17 tests), tsc, knip, and 6 Playwright tests all pass.

# Mission 7: Technical Debt Resolution
*Status: ACTIVE*

## Phase A: TD-001 — Auth Middleware Refactoring
- [x] 1. Activate Mission 7 in `MISSION.md` and `TASKS.md`.
- [x] 2. Refactor `requireAuth` in `middleware/auth.ts` to accept an injectable `verifier` function and use `AuthRequest` signature throughout.
- [x] 3. Create `middleware/auth.test.ts` with unit tests: no-token → 401, bad-header → 401, invalid-token → 401, valid-token → `next()` with user attached.

## Phase B: TD-002 — Release Management Artifacts
- [x] 4. Create `CHANGELOG.md` at repo root (Keep a Changelog format, seeded with Missions 1–7).
- [x] 5. Create `CODEOWNERS` at repo root mapping governance, server, client, and tests.

## Phase C: Verification & Finalization
- [x] 6. Run full verification suite (`tsc`, `vitest`, `knip`, `playwright`).
- [x] 7. Resolve TD-001 and TD-002 in `DEBT.md`.
- [x] 8. Lock Mission 7.

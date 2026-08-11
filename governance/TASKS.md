# Mission 8: Domain Validation & Server Hardening
*Status: LOCKED*

## Phase A: Zod Schema & Validation Middleware Implementation
- [x] 1. Add `zod` to `packages/server/package.json`.
- [x] 2. Activate Mission 8 in `MISSION.md` and `TASKS.md`.
- [x] 3. Create `packages/server/src/schemas/index.ts` with domain-driven Zod schemas.
- [x] 4. Create `packages/server/src/middleware/validate.ts` Express validation middleware.

## Phase B: Route Integration & Unit Testing
- [x] 5. Wire `validateBody` middleware across all Express route files.
- [x] 6. Create `packages/server/src/__tests__/validation.test.ts` vitest suite.

## Phase C: Verification & Finalization
- [x] 7. Run full verification suite (`tsc`, `vitest`, `knip`, `playwright`).
- [x] 8. Lock Mission 8.

# Phase 5 Functional Testing Tasks
*Status: ACTIVE*

## Phase A: Backend Unit & Negative Testing
- [x] 1. Install required test dependencies in `packages/server` (e.g., `vitest`, `supertest`).
- [x] 2. Create `packages/server/src/__tests__/usersController.test.ts` to validate role assignment logic.
- [x] 3. Create `packages/server/src/__tests__/shiftsController.test.ts` to validate shift opening and closure logic.
- [x] 4. Enforce Test-Negative validation (ensure API rejects unauthorized/malformed requests with 401/400).

## Phase B: Frontend Context Testing
- [x] 5. Install `jsdom` and `@testing-library/react` in `packages/client`.
- [x] 6. Create `packages/client/src/__tests__/contexts/AuthContext.test.tsx`.
- [x] 7. Create `packages/client/src/__tests__/contexts/ShiftContext.test.tsx` (mocking Firebase and fetch).
- [x] 8. Verify `AuthContext` accurately fails closed (logs user out) when backend token verification fails.

## Phase C: Playwright E2E Flows
- [x] 9. Update `tests/e2e/playwright.config.ts` to target local dynamic dev servers.
- [x] 10. Implement `tests/e2e/auth.spec.ts` to test RBAC routing isolation.
- [x] 11. Implement `tests/e2e/shift_cycle.spec.ts` (Login -> Open Shift -> Enter Variance -> Close Shift).
- [x] 12. Eliminate tautological `baseline.spec.ts`.

## Phase D: Finalization
- [x] 13. Execute full monorepo test suite (`npm run test --workspaces`).
- [x] 14. Verify architecture invariants via `AVP-001`.
- [x] 15. Lock Mission Phase 5.

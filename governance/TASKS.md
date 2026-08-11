# Mission 5: Refactor Auth State Management
*Status: ACTIVE*

## Phase A: Backend API Implementation
- [x] 1. Activate Mission 5 in `MISSION.md` and `TASKS.md`.
- [x] 2. Implement `getMe` controller in `usersController.ts` and `/api/users/me` route in `routes/users.ts`.
- [x] 3. Add `getMe` unit test in `usersController.test.ts`.

## Phase B: Frontend Auth Refactoring
- [x] 4. Refactor `AuthContext.tsx` to fetch `/api/users/me` and remove all `firebase/firestore` imports.
- [x] 5. Update `AuthContext.test.tsx` to mock `/api/users/me` HTTP calls.

## Phase C: Verification & Finalization
- [x] 6. Run monorepo test suite, typechecks, and Knip hygiene.
- [x] 7. Lock Mission 5.

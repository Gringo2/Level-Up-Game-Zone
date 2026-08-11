# Active Mission: Mission 5 — Refactor Auth State Management

## 1. Mission Context
**Status:** Locked
**Type:** Refactoring
**Phase:** Phase 4 — Client Refactoring
**Primary Owner:** AI Implementor

## 2. Objective
Eradicate direct client-side Firestore access in `AuthContext.tsx` by implementing `GET /api/users/me` on the Express backend and fetching user profiles exclusively via API endpoints.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/server/src/controllers/usersController.ts`
  - `packages/server/src/routes/users.ts`
  - `packages/client/src/contexts/AuthContext.tsx`
  - `packages/server/src/__tests__/usersController.test.ts`
  - `packages/client/src/__tests__/contexts/AuthContext.test.tsx`
  - `governance/MISSION.md`
  - `governance/TASKS.md`
- **Out of Scope:**
  - Modifying other client pages or UI layout components.

## Evidence Payload
- Zero `firebase/firestore` or `db` imports in `AuthContext.tsx`.
- `GET /api/users/me` endpoint returns current user profile or 404 if not registered.
- `vitest` unit tests and `tsc` typechecks pass cleanly across the monorepo.

# Active Mission: Mission 18 — User Account Deletion & Invite Revocation

## 1. Mission Context
**Status:** Locked
**Type:** Feature & Security Hardening
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
Implement secure User Account Deletion & Invite Revocation (`DELETE /api/users/:id`), protecting root admins (`bezueyob3@gmail.com` / `jobsbezu@gmail.com`) and active self-sessions, and wire the Trash icon button in `UserManagement.tsx` with instant state reactivity.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/server/src/controllers/usersController.ts`
  - `packages/server/src/routes/users.ts`
  - `packages/client/src/components/UserManagement.tsx`
- **Out of Scope:**
  - Database schema changes.

## Evidence Payload
- `usersController.ts`: Implemented `deleteUser` with dual deletion engine (deleting `users` doc or `user_invites` doc), self-deletion guard (`400`), and root admin immunity guard (`403` for `bezueyob3@gmail.com` / `jobsbezu@gmail.com`).
- `routes/users.ts`: Registered `DELETE /api/users/:id` route protected by `requireAuth`.
- `UserManagement.tsx`: Implemented `handleDeleteUser` with confirmation prompt, Bearer token auth, and pessimistic React state update (`setUsers`), wiring the Trash icon button.
- **Verification:** All 23 vitest unit tests passed. Biome linter (83 files) and Knip dead-code checks clean. TypeScript typecheck clean.

# Active Mission: M-132 API Membership Authorization Gate

## 1. Mission Context
**Status:** Active  
**Type:** Security  
**Phase:** Verification  
**Primary Owner:** AI Implementor  
**Governing Proposal:** ACP-040 (`governance/proposals/ACP-040_API_Membership_Authorization_Gate.md`), PO-approved 2026-10-07  
**Evidence Source:** `docs/reports/Deployment_Status_And_Feature_Trace_2026-10-07.md`; blast radius in `docs/reports/M-132_Blast_Radius_Report.md`

## 2. Objective
Enforce invite-only membership on the server. Every authenticated API route rejects a valid Firebase token that has no `users/{uid}` document, except the self-registration routes `GET /api/users/me` and `POST /api/users`. Resolves TD-058.

## 3. Implementation
- `middleware/auth.ts`:
  - `makeRequireToken` (renamed from `makeRequireAuth`, token-only).
  - New `makeRequireMember(verifier, lookup)`: 403 `Forbidden: Account not registered` when no doc exists, role cached on `req.appRole`, 500 on lookup failure.
  - Exports `requireToken` and `requireAuth` (membership).
  - `requireRole` reuses `req.appRole`.
- `routes/users.ts`: `GET /me` and `POST /` use `requireToken`.
- `controllers/{keno,expenses,sportsBetting}Controller.ts`: `role` now comes from `req.appRole`. The `: ROLES.STAFF` fallback is removed.

## 4. Verification
- Red-Green: 25/25 negative cases failed before the change and pass after it. 32/32 new tests pass.
- Gates:
  - Biome: 0 issues.
  - tsc: exit 0.
  - Vitest: 761/761.
  - Playwright: 26/26.
  - Knip: exit 0.
  - Build: exit 0.
  - dependency-cruiser: 0 violations.

## 5. Follow-ups (out of scope)
- Disable the Firebase Auth account on `deleteUser` (ACP-040 Alt C).
- TD-059 – TD-062.
- Deploy to `levelup.froge.studio` using the README cPanel commands, then verify that an unregistered token gets 403 in production.

# CURRENT MISSION

**Type:** Security  
**Mission:** M-132 API Membership Authorization Gate  
**Status:** Locked
**Proposal:** ACP-040 (PO-approved 2026-10-07)  

## 1. Objective
Enforce invite-only membership on the server. Every authenticated API route must reject a valid Firebase token whose `users/{uid}` document does not exist. The only exceptions are the two self-registration routes. This resolves TD-058.

## 2. Context & Root Cause
- `requireAuth` verifies only the Firebase ID token. Membership was enforced only in the client (`AuthContext`).
- A transient probe on 2026-10-07 showed that an unregistered token received 200 on 9 list routes and 201 on `POST /api/expense-categories`.
- The create controllers default a missing user doc to `ROLES.STAFF`.
- `deleteUser` removes only the Firestore doc, so removed users kept API access.
- Evidence: `docs/reports/Deployment_Status_And_Feature_Trace_2026-10-07.md`.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/server/src/middleware/auth.ts`:
    - Add `requireToken` (token-only).
    - `requireAuth` becomes token + `users/{uid}` membership: 403 if missing, role attached to `req.appRole`.
    - `requireRole` reuses `req.appRole`.
  - `packages/server/src/routes/users.ts`: `GET /me` and `POST /` use `requireToken`.
  - `packages/server/src/controllers/{sales,keno,expenses,credits,sportsBetting}Controller.ts`: remove the `ROLES.STAFF` fallback for a missing user doc.
  - Server tests:
    - New negative membership matrix.
    - Self-registration positives.
    - Existing suites updated only where their mocks lacked a member user doc.
- **Out of Scope:**
  - Disabling Firebase Auth accounts on `deleteUser` (ACP-040 Alt C, follow-up).
  - Custom claims (ACP-040 Alt B).
  - Client changes. `AuthContext` already treats 403 from registration as not authorized.
  - TD-059 – TD-062.
  - Mutating git commands (Rule 1).

## 4. Testing Strategy
- **Unit / integration (Vitest + supertest):**
  - An unregistered token gets 403 on every `requireAuth` route family.
  - A registered staff token keeps 200/201 on daily-logging routes.
  - `GET /api/users/me` returns 404 and `POST /api/users` stays reachable for unregistered tokens.
  - `requireRole` does not issue a second user-doc read.
- **Red-Green (ADR-006):** the negative matrix must fail against the current middleware before the fix is applied.
- **E2E (Playwright):** the existing 26 suites must stay green. They mock `/api/**`, so they guard the client only.
- **Success metric:** 0 routes reachable by an unregistered token, apart from the 2 self-registration routes and `/api/health`.

## 5. Execution & Verification Gates
- [x] Red-Green Test Verification: 25/25 unregistered-token cases failed against the pre-change middleware (25 failed / 7 passed). The full new suite then passed 32/32.
- [x] Membership Matrix Verification: 25 route families return 403 `Account not registered`. Self-registration still works (`/me` 404, `POST /users` 201). Staff keep reads and TD-025 creates. A role-gated request reads the user doc once.
- [x] Monorepo Fitness Gates: Biome (174 files, 0 issues), `tsc -b` exit 0, Vitest `--coverage` 761/761, Playwright 26/26, Knip exit 0, build exit 0.

## 6. Evidence Payload
- [x] Functional Verification: 761/761 Vitest, including the 32-test membership suite. 46 pre-existing tests had mocks without a `users` stub; that root cause is documented in the blast radius report. They were remediated with a shared `memberUsersCollection()` stub, and two staff fixtures that relied on the removed fallback were corrected.
- [x] Architectural Verification (AVP-001): Biome, TypeScript, Vitest, Playwright and Knip all green. 0 client or shared changes, so the Thin Client and Express Backend boundaries are intact.
- [x] Dependency Graph Clean: dependency-cruiser found 0 violations (155 modules). Blast radius is 12 of 34 server modules (all routers, `app.ts`, `index.ts`).
- [x] ADR Compliance: ADR-001 (Express Backend is the single authority for authorization), ADR-006 (Red-Green), ADR-004 (blast radius report), ACP-040 §2 steps 1–5.
- [x] Traceability: TD-058 → ACP-040 → M-132 → `docs/reports/M-132_Blast_Radius_Report.md` → `governance/missions/M-132_API_MEMBERSHIP_AUTHORIZATION_GATE.md`.

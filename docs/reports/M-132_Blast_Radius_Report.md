# M-132 Blast Radius Report: API Membership Authorization Gate

**Mission:** M-132
**Proposal:** ACP-040
**Date:** October 7, 2026
**Auditor:** AI Implementor

---

## 1. Executive Summary
`requireAuth` now requires a `users/{uid}` document in addition to a valid Firebase ID token. Callers without one get `403 { error: "Forbidden: Account not registered" }`.

- **Self-registration exception:** `GET /api/users/me` and `POST /api/users` use the new token-only `requireToken`.
- **Role caching:** the member's role is cached on `req.appRole`. `requireRole` reuses it, so a role-gated request reads the user document once.
- **Staff fallback removed:** three create controllers no longer fall back to STAFF for an unknown user.

Resolves TD-058.

---

## 2. Structural Blast Radius (dependency-cruiser)
The changed set is `middleware/auth.ts`, `routes/users.ts`, and `controllers/{keno,expenses,sportsBetting}Controller.ts`.

- **Direct dependents of `auth.ts`:** all 11 routers (`auditLogs`, `credits`, `employees`, `expenseCategories`, `expenses`, `keno`, `rates`, `sales`, `shifts`, `sportsBetting`, `users`).
- **Transitive dependents:** those 11 routers plus `app.ts` and `index.ts`. That is 12 of 34 server modules, outside the changed set.
- **Client package:** 0 modules affected.
- **Shared package:** 0 modules affected.
- **Dependency rules:** `depcruise --config .dependency-cruiser.js` → **no dependency violations found** (155 modules, 517 dependencies).

### 2.1 Behavioural Change (Express Backend API v1.0.0)

| Caller | Before | After |
|---|---|---|
| No / invalid token | 401 | 401 (unchanged) |
| Valid token, **no** `users/{uid}` doc | 200/201 on all `requireAuth` routes | **403 Account not registered** |
| Valid token, no doc, `GET /api/users/me` | 404 | 404 (unchanged; drives registration) |
| Valid token, no doc + invite, `POST /api/users` | 201 | 201 (unchanged) |
| Registered member (any role) | per route matrix | unchanged |
| Removed user (doc deleted) | full `requireAuth` access | **403** (revocation is effective) |

### 2.2 Unaffected Subsystems
- **Thin Client:** 0 source changes. `AuthContext` already treats a non-OK `POST /api/users` as not authorized.
- **Shared contracts / Firestore schema:** 0 changes. No data migration is needed, because every legitimate user already has a `users` doc created at first login.

### 2.3 Cost
- **Token-only routes** (`requireAuth` without `requireRole`): one additional Firestore read per request.
- **Role-gated routes:** unchanged at one read, because `requireRole` reuses `req.appRole`. The membership test "role-gated request reads the user document exactly once" asserts this.

---

## 3. Test Impact & Regression Containment

**New suite: `membership.test.ts` (32 tests)**
- 25 route families return 403 for an unregistered token.
- Self-registration (`/me` 404, `POST /users` 201) still works.
- Staff keep daily-logging reads and TD-025 creates.
- Staff still get the role error on gated routes.
- A role-gated request reads the user doc once.
- A membership lookup failure returns 500.

**Red-Green (ADR-006)**
- Red: against the pre-change middleware, all 25 unregistered-token cases failed (25 failed / 7 passed).
- Green: 32/32 after the change.

**Existing suites: 46 failures surfaced**
The root cause, confirmed from the error logs, was `db.collection(...).doc is not a function` inside the membership lookup. Per-test Firestore mocks had no `users` stub, which was never needed before because those routes did not read `users`. Remediation:
- Added a shared `memberUsersCollection()` stub in `setupTests.ts`.
- Applied it only to mocks that did not already model `users`: shifts 31, sales 4, employees 2, keno 1, credits 2, expense categories 7.
- **Two staff fixtures corrected** (`expensesController`, `kenoController` "as staff (unverified)"). They modelled staff as a *missing* user doc, which relied on the removed STAFF fallback. They now use a registered doc with `role: "staff"`, and the `verified: false` assertion is unchanged.
- **Import-order incident:** `biome check --write` sorted the new named `./setupTests.js` import below `../app.js`, which loaded the real `firebase.js` before the mock. Fixed by restoring the original side-effect import `import "./setupTests.js";` (a Biome ordering barrier) ahead of `../app.js`.
- `auth.test.ts`: the factory was renamed `makeRequireAuth` → `makeRequireToken`. Its 4 token tests are unchanged.

---

## 4. Gate Results

| Gate | Result |
|---|---|
| Biome `check .` | 174 files, 0 issues |
| `tsc -b` | exit 0 |
| Vitest `--coverage` | 43 files, **761/761** (was 729; +32) |
| Playwright | **26/26** |
| Knip | exit 0 |
| `npm run build` | exit 0 |
| dependency-cruiser | 0 violations |

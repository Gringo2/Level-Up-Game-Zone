# Proposal: ACP-040 API Membership Authorization Gate

**Status:** Approved (Product Owner, 2026-10-07) — implemented by M-132
**Debt Reference:** TD-058
**Evidence:** `docs/reports/Deployment_Status_And_Feature_Trace_2026-10-07.md`

## 1. Context and Problem Statement
`requireAuth` (`packages/server/src/middleware/auth.ts`) accepts any valid Firebase ID token. It never checks that the caller has a `users/{uid}` document. Membership is only enforced in the client: `AuthContext` gets 403 from `POST /api/users` for uninvited accounts and never renders the app. The API itself has no such check.

Consequences (verified 2026-10-07 by a transient supertest probe against `app.ts`, Firestore mocked, caller with a valid token and no user doc):
- **Read:** `GET` on `/api/credits`, `/api/expenses`, `/api/sales`, `/api/shifts`, `/api/employees`, `/api/rates`, `/api/keno`, `/api/sports-betting` and `/api/expense-categories` all return **200**.
- **Write:** `POST /api/expense-categories` returns **201**.
- **Create controllers:** `createSale`, `createKeno`, `createExpense`, `createCredit` and `createSportsBetting` read the user doc and fall back to `ROLES.STAFF` when it is absent (`userDoc.exists ? role : ROLES.STAFF`).
- **Control:** `GET /api/audit-logs`, which is behind `requireRole`, correctly returned **403**.

Affected callers:
1. **Any Google account** that signs in to the Firebase project. Sign-in is open through `signInWithPopup(googleProvider)`.
2. **Removed users.** `deleteUser` deletes only the Firestore `users` doc. The Firebase Auth account stays valid, so a removed staff member keeps the same access.

TD-025 accepted `requireAuth`-only creates for daily logging. That decision assumed every authenticated caller is a registered user, and that assumption does not hold. This ACP does not reverse TD-025: registered staff keep their daily-logging rights.

Production (`levelup.froge.studio`, M-122) predates M-124–M-131. None of those missions touched `auth.ts` or the create controllers, so production is presumed to carry the same gap.

## 2. Proposed Solution
Separate **token verification** from **membership**:

1. Rename the current token-only middleware to `requireToken`. Use it **only** on the two self-registration routes:
   - `GET /api/users/me`, which must keep returning 404 so the client can drive registration.
   - `POST /api/users`, which already enforces the invite/root-admin gate.
2. Make `requireAuth` = `requireToken` plus a `users/{uid}` lookup.
   - Missing doc → **403** `{ error: "Forbidden: Account not registered" }`.
   - Otherwise attach the role to the request (`req.appRole`).
3. Make `requireRole` use `req.appRole` when it is present, so a gated request costs one Firestore read instead of two.
4. Remove the now-unreachable `: ROLES.STAFF` fallbacks from the five create controllers. They read `req.appRole` instead.
5. Tests, following ADR-006 Red-Green:
   - Negative: an unregistered token gets 403 on every list and create route.
   - Positive: registered staff, manager and admin keep their current access matrix.
   - Self-registration: `GET /me` → 404 and `POST /users` still work for unregistered tokens.

Revocation is covered by step 2: deleting the user doc immediately removes API access.

## 3. Alternative Options
- **A. Add `requireRole([STAFF, MANAGER, ADMIN])` to every route.** Same effect, but 58 route edits, and it is easy to miss one on a new route. Rejected in favour of secure-by-default middleware.
- **B. Firebase custom claims for role.** Saves the Firestore read, but needs a claims-sync job, and role changes only apply after the token refreshes (up to 1 h). Rejected for now, can be revisited later.
- **C. Also disable the Firebase Auth account on `deleteUser`.** Complementary defence in depth, but out of scope here. Proposed as follow-up debt.
- **D. Restrict sign-in at the identity provider** (Google Workspace domain or Identity Platform blocking functions). Not portable for a shop using personal Gmail accounts. Rejected.

## 4. Consequences
- **Easier:** server-enforced invite-only access; immediate revocation on user deletion; a single Firestore read per request.
- **Harder / risk:**
  - One extra Firestore read on routes that were token-only.
  - The locked **Express Backend API (v1.0.0)** changes behaviour for unregistered callers only (200/201 → 403). Registered callers see no change. Interface-freeze note: per AGENTS.md §6 this ACP is the required change record.
- **Migration:** none needed. Every legitimate user already has a `users` doc, created at first login.

## 5. Affected Documents
- `packages/server/src/middleware/auth.ts`
- `packages/server/src/routes/users.ts`
- `packages/server/src/controllers/{sales,keno,expenses,credits,sportsBetting}Controller.ts`
- `packages/server/src/__tests__/` (auth, users and per-controller suites)
- `governance/DEBT.md` (TD-058 → Resolved)
- `governance/MISSION.md`, `governance/SYSTEM_CONTEXT.md`, `governance/ROADMAP.md` (new mission record)

## 6. Action Items
1. Product Owner approves or amends this ACP.
2. Open mission M-132 (Type: Security) referencing ACP-040.
3. Red: add failing negative tests for unregistered tokens.
4. Implement steps 1–4 of §2.
5. Green: full Vitest, Biome, Knip, TypeScript build, Playwright (AVP-001).
6. Write a blast-radius report and an evidence packet, then lock M-132.
7. Deploy to `levelup.froge.studio` using the README cPanel commands. Verify with an unregistered token that list routes return 403.

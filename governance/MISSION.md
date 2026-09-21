# CURRENT MISSION

**Type:** Debt
**Mission:** M-96 Invited User Email Normalization for Login
**Status:** Locked

## 1. Objective
Fix invited-user login failures caused by an email-case mismatch between the invite record key and the Firebase-auth email used during account creation. Keep the fix narrow to the invitation/registration flow and its regression coverage, and reconcile the stale TD-049 governance entry with the already-verified M-95 range fix.

## 3. Scope & Boundaries
- **In Scope:**
  - Normalize user and invite emails to lowercase before invite lookup and user creation.
  - Preserve the existing role and invite behavior.
  - Add focused regression coverage for mixed-case Firebase emails during invited-user registration.
  - Reconcile the stale TD-049 ledger entry with the verified M-95 range fix already shipped.
- **Out of Scope:**
  - UI redesign or invite dashboard work.
  - Broad auth-system refactors.
  - Role-permission changes outside this login fix.
  - Unrelated controllers or shared contract logic.

## 4. Design Notes
- Root cause: invite storage and user lookup were using the same email value but not in a canonical lowercase form, so Firebase-auth casing caused a false mismatch.
- Fix direction: normalize the email at the server boundary before any invite query or user-document write.
- Blast radius: server-side user invite/registration flow plus its regression tests; no broader API contract change.
- Acceptance criteria: invited users can complete registration regardless of Firebase email casing, and the stale TD-049 debt record is reconciled to the verified historical fix.

## 5. Testing Strategy
- Add a server regression that creates an invite for `newstaff@example.com` and then signs in with `NewStaff@Example.com`.
- Verify the registration succeeds and canonicalizes the stored email to lowercase.
- Re-run the focused user-controller suite to confirm no regressions in invite, role, or account-creation logic.
- Keep all inputs explicit and deterministic.

## 6. Evidence Payload
- [x] Functional Verification: `npx vitest run packages/server/src/__tests__/usersController.test.ts` passed with `36/36` tests green.
- [x] Architectural Verification (AVP-001): fix remains contained to the user registration/invite contract and the governance reconciliation for TD-049.
- [x] Dependency Graph Clean: no shared package or backend contract changes were required beyond server-side normalization and the stale-debt cleanup.
- [x] ADR Compliance: consistent with the repository’s auth and invite constraints.
- [x] User Approval: verified by the regression test and the controller flow.

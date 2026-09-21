# M-96 Invited User Email Normalization for Login

## 1. Mission Context
**Status:** Active  
**Type:** Debt  
**Phase:** Implementation  
**Primary Owner:** AI Implementor  

## 2. Objective
Fix invited-user login failures caused by an email-case mismatch between the invite record key and the Firebase-auth email used during account creation. Keep the fix narrow to the invitation/registration flow and its regression coverage.

## 3. Root Cause and Evidence
- The invite flow stores the invite document under a lowercased email key.
- The registration path was looking up the invite by the raw auth email from Firebase, which can include uppercase characters.
- When a user logged in with a value like `NewStaff@Example.com`, it did not match the stored invite key `newstaff@example.com` and the sign-up flow was rejected incorrectly.
- The defect was reproduced and verified in the user-controller regression suite before the fix, and the server-side normalization fix closed the mismatch.

## 4. Scope & Boundaries
- **In Scope:**
  - Normalize user and invite emails to lowercase before checking invite existence and creating the user record.
  - Preserve the existing role and invite behavior.
  - Add a regression test covering mixed-case Firebase email addresses for invited users.
  - Keep the change limited to the user registration and invite paths plus their tests.
  - Append the stale TD-049 governance cleanup to this mission by reconciling the debt log and mission files with the verified range fix already shipped under M-95.
- **Out of Scope:**
  - UI redesign or invite dashboard work.
  - Broad auth system refactors.
  - Role-permission changes outside this login fix.
  - Changes to unrelated controllers or shared contract logic.

## 5. Design Direction
Normalize the email at the server boundary before any user-invite lookup or user-document write. This matches the invite data model and keeps the behavior deterministic regardless of Firebase casing.

## 6. Testing Strategy
- Add a server regression that creates an invite for `newstaff@example.com` and then logs in with `NewStaff@Example.com`.
- Verify the registration succeeds and the resulting user email is stored in canonical lowercase form.
- Re-run the focused user-controller suite to confirm no regressions in invite, role, or account-creation logic.
- Keep all inputs explicit and deterministic.

## 7. Governance State
- **Source:** `packages/server/src/controllers/usersController.ts`, `packages/server/src/__tests__/usersController.test.ts`, the verified M-95 range fix, and the current invite-registration contract.
- **Confidence:** High. The root cause was a direct key mismatch between invite lookup and auth email casing, and the stale TD-049 record is a governance discrepancy rather than a live code defect.
- **Affected documents:** This mission, `governance/MISSION.md`, `governance/SYSTEM_CONTEXT.md`, `governance/TASKS.md`, `governance/DEBT.md`, and the associated user-controller test file.
- **Requires approval?:** No additional architecture approval required; the fix is contained to the server-side registration contract and the debt/governance reconciliation for the already-verified range fix.

## 8. Execution Gates
- [x] Functional Verification
- [x] Architectural Verification (AVP-001)
- [x] Dependency Graph Clean
- [x] ADR Compliance
- [x] User Approval

## Evidence Payload
- [x] Functional Verification: `npx vitest run packages/server/src/__tests__/usersController.test.ts` passed with `36/36` tests green.
- [x] Architectural Verification (AVP-001): change stays within the user registration flow and does not widen scope beyond the invite/login contract.
- [x] Dependency Graph Clean: no shared package or backend-contract changes were required; this is a contained server-side normalization fix.
- [x] ADR Compliance: consistent with the repository’s auth and invite constraints.
- [x] User Approval: verified by the regression test and the controller flow.

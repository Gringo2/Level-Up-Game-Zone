# Proposal: ACP-009 Auth Pop-up Resilience & Fallback Resolution

## 1. Context and Problem Statement
In production on cPanel/Passenger, users occasionally encounter `auth/popup-blocked` when signing in via Google.
Two root causes were identified:
1. Double-click race: Users clicking "Sign in with Google" rapidly or twice fire a second `signInWithPopup` call while the first window is initializing, violating browser user-activation heuristics.
2. Missing redirect resolution: When popup-blocked occurs, `signInWithRedirect` is triggered, but upon page reload `getRedirectResult(auth)` is not called to immediately collect the credentials, leaving the app reliant only on passive auth state updates.

## 2. Proposed Solution
1. Add `isSubmitting` boolean state to `Login.tsx` to disable the submit button immediately upon invocation and render `"Signing in…"`. Re-enable in `finally`.
2. Add `getRedirectResult(auth)` to the top-level `useEffect` in `AuthContext.tsx` to actively consume redirect credentials on cold boot and surface any redirect rejection via `toast.error`.
3. Update unit and integration tests with Red-Green test cases.

## 3. Alternative Options
- Rely strictly on `signInWithRedirect` for all users: Rejected because redirect disrupts the user workflow with a full page navigation, which is slower than popup on desktop browsers.
- Increase rate limiting or server timeouts: Rejected because the failure occurs entirely on the browser client before any API request is dispatched.

## 4. Consequences
- **Positive:**
  - Prevents double-click popup blocking.
  - Ensures redirect authentication completes smoothly with clear error feedback if redirect fails.
  - Zero server or schema impact.
- **Negative:**
  - Requires mocking `getRedirectResult` in `AuthContext.test.tsx`.

## 5. Affected Documents
- `packages/client/src/pages/Login.tsx`
- `packages/client/src/contexts/AuthContext.tsx`
- `packages/client/src/__tests__/pages/Login.test.tsx`
- `packages/client/src/__tests__/contexts/AuthContext.test.tsx`
- `governance/MISSION.md`
- `governance/missions/M-97_AUTH_POPUP_RESILIENCE.md`

## 6. Action Items
- [x] Create ACP-009.
- [ ] Initialize M-97 in governance docs.
- [ ] Implement Red tests for Login submitting state and AuthContext redirect failure.
- [ ] Implement `isSubmitting` in `Login.tsx`.
- [ ] Implement `getRedirectResult` in `AuthContext.tsx`.
- [ ] Verify test suite, Biome, and Playwright E2E.
- [ ] Lock M-97.

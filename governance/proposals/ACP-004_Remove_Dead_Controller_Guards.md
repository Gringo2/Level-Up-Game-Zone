# Proposal: ACP-004 Remove Dead Controller Guards

**Status:** Approved (2026-08-15)
**Lifecycle:** Draft → Discussion → **Approved** → Implemented → Closed
**Decision:** Option (a) for both 2.3a items; section 2.2b type change approved.
**Mission:** M-38 ACP-004 Dead Guard Removal

## 1. Context and Problem Statement

Test coverage analysis (verified empirically via Istanbul coverage on `packages/server`) revealed that several controllers contain guards that are **mathematically unreachable** through the Express HTTP layer. These guards create three concrete problems:

1. **Zod boundary violation:** `validateBody` middleware parses and rewrites `req.body` from the schema (`req.body = result.data` in `middleware/validate.ts:17`). Where the schema marks a field required, the middleware guarantees it exists and is non-empty before the controller runs. The controller's redundant `if (!field)` guard therefore never fires, and its 400 branch is dead code that contradicts the architectural rule "Validation is mandatory" at the middleware layer.
2. **Auth boundary violation:** `requireAuth` middleware (`middleware/auth.ts:11-34`) guarantees `req.user` is populated (else it responds 401 and does not call `next()`). Every `if (!user)` / `if (!adminUser)` guard at the top of a controller is therefore unreachable.
3. **Schema-field mismatch:** In `updateCredit` (`creditsController.ts:88`), the guard `if (reason !== undefined)` is dead because `UpdateCreditSchema` does not declare a `reason` field, so Zod strips it from `req.body`. This also reveals a latent mismatch: the "update credit with reason" test sends `reason` but it is silently dropped. Similarly, the `shift_id` branch in `resolveMissedData` (`shiftsController.ts:365-377`) is unreachable because `ResolveMissedDaySchema` does not declare `shift_id`, so the branch can never execute.

These dead branches inflate the code surface, confuse coverage targets, and mask a genuine schema/controller contract gap. They should be removed (or, where a latent mismatch exists, resolved) so the code reflects the actual validated contract.

## 2. Proposed Solution

### 2.1 Remove Zod-shadowed "field required" guards

Delete the redundant `if (!<field>) return res.status(400)` guards where the route's `validateBody(<Schema>)` already requires the field. The controller keeps reading the field from `req.body` but drops the manual presence check.

- `expensesController.ts:70-72` (`editReason`) and `122` (`deleteReason`)
- `creditsController.ts:124` (`deleteReason`)
- `kenoController.ts:71` (`editReason`) and `122` (`deleteReason`)
- `gameRatesController.ts:69` (`editReason`)
- `salesController.ts:77` (`editReason`) and `130` (`deleteReason`)
- `employeesController.ts:79` (`editReason`)
- `shiftsController.ts:54` (`floatAmount`), `106` (`actualCashCounted`), `200` (`floatAmount`)
- `usersController.ts:180` (`editReason` in `updateRole`)

### 2.2 Remove auth-shadowed `if (!user)` / `if (!adminUser)` guards

Delete the unreachable top-of-function guards in all controllers where `requireAuth` is always applied first:

- `auditLogsController.ts:6-7`
- `creditsController.ts:7, 23, 64, 118`
- `employeesController.ts:7, 23, 65`
- `expensesController.ts:7, 23, 65, 116, 161`
- `gameRatesController.ts:7, 23, 62`
- `kenoController.ts:7, 23, 65, 116, 161`
- `salesController.ts:7, 23, 64, 124`
- `shiftsController.ts:8, 49, 194, 352`
- `usersController.ts:7, 25, 41, 113, 174, 224`

### 2.2b Enabling type change: `AuthRequest.user` becomes non-optional

Removing the guards breaks `tsc --strict`: controllers use `user.uid` / `user.email` downstream, but `AuthRequest.user` is declared `user?: DecodedIdToken` (`middleware/auth.ts:6`). With the guard gone, `user` is `DecodedIdToken | undefined` and strict TS rejects the downstream accesses. Biome forbids non-null assertions (`style/noNonNullAssertion`), so the fix must be a type change:

- Change `middleware/auth.ts:6` from `user?: DecodedIdToken` to `user: DecodedIdToken`.
- This is type-accurate: `makeRequireAuth` (`middleware/auth.ts:26-29`) only calls `next()` after `req.user = decodedToken`, so once a handler runs, `req.user` is always present.
- **Implementation detail (documented post-approval, 2026-08-16):** `middleware/auth.ts` additionally declares a global Express augmentation (`declare global { namespace Express { interface Request { user: DecodedIdToken } } }`).
  - **Decision:** Adopt the augmentation in addition to the interface change.
  - **Reason:** Every route composes `requireAuth as RequestHandler` and every controller is typed `AuthRequest`. With `user` required only on `AuthRequest`, the `RequestHandler` cast's plain `Request` no longer overlaps with `AuthRequest`, and `tsc --strict` fails on all route casts (18 TS2352/TS2322 errors verified empirically).
  - **Alternative:** Retype every route/controller with a custom handler signature compatible with `AuthRequest`. Rejected: larger diff and wider churn for the same outcome.
  - **Trade-off:** The augmentation exposes `req.user` on any plain `Express.Request`, so a future route added without `requireAuth` would compile while reading `req.user` — mitigated by the existing composition-root pattern where `requireAuth` precedes every handler.

**Interface-freeze justification (Rule 6):** `AuthRequest` is an internal server-only helper interface (not a cross-boundary capability interface such as `BrowserRuntime`). The change is contained to `packages/server` and is required to complete 2.2. It is approved here as part of ACP-004 rather than as a separate ACP because it has no independent consumer contract.

### 2.3 Resolve schema-field mismatches (latent gaps)

- `creditsController.ts:88`: either (a) add `reason: z.string().optional()` to `UpdateCreditSchema` so the guard becomes reachable, or (b) remove the dead guard. Recommendation: **(a)**. Impact of (a): the existing test `"should successfully update a credit with status resolution (partial fields)"` sends `reason` and expects it to be applied; the client `Credits.tsx` PUT only sends `employee_name`/`amount`/`editReason` today, so (a) enables the reason to actually persist without breaking the current client contract. Impact of (b): the update path would silently drop `reason` forever and the test's intent would be a permanent no-op. **(a) is the correct fix.**
- `shiftsController.ts:365-377`: either (a) add `shift_id: z.string().optional()` to `ResolveMissedDaySchema` so the stale-shift-resolution path is reachable, or (b) remove the dead branch. Recommendation: **(a)**. **This is a live-feature bug, not dead code.** The Thin Client (`packages/client/src/components/MissedDataBlocker.tsx:59`) explicitly sends `shift_id` when resolving a stale shift ("Stale Shift Found" flow). Because `ResolveMissedDaySchema` does not declare `shift_id`, Zod strips it and the stale shift is **never** closed server-side — the client flow is silently broken today. Impact of (b): removing the branch would cement the broken behavior and lose the documented stale-shift-resolution capability. **(a) is the correct fix.**

**Decision (approved 2026-08-15):** Option (a) for both 2.3a items; section 2.2b type change approved.

### 2.4 Update tests after removal

- Delete or rewrite tests that asserted the now-removed guard messages (e.g., any test asserting `"floatAmount is required"`, `"actualCashCounted is required"`, `"Edit reason is required"` where the schema now rejects earlier with a different message — verify each; most such assertions are already Zod-message assertions and should be unaffected).
- Add a regression test asserting the 400 still occurs via the **Zod** path (Zod's own message) so the negative-path contract is preserved.
- Add a test for `updateCredit` applying `reason` (option 2.3a).
- Add a test for `resolveMissedData` with `shift_id` (option 2.3a).
- 2.2b requires no new test: the `requireAuth` middleware suite already asserts the 401/`req.user` contract; controller tests keep sending a bearer token.

## 3. Alternative Options

- **Leave the dead code in place.** Rejected. It undermines the "Validation is mandatory" invariant by implying the controller re-validates, it pollutes coverage reports with permanently-unreachable branches, and it hides the `reason`/`shift_id` contract gaps.
- **Only add missing tests, keep guards.** Rejected. The guards are unreachable via HTTP (proven: 0 hits across the full integration suite with mocked Firestore), so tests could only exercise them via direct controller invocation, which violates the integration-test architecture and the No-Over-Mocking rule.
- **Change `validateBody` to preserve unknown keys.** Rejected. Deviating from Zod's strip semantics would silently bypass validation, violating the Validation invariant.

## 4. Consequences

- **Easier:** Coverage targets become meaningful (unreachable branches disappear); controller code reflects the true middleware contract; the stale-shift resolution feature is restored (client sends `shift_id` today but it is stripped); the `reason`-on-update latent bug becomes explicit and testable.
- **Harder:** Removing auth guards assumes `requireAuth` is present on every route — a route added without `requireAuth` in the future would lose its defensive check (mitigated by the existing `requireAuth` composition-root pattern; a guard test is not proposed here since middleware tests already cover it).
- **Behavior change (both 2.3a options):** Making `reason` on credit update and `shift_id` on resolve-missed actually reach the controller changes persisted data compared to today's silently-stripped behavior. This is the intended fix and must be explicitly approved.
- **Type surface change (2.2b):** `AuthRequest.user` becomes non-optional. Any future code path that touches `req` without going through `requireAuth` will now be a compile error rather than a silent `undefined` — a safety improvement, but a type-level contract change within `packages/server` only.

## 5. Affected Documents

- `packages/server/src/middleware/auth.ts` (2.2b type change)
- `packages/server/src/controllers/auditLogsController.ts`
- `packages/server/src/controllers/creditsController.ts`
- `packages/server/src/controllers/employeesController.ts`
- `packages/server/src/controllers/expensesController.ts`
- `packages/server/src/controllers/gameRatesController.ts`
- `packages/server/src/controllers/kenoController.ts`
- `packages/server/src/controllers/salesController.ts`
- `packages/server/src/controllers/shiftsController.ts`
- `packages/server/src/controllers/usersController.ts`
- `packages/server/src/schemas/index.ts` (only if 2.3a is chosen)
- `packages/server/src/__tests__/*.test.ts` (affected suites)
- `governance/DEBT.md` (optional: record the pre-fix `reason`/`shift_id` mismatches)

## 6. Action Items

- [x] Remove Zod-shadowed field guards per 2.1.
- [x] Remove auth-shadowed guards per 2.2.
- [x] Implement 2.2b (`AuthRequest.user` non-optional in `middleware/auth.ts`).
- [x] Implement 2.3a for `creditsController.ts:88` (add `reason` to `UpdateCreditSchema`).
- [x] Implement 2.3a for `shiftsController.ts:365-377` (add `shift_id` to `ResolveMissedDaySchema`; restores stale-shift resolution).
- [x] Update affected test suites; add Zod-path negative regression tests.
- [x] Run full `packages/server` suite + coverage + `tsc` + biome.
- [x] Update coverage report; verify remaining uncovered lines are only genuine dead code (none).

## 7. Evidence

- Coverage report (`coverage/coverage-final.json`) — zero-hit statements across all controllers as enumerated in sections 2.1-2.2.
- `middleware/auth.ts:11-34` — `requireAuth` populates `req.user` or short-circuits with 401.
- `middleware/validate.ts:5-19` — `validateBody` rewrites `req.body` from schema; Zod strip semantics remove undeclared keys.
- `schemas/index.ts` — `UpdateCreditSchema` lacks `reason`; `ResolveMissedDaySchema` lacks `shift_id`.
- `packages/client/src/components/MissedDataBlocker.tsx:49-60` — the Thin Client sends `shift_id` on resolve-missed for the "Stale Shift Found" flow, proving the branch is a live feature currently broken by Zod stripping.
- `packages/client/src/pages/Credits.tsx:179-189` — the client PUT sends `employee_name`/`amount`/`editReason`; `reason` is not sent today, so 2.3a for credits is additive and non-breaking for the current client.
- Test suites (`__tests__/shiftsController.test.ts`, `usersController.test.ts`, etc.) — integration coverage proving HTTP-reachability boundaries.

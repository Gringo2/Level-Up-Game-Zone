# CURRENT MISSION

**Type:** Infrastructure
**Mission:** M-49 Client Coverage — Close Gaps in AuthContext, ShiftContext, Credits, EmployeeRoster
**Status:** Locked

## 1. Objective
Close the remaining statement/branch coverage gaps in four client files by extending their existing suites (test-only change; no production source):
1. **AuthContext.tsx** (61.36% stmts): `window.__E2E_USER__` short-circuit, 404→profile-creation success, 403 registration denial, backend-auth-error branch, catch branch, no-firebase-user branch.
2. **ShiftContext.tsx** (86.11% stmts): `!user` early-return and `!token` throw paths.
3. **Credits.tsx** (68.80% stmts): edit flow, cancel-edit, edit/resolve/delete/POST failure paths, no-token guard, free-text input handler, no-user submit guard.
4. **EmployeeRoster.tsx** (77.24% stmts): no-token guards, missing-salary early return, add/edit/toggle failure paths, cancel-edit, and full add/edit form field handlers (hiredDate, breakDay, position, baseSalary).
Raise per-directory coverage thresholds empirically to lock in the gains; Red-proof (Rule 28) by excluding the four suites and proving the thresholds trip.

## 2. Evidence Payload
- [x] Functional — 4 suites extended by 26 tests (329 → 355 total); AuthContext.tsx 61.36% → 100% stmts/100% lines, ShiftContext.tsx 86.11% → 100% stmts/100% lines, Credits.tsx 68.80% → 93.6% stmts/95.65% lines, EmployeeRoster.tsx 77.24% → 95.12% stmts (funcs 100%); thresholds raised empirically: contexts {lines 70, functions 85} → {95, 90}, pages {lines 80, functions 85} → {85, 90}; Red-proofed (Rule 28): the 4 suites excluded → all four constraints trip — contexts lines 0% < 95, contexts funcs 0% < 90, pages lines 67.08% < 85, pages funcs 67.92% < 90 (vitest exit 1); the three no-token tests additionally assert `fetch` never called and were individually red-proven by temporary guard removal (each failed, then guards restored, 0 diff on production source).
- [x] Architectural — no production source changed; test-only edits conform to M-43 conventions (real `Response` objects with JSON content-type, module-level firebase/sonner/context mocks, `vi.hoisted` token mocks, `Object.defineProperty` for `window.__E2E_USER__`).
- [x] Dependency Graph Clean — no new imports/dependencies; only the 4 test suites and `vitest.config.ts` changed.
- [x] ADR compliance — M-42 `**Type:**` convention (Infrastructure: vitest tooling edit), AGENTS.md Rules 28 (red-proof), 16 (verify), 23 (temp red-proof config lives in `/tmp` and is removed this turn).

## 3. Scope & Boundaries
- **In Scope:** `packages/client/src/__tests__/contexts/AuthContext.test.tsx`, `.../contexts/ShiftContext.test.tsx`, `.../pages/Credits.test.tsx`, `.../pages/EmployeeRoster.test.tsx`; `vitest.config.ts` threshold raise; `MISSION.md`; `TASKS.md`; `ROADMAP.md`.
- **Out of Scope:** production source; new dependencies; new suites; removal or modification of unreachable defensive guards (Credits delete-reason / edit-reason early returns are blocked by disabled buttons and remain intentionally uncovered — removal would require an ACP).
- **Conventions:** empirical thresholds with headroom (M-43/M-45/M-46 pattern); `vi.hoisted` for per-test token mocks; failure mocks use `{ error }` bodies so `safeJson(...).error` exercises the intended branch.

## 4. Referenced Architecture
M-43 (coverage-gate pattern), M-45/M-46 (page-suite conventions), M-42 (`**Type:**` convention), M-44 (hook hardening), ACP-005 (pre-commit lock), AGENTS.md Rules 11/16/23/28, AVP-001 (6-gate lock suite).

## 5. Verification Gates (Rule 11)
- [x] Functional Verification: `vitest --coverage` green at raised thresholds (355 tests); red-proof executed and logged in §2.
- [x] AVP-001 Architecture Verification: passed via lock gates.
- [x] Evidence Package: this document + TASKS/ROADMAP rows + M-49 evidence packet.
- [ ] User Approval — commit is the Rule 11 approval moment (ACP-005).

## Deferred Decision (Rule 10)
- Unreachable defensive guards in Credits.tsx remain uncovered by design: `handleDelete` requires `deleteReason` and `handleSubmit` edit mode requires `editReason`, but both submit buttons are `disabled` when the guard condition holds, so the guards cannot be reached via the UI. Reason: coverage discipline — do not test unreachable UI states; guards are cheap insurance. Impact: those statement branches (~6 lines) stay at 0% coverage. Future mission: evaluate guard removal via ACP if branch-100% is ever required.

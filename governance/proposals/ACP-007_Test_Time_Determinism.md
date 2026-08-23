# Proposal: ACP-007 Test Time Determinism Standard

**Status:** Implemented (2026-08-23)
**Lifecycle:** Draft → Discussion → **Approved** → **Implemented** → Closed
**Approval:** Product Owner directive (2026-08-23): "now resolve one at a time" — authorized M-79 hotfix + standard adoption.
**Mission:** M-79 TD-054 Hotfix + ACP-007 Standard

## 1. Context and Problem Statement

Mission M-78 (Range Guards + History Loading Feedback) was locked on 2026-08-22 with evidence claiming 470/470 tests passing. On 2026-08-23 the suite is red at HEAD `3d8a35d` (469/470):

- `Expenses.test.tsx:712` ("TD-047: invalid range shows hint and skips refetch") sets only `From` to the hardcoded date `"2026-08-23"` and relies on `To` defaulting to wall-clock today (`Expenses.tsx:51-56`, `new Date().toISOString().slice(0, 10)`).
- While today < 2026-08-23, `To < From` → guard fires → test passes.
- On 2026-08-23 exactly, `From === To` → guard never fires → hint absent → `getByText` fails (`Expenses.test.tsx:721-723`). The failure is permanent from this day forward.

The Keno and GameSales equivalents are immune because they set **both** inputs explicitly (`GameSales.test.tsx:515-520`, `Keno.test.tsx:~585-592`), making them deterministic.

Root cause is systemic, not local: nothing in the Testing Constitution or verification gates forbids mixing hardcoded dates with wall-clock-derived component defaults. Any such pairing is a latent time bomb that detonates silently after lock.

## 2. Proposed Solution

Adopt a repository standard: **tests must be deterministic with respect to time.**

1. **Explicit-inputs rule:** any test that drives date-range guards must set *every* date input involved (never rely on a component's wall-clock default to produce the inequality being tested).
2. **Frozen-clock option:** where a test genuinely needs "today", pin it via Vitest fake timers (`vi.setSystemTime`) in that test's scope — never globally in `setupTests.ts`.
3. **Enforcement (lightweight, no new tooling):**
   - Add the rule to the Testing Constitution section of `AGENTS.md` (Rule 28 scope).
   - Extend the mission Evidence Payload checklist with one line: "No new/modified test depends on wall-clock time."
4. **Immediate remediation (TD-054):** fix `Expenses.test.tsx:712` to set `To` explicitly (mirror GameSales/Keno pattern), restoring green suite; record under proposed hotfix mission (M-79).

## 3. Alternative Options

- **Fix only the failing test, no standard.** Rejected: whack-a-mole; the next date-dependent test reintroduces the same silent rot after its lock date.
- **Globally freeze time in `setupTests.ts`.** Rejected: global mocking hides accidental real-time dependencies in production code paths, violates the spirit of Rule 28 (no over-mocking), and makes some date-fns behavior tests meaningless.
- **Static lint/ast-grep rule banning literal ISO dates in tests.** Considered as future hardening; rejected for now as over-broad (literal dates are fine when *paired* deterministically). Can be revisited if violations recur.

## 4. Consequences

- **Easier:** suites stay green indefinitely after lock; evidence payloads remain truthful over time; no surprise red gates blocking unrelated commits.
- **Harder:** slightly more verbose date setup in tests; one additional Evidence Payload checkbox per mission.
- **Risk if rejected:** every future date-related test is a potential delayed failure; M-78-style evidence drift recurs (claimed 470/470, reality degrades).

## 5. Affected Documents

- `governance/proposals/ACP-007_Test_Time_Determinism.md` (this file)
- `AGENTS.md` (Testing Constitution / Rule 28 addition — requires approval)
- `governance/ENGINEERING_LIFECYCLE.md` (Evidence Payload gate wording)
- `packages/client/src/__tests__/pages/Expenses.test.tsx` (TD-054 fix)
- `governance/DEBT.md` (TD-054 closure reference)

## 6. Action Items

- [x] Product Owner approves or rejects this proposal (directive 2026-08-23)
- [x] On approval: add time-determinism clause to AGENTS.md Rule 28 + lifecycle evidence wording
- [x] Authorize hotfix mission (proposed M-79) to resolve TD-054 (Red→Green per ADR-006)
- [x] Re-run full suite; verify 470/470 restored

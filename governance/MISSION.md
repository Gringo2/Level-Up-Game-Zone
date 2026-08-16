# CURRENT MISSION

**Type:** Infrastructure
**Mission:** M-45 Client Page Unit Coverage — Cohort 1 (Dashboard, AuditLogs, Expenses, GameSales, Keno)
**Status:** Locked

## 1. Objective
Bring the first cohort of client pages under unit/component test coverage (src/pages currently at 1.34% overall — only Login tested; page coverage was explicitly deferred from M-43 by design):
1. **Write 5 page suites:** `Dashboard`, `AuditLogs`, `Expenses`, `GameSales`, `Keno`. Each suite covers: loading state → data render → empty state → fetch-error toast (negative paths per Rule 28). `Dashboard` additionally covers the variance calculation, close-shift flow (variance > $2 requires reason), float-update flow, and the safe-slip print block.
2. **Add a pages coverage gate:** extend the existing per-directory thresholds in `vitest.config.ts` with `packages/client/src/pages/**`, set empirically from measured coverage (untested pages drag the page-average down, so the floor starts conservative and is raised in M-46).
3. **Red-proof the gate** (Rule 28): excluding the page suites must trip the pages threshold.

## 2. Evidence Payload
- [x] Functional — 5 new suites green; page coverage rises from 1.34% to a measured level ≥ the empirical threshold; Red-proof (page tests excluded) trips the pages threshold; success metric: `npx vitest run --coverage` passes at lock with the new threshold enforced.
- [x] Architectural — zero production-source change; test-only + vitest config; AVP-001 depcruise 0 violations; no new dependencies.
- [x] Dependency — no packages added; `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` already present in client devDependencies (Rule 25 — reuse).
- [x] ADR compliance — consistent with ADR-002 governance routing, ADR-007 guardrail intent, AGENTS.md Rule 28 (Test-Negative: Red-Green gating) and Rule 22 (AVP-001 fitness functions).

## 3. Scope & Boundaries
- **In Scope:** `packages/client/src/__tests__/pages/{Dashboard,AuditLogs,Expenses,GameSales,Keno}.test.tsx` (new); `vitest.config.ts` (pages threshold); `governance/MISSION.md`, `governance/TASKS.md`, `governance/ROADMAP.md`.
- **Out of Scope:** production source; Layout (0% — e2e-covered); Admin, Credits, EmployeeRoster, Reports, SalaryReport (deferred to M-46, ~2,500 lines); e2e changes; new dependencies.
- **Test conventions applied:** real `Response` objects with JSON content-type for `fetch` mocks (M-43 headerless-mock lesson); `process.env.TZ = "UTC"` pinned where date-boundary assertions depend on shop-time boundaries (M-43 lesson); firebase/auth-context/shift-context modules mocked at module level.

## 4. Referenced Architecture
- AGENTS.md Rule 28 (Test-Negative Validation — mandatory Red-Green gating and negative-path coverage), Rule 16 (Verification & Anti-Assumption — probes before/after), Rule 22 (AVP-001 fitness functions), Rule 25 (Reusability — no new tooling).
- M-43 record (page coverage deferral + established client test conventions).
- ADR-002 (governance routing); ADR-007 (mission_gate guardrail — this mission declares `**Type:** Infrastructure`).

## 5. Verification Gates (Rule 11)
- [x] Functional Verification: 5 page suites green; pages coverage ≥ empirical threshold; Red-proof recorded (page suites excluded → threshold trips).
- [x] AVP-001 Architecture Verification: passed via lock gates.
- [x] Evidence Package: this document + TASKS/ROADMAP rows + archived M-45 packet.
- [x] User Approval — approved 2026-08-16 (technical design review).

## Deferred Decision (Rule 10)
- **Deferred:** page coverage for Admin, Credits, EmployeeRoster, Reports, SalaryReport (≈2,500 lines) and Layout.
- **Reason:** single-mission scope protection; the five CRUD/dashboard pages share one test pattern (fetch + toast) and are the highest-value first cohort.
- **Impact:** pages threshold floor reflects the cohort average; remaining pages stay e2e-covered until M-46.
- **Future Mission:** M-46 raises the pages threshold after covering the remaining five pages + Layout.

## Review Resolution (pre-commit, 2026-08-16)
Post-lock review observations for M-45 resolved before the Product Owner commit:
1. **Two test failures on first run (P2):** AuditLogs "truncates uids" — duplicate truncated uid `01234567...` in two log rows caused `getByText` multi-match; resolved by giving `updateLog` a distinct uid (`ABCDEFGHIJ`). Expenses "logs a new POST" — POST mock echoed the fixture description instead of parsing the submitted body; resolved by parsing `init.body` and echoing submitted values.
2. **tsc errors across all 5 suites (P1):** `AuthContextType` requires `loading: boolean`; `ShiftContextType` requires `missedData: MissedDataPayload | null`; module-level `managerUser` const widens `role` to `string`; `shift` const widens `status` to `string`. Resolved: added `loading: false` / `missedData: null` to every `useAuth`/`useShift` mockReturnValue, and applied `as const` to `role` and `status` literals.
3. **biome formatting (P1):** all 5 test files emitted canonical reformats on first pass; resolved with `biome check --write` before the lock run. No production-source impact.

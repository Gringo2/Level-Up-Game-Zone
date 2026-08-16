# CURRENT MISSION

**Type:** Infrastructure
**Mission:** M-46 Client Page Unit Coverage — Cohort 2 (Admin, Credits, EmployeeRoster, Reports, SalaryReport, Layout)
**Status:** Active

## 1. Objective
Cover the 6 remaining untested client pages/layouts to close the last gap in the pages coverage sweep:
1. **Write 6 suites:** `Admin`, `Credits`, `EmployeeRoster`, `Reports`, `SalaryReport` (in `__tests__/pages/`) + `Layout` (in new `__tests__/layouts/` directory).
2. **Raise the pages threshold** from the M-45 floor (40/35) to an empirically measured value reflecting 100% page coverage.
3. **Add a layouts threshold** (`packages/client/src/layouts/**`) set empirically from measured Layout coverage.
4. **Red-proof the gate** (Rule 28): excluding the new suites must trip the pages threshold.

## 2. Evidence Payload
- [x] Functional — 6 new suites (52 tests) green; 311 total; pages coverage 84.98% lines / 86.41% functions; layouts 100% lines / 100% functions; thresholds raised from M-45 floor; Red-proofed (M-46 suites excluded → pages 43.78% < 80%, functions 40.37% < 85%, layouts 0% < 90%/100%).
- [x] Architectural — zero production-source change; test-only + vitest config; no new dependencies.
- [x] Dependency Graph Clean — no new imports or dependency changes; test-only mission.
- [x] ADR compliance — consistent with ADR-002 governance routing, AGENTS.md Rule 28 (Test-Negative) and Rule 22 (AVP-001).

## 3. Scope & Boundaries
- **In Scope:** `packages/client/src/__tests__/pages/{Admin,Credits,EmployeeRoster,Reports,SalaryReport}.test.tsx` (new); `packages/client/src/__tests__/layouts/Layout.test.tsx` (new directory + file); `vitest.config.ts` (thresholds); `governance/{MISSION,TASKS,ROADMAP,SYSTEM_CONTEXT}.md`.
- **Out of Scope:** production source; e2e changes; new dependencies; any file outside the listed paths.
- **Test conventions:** real `Response` objects with JSON content-type; `process.env.TZ = "UTC"` pinned where date-boundary assertions depend on TZ; firebase/sonner/context modules mocked at module level; `loading: false` in all `useAuth` mocks; `missedData: null` in all `useShift` mocks.

## 4. Referenced Architecture
- AGENTS.md Rule 28 (Test-Negative Validation — Red-Green gating), Rule 16 (Verification & Anti-Assumption), Rule 22 (AVP-001 fitness functions), Rule 25 (Reusability — no new tooling).
- M-45 record (page coverage cohort 1, threshold floor set, conventions established).
- ADR-002 (governance routing); ADR-007 (mission_gate guardrail).

## 5. Verification Gates (Rule 11)
- [x] Functional Verification: 52 new tests green; 311 total; pages threshold 80/85; layouts 90/100; Red-proof recorded.
- [x] AVP-001 Architecture Verification: passed via lock gates.
- [x] Evidence Package: this document + TASKS/ROADMAP rows + archived M-46 packet.
- [x] User Approval — approved (technical design review, 2026-08-17).

## Deferred Decision (Rule 10)
- None. This mission completes the client page coverage sweep. All pages and layouts are now under unit test.

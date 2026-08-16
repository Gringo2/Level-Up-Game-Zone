# CURRENT MISSION

**Type:** Infrastructure
**Mission:** M-43 Client Coverage — Un-ghost .tsx Suites & Add Client Coverage Gate
**Status:** Locked

## 1. Objective
Bring the client-side test surface under the vitest umbrella and add a client coverage gate to the AVP-001 lock pipeline:
1. **Fix the vitest include glob:** `vitest.config.ts` currently declares `include: ["packages/**/*.test.ts", "packages/**/*.spec.ts"]`, which never matches `.tsx` — the existing `AuthContext.test.tsx` and `ShiftContext.test.tsx` suites are silently excluded from every gate run (verified: `vitest list` = 188 tests, all `.ts`/`.spec.ts`; the two context suites do not execute). Fix: `packages/**/*.{test,spec}.{ts,tsx}`.
2. **Add client unit/component tests:** pure libs (`api.safeJson`, `dateUtils`, `utils.cn`), `ErrorBoundary`, `Login`, `MissedDataBlocker`, plus positive-path coverage for `AuthContext` and `ShiftContext` (currently negative-only).
3. **Add a client coverage gate:** `@vitest/coverage-v8` is installed but unused. Add a coverage config (v8, include `packages/client/src`, exclude `.d.ts`/`main.tsx`/`firebase.ts`/`__tests__`) and run `npx vitest run --coverage` in lock Gate 3. Threshold set empirically after measurement, then Red-proofed per Rule 28.

## 2. Evidence Payload
- [x] Functional — vitest suite grows from 188 to ~200 tests with the two previously-excluded `.tsx` context suites now executing; new lib/component/page suites green; success metric: all suites pass with `.tsx` included and client coverage threshold met.
- [x] Architectural — zero production-source change; test-only + tooling-only (vitest config, lock Gate 3); AVP-001 depcruise 0 violations; no new dependencies (coverage-v8 already installed).
- [x] Dependency — no packages added; `@vitest/coverage-v8` re-used from existing root devDependencies.
- [x] ADR compliance — consistent with ADR-002 governance routing, ADR-007 guardrail intent, AGENTS.md Rule 28 (Test-Negative: Red-Green gating) and Rule 22 (AVP-001 fitness functions).

## 3. Scope & Boundaries
- **In Scope:** `vitest.config.ts` (include glob + coverage config); `.agents/scripts/lock_mission.sh` (Gate 3 coverage flag); new `packages/client/src/__tests__/lib/*`, `__tests__/components/*`, `__tests__/pages/Login.test.tsx`; extended `__tests__/contexts/AuthContext.test.tsx` and `ShiftContext.test.tsx`; `governance/MISSION.md`, `governance/TASKS.md`, `governance/ROADMAP.md`.
- **Out of Scope:** page unit coverage (Admin, Dashboard, Reports, etc. — covered by the 6 existing Playwright e2e specs; recorded as deferred); server-side coverage gating; production source; new dependencies.

## 4. Referenced Architecture
- AGENTS.md Rule 22 (AVP-001 fitness functions), Rule 28 (Test-Negative Validation — mandatory Red-Green gating), Rule 27 (root-cause targeted fixes), Rule 23 (no persistent scratchpads — mutation checks confined to `/tmp`).
- ADR-007 (mission_gate guardrail); ADR-002 (governance routing).
- ENGINEERING_LIFECYCLE.md ACP-019 gates; Type-field convention (M-42 mandate — this record declares `**Type:** Infrastructure`).

## 5. Verification Gates (Rule 11)
- [x] Functional Verification: vitest all-green with `.tsx` included; coverage threshold passes; Red-proofs recorded for both test-failure and coverage-threshold-failure.
- [x] AVP-001 Architecture Verification: passed via lock gates.
- [x] Evidence Package: this document + TASKS/ROADMAP rows + archived M-43 packet.
- [x] User Approval — approved 2026-08-16 (design review).

## Deferred Decision (Rule 10)
- **Deferred:** Harden `lock_mission.sh` Gate-6 AVP checkbox flip regex (`line 230`) from the exact string `- [ ] AVP-001 Architecture Verification: pending.` to a prefix-anchored pattern.
- **Reason:** M-43's own record wrote `pending (flipped by lock script).` (no trailing period), so the flip did not match and the checkbox required a manual correction. The canonical text is fragile against record-writer drift.
- **Impact:** A future mission record that deviates from the exact `pending.` text will again leave the §5 checkbox un-flipped at lock; the record is corrected manually.
- **Future Mission:** fold into the next tooling/governance mission (e.g., commit-hook or script-hardening mission) alongside the evidence-packet versioning and SYSTEM_CONTEXT pointer items already deferred.

## Review Resolution (pre-commit, 2026-08-16)
Post-lock review observations resolved in the M-43 change set before the Product Owner commit:
1. **TZ-dependent date assertion (P2):** `MissedDataBlocker.test.tsx` now pins `process.env.TZ = "UTC"` at module top, making the `date: "2026-01-01"` payload assertion deterministic on any machine (verified: UTC-10 renders `2025-12-31` without the pin).
2. **Headerless fetch mock (P3):** `AuthContext.test.tsx` negative test now uses real `Response` objects with JSON content-type headers and asserts `toast.error("Registration Error: 500 User already exists")` — proving the documented 404→creation→error branch executes instead of the generic catch path.
3. **`window.location` leak (P3):** `ErrorBoundary.test.tsx` restores the original `window.location` descriptor in `afterEach`.
4. **AVP-flip regex brittleness:** remains deferred as recorded above (not silently patched).

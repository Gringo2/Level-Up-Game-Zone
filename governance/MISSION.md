# CURRENT MISSION

**Type:** Debt Resolution (Functional Gap)
**Mission:** M-63 Resolve TD-028 — Credit `reason` Field Round-Trip & Display
**Status:** Locked

## 1. Objective
Close the TD-028 data-model mismatch: the server stores an optional `reason` on credits but the shared type omitted it and no UI could capture or display it. Operators can now record why a credit (IOU) was issued and see that reason in the Credits register and payroll deduction history.

## 3. Scope & Boundaries
- **In Scope:**
  - Shared `Credit` interface += `reason?: string`
  - Credits.tsx: Reason input on create form (POST body), prefill + send on edit (PUT body), muted display line in credit rows, state resets in `cancelEdit`/post-create (stale-reason leak prevention)
  - SalaryReport.tsx: render per-credit reason in Deduction History rows
  - Red-Green tests for all three surfaces
- **Out of Scope:** making `reason` required (validation-policy decision = separate proposal), audit-log UI changes, TD-030/038/040.

## 4. Referenced Architecture
ADR-001 (Thin Client / Composition Roots) — shared type extension + presentation-layer only. Server zero-change (verified: create/update already persist and return `reason`). No new dependencies.

## Design Decisions
- Optional field (not required) — legacy documents lack it; schema already optional (`CreateCreditSchema.reason: z.string().optional()`).
- Body sends reason only when non-empty after trim (conditional spread) — avoids storing empty strings.
- State resets wired in both `cancelEdit` and post-create path (self-review Amendment 1: stale-reason leak prevention).

## Evidence Payload
- [x] Functional Verification: 423/423 unit tests across 34 files green (was 420; +3 new tests, each Red-proven before implementation); `tsc --noEmit` clean; Biome clean.
- [x] Architectural Verification (AVP-001): depcruise exit 0; knip exit 0 (no new exports/deps); shared-type ripple proven safe via server build (`tsc`) exit 0.
- [x] ADR Compliance: ADR-001 upheld — Thin Client boundaries intact.
- [ ] Playwright E2E: not executed — additive optional field + conditional renders fully covered by unit tests; no route/auth/API contract change.

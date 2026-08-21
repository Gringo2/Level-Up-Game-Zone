# CURRENT MISSION

**Type:** Debt Resolution (Functional Defect)
**Mission:** M-62 Resolve TD-027 — Reports Net Profit Ignores Credits
**Status:** Locked

## 1. Objective
Correct the Reports page net profit calculation to subtract pending credit deductions, aligning it with Dashboard semantics and eliminating the overstated profit figure (DEBT.md TD-027).

## 3. Scope & Boundaries
- **In Scope:**
  - `Reports.tsx`: subtract PENDING credits from `netProfit`
  - One Red-Green-proven unit test covering pending-only subtraction
- **Out of Scope:** Dashboard calculation semantics, server reconciliation logic, TD-028 shared Credit type fix, pagination/RBAC debts.

## 4. Referenced Architecture
ADR-001 (Thin Client / Composition Roots) — presentation-layer arithmetic only; no API contract, shared-type, or server changes. No new dependencies.

## Design Decision
Pending-only subtraction mirrors the Dashboard precedent (`Dashboard.tsx` sums `CREDIT_STATUSES.PENDING`): a pending credit is unrecovered staff debt and reduces true profit; Deducted/Resolved credits are already recovered via payroll and must not double-reduce profit. Approved by Product Owner 2026-08-21.

## Evidence Payload
- [x] Functional Verification: 420/420 unit tests across 34 files green (was 419; +1 new test, Red-proven against unfixed code before the fix was applied); `tsc --noEmit` clean; Biome clean.
- [x] Architectural Verification (AVP-001): depcruise exit 0 — no import-graph changes (`CREDIT_STATUSES` import pre-existing); knip surface unchanged (no new exports/deps).
- [x] ADR Compliance: ADR-001 upheld — Thin Client boundaries intact.
- [ ] Playwright E2E: not executed — pure arithmetic change inside one component, fully covered by the new unit test; no route/auth/API surface touched.

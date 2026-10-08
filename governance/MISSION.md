# CURRENT MISSION

**Type:** Defect Remediation  
**Mission:** M-133 Operational Defect Remediation  
**Status:** Locked
**Proposal:** ACP-041 (PO-approved 2026-10-08)  

## 1. Objective
Fix the defects found by the 2026-10-08 semantic trace: TD-059 and TD-063 – TD-069. The critical one is TD-063: shift totals, the Dashboard and the shift close must include the entries made during the shift.

## 2. Context & Root Cause
See `docs/reports/Daily_Monthly_Operations_Semantic_Trace_2026-10-08.md` and ACP-041 §2. Root causes: entries stamped at midnight UTC against a shift window starting at real clock time (TD-063); `undefined` written to Firestore (TD-064); server-local timezone for shop days (TD-065); no close path or window bound for MISSED shifts (TD-066); issue-date attribution (TD-067); recompute at current rate on edit (TD-068); role-gated controls rendered for all roles (TD-059); validation gaps (TD-069).

## 3. Scope & Boundaries
- **In Scope:** the fixes listed in ACP-041 §2, with their tests, plus the governance records.
- **Out of Scope:**
  - Rewriting existing entries or already-closed shifts.
  - Retroactive correction of past variances.
  - Browser-timezone handling in client history ranges (unverified, not part of the trace).
  - Firestore index or SDK-level changes.
  - Mutating git commands (Rule 1).

## 4. Testing Strategy
- **Unit / integration (Vitest):**
  - Red first for every fix: date resolution (including host timezone UTC and New York), `undefined`-free credit writes, shop-day shift logic, MISSED window bound, resolved-date credits query, rate-preserving sale edit, role and validation negatives.
  - Client tests for role gating, missed-shift resolve, payroll attribution and label, empty-date guard, Reports note and format.
- **Real-flow verification:** re-run the synthetic harness (real server code, real UI, fake database) and confirm each earlier reproduction now passes.
- **E2E:** the 26 existing Playwright tests must stay green.
- **Success metric:** the trace scenario shows Dashboard = Reports = hand calculation, and expected cash $120.50 is accepted at close.

## 5. Execution & Verification Gates
- [x] Red-Green Test Verification: every fix proven failing first (shift-day tests under `TZ=UTC`); `dateField` also proven against a flawed implementation; helper and shift tests pass under UTC, New York and Kiritimati hosts.
- [x] Real-Flow Re-verification (harness): real server code and UI on an in-memory database (server on UTC). Dashboard shows the day's entries and the close expects $120.50 (variance $0.00) in Addis Ababa and New York browsers; blank-reason credit saves; manager and staff no longer see admin-only controls; a forgotten shift closes from the Dashboard with totals bounded to its day; September Reports unchanged; deductions land in the month they were deducted; rules suite 49/49.
- [x] Monorepo Fitness Gates: Biome (182 files, 0 errors, 0 warnings), `tsc -b` exit 0, Vitest `--coverage` 850/850 with thresholds met, Playwright 26/26, Knip exit 0, build exit 0.

## 6. Evidence Payload
- [x] Functional Verification: 850/850 Vitest (89 new tests), 26/26 Playwright, and the real-flow re-verification above. Existing tests changed only where behaviour intentionally changed (listed in the blast radius report).
- [x] Architectural Verification (AVP-001): Biome, TypeScript, Vitest, Playwright and Knip green. Thin Client and Express Backend boundaries intact; the shop timezone is defined once in `@level-up/shared`.
- [x] Dependency Graph Clean: dependency-cruiser 0 violations (163 modules). Blast radius: 9 server modules (12 dependents), 12 client modules (2 dependents), shared constants additive.
- [x] ADR Compliance: ADR-001 (Express Backend authoritative), ADR-006 (Red-Green), ADR-008 (business-date semantics now compatible with shift windows), ADR-004 (blast radius report), ACP-041 §2.
- [x] Traceability: TD-059, TD-063 – TD-069 → ACP-041 → M-133 → `docs/reports/M-133_Blast_Radius_Report.md` → `governance/missions/M-133_OPERATIONAL_DEFECT_REMEDIATION.md`.

# CURRENT MISSION

**Type:** Feature
**Mission:** M-50 Shift Non-Blocking + Backdated Data Entry
**Status:** Locked

## 1. Objective
Remove the MissedDataBlocker hard gate to make the shift system non-blocking, and add date pickers to all 4 financial forms (GameSales, Keno, Expenses, Credits) for backdated data entry. All shift infrastructure (open/close/reconciliation, Safe Slip, auto-open via `GET /missed`) remains intact.

## 2. Evidence Payload
- [x] Functional — 381/381 tests passing; MissedDataBlocker removed (12 tests deleted); resolve-missed tests removed; date pickers added to 4 forms; `date` field added to 4 create schemas + handlers; all POST body assertions updated with `date: expect.any(String)`.
- [x] Architectural — MissedDataBlocker component deleted; `POST /resolve-missed` endpoint removed; `ResolveMissedDaySchema` removed; ShiftContext cleaned (missedData removed, auto-open kept); ADR-008 documents the decision; ACP-006 records the change proposal.
- [x] Dependency Graph Clean — no new imports/dependencies; only component/schema/route removals and date field additions.
- [x] ADR Compliance — ADR-008 (Non-Blocking Shifts + Backdated Entry); AGENTS.md Rules 11 (verification gates), 16 (verify), 28 (red-proof via test removal + date assertions).

## 3. Scope & Boundaries
- **In Scope:** MissedDataBlocker deletion, ShiftContext cleanup, resolve-missed removal, date field on 4 schemas/handlers, date pickers on 4 forms, test updates.
- **Out of Scope:** Shift open/close/reconciliation logic (unchanged), Safe Slip (unchanged), `GET /missed` auto-open (unchanged), shift reporting (unchanged).

## 4. Referenced Architecture
ACP-006 (Shift Non-Blocking + Date Pickers), ADR-008 (Non-Blocking Shifts + Backdated Entry), AGENTS.md Rules 11/16/28.

## 5. Verification Gates (Rule 11)
- [x] Functional Verification: 381/381 tests passing; Biome clean; TypeScript clean.
- [x] AVP-001 Architecture Verification: passed via lock gates.
- [x] Evidence Package: this document + TASKS/ROADMAP rows + M-50 evidence packet.
- [ ] User Approval — commit is the Rule 11 approval moment (ACP-005).

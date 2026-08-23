# CURRENT MISSION

**Type:** QA / Test Integrity
**Mission:** M-79 TD-054 Hotfix — Deterministic Expenses Range-Guard Test (+ ACP-007 Standard)
**Status:** Active

## 1. Objective
1. **TD-054** — Restore suite to Green at HEAD: `Expenses.test.tsx` "TD-047" case is a time bomb (hardcoded `From=2026-08-23` vs wall-clock default `To`); detonated on 2026-08-23 (From === To → guard never fires). Fix by setting both inputs explicitly (mirror Keno/GameSales pattern).
2. **ACP-007 (Approved 2026-08-23, PO directive "resolve one at a time")** — Codify Test Time Determinism standard: explicit-inputs rule, scoped `vi.setSystemTime` option, Evidence Payload wording, AGENTS.md Rule 28 amendment.

## 3. Scope & Boundaries
- **In Scope:** `packages/client/src/__tests__/pages/Expenses.test.tsx` (TD-047 case only); governance docs (`DEBT.md`, `ACP-007`, `AGENTS.md`, `ENGINEERING_LIFECYCLE.md`, this file).
- **Out of Scope:** Production source changes; Biome warning backlog (41 warnings); other TD items.

## Design Notes
- Red state already evidenced pre-mission: 469/470 at HEAD `3d8a35d` (Expenses TD-047 fails via `getByText` timeout at line 721).
- Fix sets `To="2026-08-20"` explicitly → invalid range independent of clock. Expenses has no Apply/Today control (effect-driven), so no reset assertion needed.
- SYSTEM_CONTEXT.md is lock-script-owned (SSOT sync) — not hand-edited.

## Testing Strategy (Rule 28)
Red captured first (2026-08-23, pre-fix). Post-fix: targeted test Green, then full suite must return 470/470. Negative path preserved (asserts hint shown AND fetch count unchanged).

## Evidence Payload
- [x] Functional Verification: full suite 470/470 (Red 469/470 captured first)
- [x] AVP-001: tsc=0 | Biome(changed files)=0 (1 pre-existing warning at HEAD, line 11 noUnusedImports — backlog, not introduced) | knip=0 | depcruise ✔

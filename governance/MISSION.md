# CURRENT MISSION

**Type:** UX Polish
**Mission:** M-78 Range Guards + History Loading Feedback (TD-047/TD-048)
**Status:** Locked (2026-08-22)

## 1. Objective
On Keno, GameSales, AND Expenses history/filter cards:
1. **TD-047** — When From > To: block refetch, show inline hint "From date must be on or before To", provide a "Today" reset control (Keno/GS Apply pages).
2. **TD-048** — Visible in-flight feedback on history fetches: `listLoading` state driving a spinner in/near the trigger + disabled Apply during flight (auto-effect pages show inline spinner).

## 3. Scope & Boundaries
- **In Scope:** Keno.tsx, GameSales.tsx, Expenses.tsx history/filter cards + their test files only.

## Design Notes
- ISO string compare (`from > to`) suffices — both inputs are yyyy-mm-dd.
- Guards live BOTH in UI (disabled/hint) and at loader entry (early-return) — belt & braces.
- Expenses has no Apply button (effect-driven): guard = early-return + hint; loading = inline Loader2 by the date row.

## Testing Strategy (Rule 28)
6 Reds first (2/page): invalid-range blocks fetch & shows hint & Today resets (Keno/GS) or no-fetch (Expenses); deferred-fetch shows loading indicator until resolve.

## Evidence Payload
- [x] Functional Verification: 464→470/470 / 34 files (+6 Reds captured first, all green post-impl)
- [x] AVP-001: tsc=0 | Biome=0 | knip=0 | depcruise ✔

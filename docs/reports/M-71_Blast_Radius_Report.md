# M-71 Blast Radius Report — GameSales History Parity

Date: 2026-08-22

## Change Surface
`GameSales.tsx`, `Keno.tsx` (refactor onto shared lib), `lib/history.ts` (new), both page test files. Presentation only — zero API/contract changes.

## Key Decisions
- Rule-25 dedup: one generic `groupLogsByDay<T>(logs, getValue)` serves KenoLog.net_profit and GameSalesLog.calculated_total; no keno-specific clone left in pages.
- Row text `"N units @ $R = $T"` preserved verbatim → all pre-existing assertions untouched.
- Per-row datetime → time-only (date in headers), mirroring M-70 A1.

## Test-Design Note
GS fixture rows must vary BOTH `quantity_sold` and `calculated_total` (server-computed display field) to keep getByText queries unique and banner math honest. Reds captured pre-implementation: 3 failed as designed.

## Regression Certification
vitest **453/453 / 34 files** | tsc=0 | knip=0 | depcruise ✔ (148 modules, 442 deps) | Biome=0.

## Review Pass (2026-08-22 — probe-based, no assumptions)

**Containment:** footprint exactly 12 paths (8 modified + 4 untracked), all in the commit manifest; zero scratch files; `lib/history.ts` consumers = {Keno.tsx, GameSales.tsx, Keno.test.tsx} only.

**Empirical probes:**
- `groupLogsByDay` via transient tsx probe (deleted after): 2-day bucketing, weekday labels, negative-net subtotal (10−4=6), order preservation, empty→[].
- `historyPageBounds` edges: totals 0/1/5/6/11 → pageCount 1/1/1/2/3; clamp(9) safe at every boundary; slices [0,5]/[5,10]/[10,15] — semantics identical to the pre-extraction inline math.
- C1 guards byte-preserved through both refactors: Keno Edit/Delete `!!editingId || !!verifyingId || deletePending`, Verify `!!verifyingId || deletePending`; GS Edit/Delete `!!editingId || deletePending`; loadingDefaults untouched.

**Findings & fixes:**
1. `DayGroup` was an exported type with zero consumers (knip gap) → de-exported to private interface. Re-certified after fix.
2. Formatting drift on history.ts / GameSales.test.tsx from scripted edits → biome --write, rescan clean.

**Post-fix certification:** vitest **453/453 / 34 files** | tsc=0 | knip=0 | depcruise ✔ (148 modules, 442 deps) | Biome touched=0.

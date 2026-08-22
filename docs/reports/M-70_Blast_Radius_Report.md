# M-70 Blast Radius Report — Keno History Day Groups + Pagination

Date: 2026-08-22

## Change Surface
`Keno.tsx` (+ its test file) only. Presentation layer: grouped rendering, slim rows, client pagination. Zero API/contract/shared-type changes. New exports: `groupKenoLogsByDay`, `KENO_PAGE_SIZE`.

## Behavioral Changes (documented)
- Per-row datetime → time-only (`h:mm a`); date context moves to day headers (supersedes B1 presentation).
- Legacy sales/payouts line compacted to inline `Sales $X · Payouts $Y`.
- Three existing tests migrated accordingly; B1-era test repurposed to assert header-based dating.

## Error Traceability (Rule 26/27)
During implementation, a python splice anchored on non-unique `					</CardContent>` matched the FORM card's closer (earlier in file), replaying the form tail + entire old history card after the new block (biome/tsc parse failures). RCA: index()-based anchors without uniqueness guards. Fix: uniqueness-guarded markers anchored on mission-unique pager text; 4,929 junk bytes excised in one operation; structure proven via marker counts + full green battery. Lesson recorded: structural edits must use edit-tool oldString matching (uniqueness-enforced) rather than raw index() splices for JSX regions.

## Regression Certification
vitest **449/449 / 34 files** | tsc=0 | knip=0 | depcruise ✔ (147 modules, 439 deps) | Biome touched files = 0.

## Amendment A1 (2026-08-22) — Single Period Total
PO clarified: day-header subtotals read as replicated nets. Removed chips; `keno-range-summary` promoted to banner (entries left / colored `Net $X` right). Zero contract change; 449/449, tsc=0, knip=0, depcruise ✔ re-run post-amendment.

## M-71 Follow-up (2026-08-22) — Parity + Helper Extraction
GameSales mirrored; helpers generalized to `packages/client/src/lib/history.ts` (`groupLogsByDay<T>(logs, getValue)`, `HISTORY_PAGE_SIZE`, `historyPageBounds`) and Keno consumes them — single source of truth, no duplication. GS blast radius identical in kind to M-70; suite 453/453.

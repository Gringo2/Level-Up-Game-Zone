# M-78 Blast Radius Report — Range Guards + Loading Feedback

Date: 2026-08-22

## Change Surface
Keno.tsx / GameSales.tsx / Expenses.tsx (loader guards, listLoading state, hint + spinner/Today UI) and their three test files. Zero contract/server changes.

## Implementation Notes
- Guards enforced at BOTH UI layer and loader entry (early return) — defense in depth against programmatic invocation.
- ISO yyyy-mm-dd string comparison is the validity check; no date lib needed.

## Error Traceability
1. Raw `new Response(body)` lacks JSON content-type → safeJson returns {} → downstream `.sort` crash. Tests now use jsonResponse helper.
2. Shared deferred Response across two mount GETs → Body-already-read. URL-branched stubs.
3. TestingLibrary getNodeText matches only DIRECT text nodes — GS slim-row phrase spans nodes; anchors moved to sales-range-summary testid.

## Regression Certification
vitest **470/470 / 34 files** | tsc=0 | knip=0 | depcruise ✔ (148 modules) | Biome touched=0. Reds: 6 captured pre-implementation.

## Review Pass (2026-08-22 — probe-based)

**Footprint:** 9/9 paths match manifest. Page diffs are **purely additive** (Expenses +16, GameSales +27, Keno +27, 0 deletions). Zero probe/console leftovers (backup-restore verified by grep).

**Containment probes:**
- Guard order correct on all three loaders: invalid-range early-return sits BEFORE `setListLoading(true)` → no stuck spinner on rejected ranges.
- Hint string and `history-loading` testid: exactly 1 occurrence per page (grep-proven consistency).
- Mutation interplay unchanged: Keno/GS create/edit/delete still update local state optimistically; loaders fire only from mount/visibility/Apply (pre-existing TD-049 prepend behavior untouched).
- Expenses Today-control intentionally absent (auto-effect page, per approved design notes).

**Refinement applied during review:** "Today" button now `disabled={listLoading}` on Keno/GS — prevents a second fetch racing an in-flight one (TD-048's complaint generalized to the new control).

**Post-review certification:** vitest **470/470 / 34 files** | tsc=0 | knip=0 | depcruise ✔ | Biome touched=0.

# CURRENT MISSION

**Type:** Debt Resolution (TD-046)
**Mission:** M-67 Game-Log History Browsing on Entry Pages
**Status:** Locked (2026-08-22)

## 1. Objective
Give operators direct access to game-log history on the GameSales and Keno pages via Reports-style date-range browsing, and eliminate Keno's fetch-all-then-discard payload waste. PO-approved design 2026-08-21: Plan A (range pickers on entry pages), default range = today.

## 3. Scope & Boundaries
- **In Scope:**
  - `Keno.tsx`: server-side range params replace client-side fetch-all+filter; dual date inputs + Apply defaulting to shop-day "today"; period-aware empty state/description
  - `GameSales.tsx`: same range controls over its existing ranged query
  - Reuse `getShopStartOfDay/getShopEndOfDay(date)` for picked-date boundary construction (Rule 25)
  - Server: no behavior change; add missing direct range-query tests for keno + sales endpoints (currently zero coverage — grep-verified)
  - Client tests: default-param assertions, range-change refetch flows, empty-state wording (Red-Green against current code)
- **Out of Scope:** Credits/Expenses pages (same pattern, not in TD-046 scope); Dashboard aggregates; Reports.tsx; any backend endpoint/schema changes.

## 4. Referenced Architecture
ADR-001 (Thin Client; Express owns queries) — pages only gain query-parameter expression of user intent. ADR-008 adjacency: backdated entry unaffected; history browsing complements it. No new dependencies.

## Design Decisions (PO-approved)
1. Default range = shop-day today (zero workflow change on load); custom ranges are explicit Apply actions.
2. Entry forms untouched — browsing window is independent of entry-date picker.
3. Keno aligns to GameSales' server-side filtering pattern (consistency + payload fix in one move).

## Evidence Payload
- [x] Functional Verification: 435/435 tests / 34 files green (incl. +8 new: 2 server range-exclusion, 2 client param/refetch per page pair); Keno default = shop-day today via server params; Apply refetches custom ranges; GameSales rates loader isolated to mount
- [x] Architectural Verification (AVP-001): tsc=0 | knip=0 | depcruise "no violations (147 modules, 439 deps)" | Biome all touched=0 — blast radius git-verified to exactly the 8 mission paths (docs/reports/M-67_Blast_Radius_Report.md)
- [x] ADR Compliance: ADR-001/ADR-008 upheld — zero server source changes; client expresses range intent via existing query contract
- [ ] Playwright E2E: not executed unless requested

## Test-Negative Protocol (Rule 28)
New param/refetch tests fail naturally against current code (no params sent / fetch-all path). Server range tests assert filtered results AND a bounded-range exclusion case (entry outside range absent).
**Executed:** server exclusion tests are behavioral — mock Firestore honors only captured `where` bounds; an implementation ignoring range returns both docs and fails the `[in-range]` assertion. Call-shape-only assertions were rejected in favor of this form.

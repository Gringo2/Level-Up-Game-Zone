# CURRENT MISSION

**Type:** UX Gap Resolution
**Mission:** M-68 Entry-Page Hardening — Numeric Integrity, History Readability, Action Safety
**Status:** Locked (2026-08-22)

## 1. Objective
Close the PO-selected UI/UX gaps on GameSales and Keno entry pages: silent-$0 keno entries (A1), time-only keno rows breaking multi-day browsing (B1), missing period summaries (B2), unguarded row actions (C1), and error toasts that hide server reasons (C2).

## 3. Scope & Boundaries
- **In Scope:**
  - A1: server `finiteNumber` helper (null/""→NaN preprocess + Number.isFinite refine; **negatives stay legal**) applied to keno create/update `net_profit`; client pre-submit `Number.isFinite(parseFloat(netAmount))` guard with explicit toast
  - B1: Keno rows adopt GameSales date format `"MMM d, h:mm a"`
  - B2: period summary line under range controls on both pages — "N entries · Net $X" (Keno) / "N sales · Total $X" (GameSales), computed from displayed logs
  - C1: row-action in-flight guards — ConfirmDialog `loading` prop during delete; `verifyingId` flag for Keno Verify; sibling row actions disabled while any row action is pending
  - C2: all fetch catch sites in both pages toast `err.message` (server text is M-65-sanitized) with current strings as fallback
- **Out of Scope:** B3 (From>To guard), B4 (list-loading states), B5 (pagination), C3 (range re-check prepend), D1 (aria-labels), any Reports/Dashboard changes, layout restructuring.

## 4. Referenced Architecture
ADR-001 (Thin Client) — all changes are presentation/validation-layer; zero endpoint or collection changes. Schema hardening extends existing zod helper family in `schemas/index.ts` (house pattern). Reuse mandates honored: ConfirmDialog.loading exists (Rule 25), no new dependencies.

## Design Decisions (defaults stated; PO may veto before lock)
1. Summary line reflects the fetched list only (updates after each successful refetch) — never speculative math from picker values.
2. Date format unconditional (no today-special-casing) — consistency over cleverness.
3. `finiteNumber` rejects explicit `null` and `""` (the JSON-NaN hole) while coercing numeric strings; absent field on PUT stays legal via outer `.optional()`.
4. Toast surfacing limited to Error instances' messages; non-Error throws keep fallback strings.

## Evidence Payload
- [x] Functional Verification: 436 → 444/444 tests / 34 files green. A1: server rejects null/"" keno net (3 Red→Green), negatives stay legal; client `parseNetAmountInput` full-string guard. B1: keno rows dated. B2: range summaries both pages. C1: verify/delete in-flight guards + dialog loading state. C2: toasts surface server messages (9 assertions migrated)
- [x] Architectural Verification (AVP-001): tsc=0 | knip=0 | depcruise ✔ (147 modules, 439 deps) | Biome=0 — blast radius in docs/reports/M-68_Blast_Radius_Report.md
- [x] ADR Compliance: ADR-001 upheld — zero endpoint/collection changes; schema tightening only
- [ ] Playwright E2E: not executed unless requested

## Test-Negative Protocol (Rule 28) — Executed
Server Reds captured pre-fix: POST `{net_profit:null}`, `{net_profit:""}`, PUT `{net_profit:null}` all failed against coerce-to-0; negative-net test passed pre-change (over-tightening guard). Client: jsdom sanitizes number inputs (garbage change-events become "") making an integration-level guard test vacuous — replaced with table-driven unit tests of the extracted pure `parseNetAmountInput` (which also caught a parseFloat-truncation hole: "1e-" parsed as 1; helper now uses Number() semantics matching server z.coerce). C2 migration = 9 generic-toast assertions updated to surfaced server messages.

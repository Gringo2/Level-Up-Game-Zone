# CURRENT MISSION

**Type:** UX Parity
**Mission:** M-71 GameSales History — M-70 Treatment (Day Groups, Slim Rows, Pagination, Period Banner)
**Status:** Locked (2026-08-22)

## 1. Objective
Apply Keno's final (post-A1) history design to GameSales: weekday+date day-group headers (no per-day totals), slim single-line rows, client-side 5-rows/page pagination with reset-on-refetch, single prominent period-total banner.

## 3. Scope & Boundaries
- **In Scope:** new `lib/history.ts` shared helpers (generic `groupLogsByDay`, `HISTORY_PAGE_SIZE`) consumed by BOTH pages (Keno refactored onto them — dedup per Rule 25); `GameSales.tsx` render/state; both test files.
- **Out of Scope:** server contracts (TD-032 open), verification workflow for GS (TD-051), unit_type persistence (TD-052), row text changes beyond density (`"N units @ $R = $T"` preserved).

## 4. Referenced Architecture
ADR-001 Thin Client — presentation only. Row time becomes `h:mm a` (date in headers — same B1 supersede as M-70).

## Testing Strategy (Rule 28)
GS Reds captured FIRST: pager bounds/nav/reset, weekday headers present + subtotal absence, banner total. Existing `"2 units @ $5.00"` assertions must survive untouched.

## Evidence Payload
- [x] Functional Verification: 449→453/453 / 34 files (+4 GS tests; Keno helper tests migrated to shared lib)
- [x] AVP-001: tsc=0 | Biome=0 | knip=0 | depcruise ✔ (148 modules — +1 new lib/history.ts)

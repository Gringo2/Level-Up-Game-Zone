# CURRENT MISSION

**Type:** Debt
**Mission:** M-93 Filter-Aware History Updates
**Status:** Locked

## 1. Objective
Keep the active history list truthful after a successful create or edit operation by ensuring a record remains visible only when its persisted date falls within the currently selected range. This mission addresses the remaining client-side state mismatch behind C3 without broadening the scope to backend or shared-contract work.

## 3. Scope & Boundaries
- **In Scope:**
  - Harden Game Sales update behavior against the active `rangeStart`/`rangeEnd` filter.
  - Harden Keno update behavior against the active `rangeStart`/`rangeEnd` filter.
  - Preserve backdated entry capability and shop-local date semantics.
  - Add negative and positive mutation-range regression coverage.
- **Out of Scope:**
  - Backend routes, controllers, schemas, or database changes
  - Changing the allowed backdating capability
  - Changes to Expenses or Credits history behavior
  - Date-picker redesign, pagination, or row visual hierarchy
  - New dependencies or shared state abstractions
  - Unsupported date-edit semantics beyond the active-range invariant

## 4. Design Notes
- Root cause: update mutation handlers replaced returned records without checking whether the persisted date still belongs to the active range.
- Fix direction: use the existing filter state and `getShopDateString(new Date(record.date))`; keep only records whose shop-local date is inclusively within the active range, and remove out-of-range records from local state after successful mutations.
- Blast radius: client state consistency in Game Sales and Keno; no API, shared contract, or server schema changes were introduced.
- Acceptance criteria: in-range edits remain visible, out-of-range edits disappear, active filter values and backdating behavior remain unchanged, and no duplicate fetch or mutation is introduced.

## 5. Testing Strategy
- Page tests: Game Sales and Keno cover in-range and out-of-range updates.
- Negative coverage: non-matching records are absent from the rendered list immediately after a successful edit.
- Time determinism: tests use explicit fixed date inputs and no wall-clock assertions.
- Validation criterion: focused tests, TypeScript, Biome, and mission lock gates pass.

## 6. Evidence Payload
- [x] Functional Verification: focused page regression suite passed (70/70), and the repo-level AVP-001 lock gate was run with the mission in the required verified state.
- [x] Architectural Verification (AVP-001): maintained Thin Client limits, preserved server-authoritative responses, and kept the fix local to the two client history pages.
- [x] Dependency Graph Clean: no forbidden dependency propagation detected; blast-radius report recorded in `docs/reports/M-93_Blast_Radius_Report.md`.
- [x] ADR Compliance: preserves Thin Client boundaries, shop-local date semantics, and the approved history filter invariant.
- [x] User Approval: implementation approved and mission locked 2026-09-21

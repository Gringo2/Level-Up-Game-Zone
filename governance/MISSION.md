# CURRENT MISSION

**Type:** Debt
**Mission:** M-92 Filter-Aware History Mutations
**Status:** Locked

## 1. Objective
Prevent a newly created backdated Game Sales or Keno entry from appearing in a history list that does not include its saved date. The active date filter must remain truthful immediately after a successful create mutation.

## 3. Scope & Boundaries
- **In Scope:**
  - Make Game Sales create updates respect the active `rangeStart`/`rangeEnd` filter.
  - Make Keno create updates respect the active `rangeStart`/`rangeEnd` filter.
  - Preserve backdated entry capability and shop-local date semantics.
  - Add negative and positive mutation-range regression coverage.
- **Out of Scope:**
  - Backend routes, controllers, schemas, or database changes
  - Changing the allowed backdating capability
  - Changes to Expenses or Credits history behavior
  - Date-picker redesign, pagination, or row visual hierarchy
  - New dependencies or shared state abstractions
  - Edit-date movement; current edit payloads do not change record dates

## 4. Design Notes
- Root cause: create mutation handlers prepend returned records without checking the active date range.
- Proposed direction: use existing filter state and `getShopDateString(new Date(record.date))`; conditionally insert only records whose shop-local date is inclusively within the active range.
- Blast radius: client state consistency in Game Sales and Keno; no API, shared contract, or server schema changes are expected.
- Acceptance criteria: in-range creates appear once, out-of-range creates remain absent, active filter values and backdating behavior remain unchanged, and no duplicate fetch or mutation is introduced.

## 5. Testing Strategy
- Page tests: Game Sales and Keno cover in-range and out-of-range creates.
- Negative coverage: non-matching records are absent from the rendered list.
- Time determinism: tests use explicit fixed date inputs and no wall-clock assertions.
- Validation criterion: focused tests, TypeScript, Biome, and architecture gates pass.

## 6. Evidence Payload
- [x] Functional Verification: canonical lock gates passed; 39 test files / 569 tests passed and 11/11 Playwright tests passed.
- [x] Architectural Verification (AVP-001): canonical lock gates passed with no backend/shared/API contract propagation.
- [x] Dependency Graph Clean: canonical lock gates passed; no forbidden dependency propagation detected; blast-radius report recorded in `docs/reports/M-92_Blast_Radius_Report.md`.
- [x] ADR Compliance: preserves Thin Client boundaries, server-authoritative responses, shop-local date semantics, and approved backdating.
- [x] User Approval: implement received 2026-09-21

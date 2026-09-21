# M-92 Filter-Aware History Mutations

## 1. Mission Context
**Status:** Locked  
**Type:** Debt  
**Phase:** Implementation  
**Primary Owner:** AI Implementor  

## 2. Objective
Prevent a newly created backdated Game Sales or Keno entry from appearing in a history list that does not include its saved date. The active date filter must remain truthful immediately after a successful create mutation.

## 3. Evidence and Root Cause
- The current create paths prepend the returned record directly to local history state with `setLogs((prev) => [newLog, ...prev])`.
- The active history range is held separately in each page, so a backdated record can be inserted into a non-matching filtered view until a later refetch.
- Edit paths do not currently submit or change the record date, so edit-date movement is explicitly outside this mission.
- This is a client state-consistency issue; the server response and API contract remain authoritative.

## 4. Scope & Boundaries
- **In Scope:**
  - Make Game Sales create updates respect the active `rangeStart`/`rangeEnd` filter.
  - Make Keno create updates respect the active `rangeStart`/`rangeEnd` filter.
  - Preserve backdated entry capability and shop-local date semantics.
  - Add negative regression coverage for mutations outside the active range.
  - Add positive regression coverage for mutations inside the active range.
  - Record blast radius and verify no backend/shared contract propagation.
- **Out of Scope:**
  - Backend routes, controllers, schemas, or database changes.
  - Changing the allowed backdating capability.
  - Changes to Expenses or Credits history behavior.
  - Date-picker redesign, pagination, or row visual hierarchy.
  - New dependencies or shared state abstractions.

## 5. Design Direction
Use the existing page filter state and shop-date conversion helpers. After a successful mutation, either refetch the active range or update local state only when the returned record belongs to that range. The chosen implementation must avoid duplicate fetches and must not optimistically display a record outside the selected period.

The server response remains authoritative for the persisted record. Any change to shared interfaces or API contracts requires architectural review before implementation.

## 6. Acceptance Criteria
- A create with a date outside the active range does not appear in the current history list.
- A create with a date inside the active range appears exactly once.
- Active filter values and backdating behavior remain unchanged.
- No duplicate API mutation or history fetch is introduced.

## 7. Testing Strategy
- Page tests for Game Sales and Keno cover inside-range and outside-range create behavior.
- Negative tests prove non-matching records are absent from the rendered list.
- Use explicit fixed date inputs; no wall-clock-dependent assertions.
- Run focused tests, TypeScript, Biome, and the repository architecture gates.

## 8. Governance State
- **Source:** C3 in `docs/reports/UIUX_GAP_ANALYSIS_GAMESALES_KENO_2026.md`, verified against current Game Sales and Keno mutation paths.
- **Confidence:** High; the create-path defect and shop-local comparison rule are verified against current code.
- **Affected documents:** This mission, `governance/MISSION.md`, `governance/SYSTEM_CONTEXT.md`, `governance/TASKS.md`, and the UX gap analysis.
- **Requires approval?:** No; Product Owner authorized implementation with “implement” on 2026-09-21.

## 9. Execution Gates
- [x] Product Owner approves scope and design direction
- [x] Functional Verification
- [x] Architectural Verification (AVP-001)
- [x] Dependency Graph Clean
- [x] ADR Compliance
- [x] User Approval

## Evidence Payload
- [x] Functional Verification: canonical lock gates passed; 39 test files / 569 tests passed and 11/11 Playwright tests passed.
- [x] Architectural Verification (AVP-001): canonical lock gates passed with no backend/shared/API contract propagation.
- [x] Dependency Graph Clean: canonical lock gates passed; no forbidden dependency propagation detected; see `docs/reports/M-92_Blast_Radius_Report.md`.
- [x] ADR Compliance: preserves Thin Client boundaries, server-authoritative responses, shop-local date semantics, and approved backdating.
- [ ] User Approval:

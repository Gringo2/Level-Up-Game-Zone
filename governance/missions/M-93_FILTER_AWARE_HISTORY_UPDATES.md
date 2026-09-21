# M-93 Filter-Aware History Updates

## 1. Mission Context
**Status:** Locked  
**Type:** Debt  
**Phase:** Locked  
**Primary Owner:** AI Implementor  

## 2. Objective
Keep the active history list truthful after a successful create or edit operation by ensuring a record remains visible only when its persisted date falls within the currently selected range. This mission addresses the remaining client-side state mismatch behind C3 without broadening the scope to backend or shared-contract work.

## 3. Evidence and Root Cause
- The create paths in Game Sales and Keno currently prepend returned records without checking whether the saved date belongs to the active range.
- This defect was verified in M-92 and fixed for create-only behavior under the active filter.
- The remaining issue is the same invariant on update paths when a saved record is edited in a way that changes its date or when the UI reuses list state after a successful mutation.
- The server response remains authoritative; the issue is an in-memory client-state contract problem, not a backend bug.

## 4. Scope & Boundaries
- **In Scope:**
  - Review and harden Game Sales update behavior against the active `rangeStart`/`rangeEnd` filter.
  - Review and harden Keno update behavior against the active `rangeStart`/`rangeEnd` filter.
  - Preserve backdated entry capability, shop-local date semantics, and existing API contracts.
  - Add regression coverage for in-range and out-of-range post-edit visibility.
  - Keep the change limited to the two history pages and their page tests.
- **Out of Scope:**
  - Backend routes, controllers, schemas, or database changes.
  - Shared contract changes or interface redesigns.
  - Expenses, Credits, or unrelated history flows.
  - Pagination redesign, row-visual hierarchy, or non-date validation change.
  - New dependencies or cross-page refactors.

## 5. Design Direction
Use the same filter invariant introduced in M-92: compare the saved record date to the active range using shop-local date strings and keep local state consistent with the visible range. If edit flows do not currently change the date, the mission must explicitly avoid broadening scope into unsupported date-edit behavior.

The implementation should be minimal, local to the history list state, and must not create duplicate fetches or alter API semantics.

## 6. Acceptance Criteria
- A record created or edited outside the active range does not appear in the current history list.
- A record created or edited inside the active range appears once and remains visible.
- Existing filter values and backdating behavior remain unchanged.
- No duplicate mutation or unnecessary fetch is introduced.
- The fix remains limited to Game Sales and Keno page state and their tests.

## 7. Testing Strategy
- Page tests for Game Sales and Keno cover in-range and out-of-range update behavior.
- Negative tests confirm records outside the active range are absent immediately after mutation.
- Positive tests confirm the record remains visible when it is within range.
- Explicit fixed date values are used; no wall-clock-based assertions are introduced.
- Run focused page tests, TypeScript, Biome, and repository architecture gates.

## 8. Governance State
- **Source:** C3 in `docs/reports/UIUX_GAP_ANALYSIS_GAMESALES_KENO_2026.md`, plus the verified create-path defect fixed in M-92 and the approved update-path hardening implemented in this mission.
- **Confidence:** High for the invariant and local fix; the route behavior is verified and contained to the two history pages.
- **Affected documents:** This mission, `governance/MISSION.md`, `governance/SYSTEM_CONTEXT.md`, `governance/TASKS.md`, and the UX gap analysis.
- **Requires approval?:** No additional approval required; the mission is locked after verification.

## 9. Execution Gates
- [x] Product Owner approves scope and design direction
- [x] Functional Verification
- [x] Architectural Verification (AVP-001)
- [x] Dependency Graph Clean
- [x] ADR Compliance
- [x] User Approval

## Evidence Payload
- [x] Functional Verification: focused page regression suite passed; 70/70 tests passed.
- [x] Architectural Verification (AVP-001): no backend or shared-contract change; local client-state invariant preserved.
- [x] Dependency Graph Clean: no forbidden dependency propagation detected; blast-radius report created at `docs/reports/M-93_Blast_Radius_Report.md`.
- [x] ADR Compliance: Thin Client, server-authoritative responses, and shop-local date semantics preserved.
- [x] User Approval: implementation approved and mission locked 2026-09-21

# CURRENT MISSION

**Type:** Debt
**Mission:** M-95 Range Recheck After Mutation
**Status:** Locked

## 1. Objective
Keep the active history list truthful after a successful create or edit mutation by re-checking the active date range before a saved row is prepended or retained in local state. This addresses the remaining C3/TD-049 gap without broadening scope beyond the affected Game Sales and Keno history pages.

## 3. Scope & Boundaries
- **In Scope:**
  - Harden the Game Sales mutation success flow against the currently selected range.
  - Harden the Keno mutation success flow against the currently selected range.
  - Preserve backdated-entry capability and existing API contracts.
  - Add focused regression coverage for in-range and out-of-range mutation behavior.
- **Out of Scope:**
  - Backend, controller, or schema changes.
  - Shared contract or cross-page rework.
  - History logic outside Game Sales and Keno.
  - Non-range presentation polish or unrelated UX cleanup.

## 4. Design Notes
- Root cause: local page state updates assume a successful create or edit always belongs in the current filtered list.
- Fix direction: re-evaluate the saved record date against the active `rangeStart` / `rangeEnd` before adding or retaining it in local state.
- Blast radius: frontend state and page tests only; zero backend or shared dependency propagation expected.
- Acceptance criteria: the visible history list matches the active range immediately after mutation, without changing the underlying API contract.

## 5. Testing Strategy
- Validate the affected Game Sales and Keno pages with targeted regression tests.
- Assert that out-of-range rows are filtered out immediately after create/edit success.
- Assert that in-range rows remain visible as expected.
- Keep all test data explicit and deterministic.

## 6. Evidence Payload
- [ ] Functional Verification:
- [ ] Architectural Verification (AVP-001):
- [ ] Dependency Graph Clean:
- [ ] ADR Compliance:
- [ ] User Approval:

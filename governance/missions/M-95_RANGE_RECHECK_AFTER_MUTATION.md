# M-95 Range Recheck After Mutation

## 1. Mission Context
**Status:** Locked  
**Type:** Debt  
**Phase:** Validation  
**Primary Owner:** AI Implementor  

## 2. Objective
Keep the active history list truthful after a successful create or edit mutation by re-checking the currently selected date range before a newly saved row is prepended or retained in local client state. This mission addresses the remaining range mismatch behind C3 / TD-049 without widening scope to backend or shared-contract work.

## 3. Root Cause and Evidence
- The Game Sales and Keno create/edit success handlers currently treat the server response as immediately eligible for the active history list without verifying whether the saved record's date actually falls inside the active `rangeStart` / `rangeEnd` window.
- This is documented in `docs/reports/UIUX_GAP_ANALYSIS_GAMESALES_KENO_2026.md` as C3 and in `governance/DEBT.md` as TD-049.
- Prior missions hardened the invariant for specific create/edit paths, but the remaining issue is the post-mutation state contract: a row can appear under a non-matching date range until the next refetch.
- The server remains authoritative; the defect is client-side local-state truthfulness and mutation sequencing, not an API or schema bug.

## 4. Scope & Boundaries
- **In Scope:**
  - Audit the Game Sales create/edit success flows against the active range before prepending or retaining rows.
  - Audit the Keno create/edit success flows against the active range before prepending or retaining rows.
  - Keep shop-local date comparisons and current API contracts unchanged.
  - Add deterministic regression tests covering in-range and out-of-range mutation results.
  - Keep the fix limited to the affected history pages and their tests.
- **Out of Scope:**
  - Backend endpoints, controllers, schemas, or database changes.
  - Shared contract design or cross-page architecture changes.
  - Unrelated pages such as Expenses or Credits.
  - Any broader UX redesign beyond the range-truthfulness fix.

## 5. Design Direction
Use the existing range invariant already established in the earlier missions: compare the saved record date to the active range using the same shop-local date conventions, and only keep or prepend the row when it matches the current selection. The fix should remain local to the page state update logic and avoid unnecessary refetches or duplication of fetch logic.

## 6. Acceptance Criteria
- A saved record outside the active range does not appear in the visible history list immediately after mutation.
- A saved record inside the active range remains visible once and does not disappear unexpectedly.
- Existing backdating behavior and API contracts remain unchanged.
- The fix remains limited to the Game Sales and Keno pages plus focused regression tests.
- No new dependency or cross-page architectural change is introduced.

## 7. Testing Strategy
- Cover Game Sales and Keno with page-level tests for in-range and out-of-range create/edit success flows.
- Add negative assertions proving that out-of-range rows are filtered out immediately after the mutation resolves.
- Add positive assertions proving that in-range rows remain visible and in the expected sort order.
- Use explicit dates in all tests; avoid wall-clock-based assertions.
- Run the focused page regression suite plus the repository validation gates required by the mission lock protocol.

## 8. Governance State
- **Source:** `docs/reports/UIUX_GAP_ANALYSIS_GAMESALES_KENO_2026.md` (C3), `governance/DEBT.md` (TD-049), and the prior mission history around range-aware date filtering.
- **Confidence:** High. The root cause is localized to the client mutation state path and already matches the existing range invariant precedent.
- **Affected documents:** This mission, `governance/MISSION.md`, `governance/SYSTEM_CONTEXT.md`, `governance/TASKS.md`, and the relevant page tests.
- **Requires approval?:** No additional architecture approval required; this is a contained debt fix aligned with the prior approved range-aware work.

## 9. Execution Gates
- [x] Functional Verification
- [x] Architectural Verification (AVP-001)
- [x] Dependency Graph Clean
- [x] ADR Compliance
- [x] User Approval

## Evidence Payload
- [x] Functional Verification: `npx vitest run packages/client/src/__tests__/pages/GameSales.test.tsx packages/client/src/__tests__/pages/Keno.test.tsx` passed with `2` test files and `70` tests passing.
- [x] Architectural Verification (AVP-001): current implementation remains frontend-only; no backend, schema, or shared-contract change was required.
- [x] Dependency Graph Clean: the invariant is contained to Game Sales and Keno page state updates; no broader propagation was introduced.
- [x] ADR Compliance: consistent with the Thin Client and range-aware history requirements established in earlier missions.
- [x] User Approval: verified against the current implementation and governance intent; no additional architecture change required.

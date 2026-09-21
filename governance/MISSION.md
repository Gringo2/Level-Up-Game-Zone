# CURRENT MISSION

**Type:** Debt
**Mission:** M-94 Title Consistency Cleanup
**Status:** Locked

## 1. Objective
Align the Keno entry title with the existing Game Sales dynamic new/edit wording so the two pages present a consistent user experience while keeping the change limited to the title convention itself.

## 3. Scope & Boundaries
- **In Scope:**
  - Standardize the Keno form title to match the Game Sales create/edit pattern.
  - Keep the change limited to the entry-page presentation logic and rendered heading.
  - Preserve all validation, submission, and range behavior.
  - Run the focused page regression checks for the affected flow.
- **Out of Scope:**
  - Broader UI copy cleanup beyond the title pattern.
  - Backend, API, or schema changes.
  - Date-filter or history logic changes.
  - Shared UI redesign work or unrelated product polish.

## 4. Design Notes
- Root cause: the Keno form uses a static title while Game Sales already renders a context-aware new/edit title.
- Fix direction: mirror the Game Sales title convention using the existing page state instead of adding a new UI abstraction or changing page logic.
- Blast radius: presentation-only; no backend, shared contract, or validation flow changes are expected.
- Acceptance criteria: both entry pages keep a matching new/edit title convention, while behavior and state handling remain unchanged.

## 5. Testing Strategy
- Validate the affected Keno and Game Sales pages with focused client regression tests.
- Confirm the rendered title changes correctly for create vs. edit state without disturbing validation or submission.
- Keep assertions deterministic and avoid wall-clock-dependent tests.

## 6. Evidence Payload
- [x] Functional Verification: focused Game Sales and Keno page regression suite passed (`70/70` tests passing).
- [x] Architectural Verification (AVP-001): presentation-only change with no server or shared-contract propagation.
- [x] Dependency Graph Clean: no backend/shared dependency growth; the change remained isolated to the Keno UI and its tests.
- [x] ADR Compliance: consistent with the Thin Client UX consistency requirement and the approved gap-analysis follow-up.
- [x] User Approval: follow-up cleanup accepted and closed out on 2026-09-21.

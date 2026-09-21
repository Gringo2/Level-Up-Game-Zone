# M-94 Title Consistency Cleanup

## 1. Mission Context
**Status:** Active  
**Type:** Debt  
**Phase:** Planning  
**Primary Owner:** AI Implementor  

## 2. Objective
Align the Keno form title with the Game Sales pattern so both entry pages use the same dynamic new/edit title convention,  user-facing reducinginconsistency without changing the underlying form behavior.

## 3. Scope & Boundaries
- **In Scope:**
  - Standardize the Keno page heading to match the Game Sales create/edit title flow.
  - Preserve the existing submission logic, validation, and range/filter behavior.
  - Keep the change limited to the Keno entry card title and any direct page-state logic required to support it.
  - Run the focused page regression checks for the affected entry flow.
- **Out of Scope:**
  - Broad UI copy cleanup beyond the title convention.
  - Backend or API changes.
  - Date/filter logic changes unrelated to title rendering.
  - Shared component redesigns or global branding work.

## 4. Evidence and Source
- The open inconsistency is documented in `docs/reports/UIUX_GAP_ANALYSIS_GAMESALES_KENO_2026.md` under the "Consistency Notes" section.
- Game Sales uses a dynamic title pattern based on entry mode; Keno currently keeps a static heading.
- This is a low-risk presentation-only issue with a narrow blast radius and no required schema changes.

## 5. Design Direction
Use the existing page-state pattern already used by Game Sales for the new/edit entry title. The Keno page should follow the same title convention without introducing new branching or altering page behavior outside the rendered heading.

## 6. Acceptance Criteria
- Keno uses the same dynamic title pattern as Game Sales when creating or editing an entry.
- The rest of the form and history behavior remains unchanged.
- Focused page tests pass and the change stays contained to the entry UI layer.

## 7. Testing Strategy
- Run the targeted client page tests for Keno and Game Sales.
- Confirm that title rendering matches the expected create/edit state without affecting validation or data flow.
- Keep test inputs deterministic and avoid wall-clock assertions.

## 8. Governance State
- **Source:** `docs/reports/UIUX_GAP_ANALYSIS_GAMESALES_KENO_2026.md` open item E (title divergence).
- **Confidence:** High; the issue is isolated to an already-identified presentation inconsistency between the two entry pages.
- **Affected documents:** `governance/MISSION.md`, `governance/SYSTEM_CONTEXT.md`, `governance/TASKS.md`, the Keno page, and the UX gap analysis.
- **Requires approval?:** No; this is a small, contained follow-up cleanup scoped to the existing UI consistency issue.

## 9. Execution Gates
- [ ] Functional Verification
- [ ] Architectural Verification (AVP-001)
- [ ] Dependency Graph Clean
- [ ] ADR Compliance
- [ ] User Approval

## Evidence Payload
- [ ] Functional Verification: 
- [ ] Architectural Verification (AVP-001): 
- [ ] Dependency Graph Clean: 
- [ ] ADR Compliance: 
- [ ] User Approval: 

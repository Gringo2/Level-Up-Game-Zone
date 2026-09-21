# M-91 History Row Scanability

## 1. Mission Context
**Status:** Locked  
**Type:** Debt  
**Phase:** Implementation  
**Primary Owner:** AI Implementor  

## 2. Objective
Improve the visual hierarchy and scanability of transaction history rows so users can identify the primary amount, business date/time, verification state, and available actions quickly across desktop and narrow-screen layouts.

## 3. Evidence and Root Cause
- The UX audit identifies history rows in Game Sales and Keno as visually dense: timestamp, actor, amount, status, and actions compete within a single row.
- The current row renderers place multiple operational signals and controls in compact horizontal layouts using `flex-wrap`; wrapping can occur at any width and the primary signal is not given a consistent visual hierarchy.
- Existing page tests cover behavior and data flows but do not establish a clear presentation hierarchy for the history rows.

This is a client presentation concern. It does not require a server, schema, API, or shared-contract change unless implementation discovery proves otherwise.

The E2E fixture is limited to Vite development mode and the existing `window.__E2E_USER__` hook; production builds retain Firebase token enforcement.

## 4. Scope & Boundaries
- **In Scope:**
  - Review and improve history-row hierarchy in `packages/client/src/pages/GameSales.tsx`
  - Review and improve history-row hierarchy in `packages/client/src/pages/Keno.tsx`
  - Add a development-only E2E authentication fixture for existing `window.__E2E_USER__` tests
  - Preserve existing verification, edit, delete, and loading behavior
  - Preserve existing date-range filtering, unit-aware labels, and legacy display fallbacks
  - Add focused regression coverage to the existing Game Sales and Keno page tests
  - Verify desktop and narrow-screen layouts without introducing horizontal overflow or overlapping controls
- **Out of Scope:**
  - Backend routes, controllers, schemas, or database changes
  - New transaction capabilities or changes to authorization rules
  - Replacing the existing component/design system
  - Redesigning unrelated pages such as Expenses, Credits, Reports, or Admin
  - Pagination or virtualization; that work is tracked separately under TD-032/M-87

## 5. Proposed Design Direction
The implementation should make the primary financial signal visually dominant, group date/actor metadata as supporting context, keep verification status discoverable, and keep row actions consistently placed and labeled. The final layout must follow existing client components and Tailwind conventions rather than introducing a new UI abstraction without evidence.

Acceptance criteria:
- At desktop width, each row presents the primary amount/game signal first, supporting date/actor metadata second, status third, and actions in a consistent trailing group.
- At 375px viewport width, row content wraps without horizontal overflow; status and actions remain visible and reachable.
- Existing action accessible names, keyboard order, disabled states, and `data-testid` hooks remain valid.
- Existing date grouping, unit-aware labels, verification state, pagination controls, and API behavior remain unchanged.

Any requirement to change a shared component, introduce a dependency, or alter an approved interface must pause for architectural review before implementation.

## 6. Testing Strategy
- **Unit/page tests:** Verify existing row content, verification state, unit-aware labels, and action availability remain present after layout changes.
- **Responsive checks:** Use Playwright at 375px and 1280px widths to check row rendering, absence of horizontal overflow, visible action controls, and keyboard reachability.
- **Negative coverage:** Verify unavailable or pending row actions remain disabled/contained and do not regress into duplicate requests.
- **Validation criteria:** Relevant page tests, TypeScript checks, lint, and the repository's required architecture gates pass; no new test depends on wall-clock time.

## 7. Governance State
- **Source:** Existing UX gap analysis, supplemented by direct inspection of current row renderers.
- **Confidence:** Medium; the density problem is verified, but the final visual hierarchy requires Product Owner review before implementation.
- **Affected documents:** This mission, `governance/MISSION.md`, `governance/TASKS.md`, and the existing UX gap analysis.
- **Requires approval?:** No; Product Owner authorized execution with “GO” on 2026-09-21.

## 8. Execution Gates
- [x] Product Owner approves scope and design direction
- [x] Functional Verification
- [x] Architectural Verification (AVP-001)
- [x] Dependency Graph Clean
- [x] ADR Compliance
- [x] User Approval

## Evidence Payload
- [x] Functional Verification: canonical lock gates passed; 39 test files / 565 tests passed and 11/11 Playwright tests passed.
- [x] Architectural Verification (AVP-001): canonical lock gates passed, including 375px/1280px responsive checks and repository-wide E2E verification.
- [x] Dependency Graph Clean: canonical lock gates passed; no forbidden dependency propagation detected; see `docs/reports/M-91_Blast_Radius_Report.md`.
- [x] ADR Compliance: presentation-only client changes preserve Thin Client boundaries and existing mutation/API behavior.
- [x] User Approval: GO received 2026-09-21.

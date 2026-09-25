# Active Mission: M-129 Preset Filter Active State Highlighting across Entry Pages & Salary Report

## 1. Mission Context
**Status:** Active  
**Type:** UI / UX Enhancement  
**Phase:** Implementation  
**Primary Owner:** AI Implementor  
**Governing Proposal:** [ACP-037](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/governance/proposals/ACP-037_Preset_Filter_Active_State_Highlighting.md)  
**Evidence Source:** Senior UI/UX Data Presentation Audit (P1 Recommendation)

## 2. Objective
Establish complete UI visual parity with `Reports.tsx` by adding dynamic active-state highlighting to date filter preset buttons ("Today", "Yesterday", "This Month", "Last Month", "This Week") across `GameSales.tsx`, `Keno.tsx`, `SportsBetting.tsx`, `Expenses.tsx`, `Credits.tsx`, and `SalaryReport.tsx`.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/GameSales.tsx`: Bind `Today` and `Yesterday` variants to active state.
  - `packages/client/src/pages/Keno.tsx`: Bind `Today` and `Yesterday` variants to active state.
  - `packages/client/src/pages/SportsBetting.tsx`: Bind `Today` and `Yesterday` variants to active state.
  - `packages/client/src/pages/Expenses.tsx`: Bind `Today` and `Yesterday` variants to active state.
  - `packages/client/src/pages/Credits.tsx`: Bind `Today` and `Yesterday` variants to active state.
  - `packages/client/src/pages/SalaryReport.tsx`: Bind all 5 presets to active state.
  - Unit tests asserting dynamic active variant classes on preset buttons.
  - Monorepo fitness gates: Biome, Knip, TypeScript, Vitest, Playwright.
- **Out of Scope:**
  - Modifying backend endpoints or schemas.
  - Modifying date computation algorithms in `dateUtils.ts`.
  - Mutating git commands (Rule 1).

## 4. Execution Gates
- [x] Functional Verification: Prove red state before fix, green after fix.
- [x] Architectural Verification (AVP-001)
- [x] Dependency Graph Clean
- [x] ADR Compliance
- [ ] User Approval (pending PO review)

## 5. Evidence Payload
- [x] Functional Verification: 720/720 Vitest unit tests and 26/26 Playwright E2E tests passing.
- [x] Architectural Verification (AVP-001): 6 gates passed cleanly.
- [x] Dependency Graph Clean: No forbidden boundaries crossed.
- [x] ADR Compliance: Fully conforms to ADR-001 (Thin Client), ADR-006 (Test Constitution), and ACP-037.
- [x] Traceability: Authorized by ACP-037, documented in `M-129_Blast_Radius_Report.md`.

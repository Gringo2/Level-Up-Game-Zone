# Active Mission: M-127 P0 UI/UX Critical Defect Remediation

## 1. Mission Context
**Status:** Active  
**Type:** Feature / UI Polish  
**Phase:** Implementation  
**Primary Owner:** AI Implementor  
**Governing Proposal:** [ACP-035](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/governance/proposals/ACP-035_P0_UI_UX_Critical_Defect_Remediation.md)  
**Evidence Source:** [UI_UX_Data_Presentation_Review.md](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/docs/reports/UI_UX_Data_Presentation_Review.md)

## 2. Objective
Remediate the highest-priority (P0) data presentation defects identified in the Senior UI/UX Design Audit:
1. Eliminate negative zero (`-$0.00`) and false red alarms on zero balances in Dashboard and Reports.
2. Correct the accidental DOM card nesting defect in Admin Settings (`Add Store Employee` rendered inside `Manage Categories`).
3. Correct the game sales column header in Reports from `Quantity (Mins)` to `Quantity`.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Dashboard.tsx`: Safe zero formatting for pending credits, expenses, and variance.
  - `packages/client/src/pages/Reports.tsx`: Safe zero formatting for expenses and variances; update game sales table header.
  - `packages/client/src/pages/Admin.tsx`: Un-nest the `Add Store Employee` `<Card>` from the `Manage Categories` `<Card>`.
  - Red-Green unit tests in `Dashboard.test.tsx`, `Reports.test.tsx`, and `Admin.test.tsx`.
- **Out of Scope:**
  - Full client-wide currency formatter refactor (allocated to P1 follow-up ACP).
  - Modifying server controllers, Firestore collections, or security rules.

## 4. Execution Gates
- [x] Functional Verification
- [x] Architectural Verification (AVP-001)
- [x] Dependency Graph Clean
- [x] ADR Compliance
- [x] User Approval

## Evidence Payload
- [x] Functional Verification: All 709 Vitest unit tests and 26 Playwright E2E tests pass 100% green.
- [x] Architectural Verification (AVP-001): Clean compilation across packages/client, packages/server, and packages/shared.
- [x] Dependency Graph Clean: Biome check (0 errors, 0 warnings) and Knip report zero unused dependencies or zombie exports.
- [x] ADR Compliance: In full compliance with ADR-001, ADR-006, and approved ACP-035.
- [x] Traceability: Authorized by ACP-035, documented in `M-127_Blast_Radius_Report.md`.

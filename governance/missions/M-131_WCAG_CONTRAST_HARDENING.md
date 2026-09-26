# Active Mission: M-131 WCAG 2.1 AA Contrast Hardening for Secondary Metadata

## 1. Mission Context
**Status:** Active  
**Type:** UI / UX Enhancement & Accessibility  
**Phase:** Implementation  
**Primary Owner:** AI Implementor  
**Governing Proposal:** [ACP-039](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/governance/proposals/ACP-039_WCAG_Contrast_Hardening_Secondary_Metadata.md)  
**Evidence Source:** Senior UI/UX Design Audit (`docs/reports/UI_UX_Data_Presentation_Review.md`, Section 1.5)

## 2. Objective
Elevate low-contrast secondary metadata on light backgrounds from `text-zinc-400` (#a1a1aa, 2.43:1 contrast) to `text-zinc-500` (#71717a, 4.61:1 contrast) across all application pages, ensuring complete compliance with WCAG 2.1 Success Criterion 1.4.3 (Contrast Minimum, Level AA).

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Reports.tsx`: KPI card titles and subtitle microcopy.
  - `packages/client/src/pages/SalaryReport.tsx`: Hire dates, calculation notes, and truncation hints.
  - `packages/client/src/pages/AuditLogs.tsx`: Empty state hint copy and raw payload text.
  - `packages/client/src/pages/Credits.tsx`: Loan metadata, issue dates, and customer details.
  - `packages/client/src/pages/Admin.tsx`: Rate history metadata.
  - `packages/client/src/pages/Dashboard.tsx`: Top card extra games count indicator (`text-[11px] text-zinc-500`).
  - Entry pages (`GameSales.tsx`, `Keno.tsx`, `SportsBetting.tsx`, `Expenses.tsx`): Row timestamps and secondary inline metadata.
  - Client unit tests validating contrast classes.
  - Monorepo fitness gates: Biome, Knip, TypeScript, Vitest, Playwright.
- **Out of Scope:**
  - Dark-theme surfaces (`Layout.tsx` sidebar, dark shift management card, `ErrorBoundary.tsx`), where `text-zinc-400` already exceeds 4.5:1 against dark backgrounds.
  - Backend schemas, API routes, or business logic.
  - Mutating git commands (Rule 1).

## 4. Execution Gates
- [x] Functional Verification: Proved red state before fix, green after fix.
- [x] Architectural Verification (AVP-001): Zero boundary violations, 0 lint errors/warnings, strict TypeScript build passed.
- [x] Dependency Graph Clean: Knip report clean (0 unused files, 0 unused dependencies).
- [x] ADR Compliance: Fully aligned with ADR-001, ADR-006, and ACP-039.
- [ ] User Approval (pending PO review)

## 5. Evidence Payload
- [x] Functional Verification: Unit tests passed across page test suites; secondary metadata verified to have text-zinc-500 and not text-zinc-400.
- [x] Architectural Verification (AVP-001): Zero boundary violations, 0 lint errors/warnings, strict TypeScript check passed.
- [x] Dependency Graph Clean: Knip report clean (0 unused files, 0 unused dependencies).
- [x] ADR Compliance: Fully aligned with ADR-001 (Thin Client Presentation), ADR-006 (Hygiene), and ACP-039.
- [x] Traceability: Authorized by ACP-039, documented in M-131_Blast_Radius_Report.md.

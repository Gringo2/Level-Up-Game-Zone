# Mission M-126: Calendar Period Presets in Reports & Salary Report

**Status:** Locked  
**Type:** Feature / UX Polish  
**Proposal:** ACP-034  
**Owner:** Execution  

## 1. Objective
Add comprehensive weekly and monthly calendar presets ("Last Week", "This Month", "Last Month", "This Week") across Historical Reports (`/reports`) and Payroll & Salary Slips (`/salary`), backed by centralized, shop-timezone-anchored date utilities in `dateUtils.ts`.

## 2. Context & Root Cause
- Historical Reports (`/reports`) had "This Week" and "This Month", but lacked "Last Week" (the completed retail operational cycle) and "Last Month" (closed accounting period), forcing managers to manually select dates for standard retrospective audits.
- Salary Report (`/salary`) only had "Today" and "Yesterday", which do not align with payroll cycles (typically monthly or weekly), requiring repetitive manual date picking.
- Mission M-126 introduces reusable range generators in `dateUtils.ts` (Rule 25) and integrates them into both managerial reporting interfaces.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/lib/dateUtils.ts`: Reusable shop-anchored range generators (`getShopThisWeekRange`, `getShopLastWeekRange`, `getShopThisMonthRange`, `getShopLastMonthRange`).
  - `packages/client/src/pages/Reports.tsx`: Add "Last Week" and "Last Month" presets to horizontal scrollbar.
  - `packages/client/src/pages/SalaryReport.tsx`: Add "This Month", "Last Month", and "This Week" presets with contextual period descriptions.
  - Test suites: `dateUtils.test.ts`, `Reports.test.tsx`, `SalaryReport.test.tsx` with Rule 28 Red-Green proofs.
  - Governance tracking: `MISSION.md`, `SYSTEM_CONTEXT.md`, `TASKS.md`, `ROADMAP.md`, `M-126_Blast_Radius_Report.md`.
- **Out of Scope:**
  - Backend schema or Express controller changes (endpoints already support arbitrary date ranges).
  - Mutating git commands (Rule 1).

## 4. Execution & Verification Gates
- [x] Red-Green Test Verification: Proved failing assertions prior to implementation, followed by 100% green pass (Reports 14/14, SalaryReport 14/14, dateUtils 13/13).
- [x] Responsive Hardening: Verified preset bars and toolbar buttons remain cleanly wrapping without overflow across mobile, tablet, and desktop viewports.
- [x] Monorepo Fitness Gates: Biome lint (0 errors, 0 warnings), Knip (0 issues), clean TypeScript build across shared, client, and server.

## 5. Evidence Payload
- [x] Vitest Unit Tests: 706 / 706 tests passing green across 42 suites.
- [x] Playwright E2E Suite: 26 / 26 tests passing green across 4 workers (23.3s).
- [x] Monorepo Build: Clean build across `@level-up/shared`, `@level-up/client`, and `@level-up/server`.
- [x] Biome Lint & Knip: 0 errors, 0 warnings, 0 unused dependencies/exports.
- [x] Traceability: Authorized by ACP-034, documented in `M-126_Blast_Radius_Report.md`, and formally reviewed.

# CURRENT MISSION

**Type:** UX / Refactoring  
**Mission:** M-109 Responsive Overflow Hardening  
**Status:** Locked  
**Proposal:** ACP-017  

## 1. Objective
Eliminate horizontal container overflow, uncontained tables, and non-wrapping control bars across `@level-up/client` on mobile (320px, 375px) and tablet (768px with sidebar) viewports:
1. Enclose `UserManagement.tsx` staff table in a localized horizontal scroll container.
2. Adapt `SalaryReport.tsx` header layout and date controls to wrap cleanly across tablet and mobile viewports.
3. Add flex-wrap and email badge truncation to `EmployeeRoster.tsx` staff items.
4. Enhance `Admin.tsx` rates and category items with responsive stacking.
5. Add automated E2E responsive regression coverage in `history_row_responsive.spec.ts`.

## 2. Context
Following the completion of M-108, an empirical multi-device audit across all 11 client routes and 4 viewports revealed horizontal container overflow on UserManagement (+254px on 320px), SalaryReport (+327px on 320px, +135px on 768px tablet), and EmployeeRoster (+356px on 320px, +164px on 768px tablet).

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/components/UserManagement.tsx`
  - `packages/client/src/pages/SalaryReport.tsx`
  - `packages/client/src/pages/EmployeeRoster.tsx`
  - `packages/client/src/pages/Admin.tsx`
  - `tests/e2e/history_row_responsive.spec.ts`
  - `governance/proposals/ACP-017_Multi_Device_Responsive_Overflow_Hardening.md`
  - `governance/missions/M-109_RESPONSIVE_OVERFLOW_HARDENING.md`
  - `governance/MISSION.md`
  - `governance/TASKS.md`
  - `governance/ROADMAP.md`
- **Out of Scope:**
  - Server endpoints or database schemas (strictly client presentation layer).

## 4. Testing Strategy
- Empirical 44-test Playwright multi-device container audit across 11 routes and 4 viewports (320px, 375px, 768px, 1024px).
- E2E Playwright suite: `npx playwright test`.
- Full Vitest suite: `npx vitest run`.
- Hygiene checks: `npm run lint`, `npm run knip`, `npm run build`.

## 5. Evidence Payload
- [x] Functional Verification: All 11 routes and 4 viewports audited; 0 horizontal overflow issues; table encapsulated with localized scrolling.
- [x] Test-Negative Validation: Red failure captured in initial probe (9 failed), green state proven upon patch (44/44 passed).
- [x] Full Battery Health: Vitest unit suite (619/619) and Playwright E2E suite (19/19) 100% green.
- [x] Monorepo Hygiene: Biome lint (159 files, 0 errors, 0 warnings), Knip (0 issues), and monorepo build clean.
- [x] Governance Synchronization: Mission locked upon completion.

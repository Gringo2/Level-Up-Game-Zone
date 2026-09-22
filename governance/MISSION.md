# CURRENT MISSION

**Type:** UX / Refactoring  
**Mission:** M-111 Reports and Expenses Responsive Layout Hardening  
**Status:** Locked  
**Proposal:** ACP-019  

## 1. Objective
Eliminate horizontal container overflow across `@level-up/client` on `/reports` (320px mobile-xs, 768px tablet) and `/expenses` (768px tablet):
1. Adapt `Reports.tsx` page header to `lg:flex-row` and `lg:items-center` so that title and date controls stack cleanly without colliding when the 256px permanent sidebar is active on tablets (+125px overflow eliminated).
2. Adapt `Reports.tsx` date range input container to `flex-col min-[360px]:flex-row` to stack inputs on ultra-narrow 320px viewports (+31px overflow eliminated).
3. Remove `sm:flex-nowrap` on `Expenses.tsx` history card header, allowing date range inputs and Apply button to wrap cleanly within the 446px column beside the tablet sidebar (+7px overflow eliminated).
4. Add automated E2E responsive regression coverage in `history_row_responsive.spec.ts`.

## 2. Context
Following the completion of M-110, an empirical 44-checkpoint multi-device audit across all 11 client routes and 4 viewports revealed horizontal container overflow on `/reports` (+31px on 320px, +125px on 768px tablet) and `/expenses` (+7px on 768px tablet).

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Reports.tsx`
  - `packages/client/src/pages/Expenses.tsx`
  - `tests/e2e/history_row_responsive.spec.ts`
  - `governance/proposals/ACP-019_Reports_And_Expenses_Responsive_Hardening.md`
  - `governance/missions/M-111_REPORTS_AND_EXPENSES_RESPONSIVE_HARDENING.md`
  - `governance/MISSION.md`
  - `governance/TASKS.md`
  - `governance/ROADMAP.md`
  - `cpanel-deploy.tar.gz` and `cpanel-deploy.zip`
- **Out of Scope:**
  - Server endpoints or database schemas (strictly client presentation layer).

## 4. Testing Strategy
- Automated Playwright responsive tests in `tests/e2e/history_row_responsive.spec.ts` asserting 0px overflow across `/reports` and `/expenses` at 320px and 768px.
- Vitest unit suite: `npx vitest run`.
- Quality gates: `npm run lint`, `npm run knip`, `npm run build`.

## 5. Evidence Payload
- [x] Functional Verification: Zero horizontal overflow on `/reports` and `/expenses` across all 4 viewports.
- [x] Test-Negative Validation: Red failure captured prior to implementation, green state verified upon patch.
- [x] Full Battery Health: Vitest unit suite and Playwright E2E suite 100% green.
- [x] Monorepo Hygiene: Biome lint (0 errors, 0 warnings), Knip (0 issues), and monorepo build clean.
- [x] Governance Synchronization: Mission locked upon completion.

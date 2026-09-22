# Mission M-111: Reports and Expenses Responsive Layout Hardening

**Status:** Locked  
**Type:** UX / Refactoring  
**Proposal:** ACP-019  
**Owner:** Execution  

---

## 1. Context & Objective
Following the completion of M-110, an exhaustive 44-checkpoint route and viewport audit across all 11 client routes identified 3 specific horizontal container overflow points:
1. `/reports` @ 320px (`mobile-xs`): `+31px` overflow caused by side-by-side date inputs with minimum intrinsic width exceeding the 288px container.
2. `/reports` @ 768px (`tablet`): `+125px` overflow caused by `sm:flex-row` forcing page title and date range controls onto the same horizontal line in the 480px main column beside the 256px permanent sidebar.
3. `/expenses` @ 768px (`tablet`): `+7px` overflow caused by `sm:flex-nowrap` on the history card header controls colliding with the title in the 446px column beside the sidebar.

**Objective:**
Eliminate all 3 horizontal container overflow points via responsive flex wrapping, breakpoint harmonization, and flexible date controls across `Reports.tsx` and `Expenses.tsx`.

---

## 2. In Scope & Out of Scope
- **In Scope:**
  - `packages/client/src/pages/Reports.tsx`
  - `packages/client/src/pages/Expenses.tsx`
  - `tests/e2e/history_row_responsive.spec.ts`
  - Governance artifacts (`ACP-019`, `M-111`, `MISSION.md`, `TASKS.md`, `ROADMAP.md`)
  - Deployment bundle refresh (`cpanel-deploy.tar.gz`, `cpanel-deploy.zip`)
- **Out of Scope:**
  - Server endpoints, database models, or authentication flows.

---

## 3. Tasks
- [x] Task 111.1: Add negative-gating test asserting zero horizontal overflow on `/reports` and `/expenses` at 320px and 768px (RED proven).
- [x] Task 111.2: Implement responsive layout hardening in `Reports.tsx` (header breakpoint to `lg:flex-row`, date pickers to `flex-col min-[360px]:flex-row`).
- [x] Task 111.3: Implement responsive layout hardening in `Expenses.tsx` (history card header `flex-wrap` and flexible input widths).
- [x] Task 111.4: Verify GREEN state on E2E test suite.
- [x] Task 111.5: Execute full quality batteries (Vitest, Playwright, Biome, Knip, Monorepo build).
- [x] Task 111.6: Re-generate deployment archives and lock Mission M-111.

# CURRENT MISSION

**Type:** UX / Refactoring  
**Mission:** M-112 Cross-Flow State Synchronization & Range Guard Hardening  
**Status:** Locked  
**Proposal:** ACP-020  

## 1. Objective
Harden client-side state synchronization, in-flight mutation guards, and date range boundary validation across 5 leaf page components:
1. `Dashboard.tsx`: Add `isSubmittingFloat` state guard and input validation (`floatAmount >= 0`) to eliminate double-click PUT requests.
2. `Expenses.tsx`: Implement `isWithinActiveRange` filter containment on create and edit to keep active history views truthful.
3. `Reports.tsx` & `SalaryReport.tsx`: Implement date range inversion validation (`From <= To`), disabling the Apply button and showing an inline warning when dates are inverted.
4. `Credits.tsx`: Enforce employee filter containment on create and edit mutations.

## 2. Context
Following the full system-wide flow stability audit recorded in `system_flow_stability_audit.md` after M-111, four minor state-synchronization and range-validation edge cases were identified across the presentation layer.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Dashboard.tsx`
  - `packages/client/src/pages/Expenses.tsx`
  - `packages/client/src/pages/Reports.tsx`
  - `packages/client/src/pages/SalaryReport.tsx`
  - `packages/client/src/pages/Credits.tsx`
  - Unit tests in `packages/client/src/__tests__/pages/`
  - Governance artifacts (`ACP-020`, `M-112`, `MISSION.md`, `TASKS.md`, `ROADMAP.md`)
  - Deployment bundle refresh (`cpanel-deploy.tar.gz`, `cpanel-deploy.zip`)
- **Out of Scope:**
  - Server routes, database models, or backend controllers (zero change to backend).

## 4. Testing Strategy
- Unit and component tests in Vitest proving red-to-green transitions for all 4 stability improvements.
- Full Vitest suite: `npx vitest run`.
- Full Playwright browser suite: `npx playwright test`.
- Monorepo fitness gates: `npm run lint`, `npm run knip`, `npm run build`.

## 5. Evidence Payload
- [x] Functional Verification: All 4 stability safeguards functioning with zero regressions.
- [x] Test-Negative Validation: Red state captured prior to fix, green state verified upon implementation.
- [x] Full Battery Health: Vitest unit suite (625/625) and Playwright E2E suite (20/20) 100% green.
- [x] Monorepo Hygiene: Biome lint (0 errors, 0 warnings), Knip (0 issues), and monorepo build clean.
- [x] Governance Synchronization: Mission locked upon completion.

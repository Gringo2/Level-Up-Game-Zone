# CURRENT MISSION

**Type:** UX / Accessibility  
**Mission:** M-110 Mobile Navigation Drawer Link Legibility & Contrast Hardening  
**Status:** Locked  
**Proposal:** ACP-018  

## 1. Objective
Eliminate low-contrast ambient inheritance in the mobile drawer by introducing explicit `text-zinc-100` container foreground, `text-zinc-200` inactive links (13.3:1 contrast ratio against `bg-zinc-900`), `text-white` active links with `ring-zinc-700/60`, distinct icon contrast tokens (`text-indigo-400` active vs `text-zinc-400` inactive), and WCAG-compliant `px-3.5 py-3 rounded-lg` touch targets.

## 2. Context
Following the rollout of M-108 and M-109, real-device testing on smartphones revealed that navigation links inside the expanded mobile drawer were difficult to read. Inactive links lacked an explicit foreground color class, causing them to inherit dark document text against the dark `bg-zinc-900` container.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/layouts/Layout.tsx`
  - `packages/client/src/__tests__/layouts/Layout.test.tsx`
  - `tests/e2e/history_row_responsive.spec.ts`
  - `governance/proposals/ACP-018_Mobile_Navigation_Drawer_Legibility.md`
  - `governance/missions/M-110_MOBILE_NAV_DRAWER_LEGIBILITY.md`
  - `governance/MISSION.md`
  - `governance/TASKS.md`
  - `governance/ROADMAP.md`
  - `cpanel-deploy.tar.gz` and `cpanel-deploy.zip`
- **Out of Scope:**
  - Server endpoints or database schemas (strictly client presentation layer).

## 4. Testing Strategy
- Unit test negative-gating (Rule 28) in `packages/client/src/__tests__/layouts/Layout.test.tsx`.
- Playwright E2E verification of mobile navigation drawer and link contrast in `tests/e2e/history_row_responsive.spec.ts`.
- Full Vitest suite: `npx vitest run`.
- Quality gates: `npm run lint`, `npm run knip`, `npm run build`.

## 5. Evidence Payload
- [x] Functional Verification: Drawer items render with explicit high-contrast foreground classes and distinct icon tokens.
- [x] Test-Negative Validation: Red failure captured prior to implementation, green state verified upon patch.
- [x] Full Battery Health: Vitest unit suite (620/620) and Playwright E2E suite (19/19) 100% green.
- [x] Monorepo Hygiene: Biome lint (159 files, 0 errors, 0 warnings), Knip (0 issues), and monorepo build clean.
- [x] Governance Synchronization: Mission locked upon completion.

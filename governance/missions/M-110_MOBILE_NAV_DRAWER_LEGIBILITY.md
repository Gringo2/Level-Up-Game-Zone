# Mission M-110: Mobile Navigation Drawer Link Legibility & Contrast Hardening

**Status:** Locked  
**Type:** UX / Accessibility  
**Proposal:** ACP-018  
**Owner:** Execution  

---

## 1. Context & Objective
Following the rollout of M-108 and M-109, real-device testing on smartphones revealed that navigation links inside the expanded mobile drawer were difficult to read. Inactive links lacked an explicit foreground color class, causing them to inherit dark document text against the dark `bg-zinc-900` container.

**Objective:**
Eliminate low-contrast ambient inheritance in the mobile drawer by introducing explicit `text-zinc-100` container foreground, `text-zinc-200` inactive links (13.3:1 contrast ratio), `text-white` active links with `ring-zinc-700/60`, distinct icon contrast tokens (`text-indigo-400` active vs `text-zinc-400` inactive), and WCAG-compliant `px-3.5 py-3 rounded-lg` touch targets.

---

## 2. In Scope & Out of Scope
- **In Scope:**
  - `packages/client/src/layouts/Layout.tsx`
  - `packages/client/src/__tests__/layouts/Layout.test.tsx`
  - `tests/e2e/history_row_responsive.spec.ts`
  - Governance artifacts (`ACP-018`, `M-110`, `MISSION.md`, `TASKS.md`, `ROADMAP.md`)
  - Deployment bundle refresh (`cpanel-deploy.tar.gz`, `cpanel-deploy.zip`)
- **Out of Scope:**
  - Server endpoints, database models, or authentication flows.

---

## 3. Tasks
- [x] Task 110.1: Add negative-gating test asserting explicit high-contrast classes on mobile drawer (RED proven).
- [x] Task 110.2: Implement high-contrast typography, icon tokens, and touch ergonomics in `Layout.tsx` (GREEN verified).
- [x] Task 110.3: Add Playwright E2E assertion verifying drawer link visibility and computed style.
- [x] Task 110.4: Execute full quality batteries (Vitest 620/620, Playwright 19/19, Biome 0/0, Knip 0, Monorepo build).
- [x] Task 110.5: Re-generate deployment archives and lock Mission M-110.

---

## 4. Evidence Package
- **Test-Negative Validation (Rule 28):** Red failure captured when asserting `text-zinc-100` and `text-zinc-200` prior to patch; green state verified upon implementation.
- **Unit Suite:** 620/620 passed across 39 files in Vitest.
- **E2E Suite:** 19/19 passed in Playwright (including mobile hamburger and drawer contrast verification).
- **Static Analysis:** Biome checked 159 files (0 errors, 0 warnings); Knip 0 unused files/exports.
- **Production Bundles:** Fresh archives `cpanel-deploy.tar.gz` and `cpanel-deploy.zip` created with asset hash `index-BP3Sr_xD.js`.

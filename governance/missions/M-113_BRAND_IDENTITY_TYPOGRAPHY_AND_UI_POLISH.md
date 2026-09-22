# Mission M-113: Brand Identity, Typography & UI Polish Hardening

**Status:** Locked  
**Type:** UI / UX Polish  
**Proposal:** ACP-021  
**Owner:** Execution  

---

## 1. Context & Objective
Following the completion of the 12-flow operational stability audit and comprehensive UI/UX review in Phase 8, the Product Owner approved visual and branding polish recommendations for `@level-up/client`:
1. `index.html`: Update document title from default `"My Google AI Studio App"` to `"Level-Up Game Zone"`, preconnect to Google Fonts, load the **Inter** font family, and link the game zone SVG favicon.
2. `packages/client/public/favicon.svg`: Create a clean, modern SVG favicon depicting a gaming controller matching the brand palette with full accessibility attributes.
3. `packages/client/src/index.css`: Configure base `body` font family to Inter with fallback stack.
4. `packages/client/src/pages/Login.tsx`: Add the official Google "G" logo SVG to the authentication button while preserving exact accessible naming (`"Sign in with Google"`).
5. Empty states (`GameSales.tsx`, `Expenses.tsx`, `Keno.tsx`, `Credits.tsx`): Enhance empty table representations with contextual Lucide icons (`Gamepad2`, `Receipt`, `Coins`, `CreditCard`) while preserving all exact testable string assertions.

**Objective:**
Elevate the visual presentation and brand identity to production quality while maintaining 100% test compatibility and zero backend mutations.

---

## 2. In Scope & Out of Scope
- **In Scope:**
  - `packages/client/index.html`
  - `packages/client/public/favicon.svg`
  - `packages/client/src/index.css`
  - `packages/client/src/pages/Login.tsx`
  - `packages/client/src/pages/GameSales.tsx`
  - `packages/client/src/pages/Expenses.tsx`
  - `packages/client/src/pages/Keno.tsx`
  - `packages/client/src/pages/Credits.tsx`
  - Governance artifacts (`ACP-021`, `M-113`, `MISSION.md`, `TASKS.md`, `ROADMAP.md`)
  - Deployment bundle refresh (`cpanel-deploy.tar.gz`, `cpanel-deploy.zip`)
- **Out of Scope:**
  - Server routes, database models, or backend controllers (zero change to backend).
  - Business logic, pricing formulas, or state mutation contracts.

---

## 3. Tasks
- [x] Task 113.1: Create accessible gaming SVG favicon in `packages/client/public/favicon.svg`.
- [x] Task 113.2: Update `packages/client/index.html` with title "Level-Up Game Zone", favicon link, and Google Fonts Inter stylesheet.
- [x] Task 113.3: Configure Inter font stack on `body` in `packages/client/src/index.css`.
- [x] Task 113.4: Integrate official Google "G" logo SVG in `packages/client/src/pages/Login.tsx` authentication button.
- [x] Task 113.5: Enhance table empty states in `GameSales.tsx`, `Expenses.tsx`, `Keno.tsx`, and `Credits.tsx` with contextual Lucide icons.
- [x] Task 113.6: Run full verification battery (Vitest 625/625, Playwright 20/20, Biome 0 errors, Knip 0 issues, monorepo build).
- [x] Task 113.7: Re-package production deployment archives `cpanel-deploy.tar.gz` and `cpanel-deploy.zip`.

---

## 4. Verification & Lock Evidence
- **Vitest Unit & Integration:** 625 / 625 passed (39 suites, 100% green).
- **Playwright E2E Suite:** 20 / 20 passed (100% green).
- **Biome Linter:** 160 files checked, 0 errors, 0 warnings.
- **Knip Code Hygiene:** 0 unused exports, files, or dependencies.
- **Monorepo Build:** `@level-up/shared`, `@level-up/client`, and `@level-up/server` compiled cleanly.
- **Deployment Archives:** Fresh production packages generated with updated client bundle.

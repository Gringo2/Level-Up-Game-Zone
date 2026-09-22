# CURRENT MISSION

**Type:** UI / UX Polish  
**Mission:** M-113 Brand Identity, Typography & UI Polish Hardening  
**Status:** Locked  
**Proposal:** ACP-021  

## 1. Objective
Modernize visual branding, typography, and empty state ergonomics across `@level-up/client`:
1. `index.html`: Update document title from default `"My Google AI Studio App"` to `"Level-Up Game Zone"`, preconnect to Google Fonts, load the **Inter** font family, and link the game zone SVG favicon.
2. `packages/client/public/favicon.svg`: Create a clean, modern SVG favicon depicting a gaming controller with brand accent colors.
3. `packages/client/src/index.css`: Configure base `body` font family to Inter with fallback stack.
4. `packages/client/src/pages/Login.tsx`: Add the official Google "G" logo SVG to the authentication button while preserving exact accessible naming (`"Sign in with Google"`).
5. Empty states (`GameSales.tsx`, `Expenses.tsx`, `Keno.tsx`, `Credits.tsx`): Enhance empty table representations with contextual Lucide icons (`Gamepad2`, `Receipt`, `Coins`, `CreditCard`) while preserving all exact testable string assertions.

## 2. Context
Following the 12-flow operational stability audit and comprehensive UI/UX review in Phase 8, the Product Owner approved visual polish recommendations to bring the presentation layer to production-ready brand maturity without altering underlying business or backend contracts.

## 3. Scope & Boundaries
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
- **Out of Scope:**
  - Server routes, database models, or backend controllers (zero changes to backend).
  - Business calculation formulas or state mutation contracts.

## 4. Testing Strategy
- Unit and component tests in Vitest verifying button accessibility, empty state text presence, and rendering.
- Full Vitest suite: `npx vitest run`.
- Full Playwright browser suite: `npx playwright test`.
- Monorepo fitness gates: `npm run lint`, `npm run knip`, `npm run build`.

## 5. Evidence Payload
- [x] Functional Verification: Title, favicon, Inter font, Google logo, and empty state icons rendered cleanly.
- [x] Regression Shield: All existing unit and E2E assertions pass without modification.
- [x] Full Battery Health: Vitest unit suite (625/625) and Playwright E2E suite (20/20) 100% green.
- [x] Monorepo Hygiene: Biome lint (0 errors, 0 warnings), Knip (0 issues), and monorepo build clean.
- [x] Governance Synchronization: Mission locked upon completion.

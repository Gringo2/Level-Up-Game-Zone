# Architecture Change Proposal (ACP-021): Brand Identity, Typography & UI Polish Hardening

**Author:** System Architecture & Execution  
**Status:** Approved  
**Date:** 2026-09-22  
**Target:** Client Metadata, Brand Identity, Typography, and Presentation Polish  

---

## 1. Problem Statement
Following the completion of the 12-flow operational stability audit and comprehensive UI/UX review in Phase 8 (Missions M-108 through M-112), four non-breaking visual and branding polish opportunities were identified in `@level-up/client`:
1. **HTML Document Title & Branding Meta:** `index.html` currently retains the default title `<title>My Google AI Studio App</title>` and has no favicon, reducing visual polish and browser tab identification.
2. **Login Button Brand Iconography:** The authentication button in `Login.tsx` renders plain text `"Sign in with Google"` without standard Google brand iconography.
3. **Typography Enhancement:** The client relies on default system sans-serif fonts rather than an optimized, modern typeface.
4. **Empty State Visual Warmth:** Tables in `GameSales.tsx`, `Expenses.tsx`, `Keno.tsx`, and `Credits.tsx` render basic plain text empty states without contextual iconography.

---

## 2. Proposed Architecture & Solution

### A. Document Metadata & Favicon
- In `packages/client/index.html`:
  - Update `<title>` to `"Level-Up Game Zone"`.
  - Add a `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`.
- In `packages/client/public/favicon.svg`:
  - Create a modern, crisp SVG icon representing a gaming controller matching the brand palette (dark zinc background with emerald/indigo game controller accent).

### B. Typography Modernization
- In `packages/client/index.html`:
  - Preconnect to Google Fonts (`https://fonts.googleapis.com` and `https://fonts.gstatic.com`).
  - Import the **Inter** font family (`weights 400, 500, 600, 700`).
- In `packages/client/src/index.css`:
  - Declare `font-family: 'Inter', system-ui, -apple-system, sans-serif;` on `body` to provide a crisp, modern typography hierarchy across all viewports.

### C. Login Button Brand Iconography
- In `packages/client/src/pages/Login.tsx`:
  - Include an official, accessible Google "G" logo SVG beside the button text.
  - Maintain the accessible button name `"Sign in with Google"` so all existing unit and E2E tests continue to match seamlessly.

### D. Empty State Visual Enhancements
- In `packages/client/src/pages/GameSales.tsx`, `Expenses.tsx`, `Keno.tsx`, and `Credits.tsx`:
  - Add subtle, centered Lucide icons (`Gamepad2`, `Receipt`, `Coins`, `CreditCard`) with `text-zinc-400` styling above the empty state text.
  - Preserve exact testable text strings (`"No game sales logged today yet."`, `"No expenses found for the selected date range."`, `"No keno logs logged today yet."`, `"No credits logged yet."`) within clean child elements to maintain 100% test compatibility.

---

## 3. Invariants & Guardrails
- **Zero API Mutation:** Zero backend or shared package code is touched.
- **Zero Test Regressions:** All 625 Vitest tests and 20 Playwright tests must pass with 100% success.
- **Accessibility:** All icons are decorative (`aria-hidden="true"`), button accessible names remain exact, and contrast standards are preserved.
- **Fitness Functions (AVP-001):** Biome lint (0 errors), Knip (0 issues), and monorepo build clean.

# M-110 / ACP-018: Blast Radius, Impact Propagation & Containment Review

**Date:** 2026-09-22  
**Mission:** M-110 Mobile Navigation Drawer Legibility Hardening  
**Proposal:** ACP-018  
**Governance Standard:** AGENTS.md Rule 16 (Anti-Assumption), Rule 26 (Blast Radius & Traceability), Rule 28 (Test-Negative Validation)

---

## 1. Plan Correctness Review

### Empirical Investigation
1. **Target Component:** `packages/client/src/layouts/Layout.tsx`
2. **Current State:**
   - Desktop sidebar (`<aside>`) has `text-zinc-300` on its outer container (`<aside className="hidden md:flex md:w-64 bg-zinc-900 text-zinc-300 flex-col">`).
   - Mobile drawer container (`<div data-testid="mobile-nav-drawer">`) had `bg-zinc-900/95` but **omitted** any text color class.
   - Mobile drawer inactive links specified only hover states:
     ```tsx
     isActive
       ? "bg-zinc-800 text-white"
       : "hover:bg-zinc-800 hover:text-white"
     ```
   - On touch devices (smartphones/tablets), hover pseudo-states do not apply prior to interaction.
   - The inactive links defaulted to the body foreground color (`text-zinc-900`), resulting in near-black text on a near-black background (`bg-zinc-900`).

### Contrast Verification (WCAG 2.1 Formula)
- Background: `zinc-900` (`#18181b` - relative luminance ~0.011)
- Previous Inactive Text (ambient dark inherit): `#09090b` (contrast ratio ~1.1:1 — **Fails WCAG AA**)
- New Inactive Text (`text-zinc-200` = `#e4e4e7` - relative luminance ~0.762):
  $$\text{Contrast Ratio} = \frac{0.762 + 0.05}{0.011 + 0.05} = \frac{0.812}{0.061} \approx 13.3:1$$
  *(Exceeds WCAG AAA requirement of 7.0:1)*
- New Inactive Icon (`text-zinc-400` = `#a1a1aa` - relative luminance ~0.359):
  $$\text{Contrast Ratio} = \frac{0.359 + 0.05}{0.011 + 0.05} \approx 6.7:1$$
  *(Exceeds WCAG AA requirement of 4.5:1)*
- Active Link (`bg-zinc-800 text-white` with `text-indigo-400` icon):
  $$\text{Contrast Ratio} > 15:1$$
  *(Instant visual hierarchy and active page orientation)*

---

## 2. Blast Radius & Dependency Graph Analysis

### Upstream Dependencies (What `Layout.tsx` depends on)
- `@level-up/shared`: `ROLES` constant (immutable enum)
- `firebase/auth`: `signOut`, `auth` (auth logout trigger)
- `lucide-react`: SVG icon glyphs
- `react-router-dom`: `Link`, `useLocation`
- `../components/ui/button`: Button primitive
- `../components/ui/confirm-dialog`: ConfirmDialog modal
- `../contexts/AuthContext`: `useAuth` hook

**Upstream Impact:** Zero. No imports, props, signatures, or contracts are modified.

### Downstream Dependents (What depends on `Layout.tsx`)
Cruised via `dependency-cruiser` across all workspace packages:
- Only **1** component imports `Layout.tsx`: `packages/client/src/App.tsx`.
- `App.tsx` wraps authenticated routes inside `<Layout>{children}</Layout>`.
- Individual page components (`Dashboard`, `GameSales`, `Reports`, etc.) **do not** import `Layout.tsx`; they are rendered as `children`.

**Downstream Impact:** Contained strictly to the application frame rendered in `App.tsx`.

---

## 3. Impact Propagation & Containment Proof

### Boundary 1: Desktop Viewport Containment (Width >= 768px)
- The mobile drawer is enclosed in:
  ```tsx
  {isMobileMenuOpen && (
    <div data-testid="mobile-nav-drawer" className="order-first md:order-none md:hidden ...">
  ```
- Because the element has `md:hidden` applied, Tailwind compiles a CSS rule:
  `@media (min-width: 768px) { display: none !important; }`
- **Containment Proof:** No mobile styling can leak into desktop or tablet landscape viewports (>= 768px). Desktop `<aside>` styling remains completely isolated.

### Boundary 2: Mobile Viewport Normal State (Drawer Closed)
- When `isMobileMenuOpen` is `false`, the drawer is not rendered in the DOM (`{isMobileMenuOpen && ...}`).
- The compact mobile header bar (`<header className="... md:hidden">`) remains unchanged in geometry and alignment.

### Boundary 3: Touch Target Ergonomics
- Padding upgraded from `py-2.5 px-3` to `py-3 px-3.5` with `rounded-lg`.
- Link height increases to 46-48px, fully compliant with WCAG 2.5.5 (44x44px minimum touch target size).

### Boundary 4: Business Logic & Data Flow
- No state mutations, no API calls, no Firestore subscriptions, and no routing navigations are altered.
- All routing events continue to invoke `setIsMobileMenuOpen(false)` via `useEffect([location.pathname])`.

---

## 4. Test-Negative Gating Plan (Rule 28)

1. **Red Gate:**
   - In `packages/client/src/__tests__/layouts/Layout.test.tsx`, assert:
     - Drawer container has `text-zinc-100`.
     - Inactive links have explicit `text-zinc-200` class.
     - Inactive links have `py-3` class.
   - Execute against current codebase: **PROVE FAILURE (RED)**.
2. **Green Gate:**
   - Apply the targeted typography and class updates to `Layout.tsx`.
   - Execute test suite: **PROVE SUCCESS (GREEN)**.
3. **E2E Visual Verification:**
   - Execute Playwright test suite to verify full integration.

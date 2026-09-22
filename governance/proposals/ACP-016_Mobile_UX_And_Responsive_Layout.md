# ACP-016: Mobile UX Modernization & Responsive Layout Hardening

**Author:** AI Implementor  
**Date:** 2026-09-22  
**Status:** Approved  
**Related ADRs:** ADR-001 (Thin Client), ADR-006 (Test-Negative Gating)  
**Related Missions:** M-108  

---

## 1. Problem Statement

Empirical multi-device testing revealed critical mobile UX bottlenecks and layout vulnerabilities:
1. **Vertical Navigation Stacking (`Layout.tsx`):** On viewports `< 768px` (Tailwind `md`), the sidebar component does not collapse or hide. All 11 navigation routes plus user info and Sign Out stack vertically at the top of the viewport, taking up over 450px of vertical height. Mobile operators must scroll past this entire list before seeing the actual page title or operational forms.
2. **Date Filter Button Clipping (`GameSales.tsx`, `Keno.tsx`, `Expenses.tsx`):** History filter controls use fixed flex rows (`flex gap-2 items-end`) with non-wrapping date inputs (`w-[150px]`). On narrow mobile screens (375px), the `Apply` and `Reset to Today` buttons get pushed off-screen.
3. **Reports Date Preset Wrapping (`Reports.tsx`):** The preset buttons wrap awkwardly across multiple lines without clean spacing on mobile viewports.
4. **Unhandled Date Parsing Exception Risk:** In `Dashboard.tsx`, calling `format(new Date(activeShift.start_time), ...)` without validity checking triggers a fatal React ErrorBoundary crash (`RangeError: Invalid time value`) when a shift has an undefined or unparsed timestamp.

---

## 2. Proposed Architecture & Solutions

### A. Collapsible Mobile Navigation Header (`Layout.tsx`)
- On screens `< 768px` (`md:hidden`):
  - Render a compact, fixed top header:
    - Left: Store logo/title (`Game Zone`).
    - Center/Right: Authenticated user indicator (`DisplayName (role)`).
    - Far Right: Accessible hamburger toggle button (`aria-label="Toggle navigation menu"`).
  - Toggling button opens a full overlay mobile drawer sheet containing role-filtered navigation links and Sign Out button.
  - Tapping any link or the backdrop automatically closes the drawer.
- On screens `≥ 768px` (`hidden md:flex md:w-64`):
  - Retain the existing, left-anchored dark sidebar layout without changes.

### B. Responsive Date Filter Wrapping
- In `GameSales.tsx`, `Keno.tsx`, and `Expenses.tsx`:
  - Apply `flex-wrap sm:flex-nowrap` to filter toolbars.
  - Allow date inputs to scale responsively (`w-full sm:w-[150px]`) so action buttons remain visible and easily tapped.

### C. Horizontal Preset Scroller (`Reports.tsx`)
- Wrap preset buttons in `flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none` to allow smooth mobile swipe gestures.

### D. Resilient Date Formatting Utility (`dateUtils.ts`)
- Implement `formatSafeDate(date: unknown, formatStr: string, fallback?: string): string`:
  - Validates date truthiness and `isValid(new Date(date))` before passing to `date-fns/format`.
  - Safely falls back to `fallback ?? "—"` on invalid or null values.

---

## 3. Scope & Blast Radius

- **Client Presentation Only:** Strictly confined to `@level-up/client` UI components and utilities (`Layout.tsx`, `dateUtils.ts`, `Dashboard.tsx`, `GameSales.tsx`, `Keno.tsx`, `Expenses.tsx`, `Reports.tsx`).
- **Server Zero-Change:** No API or backend routes modified.
- **Backwards Compatibility:** Desktop layouts and existing component tests remain 100% compliant.

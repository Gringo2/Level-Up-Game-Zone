# Proposal: ACP-038 Preset Filter Accessibility & ARIA State Attributes

**Status:** Approved  
**Author:** System Implementor  
**Date:** September 26, 2026  

---

## 1. Context & Problem Statement
In Level-Up Game Zone, date range presets ("Today", "Yesterday", "This Month", "Last Month", "This Week") provide rapid date navigation across entry pages (`GameSales`, `Keno`, `SportsBetting`, `Expenses`, `Credits`) and reports (`Reports`, `SalaryReport`).

Under Mission M-129 / ACP-037, visual active-state highlighting was established using `variant={isActive ? "default" : "outline"}` (`bg-zinc-900` vs `border-zinc-200`).

However, from an accessibility (a11y) and assistive technology perspective:
1. The preset buttons currently lack semantic state indications. Screen readers and accessibility tools cannot determine whether a preset button is currently applied or inactive because the distinction is purely visual via CSS styling.
2. In WAI-ARIA authoring practices for toggle and filter buttons, stateful filter options that can be toggled or selected must expose their active status via `aria-pressed={isActive}` (`true` or `false`).
3. Preset button clusters lack a wrapping container `role="group"` with an explicit `aria-label="Date range presets"`, preventing screen readers from announcing them as a cohesive set of related controls.

---

## 2. Proposed Architecture & Implementation
Standardize accessibility attributes on all date preset filter buttons across all 7 pages (`Reports.tsx`, `GameSales.tsx`, `Keno.tsx`, `SportsBetting.tsx`, `Expenses.tsx`, `Credits.tsx`, `SalaryReport.tsx`):

1. **Preset Button Semantic State (`aria-pressed`):**
   - Active preset buttons receive `aria-pressed="true"`.
   - Inactive preset buttons receive `aria-pressed="false"`.
   - When custom date ranges are typed into date inputs, all preset buttons transition to `aria-pressed="false"`.
2. **Preset Button Grouping (`role="group"` & `aria-label`):**
   - The flex container holding the preset buttons receives `role="group"` and `aria-label="Date range presets"`.
3. **Behavioral Invariants:**
   - Zero modifications to backend contracts, server routes, or Firestore collections.
   - Zero changes to date math or `dateUtils.ts`.
   - 100% backward compatibility with keyboard navigation and existing click handlers.

---

## 3. Scope & Target Files
- `packages/client/src/pages/Reports.tsx`
- `packages/client/src/pages/GameSales.tsx`
- `packages/client/src/pages/Keno.tsx`
- `packages/client/src/pages/SportsBetting.tsx`
- `packages/client/src/pages/Expenses.tsx`
- `packages/client/src/pages/Credits.tsx`
- `packages/client/src/pages/SalaryReport.tsx`
- Unit Test Suites:
  - `packages/client/src/__tests__/pages/Reports.test.tsx`
  - `packages/client/src/__tests__/pages/GameSales.test.tsx`
  - `packages/client/src/__tests__/pages/Keno.test.tsx`
  - `packages/client/src/__tests__/pages/SportsBetting.test.tsx`
  - `packages/client/src/__tests__/pages/Expenses.test.tsx`
  - `packages/client/src/__tests__/pages/Credits.test.tsx`
  - `packages/client/src/__tests__/pages/SalaryReport.test.tsx`

---

## 4. Verification & Testing Constitution (Rule 28)
- Prove Red state: Add unit test assertions checking `expect(button).toHaveAttribute("aria-pressed", "true")` and `"false"` on un-annotated buttons.
- Prove Green state: Verify all unit tests turn green once `aria-pressed` is bound.
- Full verification suite: Biome check, TypeScript check, Knip dead code audit, Vitest with v8 coverage, and Playwright 26/26 browser tests.

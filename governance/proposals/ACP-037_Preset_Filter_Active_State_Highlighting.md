# Proposal: ACP-037 Preset Filter Active State Highlighting

**Status:** Approved  
**Author:** System Implementor  
**Date:** September 26, 2026  

---

## 1. Context & Problem Statement
In Level-Up Game Zone, date range browsing was standardized across all historical entry pages (`GameSales.tsx`, `Keno.tsx`, `SportsBetting.tsx`, `Expenses.tsx`, `Credits.tsx`) and summary reports (`Reports.tsx`, `SalaryReport.tsx`). 

However, a design inconsistency exists between `Reports.tsx` and all other pages:
- In `Reports.tsx:341-345`, preset buttons dynamically indicate their active state:
  ```tsx
  variant={inputStartDate === p.from && inputEndDate === p.to ? "default" : "outline"}
  ```
  When a preset is active, it renders as a solid high-contrast button (`variant="default"`), clearly communicating the active time filter to the operator.
- Across `GameSales.tsx`, `Keno.tsx`, `SportsBetting.tsx`, `Expenses.tsx`, `Credits.tsx`, and `SalaryReport.tsx`, preset buttons ("Today", "Yesterday", "This Month", etc.) currently use static:
  ```tsx
  variant="ghost"
  ```
- **Operational Impact:** When an operator lands on an entry page (which defaults to "Today") or clicks "Yesterday", the button provides zero visual confirmation of which filter is currently active. The operator has to squint at the small date input text fields to verify what period is displayed.

---

## 2. Proposed Solution
Standardize active preset state highlighting across all entry and report pages to match the design pattern in `Reports.tsx`:
1. **Entry Pages (`GameSales.tsx`, `Keno.tsx`, `SportsBetting.tsx`):**
   - For "Today": `variant={rangeStart === todayStr && rangeEnd === todayStr ? "default" : "outline"}`
   - For "Yesterday": `variant={rangeStart === yesterdayStr && rangeEnd === yesterdayStr ? "default" : "outline"}`
2. **Outflow & Credit Pages (`Expenses.tsx`, `Credits.tsx`):**
   - For "Today": `variant={filterDateFrom === todayStr && filterDateTo === todayStr ? "default" : "outline"}`
   - For "Yesterday": `variant={filterDateFrom === yesterdayStr && filterDateTo === yesterdayStr ? "default" : "outline"}`
3. **Payroll Report (`SalaryReport.tsx`):**
   - For "This Month": `variant={inputStartDate === thisMonth.from && inputEndDate === thisMonth.to ? "default" : "outline"}`
   - For "Last Month": `variant={inputStartDate === lastMonth.from && inputEndDate === lastMonth.to ? "default" : "outline"}`
   - For "This Week": `variant={inputStartDate === thisWeek.from && inputEndDate === thisWeek.to ? "default" : "outline"}`
   - For "Today": `variant={inputStartDate === todayStr && inputEndDate === todayStr ? "default" : "outline"}`
   - For "Yesterday": `variant={inputStartDate === yesterdayStr && inputEndDate === yesterdayStr ? "default" : "outline"}`
4. **Behavioral Invariants:**
   - Active preset buttons receive `variant="default"`.
   - Inactive preset buttons receive `variant="outline"`.
   - When a custom date range is entered that does not match any preset, all preset buttons remain in `variant="outline"`.
   - No data fetching, API contracts, or date calculation logic is altered.

---

## 3. Scope & Affected Files
- `packages/client/src/pages/GameSales.tsx`
- `packages/client/src/pages/Keno.tsx`
- `packages/client/src/pages/SportsBetting.tsx`
- `packages/client/src/pages/Expenses.tsx`
- `packages/client/src/pages/Credits.tsx`
- `packages/client/src/pages/SalaryReport.tsx`
- Unit tests:
  - `packages/client/src/__tests__/pages/GameSales.test.tsx`
  - `packages/client/src/__tests__/pages/Keno.test.tsx`
  - `packages/client/src/__tests__/pages/SportsBetting.test.tsx`
  - `packages/client/src/__tests__/pages/Expenses.test.tsx`
  - `packages/client/src/__tests__/pages/Credits.test.tsx`
  - `packages/client/src/__tests__/pages/SalaryReport.test.tsx`

---

## 4. Verification & Testing Strategy (Rule 28)
- Capture red state test assertions proving preset buttons currently lack the active button styling when active.
- Verify green state after updating button variant bindings.
- Execute full AVP-001 verification (Lint, TypeScript, Vitest, Playwright, Knip, SSOT).

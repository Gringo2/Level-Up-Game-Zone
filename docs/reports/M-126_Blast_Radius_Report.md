# M-126 Blast Radius & Plan Correctness Report

**Mission:** M-126 Calendar Period Presets in Reports & Salary Report  
**Proposal:** ACP-034  
**Generated:** 2026-09-24  
**Status:** Pre-Execution Architecture & Correctness Review  

---

## 1. Changed-File Manifest

### Client Shared Utility Layer
1. `packages/client/src/lib/dateUtils.ts`
   - **Changes:**
     - Add pure functions: `getShopThisWeekRange`, `getShopLastWeekRange`, `getShopThisMonthRange`, `getShopLastMonthRange`.
     - Pure mathematical/date formatting additions using date-fns and `SHOP_TIMEZONE`.
   - **Downstream consumers:** `Reports.tsx`, `SalaryReport.tsx`. All existing exports and consumers (`Dashboard.tsx`, `Expenses.tsx`, `GameSales.tsx`, `Keno.tsx`, `SportsBetting.tsx`, `Credits.tsx`) are completely unaffected.

### Client Presentation Layer (2 Terminal Routed Pages)
2. `packages/client/src/pages/Reports.tsx`
   - **Changes:**
     - Add `Last Week` and `Last Month` to `presets` array in the horizontal scroll container.
   - **Downstream consumers:** 0 (Routed leaf component).
3. `packages/client/src/pages/SalaryReport.tsx`
   - **Changes:**
     - Add `This Month`, `Last Month`, and `This Week` preset buttons to the toolbar with immediate application.
     - Update contextual subtitle to reflect active period.
   - **Downstream consumers:** 0 (Routed leaf component).

### Test Files (3 Files)
4. `packages/client/src/__tests__/lib/dateUtils.test.ts`
   - Add unit tests for `getShopThisWeekRange`, `getShopLastWeekRange`, `getShopThisMonthRange`, `getShopLastMonthRange` with pinned system time.
5. `packages/client/src/__tests__/pages/Reports.test.tsx`
   - Add Red-Green test asserting `Last Week` and `Last Month` preset buttons set the expected date bounds and trigger fetch.
6. `packages/client/src/__tests__/pages/SalaryReport.test.tsx`
   - Add Red-Green test asserting `This Month`, `Last Month`, and `This Week` preset buttons update date bounds, contextual description, and trigger fetch.

---

## 2. Structural Dependency & Blast Radius Containment Analysis

```mermaid
graph TD
    App[App.tsx Router] --> Reports[Reports.tsx]
    App --> SalaryReport[SalaryReport.tsx]
    dateUtils[lib/dateUtils.ts (Pure additive)] --> Reports
    dateUtils --> SalaryReport
    Reports --> ExpressReports["Express /api/reports, /api/sales, etc."]
    SalaryReport --> ExpressSalary["Express /api/credits, /api/employees"]

    subgraph Untouched Subsystems
        Server["Express Controllers & Schemas (0 changes)"]
        Shared["@level-up/shared Types & Constants (0 changes)"]
        OtherPages["Dashboard, Expenses, Sales, Keno, Betting, Credits (0 changes)"]
    end
```

### Blast Radius Assessment
| Layer | Direct Changes | Indirect Impact | Risk Level |
|---|---|---|---|
| Server / Express API | None | None | Zero |
| Database / Firestore | None | None | Zero |
| Shared Types (`@level-up/shared`) | None | None | Zero |
| Client Date Utility (`dateUtils.ts`) | Additive pure helpers only | None | Minimal (fully tested) |
| Client Route Pages | 2 routed leaf components (`Reports.tsx`, `SalaryReport.tsx`) | None | Minimal (isolated UI) |

---

## 3. Plan Correctness & State Safety Verification

1. **Timezone Determinism (ACP-007 / Rule 28)**:
   - All range calculations use `getShopDate()` which anchors to `SHOP_TIMEZONE` (`Africa/Addis_Ababa`, UTC+3).
   - Week calculations explicitly specify `{ weekStartsOn: 1 }` (Monday start) so there is zero locale ambiguity across different browser environments.
   - Month boundaries use `startOfMonth` and `endOfMonth` in the shop timezone.

2. **Immediate Application UX Parity**:
   - In `SalaryReport.tsx`, clicking a preset immediately applies the dates (`setAppliedStartDate` & `setAppliedEndDate`) and syncs inputs (`setInputStartDate` & `setInputEndDate`), matching the behavior of `Today` and `Yesterday` from M-124.

3. **Responsive Containment**:
   - `Reports.tsx` preset bar already contains `overflow-x-auto max-w-full pb-1` from M-108, ensuring additional presets do not expand the viewport or cause horizontal overflow.
   - `SalaryReport.tsx` preset buttons use `variant="ghost"` and flex-wrap within the existing control bar.

# UI & UX Interactivity & Behavioral Specification (Empirically Verified)

This document specifies all **Frontend Interactive Behaviors, Visual Feedback States, and Layout Constraints** implemented in the client package.

---

## 1. Non-Blocking Shift and Backdated Entry Behavior
- **Behavior:** A missing current shift does not block navigation or financial data entry. Users can review history and submit backdated financial entries without resolving a missed-shift modal.
- **Constraint:** Shift open/close/reconciliation remains operational, while business dates are selected explicitly on financial entry forms.
- **Source Location:** [ADR-008](docs/adr/ADR-008_NonBlocking_Shifts_Backdated_Entry.md).

---

## 2. Dynamic Role-Based Sidebar Navigation Filtering
- **Behavior:** The left sidebar menu items are dynamically filtered against the active user's role (`user.role`).
- **Role Permission Matrix:**
  - **Staff:** Dashboard (`/`), Game Sales (`/games`)
  - **Manager:** Staff items + Keno (`/keno`), Credits (`/credits`), Expenses (`/expenses`), Salary Report (`/salary-report`), Reports (`/reports`), Employee Roster (`/admin/employees`), Admin Settings (`/admin`)
  - **Admin:** All Manager items + Activity Log (`/audit-logs`), User Management (`/admin/users`)
- **Source Location:** [Layout.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/layouts/Layout.tsx#L74-L125).

---

## 3. Cash Variance Dynamic Color Feedback
- **Behavior:** During the shift closing blind count form, cash variance (Actual Cash Counted vs Expected Cash) dynamically updates color coding:
  - **Positive Cash Surplus (`variance > 0`):** Text renders in emerald green (`text-emerald-400`).
  - **Negative Cash Shortage (`variance < 0`):** Text renders in red (`text-red-400`).
  - **Zero Variance (`variance === 0`):** Text renders in neutral white.
- **Source Location:** [Dashboard.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Dashboard.tsx#L322-L327).

---

## 4. Print-Optimized Z-Report / Safe Slip Layout
- **Behavior:** Clicking "Print Safe Slip" executes `window.print()`.
- **Styling Rule:** The main dashboard UI elements are hidden via `print:hidden`. A dedicated thermal slip layout (`hidden print:block absolute top-0 left-0 w-full bg-white text-black p-8`) renders with formatted dates, total revenue breakdowns, expected cash totals, variance explanations, and Manager and Owner signature lines.
- **Source Location:** [Dashboard.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Dashboard.tsx#L185-L221).

---

## 5. Audit Log JSON Snapshot Inspection Tooltip & Multi-Filter Search
- **Behavior:** In the Activity Log table (`/audit-logs`), hovering over the "View changes" or "View deleted data" table cell displays a native browser tooltip (`title` attribute) containing the raw stringified JSON payload snapshot (`log.old_data` / `log.new_data`) of the record before mutation or deletion.
- **Administrative Toolbar:** Includes dedicated Action filters (CREATE, UPDATE, DELETE), Collection filters, full-text quick search, active filter count, and reset button.
- **Source Location:** [AuditLogs.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/AuditLogs.tsx).

---

## 6. Inline Rate Editing Transition
- **Behavior:** In Admin Settings (`/admin`), clicking the "Edit" button on a game rate row replaces the read-only row with an inline editing card containing pre-filled inputs for Name, Price, Unit, and a mandatory "Reason for Change" input. Clicking "Cancel" or submitting restores the read-only row without triggering a full page reload.
- **Source Location:** [Admin.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Admin.tsx#L204-L375).

---

## 7. Real-Time Reactive Form Field Calculations
- **Behavior:**
  - **Game Sales:** Entering a quantity dynamically computes and renders calculated total ($ = rate * quantity) before submission.
  - **Keno Log:** Entering a net profit directly records and previews the net revenue amount ($) before submission per Mission M-66.
- **Source Locations:** [GameSales.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/GameSales.tsx), [Keno.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Keno.tsx).

---

## 8. Toast Feedback & Error State System
- **Behavior:** Every API creation, update, deletion, verification, role change, and shift operation triggers an immediate visual feedback toast via Sonner (`richColors` top-center toaster):
  - **Success:** Green toast with action confirmation message (e.g., `"Shift started!"`, `"Log deleted successfully!"`).
  - **Error:** Red toast displaying the exact backend error message string.
- **Source Location:** [App.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/App.tsx#L38) (`<Toaster position="top-center" richColors />`).

---

## 9. Shift Closure Safeguards & Manual Start Fallback
- **Behavior:** Clicking "Close Shift" launches an accessible `<ConfirmDialog>` modal requesting confirmation before executing the closure transaction to eliminate accidental closings. When no shift is open, a dedicated manual "Start Shift" card renders on the Dashboard, preventing dead-ends.
- **Source Location:** [Dashboard.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Dashboard.tsx).

---

## 10. Collapsible Mobile Navigation Drawer
- **Behavior:** On mobile viewports (<768px), the desktop permanent sidebar collapses into a compact top header with hamburger toggle. Clicking the toggle opens a slide-down navigation drawer with high-contrast text (`text-zinc-200` inactive, `text-white` active), WCAG-compliant touch targets (`py-3`), and an accessible sign-out button.
- **Source Location:** [Layout.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/layouts/Layout.tsx).

---

## 11. Date Range Inversion Prevention & Flight Guards
- **Behavior:** On Reports and Salary Report, selecting a "From" date later than "To" displays an inline warning banner (`From date cannot be after To date`) and disables the Apply button. During active data fetching, loading spinners indicate in-flight state and prevent duplicate submissions.
- **Source Locations:** [Reports.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Reports.tsx), [SalaryReport.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/SalaryReport.tsx).

---

## 12. Brand Identity & Contextual Empty States
- **Behavior:** Document title is branded as `Level-Up Game Zone` with a custom SVG controller favicon. Tables displaying empty query states render themed Lucide icons (`Gamepad2`, `Receipt`, `Coins`, `CreditCard`) with helpful contextual guidance.
- **Source Locations:** [index.html](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/index.html), [GameSales.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/GameSales.tsx), [Expenses.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Expenses.tsx), [Keno.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Keno.tsx), [Credits.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Credits.tsx).


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
  - **Manager:** Staff items + Keno (`/keno`), Credits (`/credits`), Expenses (`/expenses`), Salary Report (`/salary-report`), Reports (`/reports`), Admin Settings (`/admin`)
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

## 5. Audit Log JSON Snapshot Inspection Tooltip
- **Behavior:** In the Activity Log table (`/audit-logs`), hovering over the "View changes" or "View deleted data" table cell displays a native browser tooltip (`title` attribute) containing the raw stringified JSON payload snapshot (`log.old_data` / `log.new_data`) of the record before mutation or deletion.
- **Source Location:** [AuditLogs.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/AuditLogs.tsx#L127-L135).

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


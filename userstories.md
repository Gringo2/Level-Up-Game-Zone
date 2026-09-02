# End-User Business Stories (Empirically Verified)

This document contains strictly **End-User Business Capabilities** (As a <Role>, I can <Action> so that <Benefit>). For UI/UX interactive behaviors or backend technical mechanisms, see [UI_UX_BEHAVIORS.md](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/UI_UX_BEHAVIORS.md) and [SYSTEM_MECHANISMS.md](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/SYSTEM_MECHANISMS.md).

---

## 1. Authentication & Security (All Users)

### US-1.1: Sign in with Google Account
- **As any user**, I can sign in with my Google account so that I can securely access the application.
- **Frontend Verification:** [Login.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Login.tsx#L16-L31) (`signInWithPopup`).
- **Backend Verification:** [auth.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/middleware/auth.ts#L22) (`auth.verifyIdToken`).

### US-1.2: Profile & Role Resolution via Express API
- **As any user**, my profile and assigned role (`staff`, `manager`, `admin`) are fetched directly from the backend API.
- **Frontend Verification:** [AuthContext.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/contexts/AuthContext.tsx#L32-L48) (`GET /api/users/me`).
- **Backend Verification:** [usersController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/usersController.ts#L8-L34) (`getMe` handler).

### US-1.3: Unauthenticated Direct Access Blocking
- **As an unauthenticated user**, I am automatically blocked and rendered the Login page when attempting to access any protected route.
- **Frontend Verification:** [App.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/App.tsx#L30-L32) (`if (!user) return <Login />;`).

---

## 2. Shift Management (Staff & Managers)

### US-2.1: Start Shift with Opening Float
- **As a staff member/manager**, I can start a new shift by specifying an opening cash float.
- **Frontend Verification:** [ShiftContext.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/contexts/ShiftContext.tsx#L40-L65) (`POST /api/shifts`).
- **Backend Verification:** [shiftsController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/shiftsController.ts#L21-L63) (`startShift`).

### US-2.2: View Active Shift Status
- **As a staff member/manager**, I can view the active shift status including manager name and start time.
- **Frontend Verification:** [Dashboard.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Dashboard.tsx#L280-L286).

### US-2.3: Blind Count Close Shift
- **As a staff member/manager**, I can perform a blind cash count shift close by submitting actual cash counted.
- **Frontend Verification:** [Dashboard.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Dashboard.tsx#L135-L173).
- **Backend Verification:** [shiftsController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/shiftsController.ts#L65-L120) (`closeShift`).

### US-2.4: Cash Shortage / Variance Explanation Threshold
- **As a staff member/manager**, if cash variance exceeds **$2.00**, I am required to provide an explanation reason before closing.
- **Frontend Verification:** [Dashboard.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Dashboard.tsx#L138-L141).
- **Backend Verification:** [shiftsController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/shiftsController.ts#L100-L105).

### US-2.5: Printable Z-Report / Safe Slip
- **As a staff member/manager**, I can print a formatted Safe Slip with Manager and Owner signature lines for shift closing.
- **Frontend Verification:** [Dashboard.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Dashboard.tsx#L185-L221).

---

## 3. Game Sales Management (Staff, Managers & Admins)

### US-3.1: Active Game Rates Listing
- **As a staff member**, I can view all active game rates ($ per Hour or per Game) when logging sales.
- **Frontend Verification:** [GameSales.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/GameSales.tsx#L46-L75).

### US-3.2: Log Game Sales
- **As a staff member**, I can record daily game sales entries.
- **Frontend Verification:** [GameSales.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/GameSales.tsx#L188-L230).
- **Backend Verification:** [salesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/salesController.ts#L21-L58).

### US-3.3: Edit Game Sales Log with Mandatory Reason
- **As a manager/admin**, I can edit a sales entry with a required change reason.
- **Frontend Verification:** [GameSales.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/GameSales.tsx#L159-L187).
- **Backend Verification:** [salesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/salesController.ts#L60-L117).

### US-3.4: Delete Game Sales Log with Mandatory Reason
- **As a manager/admin**, I can delete a sales entry with a required deletion reason.
- **Frontend Verification:** [GameSales.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/GameSales.tsx#L119-L150).
- **Backend Verification:** [salesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/salesController.ts#L119-L158).

---

## 4. Keno Management (Managers & Admins)

### US-4.1: Log Keno Net Profit
- **As a manager/admin**, I can record daily Keno net profit entries directly per Mission M-66.
- **Frontend Verification:** [Keno.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Keno.tsx#L190-L215).
- **Backend Verification:** [kenoController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/kenoController.ts#L21-L58).

### US-4.2: Edit / Delete Keno Entries with Mandatory Reason
- **As a manager/admin**, I can update or remove Keno records with audit explanations.
- **Frontend Verification:** [Keno.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Keno.tsx#L165-L188).
- **Backend Verification:** [kenoController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/kenoController.ts#L60-L158).

### US-4.3: Verify Keno Entries
- **As a manager/admin**, I can mark a Keno entry as Verified.
- **Frontend Verification:** [Keno.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Keno.tsx#L100-L125).
- **Backend Verification:** [kenoController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/kenoController.ts#L160-L195).

---

## 5. Expense Tracking (Managers & Admins)

### US-5.1: Record Business Expenses
- **As a manager/admin**, I can log shop expenses by category (Misc, Supplies, Maintenance).
- **Frontend Verification:** [Expenses.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Expenses.tsx#L193-L220).
- **Backend Verification:** [expensesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/expensesController.ts#L21-L58).

### US-5.2: Edit / Delete Expenses with Audit Reasons
- **As a manager/admin**, I can modify or remove expenses with mandatory reasons.
- **Frontend Verification:** [Expenses.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Expenses.tsx#L172-L192).
- **Backend Verification:** [expensesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/expensesController.ts#L60-L158).

### US-5.3: Verify Expense Record
- **As a manager/admin**, I can verify logged expenses.
- **Frontend Verification:** [Expenses.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Expenses.tsx#L137-L160).
- **Backend Verification:** [expensesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/expensesController.ts#L160-L195).

---

## 6. Credit & IOU Management (Managers & Admins)

### US-6.1: Record Employee / Customer Credits (IOUs)
- **As a manager/admin**, I can log employee or customer credits.
- **Frontend Verification:** [Credits.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Credits.tsx#L191-L220).
- **Backend Verification:** [creditsController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/creditsController.ts#L21-L58).

### US-6.2: Resolve Credits (Paid vs Salary Deduction)
- **As a manager/admin**, I can mark a pending credit as **Resolved (Paid)** or **Deducted (Salary Deduction)**.
- **Frontend Verification:** [Credits.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Credits.tsx#L76-L120) (`handleResolve`).
- **Backend Verification:** [creditsController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/creditsController.ts#L60-L115).

### US-6.3: Edit / Delete Credits with Audit Reasons
- **As a manager/admin**, I can edit or delete credit entries with a required reason.
- **Frontend Verification:** [Credits.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Credits.tsx#L171-L190).
- **Backend Verification:** [creditsController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/creditsController.ts#L60-L158).

---

## 7. Reports & Analytics (Managers & Admins)

### US-7.1: Date Range Filtered Analytics
- **As a manager/admin**, I can select start and end dates to filter financial metrics.
- **Frontend Verification:** [Reports.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Reports.tsx#L36-L64).

### US-7.2: Revenue & Cash Flow Summaries with Charts
- **As a manager/admin**, I can view aggregate totals for Game Sales, Keno, Expenses, and Pending Credits with a Recharts breakdown.
- **Frontend Verification:** [Reports.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Reports.tsx#L120-L220).

### US-7.3: Salary Deductions Payroll Report
- **As a manager/admin**, I can view total IOUs marked for salary deduction grouped by employee.
- **Frontend Verification:** [SalaryReport.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/SalaryReport.tsx#L43-L72).

---

## 8. Administration & Governance (Admins Only)

### US-8.1: Add Game Pricing Rate
- **As an admin**, I can define new game rates ($ per Hour or per Game).
- **Frontend Verification:** [Admin.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Admin.tsx#L64-L102).
- **Backend Verification:** [gameRatesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/gameRatesController.ts#L21-L58).

### US-8.2: Edit Game Pricing Rate with Mandatory Reason
- **As an admin**, I can edit rate names, prices, and unit types with an audit reason.
- **Frontend Verification:** [Admin.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Admin.tsx#L119-L170).
- **Backend Verification:** [gameRatesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/gameRatesController.ts#L60-L111).

### US-8.3: Toggle Game Rate Active Status
- **As an admin**, I can activate/deactivate rates.
- **Frontend Verification:** [Admin.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Admin.tsx#L172-L200).
- **Backend Verification:** [gameRatesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/gameRatesController.ts#L89-L91).

### US-8.4: User Role Management (Admins Only)
- **As an admin**, I can view registered users, invite users, and change user roles (`staff`, `manager`, `admin`).
- **Frontend Verification:** [UserManagement.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/components/UserManagement.tsx#L69-L96).
- **Backend Verification:** [usersController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/usersController.ts#L80-L115).

### US-8.5: Activity & Audit Logs (Admins Only)
- **As an admin**, I can review an immutable log of all system changes, edits, and deletions.
- **Frontend Verification:** [AuditLogs.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/AuditLogs.tsx#L27-L59).
- **Backend Verification:** [auditLogsController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/auditLogsController.ts#L5-L20).

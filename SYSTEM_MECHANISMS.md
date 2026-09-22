# System & Infrastructure Mechanisms Specification (Empirically Verified)

This document specifies all **System Architectures, Infrastructure Guarantees, and Background Operational Mechanisms** implemented across the server and client packages.

---

## 1. OAuth Popup-Blocked Redirection Fallback Mechanism
- **Mechanism:** When a user initiates Google Sign-In, `signInWithPopup(auth, googleProvider)` is executed. If a browser popup blocker intercepts the window (`err.code === 'auth/popup-blocked'`), the client automatically catches the exception and executes `signInWithRedirect(auth, googleProvider)` to ensure authentication continuity across strict privacy browsers.
- **Source Location:** [Login.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Login.tsx#L21-L28).

---

## 2. Profile Auto-Provisioning & Admin Bootstrap Mechanism
- **Mechanism:** Upon initial Google authentication, `AuthContext` sends `GET /api/users/me`. If the backend returns `404 Not Found` (new user), the client automatically issues `POST /api/users`.
- **Admin Bootstrap Rule:** If the authenticated Google account email is present in `ROOT_ADMIN_EMAILS` (defaults to `bezueyob3@gmail.com` and `jobsbezu@gmail.com`, overridable via `ROOT_ADMIN_EMAILS` environment variable), the role is automatically provisioned as `admin`. All other accounts default to `staff` unless an active invite exists.
- **Source Location:** [AuthContext.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/contexts/AuthContext.tsx#L48-L66) & [usersController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/usersController.ts#L39-L74).

---

## 3. Atomic Multi-Collection Firestore Audit Transaction Guarantee
- **Mechanism:** Every database mutation controller (`create`, `update`, `delete`, `verify`, `updateRole`) wraps primary record mutation and `audit_logs` collection entry creation inside an atomic `db.runTransaction()`.
- **Guarantee:** If the audit log creation fails or target document concurrency checks fail, the primary record mutation is atomically aborted and rolled back.
- **Source Locations:**
  - [salesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/salesController.ts#L38-L49)
  - [gameRatesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/gameRatesController.ts#L38-L49)
  - [kenoController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/kenoController.ts#L38-L49)
  - [expensesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/expensesController.ts#L38-L49)
  - [creditsController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/creditsController.ts#L38-L49)

---

## 4. Timezone-Anchored Operating Day Boundary Calculation
- **Mechanism:** Financial logs and daily sales tables operate on explicit timezone-aware day boundary calculations configured for `Africa/Addis_Ababa` (UTC+3).
- **Rule:** Start of day (`getShopStartOfDay`) evaluates to `00:00:00.000` in UTC+3, and end of day (`getShopEndOfDay`) evaluates to `23:59:59.999` in UTC+3, insulating operating dates from client-side local browser time drift.
- **Source Locations:** [dateUtils.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/lib/dateUtils.ts#L4-L16), [GameSales.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/GameSales.tsx#L67-L71), [Expenses.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Expenses.tsx#L56-L62).

---

## 5. Shift-Framed Metric Isolation Mechanism
- **Mechanism:** On the Dashboard, when an active shift is open (`activeShift !== null`), financial metric cards (Game Sales, Keno Net, Credits, Expenses) filter calculations from `activeShift.start_time` to present. If no shift is open, calculations default to `getShopStartOfDay()`.
- **Source Location:** [Dashboard.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Dashboard.tsx#L41-L44).

---

## 6. Deterministic E2E Testing Session Injection Mechanism
- **Mechanism:** For Playwright automated testing, setting `window.__E2E_USER__` during page initial script execution bypasses Firebase Auth network listeners and injects the test user session with 0ms latency.
- **Source Location:** [AuthContext.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/contexts/AuthContext.tsx#L23-L30).

---

## 7. Secure Sign Out & Session Teardown Mechanism
- **Mechanism:** Clicking "Sign Out" executes `signOut(auth)`. `onAuthStateChanged` receives `null`, which immediately clears the `user` context state and triggers an unauthenticated redirect (`<Login />`), unmounting all protected application routes.
- **Source Location:** [Layout.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/layouts/Layout.tsx#L160-L168) & [AuthContext.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/contexts/AuthContext.tsx#L74-L78).

---

## 8. Explicit Shift Auto-Open Transaction Endpoint
- **Mechanism:** Rather than executing silent, unauthenticated read side-effects during gap queries, shift auto-opening is isolated into an authenticated, transactional `POST /api/shifts/auto-open` endpoint.
- **Guarantee:** Verifies that no OPEN shift exists for the current calendar day, resolves the carryover float from the previous shift or sets a default of 0, attaches a system audit entry, and atomically opens the new shift under the `System Auto-Open` identity.
- **Source Location:** [shiftsController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/shiftsController.ts) (`autoOpenShift`).

---

## 9. Automatic Shift-Employee Linkage Resolution
- **Mechanism:** When starting a shift (`startShift` or `autoOpenShift`), the backend automatically queries the `employees` collection matching the authenticated manager's `user.uid` where `isActive === true`. If found, `shift.employee_id` is automatically populated at creation time.
- **Source Location:** [shiftsController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/shiftsController.ts).

---

## 10. 1-to-1 Employee-to-User Account Uniqueness Enforcement
- **Mechanism:** Inside an atomic Firestore transaction during employee creation or update, the server checks if the provided `user_uid` is already linked to another active employee record. If a duplicate is detected, the transaction aborts with HTTP `409 Conflict` (`"User is already linked to another active employee"`), preventing account collisions.
- **Source Location:** [employeesController.ts](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/server/src/controllers/employeesController.ts).

---

## 11. Filter-Aware History Mutation Invariant Guard
- **Mechanism:** On Game Sales, Keno, and Expenses, history lists maintain an invariant that visible rows strictly fall within `[filterDateFrom, filterDateTo]`. When creating or editing entries, the client evaluates `isWithinActiveRange(dateStr)`: if the updated or created date falls outside the active query filter, it is excluded from the visible list rather than polluting the historical view.
- **Source Locations:** [GameSales.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/GameSales.tsx), [Keno.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Keno.tsx), [Expenses.tsx](file:///home/gringo2/Desktop/ProjectX/Level-Up-Game-Zone/packages/client/src/pages/Expenses.tsx).


# System & Infrastructure Mechanisms Specification (Empirically Verified)

This document specifies all **System Architectures, Infrastructure Guarantees, and Background Operational Mechanisms** implemented across the server and client packages.

---

## 1. OAuth Popup-Blocked Redirection Fallback Mechanism
- **Mechanism:** When a user initiates Google Sign-In, `signInWithPopup(auth, googleProvider)` is executed. If a browser popup blocker intercepts the window (`err.code === 'auth/popup-blocked'`), the client automatically catches the exception and executes `signInWithRedirect(auth, googleProvider)` to ensure authentication continuity across strict privacy browsers.
- **Source Location:** [Login.tsx](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/client/src/pages/Login.tsx#L21-L28).

---

## 2. Profile Auto-Provisioning & Admin Bootstrap Mechanism
- **Mechanism:** Upon initial Google authentication, `AuthContext` sends `GET /api/users/me`. If the backend returns `404 Not Found` (new user), the client automatically issues `POST /api/users`.
- **Admin Bootstrap Rule:** If the authenticated Google account email matches `bezueyob3@gmail.com`, the role is automatically provisioned as `admin`. All other accounts default to `staff`.
- **Source Location:** [AuthContext.tsx](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/client/src/contexts/AuthContext.tsx#L48-L66) & [usersController.ts](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/server/src/controllers/usersController.ts#L39-L74).

---

## 3. Atomic Multi-Collection Firestore Audit Transaction Guarantee
- **Mechanism:** Every database mutation controller (`create`, `update`, `delete`, `verify`, `updateRole`) wraps primary record mutation and `audit_logs` collection entry creation inside an atomic `db.runTransaction()`.
- **Guarantee:** If the audit log creation fails or target document concurrency checks fail, the primary record mutation is atomically aborted and rolled back.
- **Source Locations:**
  - [salesController.ts](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/server/src/controllers/salesController.ts#L38-L49)
  - [gameRatesController.ts](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/server/src/controllers/gameRatesController.ts#L38-L49)
  - [kenoController.ts](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/server/src/controllers/kenoController.ts#L38-L49)
  - [expensesController.ts](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/server/src/controllers/expensesController.ts#L38-L49)
  - [creditsController.ts](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/server/src/controllers/creditsController.ts#L38-L49)

---

## 4. Timezone-Anchored Operating Day Boundary Calculation
- **Mechanism:** Financial logs and daily sales tables operate on explicit timezone-aware day boundary calculations configured for `Africa/Addis_Ababa` (UTC+3).
- **Rule:** Start of day (`getShopStartOfDay`) evaluates to `00:00:00.000` in UTC+3, and end of day (`getShopEndOfDay`) evaluates to `23:59:59.999` in UTC+3, insulating operating dates from client-side local browser time drift.
- **Source Locations:** [dateUtils.ts](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/client/src/lib/dateUtils.ts#L4-L16), [GameSales.tsx](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/client/src/pages/GameSales.tsx#L67-L71), [Expenses.tsx](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/client/src/pages/Expenses.tsx#L56-L62).

---

## 5. Shift-Framed Metric Isolation Mechanism
- **Mechanism:** On the Dashboard, when an active shift is open (`activeShift !== null`), financial metric cards (Game Sales, Keno Net, Credits, Expenses) filter calculations from `activeShift.start_time` to present. If no shift is open, calculations default to `getShopStartOfDay()`.
- **Source Location:** [Dashboard.tsx](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/client/src/pages/Dashboard.tsx#L41-L44).

---

## 6. Deterministic E2E Testing Session Injection Mechanism
- **Mechanism:** For Playwright automated testing, setting `window.__E2E_USER__` during page initial script execution bypasses Firebase Auth network listeners and injects the test user session with 0ms latency.
- **Source Location:** [AuthContext.tsx](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/client/src/contexts/AuthContext.tsx#L23-L30).

---

## 7. Secure Sign Out & Session Teardown Mechanism
- **Mechanism:** Clicking "Sign Out" executes `signOut(auth)`. `onAuthStateChanged` receives `null`, which immediately clears the `user` context state and triggers an unauthenticated redirect (`<Login />`), unmounting all protected application routes.
- **Source Location:** [Layout.tsx](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/client/src/layouts/Layout.tsx#L160-L168) & [AuthContext.tsx](file:///home/gringo2/gringo2/Level-Up-Game-Zone/packages/client/src/contexts/AuthContext.tsx#L74-L78).


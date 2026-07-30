# Monorepo Migration State & Session Checkpoint
**Last Updated**: 2026-07-30

## 1. Project Objective
Transition the `Level-Up-Game-Zone` monorepo from a fragile, client-heavy Firebase application to a secure, "Thin Client" architecture. All data mutations, role verifications, and financial operations must be routed through a transactional Express.js backend to enforce strict Zero-Trust security and maintain an immutable `audit_logs` ledger.

---

## 2. Completed Milestones (Phase 1 & 2)

### A. Infrastructure & Static Analysis
- **Toolchain**: Integrated Biome (linting/formatting), Knip (dependency auditing), and Husky (pre-commit gating).
- **Type Safety**: Enforced strict `tsc -b` pass-through across the monorepo (`packages/client`, `packages/server`, `packages/shared`).

### B. Backend API Controllers (100% Implemented)
Created Express routes and controllers to handle all business logic securely via `db.runTransaction()`:
1.  **Sales** (`salesController.ts`): Secure CRUD for Game Sales logs.
2.  **Keno** (`kenoController.ts`): Secure CRUD & verification for Keno.
3.  **Expenses** (`expensesController.ts`): Secure CRUD & verification for Expenses.
4.  **Game Rates** (`gameRatesController.ts`): Admin pricing configurations.
5.  **Shifts** (`shiftsController.ts`): Shift initiation and closing/cash variance logic.
6.  **Credits** (`creditsController.ts`): Employee store credit management.
7.  **Users** (`usersController.ts`): User registration and role assignments.

### C. Frontend "Thin Client" Migration (100% Implemented)
- Systematically removed all instances of Firebase client SDK mutations (`addDoc`, `updateDoc`, `setDoc`, `deleteDoc`) across `packages/client/src`.
- Refactored `App.tsx` and `UserManagement.tsx` to communicate exclusively with the `http://localhost:4000/api/*` backend using JWT `Bearer` token authentication.

### D. Zero-Trust Role Verification
- Patched the backend verification logic. The server no longer trusts the frontend payload or JWT for role claims. Instead, it deterministically queries the Firestore `users` collection to verify if the actor has `admin` or `manager` privileges before approving financial logs.

---

## 3. Outstanding Action Items (Next Session)

During the final correctness review, two minor architectural gaps were identified that need to be resolved in the next session to achieve 100% feature parity with the legacy app:

### Action Item 1: Credits `resolved_date` Bug
*   **Location**: `packages/server/src/controllers/creditsController.ts` (`updateCredit`)
*   **Issue**: When the React client marks a credit as "Resolved" or "Deducted" via `PUT /api/credits/:id`, the backend currently updates the `status` but fails to append a `resolved_date` timestamp.
*   **Fix**: Update the `newValues` object construction to dynamically inject `resolved_date: new Date().toISOString()` whenever `status` is explicitly defined in the payload.

### Action Item 2: User Registration State Bug
*   **Location**: `packages/client/src/App.tsx` (`onAuthStateChanged` hook)
*   **Issue**: When a brand new user authenticates via Google for the first time, the client triggers `POST /api/users` to create their database profile. However, it fails to invoke the React `setUser()` state setter upon completion, meaning the user remains virtually "logged out" until they manually refresh the page.
*   **Fix**: Chain a `setUser` call containing the newly created user data immediately after the successful `fetch` call resolves.

---

## 4. Next Phase: Firestore Lockdown (Phase 3)
Once the action items above are patched, the final step in the migration is to update the Firebase Security Rules (`firestore.rules`). We must strictly deny all `write` access from the web client, ensuring the Express backend (via the Admin SDK) is the sole authority capable of mutating the database.

# Proposal: ACP-028 Sports Betting Income Stream Integration

## 1. Context and Problem Statement
Level-Up Game Zone operates multiple revenue streams: Game Sales (hourly console and per-game pool sessions) and Keno. The store also operates **Sports Betting**, which generates independent income. Currently, the system lacks any data model, API endpoints, register drawer integration, or UI for logging and reporting Sports Betting income.

Per Product Owner direction:
1. Sports Betting income is logged as a **Simple Net Income** amount (net profit/loss from the sports betting terminal/software per shift/day, matching the operational pattern used for Keno).
2. Sports Betting income directly affects the **physical cash register drawer** and must be incorporated into the Shift's `expected_cash_calculated` formula.
3. Access is restricted to **Managers and Admins** (`[ROLES.ADMIN, ROLES.MANAGER]`).
4. The **Dashboard** must feature a dedicated Sports Betting KPI card, and the printable **Safe Slip (Z-Report)** and **Financial Reports** must include Sports Betting income.

## 2. Proposed Architecture & System Design

### 2.1 Shared Layer (`@level-up/shared`)
- **Collection Name:** `COLLECTIONS.SPORTS_BETTING_LOGS = "sports_betting_logs"`
- **Data Interface:**
  ```typescript
  export interface SportsBettingLog {
    id: string;
    net_profit: number;
    user_id: string;
    user_name?: string;
    date: string;
    verified?: boolean;
  }
  ```
- **Validation Schemas:**
  - `CreateSportsBettingSchema`: requires finite `net_profit`, optional ISO `date`.
  - `UpdateSportsBettingSchema`: requires finite `net_profit`, `editReason` (min 3 chars).

### 2.2 Server Architecture (`packages/server`)
- **Endpoints (`/api/sports-betting`):**
  - `GET /api/sports-betting`: paginated list with `startDate` and `endDate` range filters.
  - `POST /api/sports-betting`: creates log entry; Manager/Admin role auto-verifies; logs `CREATE` audit log.
  - `PUT /api/sports-betting/:id`: updates log entry with mandatory `editReason`; logs `UPDATE` audit log.
  - `DELETE /api/sports-betting/:id`: removes log entry with mandatory `deleteReason`; logs `DELETE` audit log.
  - `PUT /api/sports-betting/:id/verify`: marks entry as verified.
- **Shift Drawer Calculation (`shiftsController.ts`):**
  - Updated formula:
    `expectedCash = opening_float + totalGameSales + totalKenoNet + totalSportsBettingNet - totalExpenses - pendingCredits`

### 2.3 Client Architecture (`packages/client`)
- **Navigation (`Layout.tsx`):**
  - Add `Sports Betting` nav item (`path: "/betting"`, `icon: Trophy`, roles: `[ROLES.ADMIN, ROLES.MANAGER]`).
- **Routing (`App.tsx`):**
  - Add `/betting` route rendering protected `<SportsBetting />` page.
- **Dedicated Page (`pages/SportsBetting.tsx`):**
  - Entry card: Date picker, Net Amount ($) input with numeric validation, Submit button.
  - History card: Paginated, day-grouped history list with period summary banner, inline edit/delete/verify modals.
- **Dashboard (`pages/Dashboard.tsx`):**
  - Fetches `/api/sports-betting` for active shift period.
  - 5-card responsive top row (`grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`):
    1. Game Sales
    2. Keno Net
    3. Sports Betting (`$totalSportsBettingNet.toFixed(2)`)
    4. Pending Credits
    5. Expenses
  - Shift register expected cash calculation updated to include `totalSportsBettingNet`.
  - Safe Slip printout updated to include `Sports Betting Net`.
- **Reports (`pages/Reports.tsx`):**
  - Fetches `/api/sports-betting`.
  - Incorporates sports betting into Total Revenue, Net Profit, Revenue Mix pie chart, and Detailed Logs.

## 3. Consequences
- **Positive:** Complete, truthful financial accounting for sports betting income alongside game sales and keno.
- **Positive:** Drawer reconciliation matches physical cash reality.
- **Positive:** Unified role-based access control protecting betting transactions.

## 4. Affected Documents
- `packages/shared/src/index.ts`
- `packages/shared/src/constants.ts`
- `packages/server/src/schemas/index.ts`
- `packages/server/src/controllers/sportsBettingController.ts`
- `packages/server/src/controllers/shiftsController.ts`
- `packages/server/src/routes/sportsBetting.ts`
- `packages/server/src/app.ts`
- `packages/client/src/layouts/Layout.tsx`
- `packages/client/src/App.tsx`
- `packages/client/src/pages/SportsBetting.tsx`
- `packages/client/src/pages/Dashboard.tsx`
- `packages/client/src/pages/Reports.tsx`
- Documentation and governance ledgers (`MISSION.md`, `SYSTEM_CONTEXT.md`, `TASKS.md`, `ROADMAP.md`).

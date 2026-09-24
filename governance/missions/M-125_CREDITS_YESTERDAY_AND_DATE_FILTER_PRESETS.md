# Mission M-125: Credits Yesterday and Date Filter Presets

**Status:** Locked  
**Type:** Feature / UX Polish  
**Proposal:** ACP-033  
**Owner:** Execution  

## 1. Objective
Add dedicated "From" and "To" date range pickers along with "Today" and "Yesterday" quick-set preset buttons to the Recent Credits card on Store Credits (`/credits`), achieving 100% complete date filter parity across the entire application.

## 2. Context & Root Cause
- Following Missions M-122 (Reports), M-123 (Game Sales, Keno, Sports Betting), and M-124 (Expenses, Salary Report), `/credits` remained the only operational history ledger without date range filtering.
- Store Credits only offered an employee filter and loaded up to 200 items unconditionally.
- Mission M-125 closes this usability gap:
  - Adds date range parameters to `loadCredits` and `loadOlderCredits`.
  - Adds `From`/`To` inputs, `Today`/`Yesterday` buttons, and active period summary banner.
  - Implements ACP-020 range-containment when new credits are created.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Credits.tsx`: Date range filter toolbar, `Today` and `Yesterday` preset buttons, contextual description, range summary banner, and ACP-020 guard.
  - `packages/client/src/__tests__/pages/Credits.test.tsx`: Red-Green unit tests for preset buttons and date filtering.
  - Governance tracking: `MISSION.md`, `SYSTEM_CONTEXT.md`, `TASKS.md`, `ROADMAP.md`, `ACP-033`.
- **Out of Scope:**
  - Backend schema or Express controller modifications (`creditsController.ts` already supports range queries).
  - Other client pages.
  - Mutating git commands.

## 4. Execution & Verification Gates
- [x] Red-Green Test Verification: Proved failing assertion in `Credits.test.tsx` prior to implementation, followed by 31/31 green pass.
- [x] Responsive Hardening: Verified layouts wrap cleanly on mobile screens (flex-wrap and min-[400px]:w-[135px]) without horizontal overflow.
- [x] Monorepo Fitness Gates: Biome lint (0 errors, 0 warnings), Knip (0 issues), clean TypeScript build across shared, client, and server.

## 5. Evidence Payload
- [x] Vitest Unit Tests: 700 / 700 tests passing green across 42 test files.
- [x] Playwright E2E Suite: 26 / 26 tests passing green across 4 workers (30.7s).
- [x] Monorepo Build: Clean build across `@level-up/shared`, `@level-up/client`, and `@level-up/server`.
- [x] Biome Lint & Knip: 0 errors, 0 warnings, 0 unused dependencies/exports.
- [x] Traceability: Authorized by ACP-033, documented in `M-125_Blast_Radius_Report.md`, and formally approved.

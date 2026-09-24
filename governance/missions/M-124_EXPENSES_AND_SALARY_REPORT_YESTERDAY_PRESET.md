# Mission M-124: Expenses and SalaryReport Yesterday Date Filter Presets

**Status:** Locked  
**Type:** Feature / UX Polish  
**Proposal:** ACP-032  
**Owner:** Execution  

## 1. Objective
Add dedicated "Yesterday" (and "Today") date preset buttons across the Expenses history toolbar and the Salary Report toolbar, achieving complete date-filtering parity across all operational pages.

## 2. Context & Root Cause
- Following Missions M-122 (Reports Yesterday preset) and M-123 (Entry Pages Yesterday presets), `/expenses` and `/salary-report` remained the only two pages with date range filtering that lacked quick-set shortcuts.
- On `/expenses`, users had to manually enter dates into `From` and `To` pickers.
- On `/salary-report`, users had to manually enter dates and click `Apply`.
- Mission M-124 closes this UX gap:
  - Expenses receives `Today` and `Yesterday` buttons, period-aware card descriptions, and contextual empty state messaging.
  - SalaryReport receives `Today` and `Yesterday` buttons with immediate query execution and contextual heading descriptions.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/Expenses.tsx`: Add `Today` and `Yesterday` buttons, contextual card description, and empty state messaging.
  - `packages/client/src/pages/SalaryReport.tsx`: Add `Today` and `Yesterday` buttons with immediate apply, plus contextual subtitle.
  - `packages/client/src/__tests__/pages/Expenses.test.tsx`: Red-Green unit tests for preset buttons and contextual feedback.
  - `packages/client/src/__tests__/pages/SalaryReport.test.tsx`: Red-Green unit tests for preset buttons and immediate apply.
  - Governance tracking: `MISSION.md`, `SYSTEM_CONTEXT.md`, `TASKS.md`, `ROADMAP.md`, `ACP-032`.
- **Out of Scope:**
  - Backend schema or Express controller modifications.
  - Other client pages.
  - Mutating git commands.

## 4. Execution & Verification Gates
- [x] Red-Green Test Verification: Verified failing assertions in `Expenses.test.tsx` and `SalaryReport.test.tsx` prior to page implementation, followed by 100% green pass.
- [x] Responsive Hardening: Verified layouts render cleanly without horizontal overflow at mobile widths.
- [x] Monorepo Fitness Gates: Biome lint (0 errors, 0 warnings), Knip (0 issues), clean TypeScript build across shared, client, and server.

## 5. Evidence Payload
- [x] Vitest Unit Tests: 697/697 tests passing green across 42 test files.
- [x] Playwright E2E Suite: 26/26 tests passing green.
- [x] Monorepo Build: Clean build across all workspaces.
- [x] Biome Lint & Knip: Clean (0 lint errors/warnings, 0 knip issues).
- [x] Traceability: Authorized by ACP-032 and formal approval.

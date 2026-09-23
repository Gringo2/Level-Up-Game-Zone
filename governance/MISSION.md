# CURRENT MISSION

**Type:** Quality / E2E & Ergonomics  
**Mission:** M-121 Sports Betting Playwright E2E Suite & Mobile Touch Ergonomics Hardening  
**Status:** Locked  
**Proposal:** ACP-029  

## 1. Objective
Expand the automated end-to-end browser test suite for the Sports Betting domain (`/betting`) and harden mobile/tablet touch ergonomics (virtual keypad, responsive date controls, and zero horizontal overflow).

## 2. Context & Root Cause
In M-120 (ACP-028 / ADR-009), the Sports Betting income stream was integrated full-stack. To guarantee operational resilience and touch usability, Mission M-121 establishes automated end-to-end browser coverage for the `/betting` route and refines touch ergonomics for mobile and tablet devices.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/SportsBetting.tsx`: Added `inputMode="decimal"` to `#net`, responsive date toolbar stacking with `min-[400px]:flex-row` and `w-full min-[400px]:w-auto`.
  - `tests/e2e/dashboard_flow.spec.ts`: Added `/api/sports-betting` route mock to align with M-120 dashboard data contract.
  - `tests/e2e/sports_betting_flow.spec.ts`: 6 comprehensive E2E tests covering RBAC isolation, manager navigation & logging, verification badge transition, edit modal with required reason, delete modal with confirmation, and multi-device responsive overflow check.
  - Governance tracking: `MISSION.md`, `SYSTEM_CONTEXT.md`, `TASKS.md`, `ROADMAP.md`, `ACP-029`.
- **Out of Scope:**
  - Database schema changes.
  - Express controller API modifications.
  - Mutating git commands.

## 4. Execution & Testing Gates
- Playwright E2E tests: 6 new tests in `sports_betting_flow.spec.ts`, 26/26 full suite passing.
- Vitest unit tests: 690/690 tests passing across 42 test files.
- Monorepo fitness gates: Biome lint (0 errors, 0 warnings across 168 files), Knip (0 issues), clean TypeScript build across shared, client, and server.

## 5. Evidence Payload
- [x] Playwright E2E Suite: 26/26 tests passing green (including 6 new tests in `sports_betting_flow.spec.ts`).
- [x] Multi-Device Ergonomics: Verified decimal keyboard trigger and zero overflow across 320px, 375px, 768px, and 1280px viewports.
- [x] Vitest Unit Suite: 42 test files, 690 tests passing green.
- [x] Monorepo Build: Shared, client, and server build cleanly.
- [x] Biome Lint & Knip: 0 errors, 0 warnings across 168 files; Knip clean.
- [x] Traceability: Authorized by ACP-029 and formal approval.



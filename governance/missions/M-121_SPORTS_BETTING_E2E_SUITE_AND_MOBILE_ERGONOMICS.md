# Mission M-121: Sports Betting Playwright E2E Suite & Mobile Touch Ergonomics Hardening

**Status:** Locked  
**Type:** Quality / E2E & Ergonomics  
**Proposal:** ACP-029  
**Owner:** Execution  

## 1. Objective
Expand the automated end-to-end browser test suite for the Sports Betting domain (`/betting`) and harden mobile/tablet touch ergonomics (virtual keypad decimal mode, responsive date controls, and zero horizontal container overflow).

## 2. Context & Root Cause
- In M-120 (ACP-028 / ADR-009), the Sports Betting income stream was integrated into the application full-stack.
- While unit and integration tests (T-1 to T-7) verified server controllers, schemas, and React component rendering, real browser interaction paths—such as RBAC route redirection, confirmation dialogs with required reasons, multi-viewport layout stability, and live net logging—were not covered by browser automated tests.
- Additionally, mobile touch ergonomics needed refinement: the net amount input lacked `inputMode="decimal"`, preventing mobile virtual keyboards from immediately showing the decimal numeric keypad, and date filter controls could experience cramped button wrapping on narrow 320px–375px viewports.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/pages/SportsBetting.tsx`:
    - Added `inputMode="decimal"` to `#net` numeric input for mobile keyboards.
    - Updated From/To date filter layout with `min-[400px]:flex-row` and `w-full min-[400px]:w-auto` wrapping, with responsive `Apply` and `Today` buttons.
    - Maintained accessible touch dimensions and clean responsive stacking.
  - `tests/e2e/dashboard_flow.spec.ts`:
    - Added mock for `**/api/sports-betting` to prevent unhandled rejection during dashboard load.
  - `tests/e2e/sports_betting_flow.spec.ts` (NEW):
    - RBAC isolation test (staff redirected to `/`, link hidden).
    - Manager sidebar navigation and live net income logging (positive and negative loss).
    - Verification workflow test (unverified -> verified badge transition).
    - Edit modal workflow test with required `editReason`.
    - Delete modal workflow test with confirmation dialog and required `deleteReason`.
    - Multi-viewport responsive audit across 320x568, 375x812, 768x1024, and 1280x800 viewports verifying `main.scrollWidth <= main.clientWidth + 1`.
  - Governance ledgers (`MISSION.md`, `SYSTEM_CONTEXT.md`, `TASKS.md`, `ROADMAP.md`).
- **Out of Scope:**
  - Changes to database collections or backend API contracts.
  - Mutating git commands.

## 4. Execution & Verification Gates
- [x] Functional Verification: Complete browser E2E flow verified with Playwright across all operations.
- [x] Multi-Device Ergonomics: Verified decimal keyboard trigger and zero overflow across 320px, 375px, 768px, and 1280px viewports.
- [x] Full Playwright E2E Suite: 26/26 tests passing green (including 6 new tests in `sports_betting_flow.spec.ts`).
- [x] Full Vitest Unit Suite: 690/690 tests passing across 42 test files.
- [x] Monorepo Hygiene: Biome lint (0 errors, 0 warnings across 168 files), Knip (0 unused files/exports), clean TypeScript build across shared, client, and server.

## 5. Evidence Payload
- [x] Playwright E2E Suite: `tests/e2e/sports_betting_flow.spec.ts` (6 tests green), full suite 26/26 tests green in 29.6s.
- [x] Vitest Unit Suite: 42 test files, 690 tests passing green in 79s.
- [x] Monorepo Build: Shared, client, and server build without errors.
- [x] Biome & Knip: 0 errors, 0 warnings across 168 files; Knip clean.
- [x] Traceability: Authorized by ACP-029 and Product Owner approval.

# CURRENT MISSION

**Type:** Debt
**Mission:** M-91 History Row Scanability
**Status:** Locked

## 1. Objective
Improve the visual hierarchy and scanability of transaction history rows so users can identify the primary amount, business date/time, verification state, and available actions quickly across desktop and narrow-screen layouts.

## 3. Scope & Boundaries
- **In Scope:**
  - Review and improve history-row hierarchy in `packages/client/src/pages/GameSales.tsx`
  - Review and improve history-row hierarchy in `packages/client/src/pages/Keno.tsx`
  - Add a development-only E2E authentication fixture for existing `window.__E2E_USER__` tests
  - Preserve existing verification, edit, delete, filtering, loading, and unit-aware display behavior
  - Add focused regression coverage to the existing Game Sales and Keno page tests
  - Verify desktop and narrow-screen layouts without overflow or overlapping controls
- **Out of Scope:**
  - Backend routes, controllers, schemas, or database changes
  - New transaction capabilities or authorization changes
  - Replacing the existing component/design system
  - Redesigning unrelated pages
  - Pagination or virtualization, tracked separately under TD-032/M-87

## 4. Design Notes
- Root cause: history rows compress timestamp, actor, amount, status, and actions into a compact `flex-wrap` layout, making the primary operational signal harder to scan at all widths.
- Proposed direction: make the primary financial signal dominant, group date/actor metadata as supporting context, keep verification discoverable, and place row actions consistently.
- Blast radius: client presentation only; no API, shared contract, or server schema changes are expected.
- E2E fixture boundary: Vite development mode and the existing `window.__E2E_USER__` hook only; production builds retain Firebase token enforcement.
- Acceptance criteria: at 1280px the primary signal precedes metadata and status with actions trailing; at 375px there is no horizontal overflow and actions remain visible, reachable, correctly labeled, and disabled during pending operations.

## 5. Testing Strategy
- Unit/page tests: preserve row content, verification state, unit-aware labels, and action availability.
- Responsive checks: verify narrow-screen rendering and absence of horizontal overflow.
- Negative coverage: verify pending or unavailable row actions remain contained and do not duplicate requests.
- Validation criterion: relevant page tests, TypeScript checks, lint, and architecture gates pass.

## 6. Evidence Payload
- [x] Functional Verification: canonical lock gates passed; 39 test files / 565 tests passed and 11/11 Playwright tests passed.
- [x] Architectural Verification (AVP-001): canonical lock gates passed, including 375px/1280px responsive checks and repository-wide E2E verification.
- [x] Dependency Graph Clean: canonical lock gates passed; no forbidden dependency propagation detected; blast-radius report recorded in `docs/reports/M-91_Blast_Radius_Report.md`.
- [x] ADR Compliance: presentation-only client changes preserve Thin Client boundaries and existing mutation/API behavior.
- [x] User Approval: GO received 2026-09-21; implementation authorized

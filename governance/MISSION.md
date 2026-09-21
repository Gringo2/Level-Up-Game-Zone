# CURRENT MISSION

**Type:** Debt
**Mission:** M-90 Local Shop-Date Defaults
**Status:** Locked

## 1. Objective
Align the entry-form default dates and edit/reset state with the shop timezone so the selected business day matches `Africa/Addis_Ababa` rather than UTC drift during the local day boundary.

## 2. Scope & Boundaries
- **In Scope:**
  - Fix date defaults in `packages/client/src/pages/GameSales.tsx`
  - Fix date defaults in `packages/client/src/pages/Keno.tsx`
  - Fix date defaults and edit/reset state in `packages/client/src/pages/Expenses.tsx`
  - Fix default date handling in `packages/client/src/pages/Credits.tsx`
  - Centralize Addis-time helper logic in `packages/client/src/lib/dateUtils.ts`
  - Add regression coverage in `packages/client/src/__tests__/lib/dateUtils.test.ts`
- **Out of Scope:**
  - Backend schema or API contract changes
  - Broad redesign of the date-entry UX outside the affected flows
  - Unrelated client cleanup not tied to timezone defaults

## 3. Design Notes
- Root cause: the client was defaulting to UTC-first values such as `new Date().toISOString().slice(0, 10)`, which can drift from the store business day in Addis time.
- Fix: use shop-aware helpers (`getShopDateString()`, `shopDateToInstant()`) for default values, range defaults, and reset logic.
- Blast radius: client-only; no API, shared contract, or server schema changes.

## 4. Testing Strategy
- Unit tests: Addis timezone conversion and local-day formatting are asserted directly.
- Regression tests: Game Sales, Keno, and Expenses page suites continue to pass with the shop-date defaults in place.
- Validation criterion: the affected client test files pass after the fix.

## 5. Evidence Payload
- [x] Functional Verification: `npx vitest run packages/client/src/__tests__/lib/dateUtils.test.ts packages/client/src/__tests__/pages/GameSales.test.tsx packages/client/src/__tests__/pages/Keno.test.tsx packages/client/src/__tests__/pages/Expenses.test.tsx` → 4 files passed, 96/96 tests passed
- [x] Architectural Verification (AVP-001): scope limited to the client date-state layer; no backend or shared contract changes
- [x] Dependency Graph Clean: no new dependency introduced
- [x] ADR Compliance: aligned with ADR-008 shop-day semantics and existing local date utils
- [x] User Approval

# Mission 90: Local Shop-Date Defaults for Entry Forms
*Status: LOCKED*

## 1. Mission Context
**Type:** Debt  
**Phase:** Validation  
**Primary Owner:** AI Implementor  

The client entry pages were defaulting to UTC date strings (`new Date().toISOString().slice(0, 10)`) instead of the store's business timezone, causing the selected day to drift from the local operating day in Addis time.

## 2. Objective
Align the default date values and entry-date handling with the shop timezone so all daily entry forms and date filters reflect the local business day without introducing API or contract changes.

## 3. Scope & Boundaries
- **In Scope:**
  - Fix date defaults in `packages/client/src/pages/GameSales.tsx`
  - Fix date defaults in `packages/client/src/pages/Keno.tsx`
  - Fix date defaults and edit/reset state in `packages/client/src/pages/Expenses.tsx`
  - Fix default date handling in `packages/client/src/pages/Credits.tsx`
  - Centralize Addis-time helper logic in `packages/client/src/lib/dateUtils.ts`
  - Add regression coverage in `packages/client/src/__tests__/lib/dateUtils.test.ts`
- **Out of Scope:**
  - Backend schema or API contract changes
  - Cross-page redesign or broader UX consolidation
  - Unrelated client state cleanup outside the date-selection flows

## 4. Design Notes
- Root cause: UTC-first date formatting was used for default values and edit/reset states, even though the store operates in `Africa/Addis_Ababa`.
- Fix: use `getShopDateString()` and timezone-aware conversions in the shared date utility instead of raw UTC formatting.
- Blast radius: client-only, limited to date state initialization and tests.

## 5. Execution Gates
- [x] Functional Verification
- [x] Architectural Verification (AVP-001)
- [x] Dependency Graph Clean
- [x] ADR Compliance
- [x] User Approval

## 6. Evidence Payload
- [x] Functional Verification: `npx vitest run packages/client/src/__tests__/lib/dateUtils.test.ts packages/client/src/__tests__/pages/GameSales.test.tsx packages/client/src/__tests__/pages/Keno.test.tsx packages/client/src/__tests__/pages/Expenses.test.tsx` → 4 files passed, 96/96 tests passed
- [x] Architectural Verification (AVP-001): scope limited to client date-state formatting; no backend or shared contract changes
- [x] Dependency Graph Clean: no new dependency introduced
- [x] ADR Compliance: aligned with ADR-008 (backdated entry and shop-day semantics) and repo timezone utilities already in use
- [x] User Approval: explicit lock/commit request accepted by the product owner

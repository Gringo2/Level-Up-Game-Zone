# Proposal: ACP-006 Shift Non-Blocking + Backdated Data Entry

**Status:** Implemented (2026-08-17)
**Lifecycle:** Draft → Discussion → **Approved** → **Implemented** → Closed
**Decision:** Approved — Product Owner directive (2026-08-17): remove MissedDataBlocker hard gate, keep shift system intact, add date pickers for backdated entry.
**Mission:** M-50 Shift Non-Blocking + Date Pickers (Feature)

## 1. Context and Problem Statement

The current shift system enforces a hard blocking gate via `MissedDataBlocker`. When a user has not opened a shift for a given day, they cannot access any financial forms (GameSales, Keno, Expenses, Credits). This creates several problems:

1. **Workflow disruption:** Users who forget to open a shift at the start of the day are completely blocked from data entry until they open one.
2. **No backdated entry:** All financial records are stamped with `new Date().toISOString()` at submission time, making it impossible to enter data for previous days.
3. **Rigid enforcement:** The MissedDataBlocker component and `POST /resolve-missed` endpoint add complexity without proportional value — the shift system already tracks open/close status and auto-opens shifts silently via `GET /missed`.

The Product Owner directed: **make the shift system non-blocking** (remove MissedDataBlocker) while keeping all shift infrastructure (open/close/reconciliation, Safe Slip, auto-open logic) intact, and **add date pickers** to all 4 financial forms for backdated entry.

## 2. Proposed Solution

### 2.1 Remove MissedDataBlocker (Non-Blocking Shift)

- **Delete** `packages/client/src/components/MissedDataBlocker.tsx` (184 lines)
- **Remove** import + render from `packages/client/src/layouts/Layout.tsx`
- **Clean** `packages/client/src/contexts/ShiftContext.tsx`:
  - Remove `MissedDataPayload` export
  - Remove `missedData` state and context field
  - Keep `GET /missed` fetch + `newlyOpenedShift` auto-open logic (shift system stays functional)
- **Remove** `resolveMissedData` function from `packages/server/src/controllers/shiftsController.ts`
- **Remove** `POST /resolve-missed` route + `ResolveMissedDaySchema` from `packages/server/src/routes/shifts.ts`
- **Remove** `ResolveMissedDaySchema` from `packages/server/src/schemas/index.ts`

### 2.2 Add Date Pickers (Backdated Entry)

- Add optional `date` field to all 4 create schemas:
  - `CreateSaleSchema`, `CreateKenoSchema`, `CreateExpenseSchema`, `CreateCreditSchema`
- Update all 4 backend handlers to use `body.date || new Date().toISOString()` for timestamp
- Add `entryDate` state (default: today YYYY-MM-DD) + `<Input type="date">` to all 4 frontend forms
- Include `date: new Date(entryDate).toISOString()` in all POST request bodies

### 2.3 Test Updates

- Delete `MissedDataBlocker.test.tsx` (12 tests, 303 lines)
- Remove resolve-missed tests from `shiftsController.test.ts`
- Remove MissedDataBlocker mock from `Layout.test.tsx`
- Remove `missedData` from ShiftContext mocks in `Dashboard.test.tsx`
- Add `date: expect.any(String)` to POST body assertions in GameSales, Keno, Expenses test suites

## 3. Alternative Options

- **Keep MissedDataBlocker, add date pickers only.** Rejected: the blocking gate remains the primary pain point; date pickers alone don't solve workflow disruption.
- **Remove shift system entirely.** Rejected: shift tracking provides operational value (reconciliation, Safe Slip, audit trail). The Product Owner explicitly directed to keep shift infrastructure.
- **Make MissedDataBlocker dismissible (soft warning).** Rejected: adds UI complexity for a warning users would habitually dismiss; the auto-open logic already handles missed shifts silently.

## 4. Consequences

- **Easier:** Users can enter data for any day without opening a shift first. Workflow is no longer interrupted by forgotten shift opens.
- **Harder:** No enforcement that shifts are opened daily — operational discipline becomes a management concern rather than a system gate. The `GET /missed` endpoint still silently auto-opens shifts for audit purposes.
- **Data integrity:** Backdated entries are timestamped with the user-selected date, not submission time. The audit log reflects the actual business date.

## 5. Affected Documents

- `packages/client/src/components/MissedDataBlocker.tsx` (deleted)
- `packages/client/src/__tests__/components/MissedDataBlocker.test.tsx` (deleted)
- `packages/client/src/layouts/Layout.tsx` (removed MissedDataBlocker)
- `packages/client/src/contexts/ShiftContext.tsx` (cleaned missedData)
- `packages/server/src/controllers/shiftsController.ts` (removed resolveMissedData)
- `packages/server/src/routes/shifts.ts` (removed POST /resolve-missed)
- `packages/server/src/schemas/index.ts` (removed ResolveMissedDaySchema, added date to 4 schemas)
- `packages/server/src/controllers/salesController.ts` (date support)
- `packages/server/src/controllers/kenoController.ts` (date support)
- `packages/server/src/controllers/expensesController.ts` (date support)
- `packages/server/src/controllers/creditsController.ts` (date support)
- `packages/client/src/pages/GameSales.tsx` (date picker)
- `packages/client/src/pages/Keno.tsx` (date picker)
- `packages/client/src/pages/Expenses.tsx` (date picker)
- `packages/client/src/pages/Credits.tsx` (date picker)
- `packages/server/src/__tests__/shiftsController.test.ts` (removed resolve-missed tests)
- `packages/server/src/__tests__/validation.test.ts` (removed StartShiftSchema test)
- `packages/client/src/__tests__/pages/Dashboard.test.tsx` (removed missedData mocks)
- `packages/client/src/__tests__/layouts/Layout.test.tsx` (removed MissedDataBlocker mock)
- `packages/client/src/__tests__/pages/GameSales.test.tsx` (added date assertion)
- `packages/client/src/__tests__/pages/Keno.test.tsx` (added date assertion)
- `packages/client/src/__tests__/pages/Expenses.test.tsx` (added date assertion)

## 6. Action Items

- [x] Delete MissedDataBlocker component and test suite
- [x] Clean ShiftContext (remove missedData, keep auto-open)
- [x] Remove resolveMissedData + POST /resolve-missed + ResolveMissedDaySchema
- [x] Add `date` field to 4 create schemas + 4 backend handlers
- [x] Add date pickers to 4 frontend forms
- [x] Update all affected test suites
- [x] Verify: 372/372 tests passing, TypeScript clean, Biome clean
- [x] Document in ADR-008

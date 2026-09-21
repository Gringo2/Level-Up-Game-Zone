# ACP-012: Shift Closure Safeguards and Manual Start Recovery

**Status:** Approved (2026-09-22)  
**Raised by:** AI Implementor  
**Date:** 2026-09-22  
**Requires Approval:** Yes  
**Affected Files:**
- `packages/client/src/pages/Dashboard.tsx`
- `packages/client/src/__tests__/pages/Dashboard.test.tsx`

---

## 1. Context and Problem Statement

Under M-99 / ACP-011, the server correctly enforces a same-business-day guard (D4) on `POST /api/shifts/auto-open`: once a shift has been closed on a given calendar day, auto-open returns `409 Conflict` to avoid creating duplicate shifts on the same business day automatically.

However, on the frontend in `Dashboard.tsx`:
1. **Accidental Closure Vulnerability:** When closing a shift (blind cash count), clicking "Confirm & Close Shift" immediately finalizes the shift without a secondary confirmation modal. If a manager accidentally submits this form mid-day, the shift is irreversibly closed in Firestore.
2. **Dead-End State on Null Active Shift:** When `activeShift` is null (such as after a shift close, or when gaps/missed shifts prevent auto-open), `Dashboard.tsx` hides the Shift Management section completely. There is no UI affordance to manually open a shift. Even though the backend provides `POST /api/shifts` (`startShift`), the user has no way to start a new shift from the UI until the next calendar day.

---

## 2. Proposed Architecture & Solution

### 2.1 Accidental Closure Safeguard (`ConfirmDialog`)
- Integrate the existing repository standard component `ConfirmDialog` (`packages/client/src/components/ui/confirm-dialog.tsx`).
- When the manager fills out the blind count form and clicks "Confirm & Close Shift", validate form fields and open the `ConfirmDialog` modal.
- The dialog states:
  * Title: *"Confirm Shift Closure"*
  * Message: *"Are you sure you want to close this shift? This will finalize cash reconciliation and close the register. This action cannot be undone."*
  * Confirm label: *"Yes, Close Shift"* (variant: `destructive`)
- Only when confirmed inside the dialog will the `POST /api/shifts/:id/close` API request be dispatched. Canceling keeps entered form data intact.

### 2.2 Manual "Start Shift" Fallback Card
- In `Dashboard.tsx`, when `!activeShift` (and not loading), render a *"No Active Shift"* card in the Shift Management section.
- Provide a *"Start Shift"* button which expands an inline form with:
  * `Opening Float ($)` input (type: number, min: 0, step: 0.01, required).
  * *"Confirm & Start Shift"* action button.
- Submitting the form calls `POST /api/shifts` with:
  ```json
  {
    "floatAmount": parseFloat(openingFloat),
    "managerName": user.displayName || user.email || "Unknown"
  }
  ```
- On `201 Created`: invokes `await refetchShift()`, toasts success, and resets form state.
- On error: displays error toast.

---

## 3. Alternative Options Considered

- **Browser `window.confirm()`:** Rejected. Unstyled, inconsistent across platforms, and violates rich UI aesthetic standards. Reusing `ConfirmDialog` adheres to Rule 25 (Reusability).
- **Backend Shift Re-opening Endpoint:** Rejected. Violates the Observation & Audit Immutability invariant. Shifts must remain immutable once reconciled and closed. Starting a new shift preserves cash continuity.

---

## 4. Consequences

- **Positive:**
  - Prevents irreversible accidental closures.
  - Eliminates the dead-end state on Dashboard when no shift is open.
  - Allows managers to intentionally run consecutive shifts on the same day if needed.
- **Negative / Risks:**
  - Adds one extra click to the shift closure workflow (mitigated by clear button labels).

---

## 5. Affected Documents & Tests

- `packages/client/src/pages/Dashboard.tsx`
- `packages/client/src/__tests__/pages/Dashboard.test.tsx`
- `governance/missions/M-100_SHIFT_CLOSURE_SAFEGUARDS.md`
- `governance/MISSION.md`

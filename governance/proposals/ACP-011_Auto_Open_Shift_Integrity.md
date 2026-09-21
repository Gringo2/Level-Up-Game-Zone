# ACP-011: Auto-Open Shift Integrity

**Status:** Approved — Option B selected (2026-09-22)  
**Raised by:** AI Implementor  
**Date:** 2026-09-22  
**Requires Approval:** Yes  
**Affected Files:**
- `packages/server/src/controllers/shiftsController.ts`

---

## 1. Problem Statement

The `getMissedData` controller (lines 371–409 of `shiftsController.ts`) contains an auto-open side-effect that silently creates a new shift when the dashboard is loaded and no open shift is found. This behaviour was identified during architectural review and contains **five integrity defects** that undermine the operational guarantees of the Shift open/close workflow.

---

## 2. Identified Defects

### D1 — `opening_float: 0` Bypasses Reconciliation (Severity: High)

**Location:** Line 389  
**Current code:**
```ts
opening_float: 0,
```

The opening float is the auditable record of cash physically handed over from the previous shift's close. Hardcoding it to `0` means:

- The system cannot distinguish a legitimately zero-float start from a system-skipped hand-off.
- Cash continuity across shifts is broken — variance calculations lose their baseline.
- Audit logs for auto-opened shifts are structurally misleading.

**Invariant violated:** Validation is mandatory (Architecture Invariant §6).

---

### D2 — `manager_name` Stores Email Instead of Display Name (Severity: Medium)

**Location:** Line 387  
**Current code:**
```ts
manager_name: user?.email || SYSTEM_IDENTITY.DISPLAY_NAME,
```

The `manager_name` field is intended to hold a human-readable display name. On auto-open, it stores the authenticated user's **email address**. On manual open, a real name is expected. This inconsistency:

- Breaks name-based reporting and UI display.
- Creates an ambiguous data contract on the `Shift` interface.

---

### D3 — Shift Opened as Side-Effect of a Read (Severity: Medium)

**Location:** Lines 371–409 (inside `getMissedData`)  
**Description:**

`getMissedData` is called by the Dashboard **on component mount** to check for gaps. Auto-opening a shift as a side-effect of a **read/diagnostic** endpoint violates the principle of intentionality:

- The user never explicitly confirmed intent to open a shift.
- An accidental dashboard open creates a permanent Firestore document.
- No opening float was entered, no safe-slip was printed, and no deliberate cash hand-off occurred.

**Invariant violated:** Observation precedes reasoning. Reasoning never modifies observations (Architecture Invariant §1 & §2).

---

### D4 — Double-Shift Same Business Day Possible (Severity: High)

**Location:** Lines 372–373  
**Current guard:**
```ts
if (unresolvedGaps.length === 0 && missedShifts.length === 0)
```

This guard only prevents opening when there are historical gaps or missed shifts. It does **not** check whether a shift was already opened and **closed today**. `autoLabelStaleShifts` only labels shifts older than one day as `MISSED`. Therefore:

1. Shift A is opened and closed on Day N.
2. Dashboard is reloaded on Day N (same business day).
3. `unresolvedGaps` is empty; `missedShifts` is empty; no `OPEN` shift exists.
4. Auto-open fires, creating Shift B for Day N.
5. Two shifts now exist for the same business day — a data integrity violation.

---

### D5 — Transaction-Retry-Unsafe Variable Assignment (Severity: Low)

**Location:** Line 405  
**Current code:**
```ts
newlyOpenedShift = { id: newDocRef.id, ...data };
```

`newlyOpenedShift` is a closure variable assigned inside the transaction callback. Firestore transactions retry on contention. If the transaction retries and `openShiftsSnap` is non-empty on the second attempt, the variable is not assigned — but the first attempt may have written a document. This creates a response inconsistency where the API returns `newlyOpenedShift: null` after a shift was actually written.

---

## 3. Proposed Resolution

### Option A — Remove Auto-Open Entirely (Recommended)

Remove the auto-open block from `getMissedData`. Force all shift opens to go through the explicit `POST /api/shifts/start` endpoint, which:

- Requires an `opening_float` value from the user.
- Records an intentional audit event.
- Is called by a deliberate UI action, not a page load.

The Dashboard should surface a "No open shift — Start Shift?" prompt instead of silently creating one.

### Option B — Promote Auto-Open to a Dedicated Endpoint

Move the auto-open logic to a dedicated `POST /api/shifts/auto-open` endpoint, invoked only by an explicit UI gesture. Resolve all five defects before re-enabling:

- Require `opening_float` from the request body or derive it from the last closed shift's `closing_float`.
- Use `display_name` from the Employees collection for `manager_name`.
- Add a same-business-day guard.
- Fix variable assignment to be retry-safe.

---

## 4. Scope

**In Scope:**
- `getMissedData` controller function in `shiftsController.ts`.
- Audit log data written by the auto-open block.
- Dashboard behaviour when no open shift is detected.

**Out of Scope:**
- Manual shift open/close flow (`startShift`, `closeShift`).
- Employee linkage (covered by ACP-010).
- Stale shift labelling (`autoLabelStaleShifts`).

---

## 5. Risk Assessment

| Risk | Likelihood | Impact |
|---|---|---|
| Double-shift same day in production | Medium | High |
| Float baseline corruption in audit | Medium | High |
| Email displayed as manager name in reports | High | Medium |

---

## 6. Governance Trail

- **Related Debt:** TD-030 (Shift-Employee Attribution), TD-040 (Shift Attribution Consistency)
- **Related ACP:** ACP-010 (Shift Employee Linkage Policy)
- **Affected ADR:** To be determined upon approval
- **Evidence Source:** Direct code review of `shiftsController.ts` lines 371–409, 2026-09-22

---

## 7. Approval Required

> This proposal requires explicit Product Owner approval before any implementation begins.
> Preferred resolution: **Option A** (remove auto-open, enforce explicit start).
> If Option B is preferred, a follow-on Mission and Tasks document must be created.

**Status:** Awaiting approval.

---

## Addendum: OQ-1 Resolution (2026-09-22)

**Decision:** Option B — client calls `POST /api/shifts/auto-open` with `floatAmount: 0` when state is provably clean (no gaps, no missed shifts, no open shift). Manager updates the float via the existing `PUT /:id/float` button after the shift opens.

**Implementation:** [`ShiftContext.tsx`](packages/client/src/contexts/ShiftContext.tsx) — auto-open call added with `hasGaps`/`hasMissed`/`!openShift` guard. 409 responses (already open, or closed today D4 guard) are silently ignored — no crash.

**Tests added:** 3 new client tests covering the 201 path, the 409 silent-ignore path, and the guard-blocks-call path (gaps present). 8/8 passing.

**Status:** Closed.

# Proposal: ACP-041 Operational Defect Remediation (Daily & Monthly Operations)

**Status:** Approved (Product Owner, 2026-10-08: "fix all", and the four design decisions below chosen from the recommended options) — implemented by M-133
**Debt Reference:** TD-059, TD-063 – TD-069
**Evidence:** `docs/reports/Daily_Monthly_Operations_Semantic_Trace_2026-10-08.md` (every defect reproduced with synthetic data against the real server and real UI)

## 1. Context and Problem Statement
A semantic trace found that daily cash reconciliation is wrong (TD-063) and several smaller daily and monthly defects. Monthly Reports figures were verified correct and must not change.

## 2. Proposed Solution

### Decisions (PO-approved)
| Item | Decision |
|---|---|
| TD-063 entry dating | When an entry's chosen business date is **today in shop time** and the client sent a date-only or midnight-UTC value, the server stores the **current instant**. Backdated/future dates keep the chosen day (midnight UTC). Entries with an explicit time of day are never altered. |
| TD-066 missed shifts | A manager can close a MISSED shift from the Dashboard ("Resolve missed shift": counted cash + reason). Closing sets CLOSED, so it stops blocking auto-open. The close window for a MISSED shift ends at the end of its own shop day. |
| TD-067 payroll | Deductions are attributed by **deduction date** (`resolved_date`). Base salary stays a monthly figure, labelled as such, with a note on non-month ranges. |
| TD-068 sale edits | Editing an existing sale keeps its stored rate, game name and unit. Only choosing a different game applies that game's current rate. |

### Fixes
1. **TD-063 (server):** `resolveEntryDate` helper used by sales, keno, sports betting, expenses and credits creation. Shop timezone from a shared `SHOP_TIMEZONE`.
2. **TD-064 (server):** credits omit `reason` when undefined (no `undefined` Firestore values).
3. **TD-065 (server):** all shift-day logic (stale labelling, auto-open same-day guard, gap dates) uses shop-timezone dates, independent of the host timezone.
4. **TD-066:** `closeShift` bounds the window for MISSED shifts; Dashboard lists missed shifts with a resolve form (`ShiftContext` exposes `missedShifts`).
5. **TD-067:** `GET /api/credits` accepts optional `dateField=resolved_date` (additive; default unchanged). Reports and SalaryReport fetch deducted credits by deduction date. Labelling and note on SalaryReport.
6. **TD-068:** `updateSale` keeps the stored rate unless the game changes.
7. **TD-059 (client):** admin-only controls (Add Game Rate, rate edit/toggle, Add Store Employee, default-rate seeding) shown to admins only.
8. **TD-069:**
   - invalid `date` → 400 (schema);
   - empty Date field → inline error instead of silent no-op;
   - credit for an unknown or inactive employee → 400;
   - `resolved_date` stamped only for Resolved/Deducted, removed when set back to Pending;
   - role changes: cannot change your own role, root admins cannot be demoted;
   - Reports: note when losing keno is excluded from the Revenue Mix; average variance formatted `-$0.40`.

### Interface impact (Express Backend API v1.0.0, additive or tightening only)
- New optional query param `dateField` on `GET /api/credits`.
- 400 instead of 500 for invalid dates; 400 for unknown employee on credit create; 400 for self role change.
- Stored `date` of "today" entries now carries the time of day (clients already render it).

## 3. Alternative Options
Rejected alternatives for each decision are listed in the PO questionnaire (scope shift by business day, link entries to shifts, keep issue-date attribution, re-price on edit, quick-fix-only for missed shifts).

## 4. Consequences
- Dashboard, shift close and Reports agree for the day. Existing entries (stamped midnight UTC before this change) and shifts already closed are **not** rewritten; only new entries and new closes benefit.
- Payroll for a month now follows when money was actually deducted.
- Historical net profit still moves when pending credits change status (TD-027 semantics unchanged).

## 5. Affected Documents
`packages/shared/src/constants.ts`; server: `utils/entryDate.ts` (new), `schemas/index.ts`, `controllers/{sales,keno,sportsBetting,expenses,credits,shifts,users}Controller.ts`; client: `lib/dateUtils.ts`, `contexts/ShiftContext.tsx`, `components/MissedShiftsCard.tsx` (new), `pages/{Dashboard,Admin,GameSales,Keno,SportsBetting,Expenses,Credits,Reports,SalaryReport}.tsx`; their tests; `governance/*`, `docs/reports/*`.

## 6. Action Items
1. Open mission M-133 referencing this ACP.
2. Red tests per fix, then implement, then Green.
3. Re-run the synthetic harness through the real UI to confirm each reproduction no longer fails.
4. AVP-001 gates, blast-radius report, evidence, lock.
5. Deploy to `levelup.froge.studio` with the README cPanel commands.

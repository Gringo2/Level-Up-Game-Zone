# Daily & Monthly Operations — Semantic Trace with Synthetic Data (2026-10-08)

**Question:** Do the daily and monthly operations behave correctly with false data, from the form a user fills in, through the API, to what the screens display? Nothing assumed.
**Code under test:** commit `92999f4` (M-132). Real server controllers/middleware (`packages/server/dist`), real client (Vite dev server), real browser (Chromium).
**Follow-ups:** TD-059 (UI-verified), TD-063 – TD-069 in `governance/DEBT.md`.
**Resolution (2026-10-08):** all of them fixed by M-133 (ACP-041), proven in the same real-flow harness. See `docs/reports/M-133_Blast_Radius_Report.md`. Existing entries and already-closed shifts are not rewritten.

## 1. Method
- **Fake database:** an in-memory Firestore fake replaced `firebase.js` through a Node loader hook, so no real Firebase or production data was reachable. It mirrors the SDK rules that matter: string comparison on ISO dates, `undefined` field values rejected, `FieldValue.delete()` handled, transactions are all-or-nothing, and `update()` on a missing doc fails.
- **Real UI:** the client ran with `VITE_API_URL` overridden. `packages/client/.env.local` points at production (`levelup.froge.studio`), so every request was routed through a filter that aborted anything not on localhost. No request left the machine.
- **Fake data:** staff, manager and admin users; two rates; two employees; a synthetic September 2026 (30 days of sales, keno, betting, expenses and credits, 30 closed shifts, a MISSED shift, boundary-instant entries).
- **Independent expectations:** every expected number was computed by hand in the seed script before reading the screen.
- **Harness location:** `.agents/.scratch/m132-trace/` (gitignored, the repo's sanctioned transient directory). Not committed.

## 2. Verified Correct
| Area | Evidence |
|---|---|
| Month totals on Reports (sales 570, net profit 472, revenue 622, expenses 120, variance −12, balanced 26/30, cash processed 5988, expense categories) | all equal the hand calculation |
| Month boundaries (shop UTC+3) | entry at 23:30 Sep 30 included in September; entry at 00:30 Oct 1 and an October-dated sale excluded |
| MISSED shifts | excluded from variance and cash totals |
| Shift rules | second open shift 400; auto-open 409 when a shift is open or one closed today; negative/non-numeric float 400; close twice 400; float update on closed 400; variance > $2 requires a reason; negative/non-numeric cash 400 |
| Server-authoritative maths | sale total from the rate document (client rate ignored); expense qty × unit price rounded to cents |
| Roles | staff cannot edit/delete/verify, cannot log sports betting; manager can; admin-only rates and employees |
| Audit trail | CREATE / UPDATE / DELETE rows written for every mutation, with reason and old value |
| Pagination | 230 entries: first 200 load, "Load older" available |
| M-132 membership gate | uninvited account 403 and cannot self-register; invitee registers as staff and works; removed user locked out immediately; promoted user's new rights apply on the next request |
| Browser timezone | New York, Tokyo and Addis Ababa all produced identical stored values and screens |

## 3. Defects Found (all reproduced)

### F1 — Shift totals exclude the entries made during the shift (Critical) → TD-063
- **Cause:** every entry form sends `new Date("yyyy-MM-dd").toISOString()`, i.e. midnight UTC (03:00 shop time), and the server stores it as is. A shift starts at the real clock time. The Dashboard (`startDate = shift.start_time`) and `closeShift` (`date >= start_time`) both filter on that, so any shift that opens after 03:00 shop time excludes every default-dated entry.
- **UI repro:** shift opened, float 100, six entries logged through the forms (sales 15 + 8, keno 40, betting −10, expense 12.50, credit 20). Dashboard shows **$0.00 on every card**, "Expected Cash: $100.00", "Variance $20.50 (reason required)". The true expected cash is **$120.50**. Closing with 120.50 is rejected by the server; the stored close record has `expected_cash_calculated: 100`.
- **Contradiction:** at the same moment Reports "Today" shows the entries (Net Profit $55.00 in the second repro).
- **History:** midnight dates since M-50 (2026-08-17); `closeShift` filter older. ADR-008 says entries carry the business date; it never reconciled that with the shift window. Existing E2E tests mock the API and compute expected cash themselves, so they could not catch it.
- **Production check (read-only):** open Reports, look at "Net Drawer Variance" and the shift ledger. If daily variances track the day's entered totals, production shows this.

### F2 — Credit logged with the Reason field blank fails (High) → TD-064
- **Cause:** Reason is optional in the form; when blank the client omits it, and `createCredit` writes `reason: undefined`. The Firestore Admin SDK rejects `undefined` unless `ignoreUndefinedProperties` is set (`firebase.ts` does not).
- **UI repro:** blank reason → "Failed to save credit" (HTTP 500, nothing stored); with a reason → saves.
- **Confidence:** High; relies on the SDK default. Confirm on production by logging a credit with no reason (it should fail and write nothing; if it succeeds it creates a real record).

### F3 — Server "day" uses the server's local timezone (Medium) → TD-065
- `autoLabelStaleShifts`, the auto-open same-day guard and `getMissedData` use `toLocaleDateString("en-CA")` (server TZ). Same data, same moment:
  - EAT server: shifts opened 00:30, 01:59, 03:00 and 09:00 shop time all stay OPEN.
  - **UTC server:** shifts opened 00:30 and 01:59 shop time are relabelled **MISSED** while still in progress.
- **Unknown:** the production server's timezone. Check on the server with `node -p "Intl.DateTimeFormat().resolvedOptions().timeZone"`.

### F4 — A MISSED shift is permanent and blocks auto-open (Medium) → TD-066
- Only one code path writes MISSED and none clears it; `missed_day_resolutions` is read but never written. UI repro: after a forgotten shift, the Dashboard never attempts auto-open; after a normal manual start and close the old shift is still MISSED. Managers must start every shift by hand from then on, and the forgotten shift's cash is never reconciled or reported.

### F5 — Payroll semantics need a decision (Medium) → TD-067
- Deductions are bucketed by the credit's **issue date**: a $60 credit issued Sep 28 and deducted Oct 3 appears in **September** payroll and **not** October's.
- Base salary is shown in full for any period: "Today" and "This Week" both show Net Payable = whole base salary.
- Reports' net profit subtracts Pending credits, so a past month's profit changes when a credit is later deducted (by design, TD-027, but historical reports are not stable).

### F6 — Correcting an old sale re-prices it at today's rate (Medium) → TD-068
- Rate changes in place (PS4 $5 → $6). Existing logs keep their price. Editing the quantity of an old log recomputes with the **new** rate: 3 × $5 expected, stored 3 × $6 = $18.

### F7 — Role/UI mismatches, now UI-verified (High) → TD-059
- Manager opens Admin, adds a game rate → "Failed to add game rate" (403). Staff sees "Add Default Games" with no rates → "Failed to create rates" (403).

### F8 — Smaller issues → TD-069
- Garbage `date` in the API returns 500 (should be 400).
- Clearing a form's Date field and submitting does nothing and shows no message (client throws on `toISOString`).
- A credit for a non-existent employee id is accepted by the API (UI only offers real employees).
- Credit status moves freely between Pending, Deducted and Resolved; `resolved_date` is set even when moved back to Pending.
- An admin can demote themselves, including the last admin.
- Reports: negative keno is omitted from the Revenue Mix, so the mix sums to more than Total Revenue ($645 vs $622); average variance prints as `$-0.40` while elsewhere negatives print as `-$12.00`.

## 4. Not Verified (limits)
- **Real Firestore:** composite-index requirements, query limits and undefined-value handling are modelled, not run against a live project. `firestore.indexes.json` was not exercised.
- **Real sign-in:** Google/Firebase login, token refresh and invite email flows were substituted by test tokens.
- **Production:** no authenticated production flow was run; production server timezone is unknown.
- **Production build:** the UI ran on the dev server (React StrictMode double-runs the first shift auto-open, which shows "No Active Shift" until reload; a production build does not). Calculations are identical in both.
- Printing, mobile layouts and the Activity Log screen contents were not re-checked.

## 5. Recommended Order
1. ACP for F1 (decide the rule: entries stamped with time of day when the date is today, or shift scoping by business day, or a `shift_id` link). This changes the locked API contract, so it needs approval.
2. F2 (one-line class of fix: drop `undefined` fields), F7 (hide admin controls from non-admins), F3 (use the shop timezone on the server).
3. Product decisions for F4, F5, F6.
4. TD-060: turn this harness into a governed real-integration test layer so these cannot recur.

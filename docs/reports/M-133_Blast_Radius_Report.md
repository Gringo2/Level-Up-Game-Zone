# M-133 Blast Radius Report: Operational Defect Remediation

**Mission:** M-133
**Proposal:** ACP-041
**Date:** October 8, 2026
**Auditor:** AI Implementor
**Evidence:** `docs/reports/Daily_Monthly_Operations_Semantic_Trace_2026-10-08.md`

---

## 1. Executive Summary
Fixes the defects found by the semantic trace: TD-059 and TD-063 – TD-069. The critical one (TD-063): entries made through the forms are now stamped with the current instant when the chosen day is today in shop time, so the Dashboard, the shift close and Reports agree. Existing entries and shifts already closed are not rewritten.

---

## 2. Structural Blast Radius (dependency-cruiser)
| Package | Modules | Changed | Transitive dependents outside the change set |
|---|---|---|---|
| server | 35 | 9 (`shopTime.ts` new; sales, keno, expenses, credits, sportsBetting, shifts, users controllers; `schemas/index.ts`) | 12: `app.ts`, `index.ts`, 10 routers |
| client | 33 | 12 (`MissedShiftsCard.tsx` new; `ShiftContext`, `dateUtils`, Admin, Credits, Dashboard, Expenses, GameSales, Keno, Reports, SalaryReport, SportsBetting) | 2: `App.tsx`, `main.tsx` |
| shared | — | `constants.ts` (additive: `SHOP_TIMEZONE`, `SHOP_UTC_OFFSET`) | server and client consume it |

Dependency rules (`--config .dependency-cruiser.js`): **no dependency violations found** (163 modules, 556 dependencies). The shop timezone is now defined once in `@level-up/shared`; `client/src/lib/dateUtils.ts` re-exports it.

### 2.1 Behavioural change (Express Backend API v1.0.0: additive or tightening only)
| Area | Before | After |
|---|---|---|
| Entry `date` for shop-today (sales, keno, betting, expenses, credits) | midnight UTC | the current instant (backdated/future days and values with a time of day unchanged) |
| Invalid `date` | 500 | 400 `Date is not valid` |
| Credit create | any employee id; blank reason crashed (500) | unknown or inactive employee 400 `Invalid employee`; blank reason saves |
| Credit status change | `resolved_date` stamped for any status | stamped for Resolved/Deducted, removed for Pending |
| `GET /api/credits` | by issue date | adds optional `dateField=resolved_date` (default unchanged) |
| Role change | self and root admin allowed | own role 400; root admin demotion 400 |
| Sale edit | re-priced at the current rate | keeps the stored rate; only a different game applies its current rate |
| Close MISSED shift | totals ran to now | totals end at the end of that shift's shop day; end time recorded as that moment |
| Shift day logic | server host timezone | shop timezone (UTC+3), host independent |

### 2.2 Client behaviour
- Admin: Add Game Rate, rate edit/toggle, Add Store Employee shown to admins only.
- Game Sales: "Add Default Games" admin only; others see "Ask an admin to add them."
- Dashboard: missed shifts card with a close form.
- Reports: deductions by deduction date (one extra request per load), note when losing keno/betting is left out of the mix, signed negative variances.
- SalaryReport: deductions by deduction date; note that base salary is monthly when the range is not a full month.
- Entry pages: an empty Date field shows "Please choose a date." instead of failing silently.

### 2.3 Not changed (by design)
- Existing entries (stamped midnight UTC before this change) and shifts already closed. Their stored values keep their old meaning.
- Browser-timezone handling in client history ranges (unverified, out of scope).
- Reports net-profit semantics (TD-027) and the historical-report stability it implies.

---

## 3. Test Impact & Regression Containment
**New tests:** shop-time helpers (11), server remediation (39: dating, validation, credit writes, employee check, status/resolved date, role guards, sale edit, credits by deduction date), shift day and MISSED close (8), client role gating (5), empty date (5), MissedShiftsCard (6), ShiftContext (2), Dashboard (2), SalaryReport (6), Reports (5).

**Red-Green (ADR-006):**
- Every new test was run and shown failing against the pre-fix code, except where noted. The shift-day tests only fail on a non-EAT host, so Red was proven under `TZ=UTC` (4 failed; under EAT only the 2 MISSED-window tests fail).
- `dateField` test: additionally proven against an intentionally flawed implementation (always filter by issue date), then restored.
- Helper and shift tests also pass under `TZ=UTC`, `America/New_York` and `Pacific/Kiritimati` (server suite 413/413 under UTC and New York).

**Existing tests changed, with reasons:**
- `creditsController` create test: mock gained an employee (creation now validates it).
- `Admin` suite: default user is now an admin (controls are admin-only); two tests asserted an exact fetch count that included only non-admin loads, now wait for the write call.
- `GameSales` default-games tests run as admin.
- `Dashboard` mocks gained `missedShifts: []` (7 places).
- `Reports`: 18 ordered mocks gained a seventh response per load (the deductions request); one total-request assertion 12 → 14.

**Real-flow re-verification** (real server code, real UI, in-memory database, server on `TZ=UTC`): the earlier reproductions now pass.
- Dashboard shows $23.00 / $40.00 / $-10.00 / -$20.00 / -$12.50; close form "Expected Cash: $120.50, Variance $0.00" (Addis Ababa and New York browsers).
- Blank-reason credit saves; manager sees no rate or employee cards; staff see "Ask an admin".
- Forgotten shift closes from the Dashboard: expected cash 140 (a later day's 500 excluded), end time = end of its shop day.
- Reports September unchanged (net profit $472, revenue $622); Bob's deductions: $50 September, $60 October.
- Shifts opened 00:30 and 01:59 shop time stay OPEN on a UTC server. Rules suite 49/49.

---

## 4. Gate Results
| Gate | Result |
|---|---|
| Biome `check .` | 182 files, 0 errors, 0 warnings |
| `tsc -b` | exit 0 |
| Vitest `--coverage` | 48 files, **850/850** (server 413, client 437); coverage thresholds met |
| Playwright | **26/26** |
| Knip | exit 0 |
| `npm run build` | exit 0 |
| dependency-cruiser | 0 violations |

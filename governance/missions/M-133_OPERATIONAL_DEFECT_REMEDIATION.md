# Active Mission: M-133 Operational Defect Remediation

## 1. Mission Context
**Status:** Active  
**Type:** Defect Remediation  
**Phase:** Verification  
**Primary Owner:** AI Implementor  
**Governing Proposal:** ACP-041 (`governance/proposals/ACP-041_Operational_Defect_Remediation.md`), PO-approved 2026-10-08  
**Evidence Source:** `docs/reports/Daily_Monthly_Operations_Semantic_Trace_2026-10-08.md`; blast radius in `docs/reports/M-133_Blast_Radius_Report.md`

## 2. Objective
Fix TD-059 and TD-063 – TD-069: entries made during a shift count in the shift and the Dashboard (TD-063); credits save without a reason (TD-064); shift days use shop time (TD-065); a forgotten shift can be closed (TD-066); payroll follows deduction dates (TD-067); sale edits keep their rate (TD-068); admin-only controls are admin-only (TD-059); validation gaps closed (TD-069).

## 3. Implementation
- Shared: `SHOP_TIMEZONE`, `SHOP_UTC_OFFSET`.
- Server: `utils/shopTime.ts` (`shopDateString`, `addDaysToShopDate`, `shopDayEnd`, `resolveEntryDate`); date validation in the five create schemas; `dateField` on `GET /api/credits`; credits (employee check, no undefined writes, `resolved_date` rules); sales (rate kept on edit); shifts (shop-time days, bounded close for MISSED shifts); users (no self role change, root admin protected).
- Client: `MissedShiftsCard` and `ShiftContext.missedShifts`; admin gating in Admin and GameSales; empty-date guard on five entry pages; Reports and SalaryReport by deduction date, monthly-salary note, mix note, signed variances.

## 4. Verification
- Red-Green for every fix; shift-day tests proven under `TZ=UTC`; `dateField` proven against a flawed implementation.
- Real-flow re-verification (real server code and UI on an in-memory database, UTC server): every earlier reproduction passes.
- Gates: Biome 0/0, tsc 0, Vitest 850/850 with coverage thresholds, Playwright 26/26, Knip 0, build 0, dependency-cruiser 0 violations.

## 5. Follow-ups (out of scope)
- Deploy to `levelup.froge.studio` (README cPanel commands).
- Existing entries stamped midnight UTC and shifts already closed are not rewritten.
- TD-060 (real-integration test layer), TD-061 (Vercel leftovers), TD-062 (E2E hook in production bundle).
- Browser-timezone handling in client history date ranges: unverified, not changed.

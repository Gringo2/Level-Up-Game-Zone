# CURRENT MISSION

**Type:** Feature Relocation + Access Change
**Mission:** M-74 Employee Hiring Form → Admin Settings; Widen /admin to Managers
**Status:** Locked (2026-08-22)

## PO Decisions (binding)
- Only the **Add Store Employee** form moves to /admin; Current Staff Roster stays on /admin/employees.
- `/admin` route+nav widened to **MANAGER+ADMIN** (side effect accepted: rates/categories manager-visible). Audit-logs & User Management remain admin-only.

## 3. Scope & Boundaries
- **In Scope:** EmployeeRoster.tsx (cut form/handler/state), Admin.tsx (paste; success path drops local list-append — no roster there), App.tsx + Layout.tsx role widening, test migration (5 creation tests → Admin.test, 1 staff-hide test → absence probe on roster).
- **Out of Scope:** server permission changes (API already permits managers to POST employees); User Management/invite flows.

## Testing Strategy (Rule 28)
Reds first: hiring-form renders/POST-payload/custom-date-breakday/error-toast/no-token tests against pre-move Admin + absence probe on roster. Existing Admin stubs extended with employees branch.

## Evidence Payload
- [x] Functional Verification: 458→459/459 / 34 files (+6 hiring tests in Admin, +1 absence probe; 6 obsolete roster tests removed; Layout manager-nav expectation updated to include Admin)
- [x] AVP-001: tsc=0 | Biome touched=0 | knip=0 | depcruise ✔

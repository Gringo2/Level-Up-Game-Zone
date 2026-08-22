# M-74 Blast Radius Report — Hiring Form → Admin + Access Widening

Date: 2026-08-22

## Change Surface
EmployeeRoster.tsx (−144 lines: form/handler/state), Admin.tsx (+hiring states/handler/card), App.tsx (/admin route gate split), Layout.tsx (nav roles), three test files. Zero API changes — server already permitted manager POSTs.

## Behavioral Change (PO-approved)
/admin now reachable by MANAGER+ADMIN → rates/categories management also becomes manager-visible. Audit-logs & User Management remain admin-only.

## Error Traceability
- No-token migration initially failed twice: (1) mount-time GETs consumed mockResolvedValueOnce(null) before the POST → switched to total override with try/finally restore; (2) PS4 wait-anchor unrenderable without token → anchored on the always-present form title.
- Roster absence probe hit real network (its describe has no default stub) → explicit stub added.
- Layout test expectation updated deliberately: manager nav now includes "Admin".

## Regression Certification
vitest **459/459 / 34 files** | tsc=0 | knip=0 | depcruise ✔ (148 modules, 443 deps) | Biome touched=0. Reds evidence: 7 failures captured pre-implementation.

## Consolidated Review Pass — M-72/M-73/M-74 batch (2026-08-22, probe-based)

**Footprint:** 16/16 paths match the commit manifest (13 modified + 3 owned reports); `git clean -n` shows zero scratch; diff litter scan (console.log/debugger/TODO) = 0 hits.

**Containment probes:**
- `Add Store Employee` and `Manage Categories` render from Admin.tsx ONLY.
- Expenses retains its read-only `/api/expense-categories` fetch + EXPENSE_CATEGORY_FALLBACKS (entry-form dropdown dependency preserved).
- EmployeeRoster: 0 stale references to removed identifiers (setName/setBreakDay/handleAddEmployee/submitLoading); roster list+edit flows intact.
- Route gates verified by read: manager gate wraps ONLY /admin; second admin-only gate wraps audit-logs + user management; Layout nav entry roles [ADMIN, MANAGER].
- Server/shared packages: untouched (git status).

**Findings fixed during review:** stale "{/* Admin Only Routes */}" comment above the widened manager gate → renamed to Manager & Admin convention.

**Post-review certification:** vitest **459/459 / 34 files** | tsc=0 | knip=0 | depcruise ✔ (148 modules, 443 deps) | Biome sweep over all 16 paths = 0 fails.

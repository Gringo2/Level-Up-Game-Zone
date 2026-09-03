# M-87 Blast Radius Report

**Mission:** M-87 Active Debt Resolution by Priority
**Date:** 2026-08-25 · **Baseline:** M-86 tree (post `04c3962` + M-86 working set)

## 1. Changed Surface (git manifest)
- **Server prod (14):** firebase.ts (rewritten: env-first credentials, eager validation, admin@14 named subpath imports), staticHosting.ts (**NEW**), utils/logger.ts (**NEW**), utils/list.ts (**NEW**, pagination envelope), app.ts (+static/JSON-404/logger), schemas/index.ts (+limit/cursor), sales/keno/expenses/credits/employees controllers (+pagination/delete), routes/sales|employees (+mounts), index.ts (logger), plus implicit-any annotations across remaining controllers.
- **Shared:** package.json entry src-TS→dist JS + build script (prod-runtime fix).
- **Client prod (5):** GameSales/Keno/Expenses/Credits (limit=200, listFromPayload, Load-older), lib/api.ts (listFromPayload).
- **Infra:** root Dockerfile (**NEW**), .dockerignore (**NEW**), root+shared manifests.
- **Tests:** +firebaseInit(7) +staticHosting(5) +pagination(16) +logger(4) +TD-041(5) +RBAC E2E(+3) +envelope client tests(×4); expensesController.test annotation cleanup.

## 2. Dependency Graph
- depcruise at close: **161 modules / 480 dependencies / 0 violations** (M-86: 149/448).
- New runtime deps: pino@10 (server only); firebase-admin@12→14; overrides uuid@11.1.1 (nested placement npm-blocked — TD-013 documents evidence).
- Boundary confinement: logger imported by server modules only; pagination util server-only; staticHosting composed in app.ts root.

## 3. Downstream Impact Analysis
- **shared entry → dist:** every consumer's runtime resolution changed (verified by boot smoke + full suite); type resolution unchanged via declaration output; dev flow guarded by predev:server shared build.
- **List endpoints:** envelope is opt-in (no `limit` ⇒ legacy array byte-compatible) — Dashboard/Reports/SalaryReport untouched and pinned by their existing suites; entry pages migrated with tolerant reader (both shapes accepted, tested).
- **Static hosting:** mounted after all /api mounts with explicit JSON 404 catcher before SPA fallback — API surface semantics preserved (app-level Red-Green).
- **Logger conversion:** mechanical console.*→logger.* across 14 files; error-path assertions unaffected (safeError sentinel contract separate from logging).
- **admin@14:** transaction/doc callback typing annotated (~100 sites, no logic changes); FieldValue/auth/firestore subpath imports verified stable.

## 4. Verification State
The following verification snapshot is historical evidence collected on 2026-08-25; later lock evidence supersedes its test count.
Full coverage-gated battery **549/549** (39 files, thresholds pass incl. pages floors restored via new envelope tests) · tsc ×2 clean · biome touched=0 · knip 0 · depcruise 0 · E2E **9/9** · docker image probe passed to credential-validation depth · prod boot smoke (health/SPA/API-404) green.

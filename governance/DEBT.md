# Technical Debt Governance

This is a governed backlog for technical debt. Instead of using inline comments like `// fix later`, track technical debt here.

## Active Debt

| ID | Reason | Impact | Priority | Owner | Resolution Mission |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TD-010 | **CORS wide open** — `app.use(cors())` allows any origin. Attacker can host malicious page making cross-origin requests using victim's Firebase session. (`app.ts:13`) | CRITICAL — security breach vector | Critical | Backend | TBD |
| TD-011 | **No rate limiting** — all API endpoints (POST/PUT/DELETE) vulnerable to brute-force, credential stuffing, DoS. No `express-rate-limit` installed. | CRITICAL — abuse vector | Critical | Backend | TBD |
| TD-012 | **No security headers** — no `helmet` installed. Missing CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. | CRITICAL — XSS/clickjacking | Critical | Backend | TBD |
| TD-013 | **21 npm vulnerabilities** — 1 critical (`websocket-driver`), 7 high (`react-router-dom` RCE/XSS, `vite` path-traversal/file-read, `@grpc/grpc-js` crash). All fixable via `npm audit fix`. | HIGH — exploitable in production | High | Infra | TBD |
| TD-015 | **API fallback uses plaintext HTTP** — `http://${hostname}:4000` default in `api.ts:8`. Firebase ID tokens sent in cleartext without `VITE_API_URL`. | HIGH — credential interception | High | Client | TBD |
| TD-016 | **Firebase client config committed to git** — `firebase-applet-config.json` contains projectId, apiKey, appId. Not in `.gitignore`. | HIGH — attack surface increase | High | Infra | TBD |
| TD-017 | **GEMINI_API_KEY exposed in client bundle** — injected via Vite `define` at build time, visible in DevTools. | HIGH — API key theft | High | Client | TBD |
| TD-018 | **No Dockerfile** — no containerized deployment path. Cannot deploy to Cloud Run/GKE without containerization. | HIGH — deployment blocker | High | Infra | TBD |
| TD-019 | **No static file serving** — Express serves only `/api/*`. Client must deploy separately. No unified deployment. | HIGH — operational complexity | High | Backend | TBD |
| TD-021 | **Server Firebase init hardcoded path** — `serviceAccountKey.json` path hardcoded in `firebase.ts:24`. No `GOOGLE_APPLICATION_CREDENTIALS` support. | MEDIUM — portability | Medium | Backend | TBD |
| TD-022 | **Sync file read no error handling** — `firebase.ts:33` reads JSON config synchronously. Server crashes at startup if file missing, no fallback. | MEDIUM — startup fragility | Medium | Backend | TBD |
| TD-023 | **No root `build`/`start` scripts** — must run `build:client` and `build:server` separately. No single `npm start` for production. | MEDIUM — DX/deploy friction | Medium | Infra | TBD |
| TD-024 | **No structured logger** — raw `console.*` calls across 56 locations. No log levels, no redaction, no JSON output for aggregation. (Recounted 2026-08-21 at HEAD `8a16a65`; was 44 — count is growing.) | LOW — observability gap | Low | Backend | TBD |
| TD-025 | **Residual RBAC gaps on create endpoints** — `requireRole` now enforced (commits `438ea0c`, `3bed5b2`) on rates CRUD, users admin ops, employees POST/PUT, audit-log reads, and PUT/DELETE across sales/keno/expenses/credits. **Privilege escalation:** `POST /api/users` has only `requireAuth` (`routes/users.ts:29`) while `CreateUserSchema` accepts `role` incl. `ADMIN` — any staff user can mint an admin account via API. Also still `requireAuth`-only: all POST/create endpoints (sales, keno, expenses, credits), all shift mutations (incl. close/float), and expenseCategories POST/PUT — may be intended daily-logging workflow; needs explicit design decision. (Verified 2026-08-21 at HEAD `8a16a65`.) | CRITICAL — privilege escalation | Critical | Backend | TBD |
| TD-026 | **Server trusts client-computed totals** — GameSales `calculated_total` (rate × quantity) and Keno `net_profit` (sales − payouts) are computed client-side and sent as-is. Server does not recompute or verify. Malicious client can send arbitrary values. (`salesController.ts:41`, `kenoController.ts:35`) | CRITICAL — data integrity breach | Critical | Backend | TBD |
| TD-032 | **No pagination on sales/keno/expenses/credits list endpoints** — Cursor pagination now exists on audit logs only (commit `438ea0c`). The four business collections still return entire Firestore results; client filters by date in JS. As data grows, every dashboard load transfers full history. | MEDIUM — scalability blocker | Medium | Backend | TBD |
| TD-035 | **GameSales `game_id` optional, no FK check** — `CreateSaleSchema` marks `game_id` as optional. Server never verifies it references an actual `game_rates` document. Sale can reference nonexistent rate. (`schemas/index.ts:44`) | LOW — data integrity gap | Low | Backend | TBD |
| TD-036 | **E2E RBAC tests are minimal** — Only 2 RBAC tests exist (`rbac.spec.ts`): staff redirect to `/` and admin can see Admin page. No tests for staff calling API endpoints, manager route restrictions, invite flow, or root admin protection. | LOW — test coverage gap | Low | QA | TBD |
| TD-041 | **No employee delete route** — Server has no `DELETE /api/employees/:id`. Employees can only be deactivated (`isActive: false`), never removed. Roster accumulates stale records indefinitely. (`routes/employees.ts`) | LOW — data hygiene | Low | Backend | TBD |
| TD-044 | **Client test suites flaky in small runs** — `Credits.test.tsx` and `Layout.test.tsx` fail (duplicate-element + waitFor-timeout errors) when run solo or in small file subsets, but pass consistently in the full 34-file suite. Reproduced at HEAD `64f20ee` via throwaway worktree (13 failed \| 6 passed solo) and re-confirmed at HEAD `8a16a65` (19 failed \| 10 passed). Breadth is wider than first documented: a Reports+SalaryReport 2-file subset also fails (7 failed \| 7 passed at HEAD `8a16a65`). Suspected timing-dependent cross-test interference; root cause not yet diagnosed. Gate context (full suite) is green. | MEDIUM — masks real regressions in targeted runs | Medium | QA | TBD |
| TD-045 | **Reports.tsx / SalaryReport.tsx coverage near floors** — 7 uncovered functions in Reports.tsx (lines ~273–722) and 9 in SalaryReport.tsx (~85–387) leave pages functions coverage at 93.86% against the 93% floor with almost no headroom. Any new page function without tests will trip Gate 3. | LOW — future gate friction | Low | QA | TBD |

## Deferred Debt (Awaiting Product Owner Decision)

**Gate:** All items below involve the shift identity model — how Shifts relate to Employees vs Users. They are parked until the Product Owner records a decision on that model (link direction, identity source, backfill strategy). No implementation work may begin on these items before that decision exists.

| ID | Reason | Impact | Priority | Owner | Pending On |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TD-030 | **No audit log on shift close** — `startShift` and `updateFloat` write audit entries. `closeShift` does not. Audit Logs page will not show shift-close events. (`shiftsController.ts:92-178`) | MEDIUM — audit trail gap | Medium | Backend | Shift decision |
| TD-038 | **Employee and User are disconnected entities** — No `employee.user_uid` or `user.employee_id` foreign key. A person who works at the store (Employee: name, salary, position) and a person who logs into the system (User: email, role, auth UID) are two unrelated records. Cannot answer "which system user is which store employee." | HIGH — architectural gap | High | Architecture | Shift decision |
| TD-040 | **Shifts reference users, not employees** — `shift.manager_id` stores `user.uid` (Firebase Auth UID). No way to connect a shift to an employee's salary information programmatically. Payroll cannot use shift data. (`shiftsController.ts:60`) | MEDIUM — payroll disconnect | Medium | Backend | Shift decision |

| TD-047 | **From > To range silently yields empty list** — no cross-field guard, inline hint, or reset-to-today affordance on either entry page (`Keno.tsx` / `GameSales.tsx` date-range cards). Users get a blank history with no explanation. (Gap report B3) | LOW-MED — usability trap | Medium | Frontend | PO decision |
| TD-048 | **No list-fetch loading feedback** — history Apply/initial/visibility refetch shows zero indication; `Loader2` exists only on form submit; Apply stays clickable during flight. (Gap report B4) | LOW-MED — perceived hang | Medium | Frontend | PO decision |
| TD-049 | **Create/edit prepends row without range re-check** — backdated entry appears under a non-matching date filter until next refetch (documented in M-67 review). (Gap report C3) | LOW — transient inconsistency | Low | Frontend | PO decision |
| TD-050 | **Icon-only Delete buttons lack aria-labels** — Trash2 ghost buttons announce as unnamed to screen readers on both pages; fix should be a repo-wide icon-button audit, not just these pages. (Gap report D1/P5) | MEDIUM — a11y | Medium | Frontend | PO decision |
| TD-051 | **GameSales has no verification workflow** — `GameSalesLog` carries no `verified` field, no verify endpoint, no badge/UI, while Keno has the full manager-verify flow (`shared/src/index.ts:43-53` vs `:55-64`). Asymmetric trust model: sales entries can never be verified. Contract-level fix (shared type + server + client). (Gap report F1) | MEDIUM — trust-model asymmetry | High | Full-stack | PO decision |
| TD-052 | **Sale records do not persist rate unit_type** — GS rows hardcode "{qty} units @ ${rate}" though rates carry Hours/Tables; cannot display real units without persisting at creation (+ legacy-row fallback). (Gap report F2) | LOW-MED — presentation accuracy | Medium | Backend+Frontend | PO decision |

| TD-053 | **Expenses Verify button lacks in-flight guard** — `handleVerify` has no pending flag/disable while Keno & GameSales got C1 guards in M-68; double-click can fire duplicate verify PUTs. (`Expenses.tsx` Verify button) | MEDIUM — duplicate-request risk | Medium | Frontend | PO decision |

## Resolved Debt

| ID | Resolution Details | Date |
| :--- | :--- | :--- |
| TD-046 | Reports-style dual date-picker range browsing (From/To + Apply, default shop-day today) added to GameSales and Keno list cards; Keno switched from fetch-all-then-client-filter to server-side ranged GET — payload waste eliminated (M-67). Server source untouched (endpoints already ranged). +4 client param/refetch tests, +2 behavioral server range-exclusion tests; 435/435 suite green; tsc, knip, depcruise, Biome clean. | 2026-08-22 |
| TD-014 | Central `safeErrorMessage` allowlist sanitizer (`packages/server/src/utils/safeError.ts`); 30 controller catch-fallbacks converted from raw `(error as Error).message` echo to sentinel-allowlist-or-generic; 0 echo paths remain (verified by grep); intentional sentinel mappings (DUPLICATE_NAME, not-found, forbidden) preserved; +1 Red-Green-proven leak test (M-65). 425/425 suite green; tsc, Biome, knip, depcruise clean. | 2026-08-21 |
| TD-042 | Invite form relabeled "Invite User" — PO decision: employees are workflow records, users are system accounts (M-64). Red-Green regression test; 424/424 suite green. | 2026-08-21 |
| TD-028 | Shared `Credit` type += optional `reason`; Credits page captures (create/edit) and displays it; SalaryReport deduction rows show per-credit reason; server zero-change — payloads already round-trip the field (M-63). 3 Red-Green tests; 423/423 suite green. | 2026-08-21 |
| TD-027 | Reports `netProfit` now subtracts PENDING credits only (Dashboard-parity semantics); Deducted/Resolved excluded as already recovered via payroll (M-62). Red-Green-proven unit test; 420/420 suite green; tsc + Biome clean. | 2026-08-21 |
| TD-037 | `listUsers` and `listAuditLogs` now gated behind `requireRole(ADMIN)` server-side. Verified at HEAD `8a16a65`. | 2026-08-21 |
| TD-043 | `POST /api/employees` and `PUT /api/employees/:id` now enforce `requireRole(ADMIN)` (commit `3bed5b2`). Verified at HEAD `8a16a65`. | 2026-08-21 |
| TD-033 | Server-side date filtering added: `startDate`/`endDate` `where("date", ...)` clauses on listSales, listKenoLogs, listExpenses, listCredits; shifts use DateRangeQuerySchema (commit `438ea0c`). Verified at HEAD `8a16a65`. | 2026-08-20 |
| TD-034 | `firestore.indexes.json` created with composite indexes for user_id+date on game_sales_logs, keno_logs, expenses, credits (commit `438ea0c`). Verified at HEAD `8a16a65`. | 2026-08-20 |
| TD-039 | Credits now carry `employee_id`; SalaryReport groups deductions by `employee_id` first, lowercased name only as legacy fallback (commit `438ea0c`). Verified at HEAD `8a16a65`. | 2026-08-20 |
| TD-031 | SalaryReport sends `startDate`/`endDate` query params scoped to the selected pay period (commit `4ccdbf8`). Verified at HEAD `8a16a65`. | 2026-08-19 |
| TD-020 | Root admin emails externalized to `ROOT_ADMIN_EMAILS` in `shared/src/constants.ts` with env override (`ROOT_ADMIN_EMAILS`); controller imports constant (commit `b804e67`). Verified at HEAD `8a16a65`. | 2026-08-17 |
| TD-029 | `UpdateCreditSchema.editReason` enforces `.trim().min(3)` schema-side; duplicate manual length check removed from controller (introduced Mission 8, commit `95dd8ab`). Verified at HEAD `8a16a65`. | 2026-08-11 |
| TD-003 | 100% missing integration coverage on large controller blocks closed: `verifyExpense`/`verifyKeno`/`deleteKeno` (M-32), `resolveMissedData`/`updateRole`/`deleteUser` (M-33). | 2026-08-14 |
| TD-004 | "Not Found" negative-path integration tests added for shifts (`closeShift`, `updateFloat`) and users (`updateRole`, `deleteUser`) plus keno/expenses in M-32. | 2026-08-14 |
| TD-005 | 500 DB-crash fallback tests added for every shifts and users controller operation, plus keno/expenses in M-32. | 2026-08-14 |
| TD-006 | Branch-coverage gap closed on the two weakest controllers: expenses 62.5% -> 100% branch, auditLogs 50% -> 100% branch; verifyExpense fully covered (M-34). | 2026-08-14 |
| TD-007 | Remaining branch-coverage gap closed on sales/credits/gameRates/employees (all -> 100% branch); every controller now >= 90.9% stmts / 100% funcs (M-35). | 2026-08-14 |
| TD-008 | Last statement-coverage gap in the Express composition root + schemas closed: app.ts 83.3% -> 100% stmts, schemas/index.ts 91.2% -> 100% stmts; health endpoint, global error handler, and zod errorMaps covered (M-36). | 2026-08-15 |
| TD-009 | Pre-fix schema/controller mismatch resolved (ACP-004, M-38): `reason` missing from `UpdateCreditSchema` and `shift_id` missing from `ResolveMissedDaySchema` — credit `reason` updates now persist and stale-shift resolution works again. | 2026-08-16 |
| TD-001 | Refactored `requireAuth` to use `makeRequireAuth` with injectable `TokenVerifier`. Added `auth.test.ts` with 4 unit tests (no-token, bad-header, invalid-token, valid-token). | 2026-08-11 |
| TD-002 | Created `CHANGELOG.md` (Keep a Changelog format, seeded with Missions 1–7) and `CODEOWNERS` at repo root. | 2026-08-11 |

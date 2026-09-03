# CURRENT MISSION

**Type:** Infrastructure
**Mission:** M-87 Active Debt Resolution by Priority — Deploy Path (TD-018/019/023) + Firebase Init Hardening (TD-021/022) + Pagination (TD-032) + Hygiene/QA (TD-041/036) + Structured Logging (TD-024) Breaking Majors (TD-013, PO-approved 2026-08-25)
**Status:** Locked (2026-09-02, all gates passed, awaiting PO deployment approval)

## 1. Objective
Resolve all 10 AI-actionable Active Debt items in register-priority order (PO directive 2026-08-25: "resolve the active debt with priority"). TD-016 was completed by the PO in commit `a4603c4` and is included in the deployment evidence.

1. **Phase A — Firebase init hardening (TD-021 HIGH-value, TD-022):** `firebase.ts` prefers `GOOGLE_APPLICATION_CREDENTIALS` env path → falls back to `SERVICE_ACCOUNT_KEY_PATH` env → falls back to legacy `../serviceAccountKey.json`; sync read wrapped with actionable startup error naming all three attempted locations instead of a raw crash.
2. **Phase B — Deployment path (TD-019 → TD-023 → TD-018):** Express serves `packages/client/dist` static assets + SPA fallback (API routes take precedence); root `build` and `start` scripts (build both workspaces, then node dist server); multi-stage root `Dockerfile` (deps → build → runtime, non-root user, `CMD ["npm","start"]`) + `.dockerignore`.
3. **Phase C — Scalability (TD-032):** cursor pagination on listSales/listKenoLogs/listExpenses/listCredits mirroring the auditLogs precedent (`limit` + `cursor` doc-id `startAfter`, `{data,nextCursor}` envelope) composed WITH existing date-range `where` clauses. Client entry pages consume envelope transparently (load-more only if trivially additive; otherwise full-envelope swap preserving current UX).
4. **Phase D — Hygiene/QA (TD-041, TD-036):** `DELETE /api/employees/:id` admin-gated with DeleteReasonSchema + audit record mirroring sibling deletes; RBAC E2E expansion (staff blocked from manager-only API routes via real 403s, manager vs admin route matrix, root-admin protection).
5. **Phase E — Observability (TD-024):** structured logger replacing raw `console.*` across server src (JSON lines, level via `LOG_LEVEL`, error redaction reusing safeError sentinel discipline). Logger: pino (PO-approved buy decision 2026-08-25).
6. **Phase F — Breaking majors (TD-013), PO-approved 2026-08-25:** `firebase-admin@12→14` + `uuid` chain to ≥11.1.1 via npm overrides; full controller-mock compatibility sweep; isolated last so Phases A–E land regardless.

## 3. Scope & Boundaries
- **In Scope:** `firebase.ts`, `app.ts` (static serving only), root/package manifests + Dockerfile/.dockerignore, 4 list controllers + their schemas/tests + minimal client consumption, employees route/controller/tests, `rbac.spec.ts`, new logger util + call-site conversion, dependency manifests.
- **Out of Scope:** History rewrite, client pagination UI beyond envelope compatibility, log aggregation infrastructure, any shared-baseline type changes (none required — verified).

## Design Notes
- Static serving is prod-only behavior behind existing build outputs; dev flow (`vite` proxy-less loopback) untouched; E2E unaffected (webServer runs vite).
- SPA fallback must not shadow `/api/*` (mounted after routes, excludes `/api` prefix).
- Pagination envelope is additive: existing ranged GETs keep working when no `limit` passed (default 50 mirrors audit logs).
- Employee delete = hard delete with mandatory reason + audit trail (parity with sales/keno/expenses deletes).

## Testing Strategy (Rule 28)
Red-Green per item. Firebase init: table-driven location-resolution unit tests + missing-file negative asserting the actionable message. Static serving: supertest asserts HTML at `/` and 404 JSON preserved for unknown `/api/*`. Pagination: behavioral tests per endpoint — envelope shape, limit honored, cursor resumes without overlap/drop (Red against unpaginated code first). Employee delete: golden path + reason-required Zod negative + role gate + audit capture. Logger: redaction unit tests (no secret keys in output) + level filtering. Dockerfile: `docker build` probe if daemon available, else lint-level verification documented as environment-limited. TD-013: full battery before AND after; every controller suite green against upgraded SDK types.

## Evidence Payload (Lock Locked 2026-09-02)
- [x] Functional Verification: **555/555 tests** (39 files) | **92.13% statements, 77.03% branches, 95.67% functions, 93.37% lines** | E2E **9/9** | boot smoke: build→start→health/SPA/API-404 | docker image built+probed to credential-validation depth
- [x] Architectural Verification (AVP-001): tsc ×2 ✔ | biome touched=0 ✔ | knip 0 ✔ | depcruise 0 ✔
- [x] Dependency Graph: +pino@10 (server runtime), firebase-admin@14, overrides uuid@11.1.1; residual 3 moderate `qs` advisories remain in the Express 4 dependency range (documented TD-013)
- [x] DEBT: TD-018/019/021/022/023/024/032/036/041 closed with evidence; TD-013 rewritten truthfully; ROADMAP M-56/M-58/M-59 synced
- [x] **Full evidence packet:** [docs/reports/M-87_LOCK_EVIDENCE_PACKET.md](docs/reports/M-87_LOCK_EVIDENCE_PACKET.md) | [governance/RELEASE_READINESS.md](governance/RELEASE_READINESS.md)

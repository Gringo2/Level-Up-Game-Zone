# M-86 Blast Radius Report

**Mission:** M-86 Debt Closure Sweep — Security Hardening + Contract Additions + UX/A11y + QA Stability + Deps
**Generated:** 2026-08-25 (review pass, post sentinel-fix)
**Baseline:** HEAD `04c3962` (M-85 lock)

## 1. Changed-File Manifest (git-verified)

**Server production (4):**
| File | Change |
|---|---|
| `packages/server/src/app.ts` | helmet → CORS allowlist → 2-layer rate limiting wired before `express.json()` |
| `packages/server/src/middleware/security.ts` | **NEW** — pure builders: `parseAllowedOrigins`, `buildCorsOptions`, `buildApiRateLimit`, `buildMutationRateLimit` |
| `packages/server/src/controllers/salesController.ts` | create persists rate-authoritative `unit_type` (conditional spread); update converges/clears it; dead client-value bindings removed from destructure; NEW `verifySale` (keno-mirrored transaction+audit); audit `new_value` scrubbed of delete sentinels (M-66 precedent) |
| `packages/server/src/routes/sales.ts` | mounts `PUT /:id/verify` behind `requireAuth` + `requireRole([MANAGER, ADMIN])` |

**Shared baseline (1):**
| File | Change |
|---|---|
| `packages/shared/src/index.ts` | `GameSalesLog` += optional `unit_type?: string`, `verified?: boolean` (ACP-008; additive only) |

**Client production (6):**
| File | Change |
|---|---|
| `GameSales.tsx` | verify badge/button/guard (`verifyingId`), unit-aware row rendering with legacy fallback, `aria-label` on delete |
| `Expenses.tsx` | C1 in-flight guards (`verifyingId`/`deletePending`) on Verify/Edit/Delete; `aria-label` on delete |
| `Keno.tsx` / `Credits.tsx` / `Admin.tsx` / `UserManagement.tsx` | `aria-label` only |

**Tests (7 modified + 1 new):** salesController (+8 tests), securityMiddleware (**NEW**, 13 tests), GameSales (+6), Expenses (+2), Keno/Credits/Admin/UserManagement (+1 each).

**Governance/docs/config:** MISSION.md (M-86), ACP-008 (**NEW**), `.env.example` (+4 vars), README.md (security config section), package manifests.

## 2. Dependency Surface
- Added runtime deps (server only): `helmet@8.3.0`, `express-rate-limit@8.6.2` — ADR-003 reuse, PO-approved approach.
- Dev bump both workspaces: `tsx ^4.21.0 → ^4.23.12` (clears esbuild GHSA-g7r4-m6w7-qqqr; audit 9 → 8; residual = uuid chain, `--force`-only breaking majors, deferred per TD-013).
- depcruise at review: **149 modules / 448 dependencies / 0 violations** (M-85 baseline: 147/439 — delta = new security module + its test).
- New-dep boundary confinement: helmet/express-rate-limit imported ONLY inside `middleware/security.ts` and `app.ts` (Express Backend composition root) — verified by grep.

## 3. Downstream Impact Analysis
- **`shared/index.ts`** (38 files import `@level-up/shared`; 4 non-test consumers of `GameSalesLog`: history.ts, Dashboard, Reports, GameSales): additive optional fields ⇒ type-compatible everywhere; no consumer required changes (verified: Dashboard/Reports render raw numerics, unaffected by units display change).
- **`app.ts`**: every `/api/*` route now passes through helmet/CORS/limiters. Empirically proven live: E2E 6/6 against real dev stack (`:3002` origin allowlisted), health endpoint emits draft-7 RateLimit headers.
- **`security.ts`**: single production importer (`app.ts`) + its dedicated test.
- **`salesController.verifySale`**: reachable only via the new route mount.
- **`updateSale` audit payload**: sentinel-scrubbed per M-66 keno precedent — Red-Green proven (test failed pre-fix exposing the illegal-in-set() sentinel).

## 4. Verification State at Report Time
- Full coverage-gated suite: **506/506, 35 files, thresholds pass**
- tsc server+client: clean · biome touched-files: 0 errors/warnings · knip: 0 · depcruise: 0
- Playwright E2E: 6/6 (live CORS/helmet/rate-limit interaction)
- TD-044: documented repro subsets re-run at HEAD — all green solo and paired (closure = no-repro, not a code fix)

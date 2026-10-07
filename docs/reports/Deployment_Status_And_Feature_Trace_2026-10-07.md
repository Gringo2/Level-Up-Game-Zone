# Deployment Status & Feature Trace — 2026-10-07

**Scope:** Compare local `main` against the deployed production system, and trace whether implemented features are actually usable end-to-end.
**Method:** Read-only git probes, the GitHub API, HTTP probes, production bundle analysis, a full gate run, and one transient server probe (deleted the same turn, per Rule 23).
**Follow-ups:** ACP-040 (Draft), TD-058 – TD-062.

## 1. Version Alignment

| Location | Commit | Mission | Evidence |
|---|---|---|---|
| Local `main` | `1f7c39e` | M-131 | `git rev-parse main` |
| GitHub `origin/main` | `1e473c2` | M-123 | `git ls-remote origin` |
| **Production** `levelup.froge.studio` | ≈ `949e3e8` | **M-122** | bundle analysis (§2) |

- Production is cPanel (LiteSpeed/Passenger, `65.98.127.14`), deployed manually with the README "Production Deployment (cPanel via Git)" commands. Pushing to GitHub does not update it.
- Local `main` is 8 commits ahead of `origin/main`, 0 behind, and contains all of `upstream/main`.
- Vercel is not used (PO, 2026-10-07; see TD-061).

## 2. Production Version Identification
- **Live probes:** `/` → 200; `/api/health` → 200 `{"status":"ok"}`; `/api/credits` without a token → 401; unknown `/api/*` → JSON 404.
- **Production bundle:** `index-CaiuLnQ9.js`, `last-modified` 2026-09-23 21:39:42 GMT.
- **Why hashes don't settle it:** none of the local builds (`949e3e8`, `1e473c2`, `1f7c39e`) produce matching JS or CSS hashes. The CSS differs too, so the server is resolving its own dependency versions.
- **Differential UI-text test** (text present in a newer build and absent from the older one):
  - The 6 strings new in M-123 (e.g. "No game sales logged yesterday.") are all absent in production.
  - The 4 strings new in M-124–M-131 ("Date range presets", "Last Week", "Last Month", "Per Match") are all absent in production.
  - The M-122 Reports "Yesterday" preset is present.
- **Conclusion:** production serves the M-122 client.
- **Not verified:** the server version. Every non-health endpoint requires a registered login.

## 3. Release Gates on Local `main` (`1f7c39e`)

| Gate | Result |
|---|---|
| `npm run build` | Exit 0. Advisory: main chunk is 988 kB, over Vite's 500 kB warning. |
| `biome check .` | 173 files, 0 issues |
| `vitest run` | 42 files, 729/729 passed |
| Playwright | Not run in this audit |

## 4. Feature Trace (client → API → server)
- **Route coverage:** all ~70 `authFetch` call sites (12 pages, `UserManagement`, `ShiftContext`) resolve to an existing Express route with the matching method. No orphan calls were found.
- **Reports:** fetches shifts, sales, keno, credits, expenses and sports betting without `limit`, so the server returns the full ranged set (`sendList` legacy bare-array path). Totals are not truncated.
- **History pages:** GameSales, Keno, SportsBetting, Credits, Expenses and AuditLogs use `limit` plus cursor pagination, with a working "Load more" control.

## 5. Defects Found

| ID | Severity | Finding |
|---|---|---|
| TD-058 | Critical | API membership is not enforced. An unregistered token got 200 on 9 list routes and 201 on a create route; the role-gated control route got 403. Removed users keep access. Plan: ACP-040. |
| TD-059 | High | `/admin` is open to managers, but its rate and employee controls call ADMIN-only endpoints (403). GameSales default-rate seeding renders for non-admins. |
| TD-060 | Medium | No real-integration tests: server tests mock Firestore, and Playwright mocks `**/api/**`. |
| TD-061 | Low | Abandoned Vercel artifacts. |
| TD-062 | Low | `__E2E_USER__` hook is live in the production bundle (confirmed in `index-CaiuLnQ9.js`). UI-only. |

## 6. Not Verified
- Authenticated flows on production. This needs an invited account, and the AI Implementor must not enter credentials.
- Behaviour against a real Firestore instance. Local `.env` points at the live project; no test data was written.

## 7. Recommended Sequence
1. Approve ACP-040 → M-132 (security).
2. Address TD-059. Consider merging or porting `63d69e5`.
3. Push `main`, deploy to cPanel, then re-run the §2 differential to confirm M-131+ is live.

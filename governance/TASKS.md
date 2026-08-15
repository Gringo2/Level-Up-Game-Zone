# Mission 9: System Stability & Crash Resilience
*Status: LOCKED*

## Phase A: UI Crash Boundary
- [x] 1. Create `packages/client/src/components/ErrorBoundary.tsx` class component.
- [x] 2. Wrap `<AppContent />` root in `App.tsx` with `<ErrorBoundary>`.

## Phase B: Server Exception & Signal Handling
- [x] 3. Add 4-argument Express error handling middleware `(err, req, res, next)` in `index.ts`.
- [x] 4. Add `unhandledRejection`, `uncaughtException`, `SIGTERM`, `SIGINT` process listeners.

## Phase C: Transport & Safe Parsing
- [x] 5. Create `packages/client/src/lib/api.ts` exporting `API_BASE` and `safeJson<T>()`.
- [x] 6. Create `packages/client/.env.example` documenting `VITE_API_URL`.
- [x] 7. Replace 44 hardcoded `http://` strings across 13 client files with `${API_BASE}`.
- [x] 8. Replace unsafe `.json()` calls with `safeJson(response)`.

## Phase D: Verification & Finalization
- [x] 9. Run full verification suite (`tsc`, `vitest`, `knip`, `playwright`).
- [x] 10. Lock Mission 9 and update `STABILITY_GAP_ANALYSIS.md`.

---

# Missions 10-32: Execution Ledger
*Status: LOCKED (all)*

Atomic task breakdowns for Missions 10-32 were tracked per-mission in `MISSION.md` history and the git commit record, not in this file. This ledger records their lock state and governing commit for traceability (see `ROADMAP.md` for titles).

| Mission | Lock Evidence |
| :--- | :--- |
| M-10 | `1de46b1` |
| M-11 | No lock commit exists anywhere (branches, reflog, dangling objects, full-text search); MISSION.md jumps M-10 → M-14 |
| M-12..M-14 | `1d5ebbe` |
| M-15 | `7416446` |
| M-16..M-17 | `40178f4` |
| M-18 | `843d112` |
| M-19 | `859a428` (MISSION.md: "Governance Framework Maturation (.agents 10/10 MVP)") |
| M-20 | `580219e` |
| M-21 | `54c1370` |
| M-22 | `7335f3e` |
| M-23 | `93e7c16` |
| M-24 | `d79a088` |
| M-25 | `d1592e2` |
| M-26 | `7826ebb` |
| M-27..M-29 | `eaccfe1` |
| M-30 | `a33dedf` |
| M-31 | `7b5cee1` |
| M-32 | `e0bb3bb`, re-verified 2026-08-14 per AFR-002 |
| M-33 | Shifts/users coverage (2026-08-14); shifts 55.6% -> 93.1%, users 38.2% -> 91.7%; closes TD-003/004/005 |
| M-34 | Expenses/auditLogs coverage (2026-08-14); expenses 62.9% -> 92.1% stmts/100% branch, auditLogs 72.7% -> 90.9% stmts/100% branch |
| M-35 | Final-4 coverage (2026-08-14); sales 76.8% -> 91.3%, credits 75.6% -> 92.3%, gameRates 75.0% -> 92.9%, employees 73.3% -> 93.3% (all 100% branch) |


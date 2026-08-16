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
| M-35 (errata) | Per-suite test-count correction (2026-08-15). M-35 MISSION.md recorded `credits 7 -> 14, gameRates 5 -> 10, employees 5 -> 10` (23 tests); committed tree `f5f2dd4` shows credits 17, gameRates 13, employees 13 — true deltas +10/+8/+8 = +36 tests (140 -> 176 total, verified). Coverage percentages unchanged and correct. |
| M-36 | App composition root + schemas coverage (2026-08-15); app.ts 83.3% -> 100% stmts, schemas/index.ts 91.2% -> 100% stmts |
| M-37 | Shifts/users branch gaps (2026-08-16, Locked); shifts branch 88.0%, users branch 97.6%; coverage work shipped inside M-38 commit `5c5256d` |
| M-38 | ACP-004 Dead Guard Removal (2026-08-16, Locked); removed 48 Zod-/auth-shadowed controller guards, `AuthRequest.user` non-optional via Express global augmentation, added `reason` to `UpdateCreditSchema` + `shift_id` to `ResolveMissedDaySchema` (restores stale-shift resolution + credit reason persistence); controllers now 100% stmts/lines, 185 tests pass |
| M-39 | Governance Housekeeping (2026-08-16, Locked); M-37 closure, ROADMAP sync (M-37/M-38/M-39), TD-009 recorded in DEBT.md; `git rm --cached packages/shared/tsconfig.tsbuildinfo` delegated to Product Owner |
| M-40 | Zero-Lint-Warning Cleanup (2026-08-16, Locked); `biome check .` 62 → 0 warnings across 8 controller test files — 21 `path` → `_path` unused-param renames + 41 `as any` suppression comment placements (34 insertions + 7 relocations fixing co-located `suppressions/unused`) |
| M-41 | Governance Housekeeping II (2026-08-16, Locked); evidence-packet versioning (per-mission archive `.agents/evidence_packets/<id>.json` + canonical latest-pointer) + Gate-6 SSOT auto-stamps `Current Mission`/`Mission Status` into SYSTEM_CONTEXT.md (pointer had drifted 7 missions stale) |


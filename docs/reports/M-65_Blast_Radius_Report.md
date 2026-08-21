# M-65 Blast Radius Report — TD-014 Server Error Message Sanitization

Date: 2026-08-21 | Verified by direct probe; no assumptions.

## Change Surface
| Layer | Files | Nature |
| :--- | :--- | :--- |
| New | `packages/server/src/utils/safeError.ts` | Pure allowlist sanitizer, 0 outgoing deps |
| Modified | 9 controllers (`auditLogs`, `credits`, `employees`, `expenses`, `gameRates`, `keno`, `sales`, `shifts`, `users`) | catch-fallback bodies only |
| Untouched-by-design | `expenseCategoriesController` | fallbacks already hardcoded literals |
| Tests | 9 suites | leak-pin assertions updated; +1 Red-Green test |

## Structural Containment (verified)
- **Export signatures:** unchanged (`git diff` export-line probe → empty) → controller public API stable.
- **Downstream reach:** 0 references to changed symbols outside `packages/server/src` (grep client/shared → 0).
- **Import graph:** depcruise repo-gate mode exit 0; strict config mode (`.dependency-cruiser.js`): "no dependency violations found (147 modules, 433 dependencies cruised)".
- **New module purity:** targeted cruise of `safeError.ts` → zero outgoing dependencies.
- **Knip:** exit 0 (no orphaned exports; every import used).
- **Importer == caller set:** 9 files identical (diff-proven); tsc excludes call-without-import, knip excludes import-without-use.

## Semantic Correctness (verified)
- **30 sanitized sites** (per-file: auditLogs 1, credits 4, employees 3, expenses 4, gameRates 3, keno 4, sales 3, shifts 2, users 6 — users = 3 shape-A + 3 shape-B fallbacks, all distinct catches).
- **Sentinel inventory cross-check:** 17 unique thrown messages; 16 statically present in allowlist; 17th ("Variance…", dynamic throw at `shiftsController.ts:207`) intercepted by `.includes()` mapping at `:239` → 400 before any fallback; allowlist entry retained as defense-in-depth.
- **Preserved mapping logic:** all 8 remaining `(error as Error).message` uses are comparison/mapping branches (`DUPLICATE_NAME` ×4; users/expenseCategories not-found & root-admin branches). Echo paths remaining: **0** (grep-proven).

## Incident During Review (Rule 27 RCA)
Fresh full-suite rerun exposed 1 failure: `infrastructure.test.ts` WAKE scope-anchor metatest. Root cause: `wake_summary.sh:14` hardcodes `awk '/## 3. Scope & Boundaries/'`; my MISSION.md rewrite had renumbered the section to `## 2.`. Fix: single-line heading restoration. Contract scan found only one other MISSION.md parse anchor (`/## .*Evidence Payload/` — compliant).

## Final Gate State
- vitest: **425/425, 34 files** (post-fix full run)
- server build tsc: 0 | knip: 0 | Biome src: 0 (test-file `noExplicitAny` warnings are pre-existing file-local mock convention)

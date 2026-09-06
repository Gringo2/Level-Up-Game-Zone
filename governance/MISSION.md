# CURRENT MISSION

**Type:** Infra
**Mission:** M-88 Lint Zero-Warning Restoration — Hygiene (firebaseInit unused imports + mock-chain noExplicitAny annotations)
**Status:** Locked

## 1. Objective
Restore the repository's M-40 zero-lint-warning standard by eliminating all 14 `biome lint` warnings. Verified audit (2026-09-05, M-88 pre-work):

- **2 genuine unused imports** in `packages/server/src/__tests__/firebaseInit.test.ts` — `mkdirSync` (node:fs, import-only occurrence) and `beforeEach` (vitest, import-only occurrence). Introduced by the M-87 rewrite of the file (commit `b2fc224`); M-87's "biome touched=0" evidence measured format drift only, so these slipped through.
- **11 `noExplicitAny` on Firestore mock-chain `const X: any =` annotations** across `kenoController.test.ts` (32, 46, 74, 691, 698) and `shiftsController.test.ts` (168, 180, 202, 219, 625, 632). These are the documented mock-fixture convention (M-65: "test-file noExplicitAny warnings are pre-existing convention") but the convention was only applied to `as any` casts, not the `const` annotations — so the warnings accumulated.
- **1 unused function parameter** (`field`) in `kenoController.test.ts:100` — the `where` mock never reads it.

## 3. Scope & Boundaries
- **In Scope:** `firebaseInit.test.ts` (2 import removals); `kenoController.test.ts` (5 biome-ignore annotations + 1 param rename); `shiftsController.test.ts` (6 biome-ignore annotations); governance records (MISSION.md, SYSTEM_CONTEXT.md, TASKS.md ledger).
- **Out of Scope:** any `src` logic, mocked-query behavior, schema/config changes, lint-rule configuration, other warnings or drift found during the sweep. Verification only, no behavior change: 555/555 tests must remain green.

## Design Notes
- The obey-convention comment `// biome-ignore lint/suspicious/noExplicitAny: Mocking firestore objects requires any` is used verbatim from the existing in-file convention (`kenoController.test.ts:28,71,687`).
- The `field` param follows the M-40 unused-param convention: rename to `_field` (underscore prefix), not biome-ignore.
- Blast radius is byte-limited to the two test files plus governance; no runtime artifact changes.

## Testing Strategy (Rule 28)
Red-Green: capture 14 warnings via `npm run lint` pre-fix (RED), confirm 0 warnings post-fix (GREEN). No new tests — behavior entirely unchanged; full 555-suite + coverage-gated vitest run + build + `tsc` ×2 + knip + depcruise as regression gate (identical battery to M-87).

## Evidence Payload (all gates verified 2026-09-05)
- [x] Functional Verification: **555/555 tests** (39 files) | coverage thresholds pass (client 92.13% stmts / 77.03% branch / 95.67% funcs / 93.37% lines) | build exit 0 | `tsc -b` clean ×2
- [x] AVP-001 Architecture Verification: full 6-gate lock suite incl. live-stack E2E (credential present at packages/server/serviceAccountKey.json) — run via lock_mission.sh
- [x] Dependency Graph: knip 0 | depcruise 0 (161 modules / no violations)
- [x] ADR/Compliance: zero behavioral change; annotations follow existing ADR-003/test-fixture convention (M-40/M-65); no new interfaces or dependencies

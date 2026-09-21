# M-91 Blast Radius Report

**Mission:** M-91 History Row Scanability  
**Generated:** 2026-09-21  
**Baseline:** Working tree before M-91 implementation edits  
**Status:** Locked after canonical AVP-001 verification

## 1. Changed-File Manifest

**Client production (5):**
- `packages/client/src/lib/api.ts` — development-only E2E bearer token fallback when the existing E2E user hook is present; Firebase tokens remain required outside Vite dev mode.
- `packages/client/src/contexts/AuthContext.tsx` — removed obsolete TypeScript suppressions now that the E2E user hook is typed.
- `packages/client/src/vite-env.d.ts` — typed the existing E2E user hook as the shared `AppUser` contract.
- `packages/client/src/pages/GameSales.tsx` — reordered sale-row content and isolated actions in a responsive grid.
- `packages/client/src/pages/Keno.tsx` — reordered Keno-row content and isolated actions in a responsive grid.

**Client tests (2):**
- `packages/client/src/__tests__/pages/GameSales.test.tsx` — row-order and action-containment regression.
- `packages/client/src/__tests__/pages/Keno.test.tsx` — row-order and action-containment regression.

**Governance (4):**
- `governance/MISSION.md`
- `governance/SYSTEM_CONTEXT.md`
- `governance/TASKS.md`
- `governance/missions/M-91_HISTORY_ROW_SCANABILITY.md`

**E2E verification (1):**
- `tests/e2e/history_row_responsive.spec.ts` — deterministic 375px/1280px row visibility, overflow, action reachability, and keyboard-focus checks.

No server, shared package, route, schema, API contract, runtime dependency, or permanent Playwright configuration change remains in the M-91 footprint.

## 2. Dependency and Propagation Analysis

- `GameSales` remains mounted at `/games`; `Keno` remains mounted at `/keno`.
- The changed JSX consumes existing `GameSalesLog` and `KenoLog` fields only.
- Existing verification, edit, delete, pagination, filtering, loading, accessible labels, and API handlers remain in place.
- The only production auth change is gated by `import.meta.env.DEV && window.__E2E_USER__`; production builds retain Firebase token enforcement.
- No shared types or backend consumers are affected.
- Test selector coupling is additive through `gamesale-history-row` and `keno-history-row` test IDs.

## 3. Containment Checks

- Focused page/API tests: 3 files, 75/75 passed.
- Canonical unit suite: 39 files, 565/565 passed; coverage thresholds passed.
- Client production build: passed; Vite emitted only the existing chunk-size warning.
- Biome and TypeScript checks: passed.
- Browser viewport gate: 2/2 passed at 375px and 1280px against a fresh client server.
- Canonical E2E suite: 11/11 passed.

## 4. Impact Assessment

**Expected impact:** Presentation-only changes to the Game Sales and Keno history lists.  
**Propagation risk:** Low. The mutation and data-fetch paths are unchanged.  
**Residual risk:** The E2E bearer token is intentionally non-production and only available when both Vite dev mode and the existing E2E user hook are present. The production build retains Firebase token enforcement.

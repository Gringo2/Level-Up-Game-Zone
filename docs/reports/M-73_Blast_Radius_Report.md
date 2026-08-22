# M-73 Blast Radius Report — Category Management → Admin

Date: 2026-08-22

## Change Surface
Expenses.tsx (cut CRUD card/handlers/state; kept dropdown fetch), Admin.tsx (added states/effect/handlers/card + date-fns & icon imports), Admin.test.tsx (7 migrated tests + stub hardening), Expenses.test.tsx (removed migrated tests, added absence probe). Zero API/contract changes.

## Test-Migration Lessons (documented per Rule 26)
1. Sequential `mockResolvedValueOnce` chains break when a new mount-time GET interleaves — indexes shift and payloads cross-wire (caused `rates.map is not a function` crashes). All 8 chains rewritten URL/method-aware.
2. Single shared `mockResolvedValue(Response)` breaks on second consumer (`Body already read`). 6 stubs now return fresh Responses per call.
3. `toHaveBeenCalledTimes(1)` as a "no mutation fired" proxy is brittle; replaced with explicit zero-POST filter preserving the negative-path intent.

## Regression Certification
vitest **458/458 / 34 files** | tsc=0 | knip=0 | depcruise ✔ (148 modules, 443 deps) | Biome touched=0. Reds evidence: 8 failures captured pre-implementation.

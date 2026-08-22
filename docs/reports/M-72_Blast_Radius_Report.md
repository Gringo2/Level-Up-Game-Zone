# M-72 Blast Radius Report — Expenses History Parity

Date: 2026-08-22

## Change Surface
`Expenses.tsx` list render/state + banner; `Expenses.test.tsx`. Zero changes to Keno/GameSales/lib/server.

## Decisions
- Banner value `text-zinc-900` (neutral): expenses are outflow; sign-color pattern reserved for net/income semantics.
- Description kept as truncated inline span; qty×unit fragment preserved verbatim.
- Reset-on-refetch wired at the single fetch site (`setExpenses(data)` → `setHistoryPage(0)`).

## Test Notes
Reds captured pre-implementation (4 failing). One legacy assertion migrated to `getAllByText` — banner now legitimately repeats the amount string; intent (amount visible) preserved.

## Registered Debt
TD-053 — Expenses Verify button lacks in-flight guard (pre-existing; out of scope here).

## Regression Certification
vitest **457/457 / 34 files** | tsc=0 | knip=0 | depcruise ✔ (148 modules, 443 deps) | Biome touched=0.

## Amendment A1 (2026-08-22) — Page Grid Parity
PO flagged the remaining layout mismatch: Expenses kept the pre-M-69 stacked wrappers. Form+history now share the standard `lg:grid-cols-3` grid (form col-1 h-fit, history col-2); Manage Categories stays below. Presentation-only; 31/31 Expenses suite + full battery green.

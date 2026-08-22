# M-68 Blast Radius Report — Entry-Page Hardening (A1/B1/B2/C1/C2)

Date: 2026-08-22 | Verified by direct probe; no assumptions.

## Change Surface (git-verified footprint)
| Layer | Files | Change |
| :--- | :--- | :--- |
| Server schemas | `schemas/index.ts` | +`finiteNumber` helper (preprocess null/""→NaN, isFinite refine); keno create/update `net_profit` adopt it. No other schema touched |
| Client pages | `Keno.tsx`, `GameSales.tsx` | A1 client guard via exported pure `parseNetAmountInput`; B1 date format; B2 summary lines (`data-testid` hooks); C1 `verifyingId`/`deletePending` states + disabled wiring + ConfirmDialog `loading`; C2 catch sites toast `err.message` with fallbacks |
| Tests | `kenoController.test.ts`, `Keno.test.tsx`, `GameSales.test.tsx` | +5 server (3 Red→Green rejects, negative-legal guard, existing PUT-negative reused), +4 client (helper unit table, B1/B2 render, C1 in-flight), 9 toast assertions migrated to surfaced messages |

## Containment Evidence
- Zero endpoint/controller/route changes: `git status` shows only the 7 code/test files + governance/report docs.
- `finiteNumber` referenced solely by CreateKenoSchema/UpdateKenoSchema (grep-proven); sales schemas untouched — their positiveNumber/nonNegativeNumber NaN-refines already reject null→0 via positivity checks.
- `parseNetAmountInput` consumed only by Keno handleSubmit; export added for unit-testability (knip-clean).
- ConfirmDialog reused as-is (`loading` prop existed) — zero shared-component changes.

## Rule-28 Highlights
1. **Server Reds pre-fix:** POST `{net_profit:null}` / `{net_profit:""}` and PUT `{net_profit:null}` each returned 201/200 with coerced 0 before the change — captured, then flipped Green.
2. **Vacuous-test interception:** jsdom sanitizes `<input type=number>` change values ("--1"→""), so an integration "garbage submit blocked" test would have passed vacuously through the empty-string gate. Replaced by table-driven unit tests on the extracted pure helper.
3. **Helper tightening discovered by its own test:** parseFloat("1e-")→1 truncation hole surfaced when the test asserted null; helper moved to Number() full-string semantics, matching server z.coerce behavior exactly.

## Gates (post-format)
vitest **444/444 / 34 files** | tsc -b both = 0 | knip = 0 | depcruise ✔ (147 modules, 439 deps) | Biome all touched = 0.

Out-of-scope residuals remain open in the gap analysis: B3 (From>To guard), B4 (list-loading feedback), B5 (render caps), C3 (range re-check prepend), D1 (aria-labels).

## Review Pass (2026-08-22 — correctness, containment, regression; probe-based)

**Containment re-verified:** 10 paths exact (7 code/test + MISSION/TASKS + 2 reports); zero controller/route changes; `finiteNumber` referenced only by the two keno schemas (grep-proven); `parseNetAmountInput` single consumer; ConfirmDialog reused unmodified.

**Empirical schema matrix (13/13 via transient tsx probe, deleted after):**
- CREATE: undefined ✗ | null ✗ | "" ✗ | "abc" ✗ | "1e-" ✗ | "--1" ✗ | 0 ✓ | -25.5 ✓ | "150" ✓
- UPDATE: absent ✓ | undefined ✓ (**`.optional()` short-circuits before preprocess — reason-only PUTs unaffected**) | null ✗ | -25.5 ✓
- Bonus hardening vs pre-M-68: non-numeric strings ("abc", "1e-", "--1") now rejected server-side too.

**C1 verified at source:** ConfirmDialog `loading` disables both Cancel and Confirm buttons (`disabled={loading}` / `disabled={loading || !reasonValid}`) + label swap — double-confirm impossible during flight.

**C2 completeness sweep:** all 10 fetch-catch sites across both pages now surface messages. Review found one missed site — GameSales default-games banner catch (`"Failed to configure games"`, which also lacked console.error) — fixed in-turn; its pre-existing test migrated to the surfaced message ("fail"), same class as the original 9 migrations. Validation-prompt toasts (reason required, invalid net) intentionally remain fixed strings — client-generated, not server errors.

**Leftover sweeps clean:** zero `parseFloat(netAmount)` in submit path (preview line's display-only `parseFloat(netAmount || "0")` is finite-by-construction); zero bare `"h:mm a"` remaining in Keno.

**Pre-existing debt observed (outside blast radius, not fixed):** `Expenses.test.tsx` carries `noNonNullAssertion` lint findings at HEAD — proven by stdin-checking the committed file version (`git diff HEAD` = 0 lines for that path).

**Regression certification:** full battery fresh run — vitest **444/444 / 34 files** | tsc=0 | knip=0 | depcruise ✔ (147 modules, 439 deps) | Biome all touched files = 0.

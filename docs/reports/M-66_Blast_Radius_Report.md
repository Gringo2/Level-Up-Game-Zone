# M-66 Blast Radius Report — Keno Direct Net Entry

Date: 2026-08-21 | Verified by direct probe; no assumptions.

## Change Surface (git-verified: tree contains exactly this footprint)
| Layer | Files | Change |
| :--- | :--- | :--- |
| Server contract | `schemas/index.ts` | Create/UpdateKenoSchema → net-only + `.strict()` |
| Server controller | `kenoController.ts` | create persists `net_profit` only; updateKeno dead sales/payouts branches removed (M-38 dead-guard precedent) |
| Shared type | `shared/src/index.ts` | `KenoLog.sales/payouts` → optional (intentional interface relaxation, PO-approved) |
| Client pages | `Keno.tsx`, `Reports.tsx` | single Net input; conditional legacy rendering / em-dash cells |
| Tests | 3 suites | payload migration, strict-rejection negatives (POST+PUT), conditional-render coverage |

## Containment Evidence
- **Consumer enumeration:** only `Keno.tsx` + `Reports.tsx` read `.sales`/`.payouts` on keno logs (grep-proven), both guarded (`!= null`); server src has zero remaining readers.
- **Schema usage map:** `CreateKenoSchema`/`UpdateKenoSchema` referenced only by `routes/keno.ts`.
- **Git containment:** HEAD advanced past M-64/M-65 commits during review; uncommitted tree == exactly the 10 M-66 paths.
- **Gates:** vitest 428/428 (34 files) | tsc -b both = 0 | knip = 0 | depcruise config-mode "no violations (147 modules, 433 deps)" exit 0 | Biome all touched = 0.

## Empirical Contract Probes (transient tsx scripts, deleted after run)
- `CreateKenoSchema.safeParse({sales,payouts,net_profit})` → rejected: `Unrecognized key(s): 'sales','payouts'`
- `UpdateKenoSchema.safeParse({sales,editReason})` → rejected: `Unrecognized key(s): 'sales'`
- `CreateKenoSchema.safeParse({net_profit:75})` → accepted `{net_profit:75}`
- `validateBody` middleware verified at source: `safeParse` failure → 400 with first issue message.

## Review Findings Resolved In-Turn
1. Dead legacy branches in `updateKeno` (:96-97 unreachable under strict schema) — removed.
2. Missing PUT-path strict negative test — added (428th).

## Accepted Residuals (documented, not defects)
~~Both residuals resolved 2026-08-21 per PO approval (see Residual Resolution below).~~

## Residual Resolution (PO-approved, same mission)
1. **Converge-on-edit**: `updateKeno` now writes `FieldValue.delete()` sentinels for `sales`/`payouts` on every edit — touched legacy rows converge to the net-only shape; originals remain in `audit_logs.old_value` (pre-mutation snapshot verified at controller source). New test captures the transaction update payload (`toMatchObject` with FieldValue sentinels).
   - RCA during test authoring: convergence test failed only in full-file runs — controller's post-transaction re-read inherited a stale `db.collection` implementation from earlier tests (`vi.clearAllMocks()` clears call history, not implementations). Fixed with a self-contained collection stub; passes both isolated and full-file.
2. **Scoped schema refinement**: `.strict()` replaced by passthrough+superRefine producing explicit `Retired field(s): sales, payouts…` 400 messages; unknown non-retired typos keep the generic `Unrecognized key(s)` wording. Zero cross-route impact (schemas used only by keno routes). Empirical probes re-run post-change; POST/PUT negative tests now assert message content.
   - Probe nuance: issue ordering surfaces base-parse issues first (e.g., short editReason) — rejection unconditional regardless.

Final state: **429/429 tests / 34 files** | tsc=0 | knip=0 | depcruise ✔ (147 modules, 435 deps) | Biome src=0.

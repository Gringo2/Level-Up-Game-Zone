# CURRENT MISSION

**Type:** Security Hardening
**Mission:** M-76 Close TD-026 — Server-Authoritative Sale Totals
**Status:** Locked (2026-08-22)

## 3. Scope & Boundaries
- **In Scope:** server schema + createSale controller + sales/users/validation test files only.

### RCA / Scope Decision
TD-026 cited sales + keno. Keno half is **covered by design**: M-66 made keno net-only (operator-entered machine figure = the source input; no independent server truth exists) and M-68 added finiteNumber guards. Sales half is the real trust hole and is fixed here:
- `CreateSaleSchema.game_id` becomes REQUIRED (`min 1`); `calculated_total` removed from schema (zod strips unknowns → existing clients unaffected).
- Controller fetches the rate doc BEFORE the transaction: missing → 400 `Invalid game`; persists authoritative `rate_applied` (= rate.price_per_unit), `calculated_total` (= price × qty), `game_name` (= rate.game_name). Client-sent totals are ignored.
- Bonus: implements TD-035's FK existence check at creation.

- **In Scope:** server schema + createSale controller + sales/users/validation test files only.

## Out of Scope
Expenses/credits amounts (client-supplied by nature — no independent truth); historic documents; client payload slimming.

## Testing Strategy (Rule 28)
Reds first on salesController.test: tampered total/rate ignored in favor of rate-doc math; invalid game_id → 400; missing game_id → 400 validation. Golden create test upgraded to assert tamper-proofing. All other suites stay green (schema strips unknown keys).

## Amendment A1 (2026-08-22, review finding)
Review probe found the PUT path (`updateSale`) still trusting client `rate_applied`/`calculated_total` and unvalidated `game_id` — a full bypass of the create-side fix. Hardened symmetrically inside transaction: effective rate doc resolved (new or inherited game_id; missing → "Invalid game" mapped to 400 via catch), totals recomputed price×qty (new-or-inherited quantity), client money fields ignored. Tests: golden PUT upgraded with tx-payload capture + post-update read; new negative test for ghost-rate edit. Battery 463→464/464.

## Evidence Payload
- [x] Functional Verification: salesController 21/21 (3 Reds captured first); validation payload synced; full battery 463/463 / 34 files
- [x] AVP-001: tsc=0 | Biome touched-files clean (pre-existing noExplicitAny debt in salesController.test documented via HEAD stdin-probe) | knip=0 | depcruise ✔

# Proposal: ACP-008 GameSales Verification Workflow & Sale unit_type Persistence

## 1. Context and Problem Statement
Two verified contract-level defects remain open (PO-approved closure sweep, 2026-08-24):

- **TD-051 — Trust-model asymmetry:** `KenoLog` carries the full manager-verify flow (`verified` field, `PUT /:id/verify` endpoint, UI badge/guard), while `GameSalesLog` (`packages/shared/src/index.ts:43-53`) carries no `verified` field and no verify endpoint. Sales entries can never be verified.
- **TD-052 — Presentation accuracy:** game rates carry `unit_type` (`"Hour" | "Game"`, `shared/src/index.ts:39`), but sale records do not persist it. Client rows hardcode "{qty} units @ ${rate}" even for hourly games; historical accuracy is unrecoverable after a rate edit.

Both require changes to the Shared Baseline package (`packages/shared/src/index.ts`), which is a frozen interface per AGENTS.md Rule 6 (Interface Freeze). This ACP seeks approval before any code changes.

## 2. Proposed Solution
Additive-only shared-contract extension, mirroring existing precedents:

1. **GameSalesLog += optional `verified?: boolean`** — mirrors `KenoLog.verified`. Optional ⇒ all legacy documents and payloads remain valid (M-66 precedent: `KenoLog.sales/payouts` made optional).
2. **New server endpoint `PUT /api/game-sales/:id/verify`** — transactional read-verify-write + audit-log write, byte-mirroring the keno pattern (`kenoController.verifyKeno`, routes gated `requireRole([MANAGER, ADMIN])`). Route file `routes/sales.ts` gains the mounted route.
3. **GameSalesLog += optional `unit_type?: string`** — persisted server-authoritatively at create/update time from the resolved rate document (createSale already fetches the rate pre-transaction per M-76; updateSale resolves effective rate per M-76 Amendment A1). Client-supplied `unit_type` is ignored/tamper-proofed exactly like `calculated_total` was in M-76.
4. **Client display:** GameSales rows render "{qty} {unit_type} @ ${rate} = ${total}" when `unit_type` exists; legacy rows fall back to current "{qty} units @ ${rate}". Verify button/badge/guard mirror Keno.tsx (`verifyingId` state pattern).

## 3. Alternative Options
- **Separate `verified_at`/`verified_by` fields:** richer audit trail, but Keno precedent stores only boolean; parity keeps the model uniform. Audit log already records who verified.
- **Persist full rate snapshot instead of `unit_type`:** over-engineering; only display string needs unit_type, and M-76 already snapshots price/name.
- **Client-side derivation of unit_type by joining rates at render:** rejected — rates are mutable; joins break historical accuracy (the exact defect being fixed).

## 4. Consequences
- **Easier:** symmetric trust model across both revenue logs; accurate units on sales history; legacy data unaffected (both fields optional).
- **Harder:** two more optional fields consumers must null-guard (display-layer only); one more manager-gated mutation endpoint to keep sanitized (M-65 safeError applies automatically).
- **Compatibility:** strictly additive; no payload rejection changes except that client-sent `unit_type` on create/update is stripped/ignored server-side (consistent with M-76 tamper-proofing).

## 5. Affected Documents
- `governance/proposals/ACP-008_*.md` (this proposal)
- `governance/MISSION.md` (M-86 references this ACP)
- `governance/TASKS.md`, `governance/DEBT.md` (TD-051/TD-052 closure rows)
- `docs/reports/M-86_Blast_Radius_Report.md` (Rule 26)

## 6. Action Items
- [ ] PO approval of this ACP
- [ ] Implement shared type additions (Phase B of Mission M-86)
- [ ] Server: verifyKeno-mirroring `verifyGameSale` + route mount; persist `unit_type` from resolved rate in create/update transactions
- [ ] Client: GameSales verify UI (verifyingId guard) + unit-aware row rendering with legacy fallback
- [ ] Red-Green tests per AGENTS.md Rule 28 (incl. staff→403 negative, tampered unit_type negative)
- [ ] Close TD-051/TD-052 in DEBT.md with evidence

**Status:** Approved by PO 2026-08-24 — Implemented in M-86 (review pass added the M-66-precedent audit-sentinel scrub under §2.4's tamper-proofing clause; Red-Green proven)

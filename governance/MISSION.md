# CURRENT MISSION

**Type:** Feature
**Mission:** M-66 Keno Direct Net Entry — Drop Sales/Payouts Inputs
**Status:** Locked

## 1. Objective
Simplify keno logging: operators enter a single Net amount directly instead of Total Sales + Total Payouts (client-side subtraction removed). Product Owner decisions recorded 2026-08-21: historical entries remain visible conditionally; API contract becomes net-only strict (payloads containing `sales`/`payouts` are rejected).

## 3. Scope & Boundaries
- **In Scope:**
  - `Keno.tsx`: single Net input replaces Sales/Payouts pair; edit prefill from `net_profit`; conditional history-row rendering
  - `Reports.tsx`: keno table cells render stored values when present, em-dash otherwise (columns retained for mixed-era data)
  - Server `CreateKenoSchema`/`UpdateKenoSchema`: net-only + `.strict()` rejection of `sales`/`payouts` keys
  - `createKeno` controller: persist `net_profit` only
  - Shared `KenoLog`: `sales`/`payouts` become optional
  - Test updates: server keno suite payloads + negative strict test; client Keno form rewrite; Reports fixture variant without sales/payouts
  - Residual resolution (PO-approved 2026-08-21): converge-on-edit (updateKeno deletes stored sales/payouts via FieldValue; originals persist in audit old_value) + scoped schema refinement (retired-field messaging via passthrough+superRefine)
- **Out of Scope:** DB migration of historical rows; Dashboard (aggregates `net_profit` only); verify flow; GameSales page.

## 4. Referenced Architecture
ADR-001 (Express Backend composition root): validation stays server-side; Thin Client sends user-entered net verbatim. No new dependencies.

## Design Decisions (PO-approved)
1. **Conditional display** over hide-everywhere: preserves auditability of pre-migration rows.
2. **Net-only strict** over optional fields: `.strict()` Zod objects yield 400 on legacy-shaped payloads, making the contract explicit rather than silently stripped.
3. Edit path keeps absent-field preservation (`if (!== undefined)`): editing an old row updates `net_profit` while its stored sales/payouts remain untouched in DB.

## Evidence Payload
- [x] Functional Verification: 429/429 unit tests across 34 files green (425 → 429: Keno conditional-render, Reports net-only row, POST+PUT strict-rejection with "Retired field" message assertion, converge-on-edit payload assertion); empirically probed: legacy payloads → "Retired field(s): sales, payouts…" / unknown typos → generic unrecognized-key / clean create parses; server keno suite 23/23; client Keno 16/16; Reports 8/8.
- [x] Architectural Verification (AVP-001): tsc -b both packages exit 0; knip exit 0; depcruise config-mode "no dependency violations (147 modules, 433 dependencies)"; Biome all touched files exit 0. Blast radius git-verified: uncommitted tree == exactly the 10 mission paths. Full report: docs/reports/M-66_Blast_Radius_Report.md.
- [x] ADR Compliance: ADR-001 upheld — server-boundary validation change, client form simplification.
- [ ] Playwright E2E: not executed unless requested

## Test-Negative Protocol (Rule 28)
Red-Green evidence: natural Red state captured after implementation landed but before test migration (7 server + client form failures against legacy payloads) proves the updated suite discriminates old vs new contract. Strict-rejection negative test asserts 400 on `{sales, payouts, net_profit}` POST.

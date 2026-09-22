# ADR-008: Non-Blocking Shifts and Backdated Data Entry

## Context

The shift system previously enforced a hard blocking gate (`MissedDataBlocker`) that prevented data entry when no shift was open for the current day. This created workflow disruption and made backdated entry impossible — all records were stamped with submission time rather than business date.

## Decision

1. **Shift system is non-blocking.** The `MissedDataBlocker` component and `POST /resolve-missed` endpoint are removed. All shift infrastructure (open/close/reconciliation, Safe Slip) remains intact; shift auto-open was later promoted to a dedicated `POST /api/shifts/auto-open` endpoint per ACP-011 / M-99.

2. **Financial forms accept backdated entries.** All 4 create schemas (`CreateSaleSchema`, `CreateKenoSchema`, `CreateExpenseSchema`, `CreateCreditSchema`) accept an optional `date` field. Backend handlers use `body.date || new Date().toISOString()` for the record timestamp. Frontend forms include a date picker defaulting to today.

3. **Shift tracking remains operational.** `GET /missed` is **read-only** — it reports missed shifts and gap dates but performs no write operations (the auto-open side-effect was removed per ACP-011). Programmatic shift creation is handled by a dedicated `POST /api/shifts/auto-open` endpoint. The shift open/close/reconciliation workflow is otherwise unchanged.

## Consequences

- **Positive:** Users can enter data for any day without workflow interruption. Business date is accurately recorded.
- **Negative:** No system enforcement that shifts are opened daily. Operational discipline becomes a management concern.
- **Neutral:** The audit log reflects the user-selected business date, not submission time. This is the correct semantic for financial records.

## References

- ACP-006: Shift Non-Blocking + Backdated Data Entry
- M-50: Implementation mission

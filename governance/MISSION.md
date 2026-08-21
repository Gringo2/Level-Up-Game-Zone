# CURRENT MISSION

**Type:** Debt Resolution (Security Hardening)
**Mission:** M-65 Resolve TD-014 — Server Error Message Sanitization
**Status:** Locked

## 1. Objective
Eliminate client-facing leakage of internal error details. Controller catch blocks echoed `(error as Error).message` verbatim, exposing Firestore collection names, query structure, and internal exception text (TD-014, HIGH information disclosure).

## 3. Scope & Boundaries
- **In Scope:**
  - New `packages/server/src/utils/safeError.ts`: allowlist sanitizer (`safeErrorMessage`)
  - Convert controller catch-fallback echoes to `safeErrorMessage(error)` (30 sites, 10 controllers)
  - Update leak-pinned test assertions ("DB crashed" pins → generic response)
  - +1 Red-Green-proven test asserting internal details are NOT leaked
- **Out of Scope:** Intentional sentinel mappings (DUPLICATE_NAME, not-found, forbidden branches) — preserved unchanged; CORS/rate-limiting/headers (TD-010/011/012); client-side error handling.

## 3. Referenced Architecture
ADR-001 (Express Backend as composition root) — sanitization belongs at the server boundary; Thin Client untouched. No new dependencies (Rule 25: build-vs-buy N/A — 20-line pure function).

## Design Decision
Allowlist, not blocklist: only messages intentionally thrown as client-facing sentinels (e.g., "Shift not found", "Sale not found") pass through; everything else collapses to `"Internal server error"`. Rationale: new internal error types are safe by default; a blocklist would leak by default. Full allowlist enumerated in `safeError.ts`.

## Evidence Payload
- [x] Functional Verification: 425/425 unit tests across 34 files green (was 424; +1 Red-Green-proven test — failed against leak behavior, passes after fix); 0 echo paths remain (`grep 'error: (error as Error)\|error: message ||'` → 0); 30 `safeErrorMessage` call sites verified.
- [x] Architectural Verification (AVP-001): knip exit 0 (new util owned + used), depcruise exit 0 (no new dependency cycles; controllers → utils is a legal downward edge), server `tsc --noEmit` exit 0.
- [x] ADR Compliance: ADR-001 upheld — single server-boundary change, zero client/API-contract changes.
- [ ] Playwright E2E: not executed — behavior covered by integration-level controller tests with mocked DB rejections.

## Test-Negative Protocol (Rule 28)
Red proven before Green: new "does not leak internal error details to clients" test failed against pre-fix code (received raw Firestore permission-denied text containing `projects/secret`), then passed post-fix.

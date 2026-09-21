# CURRENT MISSION

**Type:** Debt
**Mission:** M-89 Game Sales Input Validation Hardening
**Status:** Locked

## 1. Objective
Harden the Game Sales entry flow so invalid numeric input is rejected before submission, matching the stronger validation pattern already used in Keno and preventing malformed values from reaching the API or producing false transaction totals.

## 2. Scope & Boundaries
- **In Scope:**
  - Validate `quantity_sold` input in `packages/client/src/pages/GameSales.tsx`
  - Add regression coverage in `packages/client/src/__tests__/pages/GameSales.test.tsx`
  - Keep the change limited to the Game Sales entry UX and its tests
- **Out of Scope:**
  - Broad redesign of the sales page
  - Unrelated UX cleanup elsewhere in the app
  - New server contract changes beyond the existing client-side validation pattern already enforced by the server schema

## 3. Design Notes
- Verified root cause: Game Sales accepted raw string input without a finite positive-number guard, while Keno already rejects malformed numeric input before submit.
- The fix uses a shared parser and numeric coercion only at the client entry layer.
- Blast radius is intentionally limited to the Game Sales page and its page test.

## 4. Testing Strategy
- Unit tests: parser rejects empty, NaN-like, zero, and negative values while allowing valid decimals
- Regression tests: Game Sales POST/PUT payloads use numeric values and no malformed strings reach the API
- Validation criterion: targeted Game Sales test suite passes after the fix

## 5. Evidence Payload
- [x] Functional Verification: `npx vitest run packages/client/src/__tests__/pages/GameSales.test.tsx` → 1 file passed, 30/30 tests passed
- [x] Architectural Verification (AVP-001): fix remains contained to the sales entry flow and its tests; no route or shared contract expansion
- [x] Dependency Graph Clean: no new dependency added
- [x] ADR Compliance: aligned with the existing UI/UX gap report and Keno precedent; no interface expansion
- [ ] User Approval

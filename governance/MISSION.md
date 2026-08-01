# Active Mission: Phase 5 Functional Testing Constitution

## 1. Mission Context
**Status:** Locked
**Type:** Hardening / Quality Assurance
**Phase:** Specification & Implementation
**Primary Owner:** AI Implementor

## 2. Objective
Establish a rigorous, non-tautological testing suite validating the core business logic and zero-trust invariants of the Level-Up Game Zone application, strictly adhering to **Rule 11 (Testing Constitution)** and **Rule 28 (Test-Negative Validation Protocol)**.

## 3. Scope & Boundaries
- **In Scope:**
  - Unit testing Express backend controllers (`usersController`, `shiftsController`).
  - Unit testing React Contexts (`AuthContext`, `ShiftContext`).
  - End-to-End (E2E) Playwright testing for the "Shift Management" and "Authentication" flows.
- **Out of Scope:**
  - Refactoring UI components or backend database architecture unless a test empirically proves a critical failure.

## 4. Testing Constitution (Rule 11)
Before implementation, the following strategy is enforced:
1. **Unit Tests (Backend):** Validate that API controllers enforce role-based access control and reject invalid payloads (Negative Testing).
2. **Unit Tests (Frontend):** Validate that `AuthContext` correctly synchronizes with the `firebase-admin` token states, and `ShiftContext` correctly calculates variance.
3. **Integration / E2E Tests:** Use Playwright to simulate a full manager login -> Open Shift -> Log Game Sale -> Close Shift with variance workflow.
4. **Validation Criteria:** Tests must fail (Red) when subjected to invalid state before passing (Green). Zero tautological tests allowed.
5. **Success Metrics:** Minimum 80% coverage on core contexts and transactional controllers.

## 5. Execution Gates
- [x] Specification Approved
- [x] Backend Unit Tests Implemented
- [x] Frontend Context Tests Implemented
- [x] Playwright E2E Flows Implemented
- [x] Test-Negative Validation Verified
- [x] Mission Lock

## Evidence Payload
- `vitest` unit tests passed for negative validation logic in `usersController`, `shiftsController`, `AuthContext`, and `ShiftContext`.
- `playwright` E2E structural tests verify fail-closed routing isolation across the client router.
- `tsc -b` and infrastructure metatests verified structural integrity.

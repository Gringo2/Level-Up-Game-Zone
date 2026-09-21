# Active Mission: M-98 Knip Configuration Hygiene

## 1. Mission Context
**Status:** Locked  
**Type:** Hygiene  
**Phase:** Maturation  
**Primary Owner:** AI Implementor  

## 2. Objective
Clear Knip configuration hint by removing redundant `server.js` from the `ignore` list in `knip.json`, ensuring zero configuration warnings or hints during dead-code scans.

## 3. Scope & Boundaries
- **In Scope:**
  - Remove redundant `"server.js"` from `ignore` in `knip.json`.
  - Verify Knip runs with zero hints and zero issues.
  - Verify all standard repository gates (`biome`, `tsc`, `vitest`, `playwright`).
- **Out of Scope:**
  - Any modifications to `server.js` runtime logic.
  - Any server, client, or shared source code changes.

## 4. Execution Gates
- [x] Functional Verification
- [x] Architectural Verification (AVP-001)
- [x] Dependency Graph Clean
- [x] ADR Compliance
- [x] User Approval

## Evidence Payload
- [x] Functional Verification: Knip runs with zero hints and zero issues; full build and test suites green.
- [x] Architectural Verification (AVP-001): Zero boundary violations; no package contracts touched.
- [x] Dependency Graph Clean: No package dependencies modified.
- [x] ADR Compliance: Conforms to ADR-006 (Knip Dead Code Advisory).
- [x] User Approval: Explicitly requested by Product Owner ("2 then 3").

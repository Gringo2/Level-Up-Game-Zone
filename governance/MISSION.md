# CURRENT MISSION

**Type:** Hygiene
**Mission:** M-98 Knip Configuration Hygiene
**Status:** Locked

## 1. Objective
Clear Knip configuration hint by removing `server.js` from the `ignore` list in `knip.json`, ensuring zero configuration warnings or hints during dead-code scans.

## 3. Scope & Boundaries
- **In Scope:**
  - Remove redundant `"server.js"` from `ignore` in `knip.json`.
  - Verify Knip runs with zero hints and zero issues.
  - Verify all standard repository gates (`biome`, `tsc`, `vitest`, `playwright`).
- **Out of Scope:**
  - Any modifications to `server.js` runtime logic.
  - Any server, client, or shared source code changes.

## 4. Design Notes
- Knip traverses workspace project files and flags redundant entries in `ignore` when they are not matched or needed. Removing `server.js` from `ignore` satisfies Knip's configuration validator without introducing any dead code or unused file warnings.
- Blast radius: strictly limited to root `knip.json`.

## 5. Testing Strategy
- Execute `npx knip` to verify zero configuration hints and zero issues found.
- Execute full AVP-001 verification suite via `lock_mission.sh M-98`.

## 6. Evidence Payload
- [x] Functional Verification: Knip runs with zero hints and zero issues; full build and test suites green.
- [x] Architectural Verification (AVP-001): Zero boundary violations; no package contracts touched.
- [x] Dependency Graph Clean: No package dependencies modified.
- [x] ADR Compliance: Conforms to ADR-006 (Knip Dead Code Advisory).
- [x] User Approval: Explicitly requested by Product Owner ("2 then 3").


# CURRENT MISSION

**Type:** Infrastructure  
**Mission:** M-134 Real Integration Test Layer  
**Status:** Locked
**Proposal:** ACP-042 (PO-approved 2026-10-09)  

## 1. Objective
Resolve TD-060: add a permanent, governed integration test layer that runs the real Express app with the real `firebase-admin` SDK against the Firebase Emulator Suite (Firestore + Auth), plus real-UI browser flows against that real server. It must catch defects of the TD-063 (shift window versus entry dates), TD-064 (undefined Firestore values) and TD-065 (host timezone) kind.

## 2. Context & Root Cause
Server tests mock `firebase.js`; Playwright specs mock `**/api/**`. See ACP-042 §1 and `docs/reports/Daily_Monthly_Operations_Semantic_Trace_2026-10-08.md`.

## 3. Scope & Boundaries
- **In Scope:**
  - `firebase.json` emulator configuration; `firebase-tools` pinned in the test script and run through `npx` (not a package.json dependency, per the PO decision).
  - Integration vitest config, `npm run test:integration`, `.int.test.ts` suites (server integration) and an integration Playwright config with real-UI flows.
  - Exclude `.int.test.ts` from the default test run.
  - README and release-checklist documentation.
- **Out of Scope:**
  - Any application behaviour change.
  - Adding the layer to the pre-commit hook or the mission lock gates (later Governance mission).
  - Composite-index validation (separate concern; see ACP-042 §2A).
  - Mutating git commands (Rule 1).

## 4. Testing Strategy
- **Spike first:** run one flow end to end on the emulators before building more (done; see Gates).
- **Server integration:** supertest on the real app: daily cycle, credit without reason, forgotten-shift close, month data and payroll by deduction date, membership gate with real emulator tokens.
- **Real UI:** Playwright against real server and emulator: day cycle on the Dashboard, blank-reason credit, manager and staff role views, missed-shift resolve.
- **Red-Green:** each flow must fail when its defect is re-introduced (TD-063 window, undefined credit reason, host-timezone shift day), then pass after restoring.
- **Safety:** the suite aborts unless emulator variables are set and the project id starts with `demo-`.
- **Success metric:** `npm run test:integration` passes on a clean checkout with Java available; the three re-introduced defects each make it fail.

## 5. Execution & Verification Gates
- [x] Spike evidence: `firebase-tools` 15.33.0 refuses Java 17 (docs page out of date), so the PO installed JDK 21; on Java 21 the real app + real SDK + emulators passed the probe (real SDK rejects `undefined`, real tokens gate membership, credit without a reason saves). Also shown: emulator tokens verify under a pinned clock earlier than real time; the emulator ran a multi-field query without an index.
- [x] Red-Green Test Verification: 6 defects re-introduced one at a time against the server suites (TD-063, 064, 065, 066, 067, 068) and 5 against the browser flows (TD-063, 064, 066, 059 x2): every one caught, sources restored. The first browser run MISSED TD-063 because it depended on the hour (it only shows after 03:00 shop time); fixed by pinning the clock on both server and browser, then re-proven.
- [x] Monorepo Fitness Gates: Biome (198 files, 0 errors, 0 warnings), `tsc -b` exit 0, Knip clean, default Vitest 850/850 (unchanged), Playwright E2E 26/26, `npm run test:integration` 22 server tests + 5 browser flows passing, build exit 0.

## 6. Evidence Payload
- [x] Functional Verification: `npm run test:integration` passes on a clean run (22 + 5); the layer detects each re-introduced defect; the default `npx vitest run` is unaffected (`.int.test.ts` excluded).
- [x] Architectural Verification (AVP-001): no application code changed. Safety: suites refuse to run without emulator variables and a `demo-` project, use a throwaway key, blank the named database and credential variables, and the browser config starts nothing and refuses when the emulators are absent.
- [x] Dependency Graph Clean: dependency-cruiser 0 violations; no new package dependency (firebase-tools runs through a pinned `npx`; `package.json` gained scripts only; `npm audit` unchanged at the pre-existing 17, TD-070).
- [x] ADR Compliance: ADR-006 (Red-Green, no vacuous tests), ADR-004 (blast radius, traceability), ACP-007 (time determinism, enforced by pinned clocks), ACP-042.
- [x] Traceability: TD-060 → ACP-042 → M-134 → `docs/reports/M-134_Blast_Radius_Report.md` → `governance/missions/M-134_REAL_INTEGRATION_TEST_LAYER.md`.

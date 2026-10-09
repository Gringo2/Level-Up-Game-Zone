# Active Mission: M-134 Real Integration Test Layer

## 1. Mission Context
**Status:** Active  
**Type:** Infrastructure  
**Phase:** Verification  
**Primary Owner:** AI Implementor  
**Governing Proposal:** ACP-042 (`governance/proposals/ACP-042_Real_Integration_Test_Layer.md`), PO-approved 2026-10-09  
**Evidence:** `docs/reports/M-134_Blast_Radius_Report.md`

## 2. Objective
Resolve TD-060: a governed layer that runs the real Express app with the real `firebase-admin` SDK on the Firebase emulators, plus real-UI flows, so defects like TD-063, TD-064 and TD-065 cannot reach release unnoticed.

## 3. Implementation
- `npm run test:integration` (pre-step builds shared and server): `firebase-tools@15.33.0` through `npx` starts the Firestore and Auth emulators and runs `vitest run --config vitest.integration.config.ts` then `playwright test --config playwright.integration.config.ts`, with `TZ=UTC`.
- Server suites (`packages/server/src/__tests__/integration/`): daily cycle, credits, shifts and missed shifts, month data and payroll, membership with real tokens (22 tests). Pinned clocks; demo-project guard.
- Browser flows (`tests/integration/`): day cycle, role views, missed shift (5 flows). Server and browser clocks pinned to 2026-10-08T07:00Z.
- `firebase.json` emulator ports; README section; default `vitest` run excludes `*.int.test.ts`.

## 4. Verification
Red-Green: 6 defects against the server suites and 5 against the browser flows, all caught after pinning the browser clock (one initial miss recorded). Gates: Biome 0/0, tsc 0, Knip clean, Vitest 850/850, Playwright 26/26, integration 22 + 5, build 0, dependency-cruiser 0, audit unchanged.

## 5. Follow-ups (out of scope)
- Adding the layer to the mission lock gates (Governance mission).
- Composite-index validation against `firestore.indexes.json`.
- TD-070 (npm audit triage), TD-061, TD-062.

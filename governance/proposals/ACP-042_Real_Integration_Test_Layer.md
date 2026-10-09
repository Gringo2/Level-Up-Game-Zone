# Proposal: ACP-042 Real Integration Test Layer

**Status:** Approved (Product Owner, 2026-10-09) — implemented by M-134
**Debt Reference:** TD-060
**Evidence:** `docs/reports/Daily_Monthly_Operations_Semantic_Trace_2026-10-08.md`, `docs/reports/M-133_Blast_Radius_Report.md`

## 1. Context and Problem Statement
Every server test mocks `firebase.js`, and all Playwright specs replace `**/api/**` with in-memory fakes. Nothing runs the real Express controllers against a Firestore-shaped store with the real `firebase-admin` SDK. That gap let three defect classes through to production:
- **TD-063:** the shift window versus entry dates (the E2E fake computed expected cash itself).
- **TD-064:** the SDK rejecting `undefined` values (a mock accepts anything).
- **TD-065:** host-timezone logic (mocks never exercise real queries).

The 2026-10-08 trace found them only because a transient in-memory harness (a loader hook replacing `firebase.js`, kept in the gitignored `.agents/.scratch/m132-trace/`) ran the real server code and the real UI. This proposal makes that capability permanent and governed.

## 2. Options (recommendation only, per AGENTS.md Rule 25)

### A. Firebase Emulator Suite (buy; recommended)
- Devdependency `firebase-tools` (current 15.33.0 on npm; Node ≥ 20). Official Firestore and Auth emulators; the real `firebase-admin` SDK talks to them through `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST`.
- Evidence (corrected by the M-134 spike, 2026-10-09): Google's installation page still says "JDK 11 or higher", but that page is out of date. `firebase-tools` 15.33.0 refuses to start on Java 17 ("no longer supports Java version before 21"). The Firebase CLI release notes confirm Java below 21 was deprecated in 14.19.0 and dropped in 15.0.0. This machine has JDK 17; `openjdk-21-jdk-headless` is available from apt but installing it needs `sudo`. The original draft of this ACP cited the page and was wrong on this point.
- Strengths: real SDK validation (catches the `undefined` class), real transactions and ordering, real token verification path with the Auth emulator, maintained by Google, no custom fidelity to maintain.
- Weaknesses: needs Java and the firebase-tools download on every developer or CI machine (size and startup time not measured yet); the M-134 spike ran a multi-field query (`status ==`, `date >=`, `orderBy date`) with no index defined, so missing indexes are not reliably caught and a separate check of `firestore.indexes.json` against the query shapes would still be needed (not part of this mission).

### B. Promote the in-memory fake (build)
- Turn the transient harness into `packages/server/test-support/` with a governed fake.
- Strengths: no dependency, no Java, instant, already proven in this repo (it reproduced every defect).
- Weaknesses: we own its fidelity; it mirrors only the SDK rules we remembered to model, so it can pass things the real SDK rejects. It does not exercise real token verification.

### C. Hybrid
- A for a small authoritative contract suite; B kept as the fast local harness for exploration. Highest maintenance.

## 3. Decisions requested from the Product Owner
1. **Option:** A (recommended), B or C.
2. **Scope of the first mission:**
   - *Server integration only (recommended):* supertest against the real Express app and the emulator, covering the daily cycle (open shift, entries, expected cash, close), a credit without a reason, a forgotten-shift close, a month of entries with Reports data, payroll by deduction date, and the membership gate.
   - *Plus real-UI Playwright against the real server:* adds a few browser flows; larger and slower.
3. **Where it runs:** a separate `npm run test:integration` that is not part of the pre-commit hook (needs Java, slower), run before deployments and noted in the release checklist. Adding it to the mission lock gates would be a later Governance mission (it edits `.agents/*`).

### Decisions recorded (PO, 2026-10-09)
1. **Option A:** Firebase Emulator Suite.
2. **Mechanism (PO, 2026-10-09, after the spike):** `firebase-tools` is run on demand through `npx` with a pinned version in the test script. It is **not** added to `package.json`, because the cPanel host installs the repo's dev dependencies and adding it would grow that install by about 210 MB and the `npm audit` count from 17 to 26 findings (7 high, 2 moderate more, all in the tool's own tree).
3. **Scope:** server integration **plus real-UI browser flows** against the real server and emulator.
4. **Java:** the PO installs JDK 21 on the development machine (`sudo apt install openjdk-21-jdk-headless`), which the current tool requires.
5. **Placement:** a separate `npm run test:integration` (not in the pre-commit hook), per the recommendation in §3.3.

### Design notes
- The application code runs unmodified. The tests give `firebase.ts` a throwaway service-account key (generated at run time) and a `demo-` project id, and point the SDK at the emulators with `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST`.
- Safety guard: the suite refuses to start unless the emulator host variables are set and the project id starts with `demo-`, so it can never reach a real project.
- Browser flows keep the `__E2E_USER__` session hook; the dev test token is replaced in flight by a real Auth-emulator ID token, so the server's real token verification is exercised.
- Integration test files use the suffix `.int.test.ts` and are excluded from the default `vitest` run.

## 4. Proposed Action Items
1. Mission M-134 (Type: Infrastructure if scripts or config under `.agents/` change; otherwise Test Infrastructure).
2. Spike: install the chosen tool, confirm JDK 17 works, run one flow end to end. Report evidence before building more.
3. Build the suite per the approved scope with Red-Green proof (each flow must fail against a re-introduced defect: the TD-063 window, `undefined` credit reason, host-timezone shift day).
4. Add `test:integration` and document it in the README and release checklist.
5. Verify gates, write the blast-radius report, lock.

## 5. Consequences
- **Easier:** defects of the TD-063/064/065 kind are caught before release; confidence in the real SDK behaviour.
- **Harder:** one more tool or fixture to maintain (Option A: Java plus a CLI; Option B: fidelity of our own fake).
- No application behaviour changes.

## 6. Affected Documents
`package.json` (script and, for A, a devDependency), `packages/server/src/__tests__/integration/*` (new), `README.md`, `governance/RELEASE_READINESS.md`, `governance/DEBT.md` (TD-060 → Resolved).

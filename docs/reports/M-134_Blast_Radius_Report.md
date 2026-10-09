# M-134 Blast Radius Report: Real Integration Test Layer

**Mission:** M-134
**Proposal:** ACP-042
**Date:** October 9, 2026
**Auditor:** AI Implementor

---

## 1. Executive Summary
Adds `npm run test:integration`: the real Express app and the real `firebase-admin` SDK against the Firebase Firestore and Auth emulators (22 server tests), plus 5 real-UI Playwright flows against the real server. **No application code changed.** Resolves TD-060.

---

## 2. Structural Blast Radius
| Area | Change |
|---|---|
| Application source (`packages/*/src` excluding tests) | none |
| Default test run | `vitest.config.ts` excludes `**/*.int.test.ts`; still 850/850 |
| `package.json` | two scripts (`pretest:integration`, `test:integration`); **no dependency added** |
| `firebase.json` | emulator block (Firestore 8085, Auth 9099, UI off) |
| `knip.json` | integration files ignored as config-referenced; Playwright plugin limited to the default config |
| New files | `vitest.integration.config.ts`, `playwright.integration.config.ts`, 5 `*.int.test.ts` + `harness.ts`, `tests/integration/{support,clock,fixed-clock.cjs,refuse-without-emulator}` and 3 specs, README section |
| dependency-cruiser | 0 violations (169 modules, 563 dependencies) |

### 2.1 Decisions applied (PO)
- Firebase Emulator Suite; server integration plus real-UI flows; separate command, not in pre-commit.
- `firebase-tools@15.33.0` runs through `npx`, not as a dependency, because the cPanel host installs the repo's dev dependencies. Measured: adding it would have grown `node_modules` from 753 MB to 966 MB and `npm audit` from 17 to 26 findings (7 high, 2 moderate more).
- The PO installed JDK 21 (`firebase-tools` 15 refuses Java 17).

### 2.2 Safety design
- Server suites and the browser config refuse to run unless `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` are set and the project id starts with `demo-`. Without the emulators the browser config starts no servers and its global setup refuses.
- A throwaway RSA key is generated per run. `FIRESTORE_DATABASE_ID`, `GOOGLE_APPLICATION_CREDENTIALS` and `SERVICE_ACCOUNT_KEY_PATH` are set to empty strings so dotenv cannot load the named production database or real credentials (the spike showed the server does read a named database from `.env`).
- The client dev server gets `VITE_API_URL` overridden (`.env.local` points at production). Own ports: server 4011, client 3012.

---

## 3. Test Quality Evidence
**Spike findings:** `firebase-tools` 15.33.0 requires Java 21 (Google's docs say 11+: out of date); on Java 21 the real SDK rejected `undefined`, real emulator tokens gated membership, a credit without a reason saved; the emulator ran a multi-field query without an index (so index gaps are not reliably caught); emulator ID tokens verify under a pinned clock earlier than real time and fail once more than an hour past issue.

**Red-Green (ADR-006), by re-introducing each defect and restoring it:**
| Defect | Server suites | Browser flows |
|---|---|---|
| TD-063 midnight-stamped entries | caught (3 failures) | caught |
| TD-064 undefined credit reason | caught (5) | caught |
| TD-065 host-timezone shift days (run under `TZ=UTC`) | caught (1) | n/a |
| TD-066 unbounded missed-shift totals | caught (1) | caught |
| TD-067 deductions by issue date | caught (1) | n/a |
| TD-068 sale edit re-prices | caught (1) | n/a |
| TD-059 admin cards / default-games button shown to everyone | n/a | caught (2) |

**Error traceability (Rule 26):** the first browser run **missed** TD-063. Root cause: the real clock was between 00:00 and 03:00 shop time, where that defect does not show, so the day-cycle test depended on the hour (an ACP-007 violation). Fix: pin the clock on both sides (a `node --require` preload for the server, Playwright's clock for the browser), then re-prove. Two other test mistakes were found and fixed during the build: a pinned time later than the real clock expired the emulator token (documented in the harness), and an import path typo in the spike probe.

**Determinism:** all time-dependent tests pin time. The suite runs with `TZ=UTC` on purpose.

**Known limits:** does not catch missing Firestore composite indexes; the browser flows use the dev session hook plus a real emulator token swapped in (the Google sign-in screen is not exercised); `__E2E_USER__` remains a dev-only session shortcut (TD-062).

---

## 4. Gate Results
| Gate | Result |
|---|---|
| Biome `check .` | 198 files, 0 errors, 0 warnings |
| `tsc -b` | exit 0 |
| Vitest `--coverage` (default run) | 48 files, **850/850** (unchanged) |
| Playwright E2E (default config) | **26/26** |
| `npm run test:integration` | **22 server + 5 browser flows passed** |
| Knip | clean |
| `npm run build` | exit 0 |
| dependency-cruiser | 0 violations |
| `npm audit` | 17 findings, same as before M-134 (TD-070) |

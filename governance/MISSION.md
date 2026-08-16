# CURRENT MISSION

**Type:** Infrastructure
**Mission:** M-47 App & UserManagement Unit Coverage
**Status:** Locked

## 1. Objective
Cover the two remaining 0%-coverage client files to raise the components threshold:
1. **Write `App.test.tsx`** in `packages/client/src/__tests__/` — covers `App.tsx` (composition root, role-based routing, loading/auth states).
2. **Write `UserManagement.test.tsx`** in `packages/client/src/__tests__/components/` — covers `UserManagement.tsx` (CRUD: invite, role update, delete, loading/error states).
3. **Raise the components threshold** from 30/30 to an empirically measured value.
4. **Red-proof the gate** (Rule 28): excluding the new suites must trip the components threshold.

## 2. Evidence Payload
- [x] Functional — 2 new suites (18 tests) green; 329 total; components coverage 84.96% stmts / 92.59% funcs; threshold raised from 30/30 to 80/90; Red-proofed (M-47 suites excluded → lines 46.3% < 80%, functions 52.77% < 90%).
- [x] Architectural — zero production-source change; test-only + vitest config; no new dependencies.
- [x] Dependency Graph Clean — no new imports or dependency changes; test-only mission.
- [x] ADR compliance — consistent with ADR-002 governance routing, AGENTS.md Rule 28 (Test-Negative) and Rule 22 (AVP-001).

## 3. Scope & Boundaries
- **In Scope:** `packages/client/src/__tests__/App.test.tsx` (new); `packages/client/src/__tests__/components/UserManagement.test.tsx` (new); `vitest.config.ts` (thresholds); `governance/{MISSION,TASKS,ROADMAP,SYSTEM_CONTEXT}.md`.
- **Out of Scope:** production source; e2e changes; new dependencies; any file outside the listed paths.
- **Test conventions:** real `Response` objects with JSON content-type; firebase/auth mocked at module level; `loading: false` in all `useAuth` mocks; `react-router-dom` mocked for App routing tests; `vi.restoreAllMocks()` + `mockReset()` in beforeEach for proper state isolation.

## 4. Referenced Architecture
- AGENTS.md Rule 28 (Test-Negative Validation — Red-Green gating), Rule 16 (Verification & Anti-Assumption), Rule 22 (AVP-001 fitness functions), Rule 25 (Reusability — no new tooling).
- M-45/M-46 records (page coverage cohorts, conventions established).

## 5. Verification Gates (Rule 11)
- [x] Functional Verification: 18 new tests green; 329 total; components threshold 80/90; Red-proof recorded.
- [x] AVP-001 Architecture Verification: passed via lock gates.
- [x] Evidence Package: this document + TASKS/ROADMAP rows + archived M-47 packet.
- [x] User Approval — approved (technical design review, 2026-08-17).

## Deferred Decision (Rule 10)
- None.

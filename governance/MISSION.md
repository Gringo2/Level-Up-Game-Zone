# CURRENT MISSION

**Mission:** M-38 ACP-004 Dead Guard Removal
**Status:** Locked

## 1. Objective
Implement approved ACP-004 (Option a + 2.2b):
1. Remove Zod-shadowed field guards (2.1).
2. Remove auth-shadowed `if (!user)` / `if (!adminUser)` guards (2.2).
3. Change `AuthRequest.user` to non-optional in `middleware/auth.ts` (2.2b).
4. Add `reason` to `UpdateCreditSchema`; add `shift_id` to `ResolveMissedDaySchema` (2.3a) — restoring the stale-shift-resolution feature the Thin Client depends on, and making credit `reason` updates persist.
5. Update affected test suites (Zod-path negative regressions + 2.3a positive tests); run full suite, coverage, `tsc`, biome.

## 2. Evidence Payload
- ACP-004 (approved 2026-08-15) enumerates every dead guard with evidence chain (coverage-final.json, auth.ts, validate.ts, schemas/index.ts, MissedDataBlocker.tsx).
- Verified: `ResolveMissedDaySchema` lacks `shift_id`; `MissedDataBlocker.tsx:59` sends `shift_id` → stale shifts never closed today.
- Verified: `UpdateCreditSchema` lacks `reason`; `creditsController.ts:88` guard dead via Zod strip.
- Verified: biome forbids `noNonNullAssertion`; `AuthRequest.user?` optional → 2.2b required for `tsc --strict`.
- [x] Functional — 185/185 `packages/server` vitest pass (12 test files).
- [x] Architectural — AVP-001 verification run 2026-08-16: controllers reach 100% stmts/lines with zero dead guard statements (branch gaps are pre-existing business-logic/catch paths).
- [x] Dependency — only `packages/server` touched; routes keep `requireAuth`+`validateBody` composition, no new packages.
- [x] ADR compliance — governed by ADR-002 composition-root invariants and ACP-004.

## 3. Scope & Boundaries
- **In Scope:** `middleware/auth.ts` (type only), 9 controllers (guard removal), `schemas/index.ts` (2 fields), affected `__tests__/*.test.ts`.
- **Out of Scope:** Frontend React tests; route/middleware logic changes (only the `AuthRequest` type changes); changing Zod strip semantics in `validateBody`.

## 4. Referenced Architecture
- ACP-004 (approval document; supersedes M-37's "out of scope: production code" for this work).
- ADR-003: Reusability & Anti-Reinvention Protocol (reuse existing middleware contract).
- AGENTS.md Rule 6 (Interface Freeze — 2.2b justification recorded in ACP-004), Rule 27 (Deterministic Debugging), Rule 28 (Test-Negative Gating).
- ADR-005 / ADR-006: mock patterns and negative-path gating.

## 5. Verification Gates (Rule 11)
- [x] Functional Verification: full `packages/server` vitest suite green — **185 tests pass (12 files)**.
- [x] AVP-001 Architecture Verification: 6-gate protocol passed 2026-08-16 (biome check, tsc -b, vitest 188, playwright 6 e2e, evidence payload, SSOT sync).
- [x] Evidence Package: this document + ACP-004 + test/coverage run output.
- [x] User Approval (when required) — ACP-004 approved 2026-08-15 (option a + 2.2b).
- [x] Coverage: all previously-dead guards gone (controllers 100% stmts/lines, 0 zero-hit statements); remaining branch gaps are pre-existing business-logic/catch branches.
- [x] `tsc --noEmit -p packages/server` clean.
- [x] `biome lint .` clean (exit 0; pre-existing `noExplicitAny` warnings tolerated repo-wide).

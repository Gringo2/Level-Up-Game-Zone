# Active Mission: Mission 8 — Domain Validation & Server Hardening

## 1. Mission Context
**Status:** Locked
**Type:** Hardening / Quality Assurance
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
Implement domain-driven Zod schema validation on all Express mutation routes to enforce server-side business rules, eliminate invalid data ingress, and harden the API against malformed payloads.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/server/src/schemas/index.ts`
  - `packages/server/src/middleware/validate.ts`
  - `packages/server/src/routes/shifts.ts`
  - `packages/server/src/routes/sales.ts`
  - `packages/server/src/routes/keno.ts`
  - `packages/server/src/routes/expenses.ts`
  - `packages/server/src/routes/credits.ts`
  - `packages/server/src/routes/rates.ts`
  - `packages/server/src/routes/users.ts`
  - `packages/server/src/__tests__/validation.test.ts`
  - `governance/MISSION.md`
  - `governance/TASKS.md`
- **Out of Scope:**
  - Client-side validation, CI/CD pipeline.

## Evidence Payload
- `schemas/index.ts`: 9 domain schemas covering Shift, Sale, Keno, Expense, Credit, GameRate, Role, DeleteReason, EditReason — enforcing non-negative amounts, valid enums, trimmed non-empty strings.
- `middleware/validate.ts`: `validateBody(schema)` Express middleware returning HTTP 400 `{ error }` on Zod failure; passes coerced sanitized data to `req.body` on success.
- Route integration: `validateBody` wired to all 7 mutation route files (shifts, sales, keno, expenses, credits, rates, users).
- `validation.test.ts`: 6 unit tests (Red–Green verified) covering negative float, NaN quantity, invalid enum, invalid role, blank reason, and valid coercion path.
- Full suite: **23 vitest tests (6 files)**, **tsc clean**, **knip 0 issues**, **6 Playwright E2E tests** — all pass.

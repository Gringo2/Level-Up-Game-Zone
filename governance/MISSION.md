# CURRENT MISSION

**Type:** Feature
**Mission:** M-61 UX Polish Batch — Issues #22–#27
**Status:** Locked

## 1. Objective
Batch-close 6 open UX polish issues (#22–#27) covering refetch-on-focus, auth failure handling, confirmation dialogs, audit log action storage, and form guard consistency.

## 3. Scope & Boundaries
- **In Scope:**
  - #22: Add `visibilitychange` refetch-on-focus to GameSales, Keno, Credits, Expenses
  - #23: Central `authFetch` wrapper with 401 → signOut handling (user-approved extension: wired into all 12 API-calling files / 56 call sites; AuthContext excluded as the auth bootstrap handler)
  - #24: Confirmation dialog before role change in UserManagement
  - #25: Confirmation dialog before logout in Layout
  - #26: Store `action` field in audit log documents (shared type + 9 controllers + client display)
  - #27: Add `!itemName` to Expenses submit guard
- **Out of Scope:** WebSocket/polling real-time sync, architectural changes to auth flow, audit log migration of existing records.

## 4. Referenced Architecture
ADR-001 (Thin Client / Composition Roots) — all changes stay within existing boundaries. No new dependencies. No server→client or client→server forbidden imports.

## Evidence Payload
- [x] Functional Verification: 419/419 unit tests passing across 34 files (406 core + 13 gate-closure tests); TypeScript clean; Biome clean; Playwright E2E 6/6.
- [x] Architectural Verification (AVP-001): depcruise clean — 143 modules, 412 dependencies, 0 boundary violations; knip exit 0 (no dead code).
- [x] Dependency Graph Clean: no new npm dependencies; only remaining raw fetch() calls are lib/api.ts (wrapper internals) and AuthContext.tsx (sanctioned exclusion); zero Authorization-header construction outside api.ts.
- [x] ADR Compliance: ADR-001 upheld (Thin Client boundaries intact; composition roots unchanged). Evidence commits: 0b9edb9 (#22–#27 core), 64f20ee (authFetch wiring).

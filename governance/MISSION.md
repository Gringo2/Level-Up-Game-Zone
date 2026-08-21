# CURRENT MISSION

**Type:** Feature
**Mission:** M-61 UX Polish Batch — Issues #22–#27
**Status:** Active

## 1. Objective
Batch-close 6 open UX polish issues (#22–#27) covering refetch-on-focus, auth failure handling, confirmation dialogs, audit log action storage, and form guard consistency.

## 3. Scope & Boundaries
- **In Scope:**
  - #22: Add `visibilitychange` refetch-on-focus to GameSales, Keno, Credits, Expenses
  - #23: Central `authFetch` wrapper with 401 → signOut handling
  - #24: Confirmation dialog before role change in UserManagement
  - #25: Confirmation dialog before logout in Layout
  - #26: Store `action` field in audit log documents (shared type + 8 controllers + client)
  - #27: Add `!itemName` to Expenses submit guard
- **Out of Scope:** WebSocket/polling real-time sync, architectural changes to auth flow, audit log migration of existing records.

## 4. Referenced Architecture
ADR-001 (Thin Client / Composition Roots) — all changes stay within existing boundaries. No new dependencies. No server→client or client→server forbidden imports.

## 5. Verification Gates
- [ ] Functional: All 403+ tests passing, TypeScript clean, Biome clean
- [ ] AVP-001: No boundary violations
- [ ] Evidence Package: This document + test results

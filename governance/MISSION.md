# Active Mission: Mission 14 — Shift Context State Reactivity

## 1. Mission Context
**Status:** Locked
**Type:** Frontend State Synchronization
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
Expose a `refetchShift` trigger in `ShiftContext.tsx` and integrate it into `Layout.tsx` and `Dashboard.tsx` so that starting or closing shifts immediately updates app-wide UI overlays and banners without page reloads.

## 3. Scope & Boundaries
- **In Scope:**
  - `packages/client/src/contexts/ShiftContext.tsx`
  - `packages/client/src/layouts/Layout.tsx`
  - `packages/client/src/pages/Dashboard.tsx`
- **Out of Scope:**
  - Backend controller modifications.

## Evidence Payload
- `ShiftContext.tsx`: Exported `refetchShift: () => Promise<void>` wrapped in `useCallback` to allow child components to trigger shift re-fetches.
- `Layout.tsx`: Awaited `refetchShift()` when starting a shift (`POST /api/shifts`).
- `Dashboard.tsx`: Awaited `refetchShift()` when closing a shift (`POST /api/shifts/:id/close`).
- **Verification:** All 23 vitest unit tests passed. Biome linter and Knip dead-code checks clean. TypeScript typecheck clean.

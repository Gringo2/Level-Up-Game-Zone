# Mission 9: System Stability & Crash Resilience
*Status: LOCKED*

## Phase A: UI Crash Boundary
- [x] 1. Create `packages/client/src/components/ErrorBoundary.tsx` class component.
- [x] 2. Wrap `<AppContent />` root in `App.tsx` with `<ErrorBoundary>`.

## Phase B: Server Exception & Signal Handling
- [x] 3. Add 4-argument Express error handling middleware `(err, req, res, next)` in `index.ts`.
- [x] 4. Add `unhandledRejection`, `uncaughtException`, `SIGTERM`, `SIGINT` process listeners.

## Phase C: Transport & Safe Parsing
- [x] 5. Create `packages/client/src/lib/api.ts` exporting `API_BASE` and `safeJson<T>()`.
- [x] 6. Create `packages/client/.env.example` documenting `VITE_API_URL`.
- [x] 7. Replace 44 hardcoded `http://` strings across 13 client files with `${API_BASE}`.
- [x] 8. Replace unsafe `.json()` calls with `safeJson(response)`.

## Phase D: Verification & Finalization
- [x] 9. Run full verification suite (`tsc`, `vitest`, `knip`, `playwright`).
- [x] 10. Lock Mission 9 and update `STABILITY_GAP_ANALYSIS.md`.


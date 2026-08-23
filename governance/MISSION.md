# CURRENT MISSION

**Type:** Infrastructure
**Mission:** M-81 E2E Hermeticity — Playwright webServer Isolation (TD-055)
**Status:** Locked

## 1. Objective
Set `webServer.reuseExistingServer: false` in `playwright.config.ts` so Gate 4 always runs against a freshly spawned server and **fails loudly** when :3000 is occupied by any foreign/stale process, instead of silently testing it (failure mode reproduced twice on 2026-08-23).

## 3. Scope & Boundaries
- **In Scope:** `playwright.config.ts` (one key), `governance/DEBT.md`, this file.
- **Out of Scope:** :4000 preflight guard (residual risk documented — backend EADDRINUSE under hook still yields confusing E2E failures; revisit if observed again), spec files, lock scripts.

## Design Notes
Minimal-mutation fix per Rule 27: the flag is read solely by Playwright's webServer manager; zero source/spec impact. Known trade-off: local devs must stop their own `npm run dev` before committing (acceptable — silent wrong-app green was worse).

## Testing Strategy (Rule 28)
Red-Green on the guard itself:
- **Red:** squat :3000 with a dummy listener → `npx playwright test` must FAIL with an explicit port-in-use error (not reuse).
- **Green:** ports free → `npx playwright test` → 6/6.
Plus biome/knip/depcruise probes; full AVP-001 suite runs at commit hook.

## Evidence Payload
- [x] Functional Verification: Red captured (squatter → explicit "Port 3000 is already in use" abort); Green = 6/6 E2E
- [x] Architectural Verification (AVP-001): biome changed files=0 | knip exit 0 | depcruise exit 0 | tsc n/a (config outside tsconfig graph)
- [x] Dependency Graph Clean: no dependency changes
- [x] ADR Compliance: TD-055 resolved truthfully; Rule 16 probes recorded in mission log

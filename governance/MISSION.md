# CURRENT MISSION

**Type:** Infrastructure
**Mission:** M-85 API Port Migration 4000→4001 + AFR-003 Guard Remediation (M-84) + TD-057 Time-Bomb Fix
**Status:** Locked

## 1. Objective
1. **M-85 / approved decision #2** — Express API default :4000 → **:4001** (PO's other project runs next-server on :4000); client loopback fallback, resolver tests, docs follow.
2. **M-84 / AFR-003 (approved decision #1)** — `lock_guard.sh`: keyword matching replaced by structural check (≥1 checked, zero unchecked); loud warnings for incomplete/no-checkbox Active payloads. All four branches proven in isolated fixture repo.
3. **TD-057** — Keno/GameSales "Today resets" date-rollover time-bomb defused via scoped fake-Date timers (ACP-007 remedy), root-caused by instrumented probe.

## 3. Scope & Boundaries
- **In Scope:** `.agents/scripts/lock_guard.sh`, `docs/adr/AFR-003*`, `packages/server/src/index.ts`, `packages/client/src/lib/api.ts`, `api.test.ts`, GameSales/Keno test files (TD-047 cases only), README, env examples.
- **Out of Scope:** TD-044 small-subset flakiness (pre-existing; verified NOT a regression — stashed combo run fails 16/50 vs 15/50 post-change).

## Design Notes
- Guard enforcement path unchanged for complete payloads (live-proven at M-81/M-83 locks).
- Fake timers scope: `{toFake:["Date"]}` only — real timers preserved so RTL waitFor works.

## Testing Strategy (Rule 28)
Guard: fixture-repo branch matrix. Port: resolver assertions moved with behavior. TD-057: red existed live (rollover detonation captured pre-fix); green = target tests pass solo + full suite.

## Evidence Payload
- [x] Functional Verification: full suite **473/473** ✔ | guard branch matrix PASS ×4 | E2E unaffected (no :4000 deps in specs)
- [x] Architectural Verification (AVP-001): tsc client+server ✔ | biome changed=0 | knip 0 | depcruise 0
- [x] Dependency Graph Clean: zero dependency changes across all three work items
- [x] ADR Compliance: AFR-003 status → Resolved w/ evidence; TD-057 resolved row truthful; TD-010 allowlist note (:3002/:4001) registered for future mission

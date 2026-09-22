# CURRENT MISSION

**Type:** Governance / Documentation  
**Mission:** M-114 Repository Prose Synchronization & Documentation Hygiene  
**Status:** Locked  
**Proposal:** ACP-022  

## 1. Objective
Synchronize all documentation, user story summaries, system mechanisms, and architecture references across the repository to faithfully reflect the verified, implemented system state:
1. Document the dedicated `POST /api/shifts/auto-open` endpoint and frontend invocation in `SYSTEM_MECHANISMS.md`, `UI_UX_BEHAVIORS.md`, `USER_STORIES_SUMMARY.md`, and `userstories.md`.
2. Synchronize release and migration records in `CHANGELOG.md` and `monorepo_migration_state.md` to reflect Phase 8 delivery through M-113.
3. Note historical context in `docs/adr/ADR-008_NonBlocking_Shifts_Backdated_Entry.md` referencing ACP-011.

## 2. Context
Following the sweep of stale prose in the repository, discrepancies between early design specifications and the active Phase 8 implementation (notably M-99 / ACP-011 shift auto-open architecture) were identified and corrected. In accordance with AGENTS.md, all changes must belong to an approved, locked mission.

## 3. Scope & Boundaries
- **In Scope:**
  - `CHANGELOG.md`
  - `SYSTEM_MECHANISMS.md`
  - `UI_UX_BEHAVIORS.md`
  - `USER_STORIES_SUMMARY.md`
  - `docs/adr/ADR-008_NonBlocking_Shifts_Backdated_Entry.md`
  - `governance/SYSTEM_CONTEXT.md`
  - `governance/TASKS.md`
  - `governance/ROADMAP.md`
  - `governance/MISSION.md`
  - `governance/proposals/ACP-022_Repository_Prose_Synchronization_And_Documentation_Hygiene.md`
  - `governance/missions/M-114_REPOSITORY_PROSE_SYNCHRONIZATION.md`
  - `monorepo_migration_state.md`
  - `userstories.md`
- **Out of Scope:**
  - Runtime code modifications in `packages/client`, `packages/server`, or `packages/shared`.
  - Database schemas, API routes, or test implementations.

## 4. Testing Strategy
- Monorepo fitness gates: `npm run lint`, `npm run knip`, `npm run build`.
- Verification of documentation accuracy against active server routes and client contexts.

## 5. Evidence Payload
- [x] Functional Verification: Prose and documentation across all 9 targeted files strictly align with verified system behavior.
- [x] Monorepo Hygiene: Biome lint (0 errors, 0 warnings), Knip (0 issues), and build clean.
- [x] Governance Traceability: ACP-022 approved, M-114 logged in TASKS.md and ROADMAP.md, and locked in MISSION.md.

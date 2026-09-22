# Architecture Change Proposal (ACP-022): Repository Prose Synchronization & Documentation Hygiene

**Author:** System Architecture & Execution  
**Status:** Approved  
**Date:** 2026-09-22  
**Target:** Monorepo Documentation, User Stories, System Mechanisms, and Historical Context  

---

## 1. Problem Statement
Across the monorepo lifecycle, critical architectural enhancements were implemented in Phase 8—specifically:
1. **M-99 / ACP-011:** Shift auto-open logic was promoted from a silent side-effect inside `GET /missed` to a deliberate, server-authoritative `POST /api/shifts/auto-open` endpoint.
2. **M-101 / M-102 (ACP-010):** Shift-employee and employee-user linkage boundaries were formalized.
3. **M-105 through M-113:** Shift drawer reconciliation, multi-device responsiveness, filter guards, and brand identity were established.

However, several high-level specifications and documentation files retained stale prose:
- `SYSTEM_MECHANISMS.md`, `UI_UX_BEHAVIORS.md`, `USER_STORIES_SUMMARY.md`, and `userstories.md` contained descriptions asserting that `GET /missed` was responsible for shift auto-creation, or described UI flows from prior milestones.
- `CHANGELOG.md` lacked documented milestones for Phase 8 operational integrity and UX polish.
- `monorepo_migration_state.md` reflected outdated monorepo migration status.
- `docs/adr/ADR-008_NonBlocking_Shifts_Backdated_Entry.md` referenced historical `GET /missed` behavior without noting its supersession by ACP-011.

Leaving stale prose in the repository creates friction, ambiguity, and risks architectural drift for implementors and stakeholders.

---

## 2. Proposed Architecture & Solution
Perform an exhaustive synchronization of repository prose to strictly reflect current implemented reality:
1. **Shift Auto-Open Mechanism Documentation:** Update `SYSTEM_MECHANISMS.md`, `UI_UX_BEHAVIORS.md`, `USER_STORIES_SUMMARY.md`, `userstories.md`, and `docs/adr/ADR-008` to document the dedicated `POST /api/shifts/auto-open` endpoint and explicit frontend invocation.
2. **Release & Migration History:** Synchronize `CHANGELOG.md` and `monorepo_migration_state.md` to accurately document the completion of Phase 8 milestones (M-99 through M-113).
3. **Traceability:** Maintain references to ACP-006, ACP-010, ACP-011, and ADR-008 while clearly delineating historical design versus superseded behavior.

---

## 3. Invariants & Guardrails
- **Zero Code Mutation:** No runtime application logic or tests are altered.
- **Fact-Checking Prose (Rule 16):** All prose updates must reflect verified code and tests in the repository.
- **Fitness Functions (AVP-001):** Biome lint, Knip hygiene, and build checks must pass cleanly.

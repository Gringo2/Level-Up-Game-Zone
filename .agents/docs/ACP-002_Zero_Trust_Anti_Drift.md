# Proposal: ACP-002 Zero-Trust Infrastructure Anti-Drift Mechanics

## 1. Context and Problem Statement
During a rigorous static analysis of the `.agents` runtime, significant "drift" was discovered between the documented prose and the actual structural execution:
1. `SYSTEM_CONTEXT.md` explicitly defined architectural constraints for the `packages/shared` boundary, but `.dependency-cruiser.js` failed to encode them.
2. The `governance/MISSION.md` document used template headings that diverged from what the `wake_summary.sh` AWK parser expected, blinding the AI Implementor to the mission scope.

The core problem is that documentation (Markdown) and runtime constraints (JSON/Bash) are manually synchronized. Because humans and AI can alter markdown templates without automatically updating the parsers, the Zero-Trust runtime is vulnerable to structural desynchronization.

## 2. Proposed Solution
To eliminate drift and ensure the cage is physically verified rather than probabilistically trusted, we propose treating governance files as **executable contracts** via three anti-drift mechanisms:

1. **Single Source of Truth (SSOT) Auto-Generation:** Prevent architectural drift by writing a script (executed during `lock_mission.sh`) that dynamically reads the `.dependency-cruiser.js` rules and injects them directly into `SYSTEM_CONTEXT.md`. The code must become the ultimate source of truth for the documentation.
2. **Infrastructure Metatesting (Testing the Cage):** Write explicit unit tests using Vitest (`infrastructure.test.ts`) that specifically validate the behavior of the `.agents/scripts`. These tests will pass mock `MISSION.md` schemas through the bash scripts to mathematically prove that the parsers extract the correct context.
3. **Mandatory Section Validation:** Enforce the structural integrity of `governance/MISSION.md` without destroying flexibility. The `mission_gate.sh` hook will validate that the active mission contains the minimum mandatory anchors required by the `.agents` parsers (e.g., `## 3. Scope & Boundaries`, `## Evidence Payload`). Humans and AI may append custom sections to the mission, but the mandatory anchors cannot be altered or removed.

## 3. Alternative Options
- **Status Quo (Manual Syncing):** Rejected. We just proved that relying on humans or AI to manually keep Markdown in sync with shell scripts results in catastrophic, silent failures.
- **Removing Markdown Entirely (Code-Only Governance):** Rejected. While moving all architecture into `.json` or `.ts` files eliminates drift, it violates the requirement for human-readable architectural artifacts (Tier 1 & 2 Documents).

## 4. Consequences
- **Easier:** It becomes mathematically impossible for the structural boundaries in `SYSTEM_CONTEXT.md` to lie about what Dependency Cruiser is actually enforcing. CI/CD will immediately flag broken context extractors via the metatests.
- **Harder:** The AI Implementor and Product Owner lose the flexibility to arbitrarily rename or remove core headings in `MISSION.md` (e.g. changing "Evidence Payload" to "Checklist" is forbidden). However, unlike strict hashing, adding new custom sections is permitted.

## 5. Affected Documents
- `governance/SYSTEM_CONTEXT.md`
- `governance/MISSION.md`
- `.agents/scripts/lock_mission.sh`
- `.agents/scripts/mission_gate.sh`
- `package.json` / `vitest.config.ts` (for new infrastructure test suite)

## 6. Action Items
- [ ] Implement SSOT Sync Script to parse `.dependency-cruiser.js` and update `SYSTEM_CONTEXT.md`.
- [ ] Add Mandatory Section Validation logic to `mission_gate.sh` to enforce the presence of core `MISSION.md` anchors.
- [ ] Write `infrastructure.test.ts` to assert against `wake_summary.sh` and `lock_mission.sh` parsing logic.

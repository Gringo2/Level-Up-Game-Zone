# Engineering Lifecycle

This document defines how WIP evolves from an idea into released functionality.

## Proposed Lifecycle

```
Idea
  ↓
Research
  ↓
RFC
  ↓
Discussion
  ↓
Approval
  ↓
Architecture
  ↓
ADR
  ↓
Mission
  ↓
Tasks
  ↓
Implementation
  ↓
Verification
  ↓
Acceptance
  ↓
Lock
  ↓
Release
```

Every feature follows this pipeline.

## Future Mission Lifecycle Gates (ACP-019)

All future missions must pass five explicit gates before transitioning to `LOCKED` or `RELEASED`:
1. **Proposal Gate:** Approved ACP/RFC defining architectural bounds.
2. **Boundary Gate:** Verified zero forbidden package dependencies (AVP-001).
3. **Verification Gate:** Passing build, lint (`npm run lint`), unit (`vitest`), and E2E (`playwright`) tests.
4. **Evidence Payload Gate:** Documented test and compliance evidence in `MISSION.md`, including confirmation that no new/modified test depends on wall-clock time (ACP-007 Time Determinism, AGENTS.md Rule 28).
5. **Approval Gate:** Explicit Product Owner approval before closing.

**Mission Record Mandate (M-42):** every mission record in `governance/MISSION.md` MUST declare a `**Type:**` field. Tooling missions that edit `.agents/*` or repository infrastructure MUST use `**Type:** Governance` or `**Type:** Infrastructure`; otherwise `mission_gate.sh` will deny the edits (ADR-007 guardrail, line 41-47). The lock script warns at lock time if the field is absent.

## Enforced Pre-Commit Mission Lock (ACP-005)

When a mission is complete (MISSION.md status `Active` with every Evidence Payload box checked), the **last job** of the pre-commit hook (`.agents/scripts/lock_guard.sh`) runs the full AVP-001 lock suite (`lock_mission.sh <MISSION_ID>`) **before the commit is accepted**:

1. **Fast pre-check** (sub-second, text-only): reads `governance/MISSION.md`. If status is not `Active`, or any Evidence Payload box is unchecked, or no `M-<id>` is parseable → the guard exits silently and the commit proceeds normally.
2. **Enforced path:** when all completion signals hold, the guard invokes `lock_mission.sh`. On gate failure the guard **blocks the commit** (exit 1) — a complete mission can never be committed in `Active` state. On success, `MISSION.md` is already flipped to `Locked` and the guard stages the lock artifacts (MISSION.md, SYSTEM_CONTEXT.md, `.agents/evidence_packet.json`, `.agents/evidence_packets/<id>.json`) into the in-flight commit.

The commit itself is the Rule 11 User Approval moment: the operator chooses when to commit the completed mission; the hook guarantees it lands already `Locked`. There is no separate manual `lock_mission.sh` step for a normal final commit.

## Request for Comments (RFC)

Before architectural decisions are made (ADR), an RFC documents possible solutions.

**Flow:** Idea → RFC → Discussion → Approval → ADR → Mission → Implementation

**Example:**
*   **RFC-001:** Should WIP use Playwright or Puppeteer? (Explores options and tradeoffs)
*   **ADR-002:** Browser Runtime (Documents the final decision, e.g., Playwright)

This separation keeps architectural history clean: RFCs explore possibilities, ADRs document final decisions.

## Stable vs Experimental

Not every feature should be governed equally.

*   **Core / Stable:** Features like Observation Graph, Session Manager, Validation. Once approved, these are **LOCKED** and strictly governed by interface freezes.
*   **Experimental:** Features like Canvas Analyzer, Animation Detector, AI Summarizer. These can evolve rapidly without strict interface governance until they are promoted to Stable.

## Success Metrics

Each phase of the project requires measurable exit criteria.

**Example: Phase N Exit Criteria**
- [ ] Core integration succeeds.
- [ ] Type coverage > 95%.
- [ ] Unit tests pass.

Without measurable completion criteria, phases tend to expand indefinitely.

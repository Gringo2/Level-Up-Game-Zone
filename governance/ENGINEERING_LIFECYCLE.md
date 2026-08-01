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
4. **Evidence Payload Gate:** Documented test and compliance evidence in `MISSION.md`.
5. **Approval Gate:** Explicit Product Owner approval before closing.

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

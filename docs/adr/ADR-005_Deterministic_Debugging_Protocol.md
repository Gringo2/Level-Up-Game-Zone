# ADR-005: Deterministic Debugging Protocol

## Context
As autonomous AI Implementors navigate complex codebases, they are prone to "Probabilistic Debugging" (Shotgun Surgery). When an AI encounters a test failure, its default tendency is to rapidly guess the cause and mutate files blindly ("Fix-Forward Doom Loop"). Alternatively, enforcing a strict "Rollback on Error" policy is an overreaction that destroys productivity.

To maintain our zero-trust, deterministically governed architecture without crippling velocity, the debugging process must balance targeted fixes with rigorous, evidence-based Root Cause Analysis (RCA).

## Decision
We are adopting a strict **Deterministic Debugging Protocol** for all AI Implementors when addressing bugs, failures, or errors.

1. **Formal Root Cause Analysis (RCA):** The AI must not mutate application code immediately upon seeing an error. It must pause and execute a formal RCA: understand the error, check original plan assumptions, evaluate omitted ideas, and rethink the implementation strategy.
2. **Live Debugger Attachment & Active Diagnostics:** When an error occurs, alongside the formal RCA, the AI is required to attach a live debugger (e.g., node inspector, browser devtools, IDE debugger). The AI must actively step through the execution state using breakpoints and memory inspection rather than relying solely on static terminal logs or mental assumptions. 
3. **The Exhaustion Protocol (Rollback Guardrail):** "Fix-Forward" is permitted *only* when the targeted fix is directly informed by the RCA. A full mission rollback (state restoration) is triggered ONLY when the RCA proves **exhaustion**—meaning the core architectural approach of the mission is fundamentally flawed and continuing to patch it would violate repository invariants.
4. **Clean State Restoration (Anti-Littering):** All diagnostic artifacts injected during the RCA phase (breakpoints, logs, probes) must be stripped from the codebase before the mission is considered complete or locked.

## Consequences
- **Positive:** Eradicates the "Doom Loop" of shotgun surgery while maintaining high implementation velocity. Encourages deep diagnostic understanding of bugs. Prevents nuclear rollbacks for minor syntax errors.
- **Negative:** Requires the AI to actively document its RCA reasoning in the active log before proceeding with a fix.
- **Mitigation:** This forces the AI into a "Measure Twice, Cut Once" mindset, significantly reducing overall debug time by eliminating blind guessing.

## Compliance
This decision is permanently codified as **Rule 27** in the `AGENTS.md` Engineering Constitution.

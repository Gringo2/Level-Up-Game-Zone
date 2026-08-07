# Active Mission: Phase 6 Agentic Behavior Gating

## 1. Mission Context
**Status:** Locked
**Type:** Infrastructure
**Phase:** Implementation
**Primary Owner:** AI Implementor

## 2. Objective
Implement robust AI guardrails (ACP-003) to prevent LLM resource waste, context degradation, and task hallucinations by introducing deterministic gates into the `.agents` interception lifecycle.

## 3. Scope & Boundaries
- **In Scope:**
  - `.agents/hooks.json`
  - `.agents/scripts/guard_run_command.sh`
  - `.agents/scripts/mission_gate.sh`
  - `.agents/scripts/post_edit_verify.sh`
  - `.agents/scripts/lock_gate.sh`
- **Out of Scope:**
  - Refactoring UI components or backend application logic.

## Evidence Payload
- `guard_run_command.sh` blocks context-destroying outputs.
- `mission_gate.sh` rejects unowned scratchpad creation in the root.
- `post_edit_verify.sh` maintains a failure counter and triggers an Exhaustion limit.
- `hooks.json` automatically triggers `AVP-001` verification when this mission transitions to Locked.

# Active Mission: Mission 22 — Antigravity Hooks Specification Maturation

## 1. Mission Context
**Status:** Locked
**Type:** Governance
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
Upgrade `.agents` interception scripts to support native Antigravity JSON decision payloads (`{"decision": "deny", "reason": "..."}`), `PreInvocation` trajectory injection (`injectSteps`), and `Stop` event cleanup.

## 3. Scope & Boundaries
- **In Scope:**
  - `.agents/hooks.json`
  - `.agents/scripts/mission_gate.sh`
  - `.agents/scripts/guard_run_command.sh`
  - `.agents/scripts/wake_summary.sh`
  - `.agents/scripts/stop_cleanup.sh` [NEW]
- **Out of Scope:**
  - Feature packages (`packages/client`, `packages/server`).

## Evidence Payload
- [x] Functional Verification: Upgraded all hooks to native Antigravity JSON schemas.
- [x] Architectural Verification (AVP-001): Passed full 6-gate lock suite.
- [x] Dependency Graph Clean: Zero circular dependencies or forbidden imports.
- [x] ADR Compliance: Conforms to ADR-002, ADR-006, ADR-007, and AVP-001.

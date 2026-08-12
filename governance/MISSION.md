# Active Mission: Mission 24 — Code Graph Composite Tool Endpoint (`inspect-file`)

## 1. Mission Context
**Status:** Locked
**Type:** Governance
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
Add the unified `inspect-file <target_file>` composite subcommand to `.agents/scripts/code_graph_api.sh`. Allows the AI to execute a single on-demand CLI call returning blast radius reachability graph, taint analysis, and AST rules in a single structured JSON payload.

## 3. Scope & Boundaries
- **In Scope:**
  - `.agents/scripts/code_graph_api.sh`
- **Out of Scope:**
  - Feature packages (`packages/client`, `packages/server`).

## Evidence Payload
- [x] Functional Verification: Added inspect-file subcommand to code_graph_api.sh returning unified composite JSON.
- [x] Architectural Verification (AVP-001): Passed full 6-gate lock suite.
- [x] Dependency Graph Clean: Zero circular dependencies or forbidden imports.
- [x] ADR Compliance: Conforms to ADR-002, ADR-006, ADR-007, and AVP-001.

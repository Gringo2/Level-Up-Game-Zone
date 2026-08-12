# Active Mission: Mission 19 — Governance Framework Maturation (.agents 10/10 MVP)

## 1. Mission Context
**Status:** Locked
**Type:** Governance
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
Complete all 10 concrete MVP components for the `.agents` governance framework by creating the Code Graph / Evidence API (`code_graph_api.sh`), Structured Evidence Packet (`evidence_packet.json`), Execution Ledger (`log_ledger.sh`), and Contradiction Detector (`contradiction_detector.sh`), and wiring them into `hooks.json` and `lock_mission.sh`.

## 3. Scope & Boundaries
- **In Scope:**
  - `package.json` (adding `@ast-grep/cli`)
  - `.agents/hooks.json`
  - `.agents/scripts/code_graph_api.sh`
  - `.agents/scripts/log_ledger.sh`
  - `.agents/scripts/contradiction_detector.sh`
  - `.agents/scripts/lock_mission.sh`
  - `.agents/scripts/mission_gate.sh`
- **Out of Scope:**
  - Feature packages (`packages/client`, `packages/server`).

## Evidence Payload
- [x] Functional Verification: All 4 new governance scripts tested and operational.
- [x] Architectural Verification (AVP-001): Passed full 6-gate lock suite.
- [x] Dependency Graph Clean: Zero circular dependencies or forbidden imports.
- [x] ADR Compliance: Conforms to ADR-002, ADR-006, and AVP-001.

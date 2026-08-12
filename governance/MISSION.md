# Active Mission: Mission 20 — Interprocedural Taint Tracking Engine

## 1. Mission Context
**Status:** Locked
**Type:** Governance
**Phase:** Phase 5 — Maturation
**Primary Owner:** AI Implementor

## 2. Objective
Achieve 100% completion on **Capability 3 (Data Flow / Taint Tracking)** by building an interprocedural Source-to-Sink variable tracer script (`taint_tracer.ts`) using the native **TypeScript Compiler API** (`ts.createProgram`, `ts.TypeChecker`, and AST visitor), supporting object destructuring, cross-file argument-to-parameter mapping, property-leak tracking, and sanitizer interception.

## 3. Scope & Boundaries
- **In Scope:**
  - `.agents/scripts/taint_tracer.ts`
  - `.agents/scripts/code_graph_api.sh`
  - `.agents/scripts/contradiction_detector.sh`
- **Out of Scope:**
  - Feature packages (`packages/client`, `packages/server`).

## Evidence Payload
- [x] Functional Verification: All AST structural targets & edge cases tested and operational.
- [x] Architectural Verification (AVP-001): Passed full 6-gate lock suite.
- [x] Dependency Graph Clean: Zero circular dependencies or forbidden imports.
- [x] ADR Compliance: Conforms to ADR-002, ADR-006, and AVP-001.

# Architecture Change Proposal (ACP-023): Governance & Lifecycle Documentation Hygiene

**Author:** System Architecture & Execution  
**Status:** Approved  
**Date:** 2026-09-22  
**Target:** Governance Ledger, Engineering Lifecycle, Release Readiness, and Constitution References  

---

## 1. Problem Statement
Following the completion of M-114 (Repository Prose Synchronization), a rigorous line-by-line verification sweep across all documentation revealed a small set of residual prose and cross-referencing anomalies:
1. **`governance/RELEASE_READINESS.md` Line 107:** Claims "Review the remaining 3 moderate `qs` advisories in the Express 4 dependency range". Live `npm audit` and `governance/DEBT.md` (TD-013) verify there are **6 moderate** severity vulnerabilities.
2. **`governance/ENGINEERING_LIFECYCLE.md` Line 39:** References `## Future Mission Lifecycle Gates (ACP-019)`. However, ACP-019 is the proposal governing "Reports & Expenses Responsive Hardening" (M-111). The actual governing proposal that established enforced lifecycle gates and the pre-commit mission lock is **ACP-005** (Pre-Commit Mission Lock, M-48).
3. **`governance/ENGINEERING_LIFECYCLE.md` Lines 75–76:** The "Stable vs Experimental" section contains legacy template examples from an external browser automation framework (`Observation Graph`, `Session Manager`, `Canvas Analyzer`, `Animation Detector`, `AI Summarizer`). These do not exist in Level-Up Game Zone and introduce ambiguity for engineering governance.
4. **`AGENTS.md` Line 132:** The ADR section references `(e.g., ADR-001 Observation Graph)`. In this repository, `ADR-001` is permanently recorded as `ADR-001: Thin Client Composition Roots`.
5. **`governance/SYSTEM_CONTEXT.md` Line 10:** The current mission pointer was left pointing to M-113 after M-114 completion.

---

## 2. Proposed Architecture & Solution
Perform targeted, verified documentation corrections across the affected governance files:
1. **Release Readiness Alignment:** Update `RELEASE_READINESS.md` line 107 from "3 moderate" to "6 moderate" `qs` advisories, aligning with `npm audit` and `DEBT.md`.
2. **Lifecycle Gates Proposal Alignment:** Correct `ENGINEERING_LIFECYCLE.md` line 39 from `(ACP-019)` to `(ACP-005)`.
3. **Subsystem Terminology Localization:** Update `ENGINEERING_LIFECYCLE.md` lines 75–76 to use concrete Level-Up Game Zone subsystems (Core/Stable: `Thin Client Composition Roots`, `Shift Lifecycle & Cash Reconciliation`, `Domain Validation`, `Activity Audit Logging`; Experimental: `Custom Theme Designer`, `Batch Export Analytics`, `Real-Time WebSocket Sync`).
4. **Constitution ADR Reference Correction:** Update `AGENTS.md` line 132 to cite `ADR-001 Thin Client Composition Roots`.
5. **System Context Synchronization:** Synchronize `SYSTEM_CONTEXT.md` to reflect the active governance state.

---

## 3. Invariants & Guardrails
- **Zero Runtime Code Mutation:** No runtime application logic, schemas, or test suites are altered.
- **Rule 1 Source Control Invariant:** The AI Implementor executes zero mutating git commands.
- **Fact-Checking Prose (Rule 16):** Every updated line must correspond to empirical repository facts.
- **Fitness Functions (AVP-001):** Biome lint, Knip hygiene, TypeScript build, and unit tests must remain 100% clean and passing.

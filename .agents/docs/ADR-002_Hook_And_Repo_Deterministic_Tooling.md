# ADR-002: Hook and Repository Deterministic Tooling

## Context
To enforce the repository's Zero-Trust Architecture and prevent AI or human architectural drift, the agent runtime intercepts all code edits using deterministic static analysis. The `.agents` hooks natively tether into physical configuration files located within the repository, ensuring all architectural laws are mathematically enforceable rather than probabilistically requested.

## Deterministic Toolchain Philosophy

The repository categorizes its 7 binaries into two distinct verification paradigms. Preference is *always* given to enforcing **Thoughtful Invariants** over relying on **Repetitive Brute Force**.

### Paradigm A: Thoughtful Implementations via Invariants (Static)
These tools prove mathematically that an invalid state or architectural violation is unrepresentable *before* the code ever executes.

1. 🟢 **[IMPLEMENTED] Architectural Blast Radius (Dependency Cruiser)**
   *   **Configuration:** `.dependency-cruiser.js`
   *   **Role:** The ultimate architectural invariant. Locks down the Composition Root via a Forbidden Dependency Matrix, making structural leaks (e.g., client importing server logic) physically impossible.
2. 🟢 **[IMPLEMENTED] Type Integrity (TypeScript)**
   *   **Configuration:** `tsconfig.json`
   *   **Role:** Provides mathematical proof of data structure contracts across boundaries.
3. 🟢 **[IMPLEMENTED] Formatting & Linting (Biome)**
   *   **Configuration:** `biome.json`
   *   **Role:** Enforces syntax and formatting invariants at sub-50ms speeds.
4. 🟢 **[IMPLEMENTED] Zero-Trust Security & Pattern Matching (AST-Grep)**
   *   **Configuration:** `sgconfig.yml` and `rules/forbid-firestore.yml`
   *   **Role:** Enforces Thin Client boundaries at the AST level (forbidding `addDoc` in the client) and provides high-speed structural pattern guardrails. Replaced Semgrep to resolve execution environment conflicts.
5. 🟢 **[IMPLEMENTED] Dead Code Analysis (Knip)**
   *   **Configuration:** `knip.json`
   *   **Role:** Identifies topological orphans (zombie exports and unused dependencies) mathematically via dependency graph traversal.

### Paradigm B: Repetitive Brute Force (Dynamic)
These tools verify runtime behavior by exhaustively executing application logic. Because they are empirical rather than mathematical, their validity relies entirely on **Negative Gating** (TDD Red-Green). A test that only verifies the "happy path" is hollow; dynamic tools must actively prove the system fails gracefully on invalid states.

6. 🟢 **[IMPLEMENTED] Unit Verification (Vitest)**
   *   **Configuration:** `vitest.config.ts`
   *   **Role:** Repetitive state execution. Runs permutations of logic branches to catch behavior regressions that cannot be statically proven. **Enforced via the `TDD ORDER WARNING` gate in `post_edit_verify.sh`, which physically intercepts implementations that lack corresponding negative tests.**
7. 🟢 **[IMPLEMENTED] End-to-End Verification (Playwright)**
   *   **Configuration:** `playwright.config.ts`
   *   **Role:** Brute-force simulation of full-stack cross-boundary interactions, network latency, and DOM stability. Requires negative assertions to prove resilience.

## Validation Protocol
Any agent or human attempting to lock an active mission MUST pass the combined evaluation of these 7 tools natively executed via `.agents/scripts/post_edit_verify.sh` and `lock_mission.sh`. Failure during `post_edit_verify.sh` results in an automatic terminal rejection of the code mutation, while failure in `lock_mission.sh` physically blocks the mission from completing.

## The Verification Proof Guarantee (Hybrid Bounded Model)

According to formal computer science principles, this 7-binary loop establishes a **Hybrid Verification Pipeline**. It operates under the repository's Golden Rule: *"Do not assume, verify,"* yielding the following guarantees:

### 1. High-Confidence Static Invariants
In formal computer science, a static analysis tool is considered **"Sound"** only if it evaluates an over-approximation of *every possible execution path* (guaranteeing zero false negatives). While JavaScript/TypeScript are fundamentally "Unsound" languages by design (e.g., the `any` keyword), our pipeline enforces **High-Confidence Structural Proofs**:
*   **Dependency Cruiser** provides a *Topological Proof of Boundaries* (making structural cross-package imports physically impossible).
*   **AST-Grep** provides a *Syntactic Proof of AST Invariants* (verifying the absolute absence of forbidden syntax patterns like `addDoc` in the client).
*   **TypeScript** provides a *Static Proof of Contracts*, enforcing boundary types before execution.

### 2. Empirical Confidence of Functional Correctness
Per Dijkstra's Law (*"Testing shows the presence, not the absence of bugs"*), dynamic tools (Vitest, Playwright) are inherently "unsound" because they cannot test infinite execution states. Instead of mathematical proof, they provide **Empirical Confidence** that known business pathways resolve correctly.

### The Certified Proof
When the 7-binary pipeline exits with code `0`, it certifies the following theorem for the repository:
> *"We mathematically prove that the proposed mutation respects all structural boundaries, introduces no topological orphans, and preserves the Zero-Trust Architecture (Static Integrity). Furthermore, we empirically certify that the specific business logic and UI boundaries behave as expected for all defined user pathways (Dynamic Confidence)."*

## The Formal Verification Horizon (Paradigm C)

While the Hybrid Bounded Model (Paradigm A + B) provides a robust proof of architectural integrity, it does not achieve **100% Mathematical Proof of Functional Correctness**. Should the repository ever transition to life-critical or high-financial-stakes systems, the architecture must escalate beyond standard testing to true **Formal Verification**.

Formal Verification abandons traditional execution in favor of mathematical theorem proving. The following tools represent the ultimate ceiling of the *"Do not assume, verify"* invariant:

### 1. 🔴 [NOT IMPLEMENTED - FUTURE HORIZON] Automated Theorem Provers (SMT Solvers)
*   **Target Tool:** Z3 (Microsoft Research)
*   **Mechanism:** Software logic is translated into Satisfiability Modulo Theories (Boolean logic, bit-vectors, integer arithmetic). Z3 calculates if a failure condition is mathematically "Satisfiable". If calculated as "Unsatisfiable", the tool mathematically proves the bug cannot exist in any execution timeline.

### 2. 🔴 [NOT IMPLEMENTED - FUTURE HORIZON] Interactive Proof Assistants (Deductive Verification)
*   **Target Tools:** Coq, Lean, Isabelle
*   **Mechanism:** Engineers write the software, define a formal theorem, and manually construct a step-by-step mathematical proof of correctness. The engine (e.g., Coq) uses Dependent Type Theory and the Calculus of Inductive Constructions to rigorously referee the proof. This represents the highest assurance level in computer science (e.g., verifying the `seL4` microkernel or `CompCert` compiler).

### 3. 🔴 [NOT IMPLEMENTED - FUTURE HORIZON] Temporal Model Checkers
*   **Target Tool:** TLA+ / TLC (Leslie Lamport)
*   **Mechanism:** The system's architecture is mathematically modeled using Set Theory and Temporal Logic before any code is written. The TLC Model Checker then exhaustively computes every possible universe, state, and timeline to mathematically prove that race conditions, deadlocks, and data loss are structurally impossible in the distributed design.



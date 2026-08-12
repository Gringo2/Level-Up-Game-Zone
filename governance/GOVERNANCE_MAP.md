# Governance Map

This document explains where different kinds of knowledge and artifacts belong within the repository. It serves as a routing guide for both human architects and AI implementors to ensure architectural knowledge remains decoupled from behavioral policy.

## `governance/` - System & Process State
Documents in this tier define the current state of the system, engineering rules, and ongoing execution.

*   **`AGENTS.md`**: The Engineering Constitution. Defines *how* the AI implementor must behave (behavioral constraints, operational rules, workflow, WAKE protocol).
*   **`SYSTEM_CONTEXT.md`**: The current architectural truth. Defines *what* the system is (boundary ownership, forbidden dependency matrices, active constraints).
*   **`ENGINEERING_LIFECYCLE.md`**: The repository workflow and how missions transition through phases.
*   **`MISSION.md`**: The current active mission state, scope, and objectives.
*   **`ARCHITECTURE_PLAN.md`**: The overarching system architecture plan and master document.
*   **`TASKS.md`**, **`DEBT.md`**, **`ROADMAP.md`**: Execution backlogs, technical debt, and milestones.
*   **`GLOSSARY.md`**: Frozen system vocabulary.

## `docs/adr/` - Architecture & Protocols
Documents in this tier contain permanent architectural decisions, verification mechanisms, and friction resolutions.

*   **`ADR-*` (Architecture Decision Records)**: Permanent architectural decisions, rationale, and invariants (e.g., Composition Roots, Browser Runtime).
*   **`AVP-*` (Architecture Verification Protocols)**: Verification protocols and fitness functions (e.g., boundary leak detection).
*   **`AFR-*` (Architecture Friction Reports)**: Friction resolution reports and protocols when implementation cannot meet architecture.

## `governance/proposals/` - Future Changes
Proposals for future architectural and interface changes before they are accepted.

*   **`ACP-*` (Architecture Change Proposals)**: Proposed changes, architectural refinements, interface changes, and migration plans.

## `.agents/docs/` - Zero-Trust Runtime Architecture
Documents in this tier are exclusively dedicated to the Antigravity IDE interception layer. They define the structural bounds of the automated cage.

*   **`ADR-*`**: Tooling and lifecycle decisions governing the interception physics (e.g., ADR-002, ADR-006, ADR-007).
*   **`ADR-007`**: Complete Google Antigravity Specification Hooks Lifecycle (PreInvocation, PreToolUse decision engine, PostInvocation, Stop).
*   **`AVP-*`**: The mission lock gates and automated verification thresholds.
*   **`ACP-*`**: Drift mechanics and future upgrades to the interception bash scripts.

## `specs/` - Behavioral Specifications
*   **Behavioral specifications**: Concrete definitions of how components must behave, API contracts, and interface definitions.


## `apps/` and `packages/` - Implementation & Source
This is the executable system. Code here must reflect the constraints defined in the governance and architectural tiers.
*   **`apps/`**: Host applications, Composition Roots, and transport layers (e.g., `apps/browser-lab`). These wire the system together.
*   **`packages/`**: Isolated, decoupled domain and technical capabilities (e.g., `packages/browser-runtime`). These implement the abstractions.

## `assets/` - Visual & Conceptual Design
*   **Design Artifacts**: Architecture diagrams, UI/UX mockups, and static visual design files that inform implementation.

## `tests/` (within apps/packages) - Verification
*   **Tests**: Automated verification (unit, integration, E2E) that proves the implementation satisfies the behavioral specifications, architectural invariants, and fitness functions.

---
*Note: Before adding new rules or architectural facts, consult this map to ensure they are placed in the correct tier. Behavioral rules go to AGENTS.md, architectural facts go to SYSTEM_CONTEXT.md or ADRs, and verification mechanisms go to AVP.*

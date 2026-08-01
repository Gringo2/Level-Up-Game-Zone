# Industry Community Standards for Code Review (2026 Research Report)

**Research Focus:** Google Engineering Practices, Meta/Microsoft Industry Standards, and AI-Assisted Code Review Protocols  
**Author:** AI System Architect
**Date:** 2026-07-31

---

## 1. Executive Summary of Industry Standards

In modern software engineering (Google, Meta, Microsoft, Sourcegraph), Code Review is defined by **four fundamental pillars**:

```
                       ┌─────────────────────────────────────────┐
                       │  1. AUTOMATED PRE-REVIEW GATEWAY        │
                       │     (Linters, Static Analyzers, AST)    │
                       └────────────────────┬────────────────────┘
                                            │
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │  2. AI & ML ASSISTED PRE-FLIGHT         │
                       │     (Security Scanning, Bug Prediction) │
                       └────────────────────┬────────────────────┘
                                            │
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │  3. HUMAN-IN-THE-LOOP (HITL) REVIEW     │
                       │     (Architecture, Intent, Readability) │
                       └────────────────────┬────────────────────┘
                                            │
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │  4. POST-MERGE OBSERVABILITY            │
                       │     (Audit Trails, Blast Radius Maps)   │
                       └─────────────────────────────────────────┘
```

## 2. Pillar Breakdown & Community Standards

### Pillar 1: Automated Pre-Review Gateway (The "No Nitpicking" Rule)
* **Google's Standard:** Human reviewers should **never** discuss code formatting, import sorting, or basic syntax in a code review. If a human has to point out a missing semicolon or an unused variable, the automation pipeline has failed.
* **Implementation:** This aligns with our `.agents/scripts/lock_mission.sh` (Gate 1 & Gate 5). The community standard dictates that formatting (Biome/Prettier) and basic AST/Type checks (Knip, `tsc -b`) must be enforced *before* a human is ever notified.

### Pillar 2: AI & ML Assisted Pre-Flight
* **Microsoft/Meta Standard:** AI is no longer just for generating code; it is an active participant in reviewing it. Before a human sees a PR, AI tools (like GitHub Copilot Workspace or Meta's internal SapFix) analyze the diff for security vulnerabilities, edge-case bugs, and test coverage gaps.
* **Implementation:** The industry standard is shifting from "AI writes the code" to "AI validates the bounds." This maps directly to our `ast-grep` and `dependency-cruiser` integration in `post_edit_verify.sh`, where the AI ensures the code doesn't violate systemic architectural rules before proceeding.

### Pillar 3: Human-in-the-Loop (The "Intent & Architecture" Gate)
* **Google's Standard:** According to Google's official *Eng Practices*, human code review is strictly reserved for three things:
  1. **Design and Architecture:** Does this code belong in this repository? Does it follow the established Domain-Driven Design?
  2. **Comprehensibility:** Is the code readable? Are the variables well-named?
  3. **Complexity:** Is the solution over-engineered?
* **Implementation:** This validates our `AGENTS.md` Rule 11 (Mission Lock). The human product owner is not there to check if the code compiles; they are there to verify if the code fulfills the architectural intent.

### Pillar 4: Post-Merge Observability & Audit
* **Industry Standard:** Code review doesn't end when the code is merged. High-functioning engineering teams (like those at Stripe or Netflix) maintain immutable logs of *who* reviewed the code, *why* an architectural decision was made (ADRs), and what the structural blast radius of the change was.
* **Implementation:** This validates our use of Architecture Decision Records (`docs/adr/`), Architecture Friction Reports (`AFR-*`), and the `.agents/reports/advisories.json` to maintain an evidence trail that outlives the PR.

## 3. How Our `.agents` Runtime Compares

If we map the repository's zero-trust governance runtime against Google/Meta standards, **we are actually ahead of the curve in deterministic enforcement.**

* **Where we excel:** Most open-source projects rely on "Probabilistic AI" (hoping the AI writes good code). Our pipeline enforces "Deterministic Physics"—using `dependency-cruiser` and `type-coverage` as literal brick walls that block the AI from proceeding if it hallucinates.
* **Where we fall short (The GAP):** According to Google standards, our pipeline lacks a streamlined *Review UI*. Currently, the human has to read `MISSION.md` and check terminal outputs. A standard practice would be integrating this directly into GitHub PRs (via GitHub Actions) so the human reviewer can see the AI's advisory report natively in the browser. 

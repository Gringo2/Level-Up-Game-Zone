# ADR-006: Test-Negative Validation Protocol

## Context
A critical vulnerability in AI-augmented software engineering is the "Vacuous Truth" problem in automated testing. When tasked with writing tests, AI Implementors often generate tautological tests—tests that mock out the core logic entirely or only execute the "Happy Path." Because these tests pass immediately upon execution, the AI assumes the mission is complete, despite the tests providing zero actual architectural security or fault tolerance.

To guarantee the integrity of our Zero-Trust architecture, tests must be proven to fail when the system is in an invalid state.

## Decision
We are adopting a strict **Test-Negative Validation Protocol** for all tests generated or modified by AI Implementors.

1. **Mandatory Red-Green Gating:** The AI Implementor is prohibited from locking a mission based solely on a "Green" (Passing) test suite if the tests were generated *after* the implementation. The AI must explicitly demonstrate a "Red" (Failing) state—either by writing the test before the implementation or by intentionally injecting a flaw into the implementation to prove the test catches it—before transitioning to a passing state.
2. **Negative Path Coverage Requirement:** "Happy Path" testing is no longer sufficient for mission completion. The AI must explicitly construct negative test cases that validate system failure modes, data boundary rejections, and unauthorized access attempts.
3. **Over-Mocking Prohibition:** The AI must not mock internal module logic or domain boundaries merely to satisfy a test runner. Mocking is strictly reserved for external side-effects (e.g., Database drivers, Network requests, System Time).

## Consequences
- **Positive:** Eradicates vacuous, tautological tests. Ensures the test suite actually guards against regressions. Forces the AI to think about failure states and error handling proactively.
- **Negative:** Slightly increases the verbosity of testing missions, as the AI must document the "Red" state execution before locking the code.
- **Mitigation:** The AI will execute these validations locally during the implementation phase and record the Red-Green transition as part of the formal evidence package, ensuring the human product owner does not have to manually verify the failure mode.

## Compliance
This decision is permanently codified as **Rule 28** in the `AGENTS.md` Engineering Constitution.

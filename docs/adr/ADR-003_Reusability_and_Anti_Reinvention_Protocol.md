# ADR-003: Reusability and Anti-Reinvention Protocol

## Context
With the integration of AI-assisted engineering into the repository, the cost of implementing custom, miniature utilities (e.g., date parsing, string manipulation, state machines) has dropped significantly. However, custom implementations incur "Invisible Technical Debt"—a permanent maintenance burden on human product owners who must debug, secure, and update these custom solutions over time.

To maintain a healthy, zero-trust architecture, we must distinguish between features that provide a **competitive advantage** (where custom implementation is required) and standard **plumbing** (where mature community dependencies or internal packages should be reused).

## Decision
We are adopting a strict **Anti-Reinvention Protocol** for all human and AI contributors.

1. **Codebase Reusability First:** If a utility or module already exists within the monorepo, it MUST be reused. Redundant local utilities are strictly forbidden.
2. **The "Plumbing" Test:** For new requirements, if the feature is generic plumbing (e.g., `date-fns`, `zod`, `clsx`), contributors must search for a mature `npm` package before attempting to build it from scratch.
3. **Evidence-Backed Adoption:** The AI Implementor is barred from hallucinating or arbitrarily selecting dependencies. It must actively research and provide objective evidence (maturity, security, maintainability) for any proposed package.
4. **Human Final Authority:** The AI is restricted to an *advisory* role when proposing new dependencies. The final decision to adopt a package ("buy") versus building it ("build") resides exclusively with the human User / Product Owner.

## Consequences
- **Positive:** Drastically reduces the surface area for bugs and edge-case errors. Decreases the long-term maintenance burden on human developers. Ensures the repository leverages battle-tested community standards.
- **Negative:** Introduces slight friction during the planning phase, as the AI must spend time executing searches and generating evidence reports before implementing code.
- **Mitigation:** The AI will explicitly declare its "Discovery Phase" findings in the Implementation Plan (ACP or Mission), allowing the human product owner to quickly approve or reject the dependency without manual research.

## Compliance
This decision is permanently codified as **Rule 25** in the `AGENTS.md` Engineering Constitution.

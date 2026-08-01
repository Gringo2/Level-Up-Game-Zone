# AFR-001: Architecture Friction Report Schema

## Context
When an implementor (human or AI) determines that a feature cannot be built cleanly within the constraints of the existing architecture, they must not introduce technical debt or "workarounds." Instead, they must halt implementation and file an Architecture Friction Report (AFR).

## Schema
Every AFR must contain:
1. **Friction Source:** Which component or interface is causing resistance?
2. **The Conflict:** Why does the new requirement conflict with the current architecture (e.g., ADRs, SYSTEM_CONTEXT.md)?
3. **Evidence:** Concrete proof (e.g., test failures, type errors, or circular dependency paths).
4. **Proposed Resolution:** Should we change the architecture (via an ACP) or redefine the feature scope?

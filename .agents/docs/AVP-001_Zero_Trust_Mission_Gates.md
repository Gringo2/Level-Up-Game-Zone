# AVP-001: Zero-Trust Mission Gates (6-Gate Protocol)

## Context
To prevent AI hallucination and architectural drift, the repository enforces a deterministic validation runtime before any mission can be marked as Locked.

## Protocol Mechanics
The `.agents/scripts/lock_mission.sh` script natively executes the 6-Gate Protocol:
1. **Gate 1 (Static Analysis):** Enforces AST/Linting rules (Biome/ESLint).
2. **Gate 2 (Type Integrity):** Enforces strict TypeScript bounds (`tsc -b`).
3. **Gate 3 (Unit Tests):** Verifies deterministic logic (`vitest`).
4. **Gate 4 (E2E Validation):** Verifies integration points (`playwright`).
5. **Gate 5 (Governance Evidence):** Uses strict regex parsing to physically verify the presence of four mandatory keywords ('Functional', 'Architectural', 'Dependency', 'ADR') strictly inside the '## Evidence Payload' section of `MISSION.md`.
6. **Gate 6 (Single Source of Truth - SSOT):** Auto-generates the Forbidden Dependency Matrix into `SYSTEM_CONTEXT.md` to strictly bind the prose documentation to the physical `.dependency-cruiser.js` invariants.

## Invariants
A mission cannot transition from ACTIVE to LOCKED unless all dynamically detected and installed tooling exits with code 0.

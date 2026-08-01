# ADR-006: IDE Interception Lifecycle (The .agents Runtime)

## Context
The repository enforces a Zero-Trust architecture by intercepting AI Implementor tool usage (file writes, replacements, and shell commands) via the Antigravity IDE `hooks.json`. Prior to this ADR, the physical lifecycle of these interceptions (Phases 0-5) existed in the code but lacked formal governance documentation, leading to architectural drift and orphaned policy references (e.g., the ghost `ARCH-010` policy).

## Decision
We formally document and adopt the 6-Phase IDE Interception Lifecycle as the official repository execution framework. The `.agents` directory serves as the physical cage enforcing these phases. 

### The 6-Phase Interception Lifecycle

#### Phase 0: WAKE Protocol Enforcement
*   **Hook:** `PreAgentResponse`
*   **Script:** `wake_summary.sh`
*   **Mechanism:** Injects the current Mission Status, Architecture Scope, Forbidden Dependency Matrix, and the exact installed library versions (parsed dynamically from `package.json`) into the AI Implementor's context before every response. Prevents the AI from operating blind or hallucinating external API versions.

#### Phase 1: Architecture Gate & Guardrail Self-Protection
*   **Hook:** `PreToolUse` (`write_to_file`, `replace_file_content`, `multi_replace_file_content`)
*   **Script:** `mission_gate.sh`
*   **Mechanism:** Physically blocks file modifications if the active `MISSION.md` is not in the "Active" state. Enforces self-protection by blocking edits to `.agents/` and all 7-binary runtime configuration files (e.g., `package.json`, `biome.json`, `.dependency-cruiser.js`) during "Feature" missions.

#### Phase 2: Transient Safety Nets
*   **Hook:** `PreToolUse` (`write_to_file`, etc., and `run_command`)
*   **Scripts:** `pre_edit_backup.sh`, `guard_run_command.sh`
*   **Mechanism:** Automatically creates an epoch-timestamped backup in `.agents/.scratch/` before any file is mutated. The `guard_run_command.sh` intercepts destructive bash patterns (`sed -i`, `rm`) and forcefully triggers backups before execution.

#### Phase 3: Micro-Verification & Transitive Blast Radius
*   **Hook:** `PostToolUse`
*   **Script:** `post_edit_verify.sh`
*   **Mechanism:** Executes a structural pattern check (AST-Grep), enforces the TDD Order Warning (Red-Green TDD), and uses `dependency-cruiser` to compute a full reverse-dependency graph. It dynamically injects only the affected transitive packages into TypeScript and Vitest for instantaneous targeted verification, while enforcing Biome/ESLint strictly on the mutated local package boundary.

#### Phase 4: Human-in-the-Loop Review
*   **Mechanism:** The AI Implementor pauses to request human review and approval for major architectural decisions, preventing autonomous drift.

#### Phase 5: Mission Lock Gate
*   **Hook:** Manual Execution (`bash lock_mission.sh`)
*   **Mechanism:** Enforces the AVP-001 Zero-Trust Mission Gates. Natively executes the 6-Gate protocol (Biome, TSC, Vitest, Playwright, Evidence Payload, SSOT) to rigorously verify structural boundaries and auto-sync `SYSTEM_CONTEXT.md` with `.dependency-cruiser.js`.

### The ADR-006 "No Autonomous Destruction" Policy
*(Formerly known as the orphaned ARCH-010 policy)*
To prevent data loss, the AI Implementor is physically forbidden from destructively deleting code autonomously. Tools like `knip` (Dead Code Analysis) are run strictly as **Advisory Scans** during Phase 5, requiring explicit Human Approval for removal.

## Consequences
- **Positive:** Future human architects and AI Implementors have a single source of truth for how the IDE hooks operate. Ghost policies are resolved.
- **Negative:** Any future changes to the `hooks.json` or `.agents/scripts/` lifecycle must be formally updated in this ADR to prevent documentation drift.

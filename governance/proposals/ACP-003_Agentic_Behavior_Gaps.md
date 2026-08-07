# Proposal: ACP-003 Agentic Behavior Gaps & Gating

## 1. Context and Problem Statement
The current AI interception system (`.agents/hooks.json` and associated scripts) effectively blocks unauthorized architectural mutations and prevents destructive shell commands (like `rm` or `sed -i`) on source directories. However, analyzing typical Large Language Model (LLM) behaviors reveals critical gaps in our guardrails that lead to resource waste, context degradation, and false completions:

1. **Context Window Overload (Output Diarrhea):** Commands with massive stdout (e.g., `cat package-lock.json` or `git log`) are unguarded, which can poison the agent's context window and cause it to forget mission parameters.
2. **Shotgun Debugging (Looping):** When `post_edit_verify.sh` fails, agents tend to immediately retry slightly altered edits without doing Root Cause Analysis (RCA), burning tokens and thrashing.
3. **Ghost File Littering:** While `mission_gate.sh` protects existing infrastructure files, there is no guard against the creation of unowned, ephemeral scratchpad files (`test.js`, `temp.ts`) in the repository, violating Rule 23 (Anti-Littering Protocol).
4. **Task Hallucination (False Completion):** The agent can declare a mission "Locked" by simply editing `MISSION.md` without actually executing the mandatory `lock_mission.sh` script or verifying `AVP-001` invariants.

## 2. Proposed Solution
We propose adding the following interception hooks and script enhancements to `.agents/`:

1. **Context Guard (`guard_run_command.sh` Update):**
   - Intercept commands known to produce massive output (e.g., `cat`, `git log`, `npm ls`).
   - Automatically pipe them through a paginator or `head -n 50`, or warn the agent to use targeted tools instead.
2. **Exhaustion Enforcement Hook:**
   - Introduce a stateful failure counter in `.agents/.scratch/`.
   - If a file fails `post_edit_verify.sh` 3 times consecutively, forcefully block further `write_to_file` operations on that file until an `RCA.md` file is generated.
3. **Anti-Littering Gate (`mission_gate.sh` Update):**
   - Block `write_to_file` if the target path does not conform to the repository structure (e.g., blocking `.js` or `.ts` files created in the repository root outside of `packages/` or `tests/`).
4. **Mission Lock Gating (`hooks.json` Update):**
   - Bind `PreToolUse` on `write_to_file` targeting `MISSION.md`. If the status is being changed to `Locked`, automatically execute `lock_mission.sh` to enforce the `AVP-001` fitness functions programmatically.

## 3. Alternative Options
- **Relying solely on `AGENTS.md` prose:** Rejected. LLMs forget prose instructions over long contexts. Deterministic shell hooks are the only reliable enforcement mechanism for zero-trust pipelines.
- **IDE-side rate limiting:** Rejected. The governance should live in the repository so it is portable across different AI tooling environments.

## 4. Consequences
- **Easier:** Prevents token burning, enforces cleaner workspace states, and guarantees missions are actually verified before locking.
- **Harder:** Agents might get "stuck" if they genuinely need a large file context and don't know how to bypass the context guard, requiring human intervention.

## 5. Affected Documents
- `.agents/hooks.json`
- `.agents/scripts/guard_run_command.sh`
- `.agents/scripts/mission_gate.sh`

## 6. Action Items
- [ ] Update `guard_run_command.sh` to include stdout volume limits.
- [ ] Implement stateful rate-limiting for `post_edit_verify.sh` failures.
- [ ] Update `mission_gate.sh` to reject arbitrary file creation in the repo root.
- [ ] Add the Mission Lock interceptor to `hooks.json`.

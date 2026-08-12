# ADR-007: Antigravity IDE Specification Hooks Lifecycle

## Context
The repository operates under a Zero-Trust Architecture enforced by the Google Antigravity IDE `hooks.json` engine. ADR-006 documented our local 6-Phase Interception Lifecycle (`PreAgentResponse`, `PreToolUse`, `PostToolUse`). This ADR formally codifies the complete **Google Antigravity Specification Hooks Lifecycle** as defined in the official specification (`https://antigravity.google/docs/hooks`), establishing standard event contracts, input/output JSON schemas, and execution control semantics.

---

## Decision
We formally adopt the **Google Antigravity Specification Hooks Lifecycle** as the authoritative standard for all IDE event interception within `.agents`.

### The 5 Core Lifecycle Events

```
Antigravity Execution Loop
 ├── 1. PreInvocation (Fires before model generation) ──────────> Inject Ephemeral System Rules & Tool Calls
 ├── 2. PreToolUse (Fires before tool execution) ───────────────> Native JSON Decision Engine ("deny", "ask", "allow")
 ├── 3. PostToolUse (Fires after tool completion) ──────────────> Blast Radius Micro-Verification & TDD Gating
 ├── 4. PostInvocation (Fires after model response) ────────────> Programmatic Loop Control ("force_continue")
 └── 5. Stop (Fires upon loop termination) ─────────────────────> Workspace Cleanup & Execution Ledger Seal
```

---

## Event Specifications & Input/Output Contracts

### 1. `PreInvocation` (Pre-Generation Trajectory Control)
- **Fires**: Before Antigravity invokes the LLM for a response turn.
- **Input (stdin)**: `invocationNum`, `initialNumSteps`, `conversationId`, `workspacePaths`, `transcriptPath`, `artifactDirectoryPath`, `modelName`.
- **Output (stdout)**:
  ```json
  {
    "injectSteps": [
      { "ephemeralMessage": "⚡ WAKE PROTOCOL: Active Mission M-21 (Scope: .agents/*)" }
    ]
  }
  ```
- **Semantics**: Allows background scripts to inject transient system guidelines, user messages, or mandatory pre-requisite tool calls into the trajectory stream before generation starts.

---

### 2. `PreToolUse` (Pre-Execution Native Decision Engine)
- **Fires**: Before a tool (`run_command`, `write_to_file`, `replace_file_content`, `multi_replace_file_content`) is executed.
- **Input (stdin)**: `toolCall` (`name` and `args`), `stepIdx`, and system common metadata.
- **Output (stdout)**:
  ```json
  {
    "decision": "deny",
    "reason": "🚫 MISSION GATE BLOCKED: Mission status is Locked. Must be Active to edit source files.",
    "permissionOverrides": ["command(npm test)"]
  }
  ```
- **Supported Decision Values**:
  - `"allow"`: Automatically permits tool execution without prompt.
  - `"deny"`: Hard-blocks tool execution immediately.
  - `"ask"`: Prompts the user in the UI, respecting cached permissions.
  - `"force_ask"`: Forces an interactive UI prompt, ignoring cached grants.
  - `"deny_unless_prior_grant"`: Denies execution unless previously approved in a prior grant.

---

### 3. `PostToolUse` (Post-Execution Blast Radius Verification)
- **Fires**: Immediately after a tool completes execution.
- **Input (stdin)**: `toolCall` (`name` and `args`), `stepIdx`, `error` (empty string if success, error message if failed), and common metadata.
- **Output (stdout)**: Empty JSON object `{}`.
- **Semantics**: Executes sub-50ms AST scans (`ast-grep`), calculates 100% transitive blast radius (`depcruise`), typechecks affected packages (`tsc`), runs targeted unit tests (`vitest`), and logs append-only execution ledger events (`.agents/ledger.jsonl`).

---

### 4. `PostInvocation` (Post-Generation Loop Control)
- **Fires**: Immediately after the model invocation finishes generating response steps.
- **Input (stdin)**: `invocationNum`, `initialNumSteps`, and system common metadata.
- **Output (stdout)**:
  ```json
  {
    "injectSteps": [
      { "ephemeralMessage": "🚨 Gate failure detected! Resolving issues before turn ends." }
    ],
    "terminationBehavior": "force_continue"
  }
  ```
- **Supported Termination Behaviors**:
  - `"force_continue"`: Forces the Antigravity execution loop to continue running.
  - `"terminate"`: Forces the execution loop to terminate immediately.
  - `""` (or omitted): Default standard execution flow.

---

### 5. `Stop` (Execution Loop Termination)
- **Fires**: When the entire agent execution turn loop terminates.
- **Input (stdin)**: System common metadata and transcript log path (`transcriptPath`).
- **Output (stdout)**: Empty JSON object `{}`.
- **Semantics**: Purges transient scratchpad files (`.agents/.scratch/`), closes diagnostic file handles, and seals the final session log in `.agents/ledger.jsonl`.

---

## Common System Metadata Contract (stdin)

All hook events receive standard JSON payloads on `stdin`:

| Field | Type | Description |
|---|---|---|
| `conversationId` | `string` | Unique UUID of the active conversation. |
| `workspacePaths` | `string[]` | Absolute directory paths of mounted user workspaces. |
| `transcriptPath` | `string` | Absolute path to persistent `transcript.jsonl` conversation log. |
| `artifactDirectoryPath` | `string` | Absolute path to conversation artifacts directory. |
| `modelName` | `string` | Identifier of model handling the turn (e.g. `gemini-3.6-flash-medium`). |

---

## Upgrade & Migration Roadmap
Future governance missions upgrading `.agents` hooks must target these specification features:
1. **Migration to Native `PreToolUse` Decisions**: Refactor `mission_gate.sh` and `guard_run_command.sh` to output structured JSON decisions (`{"decision": "deny", "reason": "..."}`) on stdout.
2. **Trajectory Injection**: Upgrade `wake_summary.sh` to leverage `PreInvocation` structured `injectSteps` for ephemeral context injection.
3. **Loop Continuation Guard**: Integrate `PostInvocation` to issue `"terminationBehavior": "force_continue"` when unverified blast-radius errors occur.

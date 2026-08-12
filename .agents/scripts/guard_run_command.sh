#!/bin/bash
# guard_run_command.sh — Guards destructive shell commands on source directories.
# Phase 2: Shell Safety Net (ADR-007)
# Intercepts destructive patterns or context-flooding commands and returns native JSON decisions.

COMMAND="$1"
REPO_ROOT="$(git rev-parse --show-toplevel)"

# --- Context Window Guard ---
if echo "$COMMAND" | grep -qE "(^cat .*(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.log$)|git log|npm (ls|list)|depcruise )"; then
  if ! echo "$COMMAND" | grep -qE "(\| head|\| grep|\| tail|>|>>)"; then
    node -e 'console.log(JSON.stringify({decision: "deny", reason: process.argv[1]}))' "🚫 CONTEXT GUARD BLOCK: Command produces massive stdout output. Use view_file or pipe to head/grep (e.g. | head -n 50)."
    exit 1
  fi
fi

# Fast-exit: only guard destructive commands that touch source directories
if ! echo "$COMMAND" | grep -qE "(packages/|apps/)"; then
  node -e 'console.log(JSON.stringify({decision: "allow", reason: "Command permitted."}))'
  exit 0
fi

# Patterns that can mutate or delete source files
DESTRUCTIVE_PATTERNS=("sed -i" "rm " "rm -r" "rm -f" "mv " "cp -f" "truncate" "tee ")

for pattern in "${DESTRUCTIVE_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -q "$pattern"; then
    POSSIBLE_FILE=$(echo "$COMMAND" | grep -oE '[^ ]+\.(ts|tsx|js|jsx|json|md)' | head -1)
    if [ -n "$POSSIBLE_FILE" ]; then
      FULL_PATH="$REPO_ROOT/$POSSIBLE_FILE"
      [ -f "$POSSIBLE_FILE" ] && FULL_PATH="$POSSIBLE_FILE"
      if [ -f "$FULL_PATH" ]; then
        bash "$REPO_ROOT/.agents/scripts/pre_edit_backup.sh" "$FULL_PATH" >&2
      fi
    fi

    node -e 'console.log(JSON.stringify({decision: "allow", reason: "Destructive pattern backed up to .agents/.scratch/."}))'
    exit 0
  fi
done

node -e 'console.log(JSON.stringify({decision: "allow", reason: "Command permitted."}))'
exit 0

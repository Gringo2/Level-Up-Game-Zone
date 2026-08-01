#!/bin/bash
# guard_run_command.sh — Guards destructive shell commands on source directories.
# Phase 2: Shell Safety Net
# Gap 5 Fix: run_command was completely unguarded. This intercepts destructive
# patterns (sed -i, rm, mv, etc.) targeting packages/ or apps/.
# Usage: bash guard_run_command.sh "<full command string>"

COMMAND="$1"
REPO_ROOT="$(git rev-parse --show-toplevel)"

# Fast-exit: only guard commands that touch source directories
if ! echo "$COMMAND" | grep -qE "(packages/|apps/)"; then
  exit 0
fi

# Patterns that can mutate or delete source files
DESTRUCTIVE_PATTERNS=("sed -i" "rm " "rm -r" "rm -f" "mv " "cp -f" "truncate" "tee ")

for pattern in "${DESTRUCTIVE_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -q "$pattern"; then
    echo "⚠️  DESTRUCTIVE COMMAND DETECTED: '$pattern' targeting source directory."
    echo "Attempting auto-backup of affected file(s) before execution..."

    # Heuristically extract the first source file path from the command
    POSSIBLE_FILE=$(echo "$COMMAND" | grep -oE '[^ ]+\.(ts|tsx|js|jsx|json|md)' | head -1)
    if [ -n "$POSSIBLE_FILE" ]; then
      # Handle both relative and absolute paths
      FULL_PATH="$REPO_ROOT/$POSSIBLE_FILE"
      [ -f "$POSSIBLE_FILE" ] && FULL_PATH="$POSSIBLE_FILE"
      if [ -f "$FULL_PATH" ]; then
        bash "$REPO_ROOT/.agents/scripts/pre_edit_backup.sh" "$FULL_PATH"
      fi
    fi

    echo "ℹ️  Command will proceed. Restore from .agents/.scratch/ if needed."
    exit 0
  fi
done

exit 0

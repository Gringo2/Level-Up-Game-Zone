#!/bin/bash
# stop_cleanup.sh — Turn completion cleanup & ledger seal for the Stop event (ADR-007)

REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRATCH_DIR="$REPO_ROOT/.agents/.scratch"
LEDGER_SCRIPT="$REPO_ROOT/.agents/scripts/log_ledger.sh"

# 1. Purge scratch files older than 24 hours to prevent workspace littering
if [ -d "$SCRATCH_DIR" ]; then
  find "$SCRATCH_DIR" -type f -mtime +1 -delete 2>/dev/null
fi

# 2. Record Stop event in Execution Ledger
if [ -f "$LEDGER_SCRIPT" ]; then
  bash "$LEDGER_SCRIPT" "Stop" "turn_completion" "workspace" "SUCCESS" 0
fi

# Return valid Stop event response
echo "{}"
exit 0

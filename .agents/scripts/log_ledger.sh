#!/bin/bash
# log_ledger.sh — Append-only Execution Ledger Logger
# Component 10: Execution Ledger (ADR-007 Stdin & CLI Ingestion)
# Usage:
#   bash .agents/scripts/log_ledger.sh "<event_type>" "<tool_name>" "<target_file>" "<status>" "<exit_code>"

EVENT_TYPE="${1:-PreToolUse}"
TOOL_NAME="${2:-unknown}"
TARGET_FILE="${3:-}"
STATUS="${4:-SUCCESS}"
EXIT_CODE="${5:-0}"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$REPO_ROOT" ] && REPO_ROOT="."

LEDGER_DIR="$REPO_ROOT/.agents"
LEDGER_FILE="$LEDGER_DIR/ledger.jsonl"

mkdir -p "$LEDGER_DIR"

node -e '
  const fs = require("fs");
  const eventType = process.argv[1];
  const toolName = process.argv[2];
  const targetFile = process.argv[3];
  const status = process.argv[4];
  const exitCode = parseInt(process.argv[5] || "0", 10);
  const ledgerPath = process.argv[6];

  let stdinMeta = {};
  try {
    const raw = fs.readFileSync(0, "utf-8");
    if (raw && raw.trim()) {
      stdinMeta = JSON.parse(raw);
    }
  } catch (e) {}

  const entry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    tool: stdinMeta.toolCall?.name || toolName,
    target: stdinMeta.toolCall?.args?.TargetFile || stdinMeta.toolCall?.args?.CommandLine || targetFile,
    status: status,
    exitCode: exitCode,
    conversationId: stdinMeta.conversationId || undefined,
    stepIdx: stdinMeta.stepIdx !== undefined ? stdinMeta.stepIdx : undefined,
    modelName: stdinMeta.modelName || undefined
  };

  fs.appendFileSync(ledgerPath, JSON.stringify(entry) + "\n");
' "$EVENT_TYPE" "$TOOL_NAME" "$TARGET_FILE" "$STATUS" "$EXIT_CODE" "$LEDGER_FILE" 2>/dev/null

echo "{}"
exit 0

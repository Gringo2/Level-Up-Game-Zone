#!/bin/bash
# lock_gate.sh — Task Hallucination Guard (ACP-003)
# PostToolUse hook for MISSION.md

TARGET_FILE="$1"
REPO_ROOT="$(git rev-parse --show-toplevel)"
MISSION_FILE="$REPO_ROOT/governance/MISSION.md"

if [ "$TARGET_FILE" != "$MISSION_FILE" ]; then
  exit 0
fi

# Check current status on disk
MISSION_STATUS=$(node -e 'const fs=require("fs"); const m=fs.readFileSync(process.argv[1],"utf8").match(/\*\*Status:\*\*\s*(\w+)/i); console.log(m?m[1]:"");' "$MISSION_FILE" 2>/dev/null)

if [ "$MISSION_STATUS" == "Locked" ]; then
  echo "🔒 MISSION LOCK DETECTED. Executing AVP-001 Validation Protocol..."
  bash "$REPO_ROOT/.agents/scripts/lock_mission.sh"
  if [ $? -ne 0 ]; then
    echo "🚨 TASK HALLUCINATION GUARD: AVP-001 Validation Failed!"
    echo "   The mission cannot be locked until all fitness functions pass."
    echo "   Reverting MISSION.md status to 'Active'."
    # Revert to Active
    sed -i 's/\*\*Status:\*\* Locked/\*\*Status:\*\* Active/i' "$MISSION_FILE"
    exit 1
  else
    echo "✅ AVP-001 Passed. Mission successfully locked."
  fi
fi

exit 0

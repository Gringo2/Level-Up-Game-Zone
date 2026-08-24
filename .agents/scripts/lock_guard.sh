#!/bin/bash
# lock_guard.sh — Enforced Pre-Commit Mission Lock (ACP-005)
# Last pre-commit job. If the active mission is complete-but-unlocked
# (MISSION.md status Active + all Evidence Payload boxes checked), runs the
# full AVP-001 lock suite via lock_mission.sh and flips MISSION.md to Locked
# BEFORE the commit is accepted. On gate failure the commit is blocked.
#
# Usage: invoked from .husky/pre-commit (no arguments)

set -u

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
MISSION_FILE="$REPO_ROOT/governance/MISSION.md"

# Fast exit when this is not a governed repo or MISSION.md is missing
if [ ! -f "$MISSION_FILE" ]; then
  exit 0
fi

# ── 2.1 Completion pre-check (fast, text-only) ──
MISSION_STATUS=$(node -e 'const fs=require("fs");const m=fs.readFileSync(process.argv[1],"utf8").match(/\*\*Status:\*\*\s*(\w+)/i);console.log(m?m[1]:"");' "$MISSION_FILE" 2>/dev/null)
if [ "$MISSION_STATUS" != "Active" ]; then
  exit 0
fi

MISSION_ID=$(node -e 'const fs=require("fs");const m=fs.readFileSync(process.argv[1],"utf8").match(/\*\*Mission:\*\*\s*(M-\d+)/);console.log(m?m[1]:"");' "$MISSION_FILE" 2>/dev/null)
if [ -z "$MISSION_ID" ]; then
  exit 0
fi

EVIDENCE_SECTION=$(awk '/## .*Evidence Payload/ {flag=1; next} /^## / {flag=0} flag' "$MISSION_FILE" 2>/dev/null)
if [ -z "$EVIDENCE_SECTION" ]; then
  exit 0
fi

# ── 2.1b Structural completion check (AFR-003 remediation, M-84) ──
# Decoupled from payload wording: a mission is "complete" when its Evidence
# Payload section contains at least one checked box and ZERO unchecked boxes.
CHECKED_COUNT=$(echo "$EVIDENCE_SECTION" | grep -Eic '^[[:space:]]*- \[x\]' || true)
UNCHECKED_LINES=$(echo "$EVIDENCE_SECTION" | grep -Eni '^[[:space:]]*- \[ \]' || true)

if [ "$CHECKED_COUNT" -gt 0 ] && [ -z "$UNCHECKED_LINES" ]; then
  : # complete → fall through to enforced lock run
else
  # Fail-loud (never silent): make the skip reason visible in commit output.
  if [ -n "$UNCHECKED_LINES" ]; then
    echo ""
    echo "ℹ️  [lock_guard] Mission $MISSION_ID is Active with unchecked Evidence Payload boxes — auto-lock skipped (mission still in progress)."
    echo "$(echo "$UNCHECKED_LINES" | sed 's/^/    /')"
  else
    echo ""
    echo "⚠️  [lock_guard] Mission $MISSION_ID is Active but its Evidence Payload has no checkboxes at all — auto-lock skipped. Verify the payload format."
  fi
  exit 0
fi

# ── 2.2 Enforced lock run ──
echo ""
echo "🔒 [lock_guard] Mission $MISSION_ID is complete but not Locked. Running AVP-001 lock suite..."
echo "    (this is the last pre-commit job; MISSION.md will be flipped to Locked before this commit lands)"

bash "$REPO_ROOT/.agents/scripts/lock_mission.sh" "$MISSION_ID"
LOCK_STATUS=$?

if [ $LOCK_STATUS -ne 0 ]; then
  echo ""
  echo "❌ [lock_guard] COMMIT BLOCKED: Mission $MISSION_ID failed the AVP-001 lock gates."
  echo "    Fix the issues above and commit again — a complete mission cannot be committed while Active."
  exit 1
fi

# Lock succeeded — stage the lock outputs so the in-flight commit captures the Locked state
for LOCK_OUTPUT in \
  "$REPO_ROOT/governance/MISSION.md" \
  "$REPO_ROOT/governance/SYSTEM_CONTEXT.md" \
  "$REPO_ROOT/.agents/evidence_packet.json" \
  "$REPO_ROOT/.agents/evidence_packets/$MISSION_ID.json"
do
  if [ -f "$LOCK_OUTPUT" ]; then
    git add "$LOCK_OUTPUT" 2>/dev/null
  fi
done

echo "✅ [lock_guard] Mission $MISSION_ID LOCKED. Lock artifacts staged into this commit."
exit 0

#!/bin/bash
# contradiction_detector.sh — Static & Policy Contradiction Detector
# Component 7: Contradiction Detector
# Usage:
#   bash .agents/scripts/contradiction_detector.sh "<target_file>"

TARGET_FILE="$1"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$REPO_ROOT" ] && REPO_ROOT="."

if [ -z "$TARGET_FILE" ]; then
  echo "✅ CONTRADICTION DETECTOR: No target file specified. Passing."
  exit 0
fi

MISSION_FILE="$REPO_ROOT/governance/MISSION.md"
RELATIVE_PATH="${TARGET_FILE#$REPO_ROOT/}"
RELATIVE_PATH="${RELATIVE_PATH#/}"

echo "🔍 CONTRADICTION DETECTOR: Checking [$RELATIVE_PATH] for architectural contradictions..."

# 1. Scope Boundary Contradiction against MISSION.md
if [ -f "$MISSION_FILE" ]; then
  OUT_OF_SCOPE=$(awk '/- \*\*Out of Scope:\*\*/{flag=1; next} /^## /{flag=0} flag' "$MISSION_FILE" 2>/dev/null)
  
  if echo "$OUT_OF_SCOPE" | grep -qi "$RELATIVE_PATH"; then
    echo "🚨 SCOPE CONTRADICTION DETECTED!"
    echo "   Target file [$RELATIVE_PATH] is explicitly listed under '**Out of Scope:**' in MISSION.md."
    exit 1
  fi
fi

# 2. Cross-Boundary Architectural Import Contradiction Check
# Fast static check: Client package importing Server logic directly
if [[ "$RELATIVE_PATH" == packages/client/* ]]; then
  if [ -f "$TARGET_FILE" ] && grep -qE "from ['\"].*packages/server" "$TARGET_FILE"; then
    echo "🚨 ARCHITECTURAL CONTRADICTION DETECTED!"
    echo "   Client file [$RELATIVE_PATH] imports directly from server package."
    echo "   Violates Zero-Trust Thin Client architectural invariant."
    exit 1
  fi
fi

# 3. AST Structural Pattern Contradiction Check via ast-grep
if [ -f "$REPO_ROOT/sgconfig.yml" ]; then
  AST_CHECK=$(npx -y ast-grep scan 2>&1)
  if [ $? -ne 0 ]; then
    echo "🚨 AST PATTERN CONTRADICTION DETECTED!"
    echo "   $AST_CHECK"
    exit 1
  fi
fi

echo "✅ CONTRADICTION DETECTOR: Zero contradictions found for [$RELATIVE_PATH]."
exit 0

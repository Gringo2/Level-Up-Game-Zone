#!/bin/bash
# mission_gate.sh — Blocks source file edits if MISSION.md status is not Active
# Phase 1: Architecture Gate enforcement & Guardrail Self-Protection

TARGET_FILE="$1"
REPO_ROOT="$(git rev-parse --show-toplevel)"
RELATIVE_PATH=""

if [ -n "$TARGET_FILE" ]; then
  RELATIVE_PATH="${TARGET_FILE#$REPO_ROOT/}"
  RELATIVE_PATH="${RELATIVE_PATH#/}"
fi

MISSION_FILE="$REPO_ROOT/governance/MISSION.md"

# --- Phase 6: Anti-Littering Protocol Gate (ACP-003) ---
if [[ -n "$RELATIVE_PATH" ]] && [[ ! "$RELATIVE_PATH" == */* ]]; then
  if [[ ! "$RELATIVE_PATH" =~ ^(package\.json|biome\.json|knip\.json|tsconfig\.json|sgconfig\.yml|README\.md|\.gitignore|\.dependency-cruiser\.js)$ ]]; then
    echo "🚫 ANTI-LITTERING PROTOCOL BLOCKED: Unowned file [$RELATIVE_PATH] in repository root."
    echo "   Rule 23 forbids persistent scratchpads. Use .agents/.scratch/ for temporary work."
    exit 1
  fi
fi

# 1. Self-Protecting Guardrail Rail: Protect infrastructure from unauthorized edits
IS_INFRA=0
if [[ -n "$RELATIVE_PATH" ]]; then
  if [[ "$RELATIVE_PATH" == .agents/* ]] || \
     [[ "$RELATIVE_PATH" == .dependency-cruiser.js ]] || \
     [[ "$RELATIVE_PATH" == biome.json ]] || \
     [[ "$RELATIVE_PATH" == knip.json ]] || \
     [[ "$RELATIVE_PATH" == package.json ]] || \
     [[ "$RELATIVE_PATH" == sgconfig.yml ]] || \
     [[ "$RELATIVE_PATH" == tsconfig.json ]] || \
     [[ "$RELATIVE_PATH" == vitest.config.* ]] || \
     [[ "$RELATIVE_PATH" == playwright.config.* ]]; then
    IS_INFRA=1
  fi
fi

if [ $IS_INFRA -eq 1 ]; then
  MISSION_TYPE=$(node -e 'const fs=require("fs"); const m=fs.readFileSync(process.argv[1],"utf8").match(/\*\*Type:\*\*\s*(\w+)/i); console.log(m?m[1]:"");' "$MISSION_FILE" 2>/dev/null)
  
  if [ "$MISSION_TYPE" != "Governance" ] && [ "$MISSION_TYPE" != "Infrastructure" ]; then
    echo ""
    echo "🚨 SECURITY VIOLATION: Guardrail Self-Protection Block!"
    echo "   Target file [$RELATIVE_PATH] is protected infrastructure."
    echo "   Modifications to infrastructure files are strictly forbidden during [${MISSION_TYPE:-Feature}] missions."
    echo "   Requires an active Mission with **Type:** Governance or **Type:** Infrastructure."
    echo ""
    exit 1
  fi
fi

# 2. Check on MISSION_STATUS
MISSION_STATUS=$(node -e 'const fs=require("fs"); const m=fs.readFileSync(process.argv[1],"utf8").match(/\*\*Status:\*\*\s*(\w+)/i); console.log(m?m[1]:"");' "$MISSION_FILE" 2>/dev/null)

if [ "$MISSION_STATUS" != "Active" ]; then
  echo "🚫 MISSION GATE BLOCKED: Mission status is [${MISSION_STATUS:-Draft}]. Must be [Active]."
  exit 1
fi

# 3. Mandatory Section Validation
if ! grep -q "## 3. Scope & Boundaries" "$MISSION_FILE" || ! grep -q "## Evidence Payload" "$MISSION_FILE"; then
  echo "🚫 MISSION GATE BLOCKED: Schema Validation Failed."
  echo "   MISSION.md is missing mandatory anchors: '## 3. Scope & Boundaries' and '## Evidence Payload'."
  exit 1
fi

echo "✅ MISSION GATE: Status=Active. Edits permitted."
exit 0

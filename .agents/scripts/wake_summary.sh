#!/bin/bash
# wake_summary.sh — Compressed governance + version snapshot for the AI.
# Phase 0: WAKE Protocol enforcement
# Gap 3 Fix: Injects real installed library versions to prevent API hallucination.

REPO_ROOT="$(git rev-parse --show-toplevel)"
SYSTEM_CONTEXT="$REPO_ROOT/governance/SYSTEM_CONTEXT.md"
MISSION="$REPO_ROOT/governance/MISSION.md"
PKG="$REPO_ROOT/package.json"

PHASE=$(grep "Current Phase:" "$SYSTEM_CONTEXT" | head -1)
MISSION_ID=$(grep "Current Mission:" "$SYSTEM_CONTEXT" | head -1)
MISSION_STATUS=$(grep "\*\*Status:\*\*" "$MISSION" | head -1)
FORBIDDEN=$(awk '/Forbidden Dependency Matrix/,/^$/' "$SYSTEM_CONTEXT")
SCOPE=$(awk '/## 3. Scope & Boundaries/{flag=1; next} /^## /{flag=0} flag' "$MISSION" | head -20)

cat <<EOF
⚡ WAKE PROTOCOL — GOVERNANCE SNAPSHOT
$PHASE | $MISSION_ID | $MISSION_STATUS

FORBIDDEN DEPENDENCY MATRIX (violations BLOCK deployment):
$FORBIDDEN

ACTIVE MISSION SCOPE:
$SCOPE

EOF

# Extract top 5 dependencies and devDependencies generically to prevent API hallucination
node -e '
const fs = require("fs");
try {
  const pkg = JSON.parse(fs.readFileSync("'"$PKG"'", "utf8"));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const keys = Object.keys(deps).filter(k => !k.startsWith("@types/")).slice(0, 10);
  console.log("INSTALLED LIBRARY VERSIONS (use these — do NOT rely on pre-training memory):");
  if (keys.length === 0) {
    console.log("  No significant dependencies found in root package.json");
  } else {
    keys.forEach(k => console.log(`  ${k} : ${deps[k]}`));
  }
} catch (e) {
  console.log("INSTALLED LIBRARY VERSIONS (use these — do NOT rely on pre-training memory):");
  console.log("  Unable to parse package.json");
}
'

cat <<EOF

RULES:
  1. Never assume file paths. Probe with list_dir/grep_search first.
  2. Never assume API shapes. Check node_modules/<pkg>/index.d.ts before use.
  3. Read full governance docs with view_file ONLY if above is insufficient.
EOF

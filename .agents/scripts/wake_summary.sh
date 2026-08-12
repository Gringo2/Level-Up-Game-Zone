#!/bin/bash
# wake_summary.sh — Compressed governance + version snapshot for the AI.
# Phase 0: WAKE Protocol enforcement (ADR-007 PreInvocation JSON injectSteps Schema)

REPO_ROOT="$(git rev-parse --show-toplevel)"
SYSTEM_CONTEXT="$REPO_ROOT/governance/SYSTEM_CONTEXT.md"
MISSION="$REPO_ROOT/governance/MISSION.md"
PKG="$REPO_ROOT/package.json"

PHASE=$(grep "Current Phase:" "$SYSTEM_CONTEXT" | head -1)
MISSION_ID=$(grep "Current Mission:" "$SYSTEM_CONTEXT" | head -1)
MISSION_STATUS=$(grep "\*\*Status:\*\*" "$MISSION" | head -1)
FORBIDDEN=$(awk '/Forbidden Dependency Matrix/,/^$/' "$SYSTEM_CONTEXT")
SCOPE=$(awk '/## 3. Scope & Boundaries/{flag=1; next} /^## /{flag=0} flag' "$MISSION" | head -20)

# Build the snapshot content in bash/node and serialize cleanly into injectSteps JSON
node -e '
const fs = require("fs");

const phase = process.argv[1];
const missionId = process.argv[2];
const missionStatus = process.argv[3];
const forbidden = process.argv[4];
const scope = process.argv[5];
const pkgPath = process.argv[6];

let versionText = "  No significant dependencies found in root package.json";
try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const keys = Object.keys(deps).filter(k => !k.startsWith("@types/")).slice(0, 10);
  if (keys.length > 0) {
    versionText = keys.map(k => `  ${k} : ${deps[k]}`).join("\n");
  }
} catch (e) {
  versionText = "  Unable to parse package.json";
}

const msg = `⚡ WAKE PROTOCOL — GOVERNANCE SNAPSHOT
${phase} | ${missionId} | ${missionStatus}

FORBIDDEN DEPENDENCY MATRIX:
${forbidden}

ACTIVE MISSION SCOPE:
${scope}

INSTALLED LIBRARY VERSIONS (use these — do NOT rely on pre-training memory):
${versionText}

RULES:
  1. Never assume file paths. Probe with list_dir/grep_search first.
  2. Never assume API shapes. Check node_modules/<pkg>/index.d.ts before use.
  3. Read full governance docs with view_file ONLY if above is insufficient.`;

console.log(JSON.stringify({
  injectSteps: [
    { ephemeralMessage: msg }
  ]
}));
' "$PHASE" "$MISSION_ID" "$MISSION_STATUS" "$FORBIDDEN" "$SCOPE" "$PKG"

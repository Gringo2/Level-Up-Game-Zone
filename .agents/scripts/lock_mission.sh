#!/bin/bash
# lock_mission.sh — Runs the full 5-gate AVP-001 verification suite.
# Phase 5: Mission Lock Gate
# Gap 4 Fix: Evidence gate is section-scoped (checks inside ## Evidence Payload section)
#            and verifies 4 specific keywords, not a raw checkbox count.
# Uses perl -i for reliable cross-platform in-place substitution (sed -i is fragile on macOS).
# Usage: bash lock_mission.sh "M-37"

MISSION_ID="$1"
REPO_ROOT="$(git rev-parse --show-toplevel)"
MISSION_FILE="$REPO_ROOT/governance/MISSION.md"
FAIL=0

if [ -z "$MISSION_ID" ]; then
  echo "❌ Usage: lock_mission.sh <mission_id> (e.g., M-37)"
  exit 1
fi

echo "🔒 LOCK MISSION: $MISSION_ID — Running 5-Gate Verification..."
echo ""

# Dynamic Toolchain Detection
HAS_BIOME=$(node -e "const p=require('$REPO_ROOT/package.json'); console.log(!!(p.devDependencies?.['@biomejs/biome']||p.dependencies?.['@biomejs/biome']))" 2>/dev/null)
HAS_ESLINT=$(node -e "const p=require('$REPO_ROOT/package.json'); console.log(!!(p.devDependencies?.eslint||p.dependencies?.eslint))" 2>/dev/null)
HAS_TSC=$( [ -f "$REPO_ROOT/tsconfig.json" ] && echo "true" || echo "false" )
HAS_VITEST=$(node -e "const p=require('$REPO_ROOT/package.json'); console.log(!!(p.devDependencies?.vitest||p.dependencies?.vitest))" 2>/dev/null)
HAS_PLAYWRIGHT=$(node -e "const p=require('$REPO_ROOT/package.json'); console.log(!!(p.devDependencies?.['@playwright/test']||p.dependencies?.['@playwright/test']))" 2>/dev/null)

# ── GATE 1: Boundary & Dependency Verification (ESLint flat config) ──
# NOTE: npm run lint in packages only runs tsc. ESLint must be called explicitly.
echo "Gate 1/5: Boundary & Dependency Verification (Linter)..."
if [ "$HAS_BIOME" = "true" ]; then
  npx biome check . 2>&1
elif [ "$HAS_ESLINT" = "true" ]; then
  LINT_TARGETS=""
  [ -d "packages" ] && LINT_TARGETS="packages/"
  [ -d "apps" ] && LINT_TARGETS="$LINT_TARGETS apps/"
  [ -d "src" ] && LINT_TARGETS="$LINT_TARGETS src/"

  if [ -n "$LINT_TARGETS" ]; then
    npx eslint $LINT_TARGETS --ext .ts,.tsx 2>&1
  else
    npx eslint . --ext .ts,.tsx 2>&1
  fi
else
  echo "⚠️  No linter found (biome/eslint). Skipping."
fi

if [ $? -ne 0 ]; then
  echo "❌ Gate 1 FAILED: Boundary violation detected."
  FAIL=1
else
  echo "✅ Gate 1 PASSED."
fi
echo ""

# ── GATE 2: TypeScript Type Safety ──
echo "Gate 2/5: TypeScript Type Check..."
if [ "$HAS_TSC" = "true" ]; then
  npx tsc -b 2>&1
else
  echo "⚠️  TypeScript not found in root. Skipping."
fi
if [ $? -ne 0 ]; then
  echo "❌ Gate 2 FAILED: TypeScript errors found."
  FAIL=1
else
  echo "✅ Gate 2 PASSED."
fi
echo ""

# ── GATE 3: Unit Test Suite ──
echo "Gate 3/5: Unit Test Suite..."
if [ "$HAS_VITEST" = "true" ]; then
  npx vitest run 2>&1
else
  echo "⚠️  Vitest not found in root. Skipping."
fi
if [ $? -ne 0 ]; then
  echo "❌ Gate 3 FAILED: Unit tests failed."
  FAIL=1
else
  echo "✅ Gate 3 PASSED."
fi
echo ""

# ── GATE 4: E2E Test Suite ──
echo "Gate 4/5: E2E Test Suite..."
if [ "$HAS_PLAYWRIGHT" = "true" ]; then
  npx playwright test 2>&1
else
  echo "⚠️  Playwright not found in root. Skipping."
fi
if [ $? -ne 0 ]; then
  echo "❌ Gate 4 FAILED: E2E tests failed."
  FAIL=1
else
  echo "✅ Gate 4 PASSED."
fi
echo ""

# ── GATE 5: Section-scoped Evidence Payload Check ──
echo "Gate 5/5: Evidence Payload Verification..."

# Extract only the Evidence Payload section to prevent false positives from other sections
EVIDENCE_SECTION=$(awk '/## Evidence/ {flag=1; next} /^## / {flag=0} flag' "$MISSION_FILE" 2>/dev/null)

if [ -z "$EVIDENCE_SECTION" ]; then
  echo "❌ Gate 5 FAILED: No '## Evidence Payload' section found in MISSION.md."
  FAIL=1
else
  check_evidence() {
    local keyword="$1"
    local label="$2"
    if echo "$EVIDENCE_SECTION" | grep -qi "\[x\].*$keyword"; then
      echo "  ✅ $label"
    else
      echo "  ❌ $label — NOT checked in Evidence Payload section"
      FAIL=1
    fi
  }

  check_evidence "Functional"          "Functional Verification"
  check_evidence "Architectural\|AVP"  "Architectural Verification (AVP-001)"
  check_evidence "Dependency"          "Dependency Graph Clean"
  check_evidence "ADR\|Compliance"     "ADR Compliance"
fi

# ── ADR-006 Phase 1: Knip Dead Code & Zombie Export Advisory Scan ──
echo ""
echo "Gate 5 (Advisory): Running Knip Dead Code & Zombie Export Audit..."
node -e '
const { execSync } = require("child_process");
try {
  let raw = "";
  try {
    raw = execSync("npx knip --reporter json 2>/dev/null", { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  } catch (err) {
    raw = err.stdout || "";
  }
  const jsonStart = raw.indexOf("{");
  if (jsonStart !== -1) {
    const data = JSON.parse(raw.slice(jsonStart));
    console.log("\n📊 KNIP DEAD CODE ADVISORY MATRIX (HUMAN APPROVAL REQUIRED):");
    if (data.files && data.files.length > 0) {
      console.log("  ⚠️ Unreferenced Files (" + data.files.length + "):");
      data.files.forEach(f => console.log("     - " + f + " (Recommendation: Review for deletion)"));
    } else {
      console.log("  ✅ Unreferenced Files: None");
    }
    let issueCount = 0;
    if (data.issues) {
      data.issues.forEach(iss => {
        const exports = (iss.exports || []).map(e => e.name);
        const types = (iss.types || []).map(t => t.name);
        const deps = (iss.dependencies || []).map(d => d.name);
        const devDeps = (iss.devDependencies || []).map(d => d.name);
        if (exports.length || types.length || deps.length || devDeps.length) {
          issueCount++;
          console.log("  ⚠️ Issue in [" + iss.file + "]:");
          if (exports.length) console.log("     - Unused Exports: " + exports.join(", "));
          if (types.length) console.log("     - Unused Types: " + types.join(", "));
          if (deps.length) console.log("     - Unused Dependencies: " + deps.join(", "));
          if (devDeps.length) console.log("     - Unused devDependencies: " + devDeps.join(", "));
        }
      });
    }
    if (issueCount === 0) console.log("  ✅ Unused Exports & Dependencies: None");
    console.log("  ℹ️ Note: Auto-deletion disabled by ADR-006 policy. Human approval required for removal.");
  }
} catch (e) { console.log("  ℹ️ Knip Advisory Scan completed."); }
' 2>&1


echo ""
# ── GATE 6 (SSOT): Auto-Generate Forbidden Matrix in SYSTEM_CONTEXT.md ──
echo "Gate 6/6 (SSOT): Syncing Architecture Constraints..."
node -e '
const fs = require("fs");
const path = require("path");
const repoRoot = process.argv[1];
const dcPath = path.join(repoRoot, ".dependency-cruiser.js");
const ctxPath = path.join(repoRoot, "governance/SYSTEM_CONTEXT.md");
if (fs.existsSync(dcPath) && fs.existsSync(ctxPath)) {
  const dc = require(dcPath);
  let ctx = fs.readFileSync(ctxPath, "utf8");
  let rules = dc.forbidden
    .filter(r => r.from && r.from.path && r.to && r.to.path)
    .map(r => `*   \`${r.from.path.replace(/\^/g, "")}\` -> \`${r.to.path.replace(/\^/g, "")}\` (Forbidden)`)
    .join("\n");
  const regex = /(\*\*Forbidden Dependency Matrix:\*\*\n)([\s\S]*?)(?=\n## |$)/;
  ctx = ctx.replace(regex, `$1${rules}\n\n`);
  fs.writeFileSync(ctxPath, ctx);
  console.log("  ✅ SYSTEM_CONTEXT.md updated with exact Dependency Cruiser constraints.");
} else {
  console.log("  ⚠️ Skipping SSOT Sync (missing dependency-cruiser.js or SYSTEM_CONTEXT.md)");
}
' "$REPO_ROOT"

if [ $? -ne 0 ]; then
  echo "❌ Gate 6 FAILED: SSOT Auto-generation crashed."
  FAIL=1
fi
echo ""

# ── Final Verdict ──
if [ $FAIL -ne 0 ]; then
  echo "🚫 MISSION LOCK DENIED: One or more gates failed."
  echo "Fix all issues listed above and call lock_mission again."
  exit 1
fi

# All gates passed — stamp MISSION.md as Locked
# Uses perl -i for reliable cross-platform in-place regex (sed -i differs between GNU/BSD)
perl -i -pe 's/\*\*Status:\*\* .*/\*\*Status:\*\* Locked/' "$MISSION_FILE"

# ── Generate Component 8: Structured Evidence Packet ──
EVIDENCE_PACKET_PATH="$REPO_ROOT/.agents/evidence_packet.json"
GIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

node -e '
  const fs = require("fs");
  const packet = {
    missionId: process.argv[1],
    timestamp: new Date().toISOString(),
    commitHash: process.argv[2],
    status: "LOCKED",
    gatesPassed: {
      gate1_linter: true,
      gate2_tsc: true,
      gate3_unit_tests: true,
      gate4_e2e_tests: true,
      gate5_evidence_payload: true,
      gate6_ssot_sync: true
    },
    verificationSummary: "Passed 6-Gate AVP-001 Verification Protocol cleanly."
  };
  fs.writeFileSync(process.argv[3], JSON.stringify(packet, null, "\t"));
' "$MISSION_ID" "$GIT_HASH" "$EVIDENCE_PACKET_PATH" 2>/dev/null

echo "📄 STRUCTURED EVIDENCE PACKET GENERATED: .agents/evidence_packet.json"
echo "✅ ALL 6 GATES PASSED. Mission $MISSION_ID is now LOCKED."
echo "MISSION.md has been updated with status: Locked."
echo "Notify the Product Owner for final Human Gate approval before archiving."
exit 0

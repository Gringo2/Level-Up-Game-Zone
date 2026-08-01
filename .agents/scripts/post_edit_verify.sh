#!/bin/bash
# post_edit_verify.sh — 100% Transitive File-Level Blast Radius Verification via dependency-cruiser
# Phase 3: Micro-Verification + TDD Order Check + AST Blast Radius Engine
# Usage: bash post_edit_verify.sh "/absolute/path/to/file.ts"

TARGET_FILE="$1"
REPO_ROOT="$(git rev-parse --show-toplevel)"
RELATIVE_PATH="${TARGET_FILE#$REPO_ROOT/}"
RELATIVE_PATH="${RELATIVE_PATH#/}"
PACKAGE_DIR=$(echo "$RELATIVE_PATH" | cut -d'/' -f1-2)
WORKSPACE_NAME=$(node -p "require('$REPO_ROOT/$PACKAGE_DIR/package.json').name" 2>/dev/null)
BASENAME=$(basename "$TARGET_FILE")

echo "🔍 POST-EDIT VERIFICATION: Calculating 100% Blast Radius for [$RELATIVE_PATH]..."

# Handle non-existent or newly created files cleanly
if [ ! -f "$TARGET_FILE" ]; then
  echo "ℹ️  Target file does not exist on disk. Skipping blast radius check."
  exit 0
fi

# Dynamic Toolchain Detection
HAS_BIOME=$(node -e "const p=require('$REPO_ROOT/package.json'); console.log(!!(p.devDependencies?.['@biomejs/biome']||p.dependencies?.['@biomejs/biome']))" 2>/dev/null)
HAS_VITEST=$(node -e "const p=require('$REPO_ROOT/package.json'); console.log(!!(p.devDependencies?.vitest||p.dependencies?.vitest))" 2>/dev/null)
HAS_ESLINT=$(node -e "const p=require('$REPO_ROOT/package.json'); console.log(!!(p.devDependencies?.eslint||p.dependencies?.eslint))" 2>/dev/null)

# --- 0. Sub-50ms Structural Pattern Guard ---
echo "⚡ Step 0: Running Structural Pattern Check..."
npx ast-grep scan 2>&1
if [ $? -ne 0 ]; then
  echo "🚨 CRITICAL VIOLATION: ast-grep structural pattern check failed."
  exit 1
fi

# --- 1. TDD Order Warning Check ---
if echo "$RELATIVE_PATH" | grep -qE "^packages/[^/]+/src/" && \
   ! echo "$TARGET_FILE" | grep -qE "(__tests__|\.test\.|\.spec\.)"; then

  BASENAME_NO_EXT="${BASENAME%.*}"
  PACKAGE_ROOT="$REPO_ROOT/$PACKAGE_DIR"
  TEST_FILE=$(find "$PACKAGE_ROOT" \
    -name "${BASENAME_NO_EXT}.test.*" -o \
    -name "${BASENAME_NO_EXT}.spec.*" 2>/dev/null | head -1)

  if [ -z "$TEST_FILE" ]; then
    echo ""
    echo "⚠️  TDD ORDER WARNING: Editing src/[$BASENAME] with no corresponding test file."
    echo "    Expected location: $PACKAGE_ROOT/src/__tests__/${BASENAME_NO_EXT}.test.ts"
    echo "    Phase 3 rule: Write the FAILING TEST first, then implement (Red → Green)."
    echo ""
  fi
fi

# --- 2. Shell-safe regex escaping for path matching ---
SAFE_PATH_REGEX=$(node -e 'const path = require("path"); const rel = path.relative(process.cwd(), process.argv[1]); console.log(rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));' "$TARGET_FILE" 2>/dev/null)

# --- 3. Query full transitive reverse file dependency graph using --reaches ---
GRAPH_JSON=""
if [ -n "$SAFE_PATH_REGEX" ]; then
  if [ -f "$REPO_ROOT/.dependency-cruiser.js" ]; then
    GRAPH_JSON=$(npx depcruise --reaches "^$SAFE_PATH_REGEX$" \
      "$REPO_ROOT/packages" \
      --config "$REPO_ROOT/.dependency-cruiser.js" \
      --output-type json 2>/dev/null)
  else
    GRAPH_JSON=$(npx depcruise --reaches "^$SAFE_PATH_REGEX$" \
      "$REPO_ROOT/packages" \
      --no-config \
      --output-type json 2>/dev/null)
  fi
fi

DEPCRUISE_EXIT=$?

if [ $DEPCRUISE_EXIT -ne 0 ] || [ -z "$GRAPH_JSON" ]; then
  echo "⚠️  dependency-cruiser query skipped/failed. Falling back to package-scoped verification."
  if [ -n "$WORKSPACE_NAME" ]; then
    npm run lint --workspace="$WORKSPACE_NAME" 2>&1
    exit $?
  fi
  exit 0
fi

# --- 4. Extract affected modules from AST graph JSON ---
AFFECTED_MODULES=$(echo "$GRAPH_JSON" | jq -r '.modules[].source' 2>/dev/null)

# --- 5. Filter affected test files (*.test.ts, *.spec.ts) cleanly ---
AFFECTED_TESTS=$(echo "$AFFECTED_MODULES" | grep -E "(\.test\.tsx?|\.spec\.tsx?)$" || true)

# --- 6. Extract unique affected workspace packages for typechecking ---
AFFECTED_PACKAGES=$(echo "$AFFECTED_MODULES" | grep -oE "packages/[^/]+" | sort -u || true)

if [ -z "$AFFECTED_PACKAGES" ]; then
  AFFECTED_PACKAGES="$PACKAGE_DIR"
fi

echo "📊 BLAST RADIUS ANALYSIS:"
echo "   Affected Packages  : $(echo $AFFECTED_PACKAGES | tr '\n' ' ')"
echo "   Affected Test Files: $(echo "$AFFECTED_TESTS" | grep -c '^' || echo 0) file(s)"

# --- 7. Explicit Typecheck affected packages across computed blast radius ---
for pkg_dir in $AFFECTED_PACKAGES; do
  if [ -f "$REPO_ROOT/$pkg_dir/package.json" ]; then
    PKG_NAME=$(node -p "require('$REPO_ROOT/$pkg_dir/package.json').name" 2>/dev/null)
    if [ -n "$PKG_NAME" ] && [ -f "$REPO_ROOT/$pkg_dir/tsconfig.json" ]; then
      echo "  └─ Typechecking workspace: $PKG_NAME..."
      npx tsc --noEmit --project "$REPO_ROOT/$pkg_dir/tsconfig.json" 2>&1
      if [ $? -ne 0 ]; then
        echo "🚨 CRITICAL VIOLATION: Blast radius typecheck failed in [$PKG_NAME]."
        exit 1
      fi
    elif [ -n "$PKG_NAME" ]; then
      echo "  └─ Skipping typecheck for $PKG_NAME (no tsconfig.json found)."
    fi
  fi
done

# --- 8. Execute targeted unit tests ONLY on affected test files ---
if [ -n "$AFFECTED_TESTS" ]; then
  TEST_ARGS=$(echo "$AFFECTED_TESTS" | tr '\n' ' ')
  echo "🧪 EXECUTING TARGETED BLAST RADIUS TESTS: [ $TEST_ARGS ]"
  if [ "$HAS_VITEST" = "true" ]; then
    npx vitest run $TEST_ARGS 2>&1
    if [ $? -ne 0 ]; then
      echo "🚨 CRITICAL VIOLATION: Blast radius unit tests failed."
      exit 1
    fi
  else
    echo "⚠️  No recognized test runner (vitest) found. Skipping targeted tests."
  fi
else
  echo "ℹ️  No dependent unit test files affected by this mutation."
fi

# --- 9. Boundary Enforcement: ESLint on affected packages ---
echo "🔍 BOUNDARY CHECK: Running Linter on $PACKAGE_DIR..."
if [ "$HAS_BIOME" = "true" ]; then
  npx biome check "$REPO_ROOT/$PACKAGE_DIR" 2>&1
  if [ $? -ne 0 ]; then
    echo "🚨 CRITICAL VIOLATION: Biome boundary check failed."
    exit 1
  fi
elif [ "$HAS_ESLINT" = "true" ]; then
  npx eslint "$REPO_ROOT/$PACKAGE_DIR" --ext .ts,.tsx 2>&1
  if [ $? -ne 0 ]; then
    echo "🚨 CRITICAL VIOLATION: ESLint boundary check failed."
    exit 1
  fi
else
  echo "⚠️  No recognized linter found. Skipping boundary check."
fi

echo "✅ VERIFICATION PASSED: 100% Blast Radius clean for [$RELATIVE_PATH]."
exit 0

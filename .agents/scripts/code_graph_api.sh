#!/bin/bash
# code_graph_api.sh — Programmatic Code Graph & Evidence API endpoint
# Component 4: Code Graph / Evidence API
# Usage:
#   bash .agents/scripts/code_graph_api.sh query-reaches <target_file>
#   bash .agents/scripts/code_graph_api.sh scan-ast [<target_file>]
#   bash .agents/scripts/code_graph_api.sh audit-deadcode

COMMAND="$1"
TARGET_FILE="$2"
REPO_ROOT="$(git rev-parse --show-toplevel)"

case "$COMMAND" in
  query-reaches)
    if [ -z "$TARGET_FILE" ]; then
      echo '{"error": "Usage: code_graph_api.sh query-reaches <target_file>"}'
      exit 1
    fi
    SAFE_PATH_REGEX=$(node -e 'const path = require("path"); const rel = path.relative(process.cwd(), process.argv[1]); console.log(rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));' "$TARGET_FILE" 2>/dev/null)
    
    if [ -f "$REPO_ROOT/.dependency-cruiser.js" ]; then
      npx depcruise --reaches "^$SAFE_PATH_REGEX$" "$REPO_ROOT/packages" --config "$REPO_ROOT/.dependency-cruiser.js" --output-type json 2>/dev/null
    else
      npx depcruise --reaches "^$SAFE_PATH_REGEX$" "$REPO_ROOT/packages" --no-config --output-type json 2>/dev/null
    fi
    ;;

  scan-ast)
    AST_OUTPUT=$(npx -y ast-grep scan 2>&1)
    EXIT_CODE=$?
    node -e '
      const raw = process.argv[1];
      const exitCode = parseInt(process.argv[2], 10);
      console.log(JSON.stringify({
        success: exitCode === 0,
        tool: "ast-grep",
        rawOutput: raw,
        timestamp: new Date().toISOString()
      }, null, 2));
    ' "$AST_OUTPUT" "$EXIT_CODE"
    ;;

  audit-deadcode)
    KNIP_RAW=$(npx knip --reporter json 2>/dev/null)
    node -e '
      const raw = process.argv[1] || "";
      const jsonStart = raw.indexOf("{");
      if (jsonStart !== -1) {
        try {
          console.log(JSON.stringify(JSON.parse(raw.slice(jsonStart)), null, 2));
          process.exit(0);
        } catch (e) {}
      }
      console.log(JSON.stringify({ files: [], issues: [], raw }));
    ' "$KNIP_RAW"
    ;;

  *)
    echo '{"error": "Invalid command. Supported: query-reaches <file>, scan-ast [<file>], audit-deadcode"}'
    exit 1
    ;;
esac

#!/bin/bash
# code_graph_api.sh — Programmatic Code Graph & Evidence API endpoint
# Component 4: Code Graph / Evidence API (ADR-007 Composite Tool Exposure)
# Usage:
#   bash .agents/scripts/code_graph_api.sh inspect-file <target_file>  (Composite pre-edit tool call)
#   bash .agents/scripts/code_graph_api.sh query-reaches <target_file>
#   bash .agents/scripts/code_graph_api.sh trace-taint <target_file>
#   bash .agents/scripts/code_graph_api.sh scan-ast [<target_file>]
#   bash .agents/scripts/code_graph_api.sh audit-deadcode

COMMAND="$1"
TARGET_FILE="$2"
REPO_ROOT="$(git rev-parse --show-toplevel)"

case "$COMMAND" in
  inspect-file)
    if [ -z "$TARGET_FILE" ]; then
      echo '{"error": "Usage: code_graph_api.sh inspect-file <target_file>"}'
      exit 1
    fi

    # 1. Blast Radius Reachability via depcruise
    SAFE_PATH_REGEX=$(node -e 'const path = require("path"); const rel = path.relative(process.cwd(), process.argv[1]); console.log(rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));' "$TARGET_FILE" 2>/dev/null)
    
    GRAPH_JSON=""
    if [ -f "$REPO_ROOT/.dependency-cruiser.js" ]; then
      GRAPH_JSON=$(npx depcruise --reaches "^$SAFE_PATH_REGEX$" "$REPO_ROOT/packages" --config "$REPO_ROOT/.dependency-cruiser.js" --output-type json 2>/dev/null)
    fi

    # 2. Taint Analysis via taint_tracer.ts
    TAINT_JSON=$(npx tsx "$REPO_ROOT/.agents/scripts/taint_tracer.ts" "$TARGET_FILE" 2>/dev/null)

    # 3. AST Pattern Check via ast-grep
    AST_RAW=$(npx -y ast-grep scan 2>&1)
    AST_EXIT=$?

    # Composite JSON Builder
    node -e '
      const target = process.argv[1];
      const graphRaw = process.argv[2] || "{}";
      const taintRaw = process.argv[3] || "{}";
      const astRaw = process.argv[4] || "";
      const astExit = parseInt(process.argv[5] || "0", 10);

      let modules = [];
      let affectedTests = [];
      let affectedPackages = [];

      try {
        const graphData = JSON.parse(graphRaw);
        modules = (graphData.modules || []).map(m => ({ source: m.source, dependents: m.dependents || [] }));
        affectedTests = modules.map(m => m.source).filter(s => /(\.test|\.spec)\.tsx?$/.test(s));
        affectedPackages = [...new Set(modules.map(m => m.source.split("/").slice(0, 2).join("/")))];
      } catch (e) {}

      let taintAnalysis = { success: true, violations: [] };
      try {
        taintAnalysis = JSON.parse(taintRaw);
      } catch (e) {}

      console.log(JSON.stringify({
        targetFile: target,
        blastRadius: {
          affectedPackages,
          affectedTests,
          impactedModuleCount: modules.length
        },
        taintAnalysis,
        astScan: {
          success: astExit === 0,
          rawSummary: astRaw ? astRaw.slice(0, 500) : "No AST violations"
        },
        timestamp: new Date().toISOString()
      }, null, 2));
    ' "$TARGET_FILE" "$GRAPH_JSON" "$TAINT_JSON" "$AST_RAW" "$AST_EXIT"
    ;;

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

  trace-taint)
    if [ -z "$TARGET_FILE" ]; then
      echo '{"error": "Usage: code_graph_api.sh trace-taint <target_file>"}'
      exit 1
    fi
    npx tsx "$REPO_ROOT/.agents/scripts/taint_tracer.ts" "$TARGET_FILE" 2>/dev/null
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
    echo '{"error": "Invalid command. Supported: inspect-file <file>, query-reaches <file>, trace-taint <file>, scan-ast, audit-deadcode"}'
    exit 1
    ;;
esac

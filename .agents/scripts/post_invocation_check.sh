#!/bin/bash
# post_invocation_check.sh — PostInvocation Loop Control Hook (ADR-007)
# Checks for active verification failure locks and enforces loop continuation if unverified errors exist.

REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRATCH_DIR="$REPO_ROOT/.agents/.scratch"

UNRESOLVED_FAILURES=0
if [ -d "$SCRATCH_DIR" ]; then
  FAIL_COUNT=$(find "$SCRATCH_DIR" -type f -name "*_failures" | wc -l)
  if [ "$FAIL_COUNT" -gt 0 ]; then
    UNRESOLVED_FAILURES=1
  fi
fi

if [ $UNRESOLVED_FAILURES -eq 1 ]; then
  node -e 'console.log(JSON.stringify({
    terminationBehavior: "force_continue",
    injectSteps: [
      { ephemeralMessage: "🚨 POST-INVOCATION GUARD: Active verification failures detected in .agents/.scratch. You must resolve all failing assertions or create an RCA document before completing your turn." }
    ]
  }))'
  exit 0
fi

echo '{"terminationBehavior":""}'
exit 0

#!/bin/bash
# pre_edit_backup.sh — Safely backs up a file before AI mutation.
# Phase 2: Transient Safety Net
# Uses basename + epoch timestamp to avoid path collisions and absolute path issues.
# Usage: bash pre_edit_backup.sh "/absolute/path/to/file.ts"

TARGET_FILE="$1"
REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRATCH_DIR="$REPO_ROOT/.agents/.scratch"

# Only back up if the file already exists.
# Silently skip for new file creation (cp would fail on missing source).
if [ -f "$TARGET_FILE" ]; then
  mkdir -p "$SCRATCH_DIR"
  BASENAME=$(basename "$TARGET_FILE")
  TIMESTAMP="$(date +%s)_$$"
  BACKUP_PATH="$SCRATCH_DIR/${BASENAME}.${TIMESTAMP}.backup"
  cp "$TARGET_FILE" "$BACKUP_PATH"
  echo "✅ BACKUP CREATED: $BACKUP_PATH"
else
  echo "ℹ️  NEW FILE: No backup needed for $TARGET_FILE (does not yet exist)."
fi

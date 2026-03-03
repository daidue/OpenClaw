#!/usr/bin/env bash
set -euo pipefail

RESOURCE="$1"
AGENT="${2:-unknown}"
LOCK_DIR="$HOME/.openclaw/workspace/shared/locks/$RESOURCE.lock"

# Check for stale lock
if [ -d "$LOCK_DIR" ]; then
  LOCK_AGE=$(($(date +%s) - $(stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0)))
  if [ "$LOCK_AGE" -gt 600 ]; then
    echo "Stealing stale lock (age: ${LOCK_AGE}s)"
    rmdir "$LOCK_DIR" || true
  fi
fi

# Acquire lock
if mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "$AGENT:$$" > "$LOCK_DIR/owner"
  echo "$LOCK_DIR"
  exit 0
else
  echo "Lock held by $(cat "$LOCK_DIR/owner" 2>/dev/null || echo "unknown")"
  exit 1
fi

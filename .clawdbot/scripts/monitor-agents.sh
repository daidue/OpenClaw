#!/bin/bash
# Deterministic Agent Monitoring - Elvis-style
# Runs every 10 minutes via cron
# Zero LLM calls - pure bash

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
CLAWDBOT="$WORKSPACE/.clawdbot"
TASK_REGISTRY="$CLAWDBOT/active-tasks.json"
LOG_FILE="$CLAWDBOT/logs/monitor-$(date +%Y-%m-%d).log"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Initialize log
mkdir -p "$CLAWDBOT/logs"
log "=== Agent Monitoring Check ==="

# Check if task registry exists
if [ ! -f "$TASK_REGISTRY" ]; then
  log "No active tasks found."
  exit 0
fi

# Read task registry
TASKS=$(cat "$TASK_REGISTRY")

# Check each task
echo "$TASKS" | jq -r 'keys[]' | while read -r task_id; do
  SESSION_ID=$(echo "$TASKS" | jq -r ".[\"$task_id\"].sessionId // empty")
  STATUS=$(echo "$TASKS" | jq -r ".[\"$task_id\"].status // empty")
  DESCRIPTION=$(echo "$TASKS" | jq -r ".[\"$task_id\"].description // empty")
  
  log "Checking task: $task_id ($STATUS)"
  
  # Skip if not running
  if [ "$STATUS" != "running" ]; then
    log "  Skipping (status: $STATUS)"
    continue
  fi
  
  # Check if session still exists
  if [ -n "$SESSION_ID" ]; then
    if openclaw process list 2>/dev/null | grep -q "$SESSION_ID"; then
      log "  ✓ Session $SESSION_ID is alive"
    else
      log "  ✗ Session $SESSION_ID is dead"
      
      # Check for completion markers in logs
      # (Agent should write "TASK COMPLETE" or create PR)
      WORKDIR=$(echo "$TASKS" | jq -r ".[\"$task_id\"].workdir // empty")
      BRANCH=$(echo "$TASKS" | jq -r ".[\"$task_id\"].branch // empty")
      
      # Check if PR was created
      if [ -n "$WORKDIR" ] && [ -d "$WORKDIR" ]; then
        cd "$WORKDIR"
        PR_NUMBER=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number // empty' 2>/dev/null || echo "")
        
        if [ -n "$PR_NUMBER" ]; then
          log "  ✓ PR #$PR_NUMBER created"
          
          # Update task registry
          TMP_FILE=$(mktemp)
          jq ".[\"$task_id\"].status = \"done\" | .[\"$task_id\"].pr = $PR_NUMBER | .[\"$task_id\"].completedAt = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "$TASK_REGISTRY" > "$TMP_FILE"
          mv "$TMP_FILE" "$TASK_REGISTRY"
          
          # Notify via OpenClaw
          openclaw system event --text "✅ Task complete: $DESCRIPTION

PR: #$PR_NUMBER
Branch: $BRANCH

Review: gh pr view $PR_NUMBER" --mode now
        else
          log "  ⚠️ Session dead but no PR found"
          
          # Update status to failed
          TMP_FILE=$(mktemp)
          jq ".[\"$task_id\"].status = \"failed\" | .[\"$task_id\"].failedAt = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" | .[\"$task_id\"].note = \"Session ended without creating PR\"" "$TASK_REGISTRY" > "$TMP_FILE"
          mv "$TMP_FILE" "$TASK_REGISTRY"
          
          # Alert
          openclaw system event --text "⚠️ Task failed: $DESCRIPTION

Session $SESSION_ID ended without creating PR.
Check logs for details." --mode now
        fi
      fi
    fi
  fi
done

log "=== Monitoring check complete ==="

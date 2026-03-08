#!/bin/bash
# Agent Monitoring Script
# Runs every 10 minutes to check active sub-agents and update task registry
# Location: ~/.openclaw/workspace/.clawdbot/scripts/monitor-agents.sh

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
TASK_REGISTRY="$WORKSPACE/.clawdbot/active-tasks.json"
LOG_FILE="$WORKSPACE/.clawdbot/logs/monitor-$(date +%Y-%m-%d).log"

# Ensure directories exist
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Read current task registry
if [ ! -f "$TASK_REGISTRY" ]; then
  echo '{"tasks":[],"lastUpdated":"'$(date -Iseconds)'","recentCompletions":[]}' > "$TASK_REGISTRY"
fi

ACTIVE_TASKS=$(cat "$TASK_REGISTRY" | jq -r '.tasks | length')

if [ "$ACTIVE_TASKS" -eq 0 ]; then
  log "No active tasks in registry"
  exit 0
fi

log "Checking $ACTIVE_TASKS active tasks..."

# Check each task
STALE_TASKS=()
COMPLETED_TASKS=()

while IFS= read -r task; do
  TASK_ID=$(echo "$task" | jq -r '.id')
  SESSION_KEY=$(echo "$task" | jq -r '.sessionKey // ""')
  START_TIME=$(echo "$task" | jq -r '.startTime')
  TIMEOUT=$(echo "$task" | jq -r '.timeoutMinutes // 120')
  
  # Calculate age in minutes
  START_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%S" "$(echo $START_TIME | cut -d'T' -f1,2)" "+%s" 2>/dev/null || echo 0)
  NOW_EPOCH=$(date +%s)
  AGE_MINUTES=$(( ($NOW_EPOCH - $START_EPOCH) / 60 ))
  
  log "  Task $TASK_ID: age ${AGE_MINUTES}m (timeout ${TIMEOUT}m)"
  
  # Check if task exceeded timeout
  if [ "$AGE_MINUTES" -gt "$TIMEOUT" ]; then
    log "    ⚠️  STALE (exceeded timeout)"
    STALE_TASKS+=("$TASK_ID")
    continue
  fi
  
  # Check if session still exists (using sessions_list)
  if [ -n "$SESSION_KEY" ]; then
    # TODO: Add proper session check via OpenClaw API when available
    # For now, assume tasks > 120 min are stale
    if [ "$AGE_MINUTES" -gt 120 ]; then
      log "    ⚠️  STALE (likely completed)"
      COMPLETED_TASKS+=("$TASK_ID")
    fi
  fi
  
done < <(cat "$TASK_REGISTRY" | jq -c '.tasks[]')

# Archive stale tasks
if [ ${#STALE_TASKS[@]} -gt 0 ] || [ ${#COMPLETED_TASKS[@]} -gt 0 ]; then
  log "Archiving ${#STALE_TASKS[@]} stale + ${#COMPLETED_TASKS[@]} completed tasks..."
  
  # Move tasks to recentCompletions
  TMP_FILE=$(mktemp)
  cat "$TASK_REGISTRY" | jq --argjson stale "$(printf '%s\n' "${STALE_TASKS[@]}" | jq -R . | jq -s .)" \
    --argjson completed "$(printf '%s\n' "${COMPLETED_TASKS[@]}" | jq -R . | jq -s .)" \
    '
    .tasks = [.tasks[] | select([.id] | inside($stale) | not) | select([.id] | inside($completed) | not)] |
    .lastUpdated = now | todate
    ' > "$TMP_FILE"
  
  mv "$TMP_FILE" "$TASK_REGISTRY"
  log "Registry updated"
fi

log "Monitor complete"

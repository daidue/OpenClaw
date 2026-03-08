#!/bin/bash
# Complete Task Script
# Call this when a sub-agent finishes to archive it from active-tasks.json
# Usage: complete-task.sh <task-id> <status> [result-summary]
#
# Example:
#   complete-task.sh "contract-integration" "completed" "Merged to main, all tests passing"

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
TASK_REGISTRY="$WORKSPACE/.clawdbot/active-tasks.json"

# Parse arguments
TASK_ID="${1:-}"
STATUS="${2:-completed}"
RESULT="${3:-No result provided}"

if [ -z "$TASK_ID" ]; then
  echo "Usage: complete-task.sh <task-id> [status] [result]"
  exit 1
fi

# Ensure registry exists
if [ ! -f "$TASK_REGISTRY" ]; then
  echo "❌ Task registry not found at $TASK_REGISTRY"
  exit 1
fi

# Check if task exists
EXISTING=$(cat "$TASK_REGISTRY" | jq --arg id "$TASK_ID" '.tasks[] | select(.id == $id) | .id' -r)
if [ -z "$EXISTING" ]; then
  echo "⚠️  Task ID '$TASK_ID' not found in registry"
  echo "   Active tasks:"
  cat "$TASK_REGISTRY" | jq -r '.tasks[] | "   - \(.id) (\(.type))"'
  exit 0
fi

# Calculate runtime
START_TIME=$(cat "$TASK_REGISTRY" | jq --arg id "$TASK_ID" -r '.tasks[] | select(.id == $id) | .startTime')
# Convert ISO 8601 to epoch (handle both UTC 'Z' and timezone offsets)
START_EPOCH=$(date -jf "%Y-%m-%dT%H:%M:%S" "$(echo "$START_TIME" | sed 's/[+-][0-9][0-9]:[0-9][0-9]$//' | sed 's/Z$//')" "+%s" 2>/dev/null || date +%s)
NOW_EPOCH=$(date +%s)
RUNTIME_MINUTES=$(( ($NOW_EPOCH - $START_EPOCH) / 60 ))
[ $RUNTIME_MINUTES -lt 0 ] && RUNTIME_MINUTES=0  # Handle timezone edge cases

# Move task to recentCompletions
TMP_FILE=$(mktemp)
cat "$TASK_REGISTRY" | jq \
  --arg id "$TASK_ID" \
  --arg status "$STATUS" \
  --arg result "$RESULT" \
  --argjson runtime "$RUNTIME_MINUTES" \
  '
  (.tasks[] | select(.id == $id)) as $task |
  .recentCompletions = [
    {
      id: $task.id,
      type: $task.type,
      agent: $task.agent,
      status: $status,
      completed: (now | todate),
      runtime: "\($runtime)m",
      result: $result
    }
  ] + .recentCompletions[:9] |
  .tasks = [.tasks[] | select(.id != $id)] |
  .lastUpdated = (now | todate)
  ' > "$TMP_FILE"

mv "$TMP_FILE" "$TASK_REGISTRY"

echo "✅ Task completed: $TASK_ID"
echo "   Status: $STATUS"
echo "   Runtime: ${RUNTIME_MINUTES}m"
echo "   Result: $RESULT"
echo ""
echo "📋 Remaining active tasks:"
REMAINING=$(cat "$TASK_REGISTRY" | jq -r '.tasks | length')
if [ "$REMAINING" -eq 0 ]; then
  echo "   (none)"
else
  cat "$TASK_REGISTRY" | jq -r '.tasks[] | "   - \(.id) (\(.type))"'
fi

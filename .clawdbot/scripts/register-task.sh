#!/bin/bash
# Register Task Script
# Call this when spawning a sub-agent to register it in active-tasks.json
# Usage: register-task.sh <task-id> <type> <agent> <description> [session-key] [timeout-minutes]
#
# Example:
#   register-task.sh "contract-integration" "feature-build" "titlerun" "Build contract data integration" "" 120

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
TASK_REGISTRY="$WORKSPACE/.clawdbot/active-tasks.json"
QUERY_SCRIPT="$WORKSPACE/scripts/query-patterns.sh"

# Parse arguments
TASK_ID="${1:-}"
TASK_TYPE="${2:-general}"
AGENT="${3:-unknown}"
DESCRIPTION="${4:-No description}"
SESSION_KEY="${5:-}"
TIMEOUT_MINUTES="${6:-120}"

if [ -z "$TASK_ID" ]; then
  echo "Usage: register-task.sh <task-id> [type] [agent] [description] [session-key] [timeout-minutes]"
  exit 1
fi

# ============================================================================
# PATTERN LEARNING SYSTEM - Query relevant patterns before registering
# ============================================================================

if [ -x "$QUERY_SCRIPT" ]; then
  echo "🔍 Searching for relevant patterns..."
  echo ""
  
  # Search by task type
  RELEVANT=$("$QUERY_SCRIPT" "$TASK_TYPE" 2>/dev/null | head -20)
  
  if [ -n "$RELEVANT" ]; then
    echo "📚 Relevant patterns found for '$TASK_TYPE':"
    echo "$RELEVANT"
    echo ""
    read -p "Review full patterns file? (y/n): " review
    if [ "$review" = "y" ] || [ "$review" = "Y" ]; then
      less "$WORKSPACE/memory/patterns.md"
    fi
    echo ""
  else
    echo "No existing patterns found for '$TASK_TYPE'"
    echo ""
  fi
fi

# ============================================================================
# TASK REGISTRATION
# ============================================================================

# Ensure registry exists
if [ ! -f "$TASK_REGISTRY" ]; then
  echo '{"tasks":[],"lastUpdated":"'$(date -Iseconds)'","recentCompletions":[]}' > "$TASK_REGISTRY"
fi

# Check for duplicate task ID
EXISTING=$(cat "$TASK_REGISTRY" | jq --arg id "$TASK_ID" '.tasks[] | select(.id == $id) | .id' -r)
if [ -n "$EXISTING" ]; then
  echo "❌ Task ID '$TASK_ID' already exists in registry"
  echo "   Active tasks:"
  cat "$TASK_REGISTRY" | jq -r '.tasks[] | "   - \(.id) (\(.type)) started \(.startTime)"'
  exit 1
fi

# Add task to registry
TMP_FILE=$(mktemp)
cat "$TASK_REGISTRY" | jq \
  --arg id "$TASK_ID" \
  --arg type "$TASK_TYPE" \
  --arg agent "$AGENT" \
  --arg desc "$DESCRIPTION" \
  --arg session "$SESSION_KEY" \
  --argjson timeout "$TIMEOUT_MINUTES" \
  '.tasks += [{
    id: $id,
    type: $type,
    agent: $agent,
    description: $desc,
    sessionKey: ($session // null),
    startTime: (now | todate),
    timeoutMinutes: $timeout,
    status: "active"
  }] | .lastUpdated = (now | todate)' > "$TMP_FILE"

mv "$TMP_FILE" "$TASK_REGISTRY"

echo "✅ Task registered: $TASK_ID"
echo "   Type: $TASK_TYPE"
echo "   Agent: $AGENT"
echo "   Timeout: ${TIMEOUT_MINUTES}m"
echo ""
echo "📋 Active tasks:"
cat "$TASK_REGISTRY" | jq -r '.tasks[] | "   - \(.id) (\(.type))"'

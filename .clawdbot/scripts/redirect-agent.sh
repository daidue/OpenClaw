#!/usr/bin/env bash
set -euo pipefail

# Usage: redirect-agent.sh <task-id> <message>
# Example: redirect-agent.sh fix-login-bug "STOP: Focus on JWT validation first, then cookie handling"

TASK_ID="$1"
MESSAGE="$2"

REDIRECT_DIR="$HOME/.openclaw/workspace/.clawdbot/redirects"
mkdir -p "$REDIRECT_DIR/archive"

REDIRECT_FILE="$REDIRECT_DIR/$TASK_ID.redirect"

echo "🔀 Creating redirect for task: $TASK_ID"
echo "$MESSAGE" > "$REDIRECT_FILE"
echo "✅ Redirect created at $REDIRECT_FILE"
echo ""
echo "Next monitoring run (within 10 min) will send this message to the agent."
echo ""
echo "To cancel redirect: rm $REDIRECT_FILE"

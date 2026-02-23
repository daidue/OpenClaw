#!/bin/bash
# context-monitor.sh — Monitor session context usage and warn before overflow
# Usage: bash scripts/context-monitor.sh [session-key]

set -euo pipefail

SESSION_KEY="${1:-main}"
WARN_THRESHOLD=75  # Warn at 75% context usage
CRITICAL_THRESHOLD=90  # Critical at 90%

echo "📊 Context Usage Monitor"
echo "======================="
echo "Session: $SESSION_KEY"
echo "Warn threshold: ${WARN_THRESHOLD}%"
echo "Critical threshold: ${CRITICAL_THRESHOLD}%"
echo ""

# Try to get session info via openclaw
SESSION_INFO=$(openclaw sessions list --limit 100 2>/dev/null || echo "")

if [[ -z "$SESSION_INFO" ]]; then
    echo "⚠️  Could not retrieve session information"
    echo "Run: openclaw sessions list --limit 100"
    exit 1
fi

echo "$SESSION_INFO" | grep -A10 "$SESSION_KEY" || echo "Session not found in active sessions"

echo ""
echo "💡 Recommendations:"
echo ""
echo "  • Sessions should be compacted before reaching 75% context"
echo "  • If context >90%, force compaction immediately"
echo "  • Long build sessions: split into multiple sessions every 2 hours"
echo "  • Sub-agent spawning: each sub-agent should flush memory before exit"
echo ""
echo "Manual compaction trigger:"
echo "  /compact (in chat)"
echo ""
echo "Check current model context limits:"
echo "  • Claude Opus 4: 200K tokens"
echo "  • Claude Sonnet 3.5: 200K tokens"
echo "  • OpenAI Codex: 128K tokens (4.5 actual)"

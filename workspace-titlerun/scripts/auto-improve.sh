#!/bin/bash
# auto-improve.sh — Autonomous improvement loop orchestrator
# Usage: bash scripts/auto-improve.sh <program-name>
#
# Based on Karpathy's autoresearch pattern:
# - Read improvement-program.md (scope, metrics, constraints)
# - Create isolated branch
# - Iterate: modify → test → evaluate → keep/discard
# - Generate PR with results

set -euo pipefail

PROGRAM_NAME="${1:-}"
if [ -z "$PROGRAM_NAME" ]; then
  echo "❌ Usage: $0 <program-name>"
  echo "   Example: $0 test-optimization"
  exit 1
fi

PROGRAM_PATH=".clawdbot/programs/${PROGRAM_NAME}.md"
if [ ! -f "$PROGRAM_PATH" ]; then
  echo "❌ Program not found: $PROGRAM_PATH"
  exit 1
fi

# Configuration
REPO_ROOT="$(git rev-parse --show-toplevel)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BRANCH_NAME="auto-improve/${PROGRAM_NAME}/${TIMESTAMP}"
LOG_FILE=".clawdbot/improvement-log.jsonl"
SUMMARY_FILE=".clawdbot/reports/${PROGRAM_NAME}-${TIMESTAMP}.md"
MAX_ITERATIONS=${MAX_ITERATIONS:-50}
MAX_RUNTIME_MINUTES=${MAX_RUNTIME_MINUTES:-240}  # 4 hours max

# Ensure logs directory exists
mkdir -p .clawdbot/reports

echo "🤖 Auto-Improve Starting"
echo "   Program: $PROGRAM_NAME"
echo "   Branch: $BRANCH_NAME"
echo "   Max iterations: $MAX_ITERATIONS"
echo "   Max runtime: ${MAX_RUNTIME_MINUTES}m"
echo ""

# Create isolated branch
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"

# Initialize log entry
cat >> "$LOG_FILE" << EOF
{"timestamp":"$(date -Iseconds)","event":"run_start","program":"$PROGRAM_NAME","branch":"$BRANCH_NAME"}
EOF

# Spawn sub-agent with the improvement program
echo "📖 Reading program: $PROGRAM_PATH"
echo ""

# Build agent task from program.md
AGENT_TASK=$(cat <<TASK_EOF
You are running an autonomous improvement loop based on the program defined in:
$PROGRAM_PATH

Read that program carefully. It defines:
- Mission (what to improve)
- Scope (which files you can modify)
- Metrics (what success looks like)
- Constraints (hard limits)

Your job:
1. Read the program
2. Establish baseline metrics
3. Iterate up to $MAX_ITERATIONS times:
   - Analyze current code
   - Generate improvement hypothesis
   - Modify code (within scope)
   - Run tests
   - Measure metrics
   - Keep if improvement, discard if not
4. Create summary report
5. Commit best changes

Rules:
- ONLY modify files listed in program scope
- ALL tests must pass before "keep"
- TypeScript must compile without errors
- Log each iteration to: $LOG_FILE
- Generate summary to: $SUMMARY_FILE

Start now.
TASK_EOF
)

# Spawn improvement agent (using sessions_spawn would go here in OpenClaw context)
# For now, this is a placeholder that would integrate with OpenClaw's agent system

echo "🚀 Spawning improvement agent..."
echo ""
echo "⏳ This will run for up to ${MAX_RUNTIME_MINUTES} minutes..."
echo "   Logs: $LOG_FILE"
echo "   Summary: $SUMMARY_FILE"
echo ""

# The actual agent spawn would happen here via OpenClaw
# For now, output the task that would be sent
echo "📋 Agent Task:"
echo "$AGENT_TASK"
echo ""
echo "⚠️  Note: This is the orchestration script. Integration with OpenClaw"
echo "    agent spawn system (sessions_spawn) needs to be added."
echo ""
echo "💡 Next step: Call sessions_spawn with:"
echo "    runtime: subagent"
echo "    task: (see above)"
echo "    label: auto-improve-${PROGRAM_NAME}"
echo "    runTimeoutSeconds: $((MAX_RUNTIME_MINUTES * 60))"

# Log completion (placeholder)
cat >> "$LOG_FILE" << EOF
{"timestamp":"$(date -Iseconds)","event":"orchestrator_ready","program":"$PROGRAM_NAME","branch":"$BRANCH_NAME"}
EOF

exit 0

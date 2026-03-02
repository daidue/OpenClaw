#!/bin/bash
# Automated TitleRun Dogfood QA Launcher v2
# Usage: ./scripts/run-dogfood-v2.sh [target_url] [test_instructions_file]
#
# This version spawns an OpenClaw subagent to execute comprehensive QA tests

set -euo pipefail

# Configuration
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SESSION_NAME="dogfood-${TIMESTAMP}"
WORKSPACE="$HOME/.openclaw/workspace"
OUTPUT_DIR="$WORKSPACE/titlerun-qa/dogfood-${TIMESTAMP}"
TASK_REGISTRY="$WORKSPACE/.clawdbot/active-tasks.json"
TARGET_URL="${1:-https://app.titlerun.co}"
TEST_INSTRUCTIONS="${2:-titlerun-qa/test-instructions.md}"
TASK_ID="dogfood-${TIMESTAMP}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
  echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

# Header
echo ""
log "🚀 TitleRun Dogfood QA Automation v2"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "📅 Timestamp:   $TIMESTAMP"
log "🔖 Session:     $SESSION_NAME"
log "🎯 Target:      $TARGET_URL"
log "📄 Tests:       $TEST_INSTRUCTIONS"
log "📂 Output:      $OUTPUT_DIR"
echo ""

# Step 1: Verify test instructions exist
log "Step 1/5: Verifying test instructions..."
if [ ! -f "$WORKSPACE/$TEST_INSTRUCTIONS" ]; then
  error "Test instructions not found: $WORKSPACE/$TEST_INSTRUCTIONS"
fi
success "Test instructions found"

# Step 2: Create output directory
log "Step 2/5: Creating output directory..."
mkdir -p "$OUTPUT_DIR"/{screenshots,videos,logs}
success "Directory structure created"

# Step 3: Register task
log "Step 3/5: Registering task..."

TASK_JSON=$(cat <<EOF
{
  "$TASK_ID": {
    "sessionId": "$SESSION_NAME",
    "agent": "dogfood-qa",
    "agentType": "subagent",
    "description": "Comprehensive dogfood QA for TitleRun",
    "target": "$TARGET_URL",
    "testInstructions": "$TEST_INSTRUCTIONS",
    "status": "running",
    "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "estimatedDuration": "60-90 min",
    "notifyOnComplete": true,
    "outputDir": "titlerun-qa/dogfood-${TIMESTAMP}"
  }
}
EOF
)

# Merge into registry
if [ -f "$TASK_REGISTRY" ]; then
  TEMP_FILE=$(mktemp)
  jq -s '.[0] * .[1]' "$TASK_REGISTRY" <(echo "$TASK_JSON") > "$TEMP_FILE"
  mv "$TEMP_FILE" "$TASK_REGISTRY"
else
  echo "$TASK_JSON" > "$TASK_REGISTRY"
fi

success "Task registered: $TASK_ID"

# Step 4: Build task prompt for subagent
log "Step 4/5: Building QA task..."

TASK_PROMPT=$(cat <<TASK_EOF
Execute comprehensive dogfood QA on TitleRun production app.

**Target:** $TARGET_URL

**Test Instructions:** Read and execute ALL tests in $TEST_INSTRUCTIONS

**Output Location:** $OUTPUT_DIR/

**Process:**
1. Read test-instructions.md for complete test suite (9 comprehensive tests)
2. Use browser tool with profile="openclaw" to navigate and test app
3. Take screenshots for each major screen/test
4. Document all findings, load times, issues
5. Generate final report with:
   - Executive summary (score 0-100)
   - Test results (PASS/FAIL for each of 9 tests)
   - Critical/High/Medium/Low findings
   - Performance metrics
   - Data integrity verification
   - Engagement analysis
   - Prioritized recommendations

**Deliverable:** $OUTPUT_DIR/report.md (comprehensive QA report)

**Rules:**
- Screenshot EVERY major screen
- Measure and document load times
- Note any confusion points or UX issues
- Verify data consistency across pages
- Test all navigation paths
- Check for 404s or broken links
- Assess retention hooks and engagement

**Expected duration:** 60-90 minutes
**Output:** Full markdown report with screenshots
TASK_EOF
)

echo "$TASK_PROMPT" > "$OUTPUT_DIR/logs/task-prompt.txt"
success "Task prompt generated"

# Step 5: Spawn subagent via OpenClaw
log "Step 5/5: Spawning QA subagent..."

echo "openclaw sessions spawn \\
  --runtime subagent \\
  --mode run \\
  --label \"$SESSION_NAME\" \\
  --cwd \"$WORKSPACE\" \\
  --task \"$TASK_PROMPT\"" > "$OUTPUT_DIR/logs/spawn-command.sh"

chmod +x "$OUTPUT_DIR/logs/spawn-command.sh"

log "To spawn via OpenClaw (requires main agent):"
echo ""
echo "  sessions_spawn("
echo "    runtime: 'subagent',"
echo "    mode: 'run',"
echo "    label: '$SESSION_NAME',"
echo "    cwd: '$WORKSPACE',"
echo "    runTimeoutSeconds: 7200,"
echo "    task: '''$(cat $OUTPUT_DIR/logs/task-prompt.txt)'''"
echo "  )"
echo ""

success "QA task ready for subagent spawn"

echo ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
success "Dogfood QA task prepared!"
echo ""
echo "📝 Task ID:     $TASK_ID"
echo "📂 Output:      $OUTPUT_DIR"
echo "📄 Task prompt: $OUTPUT_DIR/logs/task-prompt.txt"
echo ""
echo "⚠️  NOTE: This script prepares the task. Actual execution requires spawning"
echo "    via OpenClaw's sessions_spawn (main agent must do this)."
echo ""

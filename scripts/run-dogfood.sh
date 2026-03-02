#!/bin/bash
# Automated TitleRun Dogfood QA Launcher
# Usage: ./scripts/run-dogfood.sh [target_url]
#
# This script:
# 1. Creates output directory structure
# 2. Registers task in active-tasks.json
# 3. Spawns agent-browser session
# 4. Verifies process started
# 5. Sets up monitoring
# 6. Logs all activity

set -euo pipefail

# Configuration
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SESSION_NAME="dogfood-${TIMESTAMP}"
WORKSPACE="$HOME/.openclaw/workspace"
OUTPUT_DIR="$WORKSPACE/titlerun-qa/dogfood-$DATE"
TASK_REGISTRY="$WORKSPACE/.clawdbot/active-tasks.json"
TARGET_URL="${1:-https://app.titlerun.co}"
TASK_ID="dogfood-$DATE"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# Header
echo ""
log "🚀 TitleRun Dogfood QA Automation"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "📅 Date:        $DATE"
log "🔖 Session:     $SESSION_NAME"
log "🎯 Target:      $TARGET_URL"
log "📂 Output:      $OUTPUT_DIR"
echo ""

# Step 1: Create output directory structure
log "Step 1/6: Creating output directories..."
mkdir -p "$OUTPUT_DIR"/{screenshots,videos,logs}
success "Directory structure created"

# Step 2: Register task in task registry
log "Step 2/6: Registering task..."

TASK_JSON=$(cat <<EOF
{
  "$TASK_ID": {
    "sessionId": "$SESSION_NAME",
    "agent": "rush",
    "agentType": "agent-browser",
    "description": "Weekly dogfood QA for TitleRun",
    "target": "$TARGET_URL",
    "status": "running",
    "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "estimatedDuration": "30-60 min",
    "notifyOnComplete": true,
    "outputDir": "titlerun-qa/dogfood-$DATE"
  }
}
EOF
)

# Merge into registry (create if doesn't exist)
if [ -f "$TASK_REGISTRY" ]; then
  # Merge with existing tasks
  TEMP_FILE=$(mktemp)
  jq -s '.[0] * .[1]' "$TASK_REGISTRY" <(echo "$TASK_JSON") > "$TEMP_FILE"
  mv "$TEMP_FILE" "$TASK_REGISTRY"
else
  # Create new registry
  echo "$TASK_JSON" > "$TASK_REGISTRY"
fi

success "Task registered: $TASK_ID"

# Step 3: Spawn agent-browser session
log "Step 3/6: Launching agent-browser..."

# Check if agent-browser is available
if ! command -v agent-browser &> /dev/null; then
  error "agent-browser not found in PATH"
fi

# Create launch script
LAUNCH_SCRIPT="$OUTPUT_DIR/logs/launch-session.sh"
cat > "$LAUNCH_SCRIPT" <<'LAUNCH_EOF'
#!/bin/bash
# Session wrapper - handles the full dogfood test flow

SESSION="$1"
TARGET="$2"
OUTPUT="$3"

echo "Starting agent-browser session: $SESSION"
echo "Target: $TARGET"

# Launch agent-browser and run basic tests
agent-browser --session "$SESSION" open "$TARGET"

# Wait for page load
sleep 5

# Take initial screenshot
agent-browser --session "$SESSION" screenshot "$OUTPUT/screenshots/01-home-page.png"

# Get initial snapshot
agent-browser --session "$SESSION" snapshot > "$OUTPUT/logs/01-initial-snapshot.txt"

# TODO: Add more automated test steps here
# For now, this is a minimal smoke test

echo "Session initialization complete"
LAUNCH_EOF

chmod +x "$LAUNCH_SCRIPT"

# Launch in background
nohup bash "$LAUNCH_SCRIPT" "$SESSION_NAME" "$TARGET_URL" "$OUTPUT_DIR" \
  > "$OUTPUT_DIR/logs/session.log" 2>&1 &

BROWSER_PID=$!
echo "$BROWSER_PID" > "$OUTPUT_DIR/session.pid"

success "Browser launched (PID: $BROWSER_PID)"

# Step 4: Verify process started
log "Step 4/6: Verifying process..."
sleep 3

if ps -p $BROWSER_PID > /dev/null 2>&1; then
  success "Process verified running (PID: $BROWSER_PID)"
else
  error "Process failed to start - check $OUTPUT_DIR/logs/session.log"
fi

# Step 5: Log session metadata
log "Step 5/6: Saving session metadata..."

cat > "$OUTPUT_DIR/session-info.json" <<EOF
{
  "sessionName": "$SESSION_NAME",
  "taskId": "$TASK_ID",
  "targetUrl": "$TARGET_URL",
  "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "pid": $BROWSER_PID,
  "outputDir": "$OUTPUT_DIR",
  "status": "running"
}
EOF

success "Metadata saved"

# Step 6: Start monitoring (if monitor script exists)
log "Step 6/6: Setting up monitoring..."

MONITOR_SCRIPT="$WORKSPACE/.clawdbot/scripts/monitor-dogfood-task.sh"
if [ -f "$MONITOR_SCRIPT" ]; then
  nohup bash "$MONITOR_SCRIPT" "$TASK_ID" "$SESSION_NAME" "$OUTPUT_DIR" \
    > "$OUTPUT_DIR/logs/monitor.log" 2>&1 &
  MONITOR_PID=$!
  echo "$MONITOR_PID" > "$OUTPUT_DIR/monitor.pid"
  success "Monitoring started (PID: $MONITOR_PID)"
else
  warn "Monitor script not found at $MONITOR_SCRIPT - skipping"
fi

# Summary
echo ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
success "Dogfood QA session launched successfully!"
echo ""
echo "📊 Monitor status:"
echo "   tail -f $OUTPUT_DIR/logs/session.log"
echo ""
echo "🔍 Check process:"
echo "   ps -p $BROWSER_PID"
echo ""
echo "📝 Task registry:"
echo "   cat .clawdbot/active-tasks.json | jq .$TASK_ID"
echo ""
echo "⏱️  Estimated completion: 30-60 minutes"
echo ""

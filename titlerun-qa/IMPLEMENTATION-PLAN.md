# Dogfood QA - Implementation Plan

**Status:** Ready to implement  
**Target:** Saturday 2026-03-02 (tomorrow)  
**Goal:** Automated, monitored, verifiable dogfood QA sessions

---

## Phase 1: Basic Automation (2-3 hours)

### Step 1: Create Launcher Script (30 min)

**File:** `scripts/run-dogfood.sh`

```bash
#!/bin/bash
set -euo pipefail

# Configuration
SESSION_NAME="dogfood-$(date +%Y%m%d-%H%M)"
OUTPUT_DIR="$HOME/.openclaw/workspace/titlerun-qa/dogfood-$(date +%Y-%m-%d)"
TASK_REGISTRY="$HOME/.openclaw/workspace/.clawdbot/active-tasks.json"
TARGET_URL="${1:-https://app.titlerun.co}"

echo "🚀 Launching TitleRun Dogfood QA"
echo "📅 Session: $SESSION_NAME"
echo "🎯 Target: $TARGET_URL"

# Create output directory
mkdir -p "$OUTPUT_DIR"/{screenshots,videos,logs}

# Register task
TASK_ID="dogfood-$(date +%Y%m%d)"
TASK_JSON=$(jq -n \
  --arg id "$TASK_ID" \
  --arg session "$SESSION_NAME" \
  --arg started "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{
    ($id): {
      sessionId: $session,
      agent: "rush",
      agentType: "agent-browser",
      description: "Weekly dogfood QA for TitleRun",
      target: "app.titlerun.co",
      status: "running",
      startedAt: $started,
      estimatedDuration: "30-60 min",
      notifyOnComplete: true,
      outputDir: "titlerun-qa/dogfood-\(now | strftime("%Y-%m-%d"))"
    }
  }')

# Merge into registry (create if doesn't exist)
if [ -f "$TASK_REGISTRY" ]; then
  jq ". + $TASK_JSON" "$TASK_REGISTRY" > "$TASK_REGISTRY.tmp"
  mv "$TASK_REGISTRY.tmp" "$TASK_REGISTRY"
else
  echo "$TASK_JSON" > "$TASK_REGISTRY"
fi

echo "✅ Task registered in .clawdbot/active-tasks.json"

# Launch agent-browser session (background)
echo "🌐 Starting agent-browser session..."
nohup agent-browser \
  --session "$SESSION_NAME" \
  open "$TARGET_URL" \
  > "$OUTPUT_DIR/logs/session.log" 2>&1 &

BROWSER_PID=$!
echo "📊 Browser PID: $BROWSER_PID"

# Wait and verify
sleep 5
if ps -p $BROWSER_PID > /dev/null 2>&1; then
  echo "✅ Session verified running (PID: $BROWSER_PID)"
  echo "$BROWSER_PID" > "$OUTPUT_DIR/session.pid"
else
  echo "❌ Session failed to start"
  jq --arg id "$TASK_ID" '.[$id].status = "failed" | .[$id].failedAt = (now | todate)' \
    "$TASK_REGISTRY" > "$TASK_REGISTRY.tmp"
  mv "$TASK_REGISTRY.tmp" "$TASK_REGISTRY"
  exit 1
fi

# Log session info
cat > "$OUTPUT_DIR/session-info.json" <<EOF
{
  "sessionName": "$SESSION_NAME",
  "targetUrl": "$TARGET_URL",
  "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "pid": $BROWSER_PID,
  "outputDir": "$OUTPUT_DIR"
}
EOF

echo ""
echo "📂 Output directory: $OUTPUT_DIR"
echo "📊 Monitor logs: tail -f $OUTPUT_DIR/logs/session.log"
echo "🔍 Check status: ps -p $BROWSER_PID"
echo ""
echo "✅ Dogfood QA session launched successfully"
```

**Test:** `bash scripts/run-dogfood.sh http://localhost:3000` (staging/local)

---

### Step 2: Update Monitoring (15 min)

**File:** `.clawdbot/monitor-agents.sh`

Add dogfood task monitoring:

```bash
# After existing task checks, add:

# Check dogfood tasks
for task_id in $(jq -r 'to_entries[] | select(.key | startswith("dogfood-")) | .key' "$TASK_REGISTRY"); do
  status=$(jq -r ".\"$task_id\".status" "$TASK_REGISTRY")
  
  if [ "$status" = "running" ]; then
    session_id=$(jq -r ".\"$task_id\".sessionId" "$TASK_REGISTRY")
    output_dir=$(jq -r ".\"$task_id\".outputDir" "$TASK_REGISTRY")
    
    # Check if session is still alive
    if ps aux | grep -q "agent-browser.*$session_id"; then
      echo "  ✓ Dogfood QA running ($session_id)"
    else
      # Session died - check for report
      report_path="$HOME/.openclaw/workspace/$output_dir/report.md"
      
      if [ -f "$report_path" ]; then
        # Report exists - mark complete
        jq --arg id "$task_id" \
          '.[$id].status = "complete" | .[$id].completedAt = (now | todate)' \
          "$TASK_REGISTRY" > "$TASK_REGISTRY.tmp"
        mv "$TASK_REGISTRY.tmp" "$TASK_REGISTRY"
        
        # Count issues
        critical=$(grep -c "\[CRITICAL\]" "$report_path" 2>/dev/null || echo "0")
        high=$(grep -c "\[HIGH\]" "$report_path" 2>/dev/null || echo "0")
        
        # Notify
        openclaw system event --text "🔍 Dogfood QA Complete
        
Found $critical critical, $high high priority issues
Report: $output_dir/report.md" --mode now
      else
        # No report - mark failed
        jq --arg id "$task_id" \
          '.[$id].status = "failed" | .[$id].failedAt = (now | todate) | .[$id].note = "Session ended without report"' \
          "$TASK_REGISTRY" > "$TASK_REGISTRY.tmp"
        mv "$TASK_REGISTRY.tmp" "$TASK_REGISTRY"
        
        openclaw system event --text "⚠️ Dogfood QA failed - no report generated" --mode now
      fi
    fi
  fi
done
```

---

### Step 3: Create QA Test Script (30 min)

**File:** `scripts/dogfood-test-sequence.sh`

Automated test execution (called after browser is open):

```bash
#!/bin/bash
# Run this INSIDE an agent-browser session to execute tests

SESSION=$1
OUTPUT_DIR=$2

echo "🧪 Starting automated test sequence"

# Helper functions
snapshot() {
  agent-browser --session "$SESSION" snapshot -i
}

screenshot() {
  local name=$1
  agent-browser --session "$SESSION" screenshot --annotate \
    "$OUTPUT_DIR/screenshots/$name.png"
}

click() {
  local ref=$1
  agent-browser --session "$SESSION" click "$ref"
}

wait_load() {
  agent-browser --session "$SESSION" wait --load networkidle
}

# Test sequence
echo "1️⃣ Testing home page load..."
screenshot "01-home-initial"
wait_load

echo "2️⃣ Testing navigation..."
snapshot > "$OUTPUT_DIR/logs/01-navigation-snapshot.txt"

# TODO: Add actual test steps based on SKILL.md
# - Authentication
# - Trade Builder
# - Trade Finder
# - Report Cards
# - Error states

echo "✅ Test sequence complete"
echo "📊 Results saved to: $OUTPUT_DIR"
```

---

### Step 4: Verification Checklist

Before declaring "ready":

- [ ] `run-dogfood.sh` creates all expected directories
- [ ] Task is registered in `.clawdbot/active-tasks.json`
- [ ] Browser session starts and PID is verifiable
- [ ] Monitor script detects running/completed/failed states
- [ ] Notifications fire on completion/failure
- [ ] Output directory contains screenshots/logs
- [ ] Can run on localhost without errors
- [ ] Can run on staging without errors

---

## Phase 2: Enhanced QA (Future)

### Week 2-3: Smart Testing
- Load cognitive profiles (Nielsen UX, OWASP security)
- Automated bug classification (CRITICAL/HIGH/MEDIUM/LOW)
- Screenshot comparison (detect visual regressions)
- Console error detection
- Network request analysis

### Week 4-6: Regression Suite
- Golden master baseline
- Automated regression detection
- Performance metrics (load times, API latency)
- Accessibility checks (WCAG compliance)
- Cross-browser testing (if needed)

---

## Success Metrics

**Phase 1 (Basic):**
- ✅ Session launches automatically
- ✅ Monitoring detects completion
- ✅ Report is generated
- ✅ Taylor gets notification

**Phase 2 (Enhanced):**
- 🎯 Catches 80%+ of issues before human testing
- 🎯 <5 false positives per run
- 🎯 Runs in <45 minutes
- 🎯 Zero manual intervention needed

---

## Timeline

| Day | Task | Hours |
|-----|------|-------|
| Sat (tomorrow) | Implement Phase 1 Steps 1-3 | 2h |
| Sat | Test on localhost/staging | 1h |
| Sun | Production run (scheduled dogfood) | 1h |
| Week of Mar 3 | Iterate based on results | 2-4h |
| Week of Mar 10 | Phase 2 planning | - |

---

*Plan created: 2026-03-01 19:02 EST*

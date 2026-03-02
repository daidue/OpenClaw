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
    AGENT_TYPE=$(echo "$TASKS" | jq -r ".[\"$task_id\"].agentType // empty")
    
    # For agent-browser tasks (dogfood), check PID file instead of process list
    if [ "$AGENT_TYPE" = "agent-browser" ]; then
      OUTPUT_DIR=$(echo "$TASKS" | jq -r ".[\"$task_id\"].outputDir // empty")
      PID_FILE="$WORKSPACE/$OUTPUT_DIR/session.pid"
      
      if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
          log "  ✓ Agent-browser session alive (PID: $PID)"
        else
          log "  ✗ Agent-browser session ended"
          
          # Check for report.md
          REPORT_PATH="$WORKSPACE/$OUTPUT_DIR/report.md"
          if [ -f "$REPORT_PATH" ]; then
            log "  ✓ Report generated"
            
            # Count issues
            CRITICAL=$(grep -c "\[CRITICAL\]" "$REPORT_PATH" 2>/dev/null || echo "0")
            HIGH=$(grep -c "\[HIGH\]" "$REPORT_PATH" 2>/dev/null || echo "0")
            MEDIUM=$(grep -c "\[MEDIUM\]" "$REPORT_PATH" 2>/dev/null || echo "0")
            LOW=$(grep -c "\[LOW\]" "$REPORT_PATH" 2>/dev/null || echo "0")
            TOTAL=$((CRITICAL + HIGH + MEDIUM + LOW))
            
            # Update task registry
            TMP_FILE=$(mktemp)
            jq ".[\"$task_id\"].status = \"complete\" | .[\"$task_id\"].completedAt = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"" "$TASK_REGISTRY" > "$TMP_FILE"
            mv "$TMP_FILE" "$TASK_REGISTRY"
            
            # Notify
            SEVERITY_WARNING=""
            if [ "$CRITICAL" -gt 0 ]; then
              SEVERITY_WARNING="

⚠️ $CRITICAL CRITICAL issues require immediate attention"
            fi
            
            openclaw system event --text "🔍 Dogfood QA Complete: $DESCRIPTION

Found: $TOTAL issues ($CRITICAL critical, $HIGH high, $MEDIUM medium, $LOW low)

Report: $OUTPUT_DIR/report.md$SEVERITY_WARNING" --mode now
          else
            log "  ⚠️ Session ended but no report found"
            
            # Check how many screenshots were captured
            SCREENSHOT_COUNT=0
            if [ -d "$WORKSPACE/$OUTPUT_DIR/screenshots" ]; then
              SCREENSHOT_COUNT=$(find "$WORKSPACE/$OUTPUT_DIR/screenshots" -type f -name "*.png" | wc -l | tr -d ' ')
            fi
            
            # Update status to failed
            TMP_FILE=$(mktemp)
            jq ".[\"$task_id\"].status = \"failed\" | .[\"$task_id\"].failedAt = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" | .[\"$task_id\"].note = \"Session ended without generating report\"" "$TASK_REGISTRY" > "$TMP_FILE"
            mv "$TMP_FILE" "$TASK_REGISTRY"
            
            # Alert
            openclaw system event --text "⚠️ Dogfood QA failed: $DESCRIPTION

Session ended without generating report.
Screenshots captured: $SCREENSHOT_COUNT
Check logs: $OUTPUT_DIR/logs/session.log" --mode now
          fi
        fi
      else
        log "  ⚠️ PID file not found: $PID_FILE"
      fi
    else
      # Original logic for coding agents (claude-code, codex, etc.)
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
  fi
done

# Monitor 3-AI code review sessions
log "Checking 3-AI code review sessions..."

# Find running 3-AI review sessions by label
SECURITY_SESSIONS=$(openclaw process list 2>/dev/null | grep "security-reviewer" || echo "")
PERFORMANCE_SESSIONS=$(openclaw process list 2>/dev/null | grep "performance-reviewer" || echo "")
UX_SESSIONS=$(openclaw process list 2>/dev/null | grep "ux-reviewer" || echo "")
SYNTHESIS_SESSIONS=$(openclaw process list 2>/dev/null | grep "synthesis-agent" || echo "")

# Check for stalled reviewers (running >15 minutes)
STALL_THRESHOLD=900  # 15 minutes in seconds

check_reviewer_stall() {
  local reviewer_name=$1
  local sessions=$2
  
  if [ -n "$sessions" ]; then
    echo "$sessions" | while read -r session_line; do
      # Extract session ID and start time (if available)
      SESSION_ID=$(echo "$session_line" | awk '{print $1}')
      
      # Check if review output exists (indicates completion)
      TIMESTAMP=$(date +%Y-%m-%d-%H%M)
      REVIEW_DIR="$WORKSPACE/workspace-titlerun/reviews"
      REVIEW_FILE="$REVIEW_DIR/*-${reviewer_name}.md"
      
      if ! ls $REVIEW_FILE 2>/dev/null > /dev/null; then
        log "  ⚠️ $reviewer_name session $SESSION_ID: No output file yet"
        
        # Check if session has been running >15 minutes
        # (Note: This is a simplified check - production would track start time in registry)
        log "  Monitoring: Session still active, waiting for completion"
      else
        log "  ✓ $reviewer_name session $SESSION_ID: Output generated"
      fi
    done
  fi
}

check_reviewer_stall "security" "$SECURITY_SESSIONS"
check_reviewer_stall "performance" "$PERFORMANCE_SESSIONS"
check_reviewer_stall "ux" "$UX_SESSIONS"

# Check if synthesis is ready to run (all 3 reviewers complete)
if [ -n "$SECURITY_SESSIONS" ] || [ -n "$PERFORMANCE_SESSIONS" ] || [ -n "$UX_SESSIONS" ]; then
  log "3-AI review in progress..."
  
  # Count completed reviewers
  COMPLETED=0
  
  LATEST_TIMESTAMP=$(ls -t "$WORKSPACE/workspace-titlerun/reviews" | head -1 | sed -E 's/([0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}).*/\1/')
  
  if [ -f "$WORKSPACE/workspace-titlerun/reviews/${LATEST_TIMESTAMP}-security.md" ]; then
    COMPLETED=$((COMPLETED + 1))
    log "  ✓ Security reviewer complete"
  fi
  
  if [ -f "$WORKSPACE/workspace-titlerun/reviews/${LATEST_TIMESTAMP}-performance.md" ]; then
    COMPLETED=$((COMPLETED + 1))
    log "  ✓ Performance reviewer complete"
  fi
  
  if [ -f "$WORKSPACE/workspace-titlerun/reviews/${LATEST_TIMESTAMP}-ux.md" ]; then
    COMPLETED=$((COMPLETED + 1))
    log "  ✓ UX reviewer complete"
  fi
  
  log "  Progress: $COMPLETED/3 reviewers complete"
  
  # Check if synthesis should have started
  if [ $COMPLETED -eq 3 ]; then
    if [ ! -f "$WORKSPACE/workspace-titlerun/reviews/${LATEST_TIMESTAMP}-unified.md" ]; then
      if [ -z "$SYNTHESIS_SESSIONS" ]; then
        log "  ⚠️ All reviewers complete but synthesis not started"
        openclaw system event --text "⚠️ 3-AI Review: Synthesis agent not spawned

All 3 reviewers completed but synthesis has not started.
Timestamp: $LATEST_TIMESTAMP
Manual intervention may be needed." --mode now
      else
        log "  ⏳ Synthesis in progress..."
      fi
    else
      log "  ✅ 3-AI review complete (unified report exists)"
      
      # Check score and notify
      AGGREGATE_SCORE=$(grep "^## Aggregate Score:" "$WORKSPACE/workspace-titlerun/reviews/${LATEST_TIMESTAMP}-unified.md" | grep -oE "[0-9]+/100" || echo "N/A")
      RECOMMENDATION=$(grep "^## Recommendation:" "$WORKSPACE/workspace-titlerun/reviews/${LATEST_TIMESTAMP}-unified.md" -A 1 | tail -1 | sed 's/^\*\*//' | sed 's/\*\*//' || echo "UNKNOWN")
      
      log "  Score: $AGGREGATE_SCORE"
      log "  Recommendation: $RECOMMENDATION"
      
      if [ "$RECOMMENDATION" = "BLOCK" ]; then
        openclaw system event --text "🔴 3-AI Review: BLOCK

Score: $AGGREGATE_SCORE
Recommendation: BLOCK (do not merge)

Significant quality issues found. Review report:
workspace-titlerun/reviews/${LATEST_TIMESTAMP}-unified.md" --mode now
      elif [ "$RECOMMENDATION" = "FIX FIRST" ]; then
        openclaw system event --text "⚠️ 3-AI Review: FIX FIRST

Score: $AGGREGATE_SCORE
Recommendation: Fix HIGH issues before deploy

Report: workspace-titlerun/reviews/${LATEST_TIMESTAMP}-unified.md" --mode now
      else
        openclaw system event --text "✅ 3-AI Review: SHIP

Score: $AGGREGATE_SCORE
Recommendation: Safe to merge and deploy

Report: workspace-titlerun/reviews/${LATEST_TIMESTAMP}-unified.md" --mode now
      fi
    fi
  fi
fi

log "=== Monitoring check complete ==="

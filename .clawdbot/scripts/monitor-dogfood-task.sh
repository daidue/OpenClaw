#!/bin/bash
# Monitor a specific dogfood QA task
# Usage: ./monitor-dogfood-task.sh <task_id> <session_name> <output_dir>
#
# This script:
# 1. Monitors the browser process
# 2. Checks for report completion
# 3. Updates task registry status
# 4. Sends notifications

set -euo pipefail

TASK_ID="$1"
SESSION_NAME="$2"
OUTPUT_DIR="$3"
WORKSPACE="$HOME/.openclaw/workspace"
TASK_REGISTRY="$WORKSPACE/.clawdbot/active-tasks.json"
CHECK_INTERVAL=60  # Check every minute
MAX_RUNTIME=5400   # 90 minutes max
START_TIME=$(date +%s)

log() {
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1"
}

update_task_status() {
  local status="$1"
  local note="${2:-}"
  
  TEMP_FILE=$(mktemp)
  
  if [ -n "$note" ]; then
    jq --arg id "$TASK_ID" \
       --arg status "$status" \
       --arg note "$note" \
       --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.[$id].status = $status | 
        .[$id].note = $note | 
        .[$id].updatedAt = $timestamp' \
       "$TASK_REGISTRY" > "$TEMP_FILE"
  else
    jq --arg id "$TASK_ID" \
       --arg status "$status" \
       --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '.[$id].status = $status | 
        .[$id].updatedAt = $timestamp' \
       "$TASK_REGISTRY" > "$TEMP_FILE"
  fi
  
  mv "$TEMP_FILE" "$TASK_REGISTRY"
}

send_notification() {
  local message="$1"
  
  # Try to send via OpenClaw system event
  if command -v openclaw &> /dev/null; then
    openclaw system event --text "$message" --mode now 2>/dev/null || true
  fi
  
  # Also log
  log "NOTIFICATION: $message"
}

check_process_alive() {
  # Check if PID file exists and process is running
  if [ -f "$OUTPUT_DIR/session.pid" ]; then
    PID=$(cat "$OUTPUT_DIR/session.pid")
    if ps -p "$PID" > /dev/null 2>&1; then
      return 0  # Process alive
    fi
  fi
  return 1  # Process dead
}

check_for_report() {
  # Check if report.md exists
  if [ -f "$OUTPUT_DIR/report.md" ]; then
    return 0  # Report exists
  fi
  return 1  # No report
}

count_issues() {
  local report="$OUTPUT_DIR/report.md"
  
  if [ ! -f "$report" ]; then
    echo "0 0 0 0"
    return
  fi
  
  CRITICAL=$(grep -c "\[CRITICAL\]" "$report" 2>/dev/null || echo "0")
  HIGH=$(grep -c "\[HIGH\]" "$report" 2>/dev/null || echo "0")
  MEDIUM=$(grep -c "\[MEDIUM\]" "$report" 2>/dev/null || echo "0")
  LOW=$(grep -c "\[LOW\]" "$report" 2>/dev/null || echo "0")
  
  echo "$CRITICAL $HIGH $MEDIUM $LOW"
}

check_for_screenshots() {
  # Count screenshots to track progress
  if [ -d "$OUTPUT_DIR/screenshots" ]; then
    find "$OUTPUT_DIR/screenshots" -type f -name "*.png" | wc -l | tr -d ' '
  else
    echo "0"
  fi
}

log "Starting monitor for task: $TASK_ID"
log "Session: $SESSION_NAME"
log "Output: $OUTPUT_DIR"

# Main monitoring loop
while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  
  # Check for timeout
  if [ $ELAPSED -gt $MAX_RUNTIME ]; then
    log "⚠️  Task exceeded max runtime (90 minutes)"
    update_task_status "failed" "Exceeded maximum runtime of 90 minutes"
    send_notification "⚠️ Dogfood QA failed - exceeded 90-minute timeout

Task: $TASK_ID
Check logs: $OUTPUT_DIR/logs/"
    exit 1
  fi
  
  # Check if process is still running
  if ! check_process_alive; then
    log "Process ended - checking for completion..."
    
    # Give it a few seconds for final file writes
    sleep 5
    
    # Check for report
    if check_for_report; then
      # Success - report exists
      read -r CRITICAL HIGH MEDIUM LOW <<< "$(count_issues)"
      TOTAL=$((CRITICAL + HIGH + MEDIUM + LOW))
      
      log "✅ Task completed successfully"
      log "Found: $TOTAL issues ($CRITICAL critical, $HIGH high, $MEDIUM medium, $LOW low)"
      
      update_task_status "complete"
      
      SEVERITY_WARNING=""
      if [ "$CRITICAL" -gt 0 ]; then
        SEVERITY_WARNING="

⚠️ $CRITICAL CRITICAL issues require immediate attention"
      fi
      
      send_notification "🔍 TitleRun Dogfood QA Complete

Found: $TOTAL issues
  • $CRITICAL critical
  • $HIGH high
  • $MEDIUM medium  
  • $LOW low

Report: titlerun-qa/dogfood-$(date +%Y-%m-%d)/report.md$SEVERITY_WARNING"
      
      exit 0
    else
      # Failure - no report
      SCREENSHOT_COUNT=$(check_for_screenshots)
      
      log "❌ Task failed - no report generated"
      log "Screenshots captured: $SCREENSHOT_COUNT"
      
      update_task_status "failed" "Session ended without generating report.md"
      
      send_notification "⚠️ Dogfood QA failed - no report generated

Task: $TASK_ID
Screenshots captured: $SCREENSHOT_COUNT
Check logs: $OUTPUT_DIR/logs/session.log"
      
      exit 1
    fi
  fi
  
  # Process still running - log progress
  SCREENSHOT_COUNT=$(check_for_screenshots)
  log "Process running... ($ELAPSED seconds elapsed, $SCREENSHOT_COUNT screenshots)"
  
  sleep $CHECK_INTERVAL
done

#!/bin/bash
# Monitor dogfood session and notify Taylor when complete

SESSION_ID="ember-dune"
CHECK_INTERVAL=300  # 5 minutes

while true; do
  # Check if session still running
  if ! openclaw process list 2>/dev/null | grep -q "$SESSION_ID"; then
    # Session ended - check for report
    REPORT_PATH="$HOME/.openclaw/workspace/titlerun-qa/dogfood-$(date +%Y-%m-%d)/report.md"
    
    if [ -f "$REPORT_PATH" ]; then
      # Count issues
      CRITICAL=$(grep -c "\[CRITICAL\]" "$REPORT_PATH" 2>/dev/null || echo "0")
      HIGH=$(grep -c "\[HIGH\]" "$REPORT_PATH" 2>/dev/null || echo "0")
      MEDIUM=$(grep -c "\[MEDIUM\]" "$REPORT_PATH" 2>/dev/null || echo "0")
      LOW=$(grep -c "\[LOW\]" "$REPORT_PATH" 2>/dev/null || echo "0")
      TOTAL=$((CRITICAL + HIGH + MEDIUM + LOW))
      
      # Notify via OpenClaw system event
      openclaw system event --text "🔍 TitleRun Dogfood QA Complete

Found: $TOTAL issues ($CRITICAL critical, $HIGH high, $MEDIUM medium, $LOW low)

Report: titlerun-qa/dogfood-$(date +%Y-%m-%d)/report.md

$([ $CRITICAL -gt 0 ] && echo "⚠️ $CRITICAL CRITICAL issues require immediate attention")" --mode now
    else
      # Session ended but no report
      openclaw system event --text "⚠️ TitleRun Dogfood session ended but no report.md found. Check titlerun-qa/dogfood-$(date +%Y-%m-%d)/" --mode now
    fi
    exit 0
  fi
  
  sleep $CHECK_INTERVAL
done

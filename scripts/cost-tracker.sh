#!/bin/bash
# cost-tracker.sh — Lightweight daily cost estimation from session file sizes
# Session JSONL files don't contain token counts directly, so we estimate
# from file size growth (1KB ≈ 750 tokens for Anthropic API payloads)
#
# Usage: ./cost-tracker.sh [daily|weekly|check]
# Output: workspace/memory/daily/YYYY-MM-DD-costs.md
#
# Pricing (Feb 2026):
#   Sonnet 4.5: $3/MTok input, $15/MTok output (blended ~$9/MTok)
#   Opus 4:     $15/MTok input, $75/MTok output (blended ~$45/MTok)

set -euo pipefail

AGENTS_DIR="$HOME/.openclaw/agents"
WORKSPACE="$HOME/.openclaw/workspace"
OUTPUT_DIR="$WORKSPACE/memory/daily"
TODAY=$(date +%Y-%m-%d)
YESTERDAY=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d "yesterday" +%Y-%m-%d)

mkdir -p "$OUTPUT_DIR"

# Agent → model mapping (from openclaw.json)
declare -A AGENT_MODEL=(
  [main]="opus"
  [commerce]="sonnet"
  [titlerun]="sonnet"
  [polymarket]="sonnet"
  [researcher]="sonnet"
  [dev]="sonnet"
)

# Blended cost per MB of session data (empirically calibrated)
# Opus: ~$45/MTok, ~750 tok/KB → ~$33.75/MB
# Sonnet: ~$9/MTok, ~750 tok/KB → ~$6.75/MB
declare -A COST_PER_MB=(
  [opus]="33.75"
  [sonnet]="6.75"
)

# Budget limits from PORTFOLIO.md
declare -A DAILY_BUDGET=(
  [main]="4"
  [commerce]="15"
  [titlerun]="7"
  [polymarket]="4"
  [researcher]="2"
  [dev]="2"
)

estimate_daily_cost() {
  local agent=$1
  local model=${AGENT_MODEL[$agent]:-sonnet}
  local cost_per_mb=${COST_PER_MB[$model]}
  local sessions_dir="$AGENTS_DIR/$agent/sessions"
  
  if [ ! -d "$sessions_dir" ]; then
    echo "0"
    return
  fi
  
  # Sum bytes of files modified today
  local bytes
  bytes=$(find "$sessions_dir" -name "*.jsonl" -newer /tmp/.cost-tracker-yesterday 2>/dev/null | xargs du -cb 2>/dev/null | tail -1 | awk '{print $1}')
  
  if [ -z "$bytes" ] || [ "$bytes" = "0" ]; then
    # Fallback: check sessions.json modification
    local sfile="$sessions_dir/sessions.json"
    if [ -f "$sfile" ]; then
      local mod_date
      mod_date=$(date -r "$sfile" +%Y-%m-%d 2>/dev/null || echo "none")
      if [ "$mod_date" = "$TODAY" ]; then
        bytes=$(wc -c < "$sfile")
        # Only count ~10% as today's activity (rough estimate)
        bytes=$((bytes / 10))
      else
        echo "0"
        return
      fi
    else
      echo "0"
      return
    fi
  fi
  
  # Convert to MB and multiply by cost
  local mb
  mb=$(echo "scale=4; $bytes / 1048576" | bc)
  echo "scale=2; $mb * $cost_per_mb" | bc
}

daily_report() {
  # Create timestamp reference for "today" filtering
  touch -t "$(date +%Y%m%d)0000" /tmp/.cost-tracker-yesterday 2>/dev/null || true
  
  local total=0
  local report="# Cost Estimate — $TODAY\n\n"
  report+="| Agent | Model | Est. Cost | Budget | Status |\n"
  report+="|-------|-------|-----------|--------|--------|\n"
  
  for agent in main commerce titlerun polymarket researcher dev; do
    local cost
    cost=$(estimate_daily_cost "$agent")
    local budget=${DAILY_BUDGET[$agent]:-2}
    local model=${AGENT_MODEL[$agent]:-sonnet}
    local status="✅"
    
    if [ -n "$cost" ] && [ "$cost" != "0" ]; then
      local pct
      pct=$(echo "scale=0; $cost * 100 / $budget" | bc 2>/dev/null || echo "0")
      if [ "$pct" -gt 150 ]; then
        status="🔴 ${pct}%"
      elif [ "$pct" -gt 100 ]; then
        status="⚠️ ${pct}%"
      else
        status="✅ ${pct}%"
      fi
      total=$(echo "scale=2; $total + $cost" | bc)
    else
      cost="0.00"
      status="⚪ inactive"
    fi
    
    report+="| $agent | $model | \$${cost} | \$${budget} | $status |\n"
  done
  
  report+="\n**Total estimated: \$$total / \$34 budget**\n"
  
  # Alert thresholds
  local total_int
  total_int=$(echo "scale=0; $total / 1" | bc 2>/dev/null || echo "0")
  if [ "$total_int" -gt 50 ]; then
    report+="\n🔴 **CRITICAL: Estimated spend >\$50. Throttle sub-agents.**\n"
  elif [ "$total_int" -gt 37 ]; then
    report+="\n⚠️ **WARNING: Estimated spend above \$37 budget ceiling.**\n"
  fi
  
  echo -e "$report" > "$OUTPUT_DIR/${TODAY}-costs.md"
  echo -e "$report"
}

check_alerts() {
  # Quick check for budget alerts — suitable for cron
  daily_report > /dev/null 2>&1
  
  if [ -f "$OUTPUT_DIR/${TODAY}-costs.md" ]; then
    grep -q "CRITICAL\|WARNING" "$OUTPUT_DIR/${TODAY}-costs.md" && {
      echo "ALERT: Cost threshold exceeded. See $OUTPUT_DIR/${TODAY}-costs.md"
      exit 1
    }
  fi
  echo "OK: Costs within budget."
}

case "${1:-daily}" in
  daily) daily_report ;;
  check) check_alerts ;;
  *) echo "Usage: $0 [daily|check]" ;;
esac

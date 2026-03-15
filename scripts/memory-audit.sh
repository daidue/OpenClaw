#!/bin/bash
# memory-audit.sh — Detect low memory search usage across agents
# Usage: bash scripts/memory-audit.sh [days] (default: 7)

set -euo pipefail

DAYS="${1:-7}"
WORKSPACE="/Users/jeffdaniels/.openclaw/workspace"
THRESHOLD_PER_DAY=3  # Minimum expected searches per active day

echo "🔍 Memory Search Audit (last $DAYS days)"
echo "========================================"
echo ""

# Function to count memory searches in logs
count_searches() {
    local agent_name="$1"
    local log_file="$2"
    
    if [[ ! -f "$log_file" ]]; then
        echo "  ⚠️  No log file found: $log_file"
        return
    fi
    
    # Count memory_search tool invocations
    local search_count=$(grep -c "memory_search" "$log_file" 2>/dev/null || echo "0")
    local days_active=$(grep -oE "[0-9]{4}-[0-9]{2}-[0-9]{2}" "$log_file" 2>/dev/null | sort -u | wc -l | xargs)
    
    if [[ $days_active -eq 0 ]]; then
        echo "  ℹ️  $agent_name: No activity in logs"
        return
    fi
    
    local avg_per_day=$(echo "scale=1; $search_count / $days_active" | bc -l)
    local status="✅"
    
    if (( $(echo "$avg_per_day < $THRESHOLD_PER_DAY" | bc -l) )); then
        status="🔴"
    fi
    
    echo "  $status $agent_name: $search_count searches across $days_active active days (avg: $avg_per_day/day)"
}

# Check main agent (Jeff)
echo "📊 Agent Memory Search Frequency:"
echo ""

# Gateway logs contain all tool invocations
GATEWAY_LOG="$HOME/.openclaw/logs/gateway.log"

if [[ -f "$GATEWAY_LOG" ]]; then
    # Extract last N days of logs
    CUTOFF_DATE=$(date -v-${DAYS}d +"%Y-%m-%d" 2>/dev/null || date -d "$DAYS days ago" +"%Y-%m-%d")
    
    # Count memory_search invocations in the last N days
    CUTOFF_EPOCH=$(date -v-${DAYS}d +%s 2>/dev/null || date -d "$DAYS days ago" +%s)
    TOTAL_SEARCHES=$(awk -v cutoff="$CUTOFF_EPOCH" '/memory_search/ {
        # Extract timestamp and convert to epoch
        match($0, /[0-9]{4}-[0-9]{2}-[0-9]{2}/)
        if (RSTART > 0) {
            date_str = substr($0, RSTART, RLENGTH)
            cmd = "date -j -f \"%Y-%m-%d\" \"" date_str "\" +%s 2>/dev/null || date -d \"" date_str "\" +%s 2>/dev/null"
            cmd | getline epoch
            close(cmd)
            if (epoch >= cutoff) count++
        }
    } END {print count+0}' "$GATEWAY_LOG")
    DAYS_SPAN=$DAYS
    AVG_PER_DAY=$(echo "scale=1; $TOTAL_SEARCHES / $DAYS_SPAN" | bc -l)
    
    echo "  Overall (all agents): $TOTAL_SEARCHES searches in $DAYS_SPAN days (avg: $AVG_PER_DAY/day)"
    echo ""
    
    if (( $(echo "$AVG_PER_DAY < $THRESHOLD_PER_DAY" | bc -l) )); then
        echo "  🔴 ALERT: Memory search usage is BELOW THRESHOLD ($THRESHOLD_PER_DAY/day)"
        echo "  Agents are not following memory discipline protocol."
        echo ""
    else
        echo "  ✅ Memory search usage is healthy."
        echo ""
    fi
else
    echo "  ⚠️  Gateway log not found: $GATEWAY_LOG"
fi

# Check for memory files that should exist
echo "📁 Memory File Health:"
echo ""

check_memory_file() {
    local path="$1"
    local label="$2"
    
    if [[ -f "$path" ]]; then
        local size=$(wc -c < "$path" | xargs)
        local lines=$(wc -l < "$path" | xargs)
        echo "  ✅ $label: $lines lines, $size bytes"
    else
        echo "  🔴 MISSING: $label at $path"
    fi
}

check_memory_file "$WORKSPACE/MEMORY.md" "Main memory (Jeff)"
check_memory_file "$WORKSPACE/PORTFOLIO-MEMORY.md" "Portfolio memory (Jeff)"
check_memory_file "$WORKSPACE/memory/$(date +%Y-%m-%d).md" "Today's notes (Jeff)"
check_memory_file "$WORKSPACE/workspace-titlerun/MEMORY.md" "TitleRun memory (Rush)"
check_memory_file "$WORKSPACE/workspace-commerce/MEMORY.md" "Commerce memory (Grind)"
check_memory_file "$WORKSPACE/workspace-polymarket/MEMORY.md" "Polymarket memory (Edge)"

echo ""
echo "💡 Recommendations:"
echo ""

if (( $(echo "$AVG_PER_DAY < $THRESHOLD_PER_DAY" | bc -l) )); then
    echo "  1. Review SOUL.md and HEARTBEAT.md for all agents"
    echo "  2. Add mandatory memory_search to session start protocols"
    echo "  3. Train agents: 'Before answering, search memory first'"
    echo "  4. Set up weekly memory audit cron (this script)"
else
    echo "  ✅ No immediate action needed. Memory discipline is healthy."
fi

echo ""
echo "Run: openclaw logs --limit 1000 | grep memory_search"
echo "To see recent memory search activity in detail."

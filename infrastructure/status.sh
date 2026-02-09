#!/bin/bash
# Infrastructure Status Dashboard

cd /Users/jeffdaniels/.openclaw/workspace

echo "==================================="
echo "Infrastructure Status Dashboard"
echo "==================================="
echo "Generated: $(date '+%Y-%m-%d %H:%M:%S EST')"
echo ""

# System 1: Context Retention
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SYSTEM 1: CONTEXT RETENTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "memory/vector/faiss.index" ]; then
    SIZE=$(du -h memory/vector/faiss.index | cut -f1)
    VECTORS=$(python3 -c "import faiss; idx = faiss.read_index('memory/vector/faiss.index'); print(idx.ntotal)" 2>/dev/null || echo "?")
    echo "✓ Vector Memory: $VECTORS vectors ($SIZE)"
else
    echo "✗ Vector Memory: Not initialized"
fi

HOURLY_COUNT=$(ls memory/hourly/*.md 2>/dev/null | wc -l | xargs)
if [ "$HOURLY_COUNT" -gt 0 ]; then
    LATEST_HOURLY=$(ls -t memory/hourly/*.md 2>/dev/null | head -1 | xargs basename)
    echo "✓ Hourly Summaries: $HOURLY_COUNT files (latest: $LATEST_HOURLY)"
else
    echo "○ Hourly Summaries: None yet"
fi

echo ""

# System 2: Cross-Agent Intelligence
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SYSTEM 2: CROSS-AGENT INTELLIGENCE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "PRIORITIES.md" ]; then
    UPDATED=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" PRIORITIES.md 2>/dev/null || stat -c "%y" PRIORITIES.md 2>/dev/null | cut -d. -f1)
    PRIORITY_COUNT=$(grep -c "^###" PRIORITIES.md)
    echo "✓ PRIORITIES.md: $PRIORITY_COUNT priorities (updated: $UPDATED)"
else
    echo "✗ PRIORITIES.md: Not found"
fi

if [ -f "infrastructure/cross-agent/cross-signals.json" ]; then
    SIGNALS=$(python3 -c "import json; data=json.load(open('infrastructure/cross-agent/cross-signals.json')); print(len(data.get('active_signals', [])))" 2>/dev/null || echo "?")
    echo "✓ Cross-Signals: $SIGNALS active"
else
    echo "○ Cross-Signals: Not yet detected"
fi

SYNC_COUNT=$(ls shared-learnings/daily-sync/*.md 2>/dev/null | wc -l | xargs)
if [ "$SYNC_COUNT" -gt 0 ]; then
    LATEST_SYNC=$(ls -t shared-learnings/daily-sync/*.md 2>/dev/null | head -1 | xargs basename)
    echo "✓ Daily Syncs: $SYNC_COUNT files (latest: $LATEST_SYNC)"
else
    echo "○ Daily Syncs: None yet"
fi

echo ""

# System 3: Memory Compounding
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SYSTEM 3: MEMORY COMPOUNDING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

WEEKLY_COUNT=$(ls memory/weekly/*.md 2>/dev/null | wc -l | xargs)
if [ "$WEEKLY_COUNT" -gt 0 ]; then
    LATEST_WEEKLY=$(ls -t memory/weekly/*.md 2>/dev/null | head -1 | xargs basename)
    echo "✓ Weekly Synthesis: $WEEKLY_COUNT files (latest: $LATEST_WEEKLY)"
else
    echo "○ Weekly Synthesis: None yet"
fi

if [ -f "feedback/mistakes.json" ]; then
    MISTAKES=$(python3 -c "import json; data=json.load(open('feedback/mistakes.json')); print(len(data.get('patterns', [])))" 2>/dev/null || echo "?")
    echo "✓ Mistake Patterns: $MISTAKES tracked"
else
    echo "○ Mistake Patterns: None tracked"
fi

FEEDBACK_COUNT=$(ls feedback/feedback-*.json 2>/dev/null | wc -l | xargs)
if [ "$FEEDBACK_COUNT" -gt 0 ]; then
    echo "✓ Feedback Files: $FEEDBACK_COUNT weeks"
else
    echo "○ Feedback Files: None yet"
fi

DECISIONS_COUNT=$(cat feedback/decisions/*.jsonl 2>/dev/null | wc -l | xargs)
if [ "$DECISIONS_COUNT" -gt 0 ]; then
    echo "✓ Decisions Logged: $DECISIONS_COUNT total"
else
    echo "○ Decisions Logged: None yet"
fi

echo ""

# System 4: Voice Pipeline
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SYSTEM 4: VOICE PIPELINE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PENDING_VOICE=$(ls voice/incoming/*.{mp3,m4a,ogg,wav} 2>/dev/null | wc -l | xargs)
TRANSCRIPTS=$(ls voice/transcripts/*.json 2>/dev/null | wc -l | xargs)
EXTRACTIONS=$(ls voice/extractions/*-extraction.json 2>/dev/null | wc -l | xargs)

if [ "$PENDING_VOICE" -gt 0 ]; then
    echo "⚠ Pending Voice Notes: $PENDING_VOICE (needs processing)"
else
    echo "○ Pending Voice Notes: None"
fi

if [ "$TRANSCRIPTS" -gt 0 ]; then
    echo "✓ Transcripts: $TRANSCRIPTS files"
else
    echo "○ Transcripts: None yet"
fi

if [ "$EXTRACTIONS" -gt 0 ]; then
    echo "✓ Extractions: $EXTRACTIONS files"
else
    echo "○ Extractions: None yet"
fi

echo ""

# System 5: Recursive Prompting
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SYSTEM 5: RECURSIVE PROMPTING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HISTORY_COUNT=$(ls infrastructure/recursive-prompting/history/*.json 2>/dev/null | wc -l | xargs)
if [ "$HISTORY_COUNT" -gt 0 ]; then
    echo "✓ Three-Pass History: $HISTORY_COUNT executions"
else
    echo "○ Three-Pass History: None yet"
fi

if [ -f "infrastructure/recursive-prompting/INTEGRATION.md" ]; then
    echo "✓ Integration Guide: Available"
else
    echo "○ Integration Guide: Not created"
fi

echo ""

# System 6: Feedback Router
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SYSTEM 6: FEEDBACK ROUTER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PENDING_DECISIONS=$(ls feedback/pending/*.json 2>/dev/null | wc -l | xargs)
ARCHIVED_DECISIONS=$(ls feedback/archive/*.json 2>/dev/null | wc -l | xargs)

if [ "$PENDING_DECISIONS" -gt 0 ]; then
    echo "⚠ Pending Decisions: $PENDING_DECISIONS (waiting for response)"
else
    echo "○ Pending Decisions: None"
fi

if [ "$ARCHIVED_DECISIONS" -gt 0 ]; then
    echo "✓ Archived Decisions: $ARCHIVED_DECISIONS"
else
    echo "○ Archived Decisions: None yet"
fi

if [ -f "feedback/decision-patterns.json" ]; then
    echo "✓ Decision Patterns: Analyzed"
else
    echo "○ Decision Patterns: Not yet analyzed"
fi

echo ""

# Cron Jobs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "AUTOMATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CRON_COUNT=$(crontab -l 2>/dev/null | grep -v "^#" | grep -c "infrastructure" || echo "0")
if [ "$CRON_COUNT" -gt 0 ]; then
    echo "✓ Cron Jobs: $CRON_COUNT active"
else
    echo "✗ Cron Jobs: None configured"
    echo "  Run: crontab -e"
    echo "  Copy from: infrastructure/cron-schedule.txt"
fi

echo ""

# Logs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "LOGS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "logs" ]; then
    LOG_COUNT=$(ls logs/*.log 2>/dev/null | wc -l | xargs)
    if [ "$LOG_COUNT" -gt 0 ]; then
        echo "✓ Log Files: $LOG_COUNT"
        
        # Show recent errors
        RECENT_ERRORS=$(find logs -name "*.log" -mtime -1 -exec grep -i "error" {} \; 2>/dev/null | wc -l | xargs)
        if [ "$RECENT_ERRORS" -gt 0 ]; then
            echo "⚠ Recent Errors: $RECENT_ERRORS (last 24h)"
        else
            echo "✓ No recent errors"
        fi
    else
        echo "○ Log Files: None yet"
    fi
else
    echo "○ Log Directory: Not created"
fi

echo ""
echo "==================================="
echo ""

# Quick actions
echo "Quick Actions:"
echo "  View hourly summary: cat memory/hourly/\$(date +%Y-%m-%d).md"
echo "  View priorities: cat PRIORITIES.md"
echo "  Check logs: tail -f logs/*.log"
echo "  Run tests: ./infrastructure/test-all.sh"
echo ""

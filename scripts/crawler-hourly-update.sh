#!/bin/bash

# Crawler hourly update script
# Checks progress and sends update to Taylor via Telegram

STATS_ENDPOINT="http://localhost:3001/api/crawler/stats"
LOG_PATH=$(cat /tmp/crawler-log-path.txt 2>/dev/null || echo "/tmp/crawler-extended.log")

# Fetch current stats
STATS=$(curl -s "$STATS_ENDPOINT" 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "❌ Could not fetch crawler stats (API may be down)"
  exit 1
fi

# Parse stats
USERS=$(echo "$STATS" | jq -r '.stats.totals.users_discovered // 0')
LEAGUES=$(echo "$STATS" | jq -r '.stats.totals.leagues_discovered // 0')
TRADES=$(echo "$STATS" | jq -r '.stats.totals.transactions_fetched // 0')

# Check if crawler is still running
CRAWLER_PID=$(cat /tmp/crawler-pid.txt 2>/dev/null)
if [ -n "$CRAWLER_PID" ] && ps -p "$CRAWLER_PID" > /dev/null 2>&1; then
  STATUS="🟢 Running"
else
  STATUS="⚪ Stopped"
fi

# Format update message
UPDATE="
📊 **Crawler Progress Update**

**Status:** $STATUS
**Users:** $USERS
**Leagues:** $LEAGUES
**Trades:** $TRADES

**Target:** 50-200 leagues
**Progress:** $(( LEAGUES * 100 / 50 ))% to min target

Last log lines:
\`\`\`
$(tail -5 "$LOG_PATH" 2>/dev/null || echo "No log available")
\`\`\`
"

echo "$UPDATE"

# Send to Taylor via Telegram (using message tool in next OpenClaw session)
echo "$UPDATE" > /tmp/crawler-update-$(date +%H).txt

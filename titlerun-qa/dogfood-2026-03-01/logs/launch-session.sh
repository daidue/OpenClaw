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

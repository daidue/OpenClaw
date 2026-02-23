#!/bin/bash
# Find the 5-expert panel output
SESSION_ID="9713e78d-3686-4b7c-a658-321e49fb525b"
SESSION_FILE="$HOME/.openclaw/agents/dev/sessions/${SESSION_ID}.jsonl"

if [ -f "$SESSION_FILE" ]; then
    echo "Found session file: $SESSION_FILE"
    echo "Looking for expert panel report..."
    cat "$SESSION_FILE" | jq -r 'select(.type=="message" and .role=="assistant") | .content[0].text' | grep -C 10 "Expert" | head -100
else
    echo "Session file not found. Looking in latest sessions..."
    ls -lt ~/.openclaw/agents/dev/sessions/*.jsonl | head -3
fi

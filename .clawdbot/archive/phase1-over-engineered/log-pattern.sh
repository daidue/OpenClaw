#!/usr/bin/env bash
set -euo pipefail

# Usage: log-pattern.sh <name> <context> <worked> <didnt-work> <prompt> <est> <actual> <lesson>

NAME="$1"
CONTEXT="$2"
WORKED="$3"
DIDNT_WORK="$4"
PROMPT="$5"
EST="$6"
ACTUAL="$7"
LESSON="$8"

cat >> ~/.openclaw/workspace/memory/patterns.md << EOF

## Pattern: $NAME ($(date +%Y-%m-%d))
**Context:** $CONTEXT

**What Worked:**
$WORKED

**What Didn't:**
$DIDNT_WORK

**Prompt Pattern:**
\`\`\`
$PROMPT
\`\`\`

**Time:** Estimated $EST, Actual $ACTUAL

**Lesson:** $LESSON

---
EOF

echo "✅ Pattern logged: $NAME"

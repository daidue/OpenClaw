#!/bin/bash
# Complete Task Script
# Call this when a sub-agent finishes to archive it from active-tasks.json
# Usage: complete-task.sh <task-id> <status> [result-summary]
#
# Example:
#   complete-task.sh "contract-integration" "completed" "Merged to main, all tests passing"

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
TASK_REGISTRY="$WORKSPACE/.clawdbot/active-tasks.json"
PATTERNS_FILE="$WORKSPACE/memory/patterns.md"

# Parse arguments
TASK_ID="${1:-}"
STATUS="${2:-completed}"
RESULT="${3:-No result provided}"

if [ -z "$TASK_ID" ]; then
  echo "Usage: complete-task.sh <task-id> [status] [result]"
  exit 1
fi

# Ensure registry exists
if [ ! -f "$TASK_REGISTRY" ]; then
  echo "❌ Task registry not found at $TASK_REGISTRY"
  exit 1
fi

# Check if task exists
EXISTING=$(cat "$TASK_REGISTRY" | jq --arg id "$TASK_ID" '.tasks[] | select(.id == $id) | .id' -r)
if [ -z "$EXISTING" ]; then
  echo "⚠️  Task ID '$TASK_ID' not found in registry"
  echo "   Active tasks:"
  cat "$TASK_REGISTRY" | jq -r '.tasks[] | "   - \(.id) (\(.type))"'
  exit 0
fi

# Calculate runtime
START_TIME=$(cat "$TASK_REGISTRY" | jq --arg id "$TASK_ID" -r '.tasks[] | select(.id == $id) | .startTime')
# Convert ISO 8601 to epoch (handle both UTC 'Z' and timezone offsets)
START_EPOCH=$(date -jf "%Y-%m-%dT%H:%M:%S" "$(echo "$START_TIME" | sed 's/[+-][0-9][0-9]:[0-9][0-9]$//' | sed 's/Z$//')" "+%s" 2>/dev/null || date +%s)
NOW_EPOCH=$(date +%s)
RUNTIME_MINUTES=$(( ($NOW_EPOCH - $START_EPOCH) / 60 ))
[ $RUNTIME_MINUTES -lt 0 ] && RUNTIME_MINUTES=0  # Handle timezone edge cases

# Move task to recentCompletions
TMP_FILE=$(mktemp)
cat "$TASK_REGISTRY" | jq \
  --arg id "$TASK_ID" \
  --arg status "$STATUS" \
  --arg result "$RESULT" \
  --argjson runtime "$RUNTIME_MINUTES" \
  '
  (.tasks[] | select(.id == $id)) as $task |
  .recentCompletions = [
    {
      id: $task.id,
      type: $task.type,
      agent: $task.agent,
      status: $status,
      completed: (now | todate),
      runtime: "\($runtime)m",
      result: $result
    }
  ] + .recentCompletions[:9] |
  .tasks = [.tasks[] | select(.id != $id)] |
  .lastUpdated = (now | todate)
  ' > "$TMP_FILE"

mv "$TMP_FILE" "$TASK_REGISTRY"

echo "✅ Task completed: $TASK_ID"
echo "   Status: $STATUS"
echo "   Runtime: ${RUNTIME_MINUTES}m"
echo "   Result: $RESULT"
echo ""
echo "📋 Remaining active tasks:"
REMAINING=$(cat "$TASK_REGISTRY" | jq -r '.tasks | length')
if [ "$REMAINING" -eq 0 ]; then
  echo "   (none)"
else
  cat "$TASK_REGISTRY" | jq -r '.tasks[] | "   - \(.id) (\(.type))"'
fi

# ============================================================================
# PATTERN LEARNING SYSTEM
# ============================================================================

capture_prompt_pattern() {
  echo ""
  echo "=== Capture Prompt That Worked ==="
  read -p "Task type (e.g. 'Database Migration', 'API Integration'): " task_type
  read -p "Brief description (one line): " description
  echo "Enter the prompt that worked (end with Ctrl+D on blank line):"
  prompt_text=$(cat)
  read -p "What it produced/outcome: " outcome
  read -p "Reusable? (yes/no): " reusable
  read -p "When to use this pattern: " context
  
  # Validate not empty
  if [ -z "$task_type" ] || [ -z "$prompt_text" ]; then
    echo "❌ Task type and prompt are required. Pattern not saved."
    return
  fi
  
  # Append to patterns file
  cat >> "$PATTERNS_FILE" << EOF

### $(date +%Y-%m-%d) $task_type — $description
- **Prompt:** "$prompt_text"
- **Outcome:** $outcome
- **Reusable:** ${reusable:-Unknown}
- **Context:** $context

---
EOF
  
  echo "✅ Prompt pattern saved!"
}

capture_antipattern() {
  echo ""
  echo "=== Capture Anti-Pattern (What Failed) ==="
  read -p "Task type (e.g. 'Database Migration', 'File Locking'): " task_type
  read -p "What failed (one line description): " description
  read -p "What was attempted: " attempted
  read -p "Failure mode (how it failed): " failure_mode
  read -p "Root cause (why it failed): " root_cause
  read -p "Lesson (what to do instead): " lesson
  
  # Validate not empty and not too vague
  if [ -z "$task_type" ] || [ -z "$lesson" ]; then
    echo "❌ Task type and lesson are required. Pattern not saved."
    return
  fi
  
  if [ ${#lesson} -lt 20 ]; then
    echo "❌ Lesson too vague (must be >20 chars). Be specific. Pattern not saved."
    return
  fi
  
  # Append to patterns file under Anti-Patterns section
  # Find the Anti-Patterns section and insert before the next ## heading
  TMP=$(mktemp)
  awk -v date="$(date +%Y-%m-%d)" \
      -v type="$task_type" \
      -v desc="$description" \
      -v attempted="$attempted" \
      -v failure="$failure_mode" \
      -v root="$root_cause" \
      -v lesson="$lesson" '
    /^## Anti-Patterns/ { 
      print; 
      getline;
      print;
      printf "\n### %s %s — %s\n", date, type, desc;
      printf "- **Attempted:** %s\n", attempted;
      printf "- **Failure mode:** %s\n", failure;
      printf "- **Root cause:** %s\n", root;
      printf "- **Lesson:** %s\n", lesson;
      print "\n---";
      next;
    }
    { print }
  ' "$PATTERNS_FILE" > "$TMP"
  mv "$TMP" "$PATTERNS_FILE"
  
  echo "✅ Anti-pattern saved!"
}

capture_debug_win() {
  echo ""
  echo "=== Capture Debugging Win ==="
  read -p "Issue name (e.g. 'git worktree Silent Failure'): " issue
  read -p "Symptom (what you saw): " symptom
  read -p "Root cause (what it actually was): " root_cause
  read -p "Fix (what worked): " fix
  read -p "Time saved (estimate in minutes): " time_saved
  
  # Validate
  if [ -z "$issue" ] || [ -z "$fix" ]; then
    echo "❌ Issue name and fix are required. Pattern not saved."
    return
  fi
  
  # Append to patterns file under Debugging Wins section
  TMP=$(mktemp)
  awk -v date="$(date +%Y-%m-%d)" \
      -v issue="$issue" \
      -v symptom="$symptom" \
      -v root="$root_cause" \
      -v fix="$fix" \
      -v time="$time_saved" '
    /^## Debugging Wins/ {
      print;
      getline;
      print;
      printf "\n### %s %s\n", date, issue;
      printf "- **Symptom:** %s\n", symptom;
      printf "- **Root cause:** %s\n", root;
      printf "- **Fix:** %s\n", fix;
      printf "- **Time saved:** %s minutes\n", time;
      print "\n---";
      next;
    }
    { print }
  ' "$PATTERNS_FILE" > "$TMP"
  mv "$TMP" "$PATTERNS_FILE"
  
  echo "✅ Debugging win saved!"
}

capture_arch_decision() {
  echo ""
  echo "=== Capture Architecture Decision ==="
  read -p "Component (e.g. 'Shared Libraries', 'Database Layer'): " component
  read -p "Problem context: " context
  read -p "Decision (what you chose): " decision
  read -p "Alternatives rejected (comma-separated): " alternatives
  read -p "Rationale (why this is better): " rationale
  
  # Validate
  if [ -z "$component" ] || [ -z "$decision" ] || [ -z "$rationale" ]; then
    echo "❌ Component, decision, and rationale are required. Pattern not saved."
    return
  fi
  
  # Append to patterns file under Architecture Decisions section
  TMP=$(mktemp)
  awk -v date="$(date +%Y-%m-%d)" \
      -v component="$component" \
      -v context="$context" \
      -v decision="$decision" \
      -v alternatives="$alternatives" \
      -v rationale="$rationale" '
    /^## Architecture Decisions/ {
      print;
      getline;
      print;
      printf "\n### %s %s\n", date, component;
      printf "- **Context:** %s\n", context;
      printf "- **Decision:** %s\n", decision;
      printf "- **Alternatives:** %s\n", alternatives;
      printf "- **Rationale:** %s\n", rationale;
      print "\n---";
      next;
    }
    { print }
  ' "$PATTERNS_FILE" > "$TMP"
  mv "$TMP" "$PATTERNS_FILE"
  
  echo "✅ Architecture decision saved!"
}

# Pattern capture prompt
echo ""
echo "📝 Pattern Learning (optional)"
echo "What pattern should we capture from this task?"
echo "  1) Prompt that worked"
echo "  2) Anti-pattern (what failed)"
echo "  3) Debugging win"
echo "  4) Architecture decision"
echo "  5) Skip"
read -p "Choice (1-5): " choice

case $choice in
  1) capture_prompt_pattern ;;
  2) capture_antipattern ;;
  3) capture_debug_win ;;
  4) capture_arch_decision ;;
  *) echo "Pattern capture skipped" ;;
esac

# Update last modified date
sed -i '' "s/^Last updated: .*/Last updated: $(date +%Y-%m-%d)/" "$PATTERNS_FILE"

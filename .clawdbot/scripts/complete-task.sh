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
LOCKDIR="/tmp/task-registry.lock"

# [H4 FIX] Cleanup trap for temp files and lock directory
CLEANUP_FILES=()
cleanup() {
  rm -f "${CLEANUP_FILES[@]}" 2>/dev/null || true
  rm -rf "$LOCKDIR" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

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

# [H3 FIX] Acquire lock before modifying task registry
acquire_lock() {
  local max_attempts=15
  local attempt=0
  while ! mkdir "$LOCKDIR" 2>/dev/null; do
    # Check for stale lock (> 5 minutes)
    if [ -d "$LOCKDIR" ]; then
      local age=$(($(date +%s) - $(stat -f %m "$LOCKDIR" 2>/dev/null || echo 0)))
      if [ "$age" -gt 300 ]; then
        rmdir "$LOCKDIR" 2>/dev/null || true
        continue
      fi
    fi
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
      echo "❌ Lock timeout after ${max_attempts} attempts. Another process may be stuck."
      echo "   Remove $LOCKDIR manually if no other process is running."
      exit 1
    fi
    echo "⚠️  Another task completion in progress. Retrying... (attempt $attempt/$max_attempts)"
    # Random jitter: 0.1-0.4s to reduce thundering herd
    sleep "0.$((RANDOM % 3 + 1))"
  done
}

acquire_lock

# Move task to recentCompletions
TMP_FILE=$(mktemp)
CLEANUP_FILES+=("$TMP_FILE")
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

# [H2 FIX] Default patterns.md structure for initialization
PATTERNS_TEMPLATE='# Agent Execution Patterns

Last updated: DATE_PLACEHOLDER

## Prompts That Work

---

## Anti-Patterns (Avoid These)

---

## Debugging Wins

---

## Architecture Decisions

---

## How to Use This File

**Before starting work:**
```bash
~/.openclaw/workspace/scripts/query-patterns.sh <keyword>
```

**After completing work:**
Run `complete-task.sh` and choose to capture a pattern when prompted.

---

_This file is auto-updated via `.clawdbot/scripts/complete-task.sh`. Do not manually edit patterns; use the capture workflow._'

# [H2 FIX] Ensure patterns file exists with proper structure
ensure_patterns_file() {
  if [ ! -f "$PATTERNS_FILE" ]; then
    echo "⚠️  Patterns file not found. Creating with default structure..."
    mkdir -p "$(dirname "$PATTERNS_FILE")"
    echo "$PATTERNS_TEMPLATE" | sed "s/DATE_PLACEHOLDER/$(date +%Y-%m-%d)/" > "$PATTERNS_FILE"
    echo "✅ Created $PATTERNS_FILE"
  fi
}

# [C3 FIX] Verify a section heading exists; create it if missing
ensure_section_exists() {
  local section_pattern="$1"
  local section_heading="$2"
  if ! grep -q "$section_pattern" "$PATTERNS_FILE"; then
    echo "⚠️  Section '$section_heading' not found in patterns.md. Creating it..."
    # Append the section before "## How to Use This File" or at end
    if grep -q "^## How to Use This File" "$PATTERNS_FILE"; then
      local TMP_SEC=$(mktemp)
      CLEANUP_FILES+=("$TMP_SEC")
      awk -v heading="$section_heading" '
        /^## How to Use This File/ {
          print heading
          print ""
          print "---"
          print ""
        }
        { print }
      ' "$PATTERNS_FILE" > "$TMP_SEC"
      mv "$TMP_SEC" "$PATTERNS_FILE"
    else
      printf "\n%s\n\n---\n" "$section_heading" >> "$PATTERNS_FILE"
    fi
  fi
}

# [C2+C3+H1 FIX] Insert a pattern block under a specific section heading
# Uses ENVIRON[] instead of awk -v to avoid backslash corruption
insert_under_section() {
  local section_pattern="$1"
  local section_heading="$2"
  local pattern_block="$3"

  ensure_patterns_file
  ensure_section_exists "$section_pattern" "$section_heading"

  local TMP_INS=$(mktemp)
  CLEANUP_FILES+=("$TMP_INS")

  export PATTERN_BLOCK="$pattern_block"
  awk '
    /^'"$section_pattern"'/ {
      print;
      getline;
      print;
      printf "%s\n", ENVIRON["PATTERN_BLOCK"];
      next;
    }
    { print }
  ' "$PATTERNS_FILE" > "$TMP_INS"
  unset PATTERN_BLOCK

  # [C3 FIX] Verify the pattern was actually inserted
  # Use a unique marker from the pattern block (first non-empty line)
  local verify_text
  verify_text=$(echo "$pattern_block" | grep -m1 "###" || echo "$pattern_block" | head -1)
  if ! grep -qF "$verify_text" "$TMP_INS"; then
    echo "❌ FATAL: Pattern insertion failed — content not found in output"
    echo "   Section: $section_heading"
    echo "   Verify patterns.md structure is intact"
    rm -f "$TMP_INS"
    return 1
  fi

  mv "$TMP_INS" "$PATTERNS_FILE"
  return 0
}

# Track whether a pattern was actually saved (for timestamp update)
PATTERN_SAVED=false

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

  # [H1 FIX] Build pattern block and insert under correct section (not EOF)
  local block
  block=$(printf '\n### %s %s — %s\n- **Prompt:** "%s"\n- **Outcome:** %s\n- **Reusable:** %s\n- **Context:** %s\n\n---' \
    "$(date +%Y-%m-%d)" "$task_type" "$description" "$prompt_text" "$outcome" "${reusable:-Unknown}" "$context")

  if insert_under_section "^## Prompts That Work" "## Prompts That Work" "$block"; then
    echo "✅ Prompt pattern saved!"
    PATTERN_SAVED=true
  fi
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

  # [C2 FIX] Build pattern block with printf (no awk -v for user data)
  local block
  block=$(printf '\n### %s %s — %s\n- **Attempted:** %s\n- **Failure mode:** %s\n- **Root cause:** %s\n- **Lesson:** %s\n\n---' \
    "$(date +%Y-%m-%d)" "$task_type" "$description" "$attempted" "$failure_mode" "$root_cause" "$lesson")

  if insert_under_section "^## Anti-Patterns" "## Anti-Patterns (Avoid These)" "$block"; then
    echo "✅ Anti-pattern saved!"
    PATTERN_SAVED=true
  fi
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

  # [C2 FIX] Build pattern block with printf (no awk -v for user data)
  local block
  block=$(printf '\n### %s %s\n- **Symptom:** %s\n- **Root cause:** %s\n- **Fix:** %s\n- **Time saved:** %s minutes\n\n---' \
    "$(date +%Y-%m-%d)" "$issue" "$symptom" "$root_cause" "$fix" "$time_saved")

  if insert_under_section "^## Debugging Wins" "## Debugging Wins" "$block"; then
    echo "✅ Debugging win saved!"
    PATTERN_SAVED=true
  fi
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

  # [C2 FIX] Build pattern block with printf (no awk -v for user data)
  local block
  block=$(printf '\n### %s %s\n- **Context:** %s\n- **Decision:** %s\n- **Alternatives:** %s\n- **Rationale:** %s\n\n---' \
    "$(date +%Y-%m-%d)" "$component" "$context" "$decision" "$alternatives" "$rationale")

  if insert_under_section "^## Architecture Decisions" "## Architecture Decisions" "$block"; then
    echo "✅ Architecture decision saved!"
    PATTERN_SAVED=true
  fi
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

# Only update timestamp if a pattern was actually saved
if [ "$PATTERN_SAVED" = true ]; then
  sed -i '' "s/^Last updated: .*/Last updated: $(date +%Y-%m-%d)/" "$PATTERNS_FILE"
fi

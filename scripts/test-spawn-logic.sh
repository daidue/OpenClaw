#!/usr/bin/env bash
set -euo pipefail

echo "🧪 Testing TitleRun Task Spawning Logic"
echo "========================================"

# Process pending tasks
task_dir="$HOME/.openclaw/workspace-titlerun/tasks/pending"
completed_dir="$HOME/.openclaw/workspace-titlerun/tasks/completed"
failed_dir="$HOME/.openclaw/workspace-titlerun/tasks/failed"

if [ -d "$task_dir" ]; then
  echo "📂 Checking task directory: $task_dir"
  task_count=$(ls -1 "$task_dir"/*.task 2>/dev/null | wc -l | tr -d ' ')
  echo "📝 Found $task_count task(s)"
  
  for task_file in "$task_dir"/*.task; do
    [ -e "$task_file" ] || continue
    
    echo ""
    echo "Processing: $(basename "$task_file")"
    
    # Source task data
    source "$task_file"
    
    echo "  REPO: $REPO"
    echo "  ISSUE: #$ISSUE_NUMBER"
    echo "  TITLE: $ISSUE_TITLE"
    echo "  PRIORITY: $PRIORITY"
    
    # Sanitize title
    SAFE_TITLE=$(echo "$ISSUE_TITLE" | tr -cd '[:alnum:][:space:]-' | head -c 100)
    
    echo "  SAFE_TITLE: $SAFE_TITLE"
    
    # For testing, we'll just log what would happen
    echo ""
    echo "  Would spawn subagent with:"
    echo "    agent=titlerun"
    echo "    label=gh-$REPO-$ISSUE_NUMBER"
    echo "    task=Fix GitHub #$ISSUE_NUMBER in $REPO: $SAFE_TITLE"
    
    # Log the event
    bash ~/.openclaw/workspace/scripts/log-event.sh "jeff" "test-spawn" "gh-$REPO-$ISSUE_NUMBER"
    
    # For testing, simulate success by moving to completed
    mv "$task_file" "$completed_dir/"
    echo "  ✅ Moved task to completed (test mode)"
  done
else
  echo "❌ Task directory not found: $task_dir"
fi

echo ""
echo "✅ Test complete!"
echo ""
echo "Check event log:"
echo "  cat ~/.openclaw/workspace/shared/events/$(date +%Y-%m-%d).jsonl"

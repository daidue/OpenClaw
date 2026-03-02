#!/usr/bin/env bash
set -euo pipefail

# Scan GitHub repos for new issues and auto-spawn agents

REGISTRY="$HOME/.openclaw/workspace/.clawdbot/active-tasks.json"
API_REPO="$HOME/Documents/Claude Cowork Business/titlerun-api"
APP_REPO="$HOME/Documents/Claude Cowork Business/titlerun-app"

echo "🔍 Discovering tasks from GitHub ($(date))"

# Function to check if issue already has task
has_task() {
  local issue_num="$1"
  local repo="$2"
  cat "$REGISTRY" | jq -e ".tasks[] | select(.description | contains(\"#$issue_num\") and contains(\"$repo\"))" > /dev/null
}

# Function to create task for issue
create_task() {
  local issue_num="$1"
  local issue_title="$2"
  local repo="$3"
  local priority="$4"
  
  local task_id="gh-${repo}-${issue_num}"
  local branch="fix/gh-${issue_num}"
  
  echo "  📝 Creating task: $task_id"
  
  # Use spawn-agent script
  bash ~/.openclaw/workspace/.clawdbot/scripts/spawn-agent.sh \
    "$task_id" \
    "GitHub #$issue_num: $issue_title" \
    "$repo" \
    "$branch"
  
  echo "  ✅ Task created: $task_id"
}

# Scan titlerun-api
echo ""
echo "📦 Scanning titlerun-api..."
cd "$API_REPO"

# Get open issues with bug or critical labels (search separately and merge)
{
  gh issue list --state open --label bug --json number,title,labels
  gh issue list --state open --label critical --json number,title,labels
} | jq -s 'add | unique_by(.number)' | \
  jq -r '.[] | "\(.number)|\(.title)|\(.labels | map(.name) | join(","))"' | \
while IFS='|' read -r num title labels; do
  echo "  🐛 Issue #$num: $title"
  
  # Check if task already exists
  if has_task "$num" "titlerun-api"; then
    echo "     ⏭️ Task already exists, skipping"
    continue
  fi
  
  # Determine priority
  if echo "$labels" | grep -q "critical"; then
    priority="URGENT"
  else
    priority="HIGH"
  fi
  
  # Create task
  create_task "$num" "$title" "titlerun-api" "$priority"
  
  # Add to Rush inbox
  cat >> ~/.openclaw/workspace-titlerun/inboxes/rush-inbox.md << EOF

## [TASK] — GitHub Issue #$num
**From:** Jeff (automated discovery)
**Priority:** $priority
**Date:** $(date +%Y-%m-%d)

### Description
$title

### GitHub Issue
https://github.com/daidue/titlerun-api/issues/$num

### Action
Agent spawned with task ID: gh-titlerun-api-$num

EOF
done

# Scan titlerun-app
echo ""
echo "📱 Scanning titlerun-app..."
cd "$APP_REPO"

{
  gh issue list --state open --label bug --json number,title,labels
  gh issue list --state open --label critical --json number,title,labels
} | jq -s 'add | unique_by(.number)' | \
  jq -r '.[] | "\(.number)|\(.title)|\(.labels | map(.name) | join(","))"' | \
while IFS='|' read -r num title labels; do
  echo "  🐛 Issue #$num: $title"
  
  if has_task "$num" "titlerun-app"; then
    echo "     ⏭️ Task already exists, skipping"
    continue
  fi
  
  if echo "$labels" | grep -q "critical"; then
    priority="URGENT"
  else
    priority="HIGH"
  fi
  
  create_task "$num" "$title" "titlerun-app" "$priority"
  
  cat >> ~/.openclaw/workspace-titlerun/inboxes/rush-inbox.md << EOF

## [TASK] — GitHub Issue #$num
**From:** Jeff (automated discovery)
**Priority:** $priority
**Date:** $(date +%Y-%m-%d)

### Description
$title

### GitHub Issue
https://github.com/daidue/titlerun-app/issues/$num

### Action
Agent spawned with task ID: gh-titlerun-app-$num

EOF
done

echo ""
echo "✅ Task discovery complete"

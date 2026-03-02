#!/usr/bin/env bash
set -euo pipefail

# Usage: cleanup-worktree.sh <task-id> <repo>
# Example: cleanup-worktree.sh fix-login-bug titlerun-api

TASK_ID="$1"
REPO="$2"

WORKTREE_DIR="$HOME/.openclaw/workspace/.clawdbot/worktrees/$TASK_ID"
REPO_PATH="$HOME/Documents/Claude Cowork Business/$REPO"

echo "🧹 Cleaning up worktree for task: $TASK_ID"

# 1. Get branch name from task registry
REGISTRY="$HOME/.openclaw/workspace/.clawdbot/active-tasks.json"
BRANCH=$(cat "$REGISTRY" | jq -r ".tasks[] | select(.id == \"$TASK_ID\") | .branch")

echo "🌿 Branch: $BRANCH"

# 2. Remove worktree
if [ -d "$WORKTREE_DIR" ]; then
  cd "$REPO_PATH"
  git worktree remove "$WORKTREE_DIR" --force
  echo "✅ Worktree removed: $WORKTREE_DIR"
else
  echo "⚠️ Worktree not found: $WORKTREE_DIR"
fi

# 3. Delete branch (if merged)
cd "$REPO_PATH"
if git branch --list "$BRANCH" | grep -q "$BRANCH"; then
  git branch -d "$BRANCH" 2>/dev/null || git branch -D "$BRANCH"
  echo "✅ Branch deleted: $BRANCH"
fi

# 4. Update task registry (mark as completed)
UPDATED_TASKS=$(cat "$REGISTRY" | jq "(.tasks[] | select(.id == \"$TASK_ID\") | .status) = \"completed\"")
echo "$UPDATED_TASKS" | jq "{tasks: .tasks, lastUpdated: \"$(date -u +%Y-%m-%dT%H:%M:%S%z)\"}" > "$REGISTRY"

echo "✅ Task $TASK_ID marked completed in registry"

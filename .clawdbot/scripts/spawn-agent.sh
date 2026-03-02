#!/usr/bin/env bash
set -euo pipefail

# Usage: spawn-agent.sh <task-id> <description> <repo> <branch>
# Example: spawn-agent.sh fix-login-bug "Fix login 401 error" titlerun-api fix/login-401

TASK_ID="$1"
DESCRIPTION="$2"
REPO="$3"  # titlerun-api or titlerun-app
BRANCH="$4"

WORKTREE_DIR="$HOME/.openclaw/workspace/.clawdbot/worktrees/$TASK_ID"
REPO_PATH="$HOME/Documents/Claude Cowork Business/$REPO"

echo "🚀 Spawning agent for task: $TASK_ID"

# 1. Create worktree
echo "📂 Creating worktree at $WORKTREE_DIR"
cd "$REPO_PATH"
git worktree add "$WORKTREE_DIR" -b "$BRANCH"

# 2. Update task registry
echo "📝 Updating task registry"
REGISTRY="$HOME/.openclaw/workspace/.clawdbot/active-tasks.json"

# Read existing tasks
TASKS=$(cat "$REGISTRY" | jq '.tasks // []')

# Add new task
NEW_TASK=$(cat <<EOF
{
  "id": "$TASK_ID",
  "type": "coding",
  "agent": "titlerun",
  "sessionKey": "",
  "status": "pending",
  "started": "$(date -u +%Y-%m-%dT%H:%M:%S%z)",
  "target": "$REPO ($BRANCH)",
  "description": "$DESCRIPTION",
  "worktree": "$WORKTREE_DIR",
  "branch": "$BRANCH"
}
EOF
)

# Update registry
echo "$TASKS" | jq ". += [$NEW_TASK]" | jq "{tasks: ., lastUpdated: \"$(date -u +%Y-%m-%dT%H:%M:%S%z)\"}" > "$REGISTRY"

echo "✅ Task $TASK_ID added to registry"

# 3. Spawn agent (using sessions_spawn)
echo "🤖 Spawning coding agent..."

AGENT_TASK=$(cat <<EOF
Fix: $DESCRIPTION

**Repo:** $REPO
**Worktree:** $WORKTREE_DIR
**Branch:** $BRANCH

**Instructions:**
1. cd $WORKTREE_DIR
2. Implement the fix
3. Write/update tests
4. Run tests: npm test
5. Commit changes: git commit -m "fix: $DESCRIPTION"
6. Push branch: git push origin $BRANCH
7. Create PR: gh pr create --fill
8. Report completion with PR number

**Definition of Done:**
- [ ] Tests passing (npm test)
- [ ] Types passing (npm run type-check)
- [ ] PR created
- [ ] CI passing
- [ ] Code reviewed by 3-AI pipeline

**Worktree Cleanup:**
After PR merged:
- cd $REPO_PATH
- git worktree remove $WORKTREE_DIR
- git branch -d $BRANCH
EOF
)

# Use openclaw sessions_spawn to create the agent
# (This script just sets up infrastructure; actual spawning happens via OpenClaw tools)

echo "📋 Agent task prepared:"
echo "$AGENT_TASK"
echo ""
echo "To spawn agent, run:"
echo "openclaw run --agent titlerun --message '$AGENT_TASK' --label $TASK_ID"

# 4. Return task ID for registry updates
echo ""
echo "✅ Worktree isolation ready for task: $TASK_ID"
echo "📂 Worktree: $WORKTREE_DIR"
echo "🌿 Branch: $BRANCH"

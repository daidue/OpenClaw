# Git Worktree Quick Start

**Location:** `~/.openclaw/workspace/scripts/worktree/`

## Basic Usage

### Spawn Agent with Worktree Isolation
```bash
spawn-agent-worktree.sh <task-id> <agent-id> <description> <repo-path>
```

**Example:**
```bash
spawn-agent-worktree.sh \
    fix-auth-bug \
    bolt \
    "Fix authentication middleware bug in API" \
    ~/Documents/Claude\ Cowork\ Business/titlerun-api
```

### Cleanup After Agent Completes
```bash
cleanup-worktree.sh <task-id> <repo-path>
```

**Example:**
```bash
cleanup-worktree.sh \
    fix-auth-bug \
    ~/Documents/Claude\ Cowork\ Business/titlerun-api
```

---

## Common Workflows

### Single Agent Task
```bash
# 1. Spawn
spawn-agent-worktree.sh fix-cors bolt "Fix CORS headers" ~/path/to/repo

# 2. Wait for agent completion (automatic)

# 3. Cleanup
cleanup-worktree.sh fix-cors ~/path/to/repo
```

### 3 Agents in Parallel
```bash
# Spawn all 3 (sequential - takes ~6-10 sec total)
spawn-agent-worktree.sh task-1 bolt "Task 1" ~/path/to/repo
spawn-agent-worktree.sh task-2 bolt "Task 2" ~/path/to/repo
spawn-agent-worktree.sh task-3 bolt "Task 3" ~/path/to/repo

# Agents work in parallel (no conflicts!)

# Cleanup when each finishes (order doesn't matter)
cleanup-worktree.sh task-1 ~/path/to/repo
cleanup-worktree.sh task-2 ~/path/to/repo
cleanup-worktree.sh task-3 ~/path/to/repo
```

### Force Cleanup (Discard Uncommitted Work)
```bash
cleanup-worktree.sh failed-task ~/path/to/repo --force
```

---

## Troubleshooting

### "Branch already exists"
```bash
# Use different task-id OR cleanup old one first
cleanup-worktree.sh old-task ~/path/to/repo --force
```

### "Uncommitted changes detected"
```bash
# Option 1: Commit manually
cd <worktree-path>
git commit -am "Agent work"
cleanup-worktree.sh <task-id> ~/path/to/repo

# Option 2: Discard
cleanup-worktree.sh <task-id> ~/path/to/repo --force
```

### "Merge conflicts detected"
```bash
# Follow instructions in error message:
cd ~/path/to/repo
git checkout main
git merge agent/<task-id>
# Fix conflicts in editor
git commit
cleanup-worktree.sh <task-id> ~/path/to/repo
```

---

## File Locations

| File | Path |
|------|------|
| Scripts | `~/.openclaw/workspace/scripts/worktree/*.sh` |
| Usage docs | `~/.openclaw/workspace/.clawdbot/WORKTREE-USAGE.md` |
| Test results | `~/.openclaw/workspace/.clawdbot/WORKTREE-TEST-RESULTS.md` |
| Task registry | `~/.openclaw/workspace/.clawdbot/active-tasks.json` |
| Logs | `~/.openclaw/workspace/.clawdbot/logs/worktree-<task-id>.log` |
| Worktrees | `<repo-path>-worktrees/<task-id>/` |

---

## View Active Tasks

```bash
# Requires jq (brew install jq)
cat ~/.openclaw/workspace/.clawdbot/active-tasks.json | jq '.'

# Find running tasks
cat ~/.openclaw/workspace/.clawdbot/active-tasks.json | \
    jq '.[] | select(.status == "running")'
```

---

**Full documentation:** `.clawdbot/WORKTREE-USAGE.md`

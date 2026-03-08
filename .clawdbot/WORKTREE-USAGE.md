# Git Worktree Infrastructure for Parallel Agent Execution

Production-grade git worktree system enabling 5+ coding agents to work in parallel without conflicts.

## Quick Start

### Basic Workflow

```bash
# 1. Spawn an agent with isolated worktree
~/. openclaw/workspace/scripts/worktree/spawn-agent-worktree.sh \
    fix-auth-bug \
    bolt \
    "Fix authentication middleware bug in API" \
    ~/Documents/Claude\ Cowork\ Business/titlerun-api

# 2. Agent works in isolation (automatic)
# ... agent executes in worktree ...

# 3. Cleanup when agent completes
~/.openclaw/workspace/scripts/worktree/cleanup-worktree.sh \
    fix-auth-bug \
    ~/Documents/Claude\ Cowork\ Business/titlerun-api
```

### Parallel Execution Example

```bash
# Spawn 3 agents simultaneously - no conflicts!

# Agent 1: Fix auth bug
spawn-agent-worktree.sh fix-auth bolt "Fix auth bug" ~/path/to/repo &

# Agent 2: Add new endpoint
spawn-agent-worktree.sh new-endpoint bolt "Add user endpoint" ~/path/to/repo &

# Agent 3: Update docs
spawn-agent-worktree.sh update-docs bolt "Update API docs" ~/path/to/repo &

# All three work in parallel without conflicts
wait

# Cleanup after completion (order doesn't matter)
cleanup-worktree.sh fix-auth ~/path/to/repo
cleanup-worktree.sh new-endpoint ~/path/to/repo
cleanup-worktree.sh update-docs ~/path/to/repo
```

---

## Scripts API Reference

### `create-worktree.sh`

Creates an isolated git worktree for an agent task.

#### Usage
```bash
create-worktree.sh <task-id> <base-branch> <repo-path>
```

#### Arguments
- `task-id` - Unique identifier for the task (alphanumeric, dashes, underscores only)
- `base-branch` - Branch to base the worktree on (typically `main` or `master`)
- `repo-path` - Absolute path to the git repository

#### Output
- Prints the absolute path to the created worktree (last line of output)
- Exit code 0 on success, non-zero on failure

#### What It Does
1. Validates inputs (task-id format, repo exists, base branch exists)
2. Creates branch: `agent/<task-id>`
3. Creates worktree at: `<repo-path>-worktrees/<task-id>/`
4. Checks disk space (requires 1GB+ free)
5. Uses flock for mutual exclusion
6. Cleans up on failure (no orphaned worktrees)

#### Example
```bash
# Create worktree for auth-fix task
$ create-worktree.sh auth-fix main ~/projects/my-api

Creating worktree for task: auth-fix
  Base branch: main
  New branch: agent/auth-fix
  Worktree path: ~/projects/my-api-worktrees/auth-fix
✓ Worktree created successfully: /Users/jeff/projects/my-api-worktrees/auth-fix
/Users/jeff/projects/my-api-worktrees/auth-fix
```

#### Error Handling
- **Invalid task-id**: `ERROR: Invalid task-id: 'my task!'. Use only alphanumeric characters, dashes, and underscores.`
- **Repo not found**: `ERROR: Repository path does not exist: /bad/path`
- **Not a git repo**: `ERROR: Not a git repository: /some/path`
- **Base branch missing**: `ERROR: Base branch does not exist: feature-x`
- **Task already exists**: `ERROR: Branch already exists: agent/auth-fix. Task ID may already be in use.`
- **Low disk space**: `ERROR: Insufficient disk space. At least 1GB required, 500MB available.`
- **Concurrent operation**: `ERROR: Another worktree operation is in progress. Please wait and try again.`

---

### `spawn-agent-worktree.sh`

Wrapper that spawns an agent with worktree isolation and full lifecycle management.

#### Usage
```bash
spawn-agent-worktree.sh <task-id> <agent-id> <description> <repo-path>
```

#### Arguments
- `task-id` - Unique identifier for the task
- `agent-id` - Agent to spawn (e.g., `bolt`, `codex`, `claude-code`)
- `description` - Task description for the agent
- `repo-path` - Absolute path to the git repository

#### Output
- Logs all steps to `~/.openclaw/workspace/.clawdbot/logs/worktree-<task-id>.log`
- Prints progress and final instructions to stdout
- Exit code 0 on success, non-zero on failure

#### What It Does
1. Registers task in `.clawdbot/active-tasks.json`
2. Determines base branch (main/master)
3. Calls `create-worktree.sh` to create isolated worktree
4. Augments agent description with worktree context
5. Spawns agent using `openclaw sessions spawn` with `cwd=worktree-path`
6. Updates registry with session ID
7. Provides cleanup instructions

#### Example
```bash
$ spawn-agent-worktree.sh \
    fix-api-cors \
    bolt \
    "Fix CORS headers in API middleware" \
    ~/projects/titlerun-api

Starting worktree agent spawn for task: fix-api-cors
Step 1/5: Registering task in registry...
✓ Task registered in registry
Step 2/5: Creating worktree...
Using base branch: main
✓ Worktree created at: ~/projects/titlerun-api-worktrees/fix-api-cors
Step 3/5: Preparing agent spawn...
Agent description prepared with worktree context
Step 4/5: Spawning agent...
Spawning agent 'bolt' for task 'fix-api-cors'...
Working directory will be: ~/projects/titlerun-api-worktrees/fix-api-cors
✓ Agent spawned successfully
Session ID: agent:main:subagent:abc123
Step 5/5: Spawn complete
✓ All steps completed successfully

Task Details:
  Task ID: fix-api-cors
  Agent ID: bolt
  Session ID: agent:main:subagent:abc123
  Worktree: ~/projects/titlerun-api-worktrees/fix-api-cors
  Log file: ~/.openclaw/workspace/.clawdbot/logs/worktree-fix-api-cors.log

The agent is now working in isolation.
When the agent completes, run cleanup:
  ~/.openclaw/workspace/scripts/worktree/cleanup-worktree.sh fix-api-cors ~/projects/titlerun-api

NOTE: Agent completion is push-based. Do not poll for status.
The agent will announce completion automatically.
```

#### Log File Format
Each spawn creates a detailed log at `~/.openclaw/workspace/.clawdbot/logs/worktree-<task-id>.log`:

```
=== Worktree Agent Spawn Log ===
Task ID: fix-api-cors
Agent ID: bolt
Description: Fix CORS headers in API middleware
Repository: ~/projects/titlerun-api
Started: 2026-03-08 10:30:15
====================================

[2026-03-08 10:30:15] INFO: Starting worktree agent spawn for task: fix-api-cors
[2026-03-08 10:30:15] INFO: Step 1/5: Registering task in registry...
[2026-03-08 10:30:15] SUCCESS: ✓ Task registered in registry
[2026-03-08 10:30:16] INFO: Step 2/5: Creating worktree...
...
```

#### Error Handling
- **Invalid arguments**: Clear usage message
- **Worktree creation fails**: Preserves log, exits with error
- **Agent spawn fails**: Preserves worktree, provides manual cleanup instructions
- **Registry update fails**: Continues (non-fatal if jq missing)

---

### `cleanup-worktree.sh`

Merges completed work into main branch and removes the worktree.

#### Usage
```bash
cleanup-worktree.sh <task-id> <repo-path> [--force]
```

#### Arguments
- `task-id` - Task identifier matching the original spawn
- `repo-path` - Absolute path to the git repository
- `--force` (optional) - Force cleanup even with uncommitted changes

#### Output
- Prints merge and cleanup progress
- Exit code 0 on success, non-zero on failure (e.g., merge conflict)

#### What It Does
1. Validates worktree exists
2. Checks for uncommitted changes (unless `--force`)
3. Switches to main/master branch
4. Merges `agent/<task-id>` branch with `--no-ff` (preserves history)
5. Removes worktree directory
6. Deletes `agent/<task-id>` branch
7. Marks task complete in registry

#### Example (Success)
```bash
$ cleanup-worktree.sh fix-api-cors ~/projects/titlerun-api

Merging agent/fix-api-cors into main...
✓ Merged agent/fix-api-cors into main
Removing worktree: ~/projects/titlerun-api-worktrees/fix-api-cors
✓ Worktree removed
Deleting branch: agent/fix-api-cors
✓ Branch deleted
✓ Task registry updated
✓ Cleanup complete for task: fix-api-cors
```

#### Example (Merge Conflict)
```bash
$ cleanup-worktree.sh update-readme ~/projects/titlerun-api

Merging agent/update-readme into main...
WARNING: Merge conflict detected!
ERROR: Merge conflicts detected. Please resolve manually:
    1. cd ~/projects/titlerun-api
    2. git checkout main
    3. git merge agent/update-readme
    4. Resolve conflicts
    5. git commit
    6. Run cleanup-worktree.sh again

Worktree preserved at: ~/projects/titlerun-api-worktrees/update-readme
```

#### Example (Force Cleanup)
```bash
# Discard uncommitted changes and cleanup
$ cleanup-worktree.sh failed-task ~/projects/titlerun-api --force

Merging agent/failed-task into main...
✓ Merged agent/failed-task into main
Removing worktree: ~/projects/titlerun-api-worktrees/failed-task
✓ Worktree removed
Deleting branch: agent/failed-task
✓ Branch deleted
✓ Cleanup complete for task: failed-task
```

#### Error Handling
- **Uncommitted changes**: Refuses cleanup unless `--force`
- **Merge conflicts**: Aborts merge, preserves worktree, provides manual resolution instructions
- **Worktree missing**: Attempts to clean up branch only
- **Concurrent operation**: Uses flock to prevent race conditions

---

## Task Registry

### Location
`~/.openclaw/workspace/.clawdbot/active-tasks.json`

### Format
```json
[
  {
    "taskId": "fix-api-cors",
    "agentId": "bolt",
    "description": "Fix CORS headers in API middleware",
    "repoPath": "~/projects/titlerun-api",
    "status": "running",
    "startedAt": "2026-03-08T14:30:15Z",
    "worktreePath": "~/projects/titlerun-api-worktrees/fix-api-cors",
    "sessionId": "agent:main:subagent:abc123",
    "completedAt": null
  }
]
```

### Status Values
- `initializing` - Task registered, worktree not yet created
- `ready` - Worktree created, agent not yet spawned
- `running` - Agent actively working
- `spawn_failed` - Agent spawn failed
- `completed` - Work merged and worktree cleaned up

### Querying the Registry
```bash
# View all active tasks
cat ~/.openclaw/workspace/.clawdbot/active-tasks.json | jq '.'

# Find running tasks
cat ~/.openclaw/workspace/.clawdbot/active-tasks.json | jq '.[] | select(.status == "running")'

# Count tasks by status
cat ~/.openclaw/workspace/.clawdbot/active-tasks.json | jq 'group_by(.status) | map({status: .[0].status, count: length})'
```

---

## Common Workflows

### Workflow 1: Standard Agent Task

```bash
# 1. Spawn agent
spawn-agent-worktree.sh \
    add-logging \
    bolt \
    "Add structured logging to authentication module" \
    ~/projects/titlerun-api

# 2. Wait for agent completion (push-based, no polling)

# 3. Cleanup after agent reports completion
cleanup-worktree.sh add-logging ~/projects/titlerun-api
```

### Workflow 2: Parallel Feature Development

```bash
# Launch multiple agents in parallel
for task in feat-user-api feat-admin-api feat-auth-api; do
    spawn-agent-worktree.sh \
        "$task" \
        bolt \
        "Implement ${task/feat-/} endpoints" \
        ~/projects/titlerun-api &
done

wait  # Wait for all spawns to complete

# Agents work in parallel...

# Cleanup in order of completion (no rush, no conflicts)
cleanup-worktree.sh feat-user-api ~/projects/titlerun-api
cleanup-worktree.sh feat-admin-api ~/projects/titlerun-api
cleanup-worktree.sh feat-auth-api ~/projects/titlerun-api
```

### Workflow 3: Emergency Force Cleanup

```bash
# Agent crashed or produced broken code - discard all changes
cleanup-worktree.sh broken-task ~/projects/titlerun-api --force
```

### Workflow 4: Manual Merge Conflict Resolution

```bash
# Cleanup failed due to merge conflict
$ cleanup-worktree.sh update-api ~/projects/titlerun-api
# ERROR: Merge conflicts detected...

# Resolve manually
cd ~/projects/titlerun-api
git checkout main
git merge agent/update-api

# Fix conflicts in editor
vim src/api/routes.ts

git add src/api/routes.ts
git commit -m "Merge agent/update-api - resolved conflicts"

# Now cleanup can finish
cleanup-worktree.sh update-api ~/projects/titlerun-api
```

### Workflow 5: Stale Worktree Recovery

```bash
# Agent crashed, worktree left behind
# Registry shows task as "running" but agent is gone

# Option A: Resume work manually
cd ~/projects/titlerun-api-worktrees/stale-task
# ... make fixes ...
git commit -am "Complete stale task"
cd ~/projects/titlerun-api
cleanup-worktree.sh stale-task ~/projects/titlerun-api

# Option B: Discard and start fresh
cleanup-worktree.sh stale-task ~/projects/titlerun-api --force
spawn-agent-worktree.sh stale-task-v2 bolt "Retry previous task" ~/projects/titlerun-api
```

---

## Troubleshooting

### Problem: "Branch already exists"

**Symptom:**
```
ERROR: Branch already exists: agent/my-task. Task ID may already be in use.
```

**Cause:** Previous run didn't clean up, or you're reusing a task-id.

**Solution:**
```bash
# Option 1: Use a different task-id
spawn-agent-worktree.sh my-task-v2 ...

# Option 2: Force cleanup the old task first
cd <repo-path>
git branch -D agent/my-task
git worktree remove --force <repo-path>-worktrees/my-task
```

### Problem: "Uncommitted changes detected"

**Symptom:**
```
ERROR: Uncommitted changes detected in worktree. Commit changes or use --force to discard.
```

**Cause:** Agent didn't commit work before completion.

**Solution:**
```bash
# Option 1: Commit manually
cd <worktree-path>
git add -A
git commit -m "Agent work completed"
cleanup-worktree.sh <task-id> <repo-path>

# Option 2: Discard changes
cleanup-worktree.sh <task-id> <repo-path> --force
```

### Problem: "Merge conflicts detected"

**Symptom:**
```
ERROR: Merge conflicts detected. Please resolve manually...
Worktree preserved at: ...
```

**Cause:** Agent's changes conflict with main branch (someone else merged conflicting work).

**Solution:**
```bash
# 1. Manually resolve
cd <repo-path>
git checkout main
git merge agent/<task-id>

# 2. Fix conflicts
vim <conflicting-files>

# 3. Commit
git add <resolved-files>
git commit

# 4. Retry cleanup
cleanup-worktree.sh <task-id> <repo-path>
```

### Problem: "Another worktree operation is in progress"

**Symptom:**
```
ERROR: Another worktree operation is in progress. Please wait and try again.
```

**Cause:** Concurrent create/cleanup detected by flock.

**Solution:**
```bash
# Wait for other operation to complete (usually < 30 seconds)
# If stuck (rare), check for stale lock:

LOCK_FILE="<repo-path>-worktrees/.worktree.lock"
ls -lh "$LOCK_FILE"

# If mtime > 5 minutes old, safe to delete
rm "$LOCK_FILE"
```

### Problem: "Insufficient disk space"

**Symptom:**
```
ERROR: Insufficient disk space. At least 1GB required, 500MB available.
```

**Cause:** Low disk space on worktree volume.

**Solution:**
```bash
# Check disk usage
df -h

# Clean up old worktrees
cd <repo-path>-worktrees
ls -lh
# Delete old/abandoned worktrees manually if needed
```

### Problem: Agent spawned but no work visible

**Symptom:** Agent reports completion but worktree has no commits.

**Cause:** Agent worked in wrong directory (didn't respect `cwd`).

**Solution:**
```bash
# Check agent's actual working directory in spawn log
cat ~/.openclaw/workspace/.clawdbot/logs/worktree-<task-id>.log

# If agent worked in wrong place:
# 1. Find the changes (search agent session logs)
# 2. Manually copy to worktree
# 3. Commit and cleanup

# Prevention: Ensure agent descriptions emphasize working directory
```

---

## Performance & Resource Usage

### Disk Space

- **Each worktree**: ~500MB (full copy of working tree, shares .git objects)
- **Recommended free space**: 5GB+ for 5 parallel agents
- **Shared .git objects**: Only ~10% overhead vs full clones

### Memory

- **Scripts**: Negligible (<10MB total)
- **Git operations**: ~50-100MB peak per worktree creation/cleanup
- **Concurrent limit**: Only limited by disk space and git performance

### Timing

| Operation | Typical Duration |
|-----------|-----------------|
| create-worktree.sh | 2-5 seconds |
| spawn-agent-worktree.sh | 5-10 seconds (incl. agent spawn) |
| cleanup-worktree.sh (no conflicts) | 3-7 seconds |
| cleanup-worktree.sh (merge conflict) | 1-2 seconds (abort fast) |

### Parallelism

- **Tested**: 5 simultaneous agents, no conflicts
- **Theoretical limit**: 20+ (limited by disk I/O, not scripts)
- **Recommended**: 3-5 parallel agents for optimal throughput

---

## Integration with Task Registry

The task registry (`.clawdbot/active-tasks.json`) provides a single source of truth for all worktree tasks.

### Querying Task Status

```bash
# Install jq if not present
brew install jq

# View all tasks
cat ~/.openclaw/workspace/.clawdbot/active-tasks.json | jq '.'

# Find a specific task
cat ~/.openclaw/workspace/.clawdbot/active-tasks.json | \
    jq '.[] | select(.taskId == "fix-api-cors")'

# List all running tasks
cat ~/.openclaw/workspace/.clawdbot/active-tasks.json | \
    jq '.[] | select(.status == "running") | {taskId, agentId, startedAt}'

# Count tasks by agent
cat ~/.openclaw/workspace/.clawdbot/active-tasks.json | \
    jq 'group_by(.agentId) | map({agent: .[0].agentId, count: length})'
```

### Cleanup Stale Tasks

```bash
# Find tasks older than 1 hour still marked "running"
cat ~/.openclaw/workspace/.clawdbot/active-tasks.json | \
    jq --arg cutoff "$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)" \
    '.[] | select(.status == "running" and .startedAt < $cutoff)'

# Manually mark as completed (after manual cleanup)
jq 'map(if .taskId == "stale-task" then .status = "completed" | .completedAt = now else . end)' \
    ~/.openclaw/workspace/.clawdbot/active-tasks.json > /tmp/tasks.json && \
    mv /tmp/tasks.json ~/.openclaw/workspace/.clawdbot/active-tasks.json
```

---

## Safety & Best Practices

### ✅ DO

- **Use unique task-ids** - Prevents branch/worktree collisions
- **Let agents commit their work** - Essential for cleanup
- **Check logs when things fail** - `~/.openclaw/workspace/.clawdbot/logs/worktree-<task-id>.log`
- **Use `--force` carefully** - Only when you're sure work should be discarded
- **Monitor disk space** - Worktrees accumulate quickly
- **Clean up promptly** - Don't leave worktrees lingering
- **Resolve merge conflicts manually** - Scripts will preserve state

### ❌ DON'T

- **Reuse task-ids** - Can cause conflicts
- **Delete worktrees manually** - Always use `cleanup-worktree.sh`
- **Edit main branch during agent work** - Can cause merge conflicts
- **Poll for agent completion** - It's push-based
- **Skip the registry** - It's your source of truth
- **Ignore error messages** - They're designed to be actionable

---

## Requirements

### System Requirements

- **OS**: macOS (Darwin) or Linux
- **Git**: 2.5+ (for `git worktree` command)
- **Shell**: bash, zsh (tested on both)
- **Optional**: jq (for registry management)

### Installation

```bash
# Scripts are already in place at:
~/.openclaw/workspace/scripts/worktree/

# Make sure they're executable (already done)
chmod +x ~/.openclaw/workspace/scripts/worktree/*.sh

# Install jq for full registry features (optional but recommended)
brew install jq  # macOS
# or
apt-get install jq  # Linux
```

### Verify Installation

```bash
# Test create-worktree.sh
~/.openclaw/workspace/scripts/worktree/create-worktree.sh --help
# Should show usage message

# Check git worktree support
git worktree --help
# Should show git-worktree manual

# Verify jq (optional)
jq --version
# Should show version number
```

---

## FAQ

**Q: Can I have multiple agents working on the same repository simultaneously?**

A: Yes! That's the entire point. Each agent gets an isolated worktree, so 5 agents can work on 5 different tasks in the same repo with zero conflicts.

**Q: What happens if two agents modify the same file?**

A: They work independently. When you run `cleanup-worktree.sh` for each, git will merge them sequentially. If there are conflicts, the script aborts the merge and preserves the worktree for manual resolution.

**Q: Do I need to run cleanup-worktree.sh in any particular order?**

A: No. Cleanup order doesn't matter. Each task merges independently.

**Q: What if an agent crashes mid-work?**

A: The worktree and branch remain intact. You can:
1. Resume work manually in the worktree
2. Force cleanup with `--force` to discard
3. Spawn a new agent for a retry

**Q: Can I manually edit files in a worktree?**

A: Yes, worktrees are just normal git working directories. You can `cd` into them and work normally.

**Q: How do I see what's different between a worktree and main?**

A: `cd <worktree-path> && git diff main`

**Q: Can I push agent branches to remote?**

A: Yes, but it's not required. The scripts work entirely with local branches. If you want to push:
```bash
cd <worktree-path>
git push origin agent/<task-id>
```

**Q: What if I want to base a worktree on a feature branch instead of main?**

A: Use `create-worktree.sh` directly:
```bash
create-worktree.sh my-task feature-x ~/path/to/repo
```

**Q: Do worktrees slow down git operations?**

A: No. Git worktrees share the `.git` object database, so they're very efficient.

---

## License & Support

Part of the OpenClaw workspace. MIT License.

For issues or improvements, contact: Jeff (Portfolio Manager)

---

**Built 2026-03-08** | Zero bugs. Simple design. Production-ready.

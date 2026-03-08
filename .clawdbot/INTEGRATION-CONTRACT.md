# Integration Contract: Task Registry

**Created:** 2026-03-08
**Version:** 1.0
**Status:** ENFORCED — all scripts MUST comply

## Schema (CANONICAL)

```json
{
  "tasks": [
    {
      "id": "task-name",
      "type": "infrastructure",
      "agent": "main",
      "description": "What the task does",
      "sessionKey": null,
      "startTime": "2026-03-08T15:01:57Z",
      "timeoutMinutes": 120,
      "status": "active"
    }
  ],
  "lastUpdated": "2026-03-08T15:01:57Z",
  "recentCompletions": [
    {
      "id": "task-name",
      "type": "infrastructure",
      "agent": "main",
      "status": "completed",
      "completed": "2026-03-08T16:00:00Z",
      "runtime": "58m",
      "result": "Summary of what was done"
    }
  ]
}
```

## Field Names (CANONICAL)

| Use This | NOT This | Where |
|----------|----------|-------|
| `.id` | `.taskId` | All scripts |
| `.agent` | `.agentId` | All scripts |
| `.startTime` | `.startedAt`, `.started_at` | All scripts |
| `.timeoutMinutes` | `.timeout` | All scripts |
| `.status` | — | All scripts |

## Registry File

**Location:** `~/.openclaw/workspace/.clawdbot/active-tasks.json`

**Initialization (empty registry):**
```json
{"tasks":[],"lastUpdated":"","recentCompletions":[]}
```

## Lock File

| Property | Value |
|----------|-------|
| **Location** | `/tmp/task-registry.lock` |
| **Method** | `mkdir` (atomic on macOS/Linux) |
| **Timeout** | ~4.5s (15 retries × 0.1-0.4s jitter) |
| **Retries** | 15 |
| **Stale threshold** | 300 seconds (5 minutes) |

**Lock pattern (copy-paste):**
```bash
LOCK_DIR="/tmp/task-registry.lock"
MAX_RETRIES=3
RETRY_DELAY_MS=200

acquire_registry_lock() {
  local retries=0
  while [ $retries -lt $MAX_RETRIES ]; do
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT
      return 0
    fi
    # Check for stale lock
    if [ -d "$LOCK_DIR" ]; then
      local age=$(($(date +%s) - $(stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0)))
      if [ "$age" -gt 300 ]; then
        rmdir "$LOCK_DIR" 2>/dev/null || true
        continue
      fi
    fi
    retries=$((retries + 1))
    sleep 0.2
  done
  echo "ERROR: Could not acquire registry lock after $MAX_RETRIES retries" >&2
  return 1
}
```

## Scripts That Must Comply

| Script | Location | Role |
|--------|----------|------|
| `register-task.sh` | `.clawdbot/scripts/` | Creates task entry |
| `complete-task.sh` | `.clawdbot/scripts/` | Archives task, prompts for pattern |
| `spawn-agent-worktree.sh` | `scripts/worktree/` | Queries patterns, creates worktree, registers via register-task.sh |
| `cleanup-worktree.sh` | `scripts/worktree/` | Merges work, calls complete-task.sh |

## Workflow (Canonical Order)

```
1. spawn-agent-worktree.sh
   ├── Query patterns (query-patterns.sh)
   ├── Register task (register-task.sh) ← uses canonical schema
   ├── Create worktree (create-worktree.sh)
   └── Spawn agent

2. [Agent works in worktree]

3. cleanup-worktree.sh
   ├── Merge branch
   ├── Remove worktree
   ├── Delete branch
   └── Complete task (complete-task.sh) ← archives + pattern capture
```

## Rules

1. **Never write `[]` as registry format** — always use dict `{tasks:[], ...}`
2. **Never use `.taskId`** — always `.id`
3. **Always acquire lock before writing** to `active-tasks.json`
4. **spawn-agent-worktree.sh does NOT write to registry directly** — delegates to register-task.sh
5. **cleanup-worktree.sh does NOT update registry directly** — delegates to complete-task.sh
6. **Pattern query happens before work starts** (in spawn)
7. **Pattern capture happens after work ends** (in cleanup via complete-task)

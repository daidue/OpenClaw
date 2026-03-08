# Task Registry Usage Guide

**Location:** `~/.openclaw/workspace/.clawdbot/active-tasks.json`

## Purpose

Prevent duplicate work by tracking all active sub-agent tasks in a central registry.

**Problem it solves:** Two agents working on the same feature simultaneously (wasted $15-20 in tokens for contract integration on 2026-03-08).

---

## Quick Start

### 1. Before Spawning a Sub-Agent

**Check registry for duplicates:**
```bash
cat ~/.openclaw/workspace/.clawdbot/active-tasks.json | jq '.tasks'
```

**Register the task:**
```bash
bash ~/.openclaw/workspace/.clawdbot/scripts/register-task.sh \
  "contract-integration" \
  "feature-build" \
  "titlerun" \
  "Build NFL contract data integration" \
  "" \
  120
```

Arguments:
1. **task-id** (required): Unique identifier (kebab-case)
2. **type** (optional): `feature-build`, `bug-fix`, `refactor`, `qa`, `general`
3. **agent** (optional): `titlerun`, `main`, `researcher`, etc.
4. **description** (optional): Human-readable summary
5. **session-key** (optional): OpenClaw session key (if available)
6. **timeout-minutes** (optional): Max runtime before marked stale (default: 120)

### 2. Spawn the Sub-Agent

Use `sessions_spawn` as normal:
```typescript
sessions_spawn({
  task: "...",
  mode: "run",
  runtime: "subagent",
  agentId: "titlerun",
  label: "contract-integration",
  runTimeoutSeconds: 7200
})
```

### 3. When Task Completes

**Mark as complete:**
```bash
bash ~/.openclaw/workspace/.clawdbot/scripts/complete-task.sh \
  "contract-integration" \
  "completed" \
  "Merged to main, all tests passing"
```

Status options: `completed`, `failed`, `cancelled`, `timeout`

---

## Automatic Monitoring

**Cron job runs every 10 minutes:**
```bash
*/10 * * * * /Users/jeffdaniels/.openclaw/workspace/.clawdbot/scripts/monitor-agents.sh
```

**What it does:**
- Checks all active tasks
- Flags stale tasks (exceeded timeout)
- Archives completed tasks to `recentCompletions`
- Logs to `.clawdbot/logs/monitor-YYYY-MM-DD.log`

---

## Best Practices

### ✅ DO

1. **Always check registry before spawning** (especially for features/bugs)
2. **Use descriptive task IDs** (`fix-mobile-layout`, not `task-1`)
3. **Set realistic timeouts** (60m for bug fixes, 120m for features)
4. **Complete tasks promptly** (prevents stale accumulation)
5. **Review logs when tasks fail** (`.clawdbot/logs/`)

### ❌ DON'T

1. **Skip registration for "quick fixes"** (they often take longer than expected)
2. **Reuse task IDs** (always unique, even across completions)
3. **Set timeouts <30min** (monitoring runs every 10min, needs buffer)
4. **Forget to complete tasks** (manual cleanup required)

---

## Integration with Jeff's Workflow

**When spawning sub-agents, Jeff should:**

```typescript
// 1. Check for duplicates
const activeTasksPath = '~/.openclaw/workspace/.clawdbot/active-tasks.json';
const activeTasks = JSON.parse(await read(activeTasksPath));
const taskId = 'contract-integration';

if (activeTasks.tasks.some(t => t.id === taskId)) {
  // Task already running!
  return "⚠️ Task already in progress. See active-tasks.json";
}

// 2. Register task
await exec(`bash ~/.openclaw/workspace/.clawdbot/scripts/register-task.sh \
  "${taskId}" "feature-build" "titlerun" "Build contract integration" "" 120`);

// 3. Spawn agent
const result = await sessions_spawn({
  task: "Build NFL contract data integration...",
  mode: "run",
  runtime: "subagent",
  agentId: "titlerun",
  label: taskId,
  runTimeoutSeconds: 7200
});

// 4. On completion (via runtime event or manual check)
await exec(`bash ~/.openclaw/workspace/.clawdbot/scripts/complete-task.sh \
  "${taskId}" "completed" "Merged to main"`);
```

---

## Task Registry Schema

```json
{
  "tasks": [
    {
      "id": "contract-integration",
      "type": "feature-build",
      "agent": "titlerun",
      "description": "Build NFL contract data integration",
      "sessionKey": "agent:titlerun:subagent:abc123",
      "startTime": "2026-03-08T09:50:00-05:00",
      "timeoutMinutes": 120,
      "status": "active"
    }
  ],
  "lastUpdated": "2026-03-08T10:35:00-05:00",
  "recentCompletions": [
    {
      "id": "fix-mobile-layout",
      "type": "bug-fix",
      "agent": "titlerun",
      "status": "completed",
      "completed": "2026-03-08T09:30:00-05:00",
      "runtime": "45m",
      "result": "Mobile layout fixed, all breakpoints tested"
    }
  ]
}
```

---

## Troubleshooting

**Task stuck in registry after completion:**
```bash
# Manually complete
bash ~/.openclaw/workspace/.clawdbot/scripts/complete-task.sh <task-id> completed
```

**Registry corrupted:**
```bash
# Reset (WARNING: loses active task tracking)
echo '{"tasks":[],"lastUpdated":"'$(date -Iseconds)'","recentCompletions":[]}' > \
  ~/.openclaw/workspace/.clawdbot/active-tasks.json
```

**Monitoring not running:**
```bash
# Check cron
crontab -l | grep monitor-agents

# Run manually
bash ~/.openclaw/workspace/.clawdbot/scripts/monitor-agents.sh

# Check logs
tail -f ~/.openclaw/workspace/.clawdbot/logs/monitor-$(date +%Y-%m-%d).log
```

---

**Last Updated:** 2026-03-08
**Version:** 1.0
**Status:** Production Ready ✅

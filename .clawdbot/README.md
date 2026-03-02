# .clawdbot/ — Task Monitoring Infrastructure

Automated monitoring for long-running agent tasks (coding agents, browser sessions, QA runs).

## Purpose

When Jeff or Owner/Operators spawn long-running tasks (e.g., "migrate the API to use @titlerun/validation"), we need to:

1. **Track task state** (running, complete, failed)
2. **Detect completion** automatically (no manual checking)
3. **Notify stakeholders** when done
4. **Handle failures** gracefully

This infrastructure provides that automation.

---

## Architecture

```
.clawdbot/
├── active-tasks.json          # Task registry (all running/recent tasks)
├── scripts/
│   ├── monitor-agents.sh      # General task monitor (runs every 10 min)
│   └── monitor-dogfood-task.sh # Dogfood-specific monitor (session-specific)
├── logs/
│   └── monitor-YYYY-MM-DD.log # Daily monitoring logs
├── tasks/                     # Task definitions (future)
└── worktrees/                # Git worktree tracking (future)
```

---

## Task Registry

**File:** `.clawdbot/active-tasks.json`

**Format:**
```json
{
  "task-id": {
    "sessionId": "session-name",
    "agent": "rush",
    "agentType": "claude-code",
    "model": "claude-opus-4.5",
    "description": "Migrate titlerun-api to use @titlerun/validation",
    "status": "running",
    "startedAt": "2026-03-01T21:16:00Z",
    "estimatedDuration": "4-6 hours",
    "notifyOnComplete": true,
    "workdir": "/path/to/repo",
    "branch": "feature-branch"
  }
}
```

**Task Types:**

| agentType | Description | Completion Check |
|-----------|-------------|------------------|
| `claude-code` | Coding agent (Claude Code) | PR created in GitHub |
| `codex` | Coding agent (Codex) | PR created in GitHub |
| `agent-browser` | Browser automation (dogfood) | `report.md` exists |
| `researcher` | Research task | Output file exists |

---

## Monitoring

### General Monitor

**Script:** `.clawdbot/scripts/monitor-agents.sh`

**Runs:** Every 10 minutes (via cron)

**Checks:**
- Are tasks still running?
- Have they completed?
- Did they fail?

**Actions:**
- Updates `active-tasks.json` status
- Sends notifications via OpenClaw
- Logs to `logs/monitor-YYYY-MM-DD.log`

**Manual run:**
```bash
bash .clawdbot/scripts/monitor-agents.sh
```

### Dogfood-Specific Monitor

**Script:** `.clawdbot/scripts/monitor-dogfood-task.sh`

**Runs:** Per-session (spawned by `run-dogfood.sh`)

**Checks every 60 seconds:**
- Is browser process alive? (PID check)
- Has `report.md` been generated?
- Is task taking too long? (90 min timeout)

**Actions:**
- Marks task complete when report exists
- Counts issues (CRITICAL, HIGH, MEDIUM, LOW)
- Sends detailed notifications
- Marks failed if no report after timeout

**Manual run:**
```bash
bash .clawdbot/scripts/monitor-dogfood-task.sh <task_id> <session_name> <output_dir>
```

---

## Notifications

All task completions/failures send OpenClaw system events:

**Successful completion:**
```
✅ Task complete: [description]

PR: #123
Branch: feature-branch

Review: gh pr view 123
```

**Dogfood completion:**
```
🔍 Dogfood QA Complete: Weekly dogfood QA for TitleRun

Found: 12 issues (2 critical, 4 high, 5 medium, 1 low)

Report: titlerun-qa/dogfood-2026-03-01/report.md

⚠️ 2 CRITICAL issues require immediate attention
```

**Task failure:**
```
⚠️ Task failed: [description]

Session ended without creating PR.
Check logs for details.
```

---

## Task Lifecycle

### 1. Task Registration

When a script (e.g., `run-dogfood.sh`) spawns a task:

```bash
TASK_JSON='{"task-id": { ... }}'
jq -s '.[0] * .[1]' .clawdbot/active-tasks.json <(echo "$TASK_JSON") \
  > .clawdbot/active-tasks.json.tmp
mv .clawdbot/active-tasks.json.tmp .clawdbot/active-tasks.json
```

### 2. Monitoring

**General monitor** (every 10 min):
- Reads `active-tasks.json`
- For each `status: "running"` task:
  - Check if still alive
  - Check for completion signals
  - Update status if needed

**Session-specific monitor** (dogfood):
- Runs continuously during session
- Checks every 60 seconds
- Exits when task completes/fails

### 3. Completion Detection

**Coding agents (claude-code, codex):**
- Session dies → check if PR created
- If PR exists: mark `complete`, notify
- If no PR: mark `failed`, alert

**Browser agents (agent-browser):**
- Process dies → check if `report.md` exists
- If report exists: mark `complete`, count issues, notify
- If no report: mark `failed`, alert

### 4. Notification

- OpenClaw system event sent
- Logged to monitor log
- Task status updated in registry

---

## Adding New Task Types

To support a new task type:

### 1. Define completion criteria

What file/artifact signals completion?
- Research task → `findings.md`?
- Deployment → `deployment.log` with "SUCCESS"?
- Data pipeline → CSV file generated?

### 2. Update `monitor-agents.sh`

Add new `agentType` branch:

```bash
elif [ "$AGENT_TYPE" = "my-new-type" ]; then
  # Check for completion signal
  OUTPUT_FILE="$WORKSPACE/$OUTPUT_DIR/my-output.txt"
  if [ -f "$OUTPUT_FILE" ]; then
    # Mark complete, notify
    ...
  fi
fi
```

### 3. Create launcher script

See `scripts/run-dogfood.sh` as template.

### 4. Test end-to-end

```bash
# Launch task
./scripts/run-my-task.sh

# Verify registered
cat .clawdbot/active-tasks.json | jq .

# Wait for monitoring cycle
# Should auto-detect completion and notify
```

---

## Troubleshooting

### Tasks stuck in "running" state

**Symptom:** Task completed hours ago but still shows `"status": "running"`

**Cause:** Monitoring script isn't running or has a bug

**Fix:**
1. Check cron: `crontab -l | grep monitor`
2. Manually run: `bash .clawdbot/scripts/monitor-agents.sh`
3. Check logs: `tail -f .clawdbot/logs/monitor-$(date +%Y-%m-%d).log`

### No notifications sent

**Symptom:** Task completes but no OpenClaw event

**Cause:** OpenClaw not running or `openclaw` command not in PATH

**Debug:**
```bash
# Test notification manually
openclaw system event --text "Test notification" --mode now

# Check monitor logs for errors
grep -i error .clawdbot/logs/monitor-$(date +%Y-%m-%d).log
```

### Monitor script errors

**Symptom:** Monitor crashes or produces errors

**Debug:**
```bash
# Run monitor with verbose output
bash -x .clawdbot/scripts/monitor-agents.sh

# Check for jq errors (JSON parsing)
jq . .clawdbot/active-tasks.json
```

---

## Maintenance

### Clean old tasks

Tasks accumulate in `active-tasks.json`. Periodically archive completed/failed tasks:

```bash
# Archive tasks older than 7 days
jq 'to_entries | map(select(
  (.value.status == "running") or
  (.value.completedAt // .value.failedAt // "1970-01-01") > (now - 7*86400 | todate)
)) | from_entries' .clawdbot/active-tasks.json > .clawdbot/active-tasks.json.tmp

mv .clawdbot/active-tasks.json.tmp .clawdbot/active-tasks.json
```

### Rotate logs

Logs are dated (`monitor-YYYY-MM-DD.log`), but can grow large. Archive monthly:

```bash
# Move logs older than 30 days to archive
find .clawdbot/logs -name "monitor-*.log" -mtime +30 \
  -exec mv {} .clawdbot/logs/archive/ \;
```

---

## Future Enhancements

**Planned:**
- [ ] Dependency tracking (task B waits for task A)
- [ ] Task chaining (task A → task B → task C)
- [ ] Priority queues (URGENT tasks get resources first)
- [ ] Resource limits (max 2 coding agents at once)
- [ ] Retry logic (auto-retry failed tasks up to 3x)
- [ ] Health checks (periodic liveness probes)
- [ ] Metrics dashboard (task duration, success rate)

---

**Last updated:** 2026-03-01  
**Owner:** Jeff (Portfolio Manager)

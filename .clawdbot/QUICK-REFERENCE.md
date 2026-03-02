# Quick Reference — Simplified OpenClaw Workflows

**Last Updated:** 2026-03-02  
**Migration:** Over-engineered infrastructure → OpenClaw native

---

## Spawn an Agent

**Old way (deleted):**
```bash
bash spawn-agent.sh task-123 "Fix bug" titlerun-api fix/bug-123
# (80 lines of worktree + JSON management)
```

**New way:**
```bash
bash ~/.openclaw/workspace/.clawdbot/scripts/spawn-agent.sh \
  "Fix GitHub #42 in titlerun-api: Login bug"
# OR directly:
openclaw subagents spawn \
  --agent titlerun \
  --task "Fix GitHub #42: Login bug" \
  --workdir "$(mktemp -d)" \
  --label gh-titlerun-api-42 \
  --mode run
```

---

## Monitor Active Agents

**Old way (deleted):**
```bash
bash monitor-agents.sh  # 304 lines of polling
cat active-tasks.json   # Manual JSON parsing
```

**New way:**
```bash
openclaw subagents list --recent 24
openclaw subagents list --status failed
openclaw subagents list | grep running
```

---

## Communicate with Running Agent

**Old way (deleted):**
```bash
echo "New priority" > redirects/agent-123.txt
# (racy, polled every 10s)
```

**New way:**
```bash
openclaw subagents steer --target <session-key> --message "Update: new priority"
```

---

## Discover GitHub Issues → Spawn Agents

**Old way (127 lines):**
- Task registry management
- Duplicate detection via JSON
- Manual worktree creation
- Rush inbox updates

**New way (56 lines):**
```bash
bash ~/.openclaw/workspace/.clawdbot/scripts/discover-tasks.sh
```
- Uses `openclaw subagents spawn` with `--label` for tracking
- No JSON state needed (OpenClaw tracks sessions)
- Auto-announce on completion (no manual monitoring)

---

## Log Patterns (HEARTBEAT.md helper)

```bash
log_pattern \
  "Pattern Name" \
  "Context: what happened" \
  "What worked: successes" \
  "What didn't: failures" \
  "Lesson: key takeaway"
```

Writes to: `~/.openclaw/workspace/memory/patterns.md`

---

## Spawn Agent for Bug Fix (HEARTBEAT.md helper)

```bash
spawn_fix 42 titlerun-api "Login 401 error"
```

Equivalent to:
```bash
openclaw subagents spawn \
  --agent titlerun \
  --task "Fix GitHub #42 in titlerun-api: Login 401 error" \
  --workdir "$(mktemp -d)" \
  --label gh-titlerun-api-42 \
  --mode run
```

---

## Migration Status

- ✅ Deleted: monitor-agents.sh (304 lines)
- ✅ Deleted: cleanup-worktree.sh (41 lines)
- ✅ Deleted: redirect-agent.sh (21 lines)
- ✅ Deleted: log-pattern.sh (38 lines)
- ✅ Simplified: spawn-agent.sh (80→26 lines)
- ✅ Simplified: discover-tasks.sh (127→56 lines)
- ✅ Updated: HEARTBEAT.md (OpenClaw native monitoring)
- 🔄 To deprecate: active-tasks.json (use `openclaw subagents list`)

---

## Key Principles

1. **Use OpenClaw native features** — Don't rebuild what exists
2. **Push > Poll** — Auto-announce beats polling
3. **--workdir for isolation** — No manual worktree management
4. **Labels for tracking** — `--label gh-repo-123` instead of JSON state
5. **Simple > Complex** — 26 lines beats 80 lines

---

**Full Report:** `~/.openclaw/workspace/SIMPLIFICATION-COMPLETE-2026-03-02.md`  
**Archived Code:** `~/.openclaw/workspace/.clawdbot/archive/phase1-over-engineered/`

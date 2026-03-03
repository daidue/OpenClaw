# Agent Orchestration Architecture v2.0

## Design Principles

1. **Use What Actually Exists** - Research actual OpenClaw features before building
2. **Keep Spawning Inside Agents** - Only running agents have access to internal tools
3. **Bash Scripts for Data Only** - Scripts prepare data, agents make orchestration decisions
4. **Test Everything** - Verify commands exist before using them

## Component Responsibilities

### Rush (Main Agent - HEARTBEAT.md)

**Role:** Owner/Operator with full orchestration authority

**Has Access To:**
- Internal tools (tool calls during agent execution)
- `subagents(action="list")` - Monitor active/recent subagents ✅
- `subagents(action="steer")` - Send corrections to running agents ✅
- `subagents(action="kill")` - Terminate stuck/failed agents ✅
- Spawning mechanism - TBD (available to main agents, not subagents)

**Workflow:**
1. Every 30 minutes (heartbeat):
   - Check production health (API, frontend, logs)
   - Run bash script to prepare GitHub tasks
   - Read .task files from disk
   - Spawn subagents using internal tools
   - Monitor active subagents
   - Steer/kill as needed
   - Log patterns after significant work

**Can Do:**
- ✅ Spawn subagents (using internal tools)
- ✅ Monitor all subagents
- ✅ Steer running subagents
- ✅ Kill stuck subagents
- ✅ Read/write files
- ✅ Run bash scripts
- ✅ Make all tactical decisions

**Cannot Do:**
- ❌ Use CLI for subagent management (doesn't exist)

### Bash Scripts (prepare-github-tasks.sh)

**Role:** Data preparation and scanning

**Has Access To:**
- File system
- `gh` CLI (GitHub)
- Standard Unix tools (curl, grep, jq, etc.)

**Workflow:**
1. Scan GitHub repos for open issues with bug/critical labels
2. Parse issue data (number, title, labels, URL)
3. Write .task files to `tasks/pending/`
4. Exit (no persistence)

**Can Do:**
- ✅ Scan GitHub with `gh issue list`
- ✅ Validate inputs
- ✅ Write .task files
- ✅ Check repo status
- ✅ Parse JSON/text

**Cannot Do:**
- ❌ Spawn subagents (no access to internal tools)
- ❌ List active subagents
- ❌ Steer/kill subagents
- ❌ Use any OpenClaw internal orchestration tools

### Subagents (Spawned Workers)

**Role:** Execute specific tasks (bug fixes, features, research)

**Has Access To:**
- Read/write files
- Run commands
- Limited tool subset (no spawning)

**Workflow:**
1. Receive task description from Rush
2. Execute task autonomously
3. Report results back (auto-announce)
4. Terminate when done

**Can Do:**
- ✅ Read GitHub issues
- ✅ Write code
- ✅ Run tests
- ✅ Open PRs
- ✅ Research/analyze

**Cannot Do:**
- ❌ Spawn other subagents
- ❌ Access full orchestration tools

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub (Source of Truth)                                    │
│ - titlerun-api issues                                       │
│ - titlerun-app issues                                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ gh issue list
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ prepare-github-tasks.sh (Bash)                              │
│                                                              │
│ Scans repos, writes .task files                             │
│ Location: ~/.openclaw/workspace-titlerun/scripts/           │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ writes files
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ tasks/pending/*.task (File System)                          │
│                                                              │
│ Format:                                                     │
│   REPO=titlerun-api                                         │
│   ISSUE_NUMBER=42                                           │
│   ISSUE_TITLE=Login 401 error                               │
│   ISSUE_URL=https://github.com/...                          │
│   PRIORITY=URGENT                                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ reads files
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ HEARTBEAT.md (Rush - Main Agent)                            │
│                                                              │
│ Reads .task files, spawns subagents                         │
│ Uses: internal tools (tool calls)                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ spawns (internal tool)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Subagent (Worker)                                           │
│                                                              │
│ Label: gh-titlerun-api-42                                   │
│ Task: Fix GitHub #42 - Login 401 error                      │
│ Status: running → done/failed                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ auto-announces result
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Rush (Main Agent)                                            │
│                                                              │
│ Receives completion notice                                  │
│ Moves .task file to completed/                              │
│ Monitors with subagents(action="list")                      │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
~/.openclaw/workspace-titlerun/
├── HEARTBEAT.md                    # Rush's orchestration logic
├── SOUL.md                         # Rush's identity/mission
├── AGENTS.md                       # Rush's operational guide
├── inboxes/
│   └── rush-inbox.md              # Messages from Jeff
├── tasks/
│   ├── pending/                   # Tasks to be spawned
│   │   ├── .gitkeep
│   │   ├── gh-titlerun-api-42.task
│   │   └── gh-titlerun-app-55.task
│   ├── completed/                 # Archived task files
│   │   └── .gitkeep
│   └── .gitignore                 # Ignore *.task files
├── scripts/
│   └── prepare-github-tasks.sh    # GitHub scanner (bash)
└── memory/
    └── YYYY-MM-DD.md              # Daily notes
```

## Critical Distinctions

### CLI vs Internal Tools

| Feature | CLI Command | Internal Tool |
|---------|-------------|---------------|
| Spawn subagent | ❌ Does NOT exist | ✅ Available to main agents |
| List subagents | ❌ Does NOT exist | ✅ `subagents(action="list")` |
| Steer subagent | ❌ Does NOT exist | ✅ `subagents(action="steer")` |
| Kill subagent | ❌ Does NOT exist | ✅ `subagents(action="kill")` |
| Gateway control | ✅ `openclaw gateway` | N/A |
| Message sending | ✅ `openclaw message` | ✅ `message` tool |

### Bash vs Agent Code

| Capability | Bash Scripts | Agent Code (HEARTBEAT.md) |
|------------|--------------|---------------------------|
| Scan GitHub | ✅ `gh` CLI | ✅ Can also use tools |
| Write files | ✅ File I/O | ✅ File I/O |
| Read files | ✅ File I/O | ✅ File I/O |
| Spawn subagents | ❌ No access | ✅ Internal tools |
| List subagents | ❌ No access | ✅ Internal tools |
| Steer subagents | ❌ No access | ✅ Internal tools |
| Make decisions | ❌ Logic only | ✅ Full autonomy |

## Error Handling

### Bash Script Errors

**Scenario:** GitHub API down or rate limited

**Handling:**
```bash
gh issue list ... 2>/dev/null || {
  echo "⚠️  GitHub API unavailable, skipping scan"
  exit 0
}
```

**Scenario:** No issues found

**Handling:**
```bash
if [ "$TASK_COUNT" -eq 0 ]; then
  echo "ℹ️  No open bugs/critical issues in $repo"
fi
```

### Agent Orchestration Errors

**Scenario:** Subagent fails

**Handling:**
```
# Monitor with internal tool
result = subagents(action="list", recentMinutes=1440)

for agent in result['recent']:
    if agent['status'] == 'failed':
        # Log to memory
        # Optionally retry with modified task
        # Or escalate to Jeff
```

**Scenario:** Subagent stuck (running > 2 hours)

**Handling:**
```
for agent in result['active']:
    if agent['runtimeMs'] > 7200000:  # 2 hours
        # Option 1: Steer with correction
        subagents(action="steer", target=agent['label'], message="...")
        
        # Option 2: Kill and retry
        subagents(action="kill", target=agent['label'])
```

**Scenario:** Spawning fails

**Handling:**
```
# Spawning mechanism TBD - needs error handling when tested
# Log to memory, retry with backoff, or escalate
```

## Testing Checklist

### ✅ Tested by Subagent (This Run)

- [x] `subagents(action="list")` works
- [x] Bash script scans GitHub correctly
- [x] Bash script writes .task files correctly
- [x] Task file format is parseable
- [x] No CLI commands for subagent management exist

### ⚠️ Needs Testing by Main Agent (Rush)

- [ ] Spawning mechanism (what tool? what parameters?)
- [ ] `subagents(action="steer")` works in practice
- [ ] `subagents(action="kill")` works in practice
- [ ] End-to-end: prepare → spawn → monitor → complete
- [ ] Error handling: spawn failures
- [ ] Error handling: task file corruption
- [ ] Error handling: GitHub API unavailable

## Known Limitations

1. **Spawning mechanism unknown** - Available to main agents but not documented yet
2. **No spawn retry logic** - Needs to be added after spawning mechanism is tested
3. **No rate limiting** - Bash script could be improved with throttling
4. **No priority queue** - All tasks spawned immediately, should respect URGENT/HIGH/NORMAL

## Next Steps

1. **Main agent testing:** Rush runs this architecture and tests spawning
2. **Document spawning:** Update HEARTBEAT.md with working spawn code
3. **Add retry logic:** Handle spawn failures gracefully
4. **Add priority queue:** Spawn URGENT tasks first
5. **Add monitoring dashboard:** Visual status of all active subagents
6. **Pattern refinement:** Log what works/doesn't as Rush uses this system

## Success Metrics

- ✅ Architecture redesigned (bash ≠ spawn, agent = spawn)
- ✅ Internal tools documented
- ✅ CLI limitations documented
- ✅ Bash script tested and working
- ✅ Task file format defined
- ⚠️ Spawning mechanism needs main agent testing
- ⚠️ End-to-end workflow needs validation

**Status:** Design complete, implementation 80% done, needs main agent testing.

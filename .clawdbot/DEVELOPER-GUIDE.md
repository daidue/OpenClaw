# Developer Guide — Agent Swarm Infrastructure

**Last Updated:** March 8, 2026  
**Status:** Production-Ready (84/100 overall score)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Workflows](#workflows)
4. [Task Registry](#task-registry)
5. [Worktree Isolation](#worktree-isolation)
6. [Pattern Learning](#pattern-learning)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)

---

## Quick Start

### Spawn a Coding Agent (Isolated)

```bash
# Single command - handles everything
~/.openclaw/workspace/scripts/worktree/spawn-agent-worktree.sh \
  "fix-auth-bug" \
  "bolt" \
  "Fix authentication middleware bug in API" \
  ~/Documents/Claude\ Cowork\ Business/titlerun-api
```

**What happens:**
1. Queries pattern learning for relevant insights
2. Registers task in task registry
3. Creates isolated git worktree
4. Spawns coding agent with task
5. Agent works in isolation (no conflicts)

### Complete the Work

```bash
# Merges work, prompts for pattern capture, updates registry
~/.openclaw/workspace/scripts/worktree/cleanup-worktree.sh \
  "fix-auth-bug" \
  ~/Documents/Claude\ Cowork\ Business/titlerun-api
```

---

## Architecture

### Component Overview

```
Agent Swarm Infrastructure
│
├── Task Registry (.clawdbot/active-tasks.json)
│   ├── Tracks all active agent tasks
│   ├── Prevents duplicate work
│   └── Concurrent write protection (mkdir locking)
│
├── Worktree Isolation (scripts/worktree/)
│   ├── create-worktree.sh — Isolated git worktrees
│   ├── spawn-agent-worktree.sh — Full spawn workflow
│   └── cleanup-worktree.sh — Merge & cleanup
│
├── Pattern Learning (memory/patterns.md)
│   ├── Auto-capture what works/fails
│   ├── Query before starting work
│   └── Build institutional knowledge
│
└── Integration Layer (INTEGRATION-CONTRACT.md)
    ├── Canonical schema enforcement
    ├── Field naming standards
    └── Lock file protocols
```

### Data Flow

```
1. Developer/Agent needs to do work
       ↓
2. Query patterns.md for relevant insights
       ↓
3. Register task in active-tasks.json
       ↓
4. Create isolated git worktree
       ↓
5. Spawn agent with cwd=worktree
       ↓
6. Agent works (no conflicts with other agents)
       ↓
7. Cleanup: merge to main, capture pattern, update registry
```

---

## Workflows

### Workflow 1: Single Agent (Feature Development)

```bash
# 1. Spawn
spawn-agent-worktree.sh "build-trade-engine" "bolt" "Build mutual benefit trade algorithm" ~/repo

# Agent works...

# 2. Complete
cleanup-worktree.sh "build-trade-engine" ~/repo
# → Prompts for pattern capture
# → Merges to main
# → Deletes worktree
```

### Workflow 2: Multiple Parallel Agents

```bash
# Spawn 3 agents simultaneously (no conflicts)
spawn-agent-worktree.sh "feature-a" "bolt" "Build A" ~/repo &
spawn-agent-worktree.sh "feature-b" "bolt" "Build B" ~/repo &
spawn-agent-worktree.sh "feature-c" "bolt" "Build C" ~/repo &
wait

# Each works in isolation:
# - ~/repo-worktrees/feature-a/
# - ~/repo-worktrees/feature-b/
# - ~/repo-worktrees/feature-c/

# Clean up (can be done in any order)
cleanup-worktree.sh "feature-a" ~/repo
cleanup-worktree.sh "feature-b" ~/repo
cleanup-worktree.sh "feature-c" ~/repo
```

### Workflow 3: Manual Task Management

```bash
# Register a task without spawning
register-task.sh "research-feature-x" "research" "main" "Research feasibility of X"

# Do work manually...

# Mark complete
complete-task.sh "research-feature-x" "completed" "Findings documented in research/feature-x.md"
# → Prompts for pattern capture
```

---

## Task Registry

### Location
`~/.openclaw/workspace/.clawdbot/active-tasks.json`

### Schema (Canonical)

```json
{
  "tasks": [
    {
      "id": "task-name",
      "type": "feature|bugfix|research|infrastructure",
      "agent": "bolt|main|titlerun",
      "description": "What the task does",
      "sessionKey": "agent:main:subagent:abc123",
      "startTime": "2026-03-08T15:00:00Z",
      "timeoutMinutes": 120,
      "status": "active|completed|failed"
    }
  ],
  "lastUpdated": "2026-03-08T15:30:00Z",
  "recentCompletions": [
    {
      "id": "previous-task",
      "type": "bugfix",
      "agent": "bolt",
      "status": "completed",
      "completed": "2026-03-08T14:00:00Z",
      "runtime": "45m",
      "result": "Bug fixed, tests passing"
    }
  ]
}
```

### Operations

**Register:**
```bash
register-task.sh <task-id> <type> <agent> <description> [session-key] [timeout-minutes]
```

**Complete:**
```bash
complete-task.sh <task-id> <status> <result>
# status: completed | failed
```

**Query active tasks:**
```bash
jq '.tasks[] | {id, type, agent, startTime}' ~/.openclaw/workspace/.clawdbot/active-tasks.json
```

---

## Worktree Isolation

### What It Does

Creates isolated git worktrees so multiple agents can work on the same repo simultaneously without conflicts.

**Without worktrees:**
- Agent A: checks out branch, modifies files
- Agent B: tries to check out different branch → ERROR (files modified)
- Agents block each other

**With worktrees:**
- Agent A: works in `~/repo-worktrees/task-a/`
- Agent B: works in `~/repo-worktrees/task-b/`
- No conflicts, parallel execution

### Scripts

#### create-worktree.sh

```bash
create-worktree.sh <task-id> <base-branch> <repo-path>

# Example:
create-worktree.sh "fix-bug-123" "main" ~/Documents/Claude\ Cowork\ Business/titlerun-api

# Returns (last line of output):
/Users/you/Documents/Claude Cowork Business/titlerun-api-worktrees/fix-bug-123
```

**What it does:**
1. Validates repo exists and is git repo
2. Checks disk space (needs 1GB free)
3. Creates new branch: `agent/<task-id>`
4. Creates worktree at: `<repo-path>-worktrees/<task-id>/`
5. Returns absolute path

#### spawn-agent-worktree.sh

```bash
spawn-agent-worktree.sh <task-id> <agent-id> <task-description> <repo-path>

# Example:
spawn-agent-worktree.sh \
  "add-redis-cache" \
  "bolt" \
  "Add Redis caching layer to API endpoints" \
  ~/repo
```

**What it does:**
1. Queries `memory/patterns.md` for relevant insights
2. Registers task in task registry
3. Creates worktree via `create-worktree.sh`
4. Spawns OpenClaw agent with `cwd=worktree-path`
5. Logs everything to `.clawdbot/logs/worktree-<task-id>.log`

#### cleanup-worktree.sh

```bash
cleanup-worktree.sh <task-id> <repo-path> [--force]

# Example:
cleanup-worktree.sh "add-redis-cache" ~/repo

# Force (skip uncommitted check):
cleanup-worktree.sh "add-redis-cache" ~/repo --force
```

**What it does:**
1. Checks for uncommitted changes (blocks unless `--force`)
2. Switches main repo to `main` branch
3. Merges `agent/<task-id>` into `main`
4. Removes worktree directory
5. Deletes agent branch
6. Calls `complete-task.sh` to capture pattern
7. Returns to original branch

### Error Handling

**Disk full:**
```
ERROR: Insufficient disk space. Need 1GB, have 500MB.
```

**Uncommitted changes:**
```
ERROR: Uncommitted changes in worktree:
  M src/api/cache.ts
  ?? tests/cache.test.ts
→ Commit changes or use --force to discard
```

**Merge conflict:**
```
ERROR: Merge conflict detected.
Worktree preserved at: /path/to/worktree
Resolve manually:
  cd /path/to/worktree
  git merge main
  # resolve conflicts
  cleanup-worktree.sh <task-id> <repo> --force
```

---

## Pattern Learning

### What It Does

Captures what works and what fails so we don't repeat mistakes. Think of it as institutional memory that grows over time.

### Location
`~/.openclaw/workspace/memory/patterns.md`

### Structure

```markdown
# Agent Execution Patterns

## Prompts That Work
- **[Date] [Task Type]** — Description
  - **Prompt:** "exact prompt text"
  - **Outcome:** "what it produced"
  - **Reusable:** Yes/No
  - **Context:** When to use this pattern

## Anti-Patterns (Avoid These)
- **[Date] [Task Type]** — What failed
  - **Attempted:** "what was tried"
  - **Failure mode:** "how it failed"
  - **Root cause:** "why it failed"
  - **Lesson:** "what to do instead"

## Debugging Wins
- **[Date] [Issue]** — How it was solved
  - **Symptom:** "what we saw"
  - **Root cause:** "what it actually was"
  - **Fix:** "what worked"
  - **Time saved:** estimate

## Architecture Decisions
- **[Date] [Component]** — Why we built it this way
  - **Context:** "the problem"
  - **Decision:** "what we chose"
  - **Alternatives:** "what we rejected and why"
  - **Rationale:** "why this is better"
```

### Query Patterns

```bash
# Search by keyword
query-patterns.sh "authentication"

# Before starting work (automatic in spawn-agent-worktree.sh)
query-patterns.sh "bug fix"
```

### Capture Patterns

**Automatic (via complete-task.sh):**
```bash
complete-task.sh "fix-auth-bug" "completed" "Bug fixed, tests passing"

# Prompts:
📝 Pattern Learning (optional)
What pattern should we capture from this task?
  1) Prompt that worked
  2) Anti-pattern (what failed)
  3) Debugging win
  4) Architecture decision
  5) Skip
Choice (1-5): _
```

**Manual (via complete-task.sh):**
1. Choose pattern type
2. Enter details (prompt, outcome, lesson, etc.)
3. Pattern appended to `patterns.md`
4. Available for future queries

### Examples

**Good pattern (actionable):**
```markdown
## Prompts That Work
- **2026-03-08 Bug Fix** — Always include reproduction steps
  - **Prompt:** "Fix [bug]. Steps to reproduce: 1) ..., 2) ..., 3) ..."
  - **Outcome:** Agent fixed bug on first try without clarification
  - **Reusable:** Yes
  - **Context:** Any bug fix task
```

**Bad pattern (vague):**
```markdown
## Prompts That Work
- **2026-03-08 General** — Do better
  - **Prompt:** "Try harder"
  - **Outcome:** It worked
```
→ This would be rejected by validation (too short, not actionable)

---

## Troubleshooting

### Task Registry Issues

**Problem:** "Task ID already exists"
```bash
# Check active tasks
jq '.tasks[]' ~/.openclaw/workspace/.clawdbot/active-tasks.json

# Complete or remove duplicate
complete-task.sh "<task-id>" "completed" "Done"
```

**Problem:** Concurrent write errors
```
ERROR: Could not acquire registry lock after 15 retries
```
→ Lock file stale or system under heavy load
```bash
# Remove stale lock
rm -rf /tmp/task-registry.lock

# Try again
```

### Worktree Issues

**Problem:** "Branch already exists"
```bash
# List branches
cd ~/repo && git branch | grep agent/

# Delete stale branch
git branch -D agent/<task-id>

# Try again
```

**Problem:** Worktree exists but directory missing
```bash
# Prune orphaned worktrees
cd ~/repo && git worktree prune

# Verify
git worktree list
```

**Problem:** Merge conflict during cleanup
```
ERROR: Merge conflict detected.
Worktree preserved at: /path/to/worktree
```
→ Resolve manually:
```bash
cd /path/to/worktree
git merge main
# Resolve conflicts in editor
git add .
git commit -m "Resolve merge conflict"
cd -
cleanup-worktree.sh <task-id> ~/repo
```

### Pattern Learning Issues

**Problem:** Pattern not found
```bash
# Check if file exists
ls -la ~/.openclaw/workspace/memory/patterns.md

# Create if missing (automatic in complete-task.sh)
```

**Problem:** Concurrent write corruption
```
ERROR: Pattern file locked
```
→ Lock contention (rare with 15 retries + jitter)
```bash
# Remove stale lock
rm -rf /tmp/pattern-capture.lock

# Try again
```

---

## Best Practices

### Naming Tasks

**Good:**
- `fix-auth-middleware-null-check`
- `add-redis-caching-layer`
- `research-websocket-scaling`

**Bad:**
- `stuff` (too vague)
- `fix bug` (not specific)
- `task-123` (no context)

**Rules:**
- Use kebab-case
- Be specific
- Include component/feature name
- Avoid special characters

### When to Use Worktrees

**Use worktrees for:**
- ✅ Parallel feature development
- ✅ Bug fixes that need testing
- ✅ Experimental branches
- ✅ Any coding task by agents

**Don't use worktrees for:**
- ❌ Quick one-line fixes (just edit directly)
- ❌ Documentation updates (low conflict risk)
- ❌ Research tasks (no code changes)

### Pattern Capture Discipline

**Always capture patterns for:**
- Novel solutions (first time solving this problem)
- Debugging wins (saved >30 minutes)
- Repeated mistakes (prevent future waste)
- Architecture decisions (why we chose X over Y)

**Skip pattern capture for:**
- Routine work (nothing new learned)
- One-off edge cases (won't recur)
- Work in progress (wait until complete)

### Resource Management

**Monitor RAM:**
```bash
# Check current usage
ps aux | awk '{sum+=$6} END {print int(sum/1024) "MB"}'

# Safe limit: < 18GB (of 24GB total)
```

**Monitor disk:**
```bash
# Check worktree disk usage
du -sh ~/repo-worktrees/

# Each worktree: ~500MB
# Safe: 5 worktrees = 2.5GB
```

**Monitor active agents:**
```bash
# List active tasks
jq '.tasks | length' ~/.openclaw/workspace/.clawdbot/active-tasks.json

# Safe: 3-5 concurrent agents
```

---

## Integration Contract

See `.clawdbot/INTEGRATION-CONTRACT.md` for canonical schema, field names, and lock protocols.

**Key points:**
- Always use `.id` not `.taskId`
- Always use dict format `{tasks:[], ...}` not flat array
- Always acquire lock before modifying registry
- Always use ISO 8601 timestamps

---

## Support

**Documentation:**
- `WORKTREE-USAGE.md` — Detailed worktree guide
- `PATTERN-LEARNING.md` — Pattern learning guide
- `INTEGRATION-CONTRACT.md` — Schema & standards
- `TASK-REGISTRY-USAGE.md` — Task registry guide

**Audit Reports:**
- `.clawdbot/audits/worktree-audit-report.md`
- `.clawdbot/audits/pattern-learning-audit-report.md`
- `.clawdbot/audits/integration-audit-report.md`

**Test Results:**
- `.clawdbot/tests/integration-test.sh` (run to verify)
- `.clawdbot/tests/STRESS-TEST-RESULTS.md`

---

**Questions?** Check patterns.md or add a question pattern for future reference.

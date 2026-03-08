# TASK: Pattern Learning System

**Priority:** HIGH  
**Executes:** Immediately after worktree system completes  
**Estimated:** 60-90 minutes  

---

## Mission
Build production-grade pattern learning system that captures what works/fails in every agent task. Zero manual logging — automatic capture on task completion.

## Requirements

### 1. Pattern Storage (`memory/patterns.md`)

**Structure:**
```markdown
# Agent Execution Patterns

## Prompts That Work
- [Date] [Task Type] — Brief description of what worked
  - Prompt: "specific prompt text"
  - Outcome: "what it produced"
  - Reusable: Yes/No

## Anti-Patterns (Avoid These)
- [Date] [Task Type] — What failed
  - Attempted: "what was tried"
  - Failure: "how it failed"
  - Lesson: "what to do instead"

## Debugging Wins
- [Date] [Issue] — How it was solved
  - Symptom: "what we saw"
  - Root cause: "what it actually was"
  - Fix: "what worked"

## Architecture Decisions
- [Date] [Component] — Why we built it this way
  - Context: "the problem"
  - Decision: "what we chose"
  - Rationale: "why"
```

### 2. Auto-Capture Hook

**Modify `complete-task.sh`:**
- After task completion, prompt for pattern capture
- Format: "What pattern should we capture from this task? (prompt/anti-pattern/debug/arch/skip)"
- Parse response, append to memory/patterns.md
- Include: date, task-id, task-type, pattern details
- Validation: ensure pattern is actionable, not vague

### 3. Pattern Query Tool

**Create `scripts/query-patterns.sh`:**
- Usage: `query-patterns.sh <keyword>`
- Searches memory/patterns.md for relevant patterns
- Returns: matching patterns with context
- Use cases:
  - Before spawning agent: "What patterns exist for feature builds?"
  - During debugging: "Have we seen this error before?"
  - Architecture decisions: "Why did we choose X over Y?"

### 4. Integration with Task Registry

**When registering new task:**
- Auto-query patterns for similar tasks
- Display relevant patterns to Jeff
- Ask: "Review these patterns before spawning? (y/n)"
- Log: which patterns were referenced

## Success Criteria

✅ memory/patterns.md structure defined
✅ complete-task.sh prompts for patterns
✅ query-patterns.sh returns relevant results
✅ 3 test patterns captured (1 prompt, 1 anti-pattern, 1 debug)
✅ Integration with register-task.sh working
✅ Documentation in PATTERN-LEARNING.md

## Constraints

- **Zero manual work** — capture happens automatically
- **Actionable patterns only** — no vague learnings
- **Fast queries** — grep-based, <1 second
- **Clear format** — markdown, human-readable
- **Version controlled** — patterns.md in git

## Working Directory

Pattern storage: `~/.openclaw/workspace/memory/patterns.md`
Scripts: `~/.openclaw/workspace/scripts/`
Docs: `~/.openclaw/workspace/.clawdbot/PATTERN-LEARNING.md`

## Anti-Patterns

❌ No generic patterns ("do better" — useless)
❌ No duplicates (merge similar patterns)
❌ No stale patterns (prune if invalidated)
❌ No manual updates (automation only)

## Deliverables

1. memory/patterns.md (initialized with structure)
2. Updated complete-task.sh (auto-capture hook)
3. scripts/query-patterns.sh (fast search)
4. Updated register-task.sh (pattern display)
5. .clawdbot/PATTERN-LEARNING.md (usage guide)
6. 3 test patterns captured

**Status:** Ready to execute on worktree completion

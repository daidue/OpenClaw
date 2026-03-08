# Pattern Learning System

**Version:** 1.0  
**Created:** 2026-03-08  
**Status:** Production

---

## Overview

Automatic institutional memory system that captures what works and what fails in every agent task. Zero manual updates, zero duplicates, grep-based queries under 1 second.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Pattern Lifecycle                        │
└─────────────────────────────────────────────────────────────┘

1. SPAWN TASK
   └─> register-task.sh
       └─> query-patterns.sh <task-type>
           └─> Shows relevant patterns BEFORE work starts

2. WORK HAPPENS
   └─> Agent executes task

3. COMPLETE TASK
   └─> complete-task.sh
       └─> Interactive prompt: capture pattern?
           ├─> Prompt that worked
           ├─> Anti-pattern (what failed)
           ├─> Debugging win
           ├─> Architecture decision
           └─> Skip

4. PATTERN STORED
   └─> memory/patterns.md (auto-formatted markdown)

5. FUTURE QUERIES
   └─> query-patterns.sh <keyword>
       └─> Returns matching patterns in <1 sec
```

## Components

### 1. Pattern Storage: `memory/patterns.md`

Structured markdown with 4 sections:

#### Prompts That Work
Effective prompts that produced good results. Include:
- Date, task type, description
- Exact prompt text
- Outcome
- Reusability (yes/no)
- Context (when to use)

**Example:**
```markdown
### 2026-03-08 Infrastructure Tasks — Comprehensive Error Handling Required
- **Prompt:** "For infrastructure tasks, require comprehensive error handling..."
- **Outcome:** Reduces post-deployment bugs by catching issues during build phase
- **Reusable:** Yes
- **Context:** Use when building scripts, automation, or infrastructure tooling
```

#### Anti-Patterns (Avoid These)
What failed and why. Include:
- Date, task type, what failed
- What was attempted
- Failure mode (how it failed)
- Root cause (why it failed)
- Lesson (what to do instead)

**Example:**
```markdown
### 2026-03-08 macOS File Locking — Don't Rely on flock
- **Attempted:** Used flock for atomic file operations on macOS
- **Failure mode:** flock not available by default on macOS
- **Root cause:** flock is Linux utility, not BSD
- **Lesson:** On macOS, use atomic mkdir for locks
```

#### Debugging Wins
How issues were solved efficiently. Include:
- Date, issue name
- Symptom (what you saw)
- Root cause (what it actually was)
- Fix (what worked)
- Time saved (estimate)

**Example:**
```markdown
### 2026-03-08 git worktree Silent Failure — Check Disk Space First
- **Symptom:** git worktree add succeeded but directory empty
- **Root cause:** Disk space exhausted during checkout
- **Fix:** df -h to check space, git worktree prune
- **Time saved:** 20 minutes
```

#### Architecture Decisions
Why we built things a certain way. Include:
- Date, component name
- Context (the problem)
- Decision (what we chose)
- Alternatives (what we rejected and why)
- Rationale (why this is better)

**Example:**
```markdown
### 2026-03-01 Shared Libraries — Inline Code vs npm Packages
- **Context:** Needed shared validation logic
- **Decision:** Inline the code directly in each service
- **Alternatives:** npm publish (rejected: slow iteration), workspace symlinks (rejected: breaks in production)
- **Rationale:** For <200 line utilities, inlining is faster and simpler
```

---

### 2. Pattern Query Tool: `scripts/query-patterns.sh`

**Usage:**
```bash
~/. openclaw/workspace/scripts/query-patterns.sh <keyword>
```

**Examples:**
```bash
# Search for database patterns
query-patterns.sh database

# Search for error handling
query-patterns.sh "error handling"

# Search for macOS-specific issues
query-patterns.sh macos
```

**Performance:**
- Grep-based search
- Case-insensitive
- Returns 5 lines of context
- Guaranteed <1 second for 1000+ patterns

**Output Format:**
```
📚 Patterns matching 'database':

### 2026-03-02 Production Deployment — Never Trust Unverified Environment Variables
- **Attempted:** Deployed titlerun-api to Railway staging...
- **Failure mode:** Connection reset loop (ECONNRESET)...
...
```

---

### 3. Task Registration: `.clawdbot/scripts/register-task.sh`

**Enhanced Workflow:**
1. Query patterns by task type
2. Display top 20 matching patterns
3. Optionally review full patterns file
4. Register task in active-tasks.json

**Usage:**
```bash
register-task.sh <task-id> <type> <agent> <description> [session-key] [timeout-minutes]
```

**Example:**
```bash
register-task.sh "db-migration" "database" "titlerun" "Migrate to Postgres 15" "" 120

# Output:
🔍 Searching for relevant patterns...

📚 Relevant patterns found for 'database':
### 2026-03-02 Database Connection Storms — Pool Size + SSL + KeepAlive
...

Review full patterns file? (y/n): n

✅ Task registered: db-migration
```

---

### 4. Task Completion: `.clawdbot/scripts/complete-task.sh`

**Enhanced Workflow:**
1. Mark task complete in registry
2. Prompt for pattern capture (optional)
3. Validate pattern quality
4. Auto-format and append to patterns.md
5. Update "Last updated" timestamp

**Usage:**
```bash
complete-task.sh <task-id> [status] [result]
```

**Interactive Capture:**
```bash
complete-task.sh "pattern-learning-system" "completed" "All tests passing"

# Output:
✅ Task completed: pattern-learning-system
   Status: completed
   Runtime: 45m
   Result: All tests passing

📝 Pattern Learning (optional)
What pattern should we capture from this task?
  1) Prompt that worked
  2) Anti-pattern (what failed)
  3) Debugging win
  4) Architecture decision
  5) Skip
Choice (1-5): 3

=== Capture Debugging Win ===
Issue name: git worktree Silent Failure
Symptom: worktree directory was empty
Root cause: Disk space exhausted
Fix: Check df -h first, prune old worktrees
Time saved: 20

✅ Debugging win saved!
```

**Validation Rules:**
- ❌ Rejects vague patterns (e.g. "do better")
- ❌ Rejects empty required fields
- ❌ Rejects lessons <20 characters
- ✅ Accepts specific, actionable patterns

---

## Quality Standards

### Good Patterns (Actionable)
✅ "When spawning coding agents, always include file paths in task description"  
✅ "On macOS, use atomic mkdir for locks instead of flock"  
✅ "For <200 line utilities, inline code instead of publishing to npm"  
✅ "Always verify DATABASE_URL before deploying to Railway staging"

### Bad Patterns (Too Vague)
❌ "Do better"  
❌ "Fix the bug"  
❌ "Test more"  
❌ "Be careful"

---

## Testing

### Test Pattern Capture

**Test 1: Capture Prompt Pattern**
```bash
complete-task.sh "test-prompt" "completed" "Testing prompt capture"
# Choose option 1
# Fill in:
# - Task type: Test Task
# - Description: Testing prompt capture
# - Prompt: "Test prompt pattern for validation"
# - Outcome: Successfully captured
# - Reusable: yes
# - Context: When testing pattern system

# Verify: grep "Test Task" memory/patterns.md
```

**Test 2: Capture Anti-Pattern**
```bash
complete-task.sh "test-anti" "completed" "Testing anti-pattern capture"
# Choose option 2
# Fill in anti-pattern details
# Verify: grep "test-anti" memory/patterns.md
```

**Test 3: Capture Debugging Win**
```bash
complete-task.sh "test-debug" "completed" "Testing debug win capture"
# Choose option 3
# Fill in debugging details
# Verify: grep "test-debug" memory/patterns.md
```

**Test 4: Capture Architecture Decision**
```bash
complete-task.sh "test-arch" "completed" "Testing arch decision capture"
# Choose option 4
# Fill in architecture details
# Verify: grep "test-arch" memory/patterns.md
```

### Test Pattern Query

**Test 5: Query by Keyword**
```bash
time query-patterns.sh database
# Verify: returns results in <1 second
# Verify: shows database-related patterns

time query-patterns.sh macos
# Verify: returns macOS-specific patterns

time query-patterns.sh nonexistent
# Verify: returns "No patterns found matching: nonexistent"
```

### Test Task Registration

**Test 6: Pattern Display Before Registration**
```bash
register-task.sh "test-db-task" "database" "test" "Test pattern display"
# Verify: shows database patterns before registration
# Verify: prompts to review full file
# Verify: task registered successfully
```

---

## Maintenance

### Prune Stale Patterns (Quarterly)
```bash
# Review patterns older than 6 months
grep "^### 2025-" memory/patterns.md

# Archive to memory/patterns-archive-YYYY-QN.md
# Keep only relevant, frequently-used patterns
```

### Check for Duplicates
```bash
# Find duplicate pattern titles
awk '/^### / {print}' memory/patterns.md | sort | uniq -d
```

### Verify File Integrity
```bash
# Check structure
grep -c "^## Prompts That Work" memory/patterns.md  # Should be 1
grep -c "^## Anti-Patterns" memory/patterns.md      # Should be 1
grep -c "^## Debugging Wins" memory/patterns.md      # Should be 1
grep -c "^## Architecture Decisions" memory/patterns.md  # Should be 1
```

---

## Usage Workflows

### Before Starting Work
```bash
# Agent about to work on database migration
query-patterns.sh database

# Agent about to build infrastructure script
query-patterns.sh infrastructure

# Agent about to debug production issue
query-patterns.sh debugging
```

### After Completing Work
```bash
# Task succeeded with a useful prompt
complete-task.sh <task-id> completed "<result>"
# Choose option 1: Prompt that worked

# Task failed due to known anti-pattern
complete-task.sh <task-id> failed "<error>"
# Choose option 2: Anti-pattern

# Debugging session saved time
complete-task.sh <task-id> completed "<fix>"
# Choose option 3: Debugging win

# Made architectural decision
complete-task.sh <task-id> completed "<implementation>"
# Choose option 4: Architecture decision
```

---

## Troubleshooting

### Pattern Not Saved
**Symptom:** Completed capture but pattern not in file  
**Cause:** Pattern failed validation (too vague or empty)  
**Fix:** Re-run capture with more specific details

### Query Returns Nothing
**Symptom:** `query-patterns.sh database` returns no results  
**Cause:** No patterns contain that keyword  
**Fix:** Try broader keyword (e.g. "data" instead of "database")

### Query Too Slow
**Symptom:** Query takes >1 second  
**Cause:** patterns.md file too large (>10MB)  
**Fix:** Archive old patterns, keep only last 6 months

### Duplicate Patterns
**Symptom:** Same pattern captured multiple times  
**Cause:** No duplicate check before append  
**Fix:** Manual review + delete duplicates, then add check to capture function

---

## Integration Points

### With Task Registry
- `register-task.sh` calls `query-patterns.sh` before registration
- `complete-task.sh` prompts for pattern after completion
- Task type used as search keyword

### With Memory System
- Patterns stored in `memory/patterns.md`
- Daily memory notes can reference patterns: "See patterns.md #database-migration"
- Weekly reviews can surface frequently-queried patterns

### With Git
- `patterns.md` version controlled
- Commit messages: "Pattern: <title> — <category>"
- Track pattern evolution over time

---

## Future Enhancements

### Phase 2 (Optional)
- [ ] Auto-detect similar patterns before append (fuzzy matching)
- [ ] Pattern usage analytics (which patterns queried most)
- [ ] Pattern effectiveness scoring (did following pattern prevent bugs?)
- [ ] Cross-business pattern sharing (Jeff → Owner/Operators)
- [ ] Pattern templates for common task types

### Phase 3 (Research)
- [ ] Vector embedding for semantic search
- [ ] LLM-assisted pattern synthesis (merge similar patterns)
- [ ] Predictive pattern suggestions (based on task description)

---

## Success Metrics

✅ **Adoption:** >80% of tasks capture at least one pattern  
✅ **Speed:** All queries return in <1 second  
✅ **Quality:** >90% of patterns rated "actionable" in quarterly review  
✅ **Impact:** Measurable reduction in repeat mistakes (track via task registry failures)

---

## References

- Task Registry: `.clawdbot/active-tasks.json`
- Scripts: `.clawdbot/scripts/`
- Patterns: `memory/patterns.md`
- Query Tool: `scripts/query-patterns.sh`

---

_This system is production-ready. No manual updates to patterns.md — all capture via automated workflows._

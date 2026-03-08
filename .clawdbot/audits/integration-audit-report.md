# Integration Audit: Worktree + Pattern Learning

**Auditor:** Jeff (Integration Audit Subagent)
**Date:** 2026-03-08
**Systems Tested:** Worktree Isolation (`scripts/worktree/`) + Pattern Learning (`memory/patterns.md` + `.clawdbot/scripts/`)

## Executive Summary

**The two systems do NOT work together.** They were built independently with incompatible data formats and zero cross-references. The worktree scripts and task registry scripts use different JSON schemas, different field names, and different array structures. Running `spawn-agent-worktree.sh` on the production registry **crashes with jq errors** and silently fails to register tasks. The cleanup script doesn't trigger pattern capture. There is no integrated workflow — a user must manually orchestrate 4-5 separate scripts in the correct order.

**Score: 28/100 — BLOCK (do not ship as "integrated")**

---

## Integration Bugs (Critical)

### 1. 🔴 Registry Schema Mismatch — spawn-agent-worktree.sh CRASHES on production registry

- **Scenario:** Running `spawn-agent-worktree.sh` against the active `active-tasks.json`
- **Issue:** `spawn-agent-worktree.sh` assumes `active-tasks.json` is a **flat JSON array** (`[]`) and does `jq '. += [{taskId: ...}]'`. But `register-task.sh` and `complete-task.sh` create a **dict** (`{tasks:[], lastUpdated:..., recentCompletions:[]}`). The jq operation fails with: `error: object and array cannot be added`
- **Impact:** Task registration silently fails. The worktree IS created but never tracked in the registry. Orphaned worktrees accumulate. No way to know what's running.
- **Verified:** YES — ran test, got 3 jq errors in single execution
- **Fix:** Standardize on ONE schema. Recommended: dict format (from register-task.sh) since it's richer. Update `spawn-agent-worktree.sh` and `cleanup-worktree.sh` to use `.tasks += [...]` and `.tasks[] | select(.id == $id)`.

### 2. 🔴 Field Name Mismatch — `taskId` vs `id`

- **Scenario:** Worktree scripts write `.taskId`, task scripts write `.id`
- **Issue:** `spawn-agent-worktree.sh` writes `{taskId: $task_id, agentId: ...}`. `register-task.sh` and `complete-task.sh` use `{id: $task_id, agent: ...}`. Even if the schema was fixed, `complete-task.sh` would never find tasks created by `spawn-agent-worktree.sh` because it queries `.tasks[] | select(.id == $id)` but the field is `.taskId`.
- **Impact:** Tasks registered by worktree scripts are invisible to task completion scripts (and vice versa)
- **Fix:** Standardize field names. Use `id` (shorter, matches register/complete scripts).

### 3. 🔴 cleanup-worktree.sh Does NOT Trigger Pattern Capture

- **Scenario:** User runs `cleanup-worktree.sh` after completing worktree task
- **Issue:** `cleanup-worktree.sh` does merge + remove + branch delete + registry update. It has **zero references** to pattern learning, `complete-task.sh`, or `query-patterns.sh`. The user must separately remember to run `complete-task.sh` after cleanup.
- **Impact:** Pattern capture is effectively opt-in and invisible. Institutional knowledge never gets captured after worktree tasks.
- **Verified:** `grep -in 'pattern\|complete-task\|learning' cleanup-worktree.sh` returns nothing
- **Fix:** Either (a) call `complete-task.sh` at the end of `cleanup-worktree.sh`, or (b) add pattern capture directly to cleanup script, or (c) at minimum print a reminder.

### 4. 🔴 spawn-agent-worktree.sh Does NOT Query Patterns Before Work

- **Scenario:** Agent spawned via worktree misses relevant institutional knowledge
- **Issue:** `register-task.sh` has pattern query integration (calls `query-patterns.sh` and shows relevant patterns). `spawn-agent-worktree.sh` has its own registration logic that **skips pattern query entirely**.
- **Impact:** The whole point of pattern learning — preventing repeated mistakes — is bypassed for worktree tasks
- **Verified:** `grep -in 'pattern\|query-pattern' spawn-agent-worktree.sh` returns nothing
- **Fix:** Add pattern query step to spawn-agent-worktree.sh (Step 0, before worktree creation)

---

## Workflow Gaps (High)

### 5. 🟡 No Single Integrated Command

- **Issue:** The "happy path" requires 5 separate commands: register-task → create-worktree → spawn-agent → cleanup-worktree → complete-task. The user must remember the correct order and pass consistent arguments.
- **Impact:** Agents (and humans) will skip steps, use wrong order, or pass mismatched IDs
- **Fix:** Create a single orchestrator script (`worktree-task.sh start|stop`) that chains the steps

### 6. 🟡 Cleanup Doesn't Call Complete — Double Registry Updates

- **Issue:** `cleanup-worktree.sh` updates the registry directly (sets status to "completed"). `complete-task.sh` also updates the registry (moves from tasks to recentCompletions). If user runs both, the second one fails silently (task already gone). If user only runs cleanup, the task stays in the wrong format.
- **Impact:** Registry gets into inconsistent state. Tasks marked "completed" in the array but never moved to recentCompletions.
- **Fix:** cleanup-worktree should NOT touch the registry. Leave that to complete-task.sh.

### 7. 🟡 No Retroactive Pattern Capture

- **Issue:** If a user skips pattern capture (choice "5"), there's no way to add a pattern retroactively for that specific task. The `complete-task.sh` script has already moved on.
- **Impact:** Valuable patterns lost when users are in a hurry (the most common scenario)
- **Fix:** Add a `capture-pattern.sh` standalone script or `complete-task.sh --add-pattern <task-id>` mode

### 8. 🟡 WORKTREE-USAGE.md Has ZERO Mentions of Pattern Learning

- **Issue:** The 20KB worktree documentation never mentions patterns, pattern learning, query-patterns, or complete-task. Someone reading only the worktree docs would have no idea the pattern system exists.
- **Impact:** The two systems are invisible to each other from a documentation perspective
- **Fix:** Add "After Cleanup" section to WORKTREE-USAGE.md that references pattern capture workflow

---

## Edge Cases (Medium)

### 9. 🟠 Concurrent Pattern Writes Cause Data Loss

- **Scenario:** 3 agents completing tasks simultaneously, all writing to patterns.md
- **Issue:** The `jq ... > $TMP && mv $TMP $FILE` pattern is NOT atomic for concurrent reads. Tested with 10 concurrent writes to a counter: expected 10, got **2**. Same applies to patterns.md `awk` operations.
- **Impact:** Pattern data silently lost during parallel completions
- **Verified:** YES — counter test showed 80% data loss under concurrency
- **Fix:** Use file locking (`mkdir` lock like worktree scripts do) around registry and pattern file writes

### 10. 🟠 Interactive Prompts Block Agent Execution

- **Scenario:** Agent (non-TTY) runs register-task.sh or complete-task.sh
- **Issue:** Both scripts have `read -p` prompts that block when no TTY is attached. Works when piping input, but agents don't naturally pipe "n" or "5" to skip prompts.
- **Impact:** Scripts hang in automated contexts unless explicitly piped
- **Partial Mitigation:** Both scripts DO work with piped input (`echo "5" | complete-task.sh ...`)
- **Fix:** Add `--non-interactive` or `--skip-patterns` flag; detect non-TTY and auto-skip prompts

### 11. 🟠 complete-task.sh Runtime Calculation Shows Negative Minutes

- **Scenario:** Timezone edge cases in date parsing
- **Issue:** The script's `date -jf` parsing sometimes produces negative runtimes (seen: `-240m` in recentCompletions for test-task-registry)
- **Impact:** Misleading metrics, makes runtime tracking useless
- **Fix:** Use epoch math consistently; the `[ $RUNTIME_MINUTES -lt 0 ] && RUNTIME_MINUTES=0` guard exists but doesn't fix the root cause

### 12. 🟠 Worktree Spawn Failure Leaves Orphaned Worktree

- **Scenario:** `spawn-agent-worktree.sh` creates worktree in Step 2, but agent spawn fails in Step 4
- **Issue:** The script warns the user to clean up manually but does NOT auto-cleanup the worktree. The worktree sits on disk indefinitely.
- **Impact:** Disk space leak; confusing `git worktree list` output
- **Fix:** Add `--cleanup-on-failure` flag or prompt user to auto-cleanup

---

## Positive Findings

1. **Worktree isolation works well standalone** — create/cleanup scripts are solid with proper locking (atomic `mkdir`), disk space checks, stale lock detection, and clear error messages
2. **Pattern learning capture UX is good** — the 5-option menu (prompt, anti-pattern, debug win, architecture decision, skip) covers the right categories
3. **query-patterns.sh is simple and fast** — grep-based search returns relevant results quickly
4. **register-task.sh pattern query is a good idea** — showing relevant patterns before starting work is the right UX. Just needs to be in the worktree flow too.
5. **Error handling in create-worktree.sh is excellent** — validates inputs, checks disk space, handles lock contention, cleans up on failure
6. **Both systems have good individual test results** — the issue is purely integration

---

## Overall Assessment

**Score: 28/100**
**Recommendation: BLOCK**

The two systems were clearly built in separate sessions without an integration contract. They use incompatible JSON schemas, different field names, and have zero cross-references in code or documentation. Running the "happy path" as described in the task spec would hit **3 critical failures** before completing.

**Minimum fixes to ship (get to 70/100):**
1. Standardize registry schema (dict format, `.id` field name) — 30 min
2. Add pattern query to spawn-agent-worktree.sh — 15 min
3. Add complete-task call or pattern prompt to cleanup-worktree.sh — 20 min
4. Add file locking to pattern writes — 15 min
5. Cross-reference documentation — 10 min

**Total estimated fix time: ~90 minutes**

---

## End-to-End Test Results

| # | Test Scenario | Result | Notes |
|---|-------------|--------|-------|
| 1 | **Happy Path** | ❌ FAIL | spawn-agent-worktree crashes on registry; cleanup doesn't trigger patterns |
| 2 | **Parallel Execution** | ⚠️ PARTIAL | Worktrees create fine in parallel; registry writes have race conditions |
| 3 | **Pattern Capture During Cleanup** | ❌ FAIL | cleanup-worktree has NO pattern integration |
| 4a | **Error: Non-existent repo** | ✅ PASS | Clean error, no orphaned entries |
| 4b | **Error: Agent spawn fails** | ❌ FAIL | Orphaned worktree left on disk; registry gets jq errors |
| 4c | **Error: Pattern capture fails** | ✅ PASS | Task still completes; pattern step is independent |
| 5 | **Concurrent Pattern Writes** | ❌ FAIL | 80% data loss in concurrency test (10 writes → only 2 survived) |
| 6 | **UX Friction** | ⚠️ ISSUES | No single command; easy to forget steps; no retroactive capture |
| 7 | **Documentation** | ❌ FAIL | WORKTREE-USAGE.md has 0 mentions of pattern learning |

**Passing: 2/9 tests (22%)**
**Partial: 2/9 tests (22%)**
**Failing: 5/9 tests (56%)**

---

## Appendix: Raw Test Commands & Output

### Schema Mismatch Test
```bash
$ cat active-tasks.json | jq '. += [{"taskId":"test","status":"init"}]'
# jq: error: object and array cannot be added
```

### Concurrency Test
```bash
$ echo '{"count":0}' > /tmp/test.json
$ for i in $(seq 1 10); do
    (jq --argjson i $i '.count = .count + 1' /tmp/test.json > $TMP && mv $TMP /tmp/test.json) &
  done; wait
# Expected: {"count": 10}
# Actual:   {"count": 2}
```

### spawn-agent-worktree.sh on Production Registry
```
jq: error (at active-tasks.json:80): object and array cannot be added
jq: error (at active-tasks.json:80): Cannot index array with string "taskId"
jq: error (at active-tasks.json:80): Cannot index array with string "taskId"
```

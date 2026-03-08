# Worktree Isolation System — Audit Report

**Auditor:** Jeff (Subagent — Adversarial Code Audit)
**Date:** 2026-03-08
**Overall Severity:** HIGH (multiple issues that will cause real failures)

---

## Executive Summary

The worktree system has a solid foundation—good input validation, proper locking via atomic `mkdir`, and clean separation of concerns across three scripts. However, I found **3 critical bugs**, **6 high-severity issues**, and several medium/low items. The most dangerous: `spawn-agent-worktree.sh` has dead error-handling code due to `set -e` interaction, and `cleanup-worktree.sh` can destroy uncommitted work in the *main* repo (not just the worktree). The test results document claims 11/11 passing but at least two tests were not actually executed, and the parallel spawn test reveals a design flaw where only 1-of-N parallel spawns succeeds.

**Recommendation: FIX CRITICAL before any production use.**

---

## Critical Issues (Block Production)

### C1. `set -e` Makes Worktree Creation Error Handling Dead Code

- **Severity:** CRITICAL
- **File:** `spawn-agent-worktree.sh:133-139`
- **Issue:** The script uses `set -euo pipefail` but captures the worktree creation exit code like this:
  ```bash
  WORKTREE_OUTPUT=$("${SCRIPT_DIR}/create-worktree.sh" "$TASK_ID" "$BASE_BRANCH" "$REPO_PATH" 2>&1)
  WORKTREE_EXIT_CODE=$?   # ← NEVER REACHED ON FAILURE
  ```
  With `set -e`, if the subshell command fails (non-zero exit), bash kills the script **before** `WORKTREE_EXIT_CODE=$?` executes. The entire `if [ $WORKTREE_EXIT_CODE -ne 0 ]` block is dead code for the failure path.
- **Impact:** When worktree creation fails, the script exits with a generic error instead of the helpful message that preserves the log path and cleanup instructions. The registry is left in `initializing` state forever.
- **Contrast:** The `openclaw sessions spawn` call on line 197 correctly uses `|| SPAWN_EXIT_CODE=$?` which prevents `set -e` from triggering. This is inconsistent—one pattern is correct, the other is broken.
- **Fix:**
  ```bash
  WORKTREE_OUTPUT=$("${SCRIPT_DIR}/create-worktree.sh" "$TASK_ID" "$BASE_BRANCH" "$REPO_PATH" 2>&1) || WORKTREE_EXIT_CODE=$?
  ```
- **Test:** Run `spawn-agent-worktree.sh` with a nonexistent repo path. Current behavior: script dies with set -e, no cleanup message. Fixed behavior: script prints log path and cleanup instructions.

---

### C2. `cleanup-worktree.sh` Doesn't Check Main Repo for Uncommitted Changes

- **Severity:** CRITICAL
- **File:** `cleanup-worktree.sh:150-165`
- **Issue:** The script checks for uncommitted changes in the **worktree** (lines 128-140) but then does:
  ```bash
  cd "$REPO_PATH"
  git checkout "$MAIN_BRANCH"
  git merge --no-ff "$BRANCH_NAME" ...
  ```
  If the main repo has uncommitted changes (e.g., another developer or agent is working there), `git checkout` can:
  1. **Fail** if changes conflict with the target branch
  2. **Silently overwrite** working tree files that don't conflict
  3. **Leave the repo in a detached/dirty state** on failure
- **Impact:** Data loss in the main repository. This is the kind of bug that hits at 3am when someone left uncommitted work and a cleanup cron runs.
- **Fix:** Add before `git checkout`:
  ```bash
  if ! git diff-index --quiet HEAD --; then
      error "Main repository has uncommitted changes. Commit or stash before cleanup."
  fi
  ```
- **Test:** Create uncommitted changes in main repo, run cleanup. Current: possible data loss. Fixed: clear error message.

---

### C3. `cleanup-worktree.sh` Mutates Main Repo HEAD

- **Severity:** CRITICAL
- **File:** `cleanup-worktree.sh:157-165`
- **Issue:** The cleanup script does `git checkout "$MAIN_BRANCH"` in the main repo. If anyone (human or agent) is currently working on a different branch in the main repo, this forcibly switches their branch. The `CURRENT_BRANCH` save/restore only fires on merge conflict, not on success.
- **Impact:** If an agent is working in the main repo (not a worktree) on a feature branch, cleanup switches them to main mid-work. Silent, destructive context switch.
- **Fix:** Either:
  1. **Don't checkout main; merge from current branch:**
     ```bash
     git merge --no-ff "$BRANCH_NAME" -m "Merge agent task: $TASK_ID"
     ```
     (This merges into whatever branch is currently checked out—probably not what you want.)
  2. **Better: Perform the merge without changing HEAD** by using a temporary worktree or `git merge-tree` + manual fast-forward.
  3. **Simplest fix: Save and restore current branch on ALL paths:**
     ```bash
     CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
     git checkout "$MAIN_BRANCH"
     git merge --no-ff "$BRANCH_NAME" ...
     # After successful merge, restore if different:
     if [ "$CURRENT_BRANCH" != "$MAIN_BRANCH" ]; then
         git checkout "$CURRENT_BRANCH"
     fi
     ```
- **Test:** Be on a feature branch in main repo, run cleanup. Current: silently switched to main. Fixed: restored to feature branch.

---

## High Issues (Must Fix Before Launch)

### H1. Parallel Spawning Is Broken by Design

- **Severity:** HIGH
- **File:** `create-worktree.sh:96-113` (locking section)
- **Issue:** The global lock (`${WORKTREE_BASE}/.worktree.lock`) serializes ALL worktree operations. If you launch 3 spawns in parallel (as the docs recommend with `&`), only 1 acquires the lock—the other 2 fail immediately with "Another worktree operation is in progress" and **do not retry**.
- **Impact:** The parallel execution examples in WORKTREE-USAGE.md (`spawn-agent-worktree.sh ... &`) will fail 2 out of 3 times. Test 10 confirms this: "Only one operation succeeded."
- **Fix:** Either:
  1. Add retry with backoff: `for i in {1..10}; do mkdir "$LOCK_DIR" 2>/dev/null && break; sleep $((RANDOM % 3 + 1)); done`
  2. Use per-task locks instead of a global lock: `LOCK_DIR="${WORKTREE_BASE}/.lock-${TASK_ID}"`
  3. Remove locking entirely (git worktree operations are already atomic at the git level)
- **Test:** Launch 3 creates in parallel. Current: 2 fail. Fixed: all 3 succeed (sequentially via retry or concurrently via per-task locks).

---

### H2. `spawn-agent-worktree.sh` Has No Cleanup Trap

- **Severity:** HIGH
- **File:** `spawn-agent-worktree.sh` (entire file)
- **Issue:** Unlike `create-worktree.sh` (which has a proper ERR/EXIT trap), this script has no trap at all. If the script is killed (SIGTERM, SIGINT, Ctrl+C) after worktree creation (step 2) but before agent spawn (step 4), the worktree is orphaned with no automatic cleanup.
- **Impact:** Orphaned worktrees accumulate on disk (~500MB each). Registry shows `ready` status forever with no agent to complete the task.
- **Fix:** Add trap after worktree creation:
  ```bash
  trap 'warn "Interrupted. Worktree preserved at: $WORKTREE_PATH"; warn "Cleanup: ${SCRIPT_DIR}/cleanup-worktree.sh $TASK_ID $REPO_PATH --force"' EXIT
  ```
- **Test:** Ctrl+C during step 3 or 4. Current: silent orphan. Fixed: clear instructions printed.

---

### H3. `2>&1` Corrupts Worktree Path Extraction

- **Severity:** HIGH
- **File:** `spawn-agent-worktree.sh:133`
- **Issue:** `WORKTREE_OUTPUT=$("${SCRIPT_DIR}/create-worktree.sh" ... 2>&1)` merges stderr into stdout. `create-worktree.sh` sends warnings to stderr (e.g., stale lock warning) and informational messages to stdout. With `2>&1`, all output is merged. Then `WORKTREE_PATH=$(echo "$WORKTREE_OUTPUT" | tail -n 1)` extracts the last line as the path.
  
  In normal cases the last line is the path. But if stderr output is buffered and flushed after the final stdout write (which can happen with different buffering modes), `tail -n 1` could grab a warning message instead of the path. This is fragile.
- **Impact:** Worktree path incorrectly extracted → all subsequent operations (agent spawn with wrong cwd, registry update with wrong path) fail or target wrong directory.
- **Fix:** Separate stdout and stderr:
  ```bash
  WORKTREE_PATH=$("${SCRIPT_DIR}/create-worktree.sh" "$TASK_ID" "$BASE_BRANCH" "$REPO_PATH" 2>>"$LOG_FILE") || WORKTREE_EXIT_CODE=$?
  ```
  This sends stderr to the log file and captures only stdout (which has the path as the last line).
- **Test:** Trigger a stale lock warning during creation. Check extracted path is correct.

---

### H4. Documentation Says `flock`, Code Uses `mkdir`

- **Severity:** HIGH (documentation bug, misleads debugging)
- **File:** `WORKTREE-USAGE.md` (create-worktree.sh section, line "Uses flock for mutual exclusion")
- **Issue:** Documentation says "Uses flock for mutual exclusion" but the code uses atomic `mkdir` for locking. macOS doesn't have `flock`, and the code correctly works around this—but the docs are wrong.
- **Impact:** When debugging locking issues, developers will look for `flock` usage and be confused. Troubleshooting section refers to `LOCK_FILE` (singular) but the actual implementation uses `LOCK_DIR` (directory).
- **Fix:** Update docs to say "Uses atomic `mkdir` for mutual exclusion (cross-platform, no flock dependency)." Update troubleshooting to reference `LOCK_DIR` not `LOCK_FILE`, and use `rmdir` not `rm`.

---

### H5. `--force` Cleanup Silently Discards Uncommitted Work Without Warning

- **Severity:** HIGH
- **File:** `cleanup-worktree.sh:127-140`
- **Issue:** With `--force`, the script skips the uncommitted changes check and proceeds to merge. But the merge only includes **committed** changes. Any uncommitted work is silently destroyed when the worktree is removed. There's no warning that uncommitted changes exist and will be lost.
- **Impact:** User runs `--force` expecting it to "force the merge" but it actually "force-discards uncommitted changes then merges committed ones." If the agent didn't commit, ALL work is lost silently.
- **Fix:** Even in force mode, warn about uncommitted changes:
  ```bash
  if $FORCE_MODE; then
      if ! git diff-index --quiet HEAD -- 2>/dev/null; then
          warn "Uncommitted changes will be DISCARDED (--force mode)"
      fi
  fi
  ```
- **Test:** Create worktree, make changes without committing, run `--force` cleanup. Current: silent loss. Fixed: explicit warning.

---

### H6. Test 11 (Stale Lock Detection) Was Not Actually Tested

- **Severity:** HIGH (test validity)
- **File:** `WORKTREE-TEST-RESULTS.md`, Test 11
- **Issue:** The test description says "Simulated in script logic" and shows pseudocode. This is a code review, not a test. No one actually:
  1. Created a lock directory
  2. Waited 5+ minutes (or faked the mtime)
  3. Ran a create operation
  4. Verified the stale lock was removed and the operation succeeded
- **Impact:** The stale lock codepath is unverified. If it's broken, agents could hang forever waiting for a lock that will never be released.
- **Test:** Actually test it:
  ```bash
  LOCK_DIR="/tmp/worktree-test-worktrees/.worktree.lock"
  mkdir -p "$LOCK_DIR"
  touch -t 202603080000 "$LOCK_DIR"  # Set mtime to 11+ hours ago
  create-worktree.sh test-stale main /tmp/worktree-test
  # Should warn about stale lock and succeed
  ```

---

## Medium Issues (Should Fix)

### M1. `stat` Fallback Treats All Failures as Stale Lock

- **Severity:** MEDIUM
- **File:** `create-worktree.sh:103`, `cleanup-worktree.sh:117`
- **Issue:** `stat -f %m "$LOCK_DIR" 2>/dev/null || stat -c %Y "$LOCK_DIR" 2>/dev/null || echo 0`
  If both `stat` variants fail (permissions, weird filesystem), `echo 0` is used. This means `LOCK_AGE = $(date +%s) - 0 ≈ 1.7 billion seconds`, which is always > 300. Every lock is treated as stale.
- **Impact:** On a system where `stat` fails for any reason, the locking mechanism is completely defeated.
- **Fix:** Fail safe instead of fail open:
  ```bash
  LOCK_MTIME=$(stat -f %m "$LOCK_DIR" 2>/dev/null || stat -c %Y "$LOCK_DIR" 2>/dev/null) || {
      error "Cannot determine lock age. Remove manually: rmdir $LOCK_DIR"
  }
  ```

---

### M2. Task Registry Grows Forever

- **Severity:** MEDIUM
- **File:** `spawn-agent-worktree.sh:81-96`, `cleanup-worktree.sh:215-228`
- **Issue:** `active-tasks.json` is append-only. Completed tasks are marked `"status": "completed"` but never removed. Over time, the file grows unbounded.
- **Impact:** Slow jq queries, wasted disk, confusing task listings. With 100 tasks/week, the file becomes unwieldy within months.
- **Fix:** Add a pruning step in cleanup: remove entries older than 30 days with status `completed`.

---

### M3. Inconsistent Timestamp Formats in Registry

- **Severity:** MEDIUM
- **File:** `cleanup-worktree.sh:222` vs `spawn-agent-worktree.sh:87`
- **Issue:** `startedAt` uses ISO 8601 (`"2026-03-08T14:30:15Z"`), but `completedAt` uses jq's `now` which returns a Unix epoch float (`1709911815.123`). Inconsistent formats in the same JSON object.
- **Fix:** Use consistent format:
  ```bash
  --arg completed_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.completedAt = $completed_at'
  ```

---

### M4. No Task ID Length Limit

- **Severity:** MEDIUM
- **File:** `create-worktree.sh:50-52`
- **Issue:** The regex `^[a-zA-Z0-9_-]+$` validates characters but not length. A 300-character task ID would create a directory name that could exceed `NAME_MAX` (255 on most filesystems) or push the full path past `PATH_MAX` (1024 on macOS).
- **Fix:** Add length check:
  ```bash
  if [ ${#TASK_ID} -gt 200 ]; then
      error "Task ID too long (${#TASK_ID} chars, max 200)"
  fi
  ```

---

### M5. `git worktree --help` Check Could Block

- **Severity:** MEDIUM
- **File:** `create-worktree.sh:69-71`
- **Issue:** `git worktree --help &>/dev/null` may open a pager (man page) on some systems, causing the script to hang waiting for user input.
- **Fix:** Use `git worktree list &>/dev/null` instead—it's a quick no-op that tests the command exists.

---

### M6. Test 10 (Concurrent Locking) Reveals Permanent Failure, Not Graceful Degradation

- **Severity:** MEDIUM
- **File:** `WORKTREE-TEST-RESULTS.md`, Test 10
- **Issue:** The test shows 3 parallel creates → only 1 succeeds, 2 fail permanently. The test report marks this as ✅ PASS, but it's actually revealing a usability bug (H1). The test should note that this means the parallel workflow examples in the docs are broken.
- **Impact:** False confidence in parallel execution capability.

---

## Low Issues (Nice to Have)

### L1. Double Lock Release in cleanup-worktree.sh

- **Severity:** LOW
- **File:** `cleanup-worktree.sh:175, 230`
- **Issue:** Lock is explicitly released in the merge-conflict error path (`rmdir "$LOCK_DIR"`) AND by the EXIT trap. The second `rmdir` fails silently (|| true), so it's harmless but sloppy.
- **Fix:** Remove the explicit `rmdir` in the error path; let the trap handle it.

---

### L2. No Symlink Protection

- **Severity:** LOW
- **File:** All scripts
- **Issue:** If `${REPO_PATH}-worktrees` is a symlink to another location, worktrees are created there instead. No `readlink` or `realpath` validation.
- **Fix:** Resolve paths: `WORKTREE_BASE=$(realpath "${REPO_PATH}-worktrees" 2>/dev/null || echo "${REPO_PATH}-worktrees")`

---

### L3. Registry File Permissions

- **Severity:** LOW
- **File:** `spawn-agent-worktree.sh:78`
- **Issue:** `active-tasks.json` is created with default umask (likely 644/world-readable). Contains task descriptions and session IDs.
- **Fix:** `umask 077` before creating, or `chmod 600 "$REGISTRY_FILE"` after.

---

### L4. Log Files Not Rotated

- **Severity:** LOW
- **File:** `spawn-agent-worktree.sh:63`
- **Issue:** Each spawn creates a log file in `.clawdbot/logs/`. Never cleaned up. Low priority since they're small (~5KB each).
- **Fix:** Add cleanup of logs older than 30 days to the cleanup script.

---

## Positive Findings

1. **Excellent input validation.** Task ID regex (`^[a-zA-Z0-9_-]+$`) is applied consistently in all three scripts. This prevents command injection via task IDs.
2. **Atomic locking with `mkdir`.** Great choice for macOS compatibility. Avoids flock dependency. The implementation is mostly correct.
3. **Proper `set -euo pipefail` everywhere.** Strict mode catches most unhandled errors (ironic that it also causes C1, but the intent is right).
4. **Clean separation of concerns.** Three scripts with distinct responsibilities: create, orchestrate, cleanup. Easy to understand and maintain.
5. **Disk space check.** 1GB minimum free space check before worktree creation is a nice production safety net.
6. **Merge conflict handling in cleanup.** Properly aborts merge, preserves worktree, and provides clear manual resolution instructions.
7. **Registry integration.** Task lifecycle tracking in `active-tasks.json` is well-designed for observability.
8. **No `eval`, no `sudo`, no privilege escalation.** Clean security posture.
9. **Comprehensive documentation.** WORKTREE-USAGE.md covers workflows, troubleshooting, FAQ, and performance—well above average.

---

## Overall Assessment

**Score: 62/100**

**Recommendation: FIX CRITICAL**

The architecture is sound and the code quality is above average for shell scripts. The three critical bugs (C1: dead error handling, C2: main repo data loss, C3: HEAD mutation) are all fixable with 5-10 lines of code each. The high issues (H1: parallel spawning broken, H3: stderr corruption, H5: silent data loss with --force) need attention before real agents use this in production.

The test results document overstates readiness—at least 2 tests weren't actually executed, and test 10 reveals a design flaw that's reported as a pass.

**After fixing C1-C3 and H1-H3, this system would score 80+ and be shippable.** The foundation is genuinely good; it just needs the sharp edges filed down.

---

## Fix Priority (Recommended Order)

| Priority | Issue | Effort | Risk if Skipped |
|----------|-------|--------|-----------------|
| 1 | C1 — set -e dead code | 1 line | Error handling completely broken |
| 2 | C2 — Main repo uncommitted check | 3 lines | Data loss |
| 3 | C3 — HEAD mutation | 5 lines | Silent context switch |
| 4 | H3 — stderr corruption | 1 line | Wrong worktree path |
| 5 | H1 — Parallel retry | 5 lines | Parallel spawning fails |
| 6 | H2 — Spawn cleanup trap | 3 lines | Orphaned worktrees |
| 7 | H5 — Force warning | 4 lines | Silent data loss |
| 8 | M1 — stat fallback | 3 lines | Lock defeated |
| 9 | H4 — Docs flock→mkdir | Text edit | Debugging confusion |
| 10 | Everything else | Various | Minor quality issues |

Total estimated fix effort: **~2 hours for a competent shell scripter.**

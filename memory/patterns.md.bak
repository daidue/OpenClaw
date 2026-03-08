# Agent Execution Patterns

Last updated: 2026-03-08

## Prompts That Work

### 2026-03-08 Infrastructure Tasks — Comprehensive Error Handling Required
- **Prompt:** "For infrastructure tasks, require comprehensive error handling and edge case testing. Before marking complete: (1) test happy path, (2) test 3 edge cases, (3) verify error messages are actionable, (4) document failure modes."
- **Outcome:** Reduces post-deployment bugs by catching issues during build phase
- **Reusable:** Yes
- **Context:** Use when building scripts, automation, or infrastructure tooling that will run unattended

---

## Anti-Patterns (Avoid These)

### 2026-03-08 macOS File Locking — Don't Rely on flock
- **Attempted:** Used `flock` for atomic file operations on macOS
- **Failure mode:** flock is not available by default on macOS; scripts fail silently or with "command not found"
- **Root cause:** flock is a Linux utility, not part of macOS BSD userland
- **Lesson:** On macOS, use atomic `mkdir` for locks (mkdir is atomic and fails if dir exists). Example: `mkdir "$LOCKDIR" 2>/dev/null && trap "rm -rf $LOCKDIR" EXIT`

### 2026-03-02 Production Deployment — Never Trust Unverified Environment Variables
- **Attempted:** Deployed titlerun-api to Railway staging, assumed DATABASE_URL was correct
- **Failure mode:** Connection reset loop (ECONNRESET), database didn't exist
- **Root cause:** Staging DATABASE_URL pointed to non-existent database instance
- **Lesson:** Always verify environment variables point to correct resources before deploying. Test connection with direct client (psql, redis-cli, etc.) before app deployment.

---

## Debugging Wins

### 2026-03-08 git worktree Silent Failure — Check Disk Space First
- **Symptom:** `git worktree add` command succeeded but directory was empty or corrupt
- **Root cause:** Disk space exhausted during checkout
- **Fix:** `df -h` to check disk space, clean up old worktrees with `git worktree prune`, verify with `git worktree list`
- **Time saved:** 20 minutes (prevented wild goose chase through git internals)

### 2026-03-02 Database Connection Storms — Pool Size + SSL + KeepAlive
- **Symptom:** PostgreSQL throwing repeated ECONNRESET errors in production
- **Root cause:** Connection pool too large (20 max connections on free tier), missing SSL config, no keepalive
- **Fix:** Reduced pool max to 3, added `ssl: { rejectUnauthorized: false }`, added TCP keepAlive settings
- **Time saved:** 30 minutes (immediate resolution vs. trial-and-error connection debugging)

---

## Architecture Decisions

### 2026-03-01 Shared Libraries — Inline Code vs npm Packages
- **Context:** Needed shared validation logic between titlerun-api and other services
- **Decision:** Inline the code directly in each service (`src/utils/validation.js`)
- **Alternatives:**
  - Publish to npm (rejected: requires auth, versioning, slows iteration)
  - Use workspace symlinks (rejected: works locally, breaks in Railway/production)
  - Git submodules (rejected: adds complexity, merge conflicts)
- **Rationale:** For small utility libraries (<200 lines) used by 1-3 services, inlining is faster to iterate, simpler to deploy, and eliminates npm auth/version coordination overhead. Trade copying 50 lines of code for 30 minutes of npm publish ceremony.

---

## How to Use This File

**Before starting work:**
```bash
~/. openclaw/workspace/scripts/query-patterns.sh <keyword>
```

**After completing work:**
Run `complete-task.sh` and choose to capture a pattern when prompted.

**Pattern Quality Standards:**
- ✅ GOOD: "When spawning coding agents, always include file paths in task description"
- ❌ BAD: "Do better" (too vague, not actionable)

---

_This file is auto-updated via `.clawdbot/scripts/complete-task.sh`. Do not manually edit patterns; use the capture workflow._

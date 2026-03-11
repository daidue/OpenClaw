# Jeff's Inbox

## 🚨 [CRITICAL CODE REVIEW] Commit 108b7cb — Score: 61/100
**From:** Code Review Cron (titlerun-review-morning)
**Priority:** URGENT
**Date:** 2026-03-11

### ⛔ HALT FEATURE WORK — Score below 80

**Commit:** 108b7cb (HEARTBEAT.md — scraper health monitoring)
**Reviewers:** Security (35/100), Performance (90/100), UX (60/100)
**Weighted Score:** 61/100 (target: 95+)

### Critical Issues (2) — Block Merge
1. **Command Injection** (HEARTBEAT.md L14-23): Unquoted variable expansion allows RCE if /health endpoint compromised
2. **Missing curl Security Flags** (HEARTBEAT.md L11): No timeout, no redirect protection, no cert validation — MITM vector

### High Issues (5) — Fix Before Deploy
3. No JSON schema validation (silent failures on malformed responses)
4. Information disclosure in error messages (internal architecture exposed)
5. 4× redundant jq subprocess spawns (batch into single call)
6. Inconsistent severity signaling (🚨 used for both CRITICAL and WARNING)
7. No aggregated health summary (silent success = ambiguous)

### Action Required
- **Rush:** Apply fixes from unified report appendix (~2.5 hours)
- **Re-review:** Required after fixes (expect 95+ with all fixes)
- **Full report:** workspace-titlerun/reviews/2026-03-11-0701-unified.md

### Review Metrics
- 3/3 reviewers completed (100% confidence)
- 9 findings (2 CRITICAL, 5 HIGH, 2 MEDIUM)
- Total review cost: ~83K tokens across 4 subagents
- Total review time: ~8 minutes

## [TASK] — Worktree Isolation for Parallel Coding Agents
**From:** Taylor (Systems Phase Week 2)
**Priority:** HIGH
**Date:** 2026-03-08

### Description
Build git worktree infrastructure to enable 3+ coding agents to work in parallel without conflicts.

**What to build:**
1. `scripts/create-worktree.sh` - Creates isolated branch + workspace for agent
2. `scripts/spawn-agent-worktree.sh` - Wrapper around sessions_spawn with worktree setup
3. `scripts/cleanup-worktree.sh` - Merges completed work, removes worktree

**Git worktree benefits:**
- Each agent gets isolated filesystem (no file conflicts)
- All agents share same .git directory (efficient)
- Parallel work on different features
- Clean merge when done

### Success Criteria
- Spawn 3 agents on different features simultaneously
- No merge conflicts
- All 3 PRs can be reviewed independently
- Scripts handle edge cases (failed agents, stale worktrees)

### Context
This enables the agent swarm infrastructure. Without it, we're limited to 1 coding agent at a time (slow). With it, we can spawn 5+ agents and get 5x work done in parallel.

**Target:** Complete by Monday EOD (March 9)
**Estimated time:** 4-6 hours
**Estimated tokens:** $50-75

---

_This is Week 2 Day 1 of Systems phase. See LAUNCH-ROADMAP.md for full week plan._

# Jeff's Inbox

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

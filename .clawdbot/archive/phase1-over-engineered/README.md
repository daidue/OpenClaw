# Phase 1 Over-Engineered Infrastructure (Archived)

**Date Archived:** 2026-03-02  
**Reason:** Dual adversarial audit found 83% of code was unnecessary

## What Was Deleted

1. **monitor-agents.sh (304 lines)** - Polling-based agent monitoring
   - Why: OpenClaw has `subagents list` + push-based auto-announce
   - Replaced with: Native OpenClaw session tracking

2. **cleanup-worktree.sh (41 lines)** - Git worktree cleanup
   - Why: OpenClaw has `--workdir` flag for temporary directories
   - Replaced with: `--workdir $(mktemp -d)` in spawn calls

3. **redirect-agent.sh (21 lines)** - Custom redirect file mechanism
   - Why: OpenClaw has `subagents steer`
   - Replaced with: Direct `openclaw subagents steer` calls

4. **log-pattern.sh (38 lines)** - Pattern logging script
   - Why: Simple bash function, doesn't need separate script
   - Replaced with: Inlined function in HEARTBEAT.md

**Total deleted:** 404 lines

## Directories Removed

- `worktrees/` - Not needed with OpenClaw's `--workdir` flag
- `redirects/` - Not needed with OpenClaw's `subagents steer`

## What Was Kept (to be refactored in Phase 2)

1. **discover-tasks.sh** - GitHub issue scanning (will be simplified from 100→40 lines)
2. **spawn-agent.sh** - Agent spawning (will be simplified from 80→20 lines)
3. **monitor-dogfood-task.sh** - Task-specific monitoring (preserved, not over-engineered)

## Lessons Learned

- Always check platform documentation BEFORE building custom infrastructure
- Polling is an antipattern when push-based events exist
- Don't reinvent features the platform already provides
- Simple is better than complex

## Audit Reports

- Security audit: `.clawdbot/audits/security-audit-2026-03-02.md`
- Simplicity audit: `.clawdbot/audits/simplicity-audit-2026-03-02.md`

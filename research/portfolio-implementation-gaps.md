# Portfolio Architecture — Implementation Gaps & Reality Check
## Things the Expert Panels Didn't Catch (Because They Don't Know Our Infra)
### 2026-02-11

---

## 🔴 CRITICAL GAPS

### 1. OpenClaw Doesn't Support Event-Driven Agent Activation
**The design says:** Edge (Polymarket) should be event-driven — activate on market creation, NOAA updates, position management.
**Reality:** OpenClaw only supports heartbeat-based activation (time intervals) and cron jobs. There is NO event-triggered agent wake.
**Fix:** Simulate with crons. Edge gets 2x daily crons (8am, 8pm) for market scanning. Position management via a lightweight Python script that runs every 30 min as a system cron (not an agent) and writes to Edge's inbox only when action is needed. Edge then processes on next heartbeat.

### 2. OpenClaw Doesn't Support Per-Heartbeat Model Routing
**The design says:** Use cheaper models for HEARTBEAT_OK checks, Sonnet for real work.
**Reality:** Model is set per-agent in openclaw.json. All heartbeats for an agent use the same model.
**Fix:** Accept this limitation for now. Sonnet is the default. The token savings from model routing (~30-40%) would require OpenClaw feature development. Document as future optimization.

### 3. Sub-Agent Workspace Persistence Problem
**The design says:** Fury and Bolt become ephemeral — no heartbeat, no standing workspace.
**Reality:** When `sessions_spawn` is used, the sub-agent runs in the spawning agent's context with the target agent's config. BUT the agent IDs `researcher` and `dev` already have workspaces (`workspace-researcher`, `workspace-dev`) with files in them. If we remove their heartbeats, the workspaces still exist but become stale/unmaintained.
**Decision needed:** 
- Option A: Keep workspaces but remove heartbeats. Workspaces serve as reference material that spawned sub-agents can read.
- Option B: Archive workspaces. Sub-agents are truly stateless. Context passed per-spawn.
- **Recommendation: Option A.** Workspaces serve as persistent context for shared sub-agents. Each Owner/Operator also maintains their own `context/researcher-context.md` for domain-specific context.

### 4. Eight Old Agent Directories Still Exist
**Reality:** `~/.openclaw/agents/` has 8 directories: analytics, commerce, content, dev, growth, main, ops, researcher. Session data: 93MB total. The dead agents (analytics, content, growth, ops) still have session files consuming disk.
**Fix:** When implementing, do NOT delete these directories (they contain audit trail). But remove the dead agent IDs from openclaw.json. Old session files remain for intelligence pipeline analysis.

### 5. Cross-Workspace File Access
**The design says:** Owner/Operators write to Jeff's inbox at `/Users/jeffdaniels/.openclaw/workspace/inboxes/jeff-inbox.md`.
**Reality:** Agents CAN write to any filesystem path (not sandboxed). But this creates implicit cross-workspace dependencies that aren't documented in any agent's config.
**Fix:** Each agent's AGENTS.md must explicitly document: "Jeff's inbox is at [full path]. Write to it for cross-agent communication." Already done for Grind but needs doing for Rush and Edge.

---

## 🟡 SIGNIFICANT GAPS

### 6. Cron Migration Needed
**Current state:** 19 cron jobs exist. 8 are disabled (including 5 zombie infra crons in 48h bake). 11 are active. Most are tied to `agentId: main`.
**Problem:** Several active crons should be reassigned to Owner/Operators:
- `reddit-sales-loop` → Should be Grind's (agentId: commerce), not main's
- `community-outreach-research` → Should be Grind's
- `fury-heartbeat` → Disabled, but Fury's heartbeat is now handled by openclaw.json config directly
- `intelligence:*` crons → Stay with main (Jeff's portfolio monitoring)
- `morning-standup` / `evening-checkin` → Stay with main but need format update for portfolio briefs
- `weekly-squad-review` → Stay with main, needs update for new structure

**Fix:** After deploying new agent config, migrate cron `agentId` fields for reddit-sales-loop and community-outreach-research to `commerce`. Update morning-standup and evening-checkin payloads for portfolio brief format.

### 7. Lock Files Don't Prevent Race Conditions
**The design says:** Check lock file → if free → grab it.
**Reality:** Two agents checking the same lock file simultaneously can both see it as free and both grab it. File locks on a single machine need atomic operations.
**Fix:** Use `mkdir` for locking (atomic on POSIX) instead of file writes. `mkdir ~/.openclaw/workspace/locks/browser.lock` succeeds for the first agent, fails for the second. Release = `rmdir`. Stale detection: check directory mtime.

### 8. TitleRun Codebase Lives Outside OpenClaw
**Reality:** TitleRun code is at `~/Documents/Claude Cowork Business/dpm-app/`. Rush's workspace would be at `~/.openclaw/workspace-titlerun/`.
**Fix:** Don't move the code. Add a symlink: `ln -s ~/Documents/Claude\ Cowork\ Business/dpm-app ~/.openclaw/workspace-titlerun/codebase`. Document the path in Rush's MEMORY.md. Rush's dev sub-agents reference the symlink.

### 9. Browser Profile Sharing is the Biggest Operational Risk
**Reality:** One `openclaw` browser profile. Currently Grind needs it for Reddit. Rush would need it for TitleRun deployment checks. Edge might need it for Polymarket. Jeff uses it for X.
**The lock file helps but:** Browser state (cookies, tabs, open pages) persists across agents. Agent A's tabs pollute Agent B's environment. Already documented: 80+ tabs accumulate.
**Fix:** 
1. Lock file for browser access (mandatory)
2. Each agent that uses browser MUST: open only what it needs → do its work → close its tabs → release lock
3. Weekly browser cleanup cron: close all tabs, clear temp data
4. Long-term: investigate multiple browser profiles (one per business unit)

### 10. Polymarket Bot Code is Separate from Workspace
**Reality:** Weather bot code is at `~/polymarket-arb/v2/` (outside workspace) AND at `workspace/projects/polymarket-weather-bot/`.
**Fix:** Consolidate. Symlink or move to `workspace-polymarket/bot/`. Document in Edge's MEMORY.md.

### 11. Grind's Existing Workspace Needs Update, Not Replacement
**Reality:** `workspace-commerce/` already exists with SOUL.md, HEARTBEAT.md, AGENTS.md, MEMORY.md, WORKQUEUE.md, inboxes, memory, reports, etc. These were written 2 hours ago during the earlier Grind deployment.
**Fix:** UPDATE these files for the new portfolio structure. Don't overwrite — merge the new portfolio context with existing business knowledge.

---

## 🟢 MINOR GAPS

### 12. No `workspace-titlerun/` or `workspace-polymarket/` Directories Yet
Self-explanatory. Need to create full directory structures.

### 13. `maxConcurrent: 6` May Be Tight
**Current config:** max 6 concurrent sessions. With 4 agents (Jeff, Grind, Rush, Edge) + sub-agent spawns, we could hit 6 when 2 Owner/Operators spawn sub-agents simultaneously.
**Fix:** Increase to 8. And with the lock file system, sub-agent spawns are serialized anyway.

### 14. `agentToAgent` Allow List Needs Updating
**Current:** `["main", "researcher", "commerce", "dev"]`
**Needed:** `["main", "researcher", "commerce", "dev", "titlerun", "polymarket"]`

### 15. Intelligence Pipeline Doesn't Track Costs
`agent-intelligence.py` reads session JSONL but doesn't calculate token costs. Enhancement needed for portfolio budget tracking.
**Fix:** Add a `cost` subcommand. Anthropic pricing is public. Calculate from token counts in session data.

### 16. Session File Growth (93MB and Growing)
No rotation/archival strategy. Will hit 500MB+ within a month with 4 active agents.
**Fix:** Add session archival cron: compress sessions older than 14 days, archive older than 30 days.

### 17. No PORTFOLIO.md or PORTFOLIO-MEMORY.md Yet
Core portfolio tracking files need to be created in Jeff's workspace.

### 18. Morning/Evening Brief Format Not Updated
Current cron payloads produce the old squad format. Need to update for the 8-line portfolio brief template.

---

## Implementation Order

Given these gaps, the implementation should be:

1. **Create new workspaces** (titlerun, polymarket) with full file structure
2. **Write SOUL.md, HEARTBEAT.md, AGENTS.md, MEMORY.md** for Rush and Edge
3. **Update Jeff's files** for portfolio manager role (SOUL.md, HEARTBEAT.md, AGENTS.md, PORTFOLIO.md, PORTFOLIO-MEMORY.md)
4. **Update Grind's files** for portfolio structure context
5. **Update openclaw.json** — add titlerun + polymarket agents, update agentToAgent, increase maxConcurrent
6. **Migrate crons** — reddit-sales-loop and community-outreach to commerce, update morning/evening brief formats
7. **Remove Fury/Bolt heartbeats** — keep as agent IDs for sub-agent spawning, keep workspaces
8. **Create lock directory** — `~/.openclaw/workspace/locks/`
9. **Symlink TitleRun codebase** — `workspace-titlerun/codebase → ~/Documents/Claude Cowork Business/dpm-app/`
10. **Test** — verify all agents start, heartbeats fire, sub-agent spawning works, inbox communication flows

---

*This is the gap analysis. The architecture is sound — these are implementation details that need to be addressed during deployment.*

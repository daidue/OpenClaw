# TASK: Rush as Persistent Agent

**Priority:** HIGH  
**Executes:** After pattern learning system completes  
**Estimated:** 90-120 minutes  

---

## Mission
Transform Rush into autonomous TitleRun monitoring agent that detects issues and spawns coding agents to fix them. Zero human intervention for routine bugs.

## Requirements

### 1. Rush Heartbeat Script (`scripts/rush-heartbeat.sh`)

**Runs every 30 minutes via cron:**
```bash
*/30 * * * * /Users/jeffdaniels/.openclaw/workspace/scripts/rush-heartbeat.sh >> ~/.openclaw/logs/rush-heartbeat.log 2>&1
```

**What Rush checks (in order):**

1. **Test Suite Status**
   - Run: `cd titlerun-api && npm test 2>&1 | grep "FAIL"`
   - If failures found → spawn agent to fix failing tests
   - Priority: CRITICAL

2. **Console Errors**
   - Check: `railway logs -e production --tail 100 | grep -iE "error|critical|fatal"`
   - If >10 errors in 30min → spawn agent to investigate
   - Priority: HIGH

3. **GitHub Issues**
   - Fetch: `gh issue list --label bug --limit 10 --json number,title,createdAt`
   - If new bugs (created <30min ago) → spawn agent per bug
   - Priority: NORMAL

4. **Production Health**
   - Check: `curl -s https://api.titlerun.co/health`
   - If non-200 response → alert Jeff immediately
   - Priority: CRITICAL

5. **Frontend Build Status**
   - Check: Cloudflare Pages deployment status
   - If build failed → spawn agent to fix
   - Priority: HIGH

**Spawn Logic:**
- Register task in .clawdbot/active-tasks.json FIRST
- Check for duplicate tasks (don't spawn if already working on it)
- Use worktree isolation for coding work
- Log all spawn decisions to ~/.openclaw/logs/rush-decisions.log

### 2. Agent Spawn Templates

**For test failures:**
```bash
spawn-agent-worktree.sh \
  "fix-test-$(date +%Y%m%d-%H%M)" \
  "titlerun" \
  "Fix failing tests: $(failing_test_names)" \
  "$HOME/Documents/Claude Cowork Business/titlerun-api"
```

**For console errors:**
```bash
spawn-agent-worktree.sh \
  "fix-error-$(date +%Y%m%d-%H%M)" \
  "titlerun" \
  "Investigate production errors: $(error_summary)" \
  "$HOME/Documents/Claude Cowork Business/titlerun-api"
```

**For GitHub issues:**
```bash
spawn-agent-worktree.sh \
  "fix-gh-issue-$issue_number" \
  "titlerun" \
  "Fix GitHub issue #$issue_number: $issue_title" \
  "$HOME/Documents/Claude Cowork Business/titlerun-api"
```

### 3. Decision Logging

**Every heartbeat logs:**
- Timestamp
- Checks performed
- Issues found
- Decisions made (spawn/skip/alert)
- Agent spawn IDs
- Time to completion

**Format:**
```
[2026-03-08 14:30:00] Rush Heartbeat #47
  Tests: ✅ PASS (1469 passing)
  Console: ✅ CLEAN (2 warnings, 0 errors)
  GitHub: ⚠️ NEW ISSUE #127 "Mobile layout broken on iOS"
    Action: SPAWN agent fix-gh-issue-127
    Session: agent:titlerun:subagent:abc123
  Production: ✅ HEALTHY (200 OK, 45ms)
  Frontend: ✅ DEPLOYED (build #892)
  Duration: 12s
```

### 4. Alert Thresholds

**When Rush alerts Jeff immediately:**
- Production health check fails (non-200)
- >20 errors in production logs
- Test suite drops below 95% passing
- >5 GitHub bugs created in 1 hour
- Agent spawn fails 3x consecutively

**Alert method:**
- Message to Jeff via Telegram (using `message` tool)
- Format: `🚨 Rush Alert: [issue] — [action taken]`

### 5. Safety Rails

**Rush will NOT spawn agents for:**
- Database migrations (too risky)
- Production deploys (requires human approval)
- Dependency updates (breaking change risk)
- Architecture changes (strategic decisions)

**Instead:** File issue in Jeff's inbox for these

## Success Criteria

✅ rush-heartbeat.sh script operational
✅ Cron runs every 30 minutes
✅ Test: plant failing test, Rush detects + spawns fix
✅ Test: plant GitHub issue, Rush spawns agent
✅ Test: production error, Rush investigates
✅ Alert system working (Telegram message to Jeff)
✅ Decision log readable and actionable
✅ Safety rails prevent risky auto-fixes

## Constraints

- **Defensive spawning** — verify task not already running
- **Rate limiting** — max 3 agents spawned per heartbeat
- **Budget awareness** — track token usage per heartbeat
- **Clean logs** — structured, grep-able
- **Fail-safe** — if Rush itself fails, alert Jeff

## Working Directory

Script: `~/.openclaw/workspace/scripts/rush-heartbeat.sh`
Logs: `~/.openclaw/logs/rush-heartbeat.log`
Decisions: `~/.openclaw/logs/rush-decisions.log`
Docs: `~/.openclaw/workspace/.clawdbot/RUSH-AGENT.md`

## Anti-Patterns

❌ No blind spawning (check for duplicates)
❌ No infinite loops (cap at 3 spawns per beat)
❌ No silent failures (log everything)
❌ No risky auto-fixes (database, deploys, etc.)
❌ No token bombs (track spend, alert if >$10/day)

## Deliverables

1. scripts/rush-heartbeat.sh (production-ready)
2. Cron entry (30min intervals)
3. Alert integration (Telegram to Jeff)
4. Decision logging system
5. Safety rails implemented
6. .clawdbot/RUSH-AGENT.md (usage guide)
7. 3 test scenarios passing

**Status:** Ready to execute on pattern learning completion

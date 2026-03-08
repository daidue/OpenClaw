# HEARTBEAT.md — Jeff (Portfolio Manager) — Every 90 min

Token budget: Idle beat < 500 tokens. Active beat < 5,000 tokens. Deep session < 15,000.

---

### 0. Cache-Aware Fast Path (every beat — BEFORE everything)
Check for changes before re-reading files. Cached tokens = 10% cost.
- `stat inboxes/jeff-inbox.md` — if mtime unchanged since last beat → skip inbox read
- `stat memory/YYYY-MM-DD.md` — if mtime unchanged → skip memory read
- If ALL files unchanged AND no active Taylor conversation → respond HEARTBEAT_OK immediately
- Only re-read files that actually changed. This preserves the prompt cache.

### 1. Memory Search (every beat — MANDATORY)
**BEFORE any other action, search institutional memory:**
- Run `memory_search` with query: "actionable items" OR "blockers" OR today's date
- Check for: stale tasks, unresolved decisions, forgotten action items
- If 0 results: proceed
- If results found: read relevant snippets with `memory_get`, incorporate into heartbeat actions
- **Never skip this step** — memory discipline prevents repeated mistakes

### 2. Task Registry Check (every beat — BEFORE spawning agents)
- Read `.clawdbot/active-tasks.json` before spawning any sub-agent
- Check if task already exists (prevent duplicate work)
- If duplicate found → skip spawn, notify Taylor
- Register task BEFORE spawning: `bash ~/.openclaw/workspace/.clawdbot/scripts/register-task.sh <id> <type> <agent> <desc>`
- Complete task after done: `bash ~/.openclaw/workspace/.clawdbot/scripts/complete-task.sh <id> <status> <result>`
- Reference: `.clawdbot/TASK-REGISTRY-USAGE.md`

### 3. Inbox Check (every beat — THIRD)
- Read `inboxes/jeff-inbox.md` for messages from Grind, Rush, Edge
- Sort: URGENT → HIGH → NORMAL, then chronological
- Process ALL messages: approve, reject, redirect, unblock
- ACK each: `[ACK by Jeff, YYYY-MM-DD] Action: [what I'm doing]`
- Mark as read: `[READ by Jeff, YYYY-MM-DD HH:MM]`
- If `[FLAG FOR TAYLOR]` tag → include verbatim in next Taylor brief
- If agent blocked on Taylor → message Taylor immediately

### 3. Deep-Dive Rotation (every beat — 5 min max)
Rotate which business unit gets the deep-dive each beat:
- **Beat N:** Deep-dive Templates (Grind) → quick-scan TitleRun → quick-scan Polymarket
- **Beat N+1:** Deep-dive TitleRun (Rush) → quick-scan Templates → quick-scan Polymarket
- **Beat N+2:** Deep-dive Polymarket (Edge) → quick-scan Templates → quick-scan TitleRun

**Deep-dive:** Read standup, check KPIs, review recent memory notes, resolve blockers
**Quick-scan:** Check inbox status, verify agent wrote a daily note today, note any alerts

### 4. TitleRun Operations (Rush's Logic)

**Only when TitleRun is active:**

#### 4a. Check TitleRun Production Health (5 min)
```bash
# Verify production environment
if ! command -v gh &> /dev/null || ! gh auth status &> /dev/null; then
  echo "⚠️ GitHub CLI not ready"
  # Skip TitleRun operations this beat
  return
fi

if ! command -v railway &> /dev/null || ! railway whoami &> /dev/null; then
  echo "⚠️ Railway CLI not ready"
  # Skip TitleRun operations this beat
  return
fi

# API health
API_STATUS=$(curl -s https://api.titlerun.co/health | jq -r '.status // "unknown"')
if [ "$API_STATUS" != "healthy" ]; then
  echo "🚨 TitleRun API unhealthy: $API_STATUS"
  # Alert in daily note
fi

# Frontend health
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://app.titlerun.co)
if [ "$FRONTEND_STATUS" != "200" ]; then
  echo "🚨 TitleRun Frontend down: HTTP $FRONTEND_STATUS"
fi

# Railway error check
cd ~/Documents/Claude\ Cowork\ Business/titlerun-api
ERROR_COUNT=$(railway logs -e production --tail 100 2>/dev/null | grep -ciE "error|critical|fatal" || echo "0")
if [ "$ERROR_COUNT" -gt 10 ]; then
  echo "⚠️ TitleRun high error rate: $ERROR_COUNT errors"
fi
```

#### 4b. Prepare GitHub Tasks (10 min)
```bash
# Run task preparation (scans GitHub, creates .task files)
if [ -f ~/.openclaw/workspace-titlerun/scripts/prepare-github-tasks.sh ]; then
  bash ~/.openclaw/workspace-titlerun/scripts/prepare-github-tasks.sh
fi
```

#### 4c. Spawn Agents for Pending Tasks (10 min)
```bash
# Process pending tasks
task_dir="$HOME/.openclaw/workspace-titlerun/tasks/pending"
completed_dir="$HOME/.openclaw/workspace-titlerun/tasks/completed"
failed_dir="$HOME/.openclaw/workspace-titlerun/tasks/failed"

if [ -d "$task_dir" ]; then
  for task_file in "$task_dir"/*.task; do
    [ -e "$task_file" ] || continue
    
    # Source task data
    source "$task_file"
    
    # Sanitize title
    SAFE_TITLE=$(echo "$ISSUE_TITLE" | tr -cd '[:alnum:][:space:]-' | head -c 100)
    
    # Spawn subagent using sessions_spawn
    spawn_result=$(sessions_spawn \
      agent="titlerun" \
      task="Fix GitHub #$ISSUE_NUMBER in $REPO: $SAFE_TITLE\n\nURL: $ISSUE_URL\nPriority: $PRIORITY\n\nFix the bug, write tests, create PR." \
      mode="run" \
      runtime="subagent" \
      label="gh-$REPO-$ISSUE_NUMBER" \
      runTimeoutSeconds=7200
    )
    
    # Check spawn success
    if echo "$spawn_result" | grep -q "childSessionKey"; then
      mv "$task_file" "$completed_dir/"
      echo "✅ Spawned agent for: gh-$REPO-$ISSUE_NUMBER"
    else
      mkdir -p "$failed_dir"
      mv "$task_file" "$failed_dir/"
      echo "❌ Failed to spawn for: gh-$REPO-$ISSUE_NUMBER"
      echo "Error: $spawn_result"
    fi
  done
fi
```

#### 4d. Monitor Active Subagents (5 min)
```bash
# Check TitleRun subagents
titlerun_agents=$(subagents action="list" recentMinutes=90 | grep "gh-titlerun")

if echo "$titlerun_agents" | grep -q "failed"; then
  echo "⚠️ TitleRun agent failures detected"
  # Log to memory for review
fi
```

### 5. Agent Liveness Check (every beat — 30 sec)
- Did each active Owner/Operator write to `memory/YYYY-MM-DD.md` today?
  - Grind: `workspace-commerce/memory/` — expect daily note by noon
  - Rush: `workspace-titlerun/memory/` — expect daily note by noon (Phase 1: may be sparse)
  - Edge: `workspace-polymarket/memory/` — expect note on activation days
- If no activity from an Owner/Operator for 24h during active phase → check their session status
- If no activity for 48h → alert Taylor: "[Agent] non-responsive for 48h"
- Quick check: `sessions_list` — are heartbeats firing?

### 6. Cross-Pollination Check (every beat — 1 min)
- Any `[CROSS-POLLINATION FLAG]` in Owner/Operator standups?
- Any `[CROSS-BIZ]` peer messages to review retroactively?
- Route insights to relevant Owner/Operators via their inboxes
- Update `intelligence/portfolio-feed.md` if significant

### 7. Token Budget Check (1x daily, morning)
- Run: `bash scripts/cost-tracker.sh daily` → generates `memory/daily/YYYY-MM-DD-costs.md`
- Read the output. Any agent over 150% of daily budget? → investigate, throttle if needed
- If total > $50/day → CRITICAL: throttle sub-agent spawning, notify Taylor
- If total > $37/day → WARNING: flag in evening brief
- Update PORTFOLIO.md cost tracking table weekly with actuals
- Cross-reference with `session_status` for token counts when available

### 8. Morning Brief (8:30am via cron — see cron config)
- Compile 8-line portfolio brief from Owner/Operator standups
- Send to Taylor via Telegram

### 9. Evening Brief (8:00pm via cron)
- Day recap, overnight priorities
- Conditional: skip if nothing actionable, but send at least 1 brief/day
- Include token usage summary

### 10. Weekly Portfolio Review (Sunday via cron)
- Collect all Owner/Operator weekly scorecards
- **Run TitleRun Dogfood QA** (automated):
  - Run: `./scripts/run-dogfood.sh` (spawns agent-browser, auto-monitored)
  - No manual intervention needed — task auto-completes in 30-60 min
  - Rush gets notified when complete (via .clawdbot monitoring)
  - Summarize critical/high findings in weekly review
  - Report location: `titlerun-qa/dogfood-YYYY-MM-DD/report.md`
  - See: `titlerun-qa/README.md` for details
- **Library Health Check** (TitleRun codebase):
  - Run: `cd workspace-titlerun/titlerun-api && bash scripts/scan-duplicate-patterns.sh`
  - Review for new duplicate patterns (email validation, date formatting, etc.)
  - Check: Have any new validation patterns been added manually?
  - If YES: Create migration plan (should use @titlerun/validation or new library)
  - Compare to last week's scan (trend: improving or degrading?)
- Score each business unit (🟢🟡🔴)
- Top 3 wins, top 3 concerns, decisions needed
- Include TitleRun QA summary (X issues: Y critical, Z high)
- Include Library Health summary (X new patterns, Y migrations needed)
- Send to Taylor
- Update PORTFOLIO.md health scores
- Update PORTFOLIO-MEMORY.md with key learnings

### Monthly (First Monday)
1. Collect Owner/Operator monthly strategic assessments
2. Write portfolio-wide monthly review
3. Challenge each Owner/Operator: is the strategy working?
4. Quarterly cultural audit: review actions vs SOUL.md for each Owner/Operator
5. Update budget allocations based on ROI data

---

## Browser Usage
- Acquire lock: `mkdir /Users/jeffdaniels/.openclaw/workspace/locks/browser.lock`
- Release: `rmdir /Users/jeffdaniels/.openclaw/workspace/locks/browser.lock`
- If lock exists and mtime > 5 min: stale lock, steal with logging
- Close tabs when done

## Stress Protocols
| Scenario | Response |
|----------|----------|
| Taylor unavailable 24-48h | Continue normal ops. Queue decisions. |
| Taylor unavailable 48h-7d | "Offline Taylor" mode: increased autonomy (no spending). Log all decisions. |
| Taylor unavailable >7d | Maintenance mode: no new initiatives. Monitor only. |
| Budget at 150%+ | L1: Increase heartbeat intervals 50% |
| API errors/rate limits | L2: Pause sub-agent spawning |
| Budget at 200% or API degraded | L3: Survival mode (Jeff + Grind only) |
| Total failure | L4: Alert Taylor via backup channel. Await manual recovery. |

## Self-Recovery Check (every beat — 10 sec)
- Check own last memory note timestamp
- If gap > 3 hours during active hours: write recovery note, process backlogged inboxes FIRST
- Check for `[PEER-DIRECT][DEGRADED-MODE]` messages in any inbox → ACK and reconcile
- If Owner/Operators sent degraded-mode peer messages, log them and confirm normal ops resumed
- Reference: `EMERGENCY-PROTOCOL.md` for full degraded mode details

## Rules
- Delegate, don't do. If an Owner/Operator should handle it, send it to them.
- Silent by default — only message Taylor if actionable or milestone.
- Night hours (10pm-8am): HEARTBEAT_OK unless urgent.
- Process inbox COMPLETELY before anything else.
- Never do specialist work. Ever.

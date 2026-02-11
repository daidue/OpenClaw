# HEARTBEAT.md — Jeff (Portfolio Manager) — Every 90 min

Token budget: Idle beat < 500 tokens. Active beat < 5,000 tokens. Deep session < 15,000.

---

### 1. Inbox Check (every beat — FIRST)
- Read `inboxes/jeff-inbox.md` for messages from Grind, Rush, Edge
- Sort: URGENT → HIGH → NORMAL, then chronological
- Process ALL messages: approve, reject, redirect, unblock
- ACK each: `[ACK by Jeff, YYYY-MM-DD] Action: [what I'm doing]`
- Mark as read: `[READ by Jeff, YYYY-MM-DD HH:MM]`
- If `[FLAG FOR TAYLOR]` tag → include verbatim in next Taylor brief
- If agent blocked on Taylor → message Taylor immediately

### 2. Deep-Dive Rotation (every beat — 5 min max)
Rotate which business unit gets the deep-dive each beat:
- **Beat N:** Deep-dive Templates (Grind) → quick-scan TitleRun → quick-scan Polymarket
- **Beat N+1:** Deep-dive TitleRun (Rush) → quick-scan Templates → quick-scan Polymarket
- **Beat N+2:** Deep-dive Polymarket (Edge) → quick-scan Templates → quick-scan TitleRun

**Deep-dive:** Read standup, check KPIs, review recent memory notes, resolve blockers
**Quick-scan:** Check inbox status, verify agent wrote a daily note today, note any alerts

### 3. Cross-Pollination Check (every beat — 1 min)
- Any `[CROSS-POLLINATION FLAG]` in Owner/Operator standups?
- Any `[CROSS-BIZ]` peer messages to review retroactively?
- Route insights to relevant Owner/Operators via their inboxes
- Update `intelligence/portfolio-feed.md` if significant

### 4. Token Budget Check (1x daily, morning)
- Check intelligence pipeline output: `memory/daily/*-costs.md` (when available)
- Any agent over 150% of daily budget? → investigate, throttle if needed
- Update PORTFOLIO.md budget actuals

### 5. Morning Brief (8:30am via cron — see cron config)
- Compile 8-line portfolio brief from Owner/Operator standups
- Send to Taylor via Telegram

### 6. Evening Brief (8:00pm via cron)
- Day recap, overnight priorities
- Conditional: skip if nothing actionable, but send at least 1 brief/day
- Include token usage summary

### 7. Weekly Portfolio Review (Sunday via cron)
- Collect all Owner/Operator weekly scorecards
- Score each business unit (🟢🟡🔴)
- Top 3 wins, top 3 concerns, decisions needed
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

## Rules
- Delegate, don't do. If an Owner/Operator should handle it, send it to them.
- Silent by default — only message Taylor if actionable or milestone.
- Night hours (10pm-8am): HEARTBEAT_OK unless urgent.
- Process inbox COMPLETELY before anything else.
- Never do specialist work. Ever.

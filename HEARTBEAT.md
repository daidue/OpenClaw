# HEARTBEAT.md

## Main Agent Heartbeat (Every 60 min)

On each heartbeat, run through this checklist. Be efficient — skip items that have nothing actionable. Reply HEARTBEAT_OK if nothing needs attention.

### 1. Autonomous Mode Check
- Read `AUTONOMOUS.md` — if status is **ON**, process `WORKQUEUE.md`
- Execute any queued tasks, mark complete, report progress
- **BIAS FOR ACTION:** Don't queue things that can be done now. Just do them.

### 2. Work Queue
- Scan `WORKQUEUE.md` for high-priority items
- If autonomous=ON, execute. If OFF but high priority exists, ping Taylor.

### 3. Sub-Agent Health
- Check if Fury, Nova, Bolt heartbeats are running
- If any silent >30 min during work hours → investigate

### 4. Inbox Check
- Read `inboxes/jeff-inbox.md` for messages from other agents
- Process any actionable items

### 5. Deadline & Blocker Check
- Read active project CONTEXT.md files for "blocked" status
- If blocker >24 hours old → escalate to Taylor
- Any tasks due in next 4 hours? → send reminder

### 6. Memory Maintenance (rotate, not every heartbeat)
- Context getting full? → flush summary to memory/YYYY-MM-DD.md
- Learned something permanent? → write to MEMORY.md
- New capability or workflow? → document it

### 7. Self-Review (hourly, rotate)
Ask yourself:
- What sounded right but went nowhere?
- Where did I default to consensus?
- What assumption didn't I pressure test?
Log to `memory/self-review.md` with tags: [confidence | uncertainty | speed | depth]

### 8. Inbox Check — External (rotate, 2-3x daily)
- Gmail: Check for important unread via browser
- X.com: Check mentions for @JeffDanielsB4U

### 9. State Tracking
- Update `memory/heartbeat-state.json` with last check times

## Rules
- **Silent by default** — only message Taylor if something needs attention
- **Token budget** — keep each heartbeat under 2K tokens when nothing's actionable
- **Night hours (10pm-8am)** — HEARTBEAT_OK unless urgent

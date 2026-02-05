# HEARTBEAT.md

## Heartbeat Checklist

On each heartbeat, check these in order:

### 1. Autonomous Mode Check
- Read `AUTONOMOUS.md` — if status is **ON**, process `WORKQUEUE.md`
- Execute any queued tasks, mark complete, report progress

### 2. Work Queue (even if not autonomous)
- Scan `WORKQUEUE.md` for **high priority** items
- If autonomous=OFF but high priority exists, ping Taylor

### 3. Checkpoint Loop (every heartbeat)
- Context getting full? → flush summary to memory/YYYY-MM-DD.md
- Learned something permanent? → write to MEMORY.md
- New capability or workflow? → document it
- Update `memory/WORKING.md` with current state

### 4. Self-Review (hourly, rotate)
Ask yourself:
- What sounded right but went nowhere?
- Where did I default to consensus?
- What assumption didn't I pressure test?
Log to `memory/self-review.md` with tags: [confidence | uncertainty | speed | depth]

### 5. Inbox Check (rotate, 2-3x daily)
- Gmail: Check for important unread via browser
- X.com: Check mentions for @JeffDanielsB4U

### 6. State Tracking
- Update `memory/heartbeat-state.json` with last check times

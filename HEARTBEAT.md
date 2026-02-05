# HEARTBEAT.md

## Heartbeat Checklist

On each heartbeat, check these in order:

### 1. Autonomous Mode Check
- Read `AUTONOMOUS.md` — if status is **ON**, process `WORKQUEUE.md`
- Execute any queued tasks, mark complete, report progress

### 2. Work Queue (even if not autonomous)
- Scan `WORKQUEUE.md` for **high priority** items
- If autonomous=OFF but high priority exists, ping Taylor

### 3. Inbox Check (rotate, 2-3x daily)
- Gmail: Check for important unread via browser
- X.com: Check mentions for @JeffDanielsB4U

### 4. State Tracking
- Update `memory/heartbeat-state.json` with last check times

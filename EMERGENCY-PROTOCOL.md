# EMERGENCY-PROTOCOL.md — Jeff-Down Degraded Mode

## Purpose
If Jeff (main agent) is unresponsive for 2+ consecutive heartbeat cycles, Owner/Operators enter degraded mode. This ensures business continuity without the portfolio manager.

## Detection
Each Owner/Operator checks Jeff's liveness by reading:
- `workspace/memory/YYYY-MM-DD.md` — did Jeff write today?
- `workspace/inboxes/jeff-inbox.md` — are messages piling up un-ACKed for 3+ hours?

If BOTH conditions are true → Jeff is likely down.

## Degraded Mode Rules

### All Agents
1. **Continue your current WORKQUEUE mission.** Don't stop working.
2. **Write standups to your own memory as normal.** Jeff will catch up.
3. **Do NOT escalate to Taylor unless 6+ hours of Jeff downtime.** He may self-recover.
4. **Peer messages:** Use `[CROSS-BIZ URGENT]` tag in peer inboxes for critical cross-business needs.

### Grind (Templates) — Highest Priority in Degraded Mode
- Continue daily minimums (10 pins, 1 Reddit, revenue report)
- Revenue report goes to own memory AND `workspace/inboxes/jeff-inbox.md` (queued for recovery)
- If blocked on Taylor approval: queue it, move to next revenue action
- **Grind becomes the Taylor alerter:** If Jeff down 6+ hours, Grind sends Telegram message to Taylor: "⚠️ Jeff appears down. Grind operating independently. Revenue ops continuing."

### Rush (TitleRun)
- Continue PREP phase work (deployment, landing page, etc.)
- No budget authority changes without Jeff
- Queue all strategic decisions for Jeff's return

### Edge (Polymarket)
- **HALT all trading** in degraded mode (no portfolio manager oversight = no trades)
- Continue research/backtesting only
- Resume normal ops when Jeff recovers

## Peer-to-Peer Communication (Emergency Only)
Agents CAN write directly to each other's inboxes during degraded mode:

| From | To | Inbox Path |
|------|----|-----------|
| Grind | Rush | `workspace-titlerun/inboxes/rush-inbox.md` |
| Grind | Edge | `workspace-polymarket/inboxes/edge-inbox.md` |
| Rush | Grind | `workspace-commerce/inboxes/grind-inbox.md` |
| Rush | Edge | `workspace-polymarket/inboxes/edge-inbox.md` |
| Edge | Grind | `workspace-commerce/inboxes/grind-inbox.md` |
| Edge | Rush | `workspace-titlerun/inboxes/rush-inbox.md` |

**Tag all peer messages:** `[PEER-DIRECT][DEGRADED-MODE] YYYY-MM-DD HH:MM`

## Recovery
When Jeff comes back online:
1. Jeff reads all Owner/Operator standups and inbox backlog
2. Jeff ACKs any peer-direct messages retroactively
3. Jeff sends Taylor a brief: "Recovered from [X]h downtime. Summary: [what happened]."
4. Normal operations resume

## Escalation Timeline
| Duration | Action |
|----------|--------|
| 0-3h | Normal. Jeff may be in deep session or between heartbeats. |
| 3-6h | Degraded mode activates. Agents self-direct. |
| 6-12h | Grind alerts Taylor via Telegram. |
| 12-24h | All agents reduce to essential ops only. |
| 24h+ | Taylor manually intervenes (restart Jeff, check gateway). |

---
_Created: 2026-02-11. Referenced by all Owner/Operator SOUL.md files._

# PORTFOLIO-MEMORY.md — Institutional Knowledge

## Why Each Business Exists

### Notion Templates ("Jeff the Notion Guy")
- **Why:** Lowest barrier to revenue. Digital products with near-zero marginal cost. Validates digital product skills. Builds email list that compounds. Gumroad Discover creates passive traffic.
- **Moat:** Multi-channel presence (Gumroad, Etsy, Pinterest, directories). Email list. Product library grows over time.
- **Risk:** Competitive market. Low switching costs. Depends on platform algorithms.

### TitleRun (Dynasty FF SaaS)
- **Why:** Highest revenue ceiling (SaaS recurring). Taylor's domain passion (fantasy football). Underserved "prosumer" segment willing to pay for tools. $36B+ TAM.
- **Moat:** Multi-platform aggregation (no competitor does this well). Content moat (weekly value updates). Community trust built over seasons.
- **Risk:** Seasonal dependency. Sleeper could build competing features. Requires ongoing development.

### Polymarket Weather Trading
- **Why:** Speculative income stream. Validates algorithmic trading capability. If edge exists, returns are uncorrelated with other businesses.
- **Moat:** NOAA data integration + proprietary analysis. Speed of execution. Accumulating market knowledge.
- **Risk:** Edge may not exist. Markets are zero-sum. Regulatory uncertainty. Thin liquidity.

## Our Competitive Advantages (Portfolio-Level)
- 24/7 autonomous operation — agents work while Taylor sleeps
- Multi-channel presence across all businesses
- Taylor's digital customer acquisition expertise
- Zero marginal cost for content creation
- Shared sub-agents reduce per-business overhead
- Institutional memory compounds across all businesses

## What We've Tried That Didn't Work
- **8-agent squad (Feb 5-11):** Fortune 500 org chart for a $0 business. 5 agents were idle. Cut to 4 core + 2 Owner/Operators.
- **X reply sprints:** Deprioritized per revenue deep think. Low ROI for 0-follower account.
- **Nate Calloway pseudonym:** Killed. Focus on "Jeff the Notion Guy" brand instead.
- **Product Hunt for templates:** They don't accept template submissions.
- **NotionEverything directory:** Paused new submissions.
- **Fiverr:** Too much manual effort for low-ticket orders.
- **Resume template as Product #2:** Expert panel flagged saturated market. Validation sprint needed.

## Key Strategic Decisions
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-11 | Portfolio company architecture | Each business gets autonomous Owner/Operator. Jeff as portfolio manager. |
| 2026-02-11 | Phased parallel launch | Templates 60% focus. TitleRun PREP. Polymarket RESEARCH. |
| 2026-02-11 | TitleRun full launch = July 2026 | Align with FF draft season (80% of signups) |
| 2026-02-11 | Polymarket Phase 0 required | Must prove edge exists before trading real money |
| 2026-02-11 | Fury & Bolt → ephemeral | No standing heartbeats. Spawned on-demand. Saves ~$10/day. |
| 2026-02-10 | Revenue pivot — SELL, don't build | 70% of activity was non-revenue. Focus on distribution. |
| 2026-02-10 | Reddit + directories + communities | Primary distribution channels for templates |

## Knowledge Compounding Assessment (2026-02-11)
The 5 disabled infrastructure crons are FULLY REPLACED by the new intelligence pipeline:
- `infra:hourly-summarizer` → `intelligence:hourly` (reads real session JSONL, not empty logs)
- `infra:cross-signal-detection` → `intelligence:signals` (same function, better implementation)
- `infra:daily-context-sync` → `intelligence:daily` (consolidated daily summary)
- `infra:weekly-synthesis` → `intelligence:weekly` (weekly trend analysis)
- `infra:decision-patterns` → included in `intelligence:daily` output
Old crons were zombies (reading nonexistent `sessions.log`). New crons read actual 93MB session data. Knowledge compounding is ACTIVE, not disabled.

## Deferred Items (Require Taylor Approval or Config Restart)
1. **Edge activation crons:** Design calls for 2x daily crons (8am, 8pm) to activate Edge for market scanning during Phase 0. Not yet created. Edge currently has no activation mechanism. **CREATE THESE.**
2. **Grind heartbeat tightening:** When revenue > $100/month, tighten from 60m to 30m.
3. **Cost tracking in intelligence pipeline:** Gap #15 — `agent-intelligence.py` doesn't track token costs. Enhancement needed.
4. **Multiple browser profiles:** Long-term fix for browser contention. One profile per business unit.
5. **Session file rotation:** Session archival cron exists but hasn't run yet. Monitor disk usage.

## Heartbeat Configuration Rationale
| Agent | Design Target | Deployed | Rationale |
|-------|--------------|----------|-----------|
| Jeff | 90m | 90m | Matches design. Low overhead portfolio management. |
| Grind | 30m | 60m (config) / 30m (HEARTBEAT.md title) | **Intentional cost-saving.** 60m in config saves ~50% vs 30m. HEARTBEAT.md says 30m as aspirational. Can tighten when revenue justifies cost. |
| Rush | 45m (Phase 3) | 120m | **Intentional.** Phase 1 PREP doesn't need 45m frequency. 120m saves ~63%. Will shorten as phases progress. |
| Edge | 60m | 0m (disabled) | **Intentional.** Phase 0 RESEARCH activated via cron, not heartbeat. No standing heartbeat until Phase 1 SANDBOX. |

## Lessons Learned
- Agents need clear missions and KPIs or they produce nothing
- Standing heartbeats on idle agents = pure waste
- Expert panel process (95+ score) ensures quality but slows velocity — use selectively
- Browser automation is fragile — CDP file input doesn't trigger React handlers
- Reddit auto-removes Gumroad links — "link in profile" approach required
- Gumroad ProseMirror editor needs clipboard API + Cmd+V for formatting

---
_Updated: 2026-02-11_

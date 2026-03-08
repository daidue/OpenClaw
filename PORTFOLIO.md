# PORTFOLIO.md — Taylor & Jeff's Portfolio

## Portfolio Thesis
> Build digital income streams that generate increasing passive revenue with minimal human intervention. Each business must have a path to $1,000+/month within 6 months and operate autonomously at 90%+ without Taylor's daily involvement.

---

## Business Units

| Business | Owner/Operator | Agent ID | Phase | Revenue | Health |
|----------|---------------|----------|-------|---------|--------|
| **Notion Templates** | Grind | `commerce` | ⏸️ PAUSED (Taylor 2026-02-14) | $0/mo | ⚪ DORMANT |
| **TitleRun** | Rush | `titlerun` | ACTIVE — Week 2/6 Systems Phase | $0/mo | 🟢 BUILDING |
| **Polymarket Trading** | Edge | `polymarket` | ⏸️ PAUSED (Taylor 2026-02-14) | $0/mo | ⚪ DORMANT |

**Last weekly review:** 2026-03-08

## TitleRun Milestones (Week of Feb 15)
- ✅ DB migration deployed (44 tables, 96.7/100 expert panel, RLS, FK constraints)
- ✅ Trade analysis confirmed working end-to-end
- ✅ Landing page v3 built (95.8/100, 4 pillars, 3x email capture)
- ✅ Cloudflare Pages migration complete (app.titlerun.co, $0/mo)
- ✅ Frontend tests: 318/319 passing + new test coverage
- ✅ Live Draft Companion spec + foundation + build (95.9/100)
- ✅ Redraft wiring to real endpoints (commit `8f448ec`)
- ✅ **Evening sprint (Feb 15): 14 features built in 45 min**
  - Settings (95.9), News (95.8), Leaguemates (96.5), Player Detail (97.2)
  - Trophy Case, Punishment, Onboarding, Trade Fairness Polish
  - Hall of Shame (96.8), Dashboard (98), Report Card, Teams, Draft Companion, Tests
- ✅ **3 audit cycles + 22-item master fix list → 87/100 overall health**
- ✅ Error boundaries, AI Chat, Sleeper ID audit, security hardening
- ✅ Multi-league context, SP History, cross-feature CTAs
- 🔜 Landing page deploy to titlerun.co (pending Taylor: Cloudflare Pages)
- 🔜 MailerLite integration (pending Taylor signup)
- 🔜 Railway: Redis + COLD_START_THRESHOLD + ANTHROPIC_API_KEY (pending Taylor)
- 🔜 Beta user recruitment
- 🔜 Production QA on real devices

## Phased Launch Schedule

**UPDATED 2026-03-08:** TitleRun-only focus until April 15 launch. Templates and Polymarket dormant.

| Phase | Period | TitleRun | Notes |
|-------|--------|----------|-------|
| **Systems** | Week 1-2 (Mar 1-14) | 🟢 Agent orchestration, monitoring, quality gates | In progress |
| **Product** | Week 3-4 (Mar 15-28) | 🟢 Zero bugs, polished UX, mobile QA | Next |
| **Distribution** | Week 5-6 (Mar 29-Apr 11) | 🟢 Audience building, launch assets | Planned |
| **Launch** | Week 7 (Apr 12-18) | 🚀 April 15 target | 33 days |

**Post-launch:** Evaluate Templates/Polymarket reactivation based on TitleRun traction.

## Budget

**Daily target: $20-37/day ($585-1,110/month)**
**UPDATED 2026-03-08:** Throttle to Sonnet (Day 45 kill switch Mar 28). Opus only when Taylor requests or critical decisions.

| Agent | Fixed (heartbeats) | Variable (sub-agents) | Total | Status |
|-------|-------------------|----------------------|-------|--------|
| Jeff | $1-2 (Sonnet) | $0-1 | $1-3 | 🟢 ACTIVE |
| Grind | — | — | $0 | ⚪ DORMANT |
| Rush | $0.50-1 (Sonnet) | $15-25 (Sonnet default) | $15.50-26 | 🟢 ACTIVE |
| Edge | — | — | $0 | ⚪ DORMANT |
| Buffer (10%) | — | — | $1.50-3 | — |

**Break-even:** TitleRun launch (April 15) → $1,000+/month target by Oct 2026

## Cost Tracking (Updated Weekly)
| Week | Total Spend | Grind | Rush | Edge | Jeff | Revenue | ROI |
|------|------------|-------|------|------|------|---------|-----|
| W1 (Feb 8-15) | ~$800-1,500* | ~$100-150 | ~$600-1,000 | ~$50-75 | ~$50-75 | $0 | — |
| W2 (Feb 16-22) | ~$500-800** | $0 (paused) | ~$450-700 | $0 (paused) | ~$50-100 | $0 | — |
| W9 (Feb 22-Mar 1) | ~$400-600*** | $0 (paused) | ~$350-500 | $0 (paused) | ~$50-100 | $0 | — |
| W10 (Mar 1-8) | ~$500-800**** | $0 (paused) | ~$450-700 | $0 (paused) | ~$50-100 | $0 | — |

*W1 Estimate: 9,615 messages, 60+ sub-agents on Feb 14 alone, marathon Opus build session, frontend test fixes overnight, Cloudflare migration, landing page iterations, DB migration expert panel. Taylor approved high burn through March.

**W2 Estimate: 9,689 messages (per intelligence weekly report), 100% TitleRun focus, mobile UX overhaul, Smart Trade Finder, Live Draft Companion, redraft wiring. Lower than W1 due to more Sonnet usage, fewer marathon Opus sessions. Taylor approved.

_Source: `bash scripts/cost-tracker.sh daily` (run by Jeff each morning heartbeat)_
_Daily cost reports: `memory/daily/YYYY-MM-DD-costs.md`_
_Target: Token cost per revenue dollar < $5 by month 3_

### Revenue Tracking
- **Grind reports daily revenue** in standup to Jeff's inbox
- **Jeff updates this table weekly** (Sunday portfolio review)
- **Gumroad dashboard** is source of truth for template revenue
- **First dollar milestone** → immediately message Taylor 🎉

| Date | Source | Amount | Cumulative | Notes |
|------|--------|--------|-----------|-------|
| — | — | — | $0 | Awaiting first sale |

## Evaluation Runways & Hard Kill Criteria

### Templates (Grind) — REVENUE CLOCK STARTS 2026-02-11
| Checkpoint | Date | Gate | Fail Action |
|-----------|------|------|-------------|
| Week 1 | Feb 18 | ≥1 free download | Debug distribution |
| Week 2 | Feb 25 | ≥5 free downloads | Pivot channels |
| Day 30 | Mar 13 | ≥25 free downloads + ≥1 paid sale | **REASSESS: cut budget to 30% or kill** |
| Day 60 | Apr 12 | ≥$100 revenue cumulative | **KILL if $0 revenue** |
| Day 90 | May 12 | ≥$300/month run rate | **KILL if <$100/month** |

### TitleRun (Rush)
| Checkpoint | Date | Gate | Fail Action |
|-----------|------|------|-------------|
| Day 30 | Mar 13 | MVP deployed + landing page live | **Pause budget, reassess** |
| Day 60 | Apr 12 | ≥50 waitlist signups | Pivot growth strategy |
| Day 90 | May 12 | ≥10 waitlist signups | **KILL if <10** |

### Polymarket (Edge)
| Checkpoint | Date | Gate | Fail Action |
|-----------|------|------|-------------|
| Day 30 | Mar 13 | Backtesting complete, edge quantified | **KILL if no testable edge** |
| Day 60 | Apr 12 | ≥200 sandbox trades, ≥55% win rate | **KILL if <55%** |

### Portfolio-Level Kill Switch
- **If total spend exceeds $1,500 with $0 revenue by Day 45 (Mar 28):** Emergency review. Cut to Jeff + Grind only (Survival Mode).
- **Break-even target:** Revenue ≥ daily token cost by Day 90.

## Health Scoring
| Score | Definition | Action |
|-------|-----------|--------|
| 🟢 (80-100) | On track or ahead | Continue, consider budget increase |
| 🟡 (50-79) | Behind on some KPIs | Course correct with Owner/Operator |
| 🔴 (0-49) | Significantly behind | 2-week turnaround or kill |
| ⚫ Dead | No activity 1+ week | Kill, archive, redistribute budget |

## Survival Mode (Emergency)
If budget must be cut 50%+:
- Jeff + Grind only. $5/day max.
- Rush: PAUSED (reactivate during draft season July)
- Edge: PAUSED
- 90-min heartbeats for Jeff, 90-min for Grind

## Cross-Business Synergies
- Templates ↔ TitleRun: Both digital products. Shared GTM playbooks. Dynasty FF players may need Notion templates.
- TitleRun ↔ Polymarket: Both data-driven. Shared analytical frameworks.
- All three: Shared sub-agents (researcher, dev). Shared skills library.

---
_Last updated: 2026-02-22 (weekly review)_

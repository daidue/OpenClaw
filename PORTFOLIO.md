# PORTFOLIO.md — Taylor & Jeff's Portfolio

## Portfolio Thesis
> Build digital income streams that generate increasing passive revenue with minimal human intervention. Each business must have a path to $1,000+/month within 6 months and operate autonomously at 90%+ without Taylor's daily involvement.

---

## Business Units

| Business | Owner/Operator | Agent ID | Phase | Revenue | Health |
|----------|---------------|----------|-------|---------|--------|
| **Notion Templates** | Grind | `commerce` | ⏸️ PAUSED (Taylor 2026-02-14) | $0/mo | ⚪ DORMANT |
| **TitleRun** | Rush | `titlerun` | ACTIVE — ALL FOCUS | $0/mo | 🟢 EXCEPTIONAL |
| **Polymarket Trading** | Edge | `polymarket` | ⏸️ PAUSED (Taylor 2026-02-14) | $0/mo | ⚪ DORMANT |

## TitleRun Milestones (Week of Feb 15)
- ✅ DB migration deployed (44 tables, 96.7/100 expert panel, RLS, FK constraints)
- ✅ Trade analysis confirmed working end-to-end
- ✅ Landing page v3 built (95.8/100, 4 pillars, 3x email capture)
- ✅ Cloudflare Pages migration complete (app.titlerun.co, $0/mo)
- ✅ Frontend tests: 318/319 passing
- ✅ Live Draft Companion spec: 95.9/100
- 🔜 Landing page deploy to titlerun.co (pending Cloudflare project setup)
- 🔜 MailerLite integration (pending Taylor signup)
- 🔜 Redraft wiring to real endpoints (March deadline)
- 🔜 Live Draft Companion build (parallel, April target)

## Phased Launch Schedule

| Phase | Period | Templates | TitleRun | Polymarket |
|-------|--------|-----------|----------|------------|
| **1** | Now - Day 30 | 🟢 FULL (60%) | 🟡 PREP (25%) | 🔵 RESEARCH (10%) |
| **2** | Day 31-60 | 🟢 FULL (45%) | 🟢 FULL (40%) | 🔵 SANDBOX (10%) |
| **3** | Day 61-90 | 🟢 FULL (35%) | 🟢 FULL (35%) | 🟡 LIVE? (20%) |

**Phase gates:**
- Rush → FULL: Templates have 25+ free downloads AND MVP deployed
- Edge → SANDBOX: Backtesting shows 58%+ win rate over 200+ simulated trades
- Edge → LIVE: Sandbox shows 58%+ over 200 sandbox trades

## Budget

**Daily target: $20-37/day ($585-1,110/month)**

| Agent | Fixed (heartbeats) | Variable (sub-agents) | Total |
|-------|-------------------|----------------------|-------|
| Jeff | $2-3 | $0-1 | $2-4 |
| Grind | $3-5 | $5-10 | $8-15 |
| Rush | $1-2 | $3-5 | $4-7 |
| Edge | $0.50-1 | $1-3 | $1.50-4 |
| Buffer (20%) | — | — | $3-6 |

**Break-even:** ~$600-1,200/month → 22-44 template sales at $27

## Cost Tracking (Updated Weekly)
| Week | Total Spend | Grind | Rush | Edge | Jeff | Revenue | ROI |
|------|------------|-------|------|------|------|---------|-----|
| W1 (Feb 8-15) | ~$800-1,500* | ~$100-150 | ~$600-1,000 | ~$50-75 | ~$50-75 | $0 | — |

*Estimate based on: 9,615 messages, 60+ sub-agents on Feb 14 alone, marathon 8pm-midnight Opus build session (Phases 1-4 of original valuation system = est. $700-1,000), frontend test fixes overnight, Cloudflare migration, landing page iterations, DB migration expert panel. Taylor approved high burn through March with daily visibility.

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
_Last updated: 2026-02-15_

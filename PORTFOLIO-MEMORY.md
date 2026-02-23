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

## TitleRun Redraft ROS Architecture (Shipped Feb 22, 2026)

**Purpose:** Rest-of-season (ROS) player valuations for 6 redraft formats: SF/1QB × PPR/Half/Std

**Data Foundation:**
- **Weekly stats table:** `player_weekly_stats` — 52,398 records (2015-2024 from nflverse)
- **Hybrid approach:** Historical data (nflverse CSV) + live current season (ESPN Fantasy API)
- **Granularity:** Weekly game logs (not season aggregates) — enables proper ROS projections

**Pipeline Steps:**
1. **Season calculation** - NFL calendar-aware (Feb 2026 = 2025 season)
2. **ESPN fetch** - Pre-populated via daily 4am cron (not inline)
3. **Data verification** - Confirm both nflverse + ESPN data exists
4. **Consensus building** - Average fantasy points per week × remaining weeks, normalized by position
5. **Final values** - Format-specific scoring (SF QB boost, PPR TE/WR boost), rank assignment

**Format Differentiation:**
- **SF formats:** QB value × 1.5 (scarcity premium)
- **PPR:** WR +5%, TE +15%
- **Half PPR:** TE +8%
- **Std:** RB +10%
- Each format uses its own fantasy point column (`fantasy_points_ppr/half/std`)

**Key Tables:**
- `player_weekly_stats` - Source data (weekly granularity)
- `redraft_ros_values` - Intermediate (consensus + source data)
- `titlerun_values` - Final output (6 formats, ranked)
- `players` - Master table (with `bye_week` column)
- `nfl_schedule` - Playoff strength calculations

**Quality Gates:**
- Minimum 8 games played for positional normalization
- Multiple adversarial audit cycles before ship
- Elite player verification (Josh Allen, Mahomes, CMC at top per format)
- Data validation (0 duplicates, 0 nulls, sequential ranks)

**Critical Anti-Patterns Avoided:**
- ❌ **Phantom schema:** Never build against non-existent DB tables
- ❌ **Season aggregates for ROS:** Need weekly granularity
- ❌ **Hard caps without separation:** 10,000 ceiling caused QB ranking ties
- ❌ **Small sample inflation:** Backup QBs with 2-3 games had inflated averages

**Multi-Source Blending (Ready, Not Active):**
- Architecture supports FantasyPros ECR + ESPN projections + nflverse actuals
- Currently single-source (nflverse) due to offseason (ESPN/FPros return 0 results)
- Will auto-activate when 2025 NFL season starts (September)

## What We've Tried That Didn't Work
- **Parallel business units at $0 revenue (Feb 8-14):** Grind (Templates) and Edge (Polymarket) consumed ~20-30% of token budget while generating $0. Taylor pivoted to 100% TitleRun focus on Feb 14. Lesson: focus beats diversification at this stage.
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
| 2026-02-14 | **PIVOT: All focus on TitleRun** | Taylor: "quit all Grind and Edge initiatives until further notice." Grind + Edge paused. 100% portfolio resources to TitleRun. |
| 2026-02-14 | **March deadline acceleration** | Trade fairness FULL for March (was basic April). Redraft late March (was May-June). "Greatest FF app in the world." |
| 2026-02-14 | TitleRun values ≠ dollars | Proprietary 0-10,000 scale. NEVER use $ signs. Critical brand differentiation. |
| 2026-02-13 | **Product vision rewrite** | Hook = competing with friends. Mutual benefit trade engine priority #1. 10-source data is SECRET. Simple/clean design. |
| 2026-02-11 | Portfolio company architecture | Each business gets autonomous Owner/Operator. Jeff as portfolio manager. |
| 2026-02-11 | Phased parallel launch | Templates 60% focus. TitleRun PREP. Polymarket RESEARCH. *(SUPERSEDED by 2026-02-14 pivot)* |
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

### Week of Feb 16-22, 2026
- **100% TitleRun focus paying off.** Rush shipped 6+ major features: Trade Builder Phase 2, Smart Trade Finder (behavioral economics IP), Live Draft Companion (10 features), Redraft backend wiring (expert audited to 95+), comprehensive mobile UX overhaul (iOS + Android). Code quality recovery: 82→99.5/100 on Feb 20 (steepest quality improvement in TitleRun history).
- **🚀 REDRAFT ROS FEATURE: 0% → 100% SHIPPED (Feb 22, 4.5 hours).** Discovered pipeline code written against "phantom schema" (non-existent DB tables). Built complete weekly stats infrastructure (52K records, 2015-2024), ESPN live stats service, consensus building, format-specific scoring (6 formats: SF/1QB × PPR/Half/Std), rank assignment. Fixed critical SF QB ranking bug (Bryce Young #2 → elite QBs at top). Quality gates: multiple adversarial audits, data validation, format differentiation verification. Estimated 1-2 days, delivered 4.5 hours. **Key lesson: Phantom schema anti-pattern is catastrophic** — always verify DB schema parity before building features.
- **Production outage teaches deployment discipline.** Untested code deployed Feb 22 9am caused API 502 errors. Rollback within 5 min. Lesson: ALWAYS test locally before production. Staged rollouts (backend first, then frontend). Never fix forward under pressure.
- **Mobile UX now best-in-class.** Comprehensive iOS + Android audit + fixes. Touch targets 48dp (meets both platforms), PWA support, safe area handling, ripple effects, haptic feedback, 16px inputs (prevents iOS auto-zoom), 100dvh (fixes iOS Safari address bar). Bundle optimized: 107KB main chunk gzipped.
- **Taylor actively testing, finding real bugs.** News ticker too fast → 75s. Desktop scroll broken → fixed. Leaguemates value discrepancy (14K points) → fixed by unifying valuationService across all pages. All issues resolved within minutes via sub-agents.
- **March 1 deadline: 7 days out.** Redraft ROS feature SHIPPED ✅. Live Draft Companion shipped ✅. Smart Trade Finder shipped ✅. Remaining: final polish, beta testing, bug bash. Timeline ACHIEVABLE.
- **Smart Trade Finder = differentiated IP.** 8-factor acceptance prediction model with behavioral economics (endowment effect 15% premium, loss aversion). Two-pass architecture (<500ms first pass, <2s deep analysis). Expert panel: "PhD-level algorithm design." 99.5/100 code review.
- **Switched to OpenAI Codex (Feb 22 8pm).** Claude Opus at 95% usage (resets Thursday). OpenAI at 100% quota. Model: `openai-codex/gpt-5.3-codex`. Sub-agents successfully running on OpenAI for final redraft fixes.
- **Grind + Edge remain paused.** $0 token spend on non-TitleRun work since Feb 14. Total portfolio focus on March deadline. Will reassess after launch.

### Week of Feb 8-15, 2026
- **Focus beats diversification at $0 revenue.** Running 3 businesses in parallel consumed $800-1,200 in tokens with $0 return. Taylor's Feb 14 pivot to 100% TitleRun was correct.
- **Opus marathon sessions deliver.** Feb 13-14 8pm-midnight: 10,500+ lines of original valuation system built (Phases 1-4), ~$700-1,000 in tokens, but code review scored 92/100. High-velocity, high-quality when focused.
- **Nested response envelope = #1 recurring bug.** `{ success, data: { preferences: {...} } }` + axios `.data` = `response.data.data.X`. Caused 4+ bugs this week. NOW documented in API-CONTRACT-2026-02-14.md with sendSuccess/sendError helpers.
- **Parallel sub-agent builds create integration debt.** Sprint B (4 sub-agents building onboarding + redraft simultaneously) → merge conflicts, stale IDs, column mismatches. Code review caught it, but slowed velocity.
- **Frontend test suites pay dividends.** 324 tests written = 4 separate QA sessions caught bugs before Taylor saw them. MSW 2.x infra was painful to set up (custom Babel + 3 polyfills) but now stable.
- **LEFT JOIN pattern for optional foreign keys.** Trade Builder user_id bug resolved when backend switched to LEFT JOIN for leagues table (some users have no connected leagues yet). Critical for MVP UX.

### Earlier Lessons (Feb 5-11)
- Agents need clear missions and KPIs or they produce nothing
- Standing heartbeats on idle agents = pure waste
- Expert panel process (95+ score) ensures quality but slows velocity — use selectively
- Browser automation is fragile — CDP file input doesn't trigger React handlers
- Reddit auto-removes Gumroad links — "link in profile" approach required
- Gumroad ProseMirror editor needs clipboard API + Cmd+V for formatting

---
_Updated: 2026-02-22 (weekly review)_

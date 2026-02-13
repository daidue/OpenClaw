# Token Optimization Plan — February 13, 2026

## Executive Summary

**Current spend:** ~$172.96 over 2 days (Thu-Fri) = **~$86/day average**
**Projected monthly:** ~$2,580/month at current rate
**Target:** Reduce 50-70% without sacrificing quality or speed
**Projected savings:** $45-60/day → **new daily cost: $25-40/day (~$750-1,200/month)**

---

## 1. What Is Cache Reading?

### How Anthropic Prompt Caching Works

When we send a message to Claude, the API checks if parts of the prompt (system prompt, workspace files, conversation history) were recently sent:

| Token Type | What It Is | Opus Price/MTok | Sonnet Price/MTok |
|-----------|-----------|----------------|-------------------|
| **Input** | Fresh, never-cached tokens | $15.00 | $3.00 |
| **Cache Write** | First time caching new context | $18.75 (+25%) | $3.75 (+25%) |
| **Cache Read** | Reusing cached context | $1.50 (-90%) | $0.30 (-90%) |
| **Output** | Model's response | $75.00 | $15.00 |

**Cache TTL:** ~5 minutes. If no message within 5 min, cache expires.

### Our Current Breakdown (144.8M total tokens)

| Type | Tokens | % of Total | Estimated Cost |
|------|--------|-----------|---------------|
| Cache Read | 126.5M | 87.4% | ~$70 (if all Opus) |
| Cache Write | 17.9M | 12.4% | ~$93 (if all Opus) |
| Output | 405.8K | 0.28% | ~$9 (if all Opus) |
| Input | 3.7K | 0.003% | ~$0.06 |

**Key insight:** Cache reading is GOOD — it's saving us 90% on repeated context. Our 100% cache hit rate means the caching system works perfectly. The problem isn't cache reads — **the problem is HOW MUCH context we're loading and HOW OFTEN.**

### Why 87.1K Tokens Per Message?

Every single interaction — including a simple "HEARTBEAT_OK" — loads:
- System prompt (~5K tokens)
- SOUL.md, AGENTS.md, USER.md, TOOLS.md, IDENTITY.md, HEARTBEAT.md (~15-20K tokens)
- MEMORY.md (~8K tokens)
- PORTFOLIO.md, PORTFOLIO-MEMORY.md (~5K tokens)
- Conversation history (~40-50K tokens)
- Skills metadata (~2-3K tokens)

**Total: ~80-90K tokens loaded for EVERY message, even "HEARTBEAT_OK"**

---

## 2. Where The Money Goes

### By Agent (2-day period)

| Agent | Model | Cost | % | Tokens | Heartbeat | Daily Cost Est. |
|-------|-------|------|---|--------|-----------|----------------|
| **main (Jeff)** | Opus | $100.06 | 57.9% | 87.8M | 90 min | ~$50/day |
| **titlerun (Rush)** | Opus | $54.45 | 31.5% | 42.7M | 30 min | ~$27/day |
| **commerce (Grind)** | Sonnet | $15.61 | 9.0% | 10.4M | 30 min | ~$8/day |
| **polymarket (Edge)** | Sonnet | $2.05 | 1.2% | 3.3M | disabled | ~$1/day |
| **dev** | Sonnet | $0.82 | 0.5% | 125.8K | disabled | ~$0.41/day |

**89.4% of cost is Opus.** Jeff + Rush = $154.51 out of $172.96.

### By Activity Type (estimated daily breakdown)

| Activity | Est. Daily Cost | % of Daily | Notes |
|----------|----------------|-----------|-------|
| **Rush heartbeats (Opus, 30m)** | ~$25-35 | 30-40% | 48 heartbeats/day, mostly HEARTBEAT_OK |
| **Jeff cron jobs (Opus, 26/day)** | ~$15-25 | 17-29% | intelligence, code reviews, briefs, etc. |
| **Jeff heartbeats (Opus, 90m)** | ~$5-8 | 6-9% | ~9 heartbeats/day |
| **Taylor interactive sessions (Opus)** | ~$10-20 | 12-23% | Varies — heavy Fri, light other days |
| **Grind heartbeats + crons (Sonnet)** | ~$8 | 9% | Good efficiency |
| **Sub-agent spawns** | ~$5-10 | 6-12% | 30 spawns over 2 days |
| **Edge scans (Sonnet)** | ~$1 | 1% | 2x daily, timing out |

### The #1 Cost Center: Rush on Opus at 30-min Heartbeats

Rush's heartbeat every 30 minutes loads ~95K tokens of context on Opus:
- Cache expired between heartbeats (TTL < 30 min) → **cache WRITE every time**
- 95K tokens * $18.75/MTok = **~$1.78 per heartbeat**
- 48 heartbeats/day * $1.78 = **~$85/day if running 24/7**

Rush was set to 24/7 active hours on 2/12 for overnight work. This needs to be dialed back.

### The #2 Cost Center: Jeff's 26 Daily Cron Jobs on Opus

All of Jeff's cron jobs run as isolated sessions on Opus. Each loads full context:

| Cron | Frequency | Runs/Day | Est. Cost/Run | Daily Cost |
|------|-----------|----------|--------------|-----------|
| intelligence:hourly | Every hour 8am-10pm | 15 | ~$1.14 | ~$17.10 |
| titlerun-review (3x) | 7am, 12pm, 5pm | 3 | ~$1.14 | ~$3.42 |
| morning-standup | 7am | 1 | ~$1.14 | ~$1.14 |
| evening-checkin | 8pm | 1 | ~$1.14 | ~$1.14 |
| intelligence:signals | Every 6h | 4 | ~$1.14 | ~$4.56 |
| intelligence:daily | 9pm | 1 | ~$1.14 | ~$1.14 |
| healthcheck:update-status | 8am | 1 | ~$1.14 | ~$1.14 |
| **Total** | | **26** | | **~$29.64** |

---

## 3. Optimization Plan (7 Interventions)

### Intervention 1: Rush Heartbeat 30m → 90m ⭐ HIGHEST IMPACT
**Savings: ~$20-30/day ($600-900/month)**

**Current:** Rush checks inbox every 30 min on Opus. 95% of the time = HEARTBEAT_OK.
**Proposed:** 90-min heartbeat (same as Jeff). Rush still responds instantly to inbox tasks.
**Why safe:** Rush is task-driven. He works when tasks appear in his inbox. The heartbeat just checks for tasks — at 90m he'll still pick up work within 90 min. For urgent tasks, we use `sessions_send` which wakes him immediately.

**Also:** Revert Rush active hours from 24/7 back to 6am-midnight. Overnight work was a one-time sprint, not ongoing.

### Intervention 2: Move Crons from Opus to Sonnet ⭐ HIGH IMPACT
**Savings: ~$23/day ($690/month)**

**Current:** All Jeff's crons run on Opus because Jeff's default model is Opus.
**Proposed:** Add `"model": "anthropic/claude-sonnet-4-5"` to each cron payload.

These tasks DON'T need Opus:
- `intelligence:hourly` — runs a Python script, reads output
- `intelligence:signals` — runs a Python script, reads output
- `intelligence:daily` — runs a Python script, reads output
- `healthcheck:update-status` — checks `openclaw update status`
- `titlerun-review-morning/midday/afternoon` — could be Sonnet (code review doesn't need Opus reasoning)
- `morning-standup` / `evening-checkin` — reads files, formats brief (Sonnet capable)
- `browser-cleanup`, `session-archival` — maintenance scripts

**Exception:** `weekly-squad-review` already specifies Opus explicitly — keep it (strategic).

### Intervention 3: Reduce intelligence:hourly → Every 3 Hours
**Savings: ~$8-12/day ($240-360/month)**

**Current:** Runs every hour 8am-10pm = 15 times/day.
**Proposed:** Every 3 hours = 5 times/day.
**Why safe:** Most hourly runs report "nothing notable." The daily summary at 9pm catches everything important. 3-hour cadence still catches anomalies same-day.

### Intervention 4: Code Review 3x/day → 1x/day
**Savings: ~$2-3/day ($60-90/month)**

**Current:** 3 code reviews per day (7am, 12pm, 5pm), each running 10-expert panel simulation on Opus.
**Proposed:** 1x at 5pm (end of Rush's work day). Rush fixes issues in real-time anyway.
**Why safe:** Rush already reviews his own code. The independent review catches things he missed — once daily is sufficient for that safety net.

### Intervention 5: Context Size Reduction
**Savings: ~$5-10/day ($150-300/month)**

**Current:** MEMORY.md is 200+ lines, loaded every message.
**Proposed:**
- Trim MEMORY.md to 50-75 lines (essentials only). Move details to `memory/` subdirectory files.
- Use `memory_search` for on-demand recall instead of loading everything upfront.
- Remove stale sections (completed projects, old decisions).
- Audit AGENTS.md — remove redundant sections loaded via other files.
- Consider splitting HEARTBEAT.md into "quick check" (heartbeat) vs "full duties" (searched on demand).

### Intervention 6: Fix Edge Scan Timeouts
**Savings: ~$1-2/day ($30-60/month)**

**Current:** Both edge-morning-scan and edge-evening-scan timeout at 180s, wasting the full context load.
**Proposed:** Either increase timeout to 300s or simplify the scan prompt to be achievable within 180s. If Edge can't find weather markets (per the CLOB API issue), reduce to 1x/day until markets return.

### Intervention 7: Grind Heartbeat 30m → 45m
**Savings: ~$2-3/day ($60-90/month)**

**Current:** Grind on Sonnet, 30-min heartbeats.
**Proposed:** 45m heartbeats. Grind's work is cron-driven (Reddit sales loop 3x/day, community outreach 3x/week). The heartbeat mostly checks inbox — 45m is sufficient.

---

## 4. Implementation Priority

| # | Intervention | Savings/Day | Effort | Risk |
|---|-------------|-------------|--------|------|
| 1 | Rush heartbeat 30m→90m + active hours | $20-30 | 1 min (config patch) | Low |
| 2 | Crons → Sonnet model | $23 | 15 min (update each cron) | Low |
| 3 | intelligence:hourly → 3h | $8-12 | 1 min (cron update) | Low |
| 4 | Code review 3x→1x | $2-3 | 2 min (disable 2 crons) | Low |
| 5 | Context size reduction | $5-10 | 1 hour (edit files) | Medium |
| 6 | Fix Edge timeouts | $1-2 | 5 min | Low |
| 7 | Grind heartbeat 30m→45m | $2-3 | 1 min (config patch) | Low |

**Total estimated savings: $61-83/day**
**New daily cost: ~$3-25/day**
**Monthly projection: $90-750/month** (down from ~$2,580)

---

## 5. What We DON'T Change (Quality Preservation)

| Preserved | Why |
|-----------|-----|
| Jeff (main) stays on Opus | Portfolio decisions need best reasoning |
| Rush stays on Opus for active work | Code architecture quality matters |
| Taylor interactions always Opus | Strategic conversations need depth |
| Expert panels keep running | Quality gate protects Taylor |
| Sub-agent spawning on-demand | Parallelism = speed |
| Full context for Taylor conversations | No degradation of interactive quality |
| Weekly squad review on Opus | Strategic assessment needs best model |

---

## 6. Monitoring

After implementing:
1. Track daily cost via OpenClaw dashboard for 7 days
2. Compare output quality — any degradation in cron job reports?
3. Monitor Rush response latency — does 90m heartbeat cause missed tasks?
4. Check Sonnet cron quality — are briefs/reviews still useful?
5. If daily cost > $40, investigate further
6. If daily cost < $15 with no quality issues, consider further optimization

---

## 7. Long-Term Structural Improvements

| Improvement | Savings | Timeline |
|-------------|---------|----------|
| OpenClaw lightweight heartbeat mode (if supported) | 80% on heartbeats | Needs OC feature |
| Per-cron model override (confirmed working) | Already in plan | Now |
| Conditional heartbeats (only wake if inbox non-empty) | 70% on heartbeats | Needs OC feature |
| Token budget alerts in gateway config | Prevention | 1 hour |
| MEMORY.md auto-compaction script | Ongoing savings | 2 hours |

---

*Plan authored by Jeff on Opus 4.6 with extended reasoning. February 13, 2026.*

# Token Optimization Plan — Expert Panel Review

## Panel Composition
10 experts with deep expertise in AI infrastructure cost optimization, LLM operations, and agent orchestration.

---

## Round 1

### Expert 1: Sarah Chen — Head of AI Infrastructure, Stripe
**Score: 88/100**

**Strengths:**
- ✅ Excellent root cause analysis — correctly identified Rush heartbeats + Opus crons as 89% of spend
- ✅ Cache mechanics explanation is accurate and accessible for a non-technical stakeholder
- ✅ Prioritized by impact — highest savings items first
- ✅ "What we don't change" section protects quality explicitly

**Issues:**
- ❌ Missing: no A/B quality comparison plan. How do you PROVE Sonnet crons produce equivalent output?
- ❌ No rollback triggers defined. What if Sonnet morning briefs miss critical info?
- ❌ Savings estimates are ranges, not precise. Should calculate with actual Anthropic pricing formulas.
- ⚠️ Intervention 5 (context reduction) is handwaved — "1 hour" for trimming MEMORY.md? That's a structural change affecting all agents. Needs specifics.

**Recommendations:**
1. Define quality metrics for each cron before switching to Sonnet (e.g., "morning brief must contain all 3 business units")
2. Add 48-hour parallel run: run both Opus and Sonnet versions, compare output
3. Calculate precise savings using actual token counts from session data, not estimates

---

### Expert 2: Marcus Rivera — VP Engineering, Scale AI
**Score: 85/100**

**Strengths:**
- ✅ Strong cost attribution methodology
- ✅ Practical implementation plan with low effort ratings
- ✅ Good identification of the heartbeat-cache-TTL interaction

**Issues:**
- ❌ Doesn't address the fundamental architecture question: should heartbeats exist at all for task-driven agents?
- ❌ Missing: token budget enforcement. Plan says "monitor" but doesn't set hard limits or circuit breakers.
- ❌ No analysis of sub-agent spawn efficiency — 30 spawns in 2 days, each loads full context. Are some spawning unnecessarily?
- ❌ The $3-25/day projection range is too wide. That's an 8x spread.

**Recommendations:**
1. Replace heartbeats with event-driven wakes where possible (acknowledged as OC limitation, but document the feature request)
2. Set hard daily budget caps per agent with automatic throttling
3. Analyze which of the 30 sub-agent spawns were necessary vs could have been inline
4. Narrow savings projection with Monte Carlo or at least best/worst/likely scenarios

---

### Expert 3: Dr. Priya Patel — Research Scientist, Google DeepMind (Cost-Efficient LLM Deployment)
**Score: 91/100**

**Strengths:**
- ✅ Technically accurate cache pricing analysis
- ✅ Good separation of "controllable recurring" vs "active work" costs
- ✅ Recognizes that cache reading is beneficial, not wasteful
- ✅ Preserves quality for strategic work (Taylor interactions, weekly reviews)

**Issues:**
- ❌ Missing: prompt compression techniques. Could reduce context tokens 30-50% with summarization layers.
- ⚠️ No mention of output token optimization — output is $75/MTok on Opus. Even small output reductions matter.
- ⚠️ Should analyze if some "Opus" tasks could use Opus for reasoning but Sonnet for formatting/output.

**Recommendations:**
1. Add prompt compression: instead of loading full MEMORY.md, load a 20-line summary + use memory_search for details
2. Enforce terse output for heartbeat/cron responses (HEARTBEAT_OK vs. multi-paragraph explanations)
3. Investigate hybrid approach: Opus reasoning → Sonnet formatting

---

### Expert 4: James Kim — Director of Platform, Anthropic (Former)
**Score: 92/100**

**Strengths:**
- ✅ Correct understanding of Anthropic's caching mechanics (TTL, write premium, read discount)
- ✅ Excellent identification that cache writes dominate cost (not reads)
- ✅ Practical and implementable interventions
- ✅ Good monitoring plan

**Issues:**
- ❌ Missing: cache warming strategy. Could keep cache warm with lightweight pings within TTL to convert writes to reads.
- ⚠️ Doesn't mention `max_tokens` parameter — setting lower max_tokens for cron responses could prevent runaway output.
- ⚠️ Should mention Anthropic's batch API for non-time-sensitive tasks (50% discount on all token types).

**Recommendations:**
1. Investigate cache warming: send a no-op message every 4 min to keep cache warm between heartbeats (saves 90% on context)
2. Set `max_tokens` to 500 for heartbeat responses, 2000 for cron responses
3. Evaluate Anthropic Batch API for intelligence pipeline, code reviews (non-real-time tasks)

---

### Expert 5: Elena Vasquez — CTO, Jasper AI
**Score: 86/100**

**Strengths:**
- ✅ Clear, actionable interventions
- ✅ Good risk assessment per intervention
- ✅ Preserves the right things (Taylor quality, strategic work)

**Issues:**
- ❌ No discussion of model selection per TASK TYPE within an agent. Rush could use Sonnet for HEARTBEAT_OK checks but Opus for actual coding.
- ❌ Missing: workspace file deduplication. Are files loaded that are already in other loaded files?
- ❌ No cost tracking automation — manual monitoring is unsustainable
- ❌ "Long-term structural improvements" section is vague — no timelines or ownership

**Recommendations:**
1. Implement per-task model routing: HEARTBEAT → Sonnet, coding → Opus, inbox check → Sonnet
2. Audit workspace file overlap (e.g., does AGENTS.md duplicate info in SOUL.md?)
3. Build automated daily cost report (cron job using session data)
4. Assign owners and deadlines to long-term improvements

---

### Expert 6: David Okonkwo — Head of MLOps, Notion
**Score: 89/100**

**Strengths:**
- ✅ Systematic approach — identify, quantify, prioritize, implement
- ✅ Good table formatting for executive consumption
- ✅ Accurate that Rush 30m on Opus is the #1 problem

**Issues:**
- ❌ Context size reduction plan is underspecified — which lines in MEMORY.md are safe to remove?
- ❌ No graduated rollout plan. Implementing 7 changes simultaneously is risky.
- ⚠️ Should mention that conversation history accumulation is a major context growth factor

**Recommendations:**
1. Create a MEMORY.md audit checklist: mark each section as "load always" vs "search on demand"
2. Implement changes in 3 waves: Wave 1 (config, hours), Wave 2 (cron models), Wave 3 (context trimming)
3. Add compaction frequency optimization — more frequent compaction = smaller conversation history

---

### Expert 7: Rachel Torres — Principal Engineer, OpenAI (Agent Infrastructure)
**Score: 87/100**

**Strengths:**
- ✅ Correctly identifies the heartbeat-as-polling antipattern
- ✅ Good awareness of OpenClaw's limitations (no event-driven activation)
- ✅ Practical given platform constraints

**Issues:**
- ❌ Doesn't quantify the cost of expert panels themselves — 10-expert simulations in-context are extremely token-heavy
- ❌ No mention of conversation pruning — old tool call results could be dropped sooner
- ❌ Missing: skill loading optimization. Skills loaded per-agent now, but are they all needed every message?

**Recommendations:**
1. Quantify expert panel costs (probably $2-5 per panel run) and consider if frequency is appropriate
2. Implement aggressive conversation pruning — drop tool results older than 5 turns
3. Lazy-load skills: only load skill content when the skill is triggered, not on every message
4. Consider whether code review panels (which simulate 10 experts) could be replaced with a simpler checklist

---

### Expert 8: Michael Zhang — VP Infrastructure, Replit
**Score: 90/100**

**Strengths:**
- ✅ Clean cost-per-activity breakdown
- ✅ Implementation table with effort ratings is actionable
- ✅ Good that "monitoring" section exists

**Issues:**
- ❌ No discussion of token counting vs. cost counting — should track both since pricing changes
- ⚠️ Should address the compound effect: if Rush codes less (fewer heartbeats), does output quality suffer?
- ⚠️ Missing: environment-specific optimization (e.g., different configs for dev vs prod)

**Recommendations:**
1. Track tokens AND cost separately — Anthropic may change pricing
2. Validate that Rush's coding output quality doesn't correlate with heartbeat frequency
3. Consider "sprint mode" config: when Rush is actively building, increase heartbeat; when idle, decrease

---

### Expert 9: Dr. Aisha Mohammed — Research Lead, Hugging Face (Efficient Inference)
**Score: 93/100**

**Strengths:**
- ✅ Thorough and well-structured analysis
- ✅ Correct that cache reads are efficient — the volume is the issue
- ✅ Good balance of aggressive savings with quality preservation
- ✅ Recognizes the Opus/Sonnet trade-off nuances

**Issues:**
- ⚠️ Could go further on prompt engineering optimization — shorter system prompts, more structured instructions
- ⚠️ No mention of response caching — if identical heartbeat checks produce identical responses, could cache at the application layer

**Recommendations:**
1. Benchmark system prompt length vs. agent performance — find the minimum viable prompt
2. Consider application-level response caching for repetitive checks
3. Great plan overall — implement quickly

---

### Expert 10: Tom Erikson — Dynasty FF League Commissioner + Software Architect (Domain Expert)
**Score: 84/100**

**Strengths:**
- ✅ The Rush optimization is spot-on — 30-min heartbeats for a development agent is absurd
- ✅ Good that Taylor's interactive experience is preserved
- ✅ Makes sense to keep Opus for actual coding, not for checking empty inboxes

**Issues:**
- ❌ As a user, I'd worry that 90-min Rush heartbeats means bugs sit for 90 minutes before detection
- ❌ What about the user experience of latency? If I push a task to Rush's inbox, how long until he starts?
- ❌ No SLA defined — what's the acceptable response time for each priority level?

**Recommendations:**
1. Define response SLAs: URGENT → immediate (sessions_send), HIGH → within 30 min, NORMAL → within 90 min
2. Use `sessions_send` for urgent tasks (bypasses heartbeat wait)
3. Add a "Rush is working" indicator so Taylor knows when Rush has picked up a task

---

## Round 1 Summary

### Average Score: 88.5/100

| Expert | Score | Key Gap |
|--------|-------|---------|
| Sarah Chen (Stripe) | 88 | No A/B quality comparison |
| Marcus Rivera (Scale AI) | 85 | No budget enforcement/circuit breakers |
| Dr. Priya Patel (DeepMind) | 91 | No prompt compression |
| James Kim (ex-Anthropic) | 92 | No cache warming strategy |
| Elena Vasquez (Jasper) | 86 | No per-task model routing |
| David Okonkwo (Notion) | 89 | No graduated rollout |
| Rachel Torres (OpenAI) | 87 | Expert panel cost not quantified |
| Michael Zhang (Replit) | 90 | No sprint mode concept |
| Dr. Aisha Mohammed (HF) | 93 | Minor — prompt engineering |
| Tom Erikson (Domain) | 84 | No SLA definitions |

### Top Issues to Fix for Round 2:
1. **Add quality validation plan** — A/B comparison before/after switching to Sonnet
2. **Add budget enforcement** — Hard daily caps per agent with automatic throttling  
3. **Add response SLAs** — Define acceptable latency per priority level
4. **Add graduated rollout** — 3 waves, not all-at-once
5. **Add cache warming analysis** — Could save 90% on heartbeat context costs
6. **Add per-task model routing** — Heartbeat checks on Sonnet, real work on Opus
7. **Define specific MEMORY.md trimming** — What stays, what goes
8. **Quantify expert panel costs** — Are 3x daily 10-expert panels worth it?
9. **Add max_tokens enforcement** — Cap output for routine responses
10. **Narrow savings estimate** — Best/likely/worst scenarios

---

## Round 2 Additions

### Addition A: Quality Validation Plan

**Phase 1 (48-hour parallel run):**
Before switching any cron to Sonnet, run both versions in parallel:
1. Keep existing Opus cron running
2. Add duplicate Sonnet cron with `_sonnet_test` suffix, delivery mode "none"
3. After 48 hours, compare outputs side-by-side
4. Quality criteria per cron:
   - Morning standup: All 3 business units mentioned? Actionable ask? ≤8 lines?
   - Code review: Same issues found? Scores within 5 points?
   - Intelligence:hourly: Same anomalies detected?
5. If Sonnet output matches ≥90% quality → approve switch
6. If significant gaps → keep Opus for that specific cron

### Addition B: Budget Enforcement & Circuit Breakers

**Hard limits per agent per day:**

| Agent | Daily Budget | Warning at | Hard Stop at |
|-------|-------------|-----------|-------------|
| main (Jeff) | $15 | $12 (80%) | $20 (133%) |
| titlerun (Rush) | $10 | $8 (80%) | $15 (150%) |
| commerce (Grind) | $5 | $4 (80%) | $8 (160%) |
| polymarket (Edge) | $2 | $1.50 (75%) | $3 (150%) |
| dev (sub-agents) | $5 | $4 (80%) | $8 (160%) |

**Implementation:** Daily morning cron checks previous day's spend via `session_status`. If over warning → flag in morning brief. If over hard stop → increase heartbeat intervals 50% for that agent until next day.

**Total daily portfolio budget: $37 hard cap** (matches existing AGENTS.md target of $20-37/day).

### Addition C: Response SLAs

| Priority | Method | Target Response Time |
|----------|--------|---------------------|
| **URGENT** | `sessions_send` (direct wake) | < 2 minutes |
| **HIGH** | Inbox + next heartbeat | < 90 minutes |
| **NORMAL** | Inbox + next heartbeat | < 3 hours |
| **LOW** | Inbox + daily check | < 24 hours |

**`sessions_send` bypasses heartbeat entirely** — agent wakes immediately regardless of heartbeat interval. This means 90-min heartbeats have ZERO impact on urgent task response time.

### Addition D: Graduated Rollout

**Wave 1 (Day 1 — Config changes, zero risk):**
- Rush heartbeat 30m → 90m
- Rush active hours 24/7 → 6am-midnight  
- Grind heartbeat 30m → 45m
- Edge scan reduced to 1x/day (evening only, with increased timeout)

**Wave 2 (Day 3 — Cron model switches, low risk):**
- All intelligence:* crons → Sonnet (with 48h parallel validation first)
- healthcheck crons → Sonnet
- Code review 3x→1x daily (keep 5pm)
- intelligence:hourly → every 3 hours

**Wave 3 (Day 7 — Context optimization, medium risk):**
- MEMORY.md trimming
- Workspace file audit and deduplication
- Conversation history pruning rules
- max_tokens enforcement on heartbeat/cron responses

**Rollback plan per wave:** If daily cost INCREASES or quality degrades, revert that wave's changes within 24 hours. Each wave has a 48-hour bake period before proceeding.

### Addition E: Cache Warming Analysis

**Concept:** Instead of letting cache expire between 30-min heartbeats (forcing expensive cache writes), send a lightweight "keep-alive" message every 4 minutes.

**Math for Rush (current 30-min heartbeat):**
- Without warming: 48 heartbeats/day * ~95K tokens * $18.75/MTok = **~$85/day in cache writes**
- With 4-min warming: 360 keep-alives/day * ~95K tokens * $1.50/MTok = **~$51/day in cache reads** + 1 cache write = $1.78

**Problem:** OpenClaw doesn't support no-op keep-alive messages. Each message triggers a full agent turn (reasoning, tool calls, output). The "warming" message would itself generate output tokens at $75/MTok.

**Verdict:** ❌ Not viable with current OpenClaw architecture. The cost of generating 360 responses/day would exceed the savings. **Feature request for OpenClaw: lightweight cache-warming ping that doesn't trigger agent turn.**

Better approach: Just reduce heartbeat frequency (Intervention 1) and use `sessions_send` for urgent wakes.

### Addition F: Per-Task Model Routing

**OpenClaw limitation:** Model is set per-agent, not per-message. Cannot dynamically route heartbeat → Sonnet and coding → Opus within the same agent.

**Workaround architecture:**
1. Rush's main agent stays on Opus (for coding quality)
2. Create a "rush-heartbeat" lightweight cron on Sonnet that checks Rush's inbox
3. If inbox has tasks → wake Rush via `sessions_send`
4. If inbox empty → HEARTBEAT_OK on Sonnet (cheap)
5. Disable Rush's built-in heartbeat entirely

**Cost comparison:**
- Current: 16 Opus heartbeats/day (90m interval, 6am-midnight) * $1.78 = ~$28/day
- Proposed: 16 Sonnet crons/day * $0.23 = ~$3.68/day + Opus only when working
- **Savings: ~$24/day** on heartbeats alone, plus Rush only burns Opus tokens when actually coding

**This is the single highest-ROI optimization.** But it requires a structural change (new cron + disable heartbeat).

### Addition G: MEMORY.md Trimming Specifics

**Current MEMORY.md: ~200 lines. Target: ~60 lines.**

| Section | Current | Action | Target |
|---------|---------|--------|--------|
| About Taylor | 15 lines | Keep (essential) | 15 lines |
| About Me (Jeff) | 8 lines | Keep | 8 lines |
| Our Partnership | 6 lines | Keep | 6 lines |
| Infrastructure | 15 lines | Trim to 5 essentials | 5 lines |
| Scheduled Jobs | 8 lines | Remove (in cron config) | 0 lines |
| Audience Building (Nate) | 8 lines | Remove (project dead) | 0 lines |
| Polymarket Scanner v2 | 7 lines | Move to Edge's memory | 0 lines |
| ClawHub Skills | 4 lines | Remove (completed) | 0 lines |
| Daily Operating Rhythm | 6 lines | Keep (essential) | 6 lines |
| Multi-Agent Squad | 12 lines | Trim (in AGENTS.md) | 0 lines |
| Key Decisions | 5 lines | Keep latest 3 only | 3 lines |
| Reddit Credentials | 4 lines | Move to Grind's memory | 0 lines |
| Active Projects (large) | 80+ lines | Move to per-project files | 10 lines (links only) |

**Result: ~200 lines → ~53 lines.** Saves ~5-8K tokens per message across ALL agents.

### Addition H: Expert Panel Cost Quantification

Each 10-expert panel simulation generates ~3,000-5,000 output tokens (10 experts * 300-500 words each).

**On Opus:** 5K output tokens * $75/MTok = $0.375 per panel + context load ~$1.14 = **~$1.50 per panel**

**Code review panels (currently 3x/day on Opus):** 3 * $1.50 = **$4.50/day = $135/month**

**On Sonnet:** 5K output * $15/MTok = $0.075 + context $0.23 = **~$0.30 per panel**

Switching to Sonnet + 1x/day: $0.30/day = **$9/month** (vs $135/month current)

### Addition I: max_tokens Enforcement

| Response Type | max_tokens | Rationale |
|--------------|-----------|-----------|
| Heartbeat (HEARTBEAT_OK) | 200 | 3 words needed |
| Intelligence cron | 500 | Brief summary |
| Morning/evening brief | 1,000 | 8-line format |
| Code review | 3,000 | Detailed but bounded |
| Sub-agent task | 16,000 | Full working space |
| Taylor conversation | 32,000 | No limit on quality |

**OpenClaw limitation check:** Need to verify if cron payload supports `max_tokens`. If not, add instruction in prompt: "Respond in under X words."

### Addition J: Refined Savings Estimates

| Scenario | Daily Cost | Monthly Cost | Savings vs Current |
|----------|-----------|-------------|-------------------|
| **Current** | ~$86 | ~$2,580 | — |
| **Conservative** (Wave 1 only) | ~$50 | ~$1,500 | 42% |
| **Likely** (Waves 1+2) | ~$25 | ~$750 | 71% |
| **Aggressive** (All waves + Addition F) | ~$12 | ~$360 | 86% |
| **Target** (matches AGENTS.md budget) | $20-37 | $600-1,110 | 57-77% |

**Recommended target: "Likely" scenario at ~$25/day ($750/month).** This matches the existing portfolio budget ceiling of $37/day with room for active work spikes.

---

## Round 2 Expert Scores

### Expert 1: Sarah Chen (Stripe) — **95/100** (+7)
"The quality validation plan with parallel runs is exactly what I wanted. Graduated rollout with 48-hour bakes is professional. Ship it."

### Expert 2: Marcus Rivera (Scale AI) — **94/100** (+9)
"Budget enforcement table with hard stops is solid. The per-task model routing workaround (Addition F) is clever. Only concern: monitoring relies on daily cron check — should be real-time if possible."

### Expert 3: Dr. Priya Patel (DeepMind) — **96/100** (+5)
"MEMORY.md trimming specifics are great — going from 200 to 53 lines with clear keep/remove decisions. Expert panel cost quantification was the missing piece. Excellent."

### Expert 4: James Kim (ex-Anthropic) — **96/100** (+4)
"Glad the cache warming analysis was done properly and honestly rejected as non-viable. The Addition F workaround (Sonnet heartbeat cron → Opus on demand) is the real optimization. This shows deep understanding of the API."

### Expert 5: Elena Vasquez (Jasper) — **93/100** (+7)
"Per-task model routing via the cron-based proxy pattern is elegant. max_tokens enforcement table is practical. One gap: no mention of cost allocation for Taylor's interactive sessions — those are unpredictable and could blow the budget."

### Expert 6: David Okonkwo (Notion) — **95/100** (+6)
"3-wave rollout with 48-hour bakes between waves is exactly right. MEMORY.md audit table is specific and actionable. Well done."

### Expert 7: Rachel Torres (OpenAI) — **94/100** (+7)
"Expert panel cost quantification ($135/month → $9/month with changes) was eye-opening. The prompt: 'Respond in under X words' as a max_tokens workaround is practical. Good honest assessment of platform limitations."

### Expert 8: Michael Zhang (Replit) — **95/100** (+5)
"Refined savings estimates with 4 scenarios remove the previous uncertainty. The 'Likely' target of $25/day aligning with the existing budget framework is elegant. Addition F is the killer optimization."

### Expert 9: Dr. Aisha Mohammed (HF) — **96/100** (+3)
"Already strong, now excellent. The graduated rollout and quality validation plan close the execution gap. This is a production-grade optimization plan."

### Expert 10: Tom Erikson (Domain) — **93/100** (+9)
"SLA table with `sessions_send` for urgent tasks completely addresses my latency concern. As a user, I'd feel confident that Rush responds just as fast to important tasks. The 90-min heartbeat only affects 'nothing to do' checks."

---

## Round 2 Summary

### Average Score: 94.7/100 (+6.2 from Round 1)

8 of 10 experts at 93+. Two remaining concerns:
1. **Marcus (94):** Wants real-time budget monitoring, not daily
2. **Elena (93):** Wants Taylor's interactive session cost addressed

### Fixes for Round 3:

**Fix 1: Real-time budget monitoring**
Add a `budget-check` cron that runs every 3 hours on Sonnet. Checks cumulative daily spend per agent via `session_status`. If any agent exceeds 80% of daily budget, sends alert to Jeff's inbox immediately. If exceeds 100%, sends Telegram alert to Taylor.

**Fix 2: Taylor interactive session budget**
Taylor's interactive sessions are EXEMPT from hard budget caps — Taylor is the human, his usage drives revenue decisions. However, track and report in evening brief. If interactive sessions exceed $30/day, note it as informational (not a limit).

---

## Round 3 Expert Re-scores

### Marcus Rivera — **96/100** (+2)
"3-hour budget check cron on Sonnet is a good compromise between real-time and cost. The immediate Telegram alert to Taylor at 100% is the right escalation path."

### Elena Vasquez — **95/100** (+2)
"Taylor exemption with tracking is the right call — you don't throttle the human. Informational reporting in evening brief is sufficient."

---

## Final Round 3 Summary

### Average Score: 95.3/100 ✅

| Expert | R1 | R2 | R3 |
|--------|-----|-----|-----|
| Sarah Chen (Stripe) | 88 | 95 | 95 |
| Marcus Rivera (Scale AI) | 85 | 94 | **96** |
| Dr. Priya Patel (DeepMind) | 91 | 96 | 96 |
| James Kim (ex-Anthropic) | 92 | 96 | 96 |
| Elena Vasquez (Jasper) | 86 | 93 | **95** |
| David Okonkwo (Notion) | 89 | 95 | 95 |
| Rachel Torres (OpenAI) | 87 | 94 | 94 |
| Michael Zhang (Replit) | 90 | 95 | 95 |
| Dr. Aisha Mohammed (HF) | 93 | 96 | 96 |
| Tom Erikson (Domain) | 84 | 93 | 93 |

**All 10 experts ≥ 93. Average 95.3. APPROVED TO SHIP.** ✅

---

## Final Implementation Checklist

### Wave 1 — Day 1 (Config Changes)
- [ ] `gateway config.patch`: Rush heartbeat 30m → 90m
- [ ] `gateway config.patch`: Rush active hours → 06:00-23:59
- [ ] `gateway config.patch`: Grind heartbeat 30m → 45m
- [ ] Disable edge-morning-scan cron (keep evening only)
- [ ] Increase edge-evening-scan timeout to 300s

### Wave 2 — Day 3 (Cron Model Switches)
- [ ] Add `"model": "anthropic/claude-sonnet-4-5"` to all intelligence:* crons
- [ ] Add model override to morning-standup, evening-checkin crons
- [ ] Add model override to healthcheck crons
- [ ] Disable titlerun-review-morning and titlerun-review-midday (keep 5pm only)
- [ ] Change intelligence:hourly from `0 8-22 * * *` to `0 8,11,14,17,20 * * *`
- [ ] Add budget-check cron (every 3h, Sonnet)

### Wave 3 — Day 7 (Context Optimization)
- [ ] Trim MEMORY.md from 200 → 53 lines
- [ ] Move project details to per-project files (memory_search accessible)
- [ ] Remove duplicate info between AGENTS.md and MEMORY.md
- [ ] Add "Respond concisely" instructions to all cron prompts
- [ ] Implement Addition F (Rush Sonnet heartbeat proxy) if Wave 1-2 savings insufficient

### Monitoring (Ongoing)
- [ ] Track daily cost in evening brief
- [ ] 48-hour bake between waves
- [ ] Quality spot-checks on Sonnet cron outputs
- [ ] Weekly cost trend in Sunday portfolio review

# Portfolio Company Architecture
## Autonomous Multi-Business Agent Operating System
### Version 1.0 — Initial Design for Expert Review

---

## 1. Executive Summary

This document defines the architecture for an AI-powered portfolio company structure where multiple independent businesses are each run by an autonomous **Owner/Operator agent**, overseen by a **Portfolio Manager agent (Jeff)**, who reports to the **human principal (Taylor)**. 

The model is inspired by Elon Musk's multi-company management approach: each company operates independently with its own leadership, culture, metrics, and P&L — while a central figure provides strategic direction, capital allocation, cross-pollination of ideas, and ruthless prioritization.

### The Portfolio (Current)

| Business Unit | Type | Stage | Revenue | Owner/Operator |
|---------------|------|-------|---------|----------------|
| **Notion Templates** ("Jeff the Notion Guy") | Digital Products / E-commerce | Pre-revenue, products live | $0/mo | **Grind** |
| **TitleRun** | SaaS (Dynasty Fantasy Football) | Code-complete, deployment pending | $0/mo | **Rush** (new) |
| **Polymarket Weather Bot** | Algorithmic Trading | Sandbox tested, 186/186 tests | $0/mo | **Edge** (new) |

### The Hierarchy

```
Taylor (Human Principal)
  └── Jeff (Portfolio Manager / Chief of Staff)
        ├── Grind (Owner/Operator: Notion Templates)
        │     ├── [spawns sub-agents as needed: research, dev, content]
        │     └── [autonomous: 6am-11pm EST]
        ├── Rush (Owner/Operator: TitleRun)
        │     ├── [spawns sub-agents as needed: dev, design, marketing]
        │     └── [autonomous: 8am-10pm EST]
        └── Edge (Owner/Operator: Polymarket)
              ├── [spawns sub-agents as needed: research, data, risk]
              └── [autonomous: 24/7 — markets never sleep]
```

---

## 2. Design Principles

### 2.1 The Musk Model (Adapted for AI Agents)

Elon Musk runs Tesla, SpaceX, X, Neuralink, The Boring Company, and xAI simultaneously. The principles that make this work:

1. **Each company has a president/CEO who runs day-to-day operations.** Elon sets direction but doesn't manage daily tasks. → Each business unit gets an Owner/Operator agent with full autonomy over execution.

2. **Cross-pollination of talent and ideas.** Tesla battery tech informs SpaceX. SpaceX manufacturing informs Tesla. → Shared knowledge base. Owner/Operators can read each other's research. Jeff facilitates cross-business insights.

3. **Capital allocation is centralized.** Elon decides which company gets more resources when. → Jeff allocates token budgets based on revenue potential, stage, and ROI.

4. **Ruthless prioritization.** Elon kills underperforming divisions quickly. → Jeff can pause/kill/restructure any business unit. Resurrection triggers defined.

5. **First-principles thinking at the top.** Elon challenges conventional approaches. → Jeff doesn't just relay Taylor's orders — he applies strategic judgment.

6. **Urgency and intensity at every level.** Every company operates like a startup. → Owner/Operators are obsessed with their KPIs. No idle heartbeats.

### 2.2 Core Architecture Principles

| # | Principle | Implementation |
|---|-----------|----------------|
| 1 | **Full Autonomy** | Owner/Operators make all tactical decisions. Only escalate strategic/financial decisions. |
| 2 | **Own Your P&L** | Each Owner/Operator tracks revenue, costs, growth rate independently. |
| 3 | **Spawn As Needed** | Owner/Operators spin up sub-agents for specialized work. No standing army of idle agents. |
| 4 | **Kill What Doesn't Work** | 30-day runway for new initiatives. No results → pause or kill. |
| 5 | **Self-Improve Continuously** | Agents actively scan X, Substack, competitors for techniques and insights. |
| 6 | **Token-Aware Operations** | Every agent tracks token usage. Budget overruns trigger automatic throttling. |
| 7 | **Structured Reporting** | Standardized daily/weekly reports flow up. Jeff synthesizes for Taylor. |
| 8 | **Shared Nothing Architecture** | Each business has its own workspace, memory, config. No cross-contamination. |
| 9 | **Human in the Loop for $$$** | Spending money, creating accounts, irreversible actions → Taylor approval. |
| 10 | **Write Everything Down** | If it's not in a file, it doesn't exist. Memory is sacred. |

---

## 3. Organizational Structure

### 3.1 Taylor (Human Principal)

**Role:** Founder & Chairman. Sets vision, approves budgets, makes final calls on strategy.

**Interface:** Telegram DM with Jeff. Receives:
- Morning brief (8:30am): overnight summary, key metrics, decisions needed
- Evening brief (8:00pm): day recap, wins/losses, tomorrow's priorities
- Real-time alerts: milestones (first sale!), blockers needing human action, spending approvals

**Decision Authority:**
- Approve/reject new business units
- Set overall budget constraints
- Make final calls on branding, pricing, major pivots
- Approve any spending > $0
- Resolve conflicts between business units

### 3.2 Jeff (Portfolio Manager)

**Role:** Chief of Staff / COO. The Elon analog — but accountable to Taylor.

**Responsibilities:**
1. **Capital Allocation:** Distribute daily token budget across business units based on priority and ROI
2. **Strategic Direction:** Set quarterly OKRs for each business unit
3. **Cross-Pollination:** Identify synergies between businesses (e.g., TitleRun insights informing Polymarket trading)
4. **Performance Management:** Weekly scorecards for each Owner/Operator. Kill underperformers.
5. **Taylor Communication:** Synthesize all business activity into clear, actionable briefs
6. **Blocker Resolution:** Unblock Owner/Operators when they're stuck on cross-unit or human-dependent issues
7. **New Ventures:** Evaluate and incubate new business ideas before assigning an Owner/Operator

**What Jeff Does NOT Do:**
- Write copy, code, or research (delegates to Owner/Operators who spawn specialists)
- Manage day-to-day operations of any business unit
- Make tactical decisions within a business unit (that's the Owner/Operator's job)

**Model:** Opus (strategic thinking requires it)
**Heartbeat:** 90 minutes during active hours (8am-10pm)
**Workspace:** `/Users/jeffdaniels/.openclaw/workspace`

### 3.3 Owner/Operator Agents

Each Owner/Operator is the **CEO of their business unit**. They have full autonomy to:
- Decide what to build, sell, and market
- Spawn sub-agents for specialized work (research, dev, content, analytics)
- Set their own daily priorities and work rhythm
- Allocate their token budget across sub-tasks
- Make tactical decisions without asking Jeff

They **must** escalate:
- Strategic pivots (changing the business model)
- Spending real money (ads, tools, subscriptions)
- Cross-business conflicts (needing another Owner/Operator's resources)
- Missed targets (>20% below weekly KPI)
- Human-dependent actions (account creation requiring CAPTCHAs, bank verification)

---

## 4. Business Unit Profiles

### 4.1 Notion Templates — Owner/Operator: Grind

**Mission:** Build "Jeff the Notion Guy" into a $5K/month template empire.

**Current State:**
- 2 products live (Full Toolkit $27, Lite $0+)
- Channels: Gumroad, Pinterest (6 pins), Reddit, template directories
- Revenue: $0
- Key blocker: First 10 free downloads to unlock Gumroad Discover

**Grind's Mandate:**
- Drive revenue from digital template sales
- Own all channels: Gumroad, Etsy, Pinterest, Reddit, template directories, email
- Build and launch new templates (Resume Template next)
- Monitor competitors and pricing
- Create all marketing content (pins, listings, posts)

**Sub-Agent Strategy:**
- Spawn **research sub-agent** for competitor monitoring, keyword research, market trends
- Spawn **dev sub-agent** for Notion API template building
- Spawn **content sub-agent** for high-volume pin/post creation (if volume demands)
- All sub-agents are on-demand, not standing. Spawn → task → kill.

**Model:** Sonnet (volume work) | Opus via sub-agent spawn for strategic decisions
**Heartbeat:** 30 min (6am-11pm EST)
**Token Budget:** 40% of daily allocation (highest priority — closest to revenue)
**Workspace:** `/Users/jeffdaniels/.openclaw/workspace-commerce`

**KPIs:**
| Metric | Target (Week) | Target (Month) |
|--------|--------------|----------------|
| Free downloads | 25 | 100 |
| Paid sales | 2 | 10 |
| Revenue | $54 | $270 |
| Pinterest pins posted | 10 | 40 |
| Reddit engagements | 15 | 60 |
| New templates launched | — | 1 |

### 4.2 TitleRun — Owner/Operator: Rush (New Agent)

**Mission:** Deploy TitleRun and acquire 100 paying users within 6 months.

**Current State:**
- Full SaaS codebase: React 18, Node.js/Express, PostgreSQL (Supabase), Redis (Upstash)
- Brand migration from DynastyFolio → TitleRun complete in code
- Deployment pending: Railway (backend), Vercel (frontend), DNS (titlerun.co)
- V2 sprint plan exists: gamification, social features, PWA
- GitHub repos: `daidue/titlerun-api`, `daidue/titlerun-app`, `daidue/titlerun.co`
- Marketing assets: landing page, Twitter content calendar, email sequences, Reddit post

**Rush's Mandate:**
- Deploy the MVP (Railway, Vercel, DNS)
- Build user acquisition funnel (landing page → waitlist → beta → paid)
- Execute V2 sprint plan (gamification, engagement features)
- Own dynasty FF community engagement (Reddit r/DynastyFF, Twitter/X, Discord)
- Implement Stripe billing
- Iterate based on user feedback

**Sub-Agent Strategy:**
- Spawn **dev sub-agent** for feature development, bug fixes, deployment
- Spawn **research sub-agent** for competitive analysis, user research, SEO
- Spawn **growth sub-agent** for community engagement, content creation
- Critical: dev sub-agent will be high-usage (active development phase)

**Model:** Sonnet (primary) | Opus for architecture decisions
**Heartbeat:** 45 min (8am-10pm EST)
**Token Budget:** 35% of daily allocation (highest growth potential, SaaS recurring revenue)
**Workspace:** `/Users/jeffdaniels/.openclaw/workspace-titlerun` (new)

**KPIs:**
| Metric | Target (Month 1) | Target (Month 3) |
|--------|------------------|------------------|
| MVP deployed | ✅ | — |
| Landing page live | ✅ | — |
| Waitlist signups | 50 | 500 |
| Beta users | — | 50 |
| Paid users | — | 10 |
| MRR | $0 | $100 |

### 4.3 Polymarket Weather Bot — Owner/Operator: Edge (New Agent)

**Mission:** Generate consistent 15%+ monthly returns on weather markets.

**Current State:**
- Complete bot: 15 modules, 3,466 lines, 186/186 tests passing
- Strategies: NegRisk, thin markets, volume spikes, price movements, resolution proximity
- NOAA integration for weather data
- Simmer SDK for sandbox paper trading
- 23 paper trades completed
- Currently PAUSED (per revenue deep think — deprioritized vs template sales)

**Edge's Mandate:**
- Resume sandbox testing with refined parameters
- Track and optimize win rate (target: 60%+)
- Graduate to live trading with $100-200 when sandbox proves profitable
- Monitor weather markets 24/7
- Expand to non-weather Polymarket categories if weather proves profitable
- Risk management: max position sizes, stop losses, daily P&L limits

**Sub-Agent Strategy:**
- Spawn **research sub-agent** for NOAA data analysis, market pattern detection
- Spawn **risk sub-agent** for position sizing, portfolio risk assessment
- Minimal sub-agent needs — mostly autonomous algorithmic execution
- 24/7 operation (markets don't sleep) but low heartbeat frequency when no active positions

**Model:** Sonnet (algorithmic decisions don't need Opus)
**Heartbeat:** 60 min during market activity, 120 min during low-activity
**Token Budget:** 15% of daily allocation (lowest priority until sandbox proves 60%+ win rate)
**Workspace:** `/Users/jeffdaniels/.openclaw/workspace-polymarket` (new)

**KPIs:**
| Metric | Target (Month 1) | Target (Month 3) |
|--------|------------------|------------------|
| Sandbox win rate | 60%+ | 65%+ |
| Sandbox trades | 100 | — |
| Live deployed | — | ✅ |
| Monthly return | — | 15%+ |
| Max drawdown | — | <20% |

---

## 5. Communication Architecture

### 5.1 Information Flow

```
                    ┌──────────┐
                    │  Taylor   │ (Telegram)
                    └─────┬────┘
                          │ Morning/Evening briefs
                          │ Real-time alerts
                          │ Decision requests
                    ┌─────▼────┐
                    │   Jeff    │ (Portfolio Manager)
                    └─────┬────┘
              ┌───────────┼───────────┐
              │           │           │
        ┌─────▼────┐ ┌───▼────┐ ┌────▼────┐
        │  Grind   │ │  Rush  │ │  Edge   │
        │ Templates│ │TitleRun│ │Polymarket│
        └──────────┘ └────────┘ └─────────┘
              │           │           │
        [sub-agents] [sub-agents] [sub-agents]
```

### 5.2 Reporting Cadence

| Report | From | To | Frequency | Format |
|--------|------|----|-----------|--------|
| **Daily Standup** | Each Owner/Operator | Jeff (inbox) | Daily by 9am | Structured: wins, blockers, today's plan |
| **Weekly Scorecard** | Each Owner/Operator | Jeff (inbox) | Friday 5pm | KPIs vs targets, variance analysis |
| **Monthly P&L** | Each Owner/Operator | Jeff (inbox) | 1st of month | Revenue, costs, token spend, ROI |
| **Morning Brief** | Jeff | Taylor (Telegram) | Daily 8:30am | Portfolio-wide summary, decisions needed |
| **Evening Brief** | Jeff | Taylor (Telegram) | Daily 8:00pm | Day recap, wins, tomorrow's priorities |
| **Weekly Portfolio Review** | Jeff | Taylor (Telegram) | Sunday evening | All business units, cross-cutting themes |
| **Alert: Milestone** | Jeff | Taylor (Telegram) | Immediate | First sale, target hit, deployment live |
| **Alert: Blocker** | Owner/Operator → Jeff | Taylor (Telegram) | Immediate | Human action required |
| **Cross-Pollination Memo** | Jeff | Relevant Owner/Operators | As needed | "TitleRun's user research suggests X for Templates" |

### 5.3 Inbox Protocol

Each Owner/Operator has an inbox file in their workspace. Messages use the standard format:

```markdown
## [TYPE] — [Title]
**From:** [sender]
**Priority:** [URGENT / HIGH / NORMAL]
**Date:** YYYY-MM-DD

### Body
[Content]

### Action Required
[Specific ask]
```

**Types:** TASK, DECISION, FYI, BLOCKER, MILESTONE, SCORECARD

**Response Protocol:**
- ACK within 1 heartbeat
- DONE when complete with result summary
- BLOCKED if stuck, with specific blocker description

### 5.4 Cross-Business Communication

Owner/Operators do NOT communicate directly with each other. All cross-business communication flows through Jeff. This prevents:
- Scope creep (one business hijacking another's resources)
- Conflicting priorities
- Token waste on inter-agent chatter

**Exception:** If Jeff explicitly creates a "collaboration channel" for a specific initiative (e.g., "TitleRun needs a Notion integration — Grind and Rush coordinate on this"), those agents can temporarily communicate directly via a shared inbox file.

---

## 6. Token Management

### 6.1 Budget Framework

**Total Daily Budget Target:** $15-20/day (~$450-600/month)

| Business Unit | % Allocation | Est. Daily | Rationale |
|---------------|-------------|------------|-----------|
| Jeff (Portfolio Manager) | 10% | $1.50-2 | Low overhead — delegates, doesn't do |
| Grind (Templates) | 40% | $6-8 | Closest to revenue. Highest execution volume. |
| Rush (TitleRun) | 35% | $5.25-7 | Active development phase. Heavy sub-agent spawning. |
| Edge (Polymarket) | 15% | $2.25-3 | Low-touch algorithmic. Ramps up when live. |

### 6.2 Token Efficiency Rules

1. **Sonnet by default.** Opus only for: strategic pivots, architecture decisions, expert panels, novel problem-solving.
2. **Sub-agents are ephemeral.** Spawn → focused task → deliver → kill. No standing sub-agents with heartbeats.
3. **Heartbeat efficiency targets:**
   - Idle heartbeat (nothing to do): < 200 tokens
   - Active heartbeat (processing work): < 3,000 tokens
   - Deep work session (building/researching): < 15,000 tokens
4. **Budget alerts:** Jeff monitors daily. If any business unit exceeds 150% of budget for 3 consecutive days → throttle or restructure.
5. **ROI tracking:** Token spend per dollar of revenue generated. Grind's goal: <$5 token cost per $1 revenue.

### 6.3 Dynamic Reallocation

Token budgets are not static. Jeff reallocates based on:
- **Revenue momentum:** Business generating sales gets more tokens
- **Phase transitions:** TitleRun deployment week gets temporary budget boost
- **Diminishing returns:** If Grind's extra tokens aren't converting, throttle back
- **Seasonal patterns:** TitleRun gets more during FF draft season (Aug-Sep)

---

## 7. Self-Improvement System

### 7.1 Intelligence Gathering

Each Owner/Operator runs a **continuous intelligence loop** as part of their heartbeat:

**Grind (Templates):**
- Monitor top Notion template sellers on Gumroad (weekly)
- Track r/Notion for trending template requests
- Follow Notion creators on X for trend signals
- Read Substack newsletters on digital product sales
- Track Etsy template bestsellers

**Rush (TitleRun):**
- Monitor r/DynastyFF and r/fantasyfootball for pain points
- Track competitor apps (Dynasty Daddy, Dynasty Nerds, KeepTradeCut)
- Follow fantasy football influencers on X
- Read SaaS growth newsletters (Lenny's Newsletter, First 1000 Users)
- Monitor ProductHunt for FF tool launches

**Edge (Polymarket):**
- Monitor Polymarket market creation (new weather markets)
- Track NOAA forecast accuracy vs market pricing
- Follow @Polymarket, @polyhowler on X for market trends
- Read prediction market research papers/blogs
- Monitor competing prediction platforms (Kalshi, Metaculus)

### 7.2 Learning Integration

Intelligence gathered gets processed into actionable improvements:

1. **Technique adoption:** "Competitor X uses tiered pricing with 3 tiers → test for our templates"
2. **Content inspiration:** "Trending Reddit post about invoice tracking → create pin addressing that angle"
3. **Product ideas:** "r/DynastyFF thread with 500 upvotes requesting feature X → add to TitleRun roadmap"
4. **Risk signals:** "NOAA accuracy dropping for 10-day forecasts → reduce position sizes on long-term weather markets"

Each Owner/Operator maintains a `LEARNINGS.md` file in their workspace documenting insights and how they were applied.

### 7.3 Skill Acquisition

When an Owner/Operator encounters a repeatable process, they convert it into a **skill** (saved to the shared skills directory):
- Pin design templates
- Gumroad listing optimization playbook
- Reddit engagement frameworks
- Weather market analysis methodology
- SaaS deployment checklist

Skills are shared across all business units. Grind's "listing optimization" skill could inform Rush's SaaS pricing page.

---

## 8. Autonomy Framework

### 8.1 Decision Authority Matrix

| Decision Type | Owner/Operator | Jeff | Taylor |
|---------------|:-:|:-:|:-:|
| Daily priorities | ✅ Decides | 📋 Reviews | — |
| Content creation | ✅ Decides | — | — |
| Channel strategy | ✅ Proposes | ✅ Approves | — |
| Pricing changes | ✅ Proposes | ✅ Approves | ✅ Final say |
| New product launch | ✅ Proposes | ✅ Reviews | ✅ Approves |
| Sub-agent spawning | ✅ Decides | 📋 Monitors budget | — |
| Spending money | ❌ | ✅ Proposes | ✅ Approves |
| Account creation | ✅ Decides (free) | ✅ Proposes (paid) | ✅ Approves (paid) |
| Strategic pivot | ✅ Proposes | ✅ Challenges | ✅ Decides |
| Kill a business unit | — | ✅ Proposes | ✅ Decides |
| New business unit | — | ✅ Proposes | ✅ Decides |
| Live trading (Polymarket) | ✅ Executes | ✅ Sets limits | ✅ Approves initial capital |
| Code deployment | ✅ Decides | 📋 Reviews | — |

### 8.2 Escalation Rules

**Escalate to Jeff when:**
- Blocked on another business unit's resources
- Token budget exceeded by 150%+
- Weekly KPI missed by >20%
- Strategic question outside business unit scope
- Cross-business insight worth sharing

**Escalate to Taylor when:**
- Any real money spending required
- Major strategic pivot proposed
- Human-dependent action (CAPTCHA, bank verification)
- Milestone achievement (celebrate!)
- Conflict between Jeff and Owner/Operator

### 8.3 Sub-Agent Governance

Owner/Operators can spawn sub-agents with these rules:

1. **Task-scoped:** Each sub-agent gets a specific task, not an open-ended role
2. **Budget-capped:** Sub-agent task must fit within daily budget allocation
3. **Time-limited:** Maximum 2-hour runtime per sub-agent session
4. **No cascading spawns:** Sub-agents cannot spawn their own sub-agents
5. **Shared services:** `researcher` and `dev` agent IDs can be spawned by any Owner/Operator
6. **Serial execution:** Only 1 sub-agent per Owner/Operator at a time (prevents browser conflicts)
7. **Results documented:** Sub-agent output saved to the Owner/Operator's workspace

---

## 9. Technical Implementation

### 9.1 OpenClaw Configuration

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-sonnet-4-5",
      "heartbeat": {
        "every": "60m",
        "activeHours": { "start": "08:00", "end": "22:00", "timezone": "America/New_York" }
      },
      "maxConcurrent": 6,
      "subagents": { "maxConcurrent": 10 }
    },
    "list": [
      {
        "id": "main",
        "name": "Jeff",
        "default": true,
        "model": "anthropic/claude-opus-4-6",
        "workspace": "~/.openclaw/workspace",
        "heartbeat": { "every": "90m" },
        "subagents": { "allowAgents": ["researcher", "dev", "commerce", "titlerun", "polymarket"] }
      },
      {
        "id": "commerce",
        "name": "Grind",
        "workspace": "~/.openclaw/workspace-commerce",
        "heartbeat": { "every": "30m", "activeHours": { "start": "06:00", "end": "23:00" } },
        "subagents": { "allowAgents": ["researcher", "dev"] }
      },
      {
        "id": "titlerun",
        "name": "Rush",
        "workspace": "~/.openclaw/workspace-titlerun",
        "heartbeat": { "every": "45m" },
        "subagents": { "allowAgents": ["researcher", "dev"] }
      },
      {
        "id": "polymarket",
        "name": "Edge",
        "workspace": "~/.openclaw/workspace-polymarket",
        "heartbeat": { "every": "60m", "activeHours": { "start": "06:00", "end": "23:59" } },
        "subagents": { "allowAgents": ["researcher", "dev"] }
      }
    ]
  }
}
```

### 9.2 Workspace Structure

Each business unit gets an isolated workspace:

```
~/.openclaw/
├── workspace/                          # Jeff (Portfolio Manager)
│   ├── SOUL.md                        # Jeff's identity
│   ├── HEARTBEAT.md                   # Portfolio management checklist
│   ├── AGENTS.md                      # Operating manual
│   ├── MEMORY.md                      # Long-term memory
│   ├── PORTFOLIO.md                   # Business unit overview & KPIs
│   ├── inboxes/
│   │   └── jeff-inbox.md              # Messages from Owner/Operators
│   ├── memory/                        # Daily notes
│   ├── scorecards/                    # Weekly/monthly business unit scorecards
│   └── skills/                        # Shared skill library
│
├── workspace-commerce/                 # Grind (Notion Templates)
│   ├── SOUL.md                        # Grind's identity & mission
│   ├── HEARTBEAT.md                   # Daily execution checklist
│   ├── MEMORY.md                      # Template business knowledge
│   ├── WORKQUEUE.md                   # Current task queue
│   ├── LEARNINGS.md                   # Intelligence gathered
│   ├── KPIs.md                        # Tracked metrics
│   ├── inboxes/
│   │   └── grind-inbox.md             # Messages from Jeff
│   ├── products/                      # Template files, assets
│   ├── channels/                      # Per-channel strategy & tracking
│   ├── memory/                        # Daily notes
│   └── reports/                       # Daily/weekly/monthly reports
│
├── workspace-titlerun/                 # Rush (TitleRun SaaS)
│   ├── SOUL.md
│   ├── HEARTBEAT.md
│   ├── MEMORY.md
│   ├── WORKQUEUE.md
│   ├── LEARNINGS.md
│   ├── KPIs.md
│   ├── inboxes/
│   │   └── rush-inbox.md
│   ├── codebase/                      # Or reference to ~/Documents/Claude Cowork Business/dpm-app/
│   ├── roadmap/                       # Feature roadmap, sprint plans
│   ├── users/                         # User research, feedback
│   ├── memory/
│   └── reports/
│
├── workspace-polymarket/               # Edge (Polymarket Trading)
│   ├── SOUL.md
│   ├── HEARTBEAT.md
│   ├── MEMORY.md
│   ├── WORKQUEUE.md
│   ├── LEARNINGS.md
│   ├── KPIs.md
│   ├── inboxes/
│   │   └── edge-inbox.md
│   ├── strategies/                    # Trading strategies, parameters
│   ├── trades/                        # Trade log, performance history
│   ├── models/                        # NOAA analysis, prediction models
│   ├── memory/
│   └── reports/
```

### 9.3 Shared Services

`researcher` and `dev` remain as agent IDs that can be spawned by any Owner/Operator, but they are **not standing agents with heartbeats**. They are ephemeral sub-agents:

- **researcher:** Deep research tasks. Spawned by Owner/Operators when they need market research, competitive analysis, SEO research, etc. No heartbeat. No workspace persistence. Results delivered to spawning Owner/Operator's workspace.
- **dev:** Coding tasks. Spawned for Notion API work, TitleRun feature development, bot parameter tuning, automation scripts. No heartbeat. No workspace persistence.

This eliminates idle token burn from Fury and Bolt's standing heartbeats while preserving their capabilities.

**Wait — important consideration:** If researcher and dev have no standing workspace, they lose context between spawns. Mitigation: each Owner/Operator passes relevant context in the spawn task description. The Owner/Operator's workspace IS the persistent memory for their domain.

---

## 10. Lifecycle Management

### 10.1 New Business Incubation

When Taylor or Jeff identifies a new business opportunity:

1. **Research Phase (1 week):** Jeff spawns a researcher sub-agent to evaluate the opportunity. Output: feasibility assessment with market size, competition, effort estimate, revenue potential.
2. **Decision Gate:** Jeff presents to Taylor with recommendation. Taylor approves or rejects.
3. **Incubation (2-4 weeks):** Jeff personally oversees initial setup. No dedicated Owner/Operator yet.
4. **Graduation:** Once the business has a clear path to revenue, Jeff creates a new Owner/Operator agent with full workspace, SOUL.md, HEARTBEAT.md, and assigns a token budget.

### 10.2 Business Unit Health Checks

Jeff evaluates each business unit weekly:

| Health Score | Definition | Action |
|-------------|------------|--------|
| 🟢 Green (80-100) | On track or ahead of KPIs | Continue, consider increasing budget |
| 🟡 Yellow (50-79) | Behind on some KPIs | Jeff reviews with Owner/Operator, course correct |
| 🔴 Red (0-49) | Significantly behind, no momentum | 2-week turnaround plan or kill |
| ⚫ Dead | No activity for 1+ week | Kill, archive workspace, document learnings |

### 10.3 Killing a Business Unit

When a business unit is killed:
1. Owner/Operator writes final report: what worked, what didn't, key learnings
2. Jeff archives the workspace (don't delete — may resurrect)
3. Token budget redistributed to surviving units
4. Jeff documents resurrection triggers in PORTFOLIO.md

### 10.4 Resurrection Triggers

| Business Unit | Resurrect When... |
|---------------|-------------------|
| Notion Templates | If killed: market research shows new high-demand template category |
| TitleRun | If paused: fantasy football season approaching (July), or competing app raises funding |
| Polymarket | If paused: weather market volume >$1M/week, or new market category emerges |

---

## 11. Jeff's Daily Operating Rhythm

### 11.1 Morning (8:00-8:30am)

1. Read all Owner/Operator daily standups from inboxes
2. Check overnight alerts (Edge runs 24/7)
3. Review token usage from previous day
4. Compile morning brief for Taylor
5. Send morning brief to Telegram
6. Reallocate token budgets if needed

### 11.2 Midday Check (12:00pm)

1. Quick inbox scan — any blockers?
2. Check if Owner/Operators are executing (have they written to memory today?)
3. Resolve any cross-business conflicts
4. 5 minutes max unless something needs attention

### 11.3 Evening (7:30-8:00pm)

1. Read all Owner/Operator activity for the day
2. Review daily metrics (Gumroad sales, TitleRun signups, Polymarket P&L)
3. Compile evening brief for Taylor
4. Send evening brief to Telegram
5. Set overnight priorities for Edge (24/7 operation)
6. Update PORTFOLIO.md if any strategic changes

### 11.4 Weekly (Sunday Evening)

1. Collect weekly scorecards from all Owner/Operators
2. Score each business unit (Green/Yellow/Red)
3. Write portfolio-wide weekly review
4. Send to Taylor with:
   - Top 3 wins across all businesses
   - Top 3 concerns
   - Decisions needed
   - Next week's priorities
5. Update MEMORY.md with key learnings
6. Adjust token budgets for next week

---

## 12. Risk Management

### 12.1 Risk Registry

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Token budget overrun | High | Medium | Daily monitoring, automatic throttling at 150% |
| Owner/Operator goes off-mission | Medium | High | Weekly scorecard review, clear KPIs, kill switch |
| Browser tab conflicts | High | Medium | Serial sub-agent execution, one browser user at a time |
| Taylor unavailable for approval | Medium | Medium | Owner/Operators continue autonomous work, queue decisions |
| API rate limits (Brave, Notion, Gumroad) | Medium | Low | Rate limiting in heartbeats, caching, graceful degradation |
| OpenClaw gateway instability | Low | High | Auto-restart, session resumption, heartbeat catch-up |
| Cross-contamination between business units | Low | Medium | Isolated workspaces, no direct inter-agent communication |
| Single model provider dependency | Medium | High | Monitor Anthropic status, have fallback plan |
| Polymarket losses > capital | Low | High | Hard stop-loss at 50% of capital, Edge auto-halts |

### 12.2 Catastrophe Protocol

If something goes very wrong (all agents down, workspace corruption, etc.):
1. Jeff sends immediate alert to Taylor via Telegram
2. All Owner/Operators halt autonomous operations
3. Jeff documents the failure in `INCIDENTS.md`
4. Recovery follows the most recent known-good state
5. Post-mortem within 24 hours

---

## 13. Success Metrics

### Portfolio-Level (Jeff Tracks)

| Metric | 30-Day Target | 90-Day Target | 6-Month Target |
|--------|--------------|---------------|----------------|
| Total portfolio revenue | $50 | $500 | $3,000/month |
| Token cost / revenue $ | <$10 per $1 | <$3 per $1 | <$1 per $1 |
| Active business units | 3 | 3+ | 4+ |
| Owner/Operator health score avg | 70+ | 80+ | 85+ |
| Taylor satisfaction | No complaints | "This is working" | "This is amazing" |

### Business-Level (Owner/Operators Track)

See Section 4 for per-business KPIs.

---

## 14. Implementation Plan

### Phase 1: Foundation (Days 1-3)
1. Create `workspace-titlerun/` and `workspace-polymarket/` directories with full file structure
2. Write SOUL.md, HEARTBEAT.md, AGENTS.md for Rush and Edge
3. Update Jeff's SOUL.md, HEARTBEAT.md, AGENTS.md for portfolio manager role
4. Update Grind's configs for the new structure
5. Remove Fury and Bolt as standing agents (become ephemeral sub-agents)
6. Update `openclaw.json` with new agent configuration
7. Deploy and verify all agents start correctly

### Phase 2: Activation (Days 4-7)
1. Grind resumes template operations with updated mandate
2. Rush begins TitleRun deployment sprint
3. Edge resumes Polymarket sandbox testing
4. Jeff runs first morning/evening briefs
5. Verify inbox communication flow works end-to-end

### Phase 3: Optimization (Days 8-14)
1. First weekly scorecard review
2. Adjust token budgets based on actual usage
3. Refine heartbeat intervals based on activity patterns
4. First cross-pollination memo if applicable

### Phase 4: Steady State (Day 15+)
1. All business units operating autonomously
2. Jeff in pure oversight mode
3. Token costs trending down as agents learn efficiency
4. Revenue trending up from at least 1 business unit

---

*This document is the initial design for expert review. Version 1.0 — 2026-02-11*

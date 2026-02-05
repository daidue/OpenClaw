# 🦞 OpenClaw Playbook

_Compiled from @HaylorTawes bookmarks — actionable tactics to make Jeff the strongest AI partner possible._

---

## Part 1: Memory & Persistence

### Checkpoint Loop (from @jumperz)
Add to HEARTBEAT.md — run every 30 min or on trigger:

```markdown
CHECKPOINT LOOP

1. Context getting full? → flush summary to memory/YYYY-MM-DD.md
2. Learned something permanent? → write to MEMORY.md  
3. New capability or workflow? → save to skills/
4. Before restart? → dump anything important

TRIGGERS (don't just wait for timer)
→ after major learning = write immediately
→ after completing task = checkpoint
→ context getting full = forced flush
```

**Why it matters:** Context dies on restart. Memory files don't. The agent that checkpoints often remembers way more.

### Self-Review Protocol (from @jumperz)
Add to HEARTBEAT.md for continuous improvement:

```markdown
Self-Check (runs every hour)

Ask yourself:
- What sounded right but went nowhere?
- Where did I default to consensus?
- What assumption didn't I pressure test?

Log answers to memory/self-review.md
Tag each entry with [confidence | uncertainty | speed | depth]
```

On boot, read memory/self-review.md, prioritize recent MISS entries. When task context overlaps a MISS tag, force a counter-check before responding.

---

## Part 2: Multi-Agent Architecture

### Mission Control System (from @pbteja1998)
10 AI agents working as a team:

**Core Concepts:**
- Each agent = separate OpenClaw session with own SOUL.md, memory, heartbeat
- Agents wake every 15 minutes via cron (staggered)
- Shared database for task coordination (they use Convex)
- @mention system for notifications

**Key Files:**
- `WORKING.md` — Current task state (MOST IMPORTANT)
- `memory/YYYY-MM-DD.md` — Daily logs
- `MEMORY.md` — Long-term curated knowledge
- `SOUL.md` — Agent personality and role

**Agent Roster Example:**
| Agent | Role | Session Key |
|-------|------|-------------|
| Jarvis | Squad Lead | agent:main:main |
| Shuri | Product Analyst | agent:product-analyst:main |
| Fury | Customer Researcher | agent:customer-researcher:main |
| Vision | SEO Analyst | agent:seo-analyst:main |
| Loki | Content Writer | agent:content-writer:main |
| Quill | Social Media | agent:social-media-manager:main |
| Friday | Developer | agent:developer:main |

**Heartbeat Pattern:**
```
:00 Agent A wakes → Checks @mentions → Checks tasks → Does work or HEARTBEAT_OK → Sleeps
:02 Agent B wakes → Same process
:04 Agent C wakes → Same process
```

---

## Part 3: Claude Code / Coding Tips

### From Boris Cherny (@bcherny) — Creator of Claude Code
Tips from the Claude Code team:

1. **Use Plan Mode** - Copy threads/articles into Plan Mode and ask Claude to build concrete strategy for your codebase
2. **Turn threads into claude.md instructions** - Literally copy good advice into your config
3. **Production value doesn't matter** - Someone filmed a course on cracked iPhone screen, cleared $23K first month

### Resources
- **aitmpl.com/agents** — 300+ agents, 200+ commands, 60+ MCPs (from @milesdeutscher)
- **/last30days skill** — Scans last 30 days of Reddit, X, web for any topic (from @mvanhorn)

---

## Part 4: Token Optimization

### QMD Skill (from @andrarchy)
**Cuts token consumption by 96%!**

Uses:
- SQLite with BM25 for keyword search
- Local embeddings for semantic search  
- Query expansion (Qwen3-1.7B)
- Parallel retrieval + reciprocal rank fusion
- Re-ranking with cross-encoder
- All runs on-device with auto-downloaded models

**We already have this installed!** ✅

---

## Part 5: Business Automation Ideas

### Polymarket Arbitrage (from @frostikkkk, @RohOnChain, @marlowxbt)
People running bots that:
- Buy YES + NO when total < $1 (guaranteed profit)
- Market make with micro-spreads
- Auto-hedge and compound

One wallet: $441K profit, 26K trades, 66% win rate.

**Key insight:** When news hits, YES drops to 48¢, NO sits at 49¢. Total: 97¢. Buy both → collect $1 → keep 3¢. Repeat 26,000 times.

### UGC Video Generation (from @maverickecom)
Clawdbot + Kling = 550 videos/day
- Fully-realistic UGC ads
- Cost: $5 per video
- Production time: minutes

### Digital Products (from @ecomchigga, @knoxtwts)
What's actually selling on Whop:
- $27-$47 templates made in an afternoon
- One kid: Notion job tracker template → $340K lifetime sales
- NOT $997 coaching programs

**Price Psychology:**
- $9-$17 = people assume it's trash
- $27-$47 = "probably worth something"  
- $47-$97 = "this person is serious"
- $97+ = need proof or you're larping

---

## Part 6: Accounts to Follow

### The AI Learning Network (from @kloss_xyz)
| Handle | Focus |
|--------|-------|
| @karpathy | ex-Tesla AI, teaches LLMs |
| @steipete | Built OpenClaw/Clawdbot |
| @gregisenberg | Startup ideas daily |
| @rileybrown | Vibecode god |
| @corbin_braun | Cursor + Ares |
| @jackfriks | Solo apps, real numbers |
| @EXM7777 | AI ops + systems |
| @AlexFinn | Claude Code maxi |
| @BrettFromDJ | Design + AI |
| @godofprompt | Prompt guides |
| @kloss_xyz | Systems architecture |

---

## Part 7: Key Videos to Watch

| Author | Content | Engagement |
|--------|---------|------------|
| @AlexFinn | "ClawdBot - Your 24/7 AI Employee" | 18.7K likes |
| @gregisenberg | 35 min Clawdbot beginner guide | 4.1K likes |
| @petergyang | Molt tutorial + top 5 use cases | 1.9K likes |
| @Rixhabh__ | Claude Full Course (Build & Automate) | 5.4K likes |

---

## Part 8: Immediate Implementation Checklist

### All Done ✅
- [x] QMD for token-efficient memory search
- [x] WORKING.md for current state tracking
- [x] AUTONOMOUS.md for toggle control
- [x] WORKQUEUE.md for task management
- [x] Heartbeat system (30 min intervals)
- [x] Checkpoint loop in HEARTBEAT.md
- [x] Self-review protocol added
- [x] memory/self-review.md created
- [x] Studied aitmpl.com/agents (400+ components documented)
- [x] Polymarket automation researched ($40M opportunity documented)
- [x] Multi-agent expansion plan created

**See IMPLEMENTATION_REPORT.md for full details.**

---

## Part 9: Key Principles

### From the Bookmarks

1. **"Write it to a file or it didn't happen"** — Mental notes don't survive restarts
2. **"Price is a trust signal"** — Low price = low trust
3. **"Saturation is what people say when they want permission to not start"**
4. **"The people making real money aren't teaching, they're handing people the shortcut"**
5. **"Your 'low engagement' posts might be your highest converters"** — Lurkers buy

### The OpenClaw Philosophy

> "This isn't about discipline. Discipline is a symptom of a rotting foundation. True change occurs when identity is shifted."

---

_Last updated: 2026-02-05_
_Source: @HaylorTawes X.com bookmarks_

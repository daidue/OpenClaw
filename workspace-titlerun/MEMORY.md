# MEMORY.md — TitleRun (Rush)

_Long-term institutional memory for TitleRun business unit. Daily notes in memory/ directory._

---

## Product Vision

**Hook:** Competing with friends, NOT data/AI
**Priority #1:** Mutual benefit trade engine
**Secret sauce:** 10-source Bayesian valuation (PROPRIETARY — never mention publicly)
**Design:** Simple/clean
**Killer feature:** Live Draft Companion

**Values:** NOT dollars — scale 0-10,000+, never use $ signs

## Technical Anti-Patterns

**All technical anti-patterns now live in repo CLAUDE.md files:**
- `~/Documents/Claude Cowork Business/titlerun-api/CLAUDE.md`
- `~/Documents/Claude Cowork Business/titlerun-app/CLAUDE.md`

Update those files, NOT this one, for code-level knowledge.

## Production Infrastructure

**API:**
- ✅ **PRIMARY:** https://api.titlerun.co (custom domain)
- ✅ **Railway:** https://dynastyfolio-api-production.up.railway.app
- ❌ **WRONG:** titlerun-api-production.up.railway.app (doesn't exist)

**Frontend:**
- ✅ **App:** https://app.titlerun.co (Cloudflare Pages)
- ✅ **Landing:** https://titlerun.co (pending deploy from daidue/titlerun-landing)

**Railway CLI:**
- Project: `selfless-peace`
- Environment: `production`
- Service: `titlerun-api`
- Link: `railway link --project selfless-peace --environment production --service titlerun-api`

## Launch Roadmap (April 15, 2026)

**Current Phase:** Week 2 — SYSTEMS (Build Elvis-level agent swarm)
**Phases:** SYSTEMS (Weeks 1-2) → PRODUCT (Weeks 3-4) → DISTRIBUTION (Weeks 5-6) → LAUNCH (Week 7)

**Week 2 Priorities:**
- Worktree isolation for parallel agents
- 3-AI code review pipeline
- Pattern learning capture
- Monitoring infrastructure

**Success Criteria:**
- 3+ agents run in parallel without conflicts
- Monitoring catches failures within 10 min
- Every PR gets 3 AI reviews
- Pattern learning captures 5+ insights

See: `LAUNCH-ROADMAP.md` for full details

## Key Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-01 | **Launch delayed to April 15** | Systems FIRST → Product SECOND → Distribution THIRD |
| 2026-03-01 | **Agent swarm = priority #1** | Build Elvis-level orchestration before launch |
| 2026-03-08 | **TitleRun-only focus** | No commerce, templates, or polymarket work until launch |

## Hard-Won Patterns

- **Sub-agent code always needs adversarial audit** — self-review bias produces inflated scores
- **Two analysis agents > one fix attempt** — competing hypotheses find bugs faster
- **Nested response envelope** — `response.data.data.X` pattern (#1 recurring frontend bug)
- **`.find()` without useMemo = new object every render** — caused mobile auto-refresh cascade
- **Request deduplication pattern** — `inflightRequests` Map prevents concurrent identical API calls
- **"Works in private, breaks in regular" = cache** — always check cache before debugging mobile bugs

## Core Features (Production)

**Deployed:**
- Trade Engine (mutual benefit algorithm)
- Trade Fairness scoring
- Report Cards
- Player Onboarding
- Redraft foundation
- Pick Value Engine v2 (UTH-calibrated)
- TEP production-based valuation

**Frontend Tests:** 318/319 (99.7%)

**🔴 MARCH DEADLINE:** Wire redraft to real endpoints. Live Draft Companion = April.

## Taylor's Credentials

- **Sleeper:** taytwotime (user_id: 359116496808476672)
- **Cloudflare DNS:** `titlerun.co` zone `c9fe3271361553b91d5015d53287fe43`
- **MailerLite:** Account `2116834`, form `37189961` (free tier)

---

_Created: 2026-03-15_
_Owner/Operator: Rush_

---
name: titlerun-dev
description: TitleRun dynasty FF SaaS development conventions, codebase patterns, deployment workflow, and data architecture. Use when building features, fixing bugs, writing scrapers, database migrations, or deploying to TitleRun (Railway backend, Vercel frontend). Don't use for business strategy, marketing, non-TitleRun coding tasks, or simple config changes. Requires gh CLI, psql, Node.js 18+. Mac/Linux only. Key capabilities: React 18 + TailwindCSS frontend patterns, Node.js/Express backend conventions, PostgreSQL schema management, Bayesian value engine architecture, scraper anti-detection standards, Railway/Vercel deployment automation.
compatibility: Requires gh CLI, psql, Node.js 18+. Mac/Linux only.
metadata:
  author: Jeff Daniels
  version: 1.0.0
  category: development
  last_verified: 2026-02-13
---

# TitleRun Development Skill

Codebase conventions, patterns, and workflows for TitleRun — the dynasty fantasy football portfolio manager.

## When to Use
- Building new features or services for TitleRun
- Writing scrapers for dynasty data sources
- Database migrations and schema changes
- Deploying to production (Railway backend, Vercel frontend)
- Writing tests for TitleRun code
- Implementing Bayesian value engine components

## When NOT to Use
- Business strategy or growth planning — that's Rush's SOUL.md domain
- Marketing, content creation, or community engagement — that's Grind's territory
- Non-TitleRun coding tasks (Polymarket bot, infrastructure scripts)
- Simple config changes that don't touch TitleRun code

## Related Skills
- `expert-panel` — Use for feature spec validation before build (target 95/100)
- `notion-api-builder` — If TitleRun ever integrates Notion (unlikely but reference patterns)
- `autonomous-governance` — Reference for deployment risk classification (Tier 2 for staging, Tier 3 for production)

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React 18 + TailwindCSS 3.3 | Latest |
| Backend | Node.js/Express | 18+ |
| Database | PostgreSQL (Railway) | 15+ |
| Cache | Redis (Upstash) | — |
| Auth | JWT | — |
| Job Queue | BullMQ | — |
| Charts | Recharts 2.10.3 | — |
| Font | Inter | — |
| Theme | Dark theme, brand green #22c55e | — |

## Repos & Deployment

| Repo | Platform | URL | Auto-deploy |
|------|----------|-----|-------------|
| `daidue/titlerun-api` | Railway | titlerun-api.railway.app | ✅ on push to main |
| `daidue/titlerun-app` | Vercel | app.titlerun.co | ✅ on push to main |
| `daidue/titlerun.co` | Vercel | titlerun.co | ✅ on push to main |

**Git workflow:** Work on feature branches → PR to main → auto-deploy. For urgent fixes, push directly to main.

**CLI tools:** `gh` (GitHub CLI, authenticated as `daidue`), `railway` (Railway CLI)

## Key Conventions

### Backend
- Routes: RESTful structure in `routes/` (auth, dashboard, leagues, players, rosters, trades, values, strategy, reportCards)
- Responses: `{ success: true, data: {...} }` or `{ success: false, error: 'msg' }`
- Services: `{domain}Service.js` pattern
- Auth: `authenticateToken` middleware for protected routes
- Rate limiting: Bottleneck singleton for Sleeper API (100ms min, 3 concurrent)

### Frontend
- Components: `components/{domain}/` (common, dashboard, trade, strategy, trophy, gamification, reportCard)
- Brand color: `#22c55e` (green), dark theme (`#0f172a` bg, `#1e293b` surface)
- Routing: Lazy-loaded pages

### Database
- Naming: `snake_case` tables/columns, UUIDs, `created_at`/`updated_at` timestamps
- Key tables: players, player_value_history, titlerun_values, source_values, draft_pick_values, teams
- Migrations: `YYYYMMDD_description.sql`

**Full patterns:** See `references/codebase-patterns.md`

## Value Engine & Scrapers

**Current sources:** KTC, FantasyCalc, DynastyProcess, Dynasty Daddy, FantasyPros (5)
**Target:** 10 sources (add DTC, FTC, UTH, DLF, AOD)

**Bayesian framework (MANDATORY):** Beta posteriors, correlation penalties, weighted median aggregation, credible intervals, ≥3% RMSE gate vs heuristic.

**Scraper standards:** Randomized timing (2-8s), realistic fingerprints, residential proxies for Cloudflare sites, session persistence, circuit breakers, rate limit compliance (≤1 req/s).

**Full details:** See `references/value-engine-architecture.md`

## Testing & Commits

**Testing:** Unit tests for all services, mock HTTP in CI, edge case coverage (zero-value, missing data, single-source), `npm test` before commit, 80%+ coverage target.

**Commits:** `[Sprint X] Description` format with bullet details.

## Reference Files
- `references/codebase-patterns.md` — Detailed backend/frontend patterns, DB schema, component structure
- `references/value-engine-architecture.md` — Bayesian framework, sources, correlations, scraper standards
- `references/research-docs.md` — Index of research documents (value engine panel, audits, specs)

## Trigger Phrases

✅ Should trigger:
- "build TitleRun feature"
- "write scraper for..."
- "database migration"
- "deploy to Railway"
- "fix TitleRun bug"
- "Bayesian value engine"
- "TitleRun codebase pattern"
- "anti-detection scraper"

❌ Should NOT trigger:
- "TitleRun growth strategy"
- "marketing plan"
- "community engagement"
- "Polymarket bot code"
- "simple config change"
- "non-TitleRun script"

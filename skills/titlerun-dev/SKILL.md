---
name: titlerun-dev
description: "TitleRun dynasty FF SaaS development conventions, codebase patterns, deployment workflow, and data architecture. Use when building features, fixing bugs, writing scrapers, or deploying to TitleRun. Don't use for business strategy, marketing, or non-TitleRun coding tasks."
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

## Backend Patterns

### Route Structure
```
routes/
├── auth.js          # POST /api/auth/login, /register, /verify
├── dashboard.js     # GET /api/dashboard/:userId
├── leagues.js       # GET /api/leagues/:userId
├── players.js       # GET /api/players/search, /:id
├── rosters.js       # GET /api/rosters/:teamId
├── trades.js        # POST /api/trades/evaluate, GET /api/trades/history
├── values.js        # GET /api/values/:playerId, /api/values/bulk
├── strategy.js      # GET /api/strategy/:teamId
├── reportCards.js   # [NEW] GET /api/report-cards/drafts/:id, /trades/:id
└── ...
```

### Response Format
Always use:
```javascript
res.json({ success: true, data: { ... } });
// or
res.status(400).json({ success: false, error: 'Description' });
```

### Service Naming
`{domain}Service.js` — e.g., `tradeService.js`, `reportCardService.js`, `sleeperDraftService.js`

### Auth Middleware
```javascript
const { authenticateToken } = require('../middleware/auth');
router.get('/api/resource', authenticateToken, handler);
```

### Rate Limiting (Sleeper API)
Use the existing Bottleneck singleton in `sleeperService.js`:
```javascript
const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 3 });
const result = await limiter.schedule(() => fetch(url));
```

## Frontend Patterns

### Component Structure
```
src/
├── components/
│   ├── common/         # Shared UI (buttons, modals, cards)
│   ├── dashboard/      # Dashboard-specific
│   ├── trade/          # Trade calculator
│   ├── strategy/       # Strategy engine
│   ├── trophy/         # Trophy Case / achievements
│   ├── gamification/   # XP, badges, streaks
│   └── reportCard/     # [NEW] Report Card components
├── pages/              # Route-level components (lazy-loaded)
├── services/           # API call wrappers
├── hooks/              # Custom React hooks
├── styles/
│   └── tokens.ts       # Design tokens (colors, spacing, typography)
└── utils/
```

### Design Tokens
```typescript
// Key colors
brand: '#22c55e'        // Green — primary actions, positive grades
background: '#0f172a'   // Dark navy — page background
surface: '#1e293b'      // Slate — cards, modals
text: '#f8fafc'         // Near-white — primary text
muted: '#94a3b8'        // Slate-400 — secondary text
danger: '#ef4444'       // Red — negative grades, alerts
warning: '#fbbf24'      // Amber — B-range grades (check WCAG contrast)
```

### Grade Color Map
```javascript
const GRADE_COLORS = {
  'A+': '#22c55e', 'A': '#22c55e', 'A-': '#4ade80',
  'B+': '#86efac', 'B': '#fbbf24', 'B-': '#fbbf24',
  'C+': '#f59e0b', 'C': '#f97316', 'C-': '#f97316',
  'D+': '#ef4444', 'D': '#ef4444', 'F': '#dc2626',
};
```

### Routing
```javascript
// Lazy-loaded pages
const ReportCard = lazy(() => import('./pages/ReportCard'));
// Route: /report-card, /report-card/drafts/:id, /report-card/trades/:id
```

## Database Conventions

### Naming
- Tables: `snake_case` plural (`player_values`, `draft_report_cards`)
- Columns: `snake_case` (`player_id`, `created_at`, `updated_at`)
- Primary keys: `id UUID DEFAULT gen_random_uuid()`
- Foreign keys: `{table}_id` with `ON DELETE CASCADE`
- Timestamps: Always include `created_at` and `updated_at`

### Key Existing Tables
| Table | Purpose |
|-------|---------|
| `players` | Player metadata (name, position, team, sleeper_id) |
| `player_value_history` | Historical values (fc_1qb, fc_sf, ktc_1qb, ktc_sf, dp_1qb, dp_sf) |
| `titlerun_values` | Current composite values (our unified engine output) |
| `source_values` | Per-source current values (6 sources) |
| `draft_pick_values` | Reference pick slot values (2025-2029, early/mid/late) |
| `teams` | User's synced Sleeper teams |
| `connected_accounts` | Sleeper connection info |

### Migrations
```bash
# Create migration file
touch migrations/YYYYMMDD_description.sql
# Apply via Railway console or deployment script
```

## Value Engine Architecture

### Current (5 sources)
KTC, FantasyCalc, DynastyProcess, Dynasty Daddy, FantasyPros

### Target (10 sources) — See `research/value-engine-data-panel.md`
**Core 7:** KTC, FantasyCalc, DynastyProcess, Dynasty Daddy, FantasyPros, DTC, FTC
**Stretch 3:** UTH, DLF, AOD

### Bayesian Framework (MANDATORY)
All value aggregation uses:
- **Weighting:** Beta posterior per source, position-specific priors
- **Correlation penalties:** `penalty = sqrt(1 - rho²)` from measured Pearson correlations
- **Aggregation:** Primary = Weighted Median, Secondary = Hodges-Lehmann
- **Uncertainty:** Bayesian Credible Intervals from posterior SD
- **Confidence:** Smooth functions (sqrt source count, linear agreement, exponential freshness decay)
- **GATE:** Bayesian must beat heuristic by ≥3% RMSE on backtest or revert

Reference: `research/value-engine-data-panel.md` (Appendix C has full computation example)

### Key Correlations
| Pair | rho | Penalty | Reason |
|------|-----|---------|--------|
| DP↔FP | 0.94 | 0.342 | DP derived from FP ECR |
| DTC↔FTC | 0.78 | 0.626 | Same owner, shared algo |
| DD↔KTC | 0.72 | 0.694 | DD aggregates KTC |
| UTH↔all | 0.32-0.45 | ~0.89 | Most independent source |

## Scraper Standards (Anti-Detection)

All web scrapers MUST follow these principles:
1. **Randomized timing:** 2-8 second delays between requests (not uniform distribution — use normal/beta)
2. **Realistic fingerprints:** Canvas, WebGL, fonts match claimed browser
3. **Residential proxies:** For Cloudflare-protected sites (DLF)
4. **Session persistence:** Reuse cookies, look like a returning user
5. **Mouse/scroll simulation:** For browser automation scrapers
6. **User-agent rotation:** From real browser distribution (not random strings)
7. **TLS fingerprint matching:** Must match claimed browser version
8. **Circuit breaker per source:** If blocked, back off automatically (exponential)
9. **Kill switch per source:** Instant disable if legal concerns arise
10. **Rate limit compliance:** Never exceed 1 request/second to any single source

## Testing Requirements

- All new services must have unit tests
- Scraper tests should mock HTTP responses (don't hit live APIs in CI)
- Grading algorithm tests should include edge cases: zero-value players, missing data, single-source scenarios
- Run `npm test` before every commit
- Target: 80%+ code coverage on new code

## Commit Message Format
```
[Sprint X] Short description

- Detail 1
- Detail 2
```
Example: `[Sprint 1] Add DTC browser automation scraper with anti-detection`

## Reference Docs
| Document | Location | Contents |
|----------|----------|---------|
| Value Engine Panel | `research/value-engine-data-panel.md` | 10-source architecture, Bayesian framework, 10-week sprint plan |
| Free Access Research | `research/value-engine-free-access.md` | API endpoints, auth details, rate limits |
| Report Card Spec | `research/report-card-feature-panel.md` | Draft/Trade grading, commentary, social cards |
| Codebase Audit | `research/report-card-codebase-audit.md` | Full frontend/backend audit, DB schema |
| Feature Audit | `research/feature-audit-expert-panel.md` | Existing 5-source engine architecture |

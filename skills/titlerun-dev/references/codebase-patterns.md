<!-- Summary: Detailed backend/frontend patterns, route structure, response formats, design tokens, and component organization.
     Read when: Writing actual code for TitleRun features, not for deciding architecture. -->

# TitleRun Codebase Patterns

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

## Commit Message Format
```
[Sprint X] Short description

- Detail 1
- Detail 2
```
Example: `[Sprint 1] Add DTC browser automation scraper with anti-detection`

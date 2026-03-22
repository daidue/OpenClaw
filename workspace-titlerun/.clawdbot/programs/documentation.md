# TitleRun Improvement Program: Documentation

## Mission
Create comprehensive, maintainable documentation for developers, contributors, and users through API documentation, component documentation, README improvements, inline code comments, and contribution guidelines.

## Scope

### Files You CAN Modify
- `titlerun-api/README.md` (API documentation)
- `titlerun-app/README.md` (frontend documentation)
- `titlerun-api/docs/**/*` (API endpoint docs)
- `titlerun-app/docs/**/*` (component/architecture docs)
- `CONTRIBUTING.md` (contribution guidelines)
- `ARCHITECTURE.md` (system design overview)
- `src/**/*.{js,jsx,ts,tsx}` (inline code comments)
- `titlerun-api/src/**/*.{js,ts}` (JSDoc comments)

### Files You CANNOT Modify
- Production code logic (unless improving clarity)
- Test files (unless adding test documentation)
- CI/CD configuration

## Metrics

### Primary Metrics (Must Maintain or Improve)
- **All tests pass**: 100% pass rate
- **Functionality**: No user-facing regressions
- **TypeScript**: Zero errors

### Documentation Targets
- **API endpoint coverage**: 100% (every endpoint documented)
- **Component coverage**: 80%+ (all public components)
- **README completeness**: All setup steps clear
- **Code comments**: 50%+ of complex functions
- **Contribution guide**: Complete (setup → PR)

### Secondary Metrics (Nice to Have)
- **Storybook**: Component playground
- **Swagger/OpenAPI**: Interactive API docs
- **Architecture diagrams**: Visual system overview
- **Video tutorials**: Setup + key features

## Constraints

### Hard Limits
- **No removing code comments** that explain "why"
- **No breaking examples** (all code samples must work)
- **No outdated docs** (sync with actual code)
- **Accuracy**: Docs must match implementation

### Soft Limits
- **Brevity**: Prefer concise over verbose
- **Examples**: Show don't tell
- **Screenshots**: Use when helpful

## Success Criteria

### Iteration Success
An iteration is successful if:
1. All tests pass (100% pass rate)
2. TypeScript compiles without errors
3. No broken links in docs
4. Examples run successfully

### Overall Success
The program succeeds when:
1. 100% API endpoint coverage
2. 80%+ component coverage
3. README has complete setup guide
4. CONTRIBUTING.md exists and is comprehensive
5. Complex functions have inline comments

## Strategies to Explore

### High-Impact, Low-Risk

**1. README Improvements**

`titlerun-api/README.md`:
```markdown
# TitleRun API

Dynasty fantasy football trade analyzer API.

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your values

# Run migrations
npm run migrate

# Start dev server
npm run dev
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/refresh` - Refresh token

### Trades
- `GET /api/trades` - List trades
- `POST /api/trades` - Analyze trade
- `GET /api/trades/:id` - Get trade details

(See `docs/api/` for full endpoint documentation)

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| DATABASE_URL | PostgreSQL connection string | Yes | - |
| JWT_SECRET | Secret for signing JWTs | Yes | - |
| PORT | Server port | No | 3001 |

## Architecture

- **Express** - Web framework
- **Prisma** - Database ORM
- **JWT** - Authentication
- **Jest** - Testing

## Testing

\`\`\`bash
npm test
\`\`\`

## Deployment

See `docs/DEPLOYMENT.md`
\`\`\`

**2. API Endpoint Documentation**

Create `docs/api/trades.md`:
```markdown
# Trades API

## `POST /api/trades`

Analyze a trade for fairness and mutual benefit.

**Request:**
\`\`\`json
{
  "team1Players": ["player123", "player456"],
  "team2Players": ["player789"],
  "league": "league123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "fairness": 0.85,
  "team1Value": 1250,
  "team2Value": 1200,
  "recommendation": "Slightly favors Team 1",
  "mutualBenefit": true
}
\`\`\`

**Errors:**
- `400` - Invalid player IDs
- `401` - Unauthorized
- `404` - League not found
- `500` - Server error

**Example:**
\`\`\`bash
curl -X POST https://api.titlerun.co/api/trades \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team1Players":["player123"],"team2Players":["player789"],"league":"league123"}'
\`\`\`
\`\`\`

**3. Component Documentation**

Add JSDoc to components:
```jsx
/**
 * Trade fairness confidence badge.
 * 
 * Displays a visual indicator of trade fairness with color-coded confidence levels:
 * - Green (0.8-1.0): Very fair
 * - Yellow (0.6-0.8): Somewhat fair
 * - Red (0-0.6): Unfair
 * 
 * @param {Object} props
 * @param {number} props.fairness - Fairness score (0-1)
 * @param {string} [props.size='md'] - Badge size ('sm', 'md', 'lg')
 * @returns {JSX.Element}
 * 
 * @example
 * <ConfidenceBadge fairness={0.85} size="lg" />
 */
export function ConfidenceBadge({ fairness, size = 'md' }) {
  // ...
}
```

**4. Inline Code Comments**

Add comments to complex logic:
```javascript
// Calculate weighted average of 10 valuation sources using Bayesian inference
// Weights determined by historical accuracy (UTH-calibrated)
function calculatePlayerValue(sources) {
  // Prior: Start with KTC as baseline (most stable source)
  let value = sources.ktc * 0.3;
  
  // Update with production-based sources (higher weight for recent performance)
  value += sources.espn * 0.15;
  value += sources.yahoo * 0.15;
  
  // Adjust for expert consensus (DLF, FantasyPros, DynastyNerds)
  value += (sources.dlf + sources.fantasyPros + sources.dynastyNerds) / 3 * 0.25;
  
  // Factor in platform rankings (Sleeper, CBS, NFL.com)
  value += (sources.sleeper + sources.cbs + sources.nfl) / 3 * 0.15;
  
  return Math.round(value);
}
```

### Medium-Impact, Medium-Risk

**5. CONTRIBUTING.md**

```markdown
# Contributing to TitleRun

## Getting Started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/titlerun-api.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature`

## Development Workflow

1. Make your changes
2. Add tests (required for new features)
3. Run tests: `npm test`
4. Commit: `git commit -m "feat: your feature"`
5. Push: `git push origin feature/your-feature`
6. Open a Pull Request

## Code Style

- ESLint + Prettier (auto-format on save)
- TypeScript strict mode
- Functional components (React hooks)
- Descriptive variable names

## Commit Message Format

Follow Conventional Commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Tests
- `refactor:` Code refactoring
- `chore:` Build/tooling

## Testing

- Unit tests for all new functions
- Integration tests for API endpoints
- E2E tests for critical flows
- Coverage target: 80%+

## Pull Request Checklist

- [ ] Tests pass (`npm test`)
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Linter passes (`npm run lint`)
- [ ] Documentation updated
- [ ] Self-reviewed code
- [ ] Added tests for new functionality
\`\`\`

**6. Architecture Documentation**

Create `ARCHITECTURE.md`:
```markdown
# TitleRun Architecture

## System Overview

TitleRun is a monorepo with:
- `titlerun-api` - Express/Prisma backend
- `titlerun-app` - React/Vite frontend

## Tech Stack

### Backend
- **Express** - Web framework
- **Prisma** - ORM (PostgreSQL)
- **JWT** - Authentication
- **Jest** - Testing

### Frontend
- **React** - UI library
- **Vite** - Build tool
- **Tailwind** - Styling
- **Zustand** - State management
- **React Query** - Data fetching

## Data Flow

1. User interacts with React components
2. Component calls API service (src/services/api.js)
3. API service makes HTTP request to backend
4. Backend validates, queries database, returns response
5. React Query caches response
6. Component re-renders with data

## Key Design Decisions

### 10-Source Valuation Model
We aggregate 10 valuation sources (KTC, DLF, ESPN, etc.) using Bayesian inference. This provides more stable, accurate valuations than any single source.

### Mutual Benefit Algorithm
Our trade analyzer finds trades where BOTH sides benefit. This is unique in the market and drives higher trade completion rates.

### UTH-Calibrated Values
We use Undroppable Touch Holdability (UTH) metric to calibrate production-based valuations. This ensures rookies and aging vets are valued appropriately.
\`\`\`

### High-Impact, High-Risk (Careful)

**7. Storybook (Component Playground)**
- Set up Storybook for component development
- Document all public components
- Interactive examples with controls

**8. Swagger/OpenAPI (Interactive API Docs)**
- Generate OpenAPI spec from code
- Host Swagger UI at `/api/docs`
- Auto-sync with implementation

### Avoid (Anti-Patterns)

- ❌ Outdated docs (sync with code changes)
- ❌ Copy-paste errors (test all examples)
- ❌ Over-documenting (obvious code doesn't need comments)
- ❌ Walls of text (use examples, diagrams, lists)
- ❌ Broken links (test all internal/external links)

## Baseline Metrics (Establish First)

Audit current documentation:
```bash
cd ~/Documents/Claude\ Cowork\ Business/titlerun-api

# Count documented API endpoints
grep -r "@api" src/routes/ | wc -l
grep "router\.(get|post|put|delete)" src/routes/ | wc -l

# Count JSDoc comments
grep -r "/\*\*" src/ | wc -l

# Check README completeness (manual review)
# - Setup instructions: Y/N
# - Environment variables: Y/N
# - API examples: Y/N
# - Architecture overview: Y/N

# Check for CONTRIBUTING.md
ls CONTRIBUTING.md

# Check for inline comments (manual review)
# - Complex functions commented: %
```

Record:
- API endpoints documented: ______ / ______
- Components with JSDoc: ______ / ______
- README completeness: ______ / 5 sections
- CONTRIBUTING.md exists: Y / N
- Code comment coverage: ______ %

## Evaluation Logic

```python
def evaluate_iteration(baseline, experiment):
    # Gate 1: Tests must pass
    if experiment.pass_rate < 1.0:
        return "DISCARD", "Tests failing"
    
    # Gate 2: No type errors
    if experiment.typescript_errors > 0:
        return "DISCARD", "TypeScript errors"
    
    # Gate 3: Examples must work
    if experiment.broken_examples > 0:
        return "DISCARD", "Broken code examples"
    
    # Optimization check
    if experiment.api_coverage > baseline.api_coverage:
        improvement = experiment.api_coverage - baseline.api_coverage
        return "KEEP", f"API coverage +{improvement:.1f}%"
    elif experiment.component_coverage > baseline.component_coverage:
        improvement = experiment.component_coverage - baseline.component_coverage
        return "KEEP", f"Component coverage +{improvement:.1f}%"
    else:
        return "DISCARD", "No improvement"
```

## Logging Format

Each iteration should log to `improvement-log.jsonl`:

```json
{
  "timestamp": "2026-03-23T02:00:00Z",
  "iteration": 1,
  "program": "documentation",
  "hypothesis": "Add JSDoc comments to all React components",
  "changes": ["src/components/TradeEngine.jsx", "src/components/ReportCard.jsx"],
  "metrics": {
    "api_coverage_pct": 85,
    "component_coverage_pct": 60,
    "readme_completeness": 4,
    "contributing_exists": true,
    "code_comment_pct": 45,
    "broken_examples": 0,
    "pass_rate": 1.0,
    "typescript_errors": 0
  },
  "baseline": {
    "api_coverage_pct": 60,
    "component_coverage_pct": 40,
    "readme_completeness": 2,
    "contributing_exists": false,
    "code_comment_pct": 20
  },
  "verdict": "KEEP",
  "reason": "API coverage +25%, component coverage +20%"
}
```

## Expected Output

At completion, generate a summary report:

```markdown
# Documentation Improvements — 2026-03-23

## Results
- Iterations: 32
- Duration: 2h 30m
- Improvements kept: 14
- Improvements discarded: 18

## Final Metrics
- API endpoint coverage: 100% (up from 60%) → **+40%** ✅
- Component coverage: 85% (up from 40%) → **+45%** ✅
- README completeness: 5/5 (up from 2/5) → **100%** ✅
- CONTRIBUTING.md: Created ✅
- Code comment coverage: 55% (up from 20%) → **+35%** ✅

## Key Changes

### API Documentation
1. Documented all 23 API endpoints in `docs/api/`
2. Added request/response examples
3. Documented error codes
4. Added cURL examples

### Component Documentation
1. Added JSDoc comments to 34 React components
2. Documented props with TypeScript types
3. Added usage examples to complex components
4. Created component diagram in `docs/COMPONENTS.md`

### README Improvements
1. Added complete setup guide (backend + frontend)
2. Documented all environment variables
3. Added architecture overview
4. Added deployment guide

### Contribution Guide
1. Created `CONTRIBUTING.md`
2. Documented development workflow
3. Added code style guide
4. Added commit message format
5. Added PR checklist

### Inline Comments
1. Commented 47 complex functions
2. Explained "why" not just "what"
3. Added examples for tricky logic

## Documentation Structure

\`\`\`
docs/
├── api/
│   ├── authentication.md
│   ├── trades.md
│   ├── players.md
│   └── leagues.md
├── ARCHITECTURE.md
├── COMPONENTS.md
├── DEPLOYMENT.md
└── TROUBLESHOOTING.md

CONTRIBUTING.md
README.md (backend)
README.md (frontend)
\`\`\`

## Recommendation
MERGE — Comprehensive documentation. 100% API coverage, 85% component coverage.
```

## Next Steps After This Program

If successful:
1. Set up Storybook for component playground
2. Generate Swagger UI for interactive API docs
3. Create video tutorials (setup, key features)
4. Add documentation linting (markdownlint)
5. Schedule quarterly doc review

---

**Ready to run:** `bash scripts/auto-improve.sh documentation`

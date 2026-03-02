# Definition of Done v1.1.0

**Production-ready pre-deployment automation that catches deployment mistakes BEFORE they hit production.**

## Quick Start

```bash
# Run checks
./scripts/run-pre-deploy-checks.sh

# JSON output (CI/CD)
./scripts/run-pre-deploy-checks.sh --json

# Auto-fix common issues + re-check
./scripts/run-pre-deploy-checks.sh --fix

# Preview fixes without applying
./scripts/run-pre-deploy-checks.sh --fix --dry-run

# Override environment detection
./scripts/run-pre-deploy-checks.sh --env production
```

**Exit codes:** `0` = PASS (deploy) | `1` = FAIL (blocked) | `2` = WARN (review)

---

## What It Checks (25 Automated Checks)

### Quick Fail Gates (1-4)
- Clean working directory
- No merge conflicts
- node_modules installed
- Package lock in sync

### Build Verification (5-8)
- **TS/JS import mismatch** (the original incident check)
- TypeScript compilation
- Production build
- Build error detection

### Code Quality (9-12)
- ESLint
- Test suite
- console.log detection
- Security vulnerabilities (npm audit)

### Production/Staging Only (13-14)
- CHANGELOG entry (compares against last git tag)
- Database migration sync (Prisma)

### Advanced (15-25)
- Trailing whitespace
- TODO/FIXME tracking
- Large file detection (>100KB source)
- .env file exposure (not committed to git)
- Circular dependencies (requires `madge`)
- Duplicate code detection (requires `jscpd`)
- Unused exports (requires `ts-prune`)
- Environment variable documentation
- Bundle size check
- SQL injection risk detection
- XSS prevention (dangerouslySetInnerHTML)

**Optional tools** (madge, jscpd, ts-prune) gracefully skip if not installed.

---

## --json Mode

For CI/CD pipelines:

```bash
./scripts/run-pre-deploy-checks.sh --json | jq .
```

```json
{
  "status": "PASS",
  "exitCode": 0,
  "environment": "PRODUCTION",
  "branch": "main",
  "checksRun": 25,
  "checksPassed": 25,
  "checksFailed": 0,
  "counts": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "issues": [],
  "executionTime": "47s",
  "timestamp": "2026-03-01T22:00:00Z",
  "version": "1.1.0"
}
```

**Pipeline example:**
```bash
RESULT=$(./scripts/run-pre-deploy-checks.sh --json)
if [ "$(echo "$RESULT" | jq -r '.status')" != "PASS" ]; then
  echo "$RESULT" | jq '.issues[]'
  exit 1
fi
```

---

## --fix Mode

Auto-fixes 5 common issues then re-runs all checks:

1. **TS/JS import extensions** — Removes `.ts/.tsx` from imports in `.js/.jsx` files
2. **console.log** — Removes console.log statements (skips test files)
3. **Trailing whitespace** — Cleans all source files
4. **ESLint** — Runs `eslint --fix`
5. **package.json** — Sorts keys, formats with 2-space indent

```bash
# Apply fixes and re-check
./scripts/run-pre-deploy-checks.sh --fix

# Preview without changes
./scripts/run-pre-deploy-checks.sh --fix --dry-run
```

---

## Decision Logic

| Environment | CRITICAL | HIGH | MEDIUM | Result |
|------------|----------|------|--------|--------|
| Production | Any → BLOCK | Any → BLOCK | >3 → WARN | Strict |
| Staging | Any → BLOCK | >3 → BLOCK | >2 → WARN | Moderate |
| Development | Any → BLOCK | Any → WARN | Any → WARN | Lenient |

---

## Integration

### Git Pre-Push Hook
```bash
cat > .git/hooks/pre-push << 'HOOK'
#!/bin/bash
./scripts/run-pre-deploy-checks.sh
exit $?
HOOK
chmod +x .git/hooks/pre-push
```

### GitHub Actions
```yaml
- run: ./scripts/run-pre-deploy-checks.sh --json
```

### Node.js
```javascript
const { execSync } = require('child_process');
const result = JSON.parse(execSync('./scripts/run-pre-deploy-checks.sh --json', { encoding: 'utf-8' }));
if (result.status !== 'PASS') process.exit(1);
```

---

## File Structure

```
definition-of-done/
├── SKILL.md                    # Orchestrator + docs
├── README.md                   # This file
├── CHANGELOG.md                # Version history
├── checks/                     # Check module docs
│   ├── build-verification.md
│   ├── code-quality.md
│   ├── breaking-changes.md
│   └── database-sync.md
├── workflows/
│   ├── pre-deploy-checklist.md
│   └── automated-checks.md
├── templates/
│   └── failure-report.md
├── references/
│   └── deployment-anti-patterns.md
└── scripts/
    └── run-pre-deploy-checks.sh  # Main executable
```

---

## Performance

| Environment | Target | Checks |
|------------|--------|--------|
| Development | <3 min | 21-23 |
| Staging | <4 min | 23-25 |
| Production | <5 min | 23-25 |

---

**v1.1.0** | Built 2026-03-01 | Status: Production ready ✅

---
name: definition-of-done
description: 'Production-ready pre-deployment automation that catches deployment mistakes BEFORE they hit production. Runs 25 automated checks with --json CI/CD output and --fix auto-remediation. Built after 2026-03-01 login failure (TS/JS import mismatch).'
version: 1.1.0
author: Jeff Daniels
created: 2026-03-01
updated: 2026-03-01
---

# Definition of Done v1.1.0

**Pre-deployment safety net that catches breaking changes before production.**

---

## Origin Story (Why This Exists)

**2026-03-01:** Deployed code that broke production login completely. Rollback required.

**Root cause:** authStore.js importing from queryClient.ts
- Works locally (dev bundler handles mixed imports)
- Breaks in production (bundler strips `.ts` extensions)
- **No automated check caught this.**

**Never again.**

---

## Quick Start

```bash
# Basic check
./scripts/run-pre-deploy-checks.sh

# JSON output for CI/CD
./scripts/run-pre-deploy-checks.sh --json

# Auto-fix common issues then check
./scripts/run-pre-deploy-checks.sh --fix

# Preview what --fix would change
./scripts/run-pre-deploy-checks.sh --fix --dry-run

# Override environment
./scripts/run-pre-deploy-checks.sh --env production
```

**Exit codes:** `0` = PASS | `1` = FAIL | `2` = WARN

---

## Trigger System

**Activates for:**
- Manual: `./scripts/run-pre-deploy-checks.sh`
- Git hook: `pre-push` or `pre-commit` (see workflows/automated-checks.md)
- CI/CD: GitHub Actions, Railway webhooks
- Agent command: "run pre-deploy checks" / "check if safe to deploy"

**Phrases:**
- "run pre-deploy checks"
- "verify deployment readiness"
- "check if safe to deploy"
- "definition of done"

**Does NOT activate for:**
- Local development branches (only main/staging/production)
- Draft PRs (until marked ready for review)
- Dependency updates only (unless breaking changes detected)

---

## Features

### 25 Automated Checks

**Quick Fail Gates (1-4):** Clean workdir, no conflicts, node_modules, package lock sync

**Build Verification (5-8):** TS/JS import mismatch, TypeScript compilation, production build, build error detection

**Code Quality (9-12):** ESLint, test suite, console.log detection, npm audit

**Production/Staging (13-14):** CHANGELOG entry (tag-based comparison), database migration sync

**Advanced (15-25):** Trailing whitespace, TODO/FIXME tracking, large files, .env exposure, circular dependencies (madge), duplicate code (jscpd), unused exports (ts-prune), env var documentation, bundle size, SQL injection detection, XSS prevention

### --json Mode

Structured JSON output for CI/CD pipelines:

```bash
./scripts/run-pre-deploy-checks.sh --json | jq .
```

Output:
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

### --fix Mode

Auto-fix common issues before checking:

```bash
# Fix and re-run
./scripts/run-pre-deploy-checks.sh --fix

# Preview what would change
./scripts/run-pre-deploy-checks.sh --fix --dry-run
```

**Auto-fixes:**
1. Remove `.ts/.tsx` extensions from imports in `.js/.jsx` files
2. Remove `console.log` statements (skips test files)
3. Remove trailing whitespace
4. Run ESLint `--fix`
5. Format `package.json` (sort keys, 2-space indent)

After fixing, automatically re-runs all checks.

---

## Execution Flow

### Step 1: Environment Detection

```bash
# Auto-detected from branch, or override with --env
BRANCH=main → PRODUCTION
BRANCH=staging → STAGING
BRANCH=* → DEVELOPMENT
```

### Step 2: Quick Fail Gates (<10s)

Run first. If any fail → immediate block (exit 1).

### Step 3: Execute All Checks

25 checks run sequentially with timeouts on external commands:
- `npm run build` (120s), `npm test` (60s), `npx tsc` (30s), `npx eslint` (60s)

### Step 4: Decision Gate

| Criticality | Rule | Action |
|------------|------|--------|
| PRODUCTION | ANY CRITICAL → BLOCK | Exit 1 |
| PRODUCTION | ANY HIGH → BLOCK | Exit 1 |
| PRODUCTION | >3 MEDIUM → WARN | Exit 2 |
| STAGING | ANY CRITICAL → BLOCK | Exit 1 |
| STAGING | >3 HIGH → BLOCK | Exit 1 |
| STAGING | ANY HIGH or >2 MEDIUM → WARN | Exit 2 |
| DEVELOPMENT | ANY CRITICAL → BLOCK | Exit 1 |
| DEVELOPMENT | ANY HIGH or MEDIUM → WARN | Exit 2 |

---

## Integration

### Git Hook
```bash
# .git/hooks/pre-push
#!/bin/bash
./scripts/run-pre-deploy-checks.sh
exit $?
```

### GitHub Actions
```yaml
name: Pre-Deploy Checks
on: [push, pull_request]
jobs:
  deploy-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: ./scripts/run-pre-deploy-checks.sh --json
```

### CI/CD Pipeline (Generic)
```bash
# Use JSON output + jq for programmatic access
RESULT=$(./scripts/run-pre-deploy-checks.sh --json)
STATUS=$(echo "$RESULT" | jq -r '.status')
if [ "$STATUS" != "PASS" ]; then
  echo "$RESULT" | jq '.issues[]'
  exit 1
fi
```

### Node.js Integration
```javascript
const { execSync } = require('child_process');
try {
  const result = execSync('./scripts/run-pre-deploy-checks.sh --json', {
    cwd: process.cwd(),
    encoding: 'utf-8'
  });
  const report = JSON.parse(result);
  if (report.status !== 'PASS') {
    console.error(`Deployment blocked: ${report.checksFailed} checks failed`);
    process.exit(1);
  }
} catch (err) {
  console.error('Pre-deploy checks failed');
  process.exit(1);
}
```

### Railway
```javascript
// railway.config.js
module.exports = {
  build: {
    command: './scripts/run-pre-deploy-checks.sh && npm run build'
  }
}
```

---

## Anti-Patterns Prevented

See `references/deployment-anti-patterns.md` for full list.

**Top 4:**
1. **TS/JS Import Mismatch** (2026-03-01) — CRITICAL auto-block
2. **Skipping Build Verification** — CRITICAL auto-block
3. **Missing Dependencies** — CRITICAL auto-block
4. **Database Migration Drift** — CRITICAL auto-block

---

## Banned Phrases in Output

❌ "Should probably check..." / "Might be a good idea..."
✅ "MUST verify X" / "Deployment BLOCKED: [issue]" / "Fix required: [fix]"

---

## Performance

| Environment | Checks | Target |
|------------|--------|--------|
| Development | 21-23 | <3 min |
| Staging | 23-25 | <4 min |
| Production | 23-25 | <5 min |

Optional tools (madge, jscpd, ts-prune) gracefully skip if not installed.

---

## Version History

| Version | Date | Summary |
|---------|------|---------|
| 1.1.0 | 2026-03-01 | --json, --fix, 25 checks, broadened WARN logic, tag-based CHANGELOG |
| 1.0.1 | 2026-03-01 | Audit fixes: honest counts, temp cleanup, timeouts, cross-platform |
| 1.0.0 | 2026-03-01 | Initial: 14 checks, born from production incident |

---

**Status:** Production ready ✅

# Definition of Done

**Production-ready pre-deployment automation that catches deployment mistakes BEFORE they hit production.**

---

## Quick Start

```bash
# Run pre-deploy checks
cd ~/titlerun
./scripts/run-pre-deploy-checks.sh

# Exit codes:
# 0 = PASS (safe to deploy)
# 1 = FAIL (deployment blocked)
# 2 = WARN (review recommended)
```

---

## Origin Story

**2026-03-01:** Deployed code that broke production login completely. Rollback required.

**Root cause:** `authStore.js` importing from `queryClient.ts`
- Works locally (dev bundler handles mixed imports)
- Breaks in production (bundler strips `.ts` extensions)
- **No automated check caught this.**

**Never again.**

This skill was built to prevent that specific failure and every other deployment anti-pattern we've encountered.

---

## What It Does

**Catches before production:**
- TS/JS import mismatches (2026-03-01 incident type)
- Missing dependencies (works locally, breaks deployed)
- Build failures (production bundler config differences)
- TypeScript compilation errors
- ESLint errors
- Test failures
- Breaking API changes without version bump
- Migration files out of sync with schema
- Missing CHANGELOG entries
- Console errors in build output

**Plus 30+ documented patterns in check modules for manual review.**

---

## File Structure

```
definition-of-done/
├── SKILL.md                              # Main orchestrator (progressive disclosure)
├── README.md                             # This file
├── CHANGELOG.md                          # Version history and future plans
│
├── checks/                               # Check modules (loaded conditionally)
│   ├── build-verification.md             # Build-specific checks (8 checks)
│   ├── code-quality.md                   # Linting, tests, types (10 checks)
│   ├── breaking-changes.md               # API compatibility (7 checks)
│   └── database-sync.md                  # Migration verification (8 checks)
│
├── workflows/                            # Execution guides
│   ├── pre-deploy-checklist.md          # Manual step-by-step guide
│   └── automated-checks.md               # CI/CD integration guide
│
├── templates/                            # Output templates
│   └── failure-report.md                 # Comprehensive failure documentation
│
├── references/                           # Supporting documentation
│   └── deployment-anti-patterns.md       # 12 documented anti-patterns
│
└── scripts/                              # Executable automation
    └── run-pre-deploy-checks.sh          # Main check execution script
```

---

## Usage

### Method 1: Manual Execution

```bash
./scripts/run-pre-deploy-checks.sh
```

**When to use:** Before requesting deployment, after major changes

### Method 2: Git Pre-Push Hook

```bash
# Setup (once)
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
./scripts/run-pre-deploy-checks.sh
exit $?
EOF
chmod +x .git/hooks/pre-push

# Automatic execution on every push
git push  # Checks run automatically, push blocked if fails
```

**When to use:** Automated gate for shared branches

### Method 3: GitHub Actions

See `workflows/automated-checks.md` for complete GitHub Actions setup.

**When to use:** Team collaboration, branch protection

### Method 4: Railway/Vercel/Netlify

Add to build command:
```bash
./scripts/run-pre-deploy-checks.sh && npm run build
```

**When to use:** Production deployment gate

---

## What Gets Checked

### Always (Development/Staging/Production)

**Quick Fail Gates (<10s):**
- Clean working directory
- No merge conflicts
- node_modules installed
- Package lock in sync

**Build Verification (30-90s):**
- TS/JS import mismatch (THE critical check)
- TypeScript compilation
- Production build
- Console error detection
- Dependency resolution
- Build output validation
- Source map validation
- Tree-shaking verification

**Code Quality (20-60s):**
- ESLint
- Test suite execution
- Test coverage threshold
- TypeScript strict mode
- Circular dependency detection
- Dead code detection
- Duplicate code detection
- Console.log detection
- TODO/FIXME tracking
- Outdated dependencies (npm audit)

### Production/Staging Only

**Breaking Changes (10-30s):**
- API contract validation
- Database schema changes
- Environment variable changes
- Public API function signatures
- Dependency breaking changes
- Version bump verification
- CHANGELOG entry verification

**Database Sync (5-15s):**
- Migration-schema sync
- Pending migrations
- Migration conflicts
- Migration rollback plan
- Data migration validation
- Foreign key constraints
- Migration size check
- Production DB backup verification

**Total:** 14 automated checks + 30 documented patterns

---

## Performance

| Environment | Checks | Time | Criticality |
|------------|--------|------|-------------|
| Development | 8-10 checks | <2 min | Fast feedback |
| Staging | 10-12 checks | <4 min | Comprehensive |
| Production | 10-14 checks | <5 min | Exhaustive |

**Optimization:**
- Progressive disclosure (load only what's needed)
- Parallel execution (where possible)
- Incremental builds (TypeScript caching)
- Quick fail gates (block early)

---

## Decision Logic

### Development Branch

| Issue Count | Action |
|------------|--------|
| 0 CRITICAL | ✅ PASS — Deploy |
| 1+ CRITICAL | ❌ FAIL — Block |
| Any HIGH | ⚠️ WARN — Flag but allow |

### Staging Branch

| Issue Count | Action |
|------------|--------|
| 0 CRITICAL | ✅ PASS — Deploy |
| 1+ CRITICAL | ❌ FAIL — Block |
| 1-3 HIGH | ⚠️ WARN — Flag but allow |
| 4+ HIGH | ❌ FAIL — Block |

### Production Branch

| Issue Count | Action |
|------------|--------|
| 0 CRITICAL, 0 HIGH | ✅ PASS — Deploy |
| 1+ CRITICAL | ❌ FAIL — Block |
| 1+ HIGH | ❌ FAIL — Block |
| 4+ MEDIUM | ⚠️ WARN — Review |

---

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | PASS | Safe to deploy |
| 1 | FAIL | Deployment blocked |
| 2 | WARN | Review recommended |

---

## Example Output

### PASS (Exit 0)

```
✅ DEPLOYMENT READY

All automated checks passed in 1m 47s

Branch: main
Commit: abc1234
Checks run: $CHECKS_RUN automated
Failures: 0
Warnings: 2 (non-blocking)

Safe to deploy.
```

### FAIL (Exit 1)

```
❌ DEPLOYMENT BLOCKED

5 critical issues detected in 1m 52s

Branch: main
Commit: abc1234
Checks run: $CHECKS_RUN automated
Failures: 5 CRITICAL, 3 HIGH, 1 MEDIUM

CRITICAL ISSUES (must fix before deploy):

1. TS/JS Import Mismatch [src/stores/authStore.js:5]
   Code: import { queryClient } from './queryClient.ts'
   Issue: Will break production bundler
   Fix: Remove .ts extension → './queryClient'
   
[... 4 more critical issues ...]

DO NOT DEPLOY until critical issues are resolved.
```

---

## Integration with OpenClaw

**Skill triggers:**
```
"Run pre-deploy checks"
"Verify deployment readiness"
"Check if safe to deploy"
"Definition of done"
```

**Agent workflow:**
```
User: "Am I safe to deploy TitleRun?"
→ Load definition-of-done skill
→ Execute checks
→ Report results with actionable fixes
```

---

## Anti-Patterns Prevented

See `references/deployment-anti-patterns.md` for full details.

**Top 4 (from production incidents):**

1. **TS/JS Import Mismatch** (2026-03-01)
   - Detection: `grep -r "from.*\.ts['\"]" --include="*.js" src/`
   - Severity: CRITICAL (auto-block)

2. **Skipping Build Verification**
   - Detection: MUST run `npm run build`
   - Severity: CRITICAL (auto-block)

3. **Missing Dependency Detection**
   - Detection: Parse imports, cross-reference package.json
   - Severity: CRITICAL (auto-block)

4. **Database Migration Drift**
   - Detection: Compare Prisma schema with migrations
   - Severity: CRITICAL (auto-block)

---

## Troubleshooting

**Check failed but shouldn't have?**
1. Review error output carefully
2. Check `workflows/pre-deploy-checklist.md` for common fixes
3. Check `references/deployment-anti-patterns.md` for similar issues
4. If false positive: document in CHANGELOG.md, suggest improvement

**Checks taking too long?**
1. Review performance optimization in `workflows/automated-checks.md`
2. Check if running on slow hardware/network
3. Consider caching strategies (npm, TypeScript)

**Need to bypass checks (emergency)?**
```bash
git push --no-verify  # DOCUMENT JUSTIFICATION IN COMMIT
```

---

## Metrics to Track

**Monthly:**
- Execution time (avg, p50, p95)
- Pass rate (goal: >95%)
- Issues caught before deploy (count by severity)
- Production incidents prevented (compare vs baseline)
- False positive rate (goal: <5%)

**Saved to:**
- `workspace-titlerun/metrics/deploy-checks-YYYY-MM.csv`

---

## Contributing

**Found a bug?**
- Document in `CHANGELOG.md` under [Unreleased]
- Include reproduction steps and suggested fix

**New check idea?**
- Document in `CHANGELOG.md` under [Planned for vX.X.X]
- Include use case, detection method, fix strategy

**Check improvement?**
- Update relevant check file in `checks/`
- Add test case to `scripts/run-pre-deploy-checks.sh`
- Document in `CHANGELOG.md`

---

## Version

**Current:** v1.0.0 (2026-03-01)

**Built with:** meta-skill forge v2.0.0  
**Quality score:** Production-grade  
**Status:** Production ready ✅

---

## Support

**Questions?**
- Read `workflows/pre-deploy-checklist.md` (step-by-step guide)
- Check `references/deployment-anti-patterns.md` (common issues)
- Ask Taylor (escalation for critical deploy decisions)

**Need help?**
- Jeff (portfolio manager): Strategic decisions
- Rush (TitleRun operator): Day-to-day execution
- Any Owner/Operator: Custom integration

---

**Mission:** Never ship broken code to production again.

**Evidence:** Would have caught 2026-03-01 login failure (and every other deployment anti-pattern we've documented).

**Promise:** <2 min for dev, <5 min for production. Fast enough to use every time.

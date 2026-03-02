# Deployment Anti-Patterns

**Production incidents that shaped this skill**

---

## Critical Anti-Patterns (Will Break Production)

### 1. TS/JS Import Mismatch (2026-03-01 INCIDENT)

**What happened:**
```javascript
// authStore.js
import { queryClient } from './queryClient.ts' // ❌ .ts extension
```

**Why it broke:**
- Works locally (Vite handles mixed .js/.ts imports)
- Breaks in production (bundler strips .ts extensions, can't resolve)
- Login completely broken, immediate rollback required

**Impact:** 100% of users unable to login, 15-minute downtime

**Detection:**
```bash
grep -r "from ['\"].*\.ts['\"]" --include="*.js" --include="*.jsx" src/
```

**Prevention:** 
- MUST check import mismatches before every deploy
- Auto-fail deployment if found
- Fix: Remove all .ts/.tsx extensions from imports

**Severity:** CRITICAL (auto-block)

---

### 2. Skipping Build Verification

**What happens:**
```bash
# Developer workflow
npm test  # ✅ All tests pass
git push  # 🚀 Deploy triggered
# ❌ Build fails in production (different bundler config)
```

**Why it breaks:**
- Tests passing ≠ build works
- Production bundler has different settings than dev
- Missing dependencies only caught during build

**Impact:** Failed deployment, rollback required

**Detection:**
```bash
# MUST run before deploy
npm run build
```

**Prevention:**
- Always run production build locally before pushing
- CI/CD MUST run build step
- Never trust "tests pass" alone

**Severity:** CRITICAL (auto-block)

---

### 3. Missing Dependency Detection

**What happens:**
```javascript
// New code added
import { nanoid } from 'nanoid' // ❌ Not in package.json
```

**Why it breaks:**
- Works locally (node_modules cached from previous install)
- Breaks on fresh install (CI, production, other developers)
- Silent failure until deployment

**Impact:** Production build fails, deployment blocked

**Detection:**
```bash
# Parse all imports, cross-reference package.json
find src -name "*.ts" -o -name "*.js" | \
  xargs grep -oh "from ['\"][^'\"]*['\"]" | \
  sed "s/from ['\"]//;s/['\"]$//" | \
  while read import; do
    if [[ $import != ./* ]]; then
      pkg=$(echo $import | cut -d'/' -f1)
      grep -q "\"$pkg\"" package.json || echo "MISSING: $pkg"
    fi
  done
```

**Prevention:**
- Run `npm install` after pulling changes
- CI must install from package.json (not cache)
- Check imports against package.json before deploy

**Severity:** CRITICAL (auto-block)

---

### 4. Database Migration Drift

**What happens:**
```prisma
// schema.prisma (manually edited)
model User {
  id        String @id
  email     String @unique
  phone     String? // ❌ Added without migration
}
```

**Why it breaks:**
- Schema expects column that doesn't exist in DB
- App crashes on startup (Prisma can't sync)
- Data queries fail

**Impact:** App completely down, requires manual DB fix

**Detection:**
```bash
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma
```

**Prevention:**
- ALWAYS generate migrations for schema changes
- Never manually edit production database
- Run migration check before deploy

**Severity:** CRITICAL (auto-block)

---

## High-Severity Anti-Patterns (Will Cause Issues)

### 5. Console.log in Production

**What happens:**
```javascript
// Debug code left in
console.log('User token:', authToken) // ❌ Sensitive data
console.log('API response:', response) // ❌ Performance hit
```

**Why it's bad:**
- Leaks sensitive data to browser console
- Performance impact (large objects)
- Unprofessional (debugging code in production)

**Impact:** Security risk, performance degradation

**Detection:**
```bash
grep -r "console\\.log" --include="*.ts" --include="*.js" src/
```

**Prevention:**
- Use proper logging library (production mode disables logs)
- CI/CD blocks on console.log detection
- Code review catches leftovers

**Severity:** HIGH (security/performance concern)

---

### 6. Outdated Dependencies with CVEs

**What happens:**
```json
// package.json
{
  "dependencies": {
    "express": "4.16.0" // ❌ Known security vulnerability CVE-2022-24999
  }
}
```

**Why it's bad:**
- Known exploits publicly available
- Security audits flag as critical
- Compliance violations

**Impact:** Security breach, data leak, regulatory fines

**Detection:**
```bash
npm audit --json
```

**Prevention:**
- Run npm audit before every deploy
- Auto-update security patches
- Block deployment if critical CVEs found

**Severity:** HIGH (security risk)

---

### 7. Missing Test Coverage for Critical Paths

**What happens:**
```javascript
// Authentication logic (ZERO tests)
export function validateToken(token: string) {
  // ❌ No tests, breaks in production
  return jwt.verify(token, process.env.SECRET)
}
```

**Why it's bad:**
- Critical paths untested
- Regressions go unnoticed
- Production is the testing environment

**Impact:** Authentication failures, user lockouts

**Detection:**
```bash
npx jest --coverage --coverageThreshold='{"global":{"statements":80}}'
```

**Prevention:**
- Require >80% coverage for critical paths
- Block PR merge if coverage drops
- Test auth, payments, data integrity rigorously

**Severity:** HIGH (reliability concern)

---

## Medium-Severity Anti-Patterns (Technical Debt)

### 8. Breaking API Changes Without Version Bump

**What happens:**
```typescript
// Old API
export function getUser(id: string): User

// New API (breaking change)
export function getUser(id: string, includeDeleted = false): User // ❌ No version bump
```

**Why it's bad:**
- Breaks existing consumers
- No migration path
- Silent failures

**Impact:** API consumers break, no warning

**Detection:**
```bash
npx api-extractor run --local
git diff api-report.md
```

**Prevention:**
- Use semantic versioning
- Bump major version for breaking changes
- Provide migration guide in CHANGELOG

**Severity:** MEDIUM (API compatibility)

---

### 9. Deploying Without CHANGELOG Entry

**What happens:**
```bash
git log --oneline
abc1234 Fix user settings
def5678 Update API
ghi9012 Refactor auth

# ❌ No CHANGELOG.md entry
```

**Why it's bad:**
- No deployment history
- Debugging production issues harder
- Team has no visibility into changes

**Impact:** Operational confusion, slower debugging

**Detection:**
```bash
git diff main..HEAD -- CHANGELOG.md
# If empty → warning
```

**Prevention:**
- Require CHANGELOG entry for every PR
- Template with: Added, Changed, Fixed, Removed, Breaking
- Link to tickets/issues

**Severity:** MEDIUM (operational visibility)

---

### 10. Large Migrations Without Downtime Plan

**What happens:**
```sql
-- migration.sql
ALTER TABLE users ADD COLUMN preferences JSONB; -- ❌ Locks table for 5 minutes (10M users)
```

**Why it's bad:**
- Locks table during migration
- App downtime during deploy
- No rollback plan

**Impact:** 5-minute downtime, user complaints

**Detection:**
```bash
# Check migration file size
migration_size=$(wc -c < latest-migration.sql)
if [ $migration_size -gt 100000 ]; then
  echo "WARNING: Large migration detected"
fi
```

**Prevention:**
- Split large migrations into batches
- Use non-blocking migrations (add column with default, backfill later)
- Test migration time on production-sized dataset

**Severity:** MEDIUM (availability risk)

---

## Low-Severity Anti-Patterns (Code Quality)

### 11. Excessive TODO Comments

**What happens:**
```javascript
// TODO: Fix this hack
// TODO: Refactor later
// TODO: Add error handling
// FIXME: This is broken but works for now
```

**Why it's bad:**
- Technical debt accumulates
- Hacks become permanent
- No ownership

**Impact:** Code quality degradation over time

**Detection:**
```bash
grep -r "TODO\|FIXME" src/ | wc -l
```

**Prevention:**
- Convert TODOs to tickets
- Set deadline for FIXME resolution
- Limit TODOs per file (max 3)

**Severity:** LOW (code quality)

---

### 12. Dead Code Accumulation

**What happens:**
```javascript
// Unused function (never called)
export function oldApiCall() {
  // 500 lines of dead code
}
```

**Why it's bad:**
- Bundle size bloat
- Maintenance burden
- Confusing for developers

**Impact:** Slower builds, larger bundles, confusion

**Detection:**
```bash
npx ts-prune
```

**Prevention:**
- Remove unused exports
- Run dead code detection in CI
- Quarterly code cleanup

**Severity:** LOW (maintenance burden)

---

## Anti-Pattern Summary (By Frequency)

| Anti-Pattern | Frequency | Avg Impact | Detection Difficulty |
|-------------|-----------|-----------|---------------------|
| TS/JS import mismatch | Common | Critical | Easy |
| Skipping build | Common | Critical | Easy |
| Missing dependencies | Common | Critical | Easy |
| DB migration drift | Occasional | Critical | Medium |
| Console.log in prod | Very common | High | Easy |
| Outdated deps with CVEs | Common | High | Easy |
| Missing test coverage | Common | High | Medium |
| Breaking API changes | Occasional | Medium | Hard |
| No CHANGELOG entry | Very common | Medium | Easy |
| Large migrations | Occasional | Medium | Medium |
| Excessive TODOs | Very common | Low | Easy |
| Dead code | Common | Low | Medium |

---

## How This Skill Prevents These

**Critical checks (auto-block):**
1. TS/JS import mismatch → `checks/build-verification.md` Check 2
2. Build verification → `checks/build-verification.md` Check 3
3. Missing dependencies → `checks/build-verification.md` Check 5
4. DB migration drift → `checks/database-sync.md` Check 1

**High-severity checks (warn + flag):**
5. Console.log detection → `checks/code-quality.md` Check 8
6. npm audit → `checks/code-quality.md` Check 10
7. Test coverage → `checks/code-quality.md` Check 3

**Medium-severity checks (informational):**
8. API version bump → `checks/breaking-changes.md` Check 6
9. CHANGELOG entry → `checks/breaking-changes.md` Check 7
10. Large migrations → `checks/database-sync.md` Check 7

**Low-severity checks (metrics):**
11. TODO count → `checks/code-quality.md` Check 9
12. Dead code → `checks/code-quality.md` Check 6

---

## Real-World Impact (If We Had This Skill Earlier)

**2026-03-01 Login Failure:**
- **Would have been caught:** YES (Check: TS/JS import mismatch)
- **Time saved:** 15 minutes downtime + 2 hours debugging
- **Users affected:** 0 (instead of 100%)
- **Cost avoided:** ~$500 in lost revenue + support tickets

**Previous incidents (hypothetical):**
- Missing nanoid dependency → Caught by dependency check
- DB schema drift → Caught by migration sync check
- Breaking API change → Caught by version bump check

**Total incidents prevented per year (estimate):** 12-20
**Average time saved per incident:** 1-3 hours
**Total time saved per year:** 15-60 hours

---

**Status:** Battle-tested lessons from production failures ✅

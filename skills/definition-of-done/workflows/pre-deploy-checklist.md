# Pre-Deploy Checklist

**Step-by-step manual execution guide**

---

## When to Use

**Use this checklist:**
- Before requesting Taylor to deploy
- Before merging to main/production branch
- Before git push to staging/production
- After major refactoring or feature work

**DO NOT skip this checklist for:**
- Production deployments (ever)
- Staging deployments (recommended)
- Major feature releases
- Database schema changes

---

## Quick Start (TL;DR)

```bash
cd ~/titlerun
./scripts/run-pre-deploy-checks.sh
```

If exit code 0 → Safe to deploy  
If exit code 1 → **BLOCKED** (fix critical issues)  
If exit code 2 → **WARNED** (review recommended)

---

## Detailed Manual Checklist

### Phase 1: Pre-Flight (Before Running Checks)

- [ ] **All changes committed**
  ```bash
  git status  # Should show "working tree clean"
  ```

- [ ] **On correct branch**
  ```bash
  git branch  # Should be on main/staging/develop
  ```

- [ ] **Latest code pulled**
  ```bash
  git pull origin main
  ```

- [ ] **Dependencies installed**
  ```bash
  npm install
  ```

---

### Phase 2: Quick Fail Gates (<10 seconds)

Run these first to catch obvious blockers:

- [ ] **Clean working directory**
  ```bash
  git diff --quiet || echo "FAIL: Uncommitted changes"
  ```
  **Fix:** `git add . && git commit` OR `git stash`

- [ ] **No merge conflicts**
  ```bash
  git ls-files -u
  ```
  **Fix:** Resolve conflicts, `git add`, `git commit`

- [ ] **node_modules exists**
  ```bash
  test -d node_modules || echo "FAIL: Run npm install"
  ```
  **Fix:** `npm install`

- [ ] **Package lock in sync**
  ```bash
  npm ls --depth=0 >/dev/null 2>&1 || echo "FAIL: Out of sync"
  ```
  **Fix:** `rm -rf node_modules package-lock.json && npm install`

**If ANY fail → STOP. Fix before continuing.**

---

### Phase 3: Build Verification (30-90 seconds)

- [ ] **TS/JS import mismatch check** (CRITICAL - 2026-03-01 incident)
  ```bash
  grep -r "from ['\"].*\.tsx\?['\"]" --include="*.js" --include="*.jsx" src/
  ```
  **Expected:** No results
  **If found:** Remove .ts/.tsx extensions from imports in .js files
  
- [ ] **TypeScript compilation**
  ```bash
  npx tsc --noEmit --skipLibCheck
  ```
  **Expected:** No errors
  **If errors:** Fix type issues before deploying

- [ ] **Production build**
  ```bash
  npm run build
  ```
  **Expected:** Exit code 0, dist/ directory created
  **If fails:** Review build errors, fix before deploying

- [ ] **Build output validation**
  ```bash
  test -d dist && echo "PASS" || echo "FAIL"
  find dist -name "*.js" -size +0 || echo "FAIL: No JS bundles"
  ```
  **Expected:** dist/ exists, contains .js files >0 bytes

**If ANY fail → STOP. Deployment will fail.**

---

### Phase 4: Code Quality (20-60 seconds)

- [ ] **ESLint**
  ```bash
  npx eslint . --max-warnings 0
  ```
  **Expected:** No errors, 0 warnings
  **If errors:** Fix or suppress with justification

- [ ] **Test suite**
  ```bash
  npm test
  ```
  **Expected:** All tests passing
  **If fails:** Fix failing tests before deploying

- [ ] **Console.log detection**
  ```bash
  grep -r "console\.log" --include="*.ts" --include="*.tsx" src/ | grep -v "// @debug"
  ```
  **Expected:** No results (or only @debug-marked logs)
  **If found:** Remove debugging code

- [ ] **Security audit**
  ```bash
  npm audit
  ```
  **Expected:** 0 vulnerabilities (or LOW only)
  **If CRITICAL/HIGH:** Run `npm audit fix` or manually update packages

**If CRITICAL/HIGH issues → STOP (production). WARN for staging.**

---

### Phase 5: Production/Staging Only Checks (10-30 seconds)

**Skip for DEVELOPMENT branch**

- [ ] **CHANGELOG entry**
  ```bash
  git diff main..HEAD -- CHANGELOG.md
  ```
  **Expected:** New entry added describing changes
  **If missing:** Add entry before deploying

- [ ] **Database migration sync** (if Prisma)
  ```bash
  npx prisma migrate status
  ```
  **Expected:** "Database is up to date" OR new migration pending
  **If drift:** Generate migration (`npx prisma migrate dev --name <name>`)

- [ ] **Version bump** (if breaking changes)
  ```bash
  git diff main..HEAD -- package.json | grep version
  ```
  **Expected:** Version incremented if breaking changes
  **If not bumped:** `npm version [major|minor|patch]`

**If ANY fail → STOP. Risk of data loss or breaking changes.**

---

### Phase 6: Final Review

- [ ] **Review all check results**
  - Critical: 0
  - High: 0 (production), <3 (staging)
  - Medium: <5
  - Low: <10

- [ ] **Deployment plan clear**
  - [ ] Know what's being deployed (feature/fix/refactor)
  - [ ] Know rollback plan (git revert, database backup)
  - [ ] Know who to notify (Taylor, users if downtime)

- [ ] **Environment variables set** (if new vars added)
  ```bash
  grep "process.env" src/ | cut -d'.' -f3 | cut -d' ' -f1 | sort -u
  ```
  Compare with production .env

**If ANY concerns → Discuss with Taylor before deploying.**

---

### Phase 7: Deploy Decision

**PASS criteria:**
- ✅ All CRITICAL checks passed
- ✅ All HIGH checks passed (or <3 for staging)
- ✅ MEDIUM/LOW warnings reviewed and acceptable
- ✅ Deployment plan clear
- ✅ Rollback plan ready

**Decision:**

| Status | Action |
|--------|--------|
| All ✅ | **DEPLOY** → Proceed with confidence |
| 1-2 CRITICAL ❌ | **BLOCKED** → Fix critical issues first |
| >3 HIGH ⚠️ | **REVIEW** → Discuss with Taylor |
| >5 MEDIUM ⚠️ | **WARN** → Can deploy but flag for cleanup |

**To deploy:**
```bash
# If all checks pass
git push origin main  # Triggers CI/CD
# OR notify Taylor: "Pre-deploy checks passed. Ready to deploy TitleRun."
```

**To block:**
```bash
# Fix critical issues, then re-run checklist
./scripts/run-pre-deploy-checks.sh
```

---

## Automated Execution

**For git hook automation:**
```bash
# Add to .git/hooks/pre-push
#!/bin/bash
./scripts/run-pre-deploy-checks.sh
exit $?
```

**For CI/CD automation:**
See `workflows/automated-checks.md`

---

## Common Failures & Fixes

### "TS/JS import mismatch detected"
```bash
# Auto-fix
sed -i '' "s/from '\(.*\)\.tsx\?'/from '\1'/g" src/**/*.js
```

### "Build failed"
```bash
# Check build errors
cat build-errors.txt
# Common causes: missing deps, syntax errors, type errors
```

### "Tests failing"
```bash
# Run tests with verbose output
npm test -- --verbose
# Fix failing tests or update snapshots (if intentional)
```

### "Database migration drift"
```bash
# Generate migration
npx prisma migrate dev --name fix_schema_drift
```

### "Console.log detected"
```bash
# Remove all console.log (review first!)
sed -i '' '/console\.log/d' src/**/*.ts
```

---

## Time Estimates

| Phase | Time | Notes |
|-------|------|-------|
| Pre-flight | 30s | One-time setup |
| Quick fail gates | 5s | Fast blockers |
| Build verification | 30-90s | Depends on project size |
| Code quality | 20-60s | Depends on test suite |
| Production checks | 10-30s | Only for prod/staging |
| Review | 30s | Manual decision |
| **Total** | **2-5 min** | Typical execution time |

---

## Success Metrics

**Track these over time:**
- Checklist pass rate (goal: >95%)
- Average execution time (goal: <2 min for dev, <5 min for prod)
- Issues caught before deploy (goal: >20/month)
- Production incidents prevented (goal: measure vs baseline)

**Record in:**
- `workspace-titlerun/metrics/deploy-checks-YYYY-MM.md`

---

**Status:** Production ready — Use before every deploy ✅

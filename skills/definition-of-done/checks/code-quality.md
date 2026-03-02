# Code Quality Checks

**Purpose:** Verify code meets quality standards (linting, tests, types)

**Execution time:** 20-60 seconds (depends on test suite size)

**Criticality:** HIGH — Prevents bugs, regressions, and technical debt

---

## Check 1: ESLint (Code Standards)

**Command:**
```bash
npx eslint . --max-warnings 0 --format json > eslint-report.json
```

**What it catches:**
- Syntax errors
- Code style violations
- Common bugs (unused vars, missing returns, etc.)
- Security issues (eval usage, prototype pollution)

**Example failure:**
```json
{
  "filePath": "src/utils/api.ts",
  "messages": [
    {
      "ruleId": "no-unused-vars",
      "severity": 2,
      "message": "Variable 'API_KEY' is defined but never used",
      "line": 5,
      "column": 7
    }
  ]
}
```

**Severity:** HIGH (errors), MEDIUM (warnings)

**Fix:**
```bash
# Auto-fix where possible
npx eslint . --fix

# Manual review for remaining issues
```

---

## Check 2: Test Suite Execution

**Command:**
```bash
npm test -- --coverage --ci --maxWorkers=2 --json --outputFile=test-results.json
```

**What it catches:**
- Broken tests (code changes broke existing functionality)
- Failing assertions
- Test timeouts
- Uncaught exceptions in tests

**Example failure:**
```json
{
  "success": false,
  "numFailedTests": 2,
  "testResults": [
    {
      "name": "src/stores/authStore.test.ts",
      "status": "failed",
      "message": "Expected queryClient to be defined, but was undefined",
      "duration": 150
    }
  ]
}
```

**Severity:** CRITICAL (failed tests in main/production), HIGH (failed tests in staging)

**Success criteria:**
- All tests passing (exit code 0)
- No skipped tests (unless explicitly allowed)
- Coverage above threshold (if configured)

---

## Check 3: Test Coverage Threshold

**Command:**
```bash
# Check coverage meets minimum thresholds
npx jest --coverage --coverageThreshold='{"global":{"statements":80,"branches":75,"functions":80,"lines":80}}'
```

**What it catches:**
- Untested code paths
- New code without tests
- Coverage regressions

**Example failure:**
```
Jest: "global" coverage threshold for statements (80%) not met: 72.5%
```

**Severity:** MEDIUM (non-blocking but flagged for review)

**Fix:** Add tests for uncovered code paths

---

## Check 4: TypeScript Strict Mode

**Command:**
```bash
npx tsc --noEmit --strict
```

**What it catches:**
- Implicit any types
- Null/undefined safety violations
- Strict function types mismatches

**Example failure:**
```
src/utils/api.ts:15:3 - error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.

const result = processData(apiResponse.data)
               ~~~~~~~~~~~
```

**Severity:** HIGH (prevents runtime null errors)

**Fix:** Add explicit type annotations and null checks

---

## Check 5: Circular Dependency Detection

**Command:**
```bash
npx madge --circular --extensions ts,tsx,js,jsx src/
```

**What it catches:**
- Circular imports (A imports B, B imports A)
- Can cause runtime errors and bundling issues

**Example failure:**
```
✖ Found 2 circular dependencies!

1) src/stores/authStore.ts > src/utils/api.ts > src/stores/authStore.ts
2) src/components/Header.tsx > src/components/Nav.tsx > src/components/Header.tsx
```

**Severity:** HIGH (can cause bundle bloat and runtime errors)

**Fix:** Refactor to break circular dependencies (extract shared code to separate module)

---

## Check 6: Dead Code Detection

**Command:**
```bash
npx ts-prune --error
```

**What it catches:**
- Unused exports (dead code)
- Orphaned files (imported nowhere)

**Example failure:**
```
src/utils/deprecated.ts:5 - unused export: oldApiCall
src/stores/legacyStore.ts (no imports, entire file unused)
```

**Severity:** LOW (code cleanup, not blocking)

**Fix:** Remove unused code or document why it's kept

---

## Check 7: Duplicate Code Detection

**Command:**
```bash
npx jscpd src/ --min-lines 5 --min-tokens 50 --format json > duplication-report.json
```

**What it catches:**
- Copy-pasted code blocks
- Refactoring opportunities

**Example failure:**
```json
{
  "duplicates": [
    {
      "format": "typescript",
      "lines": 15,
      "tokens": 75,
      "firstFile": "src/utils/formatters.ts",
      "secondFile": "src/components/DateDisplay.tsx"
    }
  ]
}
```

**Severity:** LOW (technical debt, not blocking)

**Fix:** Extract duplicated code to shared utility

---

## Check 8: Console.log Detection (Production)

**Command:**
```bash
# Check for console.log in production code (debugging leftovers)
grep -r "console\\.log" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ \
  | grep -v "// @debug" \
  | grep -v "node_modules"
```

**What it catches:**
- Debugging code left in production
- Sensitive data logged to console

**Example failure:**
```
src/stores/authStore.ts:42:  console.log('User token:', token)
src/utils/api.ts:15:  console.log('API response:', response)
```

**Severity:** MEDIUM (security/performance concern)

**Fix:** Remove console.log or replace with proper logging (if intended, mark with `// @debug`)

---

## Check 9: TODO/FIXME Tracking

**Command:**
```bash
# Count TODOs and FIXMEs
grep -r "TODO\|FIXME" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ > todos.txt
todo_count=$(wc -l < todos.txt)

if [ $todo_count -gt 20 ]; then
  echo "WARNING: $todo_count TODOs/FIXMEs found (technical debt accumulating)"
fi
```

**What it catches:**
- Technical debt accumulation
- Unfinished work

**Severity:** LOW (informational)

**Fix:** Address critical TODOs before major releases

---

## Check 10: Outdated Dependencies

**Command:**
```bash
npm outdated --json > outdated-deps.json

# Check for critical security vulnerabilities
npm audit --json > audit-report.json
```

**What it catches:**
- Outdated packages (security risks)
- Known vulnerabilities (CVEs)

**Example failure:**
```json
{
  "vulnerabilities": {
    "high": 2,
    "critical": 1
  },
  "metadata": {
    "totalDependencies": 150
  }
}
```

**Severity:** CRITICAL (known security vulnerabilities), MEDIUM (outdated deps)

**Fix:**
```bash
# Fix vulnerabilities automatically
npm audit fix

# Manually update critical packages
npm update [package-name]
```

---

## Verification Output Format

```json
{
  "check": "code-quality",
  "status": "PASS",
  "duration_ms": 45200,
  "checks_run": 10,
  "checks_passed": 9,
  "checks_failed": 1,
  "warnings": [
    {
      "severity": "MEDIUM",
      "check_id": "console-log-detection",
      "file": "src/stores/authStore.ts",
      "line": 42,
      "code": "console.log('User token:', token)",
      "issue": "Debugging code left in production",
      "impact": "Sensitive data logged to browser console (security risk)",
      "fix": "Remove console.log or replace with proper logging",
      "fix_command": "sed -i '' '42d' src/stores/authStore.ts"
    }
  ]
}
```

---

## Performance Notes

**Optimization strategies:**

1. **Parallel execution:** Run eslint, tests, and tsc in parallel (saves ~20s)
2. **Incremental linting:** Use ESLint cache (`--cache`) for faster runs
3. **Test sharding:** Split test suite across workers (`--maxWorkers=2`)
4. **Skip slow checks in dev:** Run full suite only on pre-push, not pre-commit

**Typical execution times:**

| Check | Time |
|-------|------|
| ESLint | 5-15s |
| Tests | 10-30s |
| TypeScript | 5-10s |
| Circular deps | 2-5s |
| Dead code | 3-8s |
| Other checks | 5-10s |
| **Total** | **30-80s** |

---

## Integration with Main Orchestrator

**Called from SKILL.md Step 4:**

```javascript
// Load this file
const codeQualityChecks = require('./checks/code-quality.md')

// Execute all checks
const results = await codeQualityChecks.runAll()

// Aggregate results
const criticalIssues = results.errors.filter(e => e.severity === 'CRITICAL')
const highIssues = results.errors.filter(e => e.severity === 'HIGH')

if (criticalIssues.length > 0) {
  console.log('❌ DEPLOYMENT BLOCKED: Code quality check failed')
  process.exit(1)
} else if (highIssues.length > 3) {
  console.log('⚠️ WARNING: Multiple high-severity issues detected')
  // Allow deployment but flag for review
}
```

---

## Historical Context (Why Each Check Exists)

**Check 1 (ESLint):** Prevents common bugs and enforces code standards  
**Check 2 (Tests):** Catches regressions before production  
**Check 3 (Coverage):** Ensures new code is tested  
**Check 4 (TypeScript strict):** Prevents null/undefined runtime errors  
**Check 5 (Circular deps):** Prevents bundle bloat and runtime errors  
**Check 6 (Dead code):** Reduces bundle size and maintenance burden  
**Check 7 (Duplication):** Identifies refactoring opportunities  
**Check 8 (Console.log):** Prevents sensitive data leaks  
**Check 9 (TODO tracking):** Monitors technical debt  
**Check 10 (Outdated deps):** Prevents security vulnerabilities  

---

**Status:** Production ready — Comprehensive quality gate ✅

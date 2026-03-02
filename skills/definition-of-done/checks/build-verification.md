# Build Verification Checks

**Purpose:** Verify code builds successfully in production-like environment

**Execution time:** 30-90 seconds (depends on project size)

**Criticality:** CRITICAL — Catches TS/JS mismatches, missing deps, build config errors

---

## Check 1: TypeScript Compilation

**Command:**
```bash
npx tsc --noEmit --skipLibCheck
```

**What it catches:**
- Type errors that break builds
- Import path mismatches
- Missing type definitions
- Circular dependencies

**Example failure:**
```
src/stores/authStore.js:5:28 - error TS2307: Cannot find module './queryClient.ts' or its corresponding type declarations.

import { queryClient } from './queryClient.ts'
                           ~~~~~~~~~~~~~~~~~~~~
```

**Severity:** CRITICAL

**Fix pattern:**
```javascript
// ❌ WRONG (breaks production bundler)
import { queryClient } from './queryClient.ts'

// ✅ CORRECT (bundler resolves extension)
import { queryClient } from './queryClient'
```

---

## Check 2: TS/JS Import Mismatch Detection

**Command:**
```bash
# Find .js files importing from .ts paths
grep -r "from ['\"].*\.ts['\"]" --include="*.js" --include="*.jsx" src/

# Find .ts files importing from .js paths (also problematic)
grep -r "from ['\"].*\.js['\"]" --include="*.ts" --include="*.tsx" src/
```

**What it catches:**
- Mixed JS/TS imports that work locally but break in production
- **This is EXACTLY what broke login on 2026-03-01**

**Example failure:**
```
src/stores/authStore.js:5:import { queryClient } from './queryClient.ts'
src/utils/api.js:12:import { API_BASE } from './config.ts'
```

**Severity:** CRITICAL (auto-block deployment)

**Why it's critical:**
- Works in development (Vite/Webpack handle mixed imports)
- Breaks in production (bundler strips extensions, can't resolve)
- Silent failure (no build error, runtime breakage)

**Fix:**
```bash
# Automated fix (remove .ts/.tsx extensions)
sed -i '' "s/from '\(.*\)\.tsx\?'/from '\1'/g" src/**/*.js
sed -i '' 's/from "\(.*\)\.tsx\?"/from "\1"/g' src/**/*.js
```

---

## Check 3: Production Build

**Command:**
```bash
npm run build 2>&1 | tee build.log
```

**What it catches:**
- Build failures (syntax errors, missing deps)
- Tree-shaking issues
- Code splitting problems
- Asset bundling failures

**Example failure:**
```
✘ [ERROR] Could not resolve "./queryClient.ts"

    src/stores/authStore.js:5:28:
      5 │ import { queryClient } from './queryClient.ts'
        ╵                             ~~~~~~~~~~~~~~~~~~

  The bundler cannot resolve module specifiers with explicit file extensions.
  Remove the ".ts" extension to allow the bundler to resolve the correct file.
```

**Severity:** CRITICAL

**Success criteria:**
- Exit code 0
- No errors in stderr
- Build output exists (e.g., `dist/` directory created)
- Build artifacts are valid (not empty, contain expected files)

---

## Check 4: Console Error Detection

**Command:**
```bash
# Check build log for console errors
grep -i "error" build.log | grep -v "0 errors"

# Check for warnings that are actually errors
grep -i "failed" build.log
grep -i "cannot" build.log
```

**What it catches:**
- Soft failures (warnings treated as errors in production)
- Deprecation warnings that break builds
- Missing environment variables

**Example failure:**
```
warning: process.env.VITE_API_KEY is undefined
warning: This will cause runtime errors in production
```

**Severity:** HIGH (warnings) to CRITICAL (errors)

**Fix:** Address warnings before deployment, set required env vars

---

## Check 5: Dependency Resolution

**Command:**
```bash
# Parse all imports from source files
find src -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" | \
  xargs grep -oh "from ['\"][^'\"]*['\"]" | \
  sed "s/from ['\"]//;s/['\"]$//" | \
  sort -u > imports.txt

# Check if each import is in package.json or is a relative path
while read import; do
  if [[ $import == ./* ]] || [[ $import == ../* ]]; then
    continue  # Skip relative imports
  fi
  
  # Extract package name (handles @scope/package and package/subpath)
  pkg=$(echo $import | cut -d'/' -f1-2)
  if [[ $pkg == @* ]]; then
    pkg=$(echo $import | cut -d'/' -f1-2)
  else
    pkg=$(echo $import | cut -d'/' -f1)
  fi
  
  # Check if in package.json dependencies or devDependencies
  if ! grep -q "\"$pkg\"" package.json; then
    echo "MISSING: $pkg (imported as: $import)"
  fi
done < imports.txt
```

**What it catches:**
- New imports added without updating package.json
- Works locally (cached in node_modules) but breaks on fresh install
- Production builds fail when deploying to clean environment

**Example failure:**
```
MISSING: nanoid (imported as: nanoid)
MISSING: date-fns (imported as: date-fns/format)
```

**Severity:** CRITICAL

**Fix:**
```bash
npm install nanoid date-fns --save
```

---

## Check 6: Build Output Validation

**Command:**
```bash
# Verify dist/ directory exists and contains expected files
test -d dist || { echo "ERROR: dist/ directory not created"; exit 1; }

# Check for index.html (web apps)
test -f dist/index.html || { echo "ERROR: dist/index.html missing"; exit 1; }

# Check for bundled JS (size > 0)
find dist -name "*.js" -size +0 || { echo "ERROR: No valid JS bundles found"; exit 1; }

# Check for CSS (if applicable)
if [ -d src/styles ]; then
  find dist -name "*.css" -size +0 || { echo "ERROR: No valid CSS bundles found"; exit 1; }
fi
```

**What it catches:**
- Empty builds (build command runs but produces nothing)
- Missing critical assets
- Corrupted output files

**Severity:** CRITICAL

---

## Check 7: Source Map Validation

**Command:**
```bash
# Verify source maps generated (production debugging)
find dist -name "*.js.map" || echo "WARNING: No source maps found"

# Check source map validity
for map in dist/**/*.js.map; do
  if ! jq empty "$map" 2>/dev/null; then
    echo "ERROR: Invalid source map: $map"
  fi
done
```

**What it catches:**
- Broken source maps (production debugging impossible)
- Misconfigured build tools

**Severity:** MEDIUM (non-blocking but strongly recommended)

---

## Check 8: Tree-Shaking Verification

**Command:**
```bash
# Check for unused exports (dead code)
npx ts-prune > dead-code.txt

# Count unused exports
unused_count=$(wc -l < dead-code.txt)

if [ $unused_count -gt 50 ]; then
  echo "WARNING: $unused_count unused exports detected (bundle size bloat)"
fi
```

**What it catches:**
- Dead code shipped to production (performance impact)
- Incomplete refactoring (old code not removed)

**Severity:** LOW (performance optimization, not blocking)

---

## Verification Output Format

```json
{
  "check": "build-verification",
  "status": "FAIL",
  "duration_ms": 87420,
  "checks_run": 8,
  "checks_passed": 6,
  "checks_failed": 2,
  "errors": [
    {
      "severity": "CRITICAL",
      "check_id": "ts-js-import-mismatch",
      "file": "src/stores/authStore.js",
      "line": 5,
      "code": "import { queryClient } from './queryClient.ts'",
      "issue": "TS/JS import mismatch - will break production bundler",
      "impact": "Runtime breakage in production (works locally, fails deployed)",
      "fix": "Remove .ts extension: import { queryClient } from './queryClient'",
      "fix_command": "sed -i '' \"s/from '\\.\\\/queryClient\\.ts'/from '.\\/queryClient'/\" src/stores/authStore.js"
    },
    {
      "severity": "CRITICAL",
      "check_id": "missing-dependency",
      "file": "package.json",
      "line": null,
      "code": null,
      "issue": "nanoid imported but not in dependencies",
      "impact": "Build fails on fresh install (npm install && npm run build)",
      "fix": "Add to package.json dependencies",
      "fix_command": "npm install nanoid --save"
    }
  ]
}
```

---

## Performance Notes

**Optimization strategies:**

1. **Parallel execution:** Run tsc --noEmit and npm run build in parallel (saves ~30s)
2. **Incremental builds:** Use tsc --incremental for faster type checking
3. **Caching:** Cache node_modules in CI (saves 1-2 min on fresh builds)
4. **Skip source maps in dev:** Generate maps only for production builds

**Typical execution times:**

| Project Size | Time |
|-------------|------|
| Small (<10K lines) | 15-30s |
| Medium (10K-50K lines) | 30-60s |
| Large (>50K lines) | 60-120s |

---

## Integration with Main Orchestrator

**Called from SKILL.md Step 4:**

```javascript
// Load this file
# Integration: ./scripts/run-pre-deploy-checks.sh --json | jq .status

// Aggregate results
if (results.errors.some(e => e.severity === 'CRITICAL')) {
  console.log('❌ DEPLOYMENT BLOCKED: Build verification failed')
  process.exit(1)
}
```

---

## Historical Context (Why Each Check Exists)

**Check 1 (TypeScript):** Catches type errors before runtime  
**Check 2 (TS/JS mismatch):** **2026-03-01 production incident** — THE critical check  
**Check 3 (Production build):** Ensures code actually bundles correctly  
**Check 4 (Console errors):** Catches soft failures that break prod  
**Check 5 (Dependencies):** Prevents missing package.json entries  
**Check 6 (Build output):** Ensures build artifacts are valid  
**Check 7 (Source maps):** Enables production debugging  
**Check 8 (Tree-shaking):** Optimizes bundle size  

---

**Status:** Production ready — Would have caught 2026-03-01 failure ✅

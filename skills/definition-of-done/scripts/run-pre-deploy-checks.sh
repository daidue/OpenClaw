#!/bin/bash

###############################################################################
# Pre-Deploy Checks Script v1.1.0
# Production-ready pre-deployment automation
# Runs 25 automated checks with --json and --fix modes
# Exit 0 = PASS (safe to deploy), Exit 1 = FAIL (blocked), Exit 2 = WARN
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

# Portable timeout wrapper
if command -v timeout >/dev/null 2>&1; then
  TIMEOUT_CMD="timeout"
elif command -v gtimeout >/dev/null 2>&1; then
  TIMEOUT_CMD="gtimeout"
else
  _timeout_fallback() {
    local secs=$1; shift
    "$@" &
    local pid=$!
    ( sleep "$secs"; kill "$pid" 2>/dev/null ) &
    local watcher=$!
    wait "$pid" 2>/dev/null
    local ret=$?
    kill "$watcher" 2>/dev/null 2>&1
    wait "$watcher" 2>/dev/null 2>&1
    if [ $ret -eq 137 ] || [ $ret -eq 143 ]; then return 124; fi
    return $ret
  }
  TIMEOUT_CMD="_timeout_fallback"
fi

###############################################################################
# FLAG PARSING
###############################################################################

JSON_OUTPUT=false
FIX_MODE=false
DRY_RUN=false
ENVIRONMENT=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --json) JSON_OUTPUT=true; shift ;;
    --fix) FIX_MODE=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --env) ENVIRONMENT="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: run-pre-deploy-checks.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --json       Output results as JSON (for CI/CD)"
      echo "  --fix        Auto-fix common issues before checking"
      echo "  --dry-run    Show what --fix would change without modifying files"
      echo "  --env ENV    Override environment (dev|staging|production)"
      echo "  -h, --help   Show this help"
      echo ""
      echo "Exit codes: 0=PASS  1=FAIL  2=WARN"
      exit 0
      ;;
    *) shift ;;
  esac
done

###############################################################################
# STATE
###############################################################################

CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0
CHECKS_RUN=0
CHECKS_PASSED=0
CHECKS_FAILED=0
START_TIME=$(date +%s)
ISSUES=()
FIX_COUNT=0

DOD_TMPDIR=$(mktemp -d)
trap "rm -rf $DOD_TMPDIR" EXIT

add_issue() {
  local severity=$1 check=$2 file=${3:-""} line=${4:-0} message=$5 fix=${6:-""}
  message=$(echo "$message" | sed 's/"/\\"/g' | tr '\n' ' ')
  fix=$(echo "$fix" | sed 's/"/\\"/g' | tr '\n' ' ')
  file=$(echo "$file" | sed 's/"/\\"/g')
  ISSUES+=("{\"severity\":\"$severity\",\"check\":\"$check\",\"file\":\"$file\",\"line\":$line,\"message\":\"$message\",\"fix\":\"$fix\"}")
}

log()  { [ "$JSON_OUTPUT" != true ] && echo "$@"; }
logn() { [ "$JSON_OUTPUT" != true ] && echo -n "$@"; }
loge() { [ "$JSON_OUTPUT" != true ] && echo -e "$@"; }

###############################################################################
# ENVIRONMENT DETECTION
###############################################################################

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

if [ -n "$ENVIRONMENT" ]; then
  CRITICALITY=$(echo "$ENVIRONMENT" | tr '[:lower:]' '[:upper:]')
  [[ "$CRITICALITY" == "DEV" ]] && CRITICALITY="DEVELOPMENT"
elif [[ "$BRANCH" == "main" || "$BRANCH" == "production" ]]; then
  CRITICALITY="PRODUCTION"
elif [[ "$BRANCH" == "staging" || "$BRANCH" == "develop" ]]; then
  CRITICALITY="STAGING"
else
  CRITICALITY="DEVELOPMENT"
fi

###############################################################################
# AUTO-FIX MODE
###############################################################################

if [ "$FIX_MODE" = true ]; then
  loge ""
  loge "${BOLD}================================${NC}"
  loge "${BOLD}  AUTO-FIX MODE${NC}"
  [ "$DRY_RUN" = true ] && loge "${YELLOW}  (DRY RUN — no files modified)${NC}"
  loge "${BOLD}================================${NC}"
  loge ""

  if [ -d "src" ]; then
    # Fix 1: Remove .ts/.tsx extensions from imports in .js/.jsx files
    loge "🔧 Fixing .ts/.tsx extensions in imports..."
    find src/ -name "*.js" -o -name "*.jsx" 2>/dev/null | while read file; do
      if grep -qE "(from|import\(|require\()[[:space:]]*['\"].*\.tsx?['\"]" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" = true ]; then
          loge "  Would fix: $file"
        else
          sed -i.bak -E "s/(from|import\(|require\()([[:space:]]*['\"][^'\"]+)\.tsx?(['\"])/\1\2\3/g" "$file"
          rm -f "$file.bak"
          loge "  ${GREEN}✅ Fixed: $file${NC}"
        fi
        FIX_COUNT=$((FIX_COUNT + 1))
      fi
    done

    # Fix 2: Remove console.log statements (skip test files)
    loge "🔧 Removing console.log statements..."
    find src/ \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read file; do
      [[ "$file" =~ \.test\. ]] && continue
      [[ "$file" =~ \.spec\. ]] && continue
      [[ "$file" =~ __test__ ]] && continue
      if grep -q "console\.log" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" = true ]; then
          count=$(grep -c "console\.log" "$file")
          loge "  Would remove $count console.log(s) from: $file"
        else
          sed -i.bak '/console\.log/d' "$file"
          rm -f "$file.bak"
          loge "  ${GREEN}✅ Removed console.log: $file${NC}"
        fi
        FIX_COUNT=$((FIX_COUNT + 1))
      fi
    done

    # Fix 3: Remove trailing whitespace
    loge "🔧 Removing trailing whitespace..."
    find src/ \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | while read file; do
      if grep -q '[[:space:]]$' "$file" 2>/dev/null; then
        if [ "$DRY_RUN" = true ]; then
          loge "  Would fix: $file"
        else
          sed -i.bak 's/[[:space:]]*$//' "$file"
          rm -f "$file.bak"
          loge "  ${GREEN}✅ Fixed: $file${NC}"
        fi
        FIX_COUNT=$((FIX_COUNT + 1))
      fi
    done
  fi

  # Fix 4: ESLint --fix
  if [ -f ".eslintrc" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f ".eslintrc.yml" ] || [ -f "eslint.config.js" ] || [ -f "eslint.config.mjs" ]; then
    loge "🔧 Running ESLint auto-fix..."
    if [ "$DRY_RUN" = true ]; then
      loge "  Would run: npx eslint src/ --fix"
    else
      npx eslint src/ --ext .js,.jsx,.ts,.tsx --fix 2>/dev/null || loge "  Some ESLint issues remain"
    fi
    FIX_COUNT=$((FIX_COUNT + 1))
  fi

  # Fix 5: Format package.json
  if [ -f "package.json" ] && command -v jq &>/dev/null; then
    loge "🔧 Formatting package.json..."
    if [ "$DRY_RUN" = true ]; then
      loge "  Would sort and format package.json"
    else
      jq --sort-keys --indent 2 '.' package.json > "$DOD_TMPDIR/pkg.tmp" 2>/dev/null
      if [ $? -eq 0 ] && [ -s "$DOD_TMPDIR/pkg.tmp" ]; then
        mv "$DOD_TMPDIR/pkg.tmp" package.json
        loge "  ${GREEN}✅ Formatted package.json${NC}"
      fi
    fi
    FIX_COUNT=$((FIX_COUNT + 1))
  fi

  loge ""
  if [ "$DRY_RUN" = true ]; then
    loge "${YELLOW}Dry run complete. Run without --dry-run to apply fixes.${NC}"
    exit 0
  else
    loge "${GREEN}✅ Auto-fixes applied. Re-running checks...${NC}"
    loge ""
    RERUN_ARGS=()
    [ "$JSON_OUTPUT" = true ] && RERUN_ARGS+=(--json)
    [ -n "$ENVIRONMENT" ] && RERUN_ARGS+=(--env "$ENVIRONMENT")
    exec "$0" "${RERUN_ARGS[@]}"
  fi
fi

###############################################################################
# HEADER
###############################################################################

log "======================================"
log "Definition of Done - Pre-Deploy Checks"
log "======================================"
log "Branch: $BRANCH"
log "Criticality: $CRITICALITY"
log "Started: $(date)"
log ""

###############################################################################
# QUICK FAIL GATES (Checks 1-4)
###############################################################################

log "Running quick fail gates..."

# Gate 1: Clean working directory
if ! git diff --quiet 2>/dev/null; then
  loge "${RED}❌ BLOCKED: Uncommitted changes detected${NC}"
  [ "$JSON_OUTPUT" != true ] && git status --short
  log "Fix: git add . && git commit OR git stash"
  add_issue "CRITICAL" "clean-workdir" "" 0 "Uncommitted changes" "git add . && git commit OR git stash"
  CRITICAL_COUNT=$((CRITICAL_COUNT + 1)); CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  [ "$JSON_OUTPUT" != true ] && exit 1
else
  log "✓ Working directory clean"
  CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# Gate 2: No merge conflicts
if git ls-files -u 2>/dev/null | grep -q '^'; then
  loge "${RED}❌ BLOCKED: Merge conflicts detected${NC}"
  add_issue "CRITICAL" "merge-conflicts" "" 0 "Merge conflicts" "Resolve conflicts, git add, git commit"
  CRITICAL_COUNT=$((CRITICAL_COUNT + 1)); CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  [ "$JSON_OUTPUT" != true ] && exit 1
else
  log "✓ No merge conflicts"
  CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# Gate 3: node_modules exists
if [ ! -d "node_modules" ]; then
  loge "${RED}❌ BLOCKED: node_modules missing${NC}"
  add_issue "CRITICAL" "node-modules" "" 0 "node_modules missing" "npm install"
  CRITICAL_COUNT=$((CRITICAL_COUNT + 1)); CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  [ "$JSON_OUTPUT" != true ] && exit 1
else
  log "✓ node_modules installed"
  CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# Gate 4: Package lock sync
if ! npm ls --depth=0 >/dev/null 2>&1; then
  loge "${RED}❌ BLOCKED: package.json out of sync${NC}"
  add_issue "CRITICAL" "package-lock" "" 0 "package.json out of sync with lock file" "rm -rf node_modules package-lock.json && npm install"
  CRITICAL_COUNT=$((CRITICAL_COUNT + 1)); CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  [ "$JSON_OUTPUT" != true ] && exit 1
else
  log "✓ Package lock in sync"
  CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# If gates failed in JSON mode, skip to output
if [ "$JSON_OUTPUT" = true ] && [ $CRITICAL_COUNT -gt 0 ]; then
  :
else

log ""

###############################################################################
# BUILD VERIFICATION (Checks 5-8)
###############################################################################

log "Running build verification..."

# Check 5: TS/JS Import Mismatch
logn "  Checking TS/JS import mismatches... "
ts_imports=$(grep -rE "(from|import\(|require\()[[:space:]]*['\"].*\.tsx?['\"]" --include="*.js" --include="*.jsx" src/ 2>/dev/null | grep -v node_modules || true)
if [ -n "$ts_imports" ]; then
  loge "${RED}FAIL${NC}"
  [ "$JSON_OUTPUT" != true ] && echo "$ts_imports"
  add_issue "CRITICAL" "ts-js-mismatch" "" 0 "TS/JS import mismatch - breaks production bundler" "Remove .ts/.tsx extensions or run --fix"
  CRITICAL_COUNT=$((CRITICAL_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
else
  loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 6: TypeScript compilation
logn "  Checking TypeScript compilation... "
if [ -f "tsconfig.json" ]; then
  if $TIMEOUT_CMD 30 npx tsc --noEmit --skipLibCheck >"$DOD_TMPDIR/tsc.txt" 2>&1; then
    loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    tsc_exit=$?
    [ $tsc_exit -eq 124 ] && msg="TypeScript timed out (30s)" || msg="TypeScript compilation errors"
    loge "${RED}FAIL${NC}"
    [ "$JSON_OUTPUT" != true ] && [ $tsc_exit -ne 124 ] && head -20 "$DOD_TMPDIR/tsc.txt"
    add_issue "CRITICAL" "typescript" "" 0 "$msg" "npx tsc --noEmit"
    CRITICAL_COUNT=$((CRITICAL_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  fi
else
  loge "${GREEN}SKIP (no tsconfig)${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 7: Production build
logn "  Running production build... "
if $TIMEOUT_CMD 120 npm run build >"$DOD_TMPDIR/build.txt" 2>"$DOD_TMPDIR/build-err.txt"; then
  loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  build_exit=$?
  [ $build_exit -eq 124 ] && msg="Build timed out (120s)" || msg="Production build failed"
  loge "${RED}FAIL${NC}"
  [ "$JSON_OUTPUT" != true ] && [ $build_exit -ne 124 ] && tail -20 "$DOD_TMPDIR/build-err.txt"
  add_issue "CRITICAL" "build" "" 0 "$msg" "npm run build"
  CRITICAL_COUNT=$((CRITICAL_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 8: Build error detection
logn "  Checking build output errors... "
if grep -i "error" "$DOD_TMPDIR/build-err.txt" 2>/dev/null | grep -v "0 errors" | grep -q .; then
  loge "${RED}FAIL${NC}"
  add_issue "HIGH" "build-errors" "" 0 "Errors in build output" "Review build errors"
  HIGH_COUNT=$((HIGH_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
else
  loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

log ""

###############################################################################
# CODE QUALITY (Checks 9-12)
###############################################################################

log "Running code quality checks..."

# Check 9: ESLint
logn "  Running ESLint... "
if $TIMEOUT_CMD 60 npx eslint . --max-warnings 0 >/dev/null 2>"$DOD_TMPDIR/eslint.txt"; then
  loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  eslint_exit=$?
  [ $eslint_exit -eq 124 ] && msg="ESLint timed out" || msg="ESLint errors"
  loge "${YELLOW}WARN${NC}"
  [ "$JSON_OUTPUT" != true ] && head -10 "$DOD_TMPDIR/eslint.txt"
  add_issue "HIGH" "eslint" "" 0 "$msg" "npx eslint . --fix"
  HIGH_COUNT=$((HIGH_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 10: Test suite
logn "  Running test suite... "
if $TIMEOUT_CMD 60 npm test >/dev/null 2>"$DOD_TMPDIR/test.txt"; then
  loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  test_exit=$?
  [ $test_exit -eq 124 ] && msg="Tests timed out" || msg="Tests failing"
  loge "${RED}FAIL${NC}"
  [ "$JSON_OUTPUT" != true ] && tail -20 "$DOD_TMPDIR/test.txt"
  add_issue "CRITICAL" "tests" "" 0 "$msg" "npm test"
  CRITICAL_COUNT=$((CRITICAL_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 11: Console.log detection
logn "  Checking console.log... "
if [ -d "src" ]; then
  console_logs=$(grep -r "console\.log" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ 2>/dev/null | grep -v "// @debug" | grep -v node_modules | wc -l | tr -d ' ')
  if [ "$console_logs" -gt 0 ]; then
    loge "${YELLOW}WARN${NC}"
    add_issue "MEDIUM" "console-log" "" 0 "$console_logs console.log statements" "Remove or run --fix"
    MEDIUM_COUNT=$((MEDIUM_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  else
    loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  fi
else
  loge "${GREEN}SKIP${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 12: npm audit
logn "  Checking security vulnerabilities... "
audit_output=$(npm audit --json 2>/dev/null || true)
critical_vulns=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
high_vulns=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")
if [ "$critical_vulns" -gt 0 ]; then
  loge "${RED}FAIL${NC}"
  add_issue "HIGH" "npm-audit" "" 0 "$critical_vulns critical vulnerabilities" "npm audit fix"
  HIGH_COUNT=$((HIGH_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
elif [ "$high_vulns" -gt 0 ]; then
  loge "${YELLOW}WARN${NC}"
  add_issue "MEDIUM" "npm-audit" "" 0 "$high_vulns high vulnerabilities" "npm audit fix"
  MEDIUM_COUNT=$((MEDIUM_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
else
  loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

log ""

###############################################################################
# PRODUCTION/STAGING CHECKS (Checks 13-14)
###############################################################################

if [[ "$CRITICALITY" == "PRODUCTION" || "$CRITICALITY" == "STAGING" ]]; then
  log "Running production/staging checks..."

  # Check 13: CHANGELOG entry (H4 fix: compare against last tag)
  logn "  Checking CHANGELOG entry... "
  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  if [ -n "$LAST_TAG" ]; then
    if git diff "$LAST_TAG"..HEAD -- CHANGELOG.md 2>/dev/null | grep -q "^+"; then
      loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
      loge "${YELLOW}WARN${NC}"
      add_issue "MEDIUM" "changelog" "CHANGELOG.md" 0 "No CHANGELOG update since $LAST_TAG" "Add changelog entry"
      MEDIUM_COUNT=$((MEDIUM_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
  else
    if [ -f "CHANGELOG.md" ]; then
      loge "${GREEN}PASS (no tags)${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
      loge "${YELLOW}WARN${NC}"
      add_issue "MEDIUM" "changelog" "" 0 "No CHANGELOG.md" "Create CHANGELOG.md"
      MEDIUM_COUNT=$((MEDIUM_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
  fi
  CHECKS_RUN=$((CHECKS_RUN + 1))

  # Check 14: Database migration sync
  if [ -d "prisma" ]; then
    logn "  Checking database migration sync... "
    LAST_TAG_OR_HEAD=${LAST_TAG:-"HEAD~1"}
    if git diff "$LAST_TAG_OR_HEAD"..HEAD -- prisma/schema.prisma 2>/dev/null | grep -q "^+"; then
      latest_migration=$(ls -t prisma/migrations 2>/dev/null | head -n 1)
      if [ -z "$latest_migration" ]; then
        loge "${RED}FAIL${NC}"
        add_issue "CRITICAL" "db-migration" "prisma/schema.prisma" 0 "Schema changed, no migration" "npx prisma migrate dev --name desc"
        CRITICAL_COUNT=$((CRITICAL_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
      else
        loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
      fi
    else
      loge "${GREEN}PASS (no schema changes)${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
    fi
    CHECKS_RUN=$((CHECKS_RUN + 1))
  fi

  log ""
fi

###############################################################################
# ADVANCED CHECKS (Checks 15-25)
###############################################################################

log "Running advanced checks..."

# Check 15: Trailing whitespace
logn "  Checking trailing whitespace... "
if [ -d "src" ]; then
  ws_files=$(grep -rl '[[:space:]]$' --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ 2>/dev/null | wc -l | tr -d ' ')
  if [ "$ws_files" -gt 0 ]; then
    loge "${YELLOW}WARN${NC}"
    add_issue "LOW" "trailing-ws" "" 0 "$ws_files files with trailing whitespace" "Run --fix"
    LOW_COUNT=$((LOW_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  else
    loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  fi
else
  loge "${GREEN}SKIP${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 16: TODO/FIXME count
logn "  Checking TODO/FIXME... "
if [ -d "src" ]; then
  todo_count=$(grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
  if [ "$todo_count" -gt 20 ]; then
    loge "${YELLOW}WARN${NC}"
    add_issue "LOW" "todo-fixme" "" 0 "$todo_count TODO/FIXME comments" "Review before shipping"
    LOW_COUNT=$((LOW_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  else
    loge "${GREEN}PASS ($todo_count)${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  fi
else
  loge "${GREEN}SKIP${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 17: Large files (>100KB source)
logn "  Checking large files... "
large_files=$(find . -not -path './node_modules/*' -not -path './.git/*' -not -path './dist/*' -not -path './build/*' -not -path './.next/*' \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -size +100k 2>/dev/null | wc -l | tr -d ' ')
if [ "$large_files" -gt 0 ]; then
  loge "${YELLOW}WARN${NC}"
  add_issue "MEDIUM" "large-files" "" 0 "$large_files source files >100KB" "Split large files"
  MEDIUM_COUNT=$((MEDIUM_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
else
  loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 18: .env not in git
logn "  Checking .env not committed... "
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  loge "${RED}FAIL${NC}"
  add_issue "CRITICAL" "env-committed" ".env" 0 ".env tracked in git - secrets exposed" "git rm --cached .env && add to .gitignore"
  CRITICAL_COUNT=$((CRITICAL_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
else
  loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 19: Circular dependencies
logn "  Checking circular dependencies... "
if command -v madge &>/dev/null && [ -d "src" ]; then
  circ_output=$($TIMEOUT_CMD 30 madge --circular src/ --extensions js,jsx,ts,tsx 2>/dev/null || true)
  if echo "$circ_output" | grep -qi "circular\|Found [1-9]"; then
    loge "${RED}FAIL${NC}"
    add_issue "HIGH" "circular-deps" "" 0 "Circular dependencies detected" "madge --circular src/"
    HIGH_COUNT=$((HIGH_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  else
    loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  fi
else
  loge "${YELLOW}SKIP (madge not installed)${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 20: Duplicate code
logn "  Checking duplicate code... "
if command -v jscpd &>/dev/null && [ -d "src" ]; then
  jscpd_out=$($TIMEOUT_CMD 30 jscpd src/ --threshold 5 --silent 2>/dev/null || true)
  if echo "$jscpd_out" | grep -qi "duplicat"; then
    loge "${YELLOW}WARN${NC}"
    add_issue "MEDIUM" "duplicate-code" "" 0 "Duplicate code >5%" "jscpd src/ --threshold 5"
    MEDIUM_COUNT=$((MEDIUM_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  else
    loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  fi
else
  loge "${YELLOW}SKIP (jscpd not installed)${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 21: Unused exports
logn "  Checking unused exports... "
if command -v ts-prune &>/dev/null && [ -f "tsconfig.json" ]; then
  unused=$($TIMEOUT_CMD 30 ts-prune 2>/dev/null | grep -v "used in module" | wc -l | tr -d ' ')
  if [ "$unused" -gt 10 ]; then
    loge "${YELLOW}WARN${NC}"
    add_issue "MEDIUM" "dead-code" "" 0 "$unused unused exports" "ts-prune"
    MEDIUM_COUNT=$((MEDIUM_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  else
    loge "${GREEN}PASS ($unused)${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  fi
else
  loge "${YELLOW}SKIP (ts-prune not installed)${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 22: Environment variable docs
logn "  Validating env var docs... "
if [ -d "src" ] && [ -f ".env.example" ]; then
  REQUIRED_VARS=$(grep -roh "process\.env\.[A-Z_]*" src/ 2>/dev/null | sort -u | sed 's/process\.env\.//' || true)
  MISSING=""
  for var in $REQUIRED_VARS; do
    [ -z "$var" ] && continue
    grep -q "^${var}=" .env.example 2>/dev/null || grep -q "^#.*${var}" .env.example 2>/dev/null || MISSING="$MISSING $var"
  done
  if [ -n "$MISSING" ]; then
    loge "${YELLOW}WARN${NC}"
    add_issue "MEDIUM" "env-docs" ".env.example" 0 "Undocumented env vars:$MISSING" "Add to .env.example"
    MEDIUM_COUNT=$((MEDIUM_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  else
    loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  fi
else
  loge "${GREEN}SKIP${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 23: Bundle size
logn "  Checking bundle size... "
BUILD_DIR=""
[ -d "dist" ] && BUILD_DIR="dist"
[ -d "build" ] && BUILD_DIR="build"
[ -d ".next" ] && BUILD_DIR=".next"
if [ -n "$BUILD_DIR" ]; then
  TOTAL_KB=$(du -sk "$BUILD_DIR" 2>/dev/null | cut -f1)
  TOTAL_SIZE=$(du -sh "$BUILD_DIR" 2>/dev/null | cut -f1)
  if [ "$TOTAL_KB" -gt 51200 ]; then
    loge "${YELLOW}WARN${NC}"
    add_issue "MEDIUM" "bundle-size" "$BUILD_DIR" 0 "Bundle $TOTAL_SIZE (>50MB)" "Code splitting / tree shaking"
    MEDIUM_COUNT=$((MEDIUM_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  else
    loge "${GREEN}PASS ($TOTAL_SIZE)${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  fi
else
  loge "${GREEN}SKIP (no build dir)${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 24: SQL injection risks
logn "  Checking SQL injection risks... "
if [ -d "src" ]; then
  raw_sql=$(grep -rn 'query\s*(\s*[`'"'"'"].*\${' --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
  if [ "$raw_sql" -gt 0 ]; then
    loge "${RED}FAIL${NC}"
    add_issue "HIGH" "sql-injection" "" 0 "$raw_sql potential SQL injection points" "Use parameterized queries"
    HIGH_COUNT=$((HIGH_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  else
    loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  fi
else
  loge "${GREEN}SKIP${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 25: XSS prevention
logn "  Checking XSS risks... "
if [ -d "src" ]; then
  xss=$(grep -rn "dangerouslySetInnerHTML\|v-html\|innerHTML\s*=" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
  if [ "$xss" -gt 0 ]; then
    loge "${YELLOW}WARN${NC}"
    add_issue "HIGH" "xss" "" 0 "$xss potential XSS vectors" "Sanitize with DOMPurify"
    HIGH_COUNT=$((HIGH_COUNT + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  else
    loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  fi
else
  loge "${GREEN}SKIP${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

log ""

fi # end non-gate-failure block

###############################################################################
# DECISION LOGIC (H5: broadened WARN conditions)
###############################################################################

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

EXIT_CODE=0
STATUS="PASS"

if [ $CRITICAL_COUNT -gt 0 ]; then
  STATUS="FAIL"; EXIT_CODE=1
elif [[ "$CRITICALITY" == "PRODUCTION" && $HIGH_COUNT -gt 0 ]]; then
  STATUS="FAIL"; EXIT_CODE=1
elif [[ "$CRITICALITY" == "PRODUCTION" && $MEDIUM_COUNT -gt 3 ]]; then
  STATUS="WARN"; EXIT_CODE=2
elif [[ "$CRITICALITY" == "STAGING" && $HIGH_COUNT -gt 3 ]]; then
  STATUS="FAIL"; EXIT_CODE=1
elif [[ "$CRITICALITY" == "STAGING" && ( $HIGH_COUNT -gt 0 || $MEDIUM_COUNT -gt 2 ) ]]; then
  STATUS="WARN"; EXIT_CODE=2
elif [[ "$CRITICALITY" == "DEVELOPMENT" && ( $HIGH_COUNT -gt 0 || $MEDIUM_COUNT -gt 0 ) ]]; then
  STATUS="WARN"; EXIT_CODE=2
fi

###############################################################################
# JSON OUTPUT
###############################################################################

if [ "$JSON_OUTPUT" = true ]; then
  ISSUES_JSON="["
  for i in "${!ISSUES[@]}"; do
    [ $i -gt 0 ] && ISSUES_JSON+=","
    ISSUES_JSON+="${ISSUES[$i]}"
  done
  ISSUES_JSON+="]"

  cat << JSONEOF
{
  "status": "$STATUS",
  "exitCode": $EXIT_CODE,
  "environment": "$CRITICALITY",
  "branch": "$BRANCH",
  "checksRun": $CHECKS_RUN,
  "checksPassed": $CHECKS_PASSED,
  "checksFailed": $CHECKS_FAILED,
  "counts": {
    "critical": $CRITICAL_COUNT,
    "high": $HIGH_COUNT,
    "medium": $MEDIUM_COUNT,
    "low": $LOW_COUNT
  },
  "issues": $ISSUES_JSON,
  "executionTime": "${DURATION}s",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "1.1.0"
}
JSONEOF
  exit $EXIT_CODE
fi

###############################################################################
# COLORIZED OUTPUT
###############################################################################

echo "======================================"
echo "Pre-Deploy Checks Complete"
echo "======================================"
echo "Duration: ${DURATION}s"
echo "Checks: $CHECKS_RUN run | $CHECKS_PASSED passed | $CHECKS_FAILED failed"
echo ""
echo "Results:"
echo -e "  ${RED}CRITICAL: $CRITICAL_COUNT${NC}"
echo -e "  ${RED}HIGH: $HIGH_COUNT${NC}"
echo -e "  ${YELLOW}MEDIUM: $MEDIUM_COUNT${NC}"
echo -e "  LOW: $LOW_COUNT"
echo ""

case $STATUS in
  FAIL)
    echo -e "${RED}❌ DEPLOYMENT BLOCKED${NC}"
    echo ""
    echo "Fix critical/high issues before deploying."
    echo "Tip: Run with --fix to auto-fix common issues."
    echo ""
    echo "DO NOT DEPLOY until issues are resolved."
    ;;
  WARN)
    echo -e "${YELLOW}⚠️  DEPLOYMENT ALLOWED (with warnings)${NC}"
    echo ""
    echo "Review warnings before production push."
    echo "Tip: Run with --fix to auto-fix common issues."
    ;;
  PASS)
    echo -e "${GREEN}✅ DEPLOYMENT READY${NC}"
    echo ""
    echo "All checks passed. Safe to deploy."
    ;;
esac

echo ""
exit $EXIT_CODE

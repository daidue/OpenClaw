#!/bin/bash

###############################################################################
# Pre-Deploy Checks Script v1.0.1
# Runs deployment readiness verification (14 automated checks)
# Exit 0 = PASS (safe to deploy), Exit 1 = FAIL (blocked), Exit 2 = WARN
###############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Portable timeout wrapper (macOS lacks `timeout`, Linux has it)
if command -v timeout >/dev/null 2>&1; then
  TIMEOUT_CMD="timeout"
elif command -v gtimeout >/dev/null 2>&1; then
  TIMEOUT_CMD="gtimeout"
else
  # Pure bash fallback: run command with background kill timer
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
    # If killed by our timer, return 124 (same as GNU timeout)
    if [ $ret -eq 137 ] || [ $ret -eq 143 ]; then
      return 124
    fi
    return $ret
  }
  TIMEOUT_CMD="_timeout_fallback"
fi

# Counters
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0
CHECKS_RUN=0
START_TIME=$(date +%s)

# Temp directory for intermediate files (cleaned up on exit)
DOD_TMPDIR=$(mktemp -d)
trap "rm -rf $DOD_TMPDIR" EXIT

# Environment detection
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
if [[ "$BRANCH" == "main" || "$BRANCH" == "production" ]]; then
  CRITICALITY="PRODUCTION"
elif [[ "$BRANCH" == "staging" || "$BRANCH" == "develop" ]]; then
  CRITICALITY="STAGING"
else
  CRITICALITY="DEVELOPMENT"
fi

echo "======================================"
echo "Definition of Done - Pre-Deploy Checks"
echo "======================================"
echo "Branch: $BRANCH"
echo "Criticality: $CRITICALITY"
echo "Started: $(date)"
echo ""

###############################################################################
# QUICK FAIL GATES (Run First - <10 seconds)
###############################################################################

echo "Running quick fail gates..."

# Gate 1: Clean working directory
if ! git diff --quiet 2>/dev/null; then
  echo -e "${RED}❌ BLOCKED: Uncommitted changes detected${NC}"
  echo ""
  echo "You have uncommitted changes. Commit or stash first."
  echo ""
  git status --short
  echo ""
  echo "Fix: git add . && git commit OR git stash"
  exit 1
fi
echo "✓ Working directory clean"
CHECKS_RUN=$((CHECKS_RUN + 1))

# Gate 2: No merge conflicts
if git ls-files -u | grep -q '^'; then
  echo -e "${RED}❌ BLOCKED: Merge conflicts detected${NC}"
  echo ""
  echo "Resolve conflicts first, then re-run checks."
  echo ""
  git ls-files -u
  echo ""
  echo "Fix: Resolve conflicts, git add [file], git commit"
  exit 1
fi
echo "✓ No merge conflicts"
CHECKS_RUN=$((CHECKS_RUN + 1))

# Gate 3: node_modules exists
if [ ! -d "node_modules" ]; then
  echo -e "${RED}❌ BLOCKED: node_modules missing${NC}"
  echo ""
  echo "Fix: npm install"
  exit 1
fi
echo "✓ node_modules installed"
CHECKS_RUN=$((CHECKS_RUN + 1))

# Gate 4: Package lock sync
if ! npm ls --depth=0 >/dev/null 2>&1; then
  echo -e "${RED}❌ BLOCKED: package.json out of sync with package-lock.json${NC}"
  echo ""
  echo "Fix: rm -rf node_modules package-lock.json && npm install"
  exit 1
fi
echo "✓ Package lock in sync"
CHECKS_RUN=$((CHECKS_RUN + 1))

echo ""

###############################################################################
# BUILD VERIFICATION CHECKS
###############################################################################

echo "Running build verification checks..."

# Check 1: TS/JS Import Mismatch (CRITICAL - 2026-03-01 incident)
# Catches: from '...ts', import('...ts'), require('...ts')
echo -n "  Checking TS/JS import mismatches... "
ts_imports=$(grep -rE "(from|import\(|require\()[[:space:]]*['\"].*\.tsx?['\"]" --include="*.js" --include="*.jsx" src/ 2>/dev/null | grep -v node_modules || true)
if [ -n "$ts_imports" ]; then
  echo -e "${RED}FAIL${NC}"
  echo ""
  echo -e "${RED}CRITICAL: TS/JS import mismatch detected (2026-03-01 incident type)${NC}"
  echo ""
  echo "$ts_imports"
  echo ""
  echo "Impact: Will break production bundler (works locally, fails deployed)"
  echo "Fix: Remove .ts/.tsx extensions from imports in .js files"
  echo ""
  CRITICAL_COUNT=$((CRITICAL_COUNT + 1))
else
  echo -e "${GREEN}PASS${NC}"
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 2: TypeScript compilation
echo -n "  Checking TypeScript compilation... "
if $TIMEOUT_CMD 30 npx tsc --noEmit --skipLibCheck >"$DOD_TMPDIR/tsc-errors.txt" 2>&1; then
  echo -e "${GREEN}PASS${NC}"
else
  tsc_exit=$?
  if [ $tsc_exit -eq 124 ]; then
    echo -e "${RED}FAIL${NC}"
    echo ""
    echo -e "${RED}CRITICAL: TypeScript check timed out (30s limit)${NC}"
  else
    echo -e "${RED}FAIL${NC}"
    echo ""
    echo -e "${RED}CRITICAL: TypeScript compilation errors${NC}"
    cat "$DOD_TMPDIR/tsc-errors.txt"
  fi
  echo ""
  CRITICAL_COUNT=$((CRITICAL_COUNT + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 3: Production build
echo -n "  Running production build... "
if $TIMEOUT_CMD 120 npm run build >"$DOD_TMPDIR/build-output.txt" 2>"$DOD_TMPDIR/build-errors.txt"; then
  echo -e "${GREEN}PASS${NC}"

  # Check build output exists
  if [ ! -d "dist" ] && [ ! -d "build" ] && [ ! -d ".next" ]; then
    echo -e "${RED}FAIL${NC}"
    echo ""
    echo -e "${RED}CRITICAL: Build output directory not created${NC}"
    CRITICAL_COUNT=$((CRITICAL_COUNT + 1))
  fi
else
  build_exit=$?
  if [ $build_exit -eq 124 ]; then
    echo -e "${RED}FAIL${NC}"
    echo ""
    echo -e "${RED}CRITICAL: Production build timed out (120s limit)${NC}"
  else
    echo -e "${RED}FAIL${NC}"
    echo ""
    echo -e "${RED}CRITICAL: Production build failed${NC}"
    cat "$DOD_TMPDIR/build-errors.txt"
  fi
  echo ""
  CRITICAL_COUNT=$((CRITICAL_COUNT + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 4: Console error detection
echo -n "  Checking for build errors... "
if grep -i "error" "$DOD_TMPDIR/build-errors.txt" 2>/dev/null | grep -v "0 errors" | grep -q .; then
  echo -e "${RED}FAIL${NC}"
  echo ""
  echo -e "${RED}HIGH: Console errors detected in build${NC}"
  grep -i "error" "$DOD_TMPDIR/build-errors.txt" | grep -v "0 errors"
  echo ""
  HIGH_COUNT=$((HIGH_COUNT + 1))
else
  echo -e "${GREEN}PASS${NC}"
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

echo ""

###############################################################################
# CODE QUALITY CHECKS
###############################################################################

echo "Running code quality checks..."

# Check 5: ESLint
echo -n "  Running ESLint... "
if $TIMEOUT_CMD 60 npx eslint . --max-warnings 0 >/dev/null 2>"$DOD_TMPDIR/eslint-errors.txt"; then
  echo -e "${GREEN}PASS${NC}"
else
  eslint_exit=$?
  if [ $eslint_exit -eq 124 ]; then
    echo -e "${YELLOW}WARN${NC}"
    echo ""
    echo -e "${YELLOW}HIGH: ESLint timed out (60s limit)${NC}"
  else
    echo -e "${YELLOW}WARN${NC}"
    echo ""
    echo -e "${YELLOW}HIGH: ESLint errors detected${NC}"
    head -n 20 "$DOD_TMPDIR/eslint-errors.txt"
  fi
  echo ""
  HIGH_COUNT=$((HIGH_COUNT + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 6: Test suite
echo -n "  Running test suite... "
if $TIMEOUT_CMD 60 npm test >/dev/null 2>"$DOD_TMPDIR/test-errors.txt"; then
  echo -e "${GREEN}PASS${NC}"
else
  test_exit=$?
  if [ $test_exit -eq 124 ]; then
    echo -e "${RED}FAIL${NC}"
    echo ""
    echo -e "${RED}CRITICAL: Tests timed out (60s limit)${NC}"
  else
    echo -e "${RED}FAIL${NC}"
    echo ""
    echo -e "${RED}CRITICAL: Tests failing${NC}"
    tail -n 30 "$DOD_TMPDIR/test-errors.txt"
  fi
  echo ""
  CRITICAL_COUNT=$((CRITICAL_COUNT + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 7: Console.log detection
echo -n "  Checking for console.log... "
console_logs=$(grep -r "console\.log" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ 2>/dev/null | grep -v "// @debug" | grep -v node_modules | wc -l | tr -d ' ')
if [ "$console_logs" -gt 0 ]; then
  echo -e "${YELLOW}WARN${NC}"
  echo ""
  echo -e "${YELLOW}MEDIUM: $console_logs console.log statements found${NC}"
  grep -r "console\.log" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ 2>/dev/null | grep -v "// @debug" | grep -v node_modules | head -n 5
  echo ""
  MEDIUM_COUNT=$((MEDIUM_COUNT + 1))
else
  echo -e "${GREEN}PASS${NC}"
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 8: npm audit (security vulnerabilities)
echo -n "  Checking for security vulnerabilities... "
audit_output=$(npm audit --json 2>/dev/null || true)
critical_vulns=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null || echo "0")
high_vulns=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null || echo "0")

if [ "$critical_vulns" -gt 0 ]; then
  echo -e "${RED}FAIL${NC}"
  echo ""
  echo -e "${RED}HIGH: $critical_vulns critical security vulnerabilities${NC}"
  echo "$audit_output" | jq -r '.vulnerabilities | to_entries[] | select(.value.severity == "critical") | .key' 2>/dev/null | head -n 5
  echo ""
  HIGH_COUNT=$((HIGH_COUNT + 1))
elif [ "$high_vulns" -gt 0 ]; then
  echo -e "${YELLOW}WARN${NC}"
  echo ""
  echo -e "${YELLOW}MEDIUM: $high_vulns high security vulnerabilities${NC}"
  MEDIUM_COUNT=$((MEDIUM_COUNT + 1))
else
  echo -e "${GREEN}PASS${NC}"
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

echo ""

###############################################################################
# PRODUCTION/STAGING ONLY CHECKS
###############################################################################

if [[ "$CRITICALITY" == "PRODUCTION" || "$CRITICALITY" == "STAGING" ]]; then
  echo "Running production/staging checks..."

  # Check 9: CHANGELOG entry
  echo -n "  Checking CHANGELOG entry... "
  if git diff main..HEAD -- CHANGELOG.md 2>/dev/null | grep -q "^+"; then
    echo -e "${GREEN}PASS${NC}"
  else
    echo -e "${YELLOW}WARN${NC}"
    echo ""
    echo -e "${YELLOW}MEDIUM: No CHANGELOG entry for this release${NC}"
    echo "Add entry documenting changes"
    echo ""
    MEDIUM_COUNT=$((MEDIUM_COUNT + 1))
  fi
  CHECKS_RUN=$((CHECKS_RUN + 1))

  # Check 10: Database migration sync (if Prisma exists)
  if [ -d "prisma" ]; then
    echo -n "  Checking database migration sync... "

    if git diff main..HEAD -- prisma/schema.prisma 2>/dev/null | grep -q "^+"; then
      latest_migration=$(ls -t prisma/migrations 2>/dev/null | head -n 1)

      if [ -z "$latest_migration" ]; then
        echo -e "${RED}FAIL${NC}"
        echo ""
        echo -e "${RED}CRITICAL: Schema changed but no migration found${NC}"
        echo "Generate migration: npx prisma migrate dev --name <description>"
        echo ""
        CRITICAL_COUNT=$((CRITICAL_COUNT + 1))
      else
        echo -e "${GREEN}PASS${NC}"
      fi
    else
      echo -e "${GREEN}PASS (no schema changes)${NC}"
    fi
    CHECKS_RUN=$((CHECKS_RUN + 1))
  fi

  echo ""
fi

###############################################################################
# FINAL RESULTS
###############################################################################

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "======================================"
echo "Pre-Deploy Checks Complete"
echo "======================================"
echo "Duration: ${DURATION}s"
echo "Checks run: $CHECKS_RUN (automated)"
echo ""
echo "Results:"
echo -e "  ${RED}CRITICAL: $CRITICAL_COUNT${NC}"
echo -e "  ${RED}HIGH: $HIGH_COUNT${NC}"
echo -e "  ${YELLOW}MEDIUM: $MEDIUM_COUNT${NC}"
echo -e "  LOW: $LOW_COUNT"
echo ""

# Decision logic
if [ $CRITICAL_COUNT -gt 0 ]; then
  echo -e "${RED}❌ DEPLOYMENT BLOCKED${NC}"
  echo ""
  echo "Critical issues detected. Fix these before deploying."
  echo ""
  echo "DO NOT DEPLOY until critical issues are resolved."
  exit 1
elif [[ "$CRITICALITY" == "PRODUCTION" && $HIGH_COUNT -gt 0 ]]; then
  echo -e "${RED}❌ DEPLOYMENT BLOCKED (PRODUCTION)${NC}"
  echo ""
  echo "High-severity issues detected. Fix these before deploying to production."
  echo ""
  exit 1
elif [ $HIGH_COUNT -gt 3 ] || [ $MEDIUM_COUNT -gt 5 ]; then
  echo -e "${YELLOW}⚠️  DEPLOYMENT ALLOWED (with warnings)${NC}"
  echo ""
  echo "Multiple warnings detected. Review recommended before production push."
  echo ""
  exit 2
else
  echo -e "${GREEN}✅ DEPLOYMENT READY${NC}"
  echo ""
  echo "All checks passed. Safe to deploy."
  echo ""
  exit 0
fi

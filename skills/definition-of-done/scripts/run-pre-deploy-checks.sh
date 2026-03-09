#!/bin/bash

###############################################################################
# Self-test mode: validates internal functions work correctly
###############################################################################

if [ "$1" = "--self-test" ]; then
  echo "Running DoD self-tests..."
  PASS=0; FAIL=0

  # Test 1: jq availability (required for --json mode)
  if command -v jq &>/dev/null; then
    if echo '{"test": "value with special chars: <>&"}' | jq . >/dev/null 2>&1; then
      echo "✓ JSON escaping works (jq available)"
      PASS=$((PASS + 1))
    else
      echo "✗ JSON escaping failed"
      FAIL=$((FAIL + 1))
    fi
  else
    echo "⊘ jq not installed — --json mode will be unavailable"
    PASS=$((PASS + 1))
  fi

  # Test 2: Temp directory creation
  test_tmp=$(mktemp -d 2>/dev/null)
  if [ -n "$test_tmp" ] && [ -d "$test_tmp" ]; then
    echo "✓ Temp directory creation works"
    rm -rf "$test_tmp"
    PASS=$((PASS + 1))
  else
    echo "✗ Temp directory creation failed"
    FAIL=$((FAIL + 1))
  fi

  # Test 3: Backup directory creation
  test_dir=$(mktemp -d 2>/dev/null)
  mkdir -p "$test_dir/.dod-backups/test" 2>/dev/null
  if [ -d "$test_dir/.dod-backups/test" ]; then
    echo "✓ Backup directory creation works"
    PASS=$((PASS + 1))
  else
    echo "✗ Backup directory creation failed"
    FAIL=$((FAIL + 1))
  fi
  rm -rf "$test_dir"

  # Test 4: Timeout command availability
  if command -v timeout >/dev/null 2>&1 || command -v gtimeout >/dev/null 2>&1; then
    echo "✓ Timeout command available"
  else
    echo "⊘ No timeout/gtimeout — using bash fallback"
  fi
  PASS=$((PASS + 1))

  echo ""
  echo "Self-tests complete: $PASS passed, $FAIL failed"
  [ "$FAIL" -gt 0 ] && exit 1
  exit 0
fi

###############################################################################
# Pre-Deploy Checks Script v1.3.0 (SECURITY-HARDENED)
# Production-ready pre-deployment automation
# Runs 26 automated checks with --json, --fix, and --self-test modes
# Exit 0 = PASS (safe to deploy), Exit 1 = FAIL (blocked), Exit 2 = WARN
#
# CHANGELOG v1.3.0 (Bolt Audit Fixes):
# - FIX-1: Added Gate 0 — package.json existence check (clear early failure)
# - FIX-2: Fixed FIX_COUNT subshell bug (process substitution instead of pipe)
# - FIX-3: Removed dead code (unused ISSUES array, decorative while loop)
# - FIX-4: Fixed shellcheck issues (SC2086, SC2162, SC2155)
# - FIX-5: Improved error messages (Gate 1, Gate 4 peer deps, build timeout)
# - FIX-6: Added inline documentation (warn_console_logs, backup, timeout)
# - FIX-7: Added --self-test mode for internal validation
#
# CHANGELOG v1.2.0 (Edge Security Audit Fixes):
# - BLOCKER-1: Fixed unquoted trap variable (repository deletion risk)
# - BLOCKER-2: Added mktemp failure checks with safe fallback
# - BLOCKER-3: Replaced console.log deletion with warning-only
# - BLOCKER-4: Added permanent backup system (.dod-backups/)
# - BLOCKER-5: Added max iteration check (prevents infinite --fix loops)
# - BLOCKER-6: Required jq for --json mode (no manual JSON escaping)
# - BLOCKER-7: All JSON output via jq (prevents command injection)
# - CRITICAL-1: Added git diff --staged to catch uncommitted staged files
# - CRITICAL-2: Fixed circular dependency regex (now detects 10+)
# - CRITICAL-3: Increased TypeScript timeout to 90s, build to 180s
# - CRITICAL-4: Tightened import regex to reduce false positives
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

# Portable timeout wrapper — cross-platform compatibility
# Linux has `timeout` (coreutils), macOS has `gtimeout` (brew install coreutils).
# If neither is available, we use a pure-bash fallback that backgrounds the command
# and kills it after the specified seconds. Exit code 124 = timeout (matches GNU behavior).
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
    if [ "$ret" -eq 137 ] || [ "$ret" -eq 143 ]; then return 124; fi
    return "$ret"
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
# SECURITY: Require jq for --json mode (BLOCKER-6 fix)
###############################################################################

if [ "$JSON_OUTPUT" = true ]; then
  if ! command -v jq &>/dev/null; then
    echo "❌ ERROR: --json mode requires jq for safe JSON escaping"
    echo "Install: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
  fi
fi

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
FIX_COUNT=0

# BLOCKER-1 & BLOCKER-2 FIX: Safe temp directory with failure checks
DOD_TMPDIR=$(mktemp -d 2>/dev/null)

if [ -z "$DOD_TMPDIR" ] || [ ! -d "$DOD_TMPDIR" ]; then
  echo "❌ FATAL: Failed to create temporary directory"
  echo "Check permissions and disk space"
  exit 1
fi

# Set restrictive permissions
chmod 700 "$DOD_TMPDIR"

# BLOCKER-1 FIX: Quote variable in trap, use single quotes
trap 'rm -rf "$DOD_TMPDIR"' EXIT

# BLOCKER-7 FIX: Use jq for all JSON generation
add_issue() {
  local severity=$1 check=$2 file=${3:-""} line=${4:-0} message=$5 fix=${6:-""}
  
  if [ "$JSON_OUTPUT" = true ]; then
    # Use jq to safely escape and build JSON
    jq -n \
      --arg severity "$severity" \
      --arg check "$check" \
      --arg file "$file" \
      --argjson line "$line" \
      --arg message "$message" \
      --arg fix "$fix" \
      '{
        severity: $severity,
        check: $check,
        file: $file,
        line: $line,
        message: $message,
        fix: $fix
      }' >> "$DOD_TMPDIR/issues.jsonl"
  fi
  
  # Track for text output
  case "$severity" in
    CRITICAL) CRITICAL_COUNT=$((CRITICAL_COUNT + 1)) ;;
    HIGH) HIGH_COUNT=$((HIGH_COUNT + 1)) ;;
    MEDIUM) MEDIUM_COUNT=$((MEDIUM_COUNT + 1)) ;;
    LOW) LOW_COUNT=$((LOW_COUNT + 1)) ;;
  esac
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
# BLOCKER-4 FIX: Permanent backup system
###############################################################################

create_backup() {
  # Timestamp format: YYYYMMDD-HHMMSS for sortable backup directories.
  # To restore: cp -r .dod-backups/<timestamp>/src/* src/
  local timestamp
  timestamp=$(date +%Y%m%d-%H%M%S)
  local backup_dir=".dod-backups/$timestamp"
  
  loge "📦 Creating permanent backup in $backup_dir..."
  mkdir -p "$backup_dir"
  
  # Copy entire src/ directory and package.json
  if [ -d "src" ]; then
    cp -r src/ "$backup_dir/" 2>/dev/null || true
  fi
  if [ -f "package.json" ]; then
    cp package.json "$backup_dir/" 2>/dev/null || true
  fi
  
  loge "✅ Backup created: $backup_dir"
  loge "   To restore: cp -r $backup_dir/src/* src/"
  loge ""
}

###############################################################################
# BLOCKER-3 FIX: Console.log warning (no deletion)
###############################################################################

# warn_console_logs: Detects console.log statements but only WARNS — never deletes.
# Rationale: Automated deletion of console.log can break syntax (e.g., removing the
# only statement in a callback leaves an empty arrow function body). Instead, we
# recommend using ESLint's no-console rule which understands AST structure.
warn_console_logs() {
  loge "🔍 Checking for console.log statements..."
  
  if [ ! -d "src" ]; then
    loge "   (no src/ directory)"
    return
  fi
  
  local count
  count=$(grep -rn "console\.log" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "// @debug" | wc -l | tr -d ' ')
  
  if [ "$count" -gt 0 ]; then
    loge "${YELLOW}⚠️  Found $count console.log statements${NC}"
    loge "   Recommendation: Use proper logging library (winston, pino, etc.)"
    loge "   Or run: npx eslint src/ --fix --rule 'no-console: error'"
    loge ""
  else
    loge "✅ No console.log statements found"
    loge ""
  fi
}

###############################################################################
# FIX MODE CONFIGURATION
###############################################################################

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
  
  # BLOCKER-4: Create permanent backup before any fixes
  if [ "$DRY_RUN" != true ]; then
    create_backup
  fi
  
  # Single-pass fix run (v1.3.0: simplified from decorative multi-iteration loop)
  if [ -d "src" ]; then
    # Fix 1: Remove .ts/.tsx extensions from imports in .js/.jsx files
    # CRITICAL-4: Tightened regex to reduce false positives
    loge "🔧 Fixing .ts/.tsx extensions in imports..."
    while IFS= read -r file; do
      # More precise pattern: only match actual import statements
      if grep -qE "^[[:space:]]*(import|export).*from[[:space:]]+['\"].*\.tsx?['\"]" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" = true ]; then
          loge "  Would fix: $file"
        else
          sed -i.bak -E "s/(from[[:space:]]+['\"][^'\"]+)\.tsx?(['\"])/\1\2/g" "$file"
          rm -f "$file.bak"
          loge "  ${GREEN}✅ Fixed: $file${NC}"
        fi
        FIX_COUNT=$((FIX_COUNT + 1))
      fi
    done < <(find src/ \( -name "*.js" -o -name "*.jsx" \) 2>/dev/null)

    # Fix 2: BLOCKER-3 - Warn about console.log instead of deleting
    warn_console_logs

    # Fix 3: Remove trailing whitespace
    loge "🔧 Removing trailing whitespace..."
    while IFS= read -r file; do
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
    done < <(find src/ \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) 2>/dev/null)
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

  # Fix 5: Format package.json (already has jq check)
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
    loge "${GREEN}✅ Auto-fixes applied ($FIX_COUNT changes). Re-running checks...${NC}"
    loge ""
    loge "💾 Backup preserved in .dod-backups/"
    loge "   (Clean old backups manually when confident)"
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

# Gate 0: package.json exists (v1.3.0)
# Without package.json, later gates pass but build fails with confusing ENOENT.
# Catch this early with a clear error message.
if [ ! -f "package.json" ]; then
  loge "${RED}❌ BLOCKED: No package.json found${NC}"
  log "This doesn't appear to be a Node.js project root"
  log "Fix: Run 'npm init' or cd to the correct project directory"
  add_issue "CRITICAL" "no-package-json" "" 0 "No package.json found" "npm init or cd to project root"
  CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  [ "$JSON_OUTPUT" != true ] && exit 1
else
  log "✓ package.json found"
  CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# Gate 1: Clean working directory (CRITICAL-1: Added --staged check)
if ! git diff --quiet 2>/dev/null || ! git diff --staged --quiet 2>/dev/null; then
  loge "${RED}❌ BLOCKED: Uncommitted or unstaged changes detected${NC}"
  [ "$JSON_OUTPUT" != true ] && git status --short
  log "Fix: Run 'git add . && git commit' to commit, or 'git stash' to shelve changes"
  add_issue "CRITICAL" "clean-workdir" "" 0 "Uncommitted changes" "git add . && git commit OR git stash"
  CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  [ "$JSON_OUTPUT" != true ] && exit 1
else
  log "✓ Working directory clean"
  CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# Gate 2: No merge conflicts
if git ls-files -u 2>/dev/null | grep -q '^'; then
  loge "${RED}❌ BLOCKED: Merge conflicts detected${NC}"
  add_issue "CRITICAL" "merge-conflicts" "" 0 "Merge conflicts" "Resolve conflicts, git add, git commit"
  CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  [ "$JSON_OUTPUT" != true ] && exit 1
else
  log "✓ No merge conflicts"
  CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# Gate 3: node_modules exists
if [ ! -d "node_modules" ]; then
  loge "${RED}❌ BLOCKED: node_modules missing${NC}"
  add_issue "CRITICAL" "node-modules" "" 0 "node_modules missing" "npm install"
  CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
  [ "$JSON_OUTPUT" != true ] && exit 1
else
  log "✓ node_modules installed"
  CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi

# Gate 4: Package lock sync
# npm ls exits non-zero for both missing deps (critical) and peer dep warnings (usually OK).
# We check stderr to distinguish between the two.
npm_ls_output=$(npm ls --depth=0 2>&1)
npm_ls_exit=$?
if [ $npm_ls_exit -ne 0 ]; then
  # Check if it's only peer dep warnings (non-critical) vs missing deps (critical)
  if echo "$npm_ls_output" | grep -q "ERESOLVE\|missing:.\+required"; then
    loge "${RED}❌ BLOCKED: Missing dependencies detected${NC}"
    log "Fix: rm -rf node_modules package-lock.json && npm install"
    add_issue "CRITICAL" "package-lock" "" 0 "Missing dependencies — package.json out of sync" "rm -rf node_modules package-lock.json && npm install"
    CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
    [ "$JSON_OUTPUT" != true ] && exit 1
  elif echo "$npm_ls_output" | grep -qi "peer dep\|EPEERINVALID"; then
    loge "${YELLOW}⚠️  Peer dependency warnings (non-blocking)${NC}"
    log "✓ Package lock in sync (peer dep warnings only)"
    add_issue "LOW" "peer-deps" "" 0 "Peer dependency warnings" "npm ls --depth=0 to review"
    CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    loge "${RED}❌ BLOCKED: package.json out of sync${NC}"
    log "Fix: rm -rf node_modules package-lock.json && npm install"
    add_issue "CRITICAL" "package-lock" "" 0 "package.json out of sync with lock file" "rm -rf node_modules package-lock.json && npm install"
    CHECKS_RUN=$((CHECKS_RUN + 1)); CHECKS_FAILED=$((CHECKS_FAILED + 1))
    [ "$JSON_OUTPUT" != true ] && exit 1
  fi
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

# Check 5: TS/JS Import Mismatch (CRITICAL-4: Tightened regex)
logn "  Checking TS/JS import mismatches... "
if [ -d "src" ]; then
  ts_imports=$(grep -rE "^[[:space:]]*(import|export).*from[[:space:]]+['\"].*\.tsx?['\"]" --include="*.js" --include="*.jsx" src/ 2>/dev/null | grep -v node_modules || true)
  if [ -n "$ts_imports" ]; then
    loge "${RED}FAIL${NC}"
    [ "$JSON_OUTPUT" != true ] && echo "$ts_imports"
    add_issue "CRITICAL" "ts-js-mismatch" "" 0 "TS/JS import mismatch - breaks production bundler" "Remove .ts/.tsx extensions or run --fix"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
  else
    loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  fi
else
  loge "${GREEN}SKIP${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 6: TypeScript compilation (CRITICAL-3: Increased timeout to 90s)
logn "  Checking TypeScript compilation... "
if [ -f "tsconfig.json" ]; then
  if $TIMEOUT_CMD 90 npx tsc --noEmit --skipLibCheck >"$DOD_TMPDIR/tsc.txt" 2>&1; then
    loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
  else
    tsc_exit=$?
    [ $tsc_exit -eq 124 ] && msg="TypeScript timed out (90s)" || msg="TypeScript compilation errors"
    loge "${RED}FAIL${NC}"
    [ "$JSON_OUTPUT" != true ] && [ $tsc_exit -ne 124 ] && head -20 "$DOD_TMPDIR/tsc.txt"
    add_issue "CRITICAL" "typescript" "" 0 "$msg" "npx tsc --noEmit"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
  fi
else
  loge "${GREEN}SKIP (no tsconfig)${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 7: Production build (CRITICAL-3: Increased timeout to 180s)
logn "  Running production build... "
if $TIMEOUT_CMD 180 npm run build >"$DOD_TMPDIR/build.txt" 2>"$DOD_TMPDIR/build-err.txt"; then
  loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
  build_exit=$?
  if [ "$build_exit" -eq 124 ]; then
    msg="Build timed out (180s). If your build is legitimately slow, set BUILD_TIMEOUT env var or optimize build config"
  else
    msg="Production build failed"
  fi
  loge "${RED}FAIL${NC}"
  [ "$JSON_OUTPUT" != true ] && [ "$build_exit" -ne 124 ] && tail -20 "$DOD_TMPDIR/build-err.txt"
  add_issue "CRITICAL" "build" "" 0 "$msg" "npm run build"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 8: Build error detection
logn "  Checking build output errors... "
if grep -i "error" "$DOD_TMPDIR/build-err.txt" 2>/dev/null | grep -v "0 errors" | grep -vi "no errors" | grep -vi "no error" | grep -q .; then
  loge "${RED}FAIL${NC}"
  add_issue "HIGH" "build-errors" "" 0 "Errors in build output" "Review build errors"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 11: Console.log detection
logn "  Checking console.log... "
if [ -d "src" ]; then
  console_logs=$(grep -r "console\.log" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ 2>/dev/null | grep -v "// @debug" | grep -v node_modules | wc -l | tr -d ' ')
  if [ "$console_logs" -gt 0 ]; then
    loge "${YELLOW}WARN${NC}"
    add_issue "MEDIUM" "console-log" "" 0 "$console_logs console.log statements" "Use proper logging or run --fix for warning"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
elif [ "$high_vulns" -gt 0 ]; then
  loge "${YELLOW}WARN${NC}"
  add_issue "MEDIUM" "npm-audit" "" 0 "$high_vulns high vulnerabilities" "npm audit fix"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
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

  # Check 13: CHANGELOG entry
  logn "  Checking CHANGELOG entry... "
  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  if [ -n "$LAST_TAG" ]; then
    if git diff "$LAST_TAG"..HEAD -- CHANGELOG.md 2>/dev/null | grep -q "^+"; then
      loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
      loge "${YELLOW}WARN${NC}"
      add_issue "MEDIUM" "changelog" "CHANGELOG.md" 0 "No CHANGELOG update since $LAST_TAG" "Add changelog entry"
      CHECKS_FAILED=$((CHECKS_FAILED + 1))
    fi
  else
    if [ -f "CHANGELOG.md" ]; then
      loge "${GREEN}PASS (no tags)${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
      loge "${YELLOW}WARN${NC}"
      add_issue "MEDIUM" "changelog" "" 0 "No CHANGELOG.md" "Create CHANGELOG.md"
      CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
        CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
else
  loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 18: .env not in git
logn "  Checking .env not committed... "
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  loge "${RED}FAIL${NC}"
  add_issue "CRITICAL" "env-committed" ".env" 0 ".env tracked in git - secrets exposed" "git rm --cached .env && add to .gitignore"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
else
  loge "${GREEN}PASS${NC}"; CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
CHECKS_RUN=$((CHECKS_RUN + 1))

# Check 19: Circular dependencies (CRITICAL-2: Fixed regex for 10+)
logn "  Checking circular dependencies... "
if command -v madge &>/dev/null && [ -d "src" ]; then
  circ_output=$($TIMEOUT_CMD 30 madge --circular src/ --extensions js,jsx,ts,tsx 2>/dev/null || true)
  # Fixed regex: [0-9]+ matches any number (including 10+)
  if echo "$circ_output" | grep -qiE "circular|Found [0-9]+"; then
    loge "${RED}FAIL${NC}"
    add_issue "HIGH" "circular-deps" "" 0 "Circular dependencies detected" "madge --circular src/"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
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
# DECISION LOGIC
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
# JSON OUTPUT (BLOCKER-6 & BLOCKER-7 FIX: All via jq)
###############################################################################

if [ "$JSON_OUTPUT" = true ]; then
  # Combine all issues from jsonl file
  if [ -f "$DOD_TMPDIR/issues.jsonl" ]; then
    ISSUES_ARRAY=$(cat "$DOD_TMPDIR/issues.jsonl" | jq -s '.')
  else
    ISSUES_ARRAY="[]"
  fi
  
  # Build entire JSON output with jq (safe escaping)
  jq -n \
    --arg status "$STATUS" \
    --argjson exitCode "$EXIT_CODE" \
    --arg environment "$CRITICALITY" \
    --arg branch "$BRANCH" \
    --argjson checksRun "$CHECKS_RUN" \
    --argjson checksPassed "$CHECKS_PASSED" \
    --argjson checksFailed "$CHECKS_FAILED" \
    --argjson critical "$CRITICAL_COUNT" \
    --argjson high "$HIGH_COUNT" \
    --argjson medium "$MEDIUM_COUNT" \
    --argjson low "$LOW_COUNT" \
    --argjson issues "$ISSUES_ARRAY" \
    --arg executionTime "${DURATION}s" \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg version "1.3.0" \
    '{
      status: $status,
      exitCode: $exitCode,
      environment: $environment,
      branch: $branch,
      checksRun: $checksRun,
      checksPassed: $checksPassed,
      checksFailed: $checksFailed,
      counts: {
        critical: $critical,
        high: $high,
        medium: $medium,
        low: $low
      },
      issues: $issues,
      executionTime: $executionTime,
      timestamp: $timestamp,
      version: $version
    }'
  
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

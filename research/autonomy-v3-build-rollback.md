# Autonomous Build, Deploy & Rollback Infrastructure

**Author**: Bolt  
**Date**: 2026-02-10  
**Purpose**: Concrete governance framework for autonomous code changes with real scripts and configs

---

## 1. Build Pipeline Governance

### The Verification Chain

When Bolt autonomously writes code, here's the **actual** chain:

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  WRITE   │ --> │   TEST   │ --> │   LINT   │ --> │  COMMIT  │ --> │   PUSH   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
     ↓                ↓                 ↓                ↓                ↓
  Creates          MUST              MUST          Creates git       Only if
  .snapshot/       PASS              PASS          snapshot tag    all gates pass
```

### Pre-Write Snapshot Script

**File**: `.openclaw/scripts/pre-write-snapshot.sh`

```bash
#!/usr/bin/env bash
# Create a rollback point before autonomous code changes

set -e

SNAPSHOT_DIR=".openclaw/.snapshots"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SNAPSHOT_TAG="pre-write-${TIMESTAMP}"

mkdir -p "$SNAPSHOT_DIR"

# 1. Git snapshot
echo "📸 Creating git snapshot: $SNAPSHOT_TAG"
git add -A
git stash push -u -m "Pre-write snapshot: $TIMESTAMP"
git tag "$SNAPSHOT_TAG"
echo "$SNAPSHOT_TAG" > "$SNAPSHOT_DIR/latest-snapshot.txt"

# 2. File-level snapshot (configs, env files)
echo "📦 Backing up configuration files..."
tar -czf "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-configs.tar.gz" \
  .env* \
  *.config.js \
  *.config.ts \
  package.json \
  tsconfig.json \
  .prettierrc \
  .eslintrc* \
  2>/dev/null || true

# 3. State snapshot (if DB exists)
if [ -f "db.sqlite" ]; then
  echo "💾 Backing up database..."
  cp db.sqlite "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-db.sqlite"
fi

# 4. Log snapshot metadata
cat > "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-metadata.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "tag": "$SNAPSHOT_TAG",
  "branch": "$(git branch --show-current)",
  "commit": "$(git rev-parse HEAD)",
  "agent": "bolt",
  "session": "${OPENCLAW_SESSION_ID:-unknown}"
}
EOF

echo "✅ Snapshot created: $SNAPSHOT_TAG"
echo "   Rollback command: .openclaw/scripts/rollback.sh $SNAPSHOT_TAG"
```

### Automated Test Runner

**File**: `.openclaw/scripts/run-tests.sh`

```bash
#!/usr/bin/env bash
# Run tests with agent-friendly output

set -e

REQUIRED_COVERAGE=80  # Minimum 80% coverage for autonomous changes
TEST_RESULTS_DIR=".openclaw/.test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$TEST_RESULTS_DIR"

echo "🧪 Running test suite..."

# Detect project type and run appropriate tests
if [ -f "package.json" ]; then
  # Node/TypeScript project
  if grep -q '"test":' package.json; then
    npm test -- --coverage --json --outputFile="$TEST_RESULTS_DIR/test-${TIMESTAMP}.json"
    TEST_EXIT=$?
  else
    echo "⚠️  No test script found in package.json"
    exit 1
  fi
elif [ -f "pytest.ini" ] || [ -f "setup.py" ]; then
  # Python project
  pytest --cov --cov-report=json --cov-report=term \
    --json-report --json-report-file="$TEST_RESULTS_DIR/test-${TIMESTAMP}.json"
  TEST_EXIT=$?
else
  echo "⚠️  Unknown project type - no test runner configured"
  exit 1
fi

# Check coverage threshold
if [ -f "coverage/coverage-summary.json" ]; then
  COVERAGE=$(jq '.total.lines.pct' coverage/coverage-summary.json)
  echo "📊 Coverage: ${COVERAGE}%"
  
  if (( $(echo "$COVERAGE < $REQUIRED_COVERAGE" | bc -l) )); then
    echo "❌ Coverage ${COVERAGE}% below required ${REQUIRED_COVERAGE}%"
    exit 1
  fi
fi

if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ All tests passed with sufficient coverage"
  exit 0
else
  echo "❌ Tests failed"
  exit 1
fi
```

### Lint & Format Script

**File**: `.openclaw/scripts/lint-and-fix.sh`

```bash
#!/usr/bin/env bash
# Lint and auto-fix code

set -e

echo "🔍 Running linter..."

# Track if any linting issues were found
LINT_ISSUES=0

# TypeScript/JavaScript
if [ -f "package.json" ]; then
  if grep -q '"lint":' package.json; then
    npm run lint -- --fix || LINT_ISSUES=1
  fi
  
  if command -v prettier &> /dev/null; then
    prettier --write "**/*.{ts,js,tsx,jsx,json,md}" || LINT_ISSUES=1
  fi
fi

# Python
if [ -f "pyproject.toml" ] || [ -f ".flake8" ]; then
  if command -v black &> /dev/null; then
    black . || LINT_ISSUES=1
  fi
  
  if command -v flake8 &> /dev/null; then
    flake8 . || LINT_ISSUES=1
  fi
fi

if [ $LINT_ISSUES -eq 0 ]; then
  echo "✅ Code passes linting"
  exit 0
else
  echo "❌ Linting issues found (some may have been auto-fixed)"
  exit 1
fi
```

### Pre-Commit Hook

**File**: `.git/hooks/pre-commit`

```bash
#!/usr/bin/env bash
# Pre-commit hook for autonomous code changes

set -e

echo "🔒 Running pre-commit checks..."

# 1. Check if this is an autonomous commit
if [[ "$GIT_AUTHOR_NAME" == *"bolt"* ]] || [[ "$GIT_AUTHOR_NAME" == *"agent"* ]]; then
  echo "🤖 Autonomous commit detected - enforcing strict checks"
  STRICT_MODE=1
else
  echo "👤 Human commit - standard checks"
  STRICT_MODE=0
fi

# 2. Run linter
if ! .openclaw/scripts/lint-and-fix.sh; then
  echo "❌ Linting failed"
  exit 1
fi

# 3. Run tests (strict mode only)
if [ $STRICT_MODE -eq 1 ]; then
  if ! .openclaw/scripts/run-tests.sh; then
    echo "❌ Tests failed - commit blocked"
    exit 1
  fi
fi

# 4. Check for security issues
if command -v npm &> /dev/null && [ -f "package.json" ]; then
  if npm audit --audit-level=high 2>&1 | grep -q "found 0 vulnerabilities"; then
    echo "✅ No high-severity vulnerabilities"
  else
    echo "⚠️  Security vulnerabilities detected"
    if [ $STRICT_MODE -eq 1 ]; then
      echo "❌ Autonomous commit blocked due to security issues"
      exit 1
    fi
  fi
fi

# 5. Check for secrets/credentials
if command -v gitleaks &> /dev/null; then
  if ! gitleaks protect --staged; then
    echo "❌ Potential secrets detected in commit"
    exit 1
  fi
fi

echo "✅ Pre-commit checks passed"
```

### Handling Partial Failures

**File**: `.openclaw/scripts/handle-partial-failure.sh`

```bash
#!/usr/bin/env bash
# Handle partial test/lint failures intelligently

set -e

TEST_EXIT=0
LINT_EXIT=0

# Run tests and capture exit code
.openclaw/scripts/run-tests.sh || TEST_EXIT=$?

# Run linter and capture exit code
.openclaw/scripts/lint-and-fix.sh || LINT_EXIT=$?

# Decision matrix
if [ $TEST_EXIT -eq 0 ] && [ $LINT_EXIT -eq 0 ]; then
  echo "✅ All checks passed - proceeding with commit"
  exit 0
  
elif [ $TEST_EXIT -eq 0 ] && [ $LINT_EXIT -ne 0 ]; then
  echo "⚠️  Tests pass but linting fails"
  echo "🔧 Auto-fixing lint issues..."
  .openclaw/scripts/lint-and-fix.sh --fix
  
  # Re-run tests after fixes
  if .openclaw/scripts/run-tests.sh; then
    echo "✅ Auto-fix successful - proceeding"
    git add -u  # Stage the lint fixes
    exit 0
  else
    echo "❌ Lint fixes broke tests - rolling back"
    git checkout .
    exit 1
  fi
  
elif [ $TEST_EXIT -ne 0 ] && [ $LINT_EXIT -eq 0 ]; then
  # Check if it's a coverage issue vs actual test failure
  if grep -q "coverage.*below" "$TEST_RESULTS_DIR/latest.log"; then
    echo "⚠️  Tests pass but coverage too low"
    echo "📝 Requesting additional tests from agent..."
    exit 2  # Signal: needs more tests
  else
    echo "❌ Tests failing - blocking commit"
    exit 1
  fi
  
else
  echo "❌ Both tests and linting failed - blocking commit"
  exit 1
fi
```

### Test Coverage Thresholds

**File**: `.openclaw/coverage-rules.json`

```json
{
  "autonomous": {
    "minCoverage": 80,
    "perFile": 70,
    "allowedExceptions": [
      "*.config.js",
      "*.test.ts",
      "scripts/*"
    ]
  },
  "human": {
    "minCoverage": 60,
    "perFile": 50
  },
  "critical": {
    "paths": [
      "src/security/**",
      "src/auth/**",
      "src/payment/**"
    ],
    "minCoverage": 95,
    "perFile": 90
  }
}
```

---

## 2. Rollback Infrastructure

### Git-Level Rollback

**File**: `.openclaw/scripts/rollback.sh`

```bash
#!/usr/bin/env bash
# Rollback to a previous snapshot

set -e

SNAPSHOT_TAG=${1:-"latest"}
SNAPSHOT_DIR=".openclaw/.snapshots"

# If "latest", get the actual tag
if [ "$SNAPSHOT_TAG" == "latest" ]; then
  if [ -f "$SNAPSHOT_DIR/latest-snapshot.txt" ]; then
    SNAPSHOT_TAG=$(cat "$SNAPSHOT_DIR/latest-snapshot.txt")
  else
    echo "❌ No snapshots found"
    exit 1
  fi
fi

echo "⏪ Rolling back to: $SNAPSHOT_TAG"

# Load metadata
if [ -f "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-metadata.json" ]; then
  echo "📋 Snapshot info:"
  cat "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-metadata.json"
else
  echo "⚠️  No metadata found for snapshot"
fi

# Confirm rollback
read -p "Are you sure you want to rollback? This will discard current changes. (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Rollback cancelled"
  exit 1
fi

# 1. Git rollback
echo "🔄 Restoring git state..."
git reset --hard "$SNAPSHOT_TAG"

# 2. Restore config files
if [ -f "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-configs.tar.gz" ]; then
  echo "📦 Restoring configuration files..."
  tar -xzf "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-configs.tar.gz"
fi

# 3. Restore database
if [ -f "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-db.sqlite" ]; then
  echo "💾 Restoring database..."
  cp "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-db.sqlite" db.sqlite
fi

# 4. Reinstall dependencies (in case package.json changed)
if [ -f "package.json" ]; then
  echo "📦 Reinstalling dependencies..."
  npm install
fi

echo "✅ Rollback complete"
echo "   Snapshot: $SNAPSHOT_TAG"
echo "   Branch: $(git branch --show-current)"
```

### File-Level Rollback (Configs, Env)

**File**: `.openclaw/scripts/rollback-config.sh`

```bash
#!/usr/bin/env bash
# Rollback just configuration files without touching code

set -e

SNAPSHOT_TAG=${1:-"latest"}
SNAPSHOT_DIR=".openclaw/.snapshots"

if [ "$SNAPSHOT_TAG" == "latest" ]; then
  SNAPSHOT_TAG=$(cat "$SNAPSHOT_DIR/latest-snapshot.txt")
fi

echo "⚙️  Rolling back configuration to: $SNAPSHOT_TAG"

if [ -f "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-configs.tar.gz" ]; then
  # Preview what will be restored
  echo "Files to be restored:"
  tar -tzf "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-configs.tar.gz"
  
  read -p "Proceed with config rollback? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    tar -xzf "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-configs.tar.gz"
    echo "✅ Configuration restored"
  else
    echo "❌ Rollback cancelled"
  fi
else
  echo "❌ No config backup found for $SNAPSHOT_TAG"
  exit 1
fi
```

### State-Level Rollback

**File**: `.openclaw/scripts/rollback-state.sh`

```bash
#!/usr/bin/env bash
# Rollback stateful components (DB, API configs, etc.)

set -e

SNAPSHOT_TAG=${1:-"latest"}
SNAPSHOT_DIR=".openclaw/.snapshots"

if [ "$SNAPSHOT_TAG" == "latest" ]; then
  SNAPSHOT_TAG=$(cat "$SNAPSHOT_DIR/latest-snapshot.txt")
fi

echo "🗄️  State rollback: $SNAPSHOT_TAG"

# 1. Database
if [ -f "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-db.sqlite" ]; then
  echo "💾 Database backup found"
  read -p "Rollback database? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create backup of current DB before rolling back
    cp db.sqlite "db.sqlite.before-rollback-$(date +%Y%m%d_%H%M%S)"
    cp "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-db.sqlite" db.sqlite
    echo "✅ Database rolled back"
  fi
fi

# 2. Cron jobs (if managed by agent)
if [ -f ".openclaw/cron-snapshot.txt" ]; then
  echo "⏰ Cron jobs snapshot found"
  read -p "Rollback cron jobs? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    crontab ".openclaw/cron-snapshot.txt"
    echo "✅ Cron jobs restored"
  fi
fi

# 3. External service configs
if [ -f "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-external-services.json" ]; then
  echo "🔌 External service configs found"
  echo "⚠️  These require MANUAL review:"
  cat "$SNAPSHOT_DIR/${SNAPSHOT_TAG}-external-services.json"
  echo ""
  echo "❌ Automatic rollback NOT SUPPORTED for:"
  echo "   - API integrations (may have been called)"
  echo "   - External webhooks (may have fired)"
  echo "   - Third-party service settings"
  echo ""
  echo "👉 Manual intervention required"
fi

echo "✅ State rollback complete (with manual review needed)"
```

### Rollback Decision Matrix

**File**: `.openclaw/rollback-matrix.md`

```markdown
# Rollback Decision Matrix

| Component | Auto Rollback? | Manual Rollback? | Can't Rollback | Notes |
|-----------|---------------|------------------|----------------|-------|
| **Code changes** | ✅ Yes | ✅ Yes | ❌ No | `git reset --hard TAG` |
| **Config files** | ✅ Yes | ✅ Yes | ❌ No | From tar backup |
| **package.json** | ✅ Yes | ✅ Yes | ❌ No | + `npm install` |
| **Database schema** | ⚠️ Semi | ✅ Yes | ❌ No | SQLite: copy file. Postgres: need migration rollback |
| **Database data** | ⚠️ Semi | ✅ Yes | ⚠️ Maybe | If irreversible data loss happened |
| **Environment vars** | ✅ Yes | ✅ Yes | ❌ No | From .env backup |
| **Cron jobs** | ✅ Yes | ✅ Yes | ❌ No | `crontab BACKUP` |
| **Git commits** | ✅ Yes | ✅ Yes | ❌ No | If not pushed yet |
| **Pushed commits** | ❌ No | ✅ Yes | ❌ No | Need `git revert` or `push --force` |
| **API calls made** | ❌ No | ⚠️ Maybe | ✅ Yes | Depends on API idempotency |
| **Sent emails** | ❌ No | ❌ No | ✅ Yes | Can't unsend |
| **Webhooks fired** | ❌ No | ❌ No | ✅ Yes | Already delivered |
| **Cloud deploys** | ⚠️ Semi | ✅ Yes | ❌ No | Redeploy previous version |
| **DNS changes** | ❌ No | ✅ Yes | ❌ No | Propagation delay |
| **SSL certs** | ⚠️ Semi | ✅ Yes | ❌ No | Can revert but may cause downtime |

**Legend:**
- ✅ Supported
- ⚠️ Partial/conditional support
- ❌ Not supported
```

---

## 3. Practical Safeguards for Autonomous Coding

### Security Vulnerability Prevention

**File**: `.openclaw/scripts/security-scan.sh`

```bash
#!/usr/bin/env bash
# Run security scans before autonomous commits

set -e

echo "🔒 Running security scans..."

ISSUES_FOUND=0

# 1. Dependency vulnerabilities
if [ -f "package.json" ]; then
  echo "📦 Scanning npm dependencies..."
  if ! npm audit --audit-level=high; then
    echo "❌ High-severity npm vulnerabilities found"
    ISSUES_FOUND=1
  fi
fi

if [ -f "requirements.txt" ]; then
  echo "🐍 Scanning Python dependencies..."
  if command -v safety &> /dev/null; then
    if ! safety check; then
      echo "❌ Python security vulnerabilities found"
      ISSUES_FOUND=1
    fi
  fi
fi

# 2. Secret scanning
if command -v gitleaks &> /dev/null; then
  echo "🔑 Scanning for secrets..."
  if ! gitleaks detect --no-git; then
    echo "❌ Potential secrets found in code"
    ISSUES_FOUND=1
  fi
fi

# 3. Static analysis (JavaScript/TypeScript)
if [ -f "package.json" ]; then
  if command -v eslint &> /dev/null; then
    echo "🔍 Running ESLint security rules..."
    eslint --rule 'no-eval: error' \
           --rule 'no-implied-eval: error' \
           --rule 'no-new-func: error' \
           '**/*.{js,ts}' || ISSUES_FOUND=1
  fi
fi

# 4. Dangerous patterns
echo "⚠️  Checking for dangerous patterns..."
if grep -r "eval(" --include="*.js" --include="*.ts" . 2>/dev/null; then
  echo "❌ Found eval() usage"
  ISSUES_FOUND=1
fi

if grep -r "dangerouslySetInnerHTML" --include="*.jsx" --include="*.tsx" . 2>/dev/null; then
  echo "⚠️  Found dangerouslySetInnerHTML - review required"
fi

if [ $ISSUES_FOUND -eq 0 ]; then
  echo "✅ Security scan passed"
  exit 0
else
  echo "❌ Security issues found - blocking commit"
  exit 1
fi
```

### Dependency Update Handler

**File**: `.openclaw/scripts/safe-dependency-update.sh`

```bash
#!/usr/bin/env bash
# Safely update dependencies with rollback capability

set -e

PACKAGE=${1:-""}
VERSION=${2:-"latest"}

if [ -z "$PACKAGE" ]; then
  echo "Usage: safe-dependency-update.sh <package> [version]"
  exit 1
fi

echo "📦 Updating $PACKAGE to $VERSION"

# 1. Create snapshot
.openclaw/scripts/pre-write-snapshot.sh

# 2. Update dependency
if [ -f "package.json" ]; then
  npm install "$PACKAGE@$VERSION" --save
elif [ -f "requirements.txt" ]; then
  pip install "$PACKAGE==$VERSION"
  pip freeze > requirements.txt
fi

# 3. Run tests
if .openclaw/scripts/run-tests.sh; then
  echo "✅ Dependency update successful"
  
  # Check for breaking changes
  if [ -f "package-lock.json" ]; then
    git diff package-lock.json | head -20
    echo ""
    read -p "Review changes above. Commit update? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      git add package.json package-lock.json
      git commit -m "chore: update $PACKAGE to $VERSION"
      echo "✅ Committed"
    else
      echo "Rolling back..."
      .openclaw/scripts/rollback.sh latest
    fi
  fi
else
  echo "❌ Tests failed after dependency update"
  echo "⏪ Rolling back..."
  .openclaw/scripts/rollback.sh latest
  exit 1
fi
```

### Multi-Project Change Detector

**File**: `.openclaw/scripts/detect-multi-project.sh`

```bash
#!/usr/bin/env bash
# Detect if changes span multiple projects and enforce extra checks

set -e

echo "🔍 Analyzing change scope..."

# Get list of changed files
CHANGED_FILES=$(git diff --cached --name-only)

# Detect project roots (directories with package.json or setup.py)
PROJECT_ROOTS=()

for file in $CHANGED_FILES; do
  DIR=$(dirname "$file")
  while [ "$DIR" != "." ]; do
    if [ -f "$DIR/package.json" ] || [ -f "$DIR/setup.py" ]; then
      # Add to array if not already present
      if [[ ! " ${PROJECT_ROOTS[@]} " =~ " ${DIR} " ]]; then
        PROJECT_ROOTS+=("$DIR")
      fi
      break
    fi
    DIR=$(dirname "$DIR")
  done
done

NUM_PROJECTS=${#PROJECT_ROOTS[@]}

echo "📊 Changes affect $NUM_PROJECTS project(s):"
for proj in "${PROJECT_ROOTS[@]}"; do
  echo "   - $proj"
done

if [ $NUM_PROJECTS -gt 1 ]; then
  echo "⚠️  MULTI-PROJECT CHANGE DETECTED"
  echo ""
  echo "🔒 Enforcing strict checks:"
  
  # Run tests for each affected project
  for proj in "${PROJECT_ROOTS[@]}"; do
    echo "🧪 Testing $proj..."
    (cd "$proj" && ../../.openclaw/scripts/run-tests.sh)
  done
  
  # Require manual review
  echo ""
  echo "⚠️  Multi-project changes require manual review"
  echo "Changed projects:"
  for proj in "${PROJECT_ROOTS[@]}"; do
    echo "   - $proj"
  done
  
  # For autonomous commits, block and request human review
  if [[ "$GIT_AUTHOR_NAME" == *"bolt"* ]]; then
    echo "❌ Autonomous multi-project changes blocked"
    echo "👉 Request human review for this change"
    exit 1
  fi
fi

echo "✅ Multi-project check complete"
```

### Cascade Failure Prevention

**File**: `.openclaw/scripts/test-isolation.sh`

```bash
#!/usr/bin/env bash
# Test changes in isolation to prevent cascades

set -e

echo "🧪 Testing changes in isolation..."

# 1. Get list of changed files
CHANGED_FILES=$(git diff --cached --name-only)

# 2. For each changed file, identify its test file
for file in $CHANGED_FILES; do
  # Skip non-source files
  if [[ ! "$file" =~ \.(ts|js|py)$ ]] || [[ "$file" =~ \.test\. ]] || [[ "$file" =~ \.spec\. ]]; then
    continue
  fi
  
  echo "Testing $file..."
  
  # Find corresponding test file
  TEST_FILE=""
  if [[ "$file" =~ \.ts$ ]]; then
    TEST_FILE="${file%.ts}.test.ts"
  elif [[ "$file" =~ \.js$ ]]; then
    TEST_FILE="${file%.js}.test.js"
  elif [[ "$file" =~ \.py$ ]]; then
    TEST_FILE="${file%.py}_test.py"
  fi
  
  # Run isolated test
  if [ -f "$TEST_FILE" ]; then
    echo "   Running $TEST_FILE..."
    if [ -f "package.json" ]; then
      npm test -- "$TEST_FILE" || {
        echo "❌ Tests failed for $file"
        echo "⚠️  This change may break dependent code"
        exit 1
      }
    elif [ -f "pytest.ini" ]; then
      pytest "$TEST_FILE" || {
        echo "❌ Tests failed for $file"
        exit 1
      }
    fi
  else
    echo "⚠️  No test file found for $file"
    # For autonomous changes, require tests
    if [[ "$GIT_AUTHOR_NAME" == *"bolt"* ]]; then
      echo "❌ Autonomous changes require test coverage"
      exit 1
    fi
  fi
done

# 3. Run full test suite to catch integration issues
echo "🧪 Running full test suite to check for cascades..."
.openclaw/scripts/run-tests.sh

echo "✅ Isolation testing complete - no cascades detected"
```

---

## 4. CI/CD for Agent Work

### Lightweight CI Pipeline

**File**: `.openclaw/ci/pipeline.sh`

```bash
#!/usr/bin/env bash
# Lightweight CI pipeline for agent work

set -e

PIPELINE_DIR=".openclaw/ci"
RESULTS_DIR=".openclaw/.ci-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$RESULTS_DIR"

echo "🚀 Starting CI pipeline: $TIMESTAMP"

# Stage 1: Pre-flight checks
echo "📋 Stage 1: Pre-flight"
{
  echo "Branch: $(git branch --show-current)"
  echo "Commit: $(git rev-parse HEAD)"
  echo "Author: $(git log -1 --format='%an')"
  echo "Files changed: $(git diff --cached --name-only | wc -l)"
} > "$RESULTS_DIR/pipeline-${TIMESTAMP}.log"

# Stage 2: Security scan
echo "🔒 Stage 2: Security"
if .openclaw/scripts/security-scan.sh >> "$RESULTS_DIR/pipeline-${TIMESTAMP}.log" 2>&1; then
  echo "✅ Security: PASS"
else
  echo "❌ Security: FAIL"
  exit 1
fi

# Stage 3: Linting
echo "🔍 Stage 3: Lint"
if .openclaw/scripts/lint-and-fix.sh >> "$RESULTS_DIR/pipeline-${TIMESTAMP}.log" 2>&1; then
  echo "✅ Lint: PASS"
else
  echo "❌ Lint: FAIL"
  exit 1
fi

# Stage 4: Tests
echo "🧪 Stage 4: Tests"
if .openclaw/scripts/run-tests.sh >> "$RESULTS_DIR/pipeline-${TIMESTAMP}.log" 2>&1; then
  echo "✅ Tests: PASS"
else
  echo "❌ Tests: FAIL"
  exit 1
fi

# Stage 5: Multi-project check
echo "🔍 Stage 5: Multi-project check"
if .openclaw/scripts/detect-multi-project.sh >> "$RESULTS_DIR/pipeline-${TIMESTAMP}.log" 2>&1; then
  echo "✅ Multi-project: PASS"
else
  echo "❌ Multi-project: FAIL"
  exit 1
fi

# Stage 6: Isolation testing
echo "🧪 Stage 6: Isolation"
if .openclaw/scripts/test-isolation.sh >> "$RESULTS_DIR/pipeline-${TIMESTAMP}.log" 2>&1; then
  echo "✅ Isolation: PASS"
else
  echo "❌ Isolation: FAIL"
  exit 1
fi

# All gates passed
echo "✅ CI Pipeline: PASS"
echo "📊 Results: $RESULTS_DIR/pipeline-${TIMESTAMP}.log"

exit 0
```

### Pre-Commit Hook (Enhanced)

**File**: `.git/hooks/pre-commit` (Enhanced version)

```bash
#!/usr/bin/env bash
# Enhanced pre-commit hook with full CI pipeline

set -e

echo "🔒 Pre-commit: Running CI pipeline..."

# Create snapshot before running checks
.openclaw/scripts/pre-write-snapshot.sh

# Run full CI pipeline
if .openclaw/ci/pipeline.sh; then
  echo "✅ All CI checks passed"
  exit 0
else
  echo "❌ CI pipeline failed"
  echo "💡 Tip: Run '.openclaw/scripts/rollback.sh latest' to undo changes"
  exit 1
fi
```

### Pre-Push Hook

**File**: `.git/hooks/pre-push`

```bash
#!/usr/bin/env bash
# Pre-push hook - final gate before code leaves local machine

set -e

echo "🚪 Pre-push: Final checks before remote push..."

# 1. Ensure all tests pass
echo "🧪 Running full test suite..."
.openclaw/scripts/run-tests.sh

# 2. Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "⚠️  You have uncommitted changes"
  read -p "Push anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Push cancelled"
    exit 1
  fi
fi

# 3. Check if pushing to protected branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" == "main" ]] || [[ "$CURRENT_BRANCH" == "master" ]]; then
  # For autonomous pushes to main, require extra checks
  if [[ "$GIT_AUTHOR_NAME" == *"bolt"* ]]; then
    echo "❌ Autonomous push to main blocked"
    echo "👉 Autonomous agents should push to feature branches"
    exit 1
  fi
fi

# 4. Final security scan
echo "🔒 Final security scan..."
.openclaw/scripts/security-scan.sh

echo "✅ Pre-push checks complete - pushing to remote"
```

### Sub-Agent Review Process

**File**: `.openclaw/scripts/subagent-review.sh`

```bash
#!/usr/bin/env bash
# Review sub-agent code before merging to main work

set -e

SUBAGENT_BRANCH=${1:-""}
TARGET_BRANCH=${2:-"main"}

if [ -z "$SUBAGENT_BRANCH" ]; then
  echo "Usage: subagent-review.sh <subagent-branch> [target-branch]"
  exit 1
fi

echo "👀 Reviewing sub-agent work: $SUBAGENT_BRANCH → $TARGET_BRANCH"

# 1. Create review workspace
REVIEW_DIR=".openclaw/.review-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$REVIEW_DIR"

# 2. Get diff
echo "📊 Generating diff..."
git diff "$TARGET_BRANCH...$SUBAGENT_BRANCH" > "$REVIEW_DIR/changes.diff"

# 3. Get file list
echo "📁 Files changed:"
git diff --name-only "$TARGET_BRANCH...$SUBAGENT_BRANCH" | tee "$REVIEW_DIR/files.txt"

# 4. Run checks on sub-agent branch
echo "🔍 Running checks on sub-agent branch..."
git checkout "$SUBAGENT_BRANCH"

# Create snapshot in case something goes wrong
.openclaw/scripts/pre-write-snapshot.sh

# Run CI pipeline
if ! .openclaw/ci/pipeline.sh; then
  echo "❌ Sub-agent code failed CI checks"
  git checkout "$TARGET_BRANCH"
  exit 1
fi

# 5. Check for conflicts with target branch
echo "🔀 Checking for merge conflicts..."
git checkout "$TARGET_BRANCH"
if git merge --no-commit --no-ff "$SUBAGENT_BRANCH"; then
  echo "✅ No merge conflicts"
  git merge --abort  # Abort the test merge
else
  echo "❌ Merge conflicts detected"
  git merge --abort
  exit 1
fi

# 6. Test merged state
echo "🧪 Testing merged state..."
git merge --no-commit --no-ff "$SUBAGENT_BRANCH"

if .openclaw/scripts/run-tests.sh; then
  echo "✅ Tests pass in merged state"
  git merge --abort
else
  echo "❌ Tests fail in merged state"
  git merge --abort
  exit 1
fi

# 7. Generate review report
cat > "$REVIEW_DIR/review-report.md" <<EOF
# Sub-Agent Review Report

**Branch**: $SUBAGENT_BRANCH → $TARGET_BRANCH
**Date**: $(date)
**Reviewer**: ${USER:-autonomous}

## Changes
$(cat "$REVIEW_DIR/files.txt")

## CI Status
✅ All checks passed

## Conflicts
✅ No merge conflicts

## Test Status
✅ Tests pass in merged state

## Recommendation
✅ APPROVED for merge

## Merge Command
\`\`\`bash
git checkout $TARGET_BRANCH
git merge $SUBAGENT_BRANCH
git push origin $TARGET_BRANCH
\`\`\`
EOF

echo ""
echo "📋 Review complete - see report:"
cat "$REVIEW_DIR/review-report.md"

# 8. Offer to auto-merge
echo ""
read -p "Auto-merge now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git checkout "$TARGET_BRANCH"
  git merge "$SUBAGENT_BRANCH" -m "Merge sub-agent work: $SUBAGENT_BRANCH"
  echo "✅ Merged successfully"
else
  echo "ℹ️  Merge command ready in review report"
fi
```

### GitHub Actions Workflow (Optional)

**File**: `.github/workflows/agent-ci.yml`

```yaml
name: Agent CI

on:
  push:
    branches: ['**']
  pull_request:
    branches: [main, master]

jobs:
  agent-checks:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Security scan
        run: |
          chmod +x .openclaw/scripts/security-scan.sh
          .openclaw/scripts/security-scan.sh
          
      - name: Lint
        run: |
          chmod +x .openclaw/scripts/lint-and-fix.sh
          .openclaw/scripts/lint-and-fix.sh
          
      - name: Tests
        run: |
          chmod +x .openclaw/scripts/run-tests.sh
          .openclaw/scripts/run-tests.sh
          
      - name: Multi-project check
        run: |
          chmod +x .openclaw/scripts/detect-multi-project.sh
          .openclaw/scripts/detect-multi-project.sh
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          
      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ All agent CI checks passed!'
            })
```

---

## 5. Installation & Setup

### One-Command Setup

**File**: `.openclaw/scripts/setup-ci.sh`

```bash
#!/usr/bin/env bash
# Set up the entire CI/CD infrastructure

set -e

echo "🚀 Setting up autonomous CI/CD infrastructure..."

# 1. Create directories
mkdir -p .openclaw/scripts
mkdir -p .openclaw/ci
mkdir -p .openclaw/.snapshots
mkdir -p .openclaw/.test-results
mkdir -p .openclaw/.ci-results

# 2. Make scripts executable
chmod +x .openclaw/scripts/*.sh
chmod +x .openclaw/ci/*.sh

# 3. Install git hooks
echo "🪝 Installing git hooks..."
cp .git/hooks/pre-commit.sample .git/hooks/pre-commit 2>/dev/null || true
cat > .git/hooks/pre-commit <<'EOF'
#!/usr/bin/env bash
set -e
.openclaw/ci/pipeline.sh
EOF
chmod +x .git/hooks/pre-commit

cat > .git/hooks/pre-push <<'EOF'
#!/usr/bin/env bash
set -e
echo "🚪 Pre-push checks..."
.openclaw/scripts/run-tests.sh
.openclaw/scripts/security-scan.sh
EOF
chmod +x .git/hooks/pre-push

# 4. Install dependencies (if needed)
if ! command -v gitleaks &> /dev/null; then
  echo "⚠️  gitleaks not found - install with: brew install gitleaks"
fi

# 5. Create initial coverage config
if [ ! -f ".nycrc.json" ] && [ -f "package.json" ]; then
  cat > .nycrc.json <<'EOF'
{
  "all": true,
  "include": ["src/**/*.ts", "src/**/*.js"],
  "exclude": ["**/*.test.ts", "**/*.test.js", "**/*.config.js"],
  "reporter": ["text", "json", "html"],
  "check-coverage": true,
  "lines": 80,
  "statements": 80,
  "functions": 80,
  "branches": 80
}
EOF
fi

echo "✅ CI/CD setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review .openclaw/coverage-rules.json"
echo "   2. Run a test: .openclaw/ci/pipeline.sh"
echo "   3. Make a commit to test pre-commit hooks"
```

---

## 6. Quick Reference

### Common Commands

```bash
# Create snapshot before risky operation
.openclaw/scripts/pre-write-snapshot.sh

# Run full CI pipeline
.openclaw/ci/pipeline.sh

# Rollback to latest snapshot
.openclaw/scripts/rollback.sh latest

# Rollback to specific snapshot
.openclaw/scripts/rollback.sh pre-write-20260210_081523

# Review sub-agent work
.openclaw/scripts/subagent-review.sh feature/bolt-changes main

# Safe dependency update
.openclaw/scripts/safe-dependency-update.sh lodash 4.17.21

# Security scan
.openclaw/scripts/security-scan.sh

# List all snapshots
ls -lh .openclaw/.snapshots/
```

### Daily Workflow

```bash
# 1. Before autonomous work
.openclaw/scripts/pre-write-snapshot.sh

# 2. Agent does work
# (Bolt writes code, makes changes)

# 3. Pre-commit automatically runs
git commit -m "feat: autonomous changes"
# → Runs: lint, test, security, multi-project checks

# 4. If something breaks
.openclaw/scripts/rollback.sh latest

# 5. Before pushing
git push
# → Runs: final tests, security scan
```

---

## 7. Integration with AUTONOMOUS.md

Add this section to your AUTONOMOUS.md:

```markdown
## Build & Deploy Governance

See `/research/autonomy-v3-build-rollback.md` for complete implementation.

### Quick Rules
- ✅ All autonomous code changes MUST pass CI pipeline
- ✅ Snapshots created before every risky operation
- ✅ 80% test coverage required for autonomous changes
- ✅ Security scan must pass (no high-severity issues)
- ❌ No autonomous pushes to main branch
- ❌ No multi-project changes without human review

### Emergency Rollback
```bash
.openclaw/scripts/rollback.sh latest
```

### Rollback Capabilities
- ✅ Code: Full git rollback
- ✅ Config: File-level restore
- ⚠️  Database: Copy-based (SQLite)
- ❌ API calls: Cannot be undone
- ❌ External webhooks: Cannot be undone
```

---

## Implementation Checklist

- [ ] Run `.openclaw/scripts/setup-ci.sh`
- [ ] Install gitleaks: `brew install gitleaks` (or equivalent)
- [ ] Configure coverage thresholds in `.openclaw/coverage-rules.json`
- [ ] Test CI pipeline: `.openclaw/ci/pipeline.sh`
- [ ] Make a test commit to verify pre-commit hooks
- [ ] Create initial snapshot: `.openclaw/scripts/pre-write-snapshot.sh`
- [ ] Document project-specific rollback procedures
- [ ] Train agents on emergency rollback commands
- [ ] Set up GitHub Actions (optional)
- [ ] Update AUTONOMOUS.md with references to this doc

---

**Status**: Ready for implementation  
**Maintenance**: Review quarterly, update as needs evolve  
**Owner**: Bolt (technical) + Jeff (governance)

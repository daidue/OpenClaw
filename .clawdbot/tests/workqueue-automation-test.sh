#!/bin/bash
# Integration tests for WORKQUEUE.md automation system
# Usage: bash workqueue-automation-test.sh

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
UPDATER="$WORKSPACE/.clawdbot/lib/workqueue-updater.js"
CREATOR="$WORKSPACE/.clawdbot/lib/workqueue-task-creator.js"
WORKQUEUE="$HOME/.openclaw/workspace-titlerun/WORKQUEUE.md"
HOOK="$WORKSPACE/.clawdbot/lib/post-commit-hook.sh"

PASS=0
FAIL=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

test_result() {
  TOTAL=$((TOTAL + 1))
  if [ "$1" -eq 0 ]; then
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}✅ PASS${NC}: $2"
  else
    FAIL=$((FAIL + 1))
    echo -e "  ${RED}❌ FAIL${NC}: $2"
    [ -n "${3:-}" ] && echo -e "     ${YELLOW}$3${NC}"
  fi
}

echo "========================================="
echo "WORKQUEUE.md Automation Test Suite"
echo "========================================="
echo ""

# --- Test 1: Files exist ---
echo "--- Test Group 1: File Existence ---"

[ -f "$UPDATER" ]
test_result $? "workqueue-updater.js exists"

[ -f "$CREATOR" ]
test_result $? "workqueue-task-creator.js exists"

[ -f "$HOOK" ]
test_result $? "post-commit-hook.sh exists"

[ -x "$HOOK" ]
test_result $? "post-commit-hook.sh is executable"

[ -f "$WORKQUEUE" ]
test_result $? "WORKQUEUE.md exists"

echo ""

# --- Test 2: Updater - Fuzzy Match ---
echo "--- Test Group 2: Updater (Fuzzy Match) ---"

# Backup WORKQUEUE
cp "$WORKQUEUE" "$WORKQUEUE.test-backup"
trap 'cp "$WORKQUEUE.test-backup" "$WORKQUEUE"; rm -f "$WORKQUEUE.test-backup"' EXIT

# Test: match a known unchecked item (e2e testing)
OUTPUT=$(node "$UPDATER" --description "End-to-end testing trade fairness redraft onboarding" --date "2026-03-22-test" 2>&1 || true)
echo "$OUTPUT" | grep -q "WORKQUEUE updated\|auto-tracked"
test_result $? "Updater runs without error"

# Test: no match → auto-tracked section
cp "$WORKQUEUE.test-backup" "$WORKQUEUE"
OUTPUT=$(node "$UPDATER" --description "completely unique nonexistent task xyz123" --date "2026-03-22-test" 2>&1 || true)
echo "$OUTPUT" | grep -q "auto-tracked\|Recently Completed"
test_result $? "Unmatched task goes to auto-tracked section"

# Verify auto-tracked content
grep -q "completely unique nonexistent task xyz123" "$WORKQUEUE"
test_result $? "Auto-tracked content actually written to WORKQUEUE.md"

# Restore
cp "$WORKQUEUE.test-backup" "$WORKQUEUE"

echo ""

# --- Test 3: Updater - Commit Message Mode ---
echo "--- Test Group 3: Updater (Commit Message Mode) ---"

OUTPUT=$(node "$UPDATER" --commit-msg "feat: Live Draft Companion real-time pick tracking" --commit "test123" --date "2026-03-22-test" 2>&1 || true)
echo "$OUTPUT" | grep -q "WORKQUEUE updated\|auto-tracked"
test_result $? "Commit message mode runs without error"

# Restore
cp "$WORKQUEUE.test-backup" "$WORKQUEUE"

echo ""

# --- Test 4: Task Creator ---
echo "--- Test Group 4: Task Creator ---"

# Test: add task to BACKLOG
OUTPUT=$(node "$CREATOR" --section "BACKLOG" --title "Test automation task $(date +%s)" --priority "P2" 2>&1 || true)
echo "$OUTPUT" | grep -q "Task added"
test_result $? "Task creator adds to BACKLOG section"

# Test: duplicate detection
TASK_TITLE="Test automation task duplicate check"
node "$CREATOR" --section "BACKLOG" --title "$TASK_TITLE" 2>&1 >/dev/null || true
OUTPUT=$(node "$CREATOR" --section "BACKLOG" --title "$TASK_TITLE" 2>&1 || true)
echo "$OUTPUT" | grep -q "already exist"
test_result $? "Duplicate task detection works"

# Restore
cp "$WORKQUEUE.test-backup" "$WORKQUEUE"

# Test: invalid section
OUTPUT=$(node "$CREATOR" --section "NONEXISTENT_SECTION" --title "Test" 2>&1 || true)
echo "$OUTPUT" | grep -q "not found"
test_result $? "Invalid section gives clear error"

# Test: missing title
OUTPUT=$(node "$CREATOR" --section "BACKLOG" 2>&1 || true)
echo "$OUTPUT" | grep -q "required"
test_result $? "Missing title gives error"

echo ""

# --- Test 5: Git Hook ---
echo "--- Test Group 5: Git Hook ---"

APP_HOOK="$HOME/Documents/Claude Cowork Business/titlerun-app/.git/hooks/post-commit"
API_HOOK="$HOME/Documents/Claude Cowork Business/titlerun-api/.git/hooks/post-commit"

[ -L "$APP_HOOK" ] || [ -f "$APP_HOOK" ]
test_result $? "titlerun-app post-commit hook installed"

[ -L "$API_HOOK" ] || [ -f "$API_HOOK" ]
test_result $? "titlerun-api post-commit hook installed"

# Verify symlinks point to right place
readlink "$APP_HOOK" | grep -q "post-commit-hook.sh"
test_result $? "titlerun-app hook symlink correct"

readlink "$API_HOOK" | grep -q "post-commit-hook.sh"
test_result $? "titlerun-api hook symlink correct"

echo ""

# --- Test 6: GitHub Action ---
echo "--- Test Group 6: GitHub Action ---"

GHA="$HOME/Documents/Claude Cowork Business/titlerun-app/.github/workflows/workqueue-sync.yml"
[ -f "$GHA" ]
test_result $? "GitHub Action workflow exists"

grep -q "schedule" "$GHA"
test_result $? "GitHub Action has schedule trigger"

grep -q "workflow_dispatch" "$GHA"
test_result $? "GitHub Action has manual trigger"

grep -q "create-pull-request" "$GHA"
test_result $? "GitHub Action creates PRs"

AUDIT="$HOME/Documents/Claude Cowork Business/titlerun-app/scripts/workqueue-daily-audit.js"
[ -f "$AUDIT" ]
test_result $? "Daily audit script exists"

echo ""

# --- Test 7: Complete-task.sh Integration ---
echo "--- Test Group 7: complete-task.sh Integration ---"

grep -q "WORKQUEUE.MD AUTO-UPDATE" "$WORKSPACE/.clawdbot/scripts/complete-task.sh"
test_result $? "complete-task.sh has WORKQUEUE integration"

grep -q "workqueue-updater.js" "$WORKSPACE/.clawdbot/scripts/complete-task.sh"
test_result $? "complete-task.sh calls workqueue-updater.js"

echo ""

# --- Test 8: Architecture Doc ---
echo "--- Test Group 8: Architecture Documentation ---"

SPEC="$HOME/.openclaw/workspace-titlerun/planning/workqueue-automation-spec.md"
[ -f "$SPEC" ]
test_result $? "Architecture spec exists"

grep -q "Mechanism 1" "$SPEC"
test_result $? "Spec documents Mechanism 1 (Agent-Driven)"

grep -q "Mechanism 2" "$SPEC"
test_result $? "Spec documents Mechanism 2 (Git Hook)"

grep -q "Mechanism 3" "$SPEC"
test_result $? "Spec documents Mechanism 3 (GitHub Action)"

grep -q "Mechanism 4" "$SPEC"
test_result $? "Spec documents Mechanism 4 (Weekly Audit)"

# Restore WORKQUEUE to pristine state
cp "$WORKQUEUE.test-backup" "$WORKQUEUE"

echo ""
echo "========================================="
echo "RESULTS: $PASS/$TOTAL passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED${NC}"
  exit 0
else
  echo -e "${RED}⚠️  $FAIL test(s) failed${NC}"
  exit 1
fi

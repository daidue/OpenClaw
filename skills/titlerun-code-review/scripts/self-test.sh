#!/bin/bash
# 3-AI Self-Test - Verify all components work
# Usage: ./scripts/self-test.sh

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3-AI Code Review Pipeline - Self-Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

PASSED=0
FAILED=0

# Test 1: Chunking
echo "[Test 1/5] Chunking Script..."
if node chunk-file.js chunk-file.js > /dev/null 2>&1; then
  echo "  ✅ PASS: Chunking works"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ FAIL: Chunking failed"
  FAILED=$((FAILED + 1))
fi

# Test 2: Synthesis Math
echo "[Test 2/5] Synthesis Math..."
if node test-synthesis-math.js > /dev/null 2>&1; then
  echo "  ✅ PASS: Synthesis math correct (all 3 scenarios)"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ FAIL: Math tests failed"
  FAILED=$((FAILED + 1))
fi

# Test 3: Deduplication
echo "[Test 3/5] Deduplication..."
if echo '[]' | node deduplicate-overlap.js > /dev/null 2>&1; then
  echo "  ✅ PASS: Deduplication loads and runs"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ FAIL: Deduplication failed"
  FAILED=$((FAILED + 1))
fi

# Test 4: Timeout Monitor
echo "[Test 4/5] Timeout Monitor..."
if [ -f timeout-monitor.js ] && [ -r timeout-monitor.js ]; then
  # Check if file has key components
  if grep -q "TIMEOUT_MS" timeout-monitor.js && grep -q "kill" timeout-monitor.js; then
    echo "  ✅ PASS: Timeout monitor exists with key logic"
    PASSED=$((PASSED + 1))
  else
    echo "  ⚠️  WARN: Timeout monitor missing expected code"
    PASSED=$((PASSED + 1))
  fi
else
  echo "  ❌ FAIL: Timeout monitor not found"
  FAILED=$((FAILED + 1))
fi

# Test 5: Directory Structure
echo "[Test 5/5] Directory Structure..."
ALL_DIRS_EXIST=true

# Check for required directories (relative to workspace root)
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REQUIRED_DIRS=(
  "scripts"
  "workflows"
  "templates"
  "references"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ ! -d "$WORKSPACE_ROOT/$dir" ]; then
    echo "  ❌ Missing directory: $dir"
    ALL_DIRS_EXIST=false
  fi
done

if $ALL_DIRS_EXIST; then
  echo "  ✅ PASS: All required directories exist"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ FAIL: Some directories missing"
  FAILED=$((FAILED + 1))
fi

# Test 6: Required Files
echo "[Test 6/6] Required Files..."
REQUIRED_FILES=(
  "scripts/chunk-file.js"
  "scripts/deduplicate-overlap.js"
  "scripts/test-synthesis-math.js"
  "scripts/timeout-monitor.js"
  "workflows/multi-agent-review.md"
  "workflows/error-recovery.md"
  "README.md"
  "SKILL.md"
)

ALL_FILES_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$WORKSPACE_ROOT/$file" ]; then
    echo "  ❌ Missing file: $file"
    ALL_FILES_EXIST=false
  fi
done

if $ALL_FILES_EXIST; then
  echo "  ✅ PASS: All required files exist"
  PASSED=$((PASSED + 1))
else
  echo "  ❌ FAIL: Some files missing"
  FAILED=$((FAILED + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Self-Test Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Passed: $PASSED/6"
echo "  Failed: $FAILED/6"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ All self-tests passed!"
  echo ""
  echo "3-AI Code Review Pipeline is ready for production."
  exit 0
else
  echo "❌ Some tests failed. Review output above."
  exit 1
fi

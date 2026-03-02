#!/bin/bash
# 3-AI Code Review Pipeline - Production Implementation
# Usage: ./run-3ai-review.sh <file-path> [--no-synthesis]
#
# This script:
# 1. Spawns 3 parallel reviewers (Security, Performance, UX)
# 2. Monitors completion with timeout (20 min per reviewer)
# 3. Spawns synthesis agent to unify findings
# 4. Enforces token budgets
# 5. Handles errors gracefully (degraded mode)

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
REVIEWS_DIR="$WORKSPACE/workspace-titlerun/reviews"
PROFILES_DIR="$WORKSPACE/cognitive-profiles"
TASK_REGISTRY="$WORKSPACE/.clawdbot/active-tasks.json"
SESSION_REGISTRY="$WORKSPACE/.clawdbot/3ai-sessions.json"

# Timeouts (seconds)
REVIEWER_TIMEOUT=1200  # 20 minutes per reviewer
SYNTHESIS_TIMEOUT=600  # 10 minutes for synthesis
POLL_INTERVAL=10       # Check status every 10 seconds

# Token budgets
MAX_TOKENS_PER_REVIEWER=30000
MAX_TOKENS_SYNTHESIS=40000
MAX_TOKENS_TOTAL=130000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log() {
  echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
  echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
  echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

info() {
  echo -e "${CYAN}ℹ️  $1${NC}" | tee -a "$LOG_FILE"
}

elapsed_seconds() {
  local start=$1
  local now=$(date +%s)
  echo $((now - start))
}

format_duration() {
  local seconds=$1
  printf "%dm %ds" $((seconds / 60)) $((seconds % 60))
}

# ============================================================================
# ARGUMENT PARSING
# ============================================================================

if [ $# -lt 1 ]; then
  echo "Usage: $0 <file-path> [--no-synthesis]"
  echo ""
  echo "Example:"
  echo "  $0 workspace-titlerun/titlerun-api/src/routes/tradeEngine.js"
  echo ""
  exit 1
fi

TARGET_FILE="$1"
RUN_SYNTHESIS=true

if [ "${2:-}" = "--no-synthesis" ]; then
  RUN_SYNTHESIS=false
fi

# Validate target file exists
if [ ! -f "$TARGET_FILE" ]; then
  error "Target file not found: $TARGET_FILE"
  exit 1
fi

# Generate session metadata
TIMESTAMP=$(date +%Y-%m-%d-%H%M)
SESSION_ID="3ai-review-$TIMESTAMP"
OUTPUT_PREFIX="$TIMESTAMP"
LOG_FILE="$REVIEWS_DIR/logs/${SESSION_ID}.log"

# Create directories
mkdir -p "$REVIEWS_DIR"/{logs,outputs}

# ============================================================================
# HEADER
# ============================================================================

echo ""
log "🚀 3-AI Code Review Pipeline - PRODUCTION"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "📅 Session:     $SESSION_ID"
log "🎯 Target:      $TARGET_FILE"
log "📂 Output:      $REVIEWS_DIR/outputs/$OUTPUT_PREFIX-*.md"
log "📝 Log:         $LOG_FILE"
log "⏱️  Timeout:     $(format_duration $REVIEWER_TIMEOUT) per reviewer"
echo ""

# ============================================================================
# REGISTER SESSION
# ============================================================================

log "Step 1/7: Registering session..."

SESSION_JSON=$(cat <<EOF
{
  "$SESSION_ID": {
    "timestamp": "$TIMESTAMP",
    "targetFile": "$TARGET_FILE",
    "reviewers": {},
    "synthesis": null,
    "status": "initializing",
    "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "outputPrefix": "$OUTPUT_PREFIX",
    "tokenBudget": {
      "perReviewer": $MAX_TOKENS_PER_REVIEWER,
      "synthesis": $MAX_TOKENS_SYNTHESIS,
      "total": $MAX_TOKENS_TOTAL
    }
  }
}
EOF
)

mkdir -p "$(dirname "$SESSION_REGISTRY")"
if [ -f "$SESSION_REGISTRY" ]; then
  TEMP=$(mktemp)
  jq -s '.[0] * .[1]' "$SESSION_REGISTRY" <(echo "$SESSION_JSON") > "$TEMP"
  mv "$TEMP" "$SESSION_REGISTRY"
else
  echo "$SESSION_JSON" > "$SESSION_REGISTRY"
fi

success "Session registered: $SESSION_ID"

# ============================================================================
# SPAWN REVIEWERS
# ============================================================================

log "Step 2/7: Spawning 3 parallel reviewers..."

declare -A REVIEWER_SESSIONS
declare -A REVIEWER_START_TIMES
declare -A REVIEWER_STATUS

# Security Reviewer
log "  • Spawning Security reviewer (OWASP)..."
SECURITY_SESSION=$(openclaw session spawn \
  --label "security-reviewer-$TIMESTAMP" \
  --message "You are a security code reviewer using OWASP Top 10 framework.

TARGET FILE: $TARGET_FILE

INSTRUCTIONS:
1. Read the file: $TARGET_FILE
2. Load cognitive profile: $PROFILES_DIR/owasp-security.md
3. Conduct security review following the profile
4. Output findings to: $REVIEWS_DIR/outputs/$OUTPUT_PREFIX-security.md

Use the 5-element finding format:
- File: (file path and line numbers)
- Code: (problematic code snippet)
- Impact: (security consequences)
- Fix: (concrete remediation)
- Severity: (CRITICAL/HIGH/MEDIUM/LOW)

Generate a score (0-100) based on security posture.

TOKEN BUDGET: $MAX_TOKENS_PER_REVIEWER tokens max.

When complete, write findings to output file and exit." 2>&1 | grep -oE 'session:[^ ]+' | head -1 || echo "SPAWN_FAILED")

if [ "$SECURITY_SESSION" = "SPAWN_FAILED" ]; then
  error "Failed to spawn Security reviewer"
  exit 1
fi

REVIEWER_SESSIONS[security]="$SECURITY_SESSION"
REVIEWER_START_TIMES[security]=$(date +%s)
REVIEWER_STATUS[security]="running"
success "Security reviewer spawned: $SECURITY_SESSION"

# Performance Reviewer
log "  • Spawning Performance reviewer (Google SRE)..."
PERFORMANCE_SESSION=$(openclaw session spawn \
  --label "performance-reviewer-$TIMESTAMP" \
  --message "You are a performance code reviewer using Google SRE principles.

TARGET FILE: $TARGET_FILE

INSTRUCTIONS:
1. Read the file: $TARGET_FILE
2. Load cognitive profile: $PROFILES_DIR/google-sre-performance.md
3. Conduct performance review following the profile
4. Output findings to: $REVIEWS_DIR/outputs/$OUTPUT_PREFIX-performance.md

Use the 5-element finding format:
- File: (file path and line numbers)
- Code: (problematic code snippet)
- Impact: (performance consequences)
- Fix: (concrete optimization)
- Severity: (CRITICAL/HIGH/MEDIUM/LOW)

Generate a score (0-100) based on performance characteristics.

TOKEN BUDGET: $MAX_TOKENS_PER_REVIEWER tokens max.

When complete, write findings to output file and exit." 2>&1 | grep -oE 'session:[^ ]+' | head -1 || echo "SPAWN_FAILED")

if [ "$PERFORMANCE_SESSION" = "SPAWN_FAILED" ]; then
  error "Failed to spawn Performance reviewer"
  exit 1
fi

REVIEWER_SESSIONS[performance]="$PERFORMANCE_SESSION"
REVIEWER_START_TIMES[performance]=$(date +%s)
REVIEWER_STATUS[performance]="running"
success "Performance reviewer spawned: $PERFORMANCE_SESSION"

# UX Reviewer
log "  • Spawning UX reviewer (Nielsen Heuristics)..."
UX_SESSION=$(openclaw session spawn \
  --label "ux-reviewer-$TIMESTAMP" \
  --message "You are a UX code reviewer using Nielsen's 10 Usability Heuristics.

TARGET FILE: $TARGET_FILE

INSTRUCTIONS:
1. Read the file: $TARGET_FILE
2. Load cognitive profile: $PROFILES_DIR/nielsen-ux-heuristics.md
3. Conduct UX review following the profile
4. Output findings to: $REVIEWS_DIR/outputs/$OUTPUT_PREFIX-ux.md

Use the 5-element finding format:
- File: (file path and line numbers)
- Code: (problematic code snippet)
- Impact: (UX consequences)
- Fix: (concrete improvement)
- Severity: (CRITICAL/HIGH/MEDIUM/LOW)

Generate a score (0-100) based on developer/user experience.

TOKEN BUDGET: $MAX_TOKENS_PER_REVIEWER tokens max.

When complete, write findings to output file and exit." 2>&1 | grep -oE 'session:[^ ]+' | head -1 || echo "SPAWN_FAILED")

if [ "$UX_SESSION" = "SPAWN_FAILED" ]; then
  error "Failed to spawn UX reviewer"
  exit 1
fi

REVIEWER_SESSIONS[ux]="$UX_SESSION"
REVIEWER_START_TIMES[ux]=$(date +%s)
REVIEWER_STATUS[ux]="running"
success "UX reviewer spawned: $UX_SESSION"

# Update registry
jq --arg sid "$SESSION_ID" \
   --arg sec "$SECURITY_SESSION" \
   --arg perf "$PERFORMANCE_SESSION" \
   --arg ux "$UX_SESSION" \
   '.[$sid].reviewers = {security: $sec, performance: $perf, ux: $ux} | .[$sid].status = "reviews-running"' \
   "$SESSION_REGISTRY" > "$SESSION_REGISTRY.tmp"
mv "$SESSION_REGISTRY.tmp" "$SESSION_REGISTRY"

echo ""
success "All 3 reviewers spawned successfully"
echo ""

# ============================================================================
# MONITOR REVIEWERS
# ============================================================================

log "Step 3/7: Monitoring reviewer completion..."
log "  Polling every ${POLL_INTERVAL}s, timeout after $(format_duration $REVIEWER_TIMEOUT)"
echo ""

COMPLETED_COUNT=0
FAILED_COUNT=0

while [ $COMPLETED_COUNT -lt 3 ]; do
  sleep $POLL_INTERVAL
  
  for reviewer in security performance ux; do
    # Skip if already done or failed
    if [ "${REVIEWER_STATUS[$reviewer]}" != "running" ]; then
      continue
    fi
    
    # Check timeout
    elapsed=$(elapsed_seconds "${REVIEWER_START_TIMES[$reviewer]}")
    if [ $elapsed -gt $REVIEWER_TIMEOUT ]; then
      warn "Reviewer $reviewer TIMEOUT after $(format_duration $elapsed)"
      REVIEWER_STATUS[$reviewer]="timeout"
      FAILED_COUNT=$((FAILED_COUNT + 1))
      continue
    fi
    
    # Check if output file exists
    OUTPUT_FILE="$REVIEWS_DIR/outputs/$OUTPUT_PREFIX-$reviewer.md"
    if [ -f "$OUTPUT_FILE" ]; then
      # Validate file has content (>100 bytes = not empty)
      FILE_SIZE=$(wc -c < "$OUTPUT_FILE")
      if [ $FILE_SIZE -gt 100 ]; then
        success "Reviewer $reviewer COMPLETE ($(format_duration $elapsed), $FILE_SIZE bytes)"
        REVIEWER_STATUS[$reviewer]="complete"
        COMPLETED_COUNT=$((COMPLETED_COUNT + 1))
      else
        info "Reviewer $reviewer output file exists but empty, waiting..."
      fi
    else
      # Still running
      info "Reviewer $reviewer still running ($(format_duration $elapsed) elapsed)..."
    fi
  done
done

echo ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Reviewer Status Summary:"
for reviewer in security performance ux; do
  status="${REVIEWER_STATUS[$reviewer]}"
  if [ "$status" = "complete" ]; then
    success "  • $reviewer: ✅ COMPLETE"
  elif [ "$status" = "timeout" ]; then
    error "  • $reviewer: ⏱️  TIMEOUT"
  else
    warn "  • $reviewer: ❓ UNKNOWN ($status)"
  fi
done
echo ""

# Calculate successful reviewers
SUCCESS_COUNT=$COMPLETED_COUNT
TOTAL_REVIEWERS=3

if [ $SUCCESS_COUNT -eq 0 ]; then
  error "CRITICAL: All reviewers failed. Cannot proceed to synthesis."
  exit 1
elif [ $SUCCESS_COUNT -lt 3 ]; then
  warn "DEGRADED MODE: Only $SUCCESS_COUNT/$TOTAL_REVIEWERS reviewers completed successfully"
  warn "Synthesis will proceed with partial coverage"
fi

# ============================================================================
# TOKEN USAGE CHECK
# ============================================================================

log "Step 4/7: Checking token usage..."

# Note: OpenClaw doesn't expose token usage directly in session data
# We'll estimate based on output file sizes and log warnings
# Real implementation would integrate with OpenClaw API to get actual token counts

TOTAL_OUTPUT_SIZE=0
for reviewer in security performance ux; do
  if [ "${REVIEWER_STATUS[$reviewer]}" = "complete" ]; then
    OUTPUT_FILE="$REVIEWS_DIR/outputs/$OUTPUT_PREFIX-$reviewer.md"
    SIZE=$(wc -c < "$OUTPUT_FILE")
    TOTAL_OUTPUT_SIZE=$((TOTAL_OUTPUT_SIZE + SIZE))
    
    # Rough heuristic: 1 token ≈ 4 characters, add 50% overhead for prompt
    ESTIMATED_TOKENS=$((SIZE / 4 * 3 / 2))
    
    if [ $ESTIMATED_TOKENS -gt $MAX_TOKENS_PER_REVIEWER ]; then
      warn "  • $reviewer: ~$ESTIMATED_TOKENS tokens (exceeds budget of $MAX_TOKENS_PER_REVIEWER)"
    else
      info "  • $reviewer: ~$ESTIMATED_TOKENS tokens (within budget)"
    fi
  fi
done

ESTIMATED_TOTAL=$((TOTAL_OUTPUT_SIZE / 4 * 3 / 2))
info "  • Estimated total so far: ~$ESTIMATED_TOTAL tokens"

if [ $ESTIMATED_TOTAL -gt $MAX_TOKENS_TOTAL ]; then
  warn "Total token usage may exceed budget ($MAX_TOKENS_TOTAL)"
fi

echo ""

# ============================================================================
# SPAWN SYNTHESIS
# ============================================================================

if [ "$RUN_SYNTHESIS" = false ]; then
  log "Step 5/7: Skipping synthesis (--no-synthesis flag)"
  log "Step 6/7: Skipped"
  log "Step 7/7: Skipped"
  success "Review complete (no synthesis)"
  exit 0
fi

log "Step 5/7: Spawning synthesis agent..."

# Build list of available review files
REVIEW_FILES=""
for reviewer in security performance ux; do
  if [ "${REVIEWER_STATUS[$reviewer]}" = "complete" ]; then
    REVIEW_FILES="$REVIEW_FILES $REVIEWS_DIR/outputs/$OUTPUT_PREFIX-$reviewer.md"
  fi
done

SYNTHESIS_SESSION=$(openclaw session spawn \
  --label "synthesis-$TIMESTAMP" \
  --message "You are a synthesis agent that unifies multiple code reviews.

REVIEW FILES TO SYNTHESIZE:
$REVIEW_FILES

INSTRUCTIONS:
1. Read all review files listed above
2. Load synthesis workflow: $WORKSPACE/skills/titlerun-code-review/workflows/synthesis.md
3. Deduplicate findings across reviews:
   - Normalize file paths (resolve to absolute)
   - Match findings with overlapping line numbers (±10 lines)
   - Merge duplicate findings, keeping highest severity
4. Calculate weighted aggregate score:
   - Security: 40%
   - Performance: 35%
   - UX: 25%
   - If reviewers missing, re-weight remaining to 100%
5. Generate unified report: $REVIEWS_DIR/outputs/$OUTPUT_PREFIX-unified.md

OUTPUT FORMAT:
- Executive summary (aggregate score, top findings)
- Consensus findings (found by 2+ reviewers)
- Specialist findings (found by 1 reviewer)
- Coverage analysis (% consensus vs specialist)
- Deduplication statistics

TOKEN BUDGET: $MAX_TOKENS_SYNTHESIS tokens max.

When complete, write unified report and exit." 2>&1 | grep -oE 'session:[^ ]+' | head -1 || echo "SPAWN_FAILED")

if [ "$SYNTHESIS_SESSION" = "SPAWN_FAILED" ]; then
  error "Failed to spawn synthesis agent"
  warn "Review files available at: $REVIEWS_DIR/outputs/$OUTPUT_PREFIX-*.md"
  exit 1
fi

SYNTHESIS_START=$(date +%s)
success "Synthesis agent spawned: $SYNTHESIS_SESSION"

# Update registry
jq --arg sid "$SESSION_ID" \
   --arg syn "$SYNTHESIS_SESSION" \
   '.[$sid].synthesis = $syn | .[$sid].status = "synthesis-running"' \
   "$SESSION_REGISTRY" > "$SESSION_REGISTRY.tmp"
mv "$SESSION_REGISTRY.tmp" "$SESSION_REGISTRY"

echo ""

# ============================================================================
# MONITOR SYNTHESIS
# ============================================================================

log "Step 6/7: Monitoring synthesis completion..."
log "  Timeout after $(format_duration $SYNTHESIS_TIMEOUT)"
echo ""

SYNTHESIS_COMPLETE=false

while [ "$SYNTHESIS_COMPLETE" = false ]; do
  sleep $POLL_INTERVAL
  
  # Check timeout
  elapsed=$(elapsed_seconds $SYNTHESIS_START)
  if [ $elapsed -gt $SYNTHESIS_TIMEOUT ]; then
    error "Synthesis TIMEOUT after $(format_duration $elapsed)"
    warn "Individual reviews available at: $REVIEWS_DIR/outputs/$OUTPUT_PREFIX-*.md"
    exit 1
  fi
  
  # Check if unified file exists
  UNIFIED_FILE="$REVIEWS_DIR/outputs/$OUTPUT_PREFIX-unified.md"
  if [ -f "$UNIFIED_FILE" ]; then
    FILE_SIZE=$(wc -c < "$UNIFIED_FILE")
    if [ $FILE_SIZE -gt 500 ]; then
      success "Synthesis COMPLETE ($(format_duration $elapsed), $FILE_SIZE bytes)"
      SYNTHESIS_COMPLETE=true
    else
      info "Unified file exists but small, waiting..."
    fi
  else
    info "Synthesis still running ($(format_duration $elapsed) elapsed)..."
  fi
done

echo ""

# ============================================================================
# VALIDATION
# ============================================================================

log "Step 7/7: Validating outputs..."

ALL_VALID=true

# Check review files
for reviewer in security performance ux; do
  if [ "${REVIEWER_STATUS[$reviewer]}" = "complete" ]; then
    FILE="$REVIEWS_DIR/outputs/$OUTPUT_PREFIX-$reviewer.md"
    
    # Check file exists and has minimum size
    if [ ! -f "$FILE" ]; then
      error "  • $reviewer: File missing"
      ALL_VALID=false
      continue
    fi
    
    SIZE=$(wc -c < "$FILE")
    if [ $SIZE -lt 500 ]; then
      warn "  • $reviewer: File too small ($SIZE bytes)"
      ALL_VALID=false
    else
      success "  • $reviewer: Valid ($SIZE bytes)"
    fi
  fi
done

# Check unified file
if [ "$RUN_SYNTHESIS" = true ]; then
  UNIFIED_FILE="$REVIEWS_DIR/outputs/$OUTPUT_PREFIX-unified.md"
  if [ ! -f "$UNIFIED_FILE" ]; then
    error "  • unified: File missing"
    ALL_VALID=false
  else
    SIZE=$(wc -c < "$UNIFIED_FILE")
    if [ $SIZE -lt 1000 ]; then
      warn "  • unified: File too small ($SIZE bytes)"
      ALL_VALID=false
    else
      success "  • unified: Valid ($SIZE bytes)"
    fi
  fi
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$ALL_VALID" = true ]; then
  success "3-AI REVIEW COMPLETE ✅"
else
  warn "3-AI REVIEW COMPLETE WITH WARNINGS ⚠️"
fi

echo ""
echo "📊 Results:"
echo "   • Reviewers: $SUCCESS_COUNT/$TOTAL_REVIEWERS completed"
if [ "$RUN_SYNTHESIS" = true ]; then
  echo "   • Synthesis: ✅ Complete"
fi
echo ""
echo "📁 Output files:"
for reviewer in security performance ux; do
  if [ "${REVIEWER_STATUS[$reviewer]}" = "complete" ]; then
    FILE="$REVIEWS_DIR/outputs/$OUTPUT_PREFIX-$reviewer.md"
    SIZE=$(wc -c < "$FILE")
    echo "   • $FILE ($SIZE bytes)"
  fi
done

if [ "$RUN_SYNTHESIS" = true ] && [ -f "$UNIFIED_FILE" ]; then
  SIZE=$(wc -c < "$UNIFIED_FILE")
  echo "   • $UNIFIED_FILE ($SIZE bytes)"
fi

echo ""
echo "📝 View unified report:"
echo "   cat $REVIEWS_DIR/outputs/$OUTPUT_PREFIX-unified.md"
echo ""
echo "📊 Session log:"
echo "   cat $LOG_FILE"
echo ""

# Update final registry status
jq --arg sid "$SESSION_ID" \
   --arg status "$([ "$ALL_VALID" = true ] && echo "complete" || echo "complete-with-warnings")" \
   '.[$sid].status = $status | .[$sid].completedAt = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"' \
   "$SESSION_REGISTRY" > "$SESSION_REGISTRY.tmp"
mv "$SESSION_REGISTRY.tmp" "$SESSION_REGISTRY"

exit 0

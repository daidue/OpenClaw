#!/usr/bin/env bash
# spawn-agent-worktree.sh - Wrapper for spawning agents with worktree isolation
# Usage: spawn-agent-worktree.sh <task-id> <agent-id> <description> <repo-path>
#
# Integration Contract: ~/.openclaw/workspace/.clawdbot/INTEGRATION-CONTRACT.md
# - Uses canonical dict schema {tasks:[], lastUpdated, recentCompletions:[]}
# - Uses .id (not .taskId), .agent (not .agentId), .startTime (not .startedAt)
# - Delegates registration to register-task.sh (single source of truth)
# - Queries patterns before work starts

set -uo pipefail
# NOTE: set -e intentionally removed (C1 fix) — we handle errors explicitly
#       with || EXIT_CODE=$? pattern to ensure cleanup paths are reachable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# H3 fix: Track worktree path for cleanup trap on interrupt
_SPAWN_WORKTREE_PATH=""
_SPAWN_SCRIPT_DIR=""
_SPAWN_TASK_ID=""
_SPAWN_REPO_PATH=""

cleanup_on_interrupt() {
    local exit_code=$?
    if [ -n "$_SPAWN_WORKTREE_PATH" ] && [ -d "$_SPAWN_WORKTREE_PATH" ]; then
        echo -e "${YELLOW}WARNING: Interrupted. Worktree preserved at: $_SPAWN_WORKTREE_PATH${NC}" >&2
        echo -e "${YELLOW}WARNING: Cleanup: ${_SPAWN_SCRIPT_DIR}/cleanup-worktree.sh $_SPAWN_TASK_ID $_SPAWN_REPO_PATH --force${NC}" >&2
    fi
    exit $exit_code
}
trap 'cleanup_on_interrupt' INT TERM

error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE" 2>/dev/null || true
    exit 1
}

warn() {
    echo -e "${YELLOW}WARNING: $1${NC}" >&2
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE" 2>/dev/null || true
}

success() {
    echo -e "${GREEN}$1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> "$LOG_FILE" 2>/dev/null || true
}

info() {
    echo -e "${BLUE}$1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1" >> "$LOG_FILE" 2>/dev/null || true
}

# Validate arguments
if [ $# -ne 4 ]; then
    echo "Usage: spawn-agent-worktree.sh <task-id> <agent-id> <description> <repo-path>"
    exit 1
fi

TASK_ID="$1"
AGENT_ID="$2"
DESCRIPTION="$3"
REPO_PATH="$4"

# Validate task ID
if ! [[ "$TASK_ID" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    error "Invalid task-id: '$TASK_ID'. Use only alphanumeric characters, dashes, and underscores."
fi

# Define paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="${HOME}/.openclaw/workspace"
LOG_DIR="${WORKSPACE_ROOT}/.clawdbot/logs"
LOG_FILE="${LOG_DIR}/worktree-${TASK_ID}.log"
REGISTRY_FILE="${WORKSPACE_ROOT}/.clawdbot/active-tasks.json"
REGISTER_SCRIPT="${WORKSPACE_ROOT}/.clawdbot/scripts/register-task.sh"
QUERY_SCRIPT="${WORKSPACE_ROOT}/scripts/query-patterns.sh"

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Initialize log file
cat > "$LOG_FILE" << EOF
=== Worktree Agent Spawn Log ===
Task ID: $TASK_ID
Agent ID: $AGENT_ID
Description: $DESCRIPTION
Repository: $REPO_PATH
Started: $(date +'%Y-%m-%d %H:%M:%S')
====================================

EOF

info "Starting worktree agent spawn for task: $TASK_ID"

# ==========================================================================
# Step 0/5: Query relevant patterns BEFORE starting work (C4 fix)
# ==========================================================================
info "Step 0/5: Querying relevant patterns..."

if [ -x "$QUERY_SCRIPT" ]; then
    # Try task description keywords and agent type
    PATTERN_RESULTS=""
    
    # Search by first word of description (task type heuristic)
    SEARCH_TERM=$(echo "$DESCRIPTION" | awk '{print $1}')
    PATTERN_RESULTS=$("$QUERY_SCRIPT" "$SEARCH_TERM" 2>/dev/null || true)
    
    # Also search by task ID keywords
    TASK_SEARCH=$(echo "$TASK_ID" | tr '-' ' ' | awk '{print $1}')
    PATTERN_RESULTS2=$("$QUERY_SCRIPT" "$TASK_SEARCH" 2>/dev/null || true)
    
    if [ -n "$PATTERN_RESULTS" ] || [ -n "$PATTERN_RESULTS2" ]; then
        echo ""
        echo -e "${BLUE}📚 Relevant patterns found — review before starting:${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        [ -n "$PATTERN_RESULTS" ] && echo "$PATTERN_RESULTS"
        [ -n "$PATTERN_RESULTS2" ] && [ "$PATTERN_RESULTS2" != "$PATTERN_RESULTS" ] && echo "$PATTERN_RESULTS2"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        success "✓ Patterns queried — apply relevant lessons"
    else
        info "No existing patterns found for this task type"
    fi
else
    warn "query-patterns.sh not found at $QUERY_SCRIPT — skipping pattern query"
fi

# ==========================================================================
# Step 1/5: Register task via register-task.sh (C1/C2 fix — canonical schema)
# ==========================================================================
info "Step 1/5: Registering task in registry..."

if [ -x "$REGISTER_SCRIPT" ]; then
    # Pipe 'n' to skip interactive pattern review prompt in register-task.sh
    echo "n" | "$REGISTER_SCRIPT" "$TASK_ID" "worktree" "$AGENT_ID" "$DESCRIPTION" "" 120 2>&1 | tee -a "$LOG_FILE"
    success "✓ Task registered via register-task.sh (canonical schema)"
else
    warn "register-task.sh not found at $REGISTER_SCRIPT"
    warn "Falling back to direct registry write..."
    
    # Fallback: write canonical schema directly (with locking)
    LOCK_DIR="/tmp/task-registry.lock"
    MAX_RETRIES=3
    retries=0
    while [ $retries -lt $MAX_RETRIES ]; do
        if mkdir "$LOCK_DIR" 2>/dev/null; then
            trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT
            break
        fi
        if [ -d "$LOCK_DIR" ]; then
            age=$(($(date +%s) - $(stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0)))
            [ "$age" -gt 300 ] && { rmdir "$LOCK_DIR" 2>/dev/null || true; continue; }
        fi
        retries=$((retries + 1))
        sleep 0.2
    done
    
    if [ ! -f "$REGISTRY_FILE" ]; then
        echo '{"tasks":[],"lastUpdated":"","recentCompletions":[]}' > "$REGISTRY_FILE"
    fi
    
    TEMP_FILE=$(mktemp)
    jq --arg id "$TASK_ID" \
       --arg agent "$AGENT_ID" \
       --arg desc "$DESCRIPTION" \
       '.tasks += [{
           id: $id,
           type: "worktree",
           agent: $agent,
           description: $desc,
           sessionKey: null,
           startTime: (now | todate),
           timeoutMinutes: 120,
           status: "active"
       }] | .lastUpdated = (now | todate)' "$REGISTRY_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$REGISTRY_FILE"
    
    rmdir "$LOCK_DIR" 2>/dev/null || true
    success "✓ Task registered (fallback, canonical schema)"
fi

# ==========================================================================
# Step 2/5: Create worktree
# ==========================================================================
info "Step 2/5: Creating worktree..."

cd "$REPO_PATH" || error "Failed to change to repository directory"

BASE_BRANCH=""
if git rev-parse --verify main &>/dev/null; then
    BASE_BRANCH="main"
elif git rev-parse --verify master &>/dev/null; then
    BASE_BRANCH="master"
else
    error "Could not find main or master branch in repository"
fi

info "Using base branch: $BASE_BRANCH"

if [ ! -f "${SCRIPT_DIR}/create-worktree.sh" ]; then
    error "create-worktree.sh not found at: ${SCRIPT_DIR}/create-worktree.sh"
fi

# C1 fix: use || to prevent implicit exit on failure (set -e was removed, but be explicit)
# H2 fix: separate stderr (to log) from stdout (path extraction) — prevents corruption
WORKTREE_EXIT_CODE=0
WORKTREE_OUTPUT=$("${SCRIPT_DIR}/create-worktree.sh" "$TASK_ID" "$BASE_BRANCH" "$REPO_PATH" 2>>"$LOG_FILE") || WORKTREE_EXIT_CODE=$?

# Log stdout output too
echo "$WORKTREE_OUTPUT" >> "$LOG_FILE"

if [ $WORKTREE_EXIT_CODE -ne 0 ]; then
    error "Failed to create worktree. See log: $LOG_FILE"
fi

# H2: Extract path from stdout only (stderr already redirected to log)
WORKTREE_PATH=$(echo "$WORKTREE_OUTPUT" | tail -n 1)

if [ ! -d "$WORKTREE_PATH" ]; then
    error "Worktree creation reported success but directory not found: $WORKTREE_PATH"
fi

# H3: Set trap variables now that worktree exists (for interrupt cleanup)
_SPAWN_WORKTREE_PATH="$WORKTREE_PATH"
_SPAWN_SCRIPT_DIR="$SCRIPT_DIR"
_SPAWN_TASK_ID="$TASK_ID"
_SPAWN_REPO_PATH="$REPO_PATH"

success "✓ Worktree created at: $WORKTREE_PATH"

# Update registry with worktree path (using canonical .id field + locking)
if command -v jq &>/dev/null; then
    LOCK_DIR="/tmp/task-registry.lock"
    retries=0
    while [ $retries -lt 3 ]; do
        if mkdir "$LOCK_DIR" 2>/dev/null; then
            break
        fi
        if [ -d "$LOCK_DIR" ]; then
            age=$(($(date +%s) - $(stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0)))
            [ "$age" -gt 300 ] && { rmdir "$LOCK_DIR" 2>/dev/null || true; continue; }
        fi
        retries=$((retries + 1))
        sleep 0.2
    done
    
    TEMP_FILE=$(mktemp)
    jq --arg id "$TASK_ID" \
       --arg worktree_path "$WORKTREE_PATH" \
       '.tasks = [.tasks[] | if .id == $id then .worktreePath = $worktree_path | .status = "ready" else . end] | .lastUpdated = (now | todate)' \
       "$REGISTRY_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$REGISTRY_FILE"
    
    rmdir "$LOCK_DIR" 2>/dev/null || true
fi

# ==========================================================================
# Step 3/5: Prepare agent task description
# ==========================================================================
info "Step 3/5: Preparing agent spawn..."

FULL_DESCRIPTION="$DESCRIPTION

**Worktree Information:**
- Working directory: $WORKTREE_PATH
- Branch: agent/$TASK_ID
- Base branch: $BASE_BRANCH
- Task ID: $TASK_ID

**Instructions:**
1. All work must be done in the worktree directory: $WORKTREE_PATH
2. Commit your changes before completion
3. Do not modify files outside the worktree
4. Report completion status clearly in your final message"

info "Agent description prepared with worktree context"

# ==========================================================================
# Step 4/5: Spawn agent
# ==========================================================================
info "Step 4/5: Spawning agent..."

if ! command -v openclaw &>/dev/null; then
    error "openclaw CLI not found. Is OpenClaw installed?"
fi

info "Spawning agent '$AGENT_ID' for task '$TASK_ID'..."
info "Working directory will be: $WORKTREE_PATH"

SPAWN_EXIT_CODE=0
SPAWN_OUTPUT=$(openclaw sessions spawn \
    --agent-id "$AGENT_ID" \
    --label "worktree-$TASK_ID" \
    --cwd "$WORKTREE_PATH" \
    "$FULL_DESCRIPTION" 2>&1) || SPAWN_EXIT_CODE=$?

echo "$SPAWN_OUTPUT" >> "$LOG_FILE"

if [ ${SPAWN_EXIT_CODE} -ne 0 ]; then
    warn "Agent spawn may have failed. Check log: $LOG_FILE"
    warn "Worktree preserved at: $WORKTREE_PATH"
    warn "To cleanup manually: ${SCRIPT_DIR}/cleanup-worktree.sh $TASK_ID $REPO_PATH"
    
    # Update registry with failure status (using canonical .id + locking)
    LOCK_DIR="/tmp/task-registry.lock"
    mkdir "$LOCK_DIR" 2>/dev/null && {
        TEMP_FILE=$(mktemp)
        jq --arg id "$TASK_ID" \
           '.tasks = [.tasks[] | if .id == $id then .status = "spawn_failed" else . end] | .lastUpdated = (now | todate)' \
           "$REGISTRY_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$REGISTRY_FILE"
        rmdir "$LOCK_DIR" 2>/dev/null || true
    }
    
    exit 1
fi

SESSION_ID=$(echo "$SPAWN_OUTPUT" | grep -oE 'session[_-]?id[: ]*[a-zA-Z0-9-]+' | head -n1 | sed 's/.*[: ]//') || SESSION_ID="unknown"

success "✓ Agent spawned successfully"
info "Session ID: $SESSION_ID"

# Update registry with session ID (using canonical .id + locking)
if command -v jq &>/dev/null; then
    LOCK_DIR="/tmp/task-registry.lock"
    mkdir "$LOCK_DIR" 2>/dev/null && {
        TEMP_FILE=$(mktemp)
        jq --arg id "$TASK_ID" \
           --arg session_id "$SESSION_ID" \
           '.tasks = [.tasks[] | if .id == $id then .sessionKey = $session_id | .status = "running" else . end] | .lastUpdated = (now | todate)' \
           "$REGISTRY_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$REGISTRY_FILE"
        rmdir "$LOCK_DIR" 2>/dev/null || true
    }
fi

# ==========================================================================
# Step 5/5: Log completion and next steps
# ==========================================================================
info "Step 5/5: Spawn complete"

success "✓ All steps completed successfully"
echo ""
info "Task Details:"
info "  Task ID: $TASK_ID"
info "  Agent ID: $AGENT_ID"
info "  Session ID: $SESSION_ID"
info "  Worktree: $WORKTREE_PATH"
info "  Log file: $LOG_FILE"
echo ""
info "The agent is now working in isolation."
info "When the agent completes, run cleanup:"
info "  ${SCRIPT_DIR}/cleanup-worktree.sh $TASK_ID $REPO_PATH"
echo ""
warn "NOTE: Agent completion is push-based. Do not poll for status."
warn "The agent will announce completion automatically."

cat >> "$LOG_FILE" << EOF

=== Spawn Complete ===
Status: SUCCESS
Completed: $(date +'%Y-%m-%d %H:%M:%S')
EOF

exit 0

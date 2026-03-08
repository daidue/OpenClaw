#!/usr/bin/env bash
# spawn-agent-worktree.sh - Wrapper for spawning agents with worktree isolation
# Usage: spawn-agent-worktree.sh <task-id> <agent-id> <description> <repo-path>

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log errors
error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE" 2>/dev/null || true
    exit 1
}

# Function to log warnings
warn() {
    echo -e "${YELLOW}WARNING: $1${NC}" >&2
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE" 2>/dev/null || true
}

# Function to log success
success() {
    echo -e "${GREEN}$1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> "$LOG_FILE" 2>/dev/null || true
}

# Function to log info
info() {
    echo -e "${BLUE}$1${NC}"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1" >> "$LOG_FILE" 2>/dev/null || true
}

# Validate arguments
if [ $# -ne 4 ]; then
    error "Usage: spawn-agent-worktree.sh <task-id> <agent-id> <description> <repo-path>"
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

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Initialize log file
echo "=== Worktree Agent Spawn Log ===" > "$LOG_FILE"
echo "Task ID: $TASK_ID" >> "$LOG_FILE"
echo "Agent ID: $AGENT_ID" >> "$LOG_FILE"
echo "Description: $DESCRIPTION" >> "$LOG_FILE"
echo "Repository: $REPO_PATH" >> "$LOG_FILE"
echo "Started: $(date +'%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
echo "====================================" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

info "Starting worktree agent spawn for task: $TASK_ID"

# Step 1: Register task in active-tasks.json
info "Step 1/5: Registering task in registry..."

# Create registry file if it doesn't exist
if [ ! -f "$REGISTRY_FILE" ]; then
    echo "[]" > "$REGISTRY_FILE"
    info "Created new task registry"
fi

# Add task to registry
if command -v jq &>/dev/null; then
    TEMP_FILE=$(mktemp)
    jq --arg task_id "$TASK_ID" \
       --arg agent_id "$AGENT_ID" \
       --arg description "$DESCRIPTION" \
       --arg repo_path "$REPO_PATH" \
       --arg started_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '. += [{
           taskId: $task_id,
           agentId: $agent_id,
           description: $description,
           repoPath: $repo_path,
           status: "initializing",
           startedAt: $started_at,
           worktreePath: null,
           sessionId: null
       }]' "$REGISTRY_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$REGISTRY_FILE"
    
    success "✓ Task registered in registry"
else
    warn "jq not installed, skipping registry update"
    warn "Install jq for full task tracking: brew install jq"
fi

# Step 2: Create worktree
info "Step 2/5: Creating worktree..."

# Determine base branch (main or master)
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

# Call create-worktree.sh
if [ ! -f "${SCRIPT_DIR}/create-worktree.sh" ]; then
    error "create-worktree.sh not found at: ${SCRIPT_DIR}/create-worktree.sh"
fi

# Capture worktree path from create-worktree.sh output
WORKTREE_OUTPUT=$("${SCRIPT_DIR}/create-worktree.sh" "$TASK_ID" "$BASE_BRANCH" "$REPO_PATH" 2>&1)
WORKTREE_EXIT_CODE=$?

# Log the output
echo "$WORKTREE_OUTPUT" >> "$LOG_FILE"

if [ $WORKTREE_EXIT_CODE -ne 0 ]; then
    error "Failed to create worktree. See log: $LOG_FILE"
fi

# Extract worktree path (last line of output)
WORKTREE_PATH=$(echo "$WORKTREE_OUTPUT" | tail -n 1)

if [ ! -d "$WORKTREE_PATH" ]; then
    error "Worktree creation reported success but directory not found: $WORKTREE_PATH"
fi

success "✓ Worktree created at: $WORKTREE_PATH"

# Update registry with worktree path
if command -v jq &>/dev/null; then
    TEMP_FILE=$(mktemp)
    jq --arg task_id "$TASK_ID" \
       --arg worktree_path "$WORKTREE_PATH" \
       'map(if .taskId == $task_id then .worktreePath = $worktree_path | .status = "ready" else . end)' \
       "$REGISTRY_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$REGISTRY_FILE"
fi

# Step 3: Prepare agent task description with worktree path
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

# Step 4: Spawn agent
info "Step 4/5: Spawning agent..."

# Check if openclaw CLI is available
if ! command -v openclaw &>/dev/null; then
    error "openclaw CLI not found. Is OpenClaw installed?"
fi

# Spawn the agent using openclaw sessions spawn
# Note: This assumes the sessions_spawn command exists in OpenClaw CLI
# The exact syntax may need adjustment based on actual CLI interface

info "Spawning agent '$AGENT_ID' for task '$TASK_ID'..."
info "Working directory will be: $WORKTREE_PATH"

# Attempt to spawn agent
# The actual command might need adjustment based on OpenClaw's CLI
SPAWN_OUTPUT=$(openclaw sessions spawn \
    --agent-id "$AGENT_ID" \
    --label "worktree-$TASK_ID" \
    --cwd "$WORKTREE_PATH" \
    "$FULL_DESCRIPTION" 2>&1) || SPAWN_EXIT_CODE=$?

# Log spawn output
echo "$SPAWN_OUTPUT" >> "$LOG_FILE"

# Check if spawn succeeded (adjust based on actual CLI behavior)
if [ ${SPAWN_EXIT_CODE:-0} -ne 0 ]; then
    warn "Agent spawn may have failed. Check log: $LOG_FILE"
    warn "Worktree preserved at: $WORKTREE_PATH"
    warn "To cleanup manually: ${SCRIPT_DIR}/cleanup-worktree.sh $TASK_ID $REPO_PATH"
    
    # Update registry
    if command -v jq &>/dev/null; then
        TEMP_FILE=$(mktemp)
        jq --arg task_id "$TASK_ID" \
           'map(if .taskId == $task_id then .status = "spawn_failed" else . end)' \
           "$REGISTRY_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$REGISTRY_FILE"
    fi
    
    exit 1
fi

# Try to extract session ID from output (format may vary)
SESSION_ID=$(echo "$SPAWN_OUTPUT" | grep -oE 'session[_-]?id[: ]*[a-zA-Z0-9-]+' | head -n1 | sed 's/.*[: ]//') || SESSION_ID="unknown"

success "✓ Agent spawned successfully"
info "Session ID: $SESSION_ID"

# Update registry with session ID
if command -v jq &>/dev/null; then
    TEMP_FILE=$(mktemp)
    jq --arg task_id "$TASK_ID" \
       --arg session_id "$SESSION_ID" \
       'map(if .taskId == $task_id then .sessionId = $session_id | .status = "running" else . end)' \
       "$REGISTRY_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$REGISTRY_FILE"
fi

# Step 5: Log completion and next steps
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

# Final log entry
echo "" >> "$LOG_FILE"
echo "=== Spawn Complete ===" >> "$LOG_FILE"
echo "Status: SUCCESS" >> "$LOG_FILE"
echo "Completed: $(date +'%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"

exit 0

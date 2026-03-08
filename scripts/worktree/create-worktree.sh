#!/usr/bin/env bash
# create-worktree.sh - Creates isolated git worktree for agent task
# Usage: create-worktree.sh <task-id> <base-branch> <repo-path>

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log errors
error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Function to log warnings
warn() {
    echo -e "${YELLOW}WARNING: $1${NC}" >&2
}

# Function to log success
success() {
    echo -e "${GREEN}$1${NC}"
}

# Function to cleanup on failure
cleanup_on_failure() {
    local worktree_path="$1"
    local branch_name="$2"
    
    warn "Cleaning up after failure..."
    
    # Remove worktree if it exists
    if [ -d "$worktree_path" ]; then
        git worktree remove --force "$worktree_path" 2>/dev/null || true
    fi
    
    # Delete branch if it exists
    git branch -D "$branch_name" 2>/dev/null || true
}

# Validate arguments
if [ $# -ne 3 ]; then
    error "Usage: create-worktree.sh <task-id> <base-branch> <repo-path>"
fi

TASK_ID="$1"
BASE_BRANCH="$2"
REPO_PATH="$3"

# Validate task ID (alphanumeric, dashes, underscores only)
if ! [[ "$TASK_ID" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    error "Invalid task-id: '$TASK_ID'. Use only alphanumeric characters, dashes, and underscores."
fi

# Validate repo path exists
if [ ! -d "$REPO_PATH" ]; then
    error "Repository path does not exist: $REPO_PATH"
fi

# Check if it's a git repository
if [ ! -d "$REPO_PATH/.git" ]; then
    error "Not a git repository: $REPO_PATH"
fi

# Change to repo directory
cd "$REPO_PATH" || error "Failed to change to repository directory: $REPO_PATH"

# Check for git worktree command
if ! git worktree --help &>/dev/null; then
    error "git worktree command not available. Requires Git 2.5+"
fi

# Validate base branch exists
if ! git rev-parse --verify "$BASE_BRANCH" &>/dev/null; then
    error "Base branch does not exist: $BASE_BRANCH"
fi

# Define branch and worktree path
BRANCH_NAME="agent/${TASK_ID}"
WORKTREE_BASE="${REPO_PATH}-worktrees"
WORKTREE_PATH="${WORKTREE_BASE}/${TASK_ID}"

# Check if branch already exists
if git rev-parse --verify "$BRANCH_NAME" &>/dev/null; then
    error "Branch already exists: $BRANCH_NAME. Task ID may already be in use."
fi

# Check if worktree directory already exists
if [ -d "$WORKTREE_PATH" ]; then
    error "Worktree directory already exists: $WORKTREE_PATH"
fi

# Create worktrees base directory if it doesn't exist
mkdir -p "$WORKTREE_BASE" || error "Failed to create worktrees base directory: $WORKTREE_BASE"

# Check available disk space (require at least 1GB free)
AVAILABLE_SPACE=$(df -k "$WORKTREE_BASE" | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then
    error "Insufficient disk space. At least 1GB required, $(( AVAILABLE_SPACE / 1024 ))MB available."
fi

# H1 fix: Per-repo lock with retry mechanism for parallel spawning
LOCK_DIR="${WORKTREE_BASE}/.worktree.lock"
MAX_LOCK_RETRIES=3
LOCK_RETRY_DELAY=2
LOCK_ACQUIRED=false

for _lock_attempt in $(seq 1 $MAX_LOCK_RETRIES); do
    # Try to acquire lock (mkdir is atomic)
    if mkdir "$LOCK_DIR" 2>/dev/null; then
        LOCK_ACQUIRED=true
        break
    fi

    # Check if lock is stale (> 5 minutes old)
    if [ -d "$LOCK_DIR" ]; then
        LOCK_MTIME=$(stat -f %m "$LOCK_DIR" 2>/dev/null || stat -c %Y "$LOCK_DIR" 2>/dev/null || echo "")
        if [ -z "$LOCK_MTIME" ]; then
            error "Cannot determine lock age. Remove manually: rmdir $LOCK_DIR"
        fi
        LOCK_AGE=$(($(date +%s) - LOCK_MTIME))
        if [ "$LOCK_AGE" -gt 300 ]; then
            warn "Stale lock detected (${LOCK_AGE}s old), removing..."
            rmdir "$LOCK_DIR" 2>/dev/null || rm -rf "$LOCK_DIR" 2>/dev/null || true
            if mkdir "$LOCK_DIR" 2>/dev/null; then
                LOCK_ACQUIRED=true
                break
            fi
        fi
    fi

    if [ "$_lock_attempt" -lt "$MAX_LOCK_RETRIES" ]; then
        warn "Lock held by another operation. Retry $_lock_attempt/$MAX_LOCK_RETRIES in ${LOCK_RETRY_DELAY}s..."
        sleep "$LOCK_RETRY_DELAY"
    fi
done

if ! $LOCK_ACQUIRED; then
    error "Another worktree operation is in progress after $MAX_LOCK_RETRIES retries. Please wait and try again."
fi

# Ensure lock is released on exit
trap_cleanup() {
    rmdir "$LOCK_DIR" 2>/dev/null || true
    cleanup_on_failure "$WORKTREE_PATH" "$BRANCH_NAME"
}
trap 'trap_cleanup' ERR EXIT

# Note: trap will be set after lock acquisition

# Create the worktree
echo "Creating worktree for task: $TASK_ID"
echo "  Base branch: $BASE_BRANCH"
echo "  New branch: $BRANCH_NAME"
echo "  Worktree path: $WORKTREE_PATH"

if ! git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" "$BASE_BRANCH"; then
    error "Failed to create worktree"
fi

# Verify worktree was created successfully
# Note: worktrees have a .git file (not directory) that points to the main repo
if [ ! -e "$WORKTREE_PATH/.git" ]; then
    error "Worktree created but .git link not found"
fi

# Output the absolute path
ABSOLUTE_PATH=$(cd "$WORKTREE_PATH" && pwd)
success "✓ Worktree created successfully: $ABSOLUTE_PATH"
echo "$ABSOLUTE_PATH"

# Release the lock and clear trap
rmdir "$LOCK_DIR" 2>/dev/null || true
trap - ERR EXIT

exit 0

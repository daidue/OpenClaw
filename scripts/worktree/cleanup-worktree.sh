#!/usr/bin/env bash
# cleanup-worktree.sh - Merges completed work and removes worktree
# Usage: cleanup-worktree.sh <task-id> <repo-path> [--force]

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

# Function to log info
info() {
    echo "$1"
}

# Parse arguments
FORCE_MODE=false
TASK_ID=""
REPO_PATH=""

while [ $# -gt 0 ]; do
    case "$1" in
        --force)
            FORCE_MODE=true
            shift
            ;;
        *)
            if [ -z "$TASK_ID" ]; then
                TASK_ID="$1"
            elif [ -z "$REPO_PATH" ]; then
                REPO_PATH="$1"
            else
                error "Unknown argument: $1"
            fi
            shift
            ;;
    esac
done

# Validate required arguments
if [ -z "$TASK_ID" ] || [ -z "$REPO_PATH" ]; then
    error "Usage: cleanup-worktree.sh <task-id> <repo-path> [--force]"
fi

# Validate task ID
if ! [[ "$TASK_ID" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    error "Invalid task-id: '$TASK_ID'"
fi

# Validate repo path exists
if [ ! -d "$REPO_PATH" ]; then
    error "Repository path does not exist: $REPO_PATH"
fi

# Check if it's a git repository
if [ ! -d "$REPO_PATH/.git" ]; then
    error "Not a git repository: $REPO_PATH"
fi

# Define paths
BRANCH_NAME="agent/${TASK_ID}"
WORKTREE_BASE="${REPO_PATH}-worktrees"
WORKTREE_PATH="${WORKTREE_BASE}/${TASK_ID}"
REGISTRY_FILE="${HOME}/.openclaw/workspace/.clawdbot/active-tasks.json"

# Check if worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    warn "Worktree directory does not exist: $WORKTREE_PATH"
    warn "Attempting to clean up branch only..."
    
    cd "$REPO_PATH" || error "Failed to change to repository directory"
    
    if git rev-parse --verify "$BRANCH_NAME" &>/dev/null; then
        git branch -D "$BRANCH_NAME" || warn "Failed to delete branch: $BRANCH_NAME"
        success "✓ Branch deleted: $BRANCH_NAME"
    fi
    
    exit 0
fi

# Change to worktree directory
cd "$WORKTREE_PATH" || error "Failed to change to worktree directory"

# Use locking for mutual exclusion (macOS compatible)
LOCK_DIR="${WORKTREE_BASE}/.worktree.lock"

# Try to acquire lock (mkdir is atomic)
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    # Check if lock is stale (> 5 minutes old)
    if [ -d "$LOCK_DIR" ]; then
        LOCK_AGE=$(($(date +%s) - $(stat -f %m "$LOCK_DIR" 2>/dev/null || stat -c %Y "$LOCK_DIR" 2>/dev/null || echo 0)))
        if [ "$LOCK_AGE" -gt 300 ]; then
            warn "Stale lock detected (${LOCK_AGE}s old), removing..."
            rmdir "$LOCK_DIR" 2>/dev/null || true
            if ! mkdir "$LOCK_DIR" 2>/dev/null; then
                error "Another worktree operation is in progress. Please wait and try again."
            fi
        else
            error "Another worktree operation is in progress. Please wait and try again."
        fi
    else
        error "Another worktree operation is in progress. Please wait and try again."
    fi
fi

# Ensure lock is released on exit
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

# Check for uncommitted changes
if ! $FORCE_MODE; then
    if ! git diff-index --quiet HEAD --; then
        error "Uncommitted changes detected in worktree. Commit changes or use --force to discard."
    fi
    
    # Check for untracked files that might be important
    UNTRACKED=$(git ls-files --others --exclude-standard)
    if [ -n "$UNTRACKED" ]; then
        warn "Untracked files detected:"
        echo "$UNTRACKED"
        error "Add/commit untracked files or use --force to discard."
    fi
fi

# Get the main/master branch name
cd "$REPO_PATH" || error "Failed to change to repository directory"

MAIN_BRANCH=""
if git rev-parse --verify main &>/dev/null; then
    MAIN_BRANCH="main"
elif git rev-parse --verify master &>/dev/null; then
    MAIN_BRANCH="master"
else
    error "Could not find main or master branch"
fi

info "Merging $BRANCH_NAME into $MAIN_BRANCH..."

# Get current branch to restore if merge fails
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Switch to main branch
if ! git checkout "$MAIN_BRANCH"; then
    error "Failed to checkout $MAIN_BRANCH"
fi

# Attempt merge
if ! git merge --no-ff "$BRANCH_NAME" -m "Merge agent task: $TASK_ID"; then
    warn "Merge conflict detected!"
    
    # Abort the merge
    git merge --abort
    
    # Restore original branch
    git checkout "$CURRENT_BRANCH" &>/dev/null || true
    
    # Release lock (trap will handle it, but be explicit for error path)
    rmdir "$LOCK_DIR" 2>/dev/null || true
    
    error "Merge conflicts detected. Please resolve manually:
    1. cd $REPO_PATH
    2. git checkout $MAIN_BRANCH
    3. git merge $BRANCH_NAME
    4. Resolve conflicts
    5. git commit
    6. Run cleanup-worktree.sh again

Worktree preserved at: $WORKTREE_PATH"
fi

success "✓ Merged $BRANCH_NAME into $MAIN_BRANCH"

# Remove the worktree
info "Removing worktree: $WORKTREE_PATH"

if ! git worktree remove "$WORKTREE_PATH"; then
    # If normal removal fails, try force
    warn "Normal worktree removal failed, forcing..."
    git worktree remove --force "$WORKTREE_PATH" || error "Failed to remove worktree"
fi

success "✓ Worktree removed"

# Delete the branch
info "Deleting branch: $BRANCH_NAME"

if ! git branch -d "$BRANCH_NAME"; then
    warn "Normal branch deletion failed, forcing..."
    git branch -D "$BRANCH_NAME" || error "Failed to delete branch"
fi

success "✓ Branch deleted"

# Update task registry if it exists
if [ -f "$REGISTRY_FILE" ]; then
    # Use jq if available, otherwise use a simple approach
    if command -v jq &>/dev/null; then
        TEMP_FILE=$(mktemp)
        jq --arg task_id "$TASK_ID" '
            if type == "array" then
                map(if .taskId == $task_id then .status = "completed" | .completedAt = now else . end)
            else
                .
            end
        ' "$REGISTRY_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$REGISTRY_FILE"
        
        success "✓ Task registry updated"
    else
        info "jq not found, skipping registry update"
    fi
fi

# Release lock (trap will handle it, but be explicit)
rmdir "$LOCK_DIR" 2>/dev/null || true

success "✓ Cleanup complete for task: $TASK_ID"

exit 0

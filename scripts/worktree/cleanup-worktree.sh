#!/usr/bin/env bash
# cleanup-worktree.sh - Merges completed work and removes worktree
# Usage: cleanup-worktree.sh <task-id> <repo-path> [--force]
#
# Integration Contract: ~/.openclaw/workspace/.clawdbot/INTEGRATION-CONTRACT.md
# - Does NOT update registry directly — delegates to complete-task.sh
# - complete-task.sh handles archival + pattern capture prompt
# - Uses canonical .id field (not .taskId)

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}WARNING: $1${NC}" >&2
}

success() {
    echo -e "${GREEN}$1${NC}"
}

info() {
    echo -e "${BLUE}$1${NC}"
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

if [ ! -d "$REPO_PATH/.git" ]; then
    error "Not a git repository: $REPO_PATH"
fi

# Define paths
BRANCH_NAME="agent/${TASK_ID}"
WORKTREE_BASE="${REPO_PATH}-worktrees"
WORKTREE_PATH="${WORKTREE_BASE}/${TASK_ID}"
COMPLETE_SCRIPT="${HOME}/.openclaw/workspace/.clawdbot/scripts/complete-task.sh"

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

# H1 fix: Per-repo lock with retry mechanism for parallel operations
LOCK_DIR="${WORKTREE_BASE}/.worktree.lock"
MAX_LOCK_RETRIES=3
LOCK_RETRY_DELAY=2
LOCK_ACQUIRED=false

for _lock_attempt in $(seq 1 $MAX_LOCK_RETRIES); do
    if mkdir "$LOCK_DIR" 2>/dev/null; then
        LOCK_ACQUIRED=true
        break
    fi

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
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

# Check for uncommitted changes in worktree
if $FORCE_MODE; then
    # H4 fix: Even in force mode, warn about uncommitted changes being discarded
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        DIRTY_FILES=$(git diff --name-only HEAD -- 2>/dev/null || true)
        warn "⚠️  --force will discard uncommitted changes in worktree:"
        echo "$DIRTY_FILES" | while IFS= read -r f; do [ -n "$f" ] && echo "  - $f"; done
    fi
    UNTRACKED_FORCE=$(git ls-files --others --exclude-standard 2>/dev/null || true)
    if [ -n "$UNTRACKED_FORCE" ]; then
        warn "⚠️  --force will discard untracked files in worktree:"
        echo "$UNTRACKED_FORCE" | while IFS= read -r f; do [ -n "$f" ] && echo "  - $f"; done
    fi
else
    if ! git diff-index --quiet HEAD --; then
        error "Uncommitted changes detected in worktree. Commit changes or use --force to discard."
    fi
    
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

# C2 fix: Check main repo for uncommitted changes before checkout/merge
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    error "Main repository has uncommitted changes. Commit or stash before cleanup.
Worktree preserved at: $WORKTREE_PATH"
fi

info "Merging $BRANCH_NAME into $MAIN_BRANCH..."

# C3 fix: Save current branch to restore on ALL paths (success + failure)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if ! git checkout "$MAIN_BRANCH"; then
    error "Failed to checkout $MAIN_BRANCH"
fi

# Attempt merge
if ! git merge --no-ff "$BRANCH_NAME" -m "Merge agent task: $TASK_ID"; then
    warn "Merge conflict detected!"
    git merge --abort
    git checkout "$CURRENT_BRANCH" &>/dev/null || true
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

# C3 fix: Restore original branch after successful merge
if [ "$CURRENT_BRANCH" != "$MAIN_BRANCH" ] && [ "$CURRENT_BRANCH" != "HEAD" ]; then
    git checkout "$CURRENT_BRANCH" &>/dev/null || warn "Could not restore branch: $CURRENT_BRANCH (staying on $MAIN_BRANCH)"
fi

# Remove the worktree
info "Removing worktree: $WORKTREE_PATH"

if ! git worktree remove "$WORKTREE_PATH"; then
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

# ==========================================================================
# PATTERN INTEGRATION (C3 fix): Delegate to complete-task.sh
# This handles: registry archival + pattern capture prompt
# ==========================================================================

info "Completing task and capturing patterns..."

if [ -x "$COMPLETE_SCRIPT" ]; then
    # Call complete-task.sh — it handles registry update AND pattern capture
    "$COMPLETE_SCRIPT" "$TASK_ID" "completed" "Merged $BRANCH_NAME into $MAIN_BRANCH via cleanup-worktree"
    success "✓ Task completed and archived via complete-task.sh"
else
    warn "complete-task.sh not found at $COMPLETE_SCRIPT"
    warn "Skipping registry archival and pattern capture."
    warn "Run manually: complete-task.sh $TASK_ID completed 'Merged'"
    
    echo ""
    echo -e "${YELLOW}📝 REMINDER: Capture patterns from this task!${NC}"
    echo "   Run: complete-task.sh $TASK_ID completed \"<result summary>\""
    echo "   This will prompt you to capture lessons learned."
fi

# Release lock (trap will handle it, but be explicit)
rmdir "$LOCK_DIR" 2>/dev/null || true

success "✓ Cleanup complete for task: $TASK_ID"

exit 0

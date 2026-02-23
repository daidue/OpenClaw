#!/bin/bash
# smart-clone.sh — Idempotent git clone helper
# Usage: bash scripts/smart-clone.sh <repo-url> [target-dir]
# 
# Prevents "destination path already exists" errors by checking first

set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: smart-clone.sh <repo-url> [target-dir]"
    exit 1
fi

REPO_URL="$1"
TARGET_DIR="${2:-}"

# Extract repo name from URL if no target dir specified
if [[ -z "$TARGET_DIR" ]]; then
    TARGET_DIR=$(basename "$REPO_URL" .git)
fi

# Check if directory already exists
if [[ -d "$TARGET_DIR" ]]; then
    echo "✅ Repository already exists: $TARGET_DIR"
    
    # Verify it's a git repo
    if [[ -d "$TARGET_DIR/.git" ]]; then
        cd "$TARGET_DIR"
        
        # Get current remote URL
        CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
        
        if [[ "$CURRENT_REMOTE" == "$REPO_URL" ]]; then
            echo "✅ Remote matches: $REPO_URL"
            echo "📦 Fetching latest..."
            git fetch --quiet origin
            echo "✅ Done. Repository is ready."
        else
            echo "⚠️  Warning: Remote URL mismatch"
            echo "   Expected: $REPO_URL"
            echo "   Found:    $CURRENT_REMOTE"
            echo "   Using existing repository anyway."
        fi
        
        cd - > /dev/null
    else
        echo "⚠️  Warning: Directory exists but is not a git repository"
        echo "   Path: $TARGET_DIR"
        echo "   You may want to manually remove it and re-run."
        exit 1
    fi
else
    echo "📥 Cloning: $REPO_URL"
    echo "📁 Target:  $TARGET_DIR"
    
    git clone "$REPO_URL" "$TARGET_DIR"
    
    echo "✅ Clone complete: $TARGET_DIR"
fi

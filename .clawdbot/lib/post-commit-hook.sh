#!/bin/bash
# Post-commit hook to auto-update WORKQUEUE.md
# Install: cp this to .git/hooks/post-commit && chmod +x .git/hooks/post-commit
# Or: ln -sf ~/.openclaw/workspace/.clawdbot/lib/post-commit-hook.sh .git/hooks/post-commit

COMMIT_MSG=$(git log -1 --pretty=%B)
COMMIT_SHA=$(git rev-parse --short HEAD)
DATE=$(date -I)

# Path to WORKQUEUE.md
WORKQUEUE="$HOME/.openclaw/workspace-titlerun/WORKQUEUE.md"
UPDATER="$HOME/.openclaw/workspace/.clawdbot/lib/workqueue-updater.js"

# Only proceed if both files exist
[ ! -f "$WORKQUEUE" ] && exit 0
[ ! -f "$UPDATER" ] && exit 0

# Skip if this commit is a WORKQUEUE update (prevent recursion)
case "$COMMIT_MSG" in
  "docs: auto-update WORKQUEUE"*|"chore: WORKQUEUE"*) exit 0 ;;
esac

# Only trigger on conventional commit prefixes
case "$COMMIT_MSG" in
  feat:*|feat\(*|fix:*|fix\(*|test:*|test\(*|chore:*|chore\(*|refactor:*|refactor\(*|perf:*|perf\(*)
    # Run updater in background (don't block git)
    node "$UPDATER" \
      --commit-msg "$COMMIT_MSG" \
      --commit "$COMMIT_SHA" \
      --date "$DATE" 2>/dev/null &
    ;;
esac

exit 0

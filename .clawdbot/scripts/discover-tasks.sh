#!/usr/bin/env bash
set -euo pipefail

# Scan GitHub repos for bugs/critical issues and spawn agents
# Uses OpenClaw native subagent spawning

REPOS=(
  "titlerun-api"
  "titlerun-app"
)

API_REPO="$HOME/Documents/Claude Cowork Business/titlerun-api"
APP_REPO="$HOME/Documents/Claude Cowork Business/titlerun-app"

echo "🔍 Discovering tasks from GitHub ($(date))"

for repo in "${REPOS[@]}"; do
  echo ""
  echo "📦 Scanning $repo..."
  
  # Set repo path
  if [ "$repo" = "titlerun-api" ]; then
    REPO_PATH="$API_REPO"
  else
    REPO_PATH="$APP_REPO"
  fi
  
  cd "$REPO_PATH"
  
  # Get open issues with bug or critical labels
  gh issue list \
    --state open \
    --label bug,critical \
    --json number,title \
    --jq '.[] | "\(.number)|\(.title)"' | \
  while IFS='|' read -r num title; do
    echo "  🐛 Issue #$num: $title"
    
    # Sanitize title for task description
    SAFE_TITLE=$(echo "$title" | tr -cd '[:alnum:][:space:]-')
    
    # Spawn agent using OpenClaw native
    openclaw subagents spawn \
      --agent titlerun \
      --task "Fix GitHub #$num in $repo: $SAFE_TITLE" \
      --workdir "$(mktemp -d)" \
      --label "gh-$repo-$num" \
      --mode run \
      --timeout 7200
    
    echo "  ✅ Agent spawned for issue #$num"
  done
done

echo ""
echo "✅ Task discovery complete"

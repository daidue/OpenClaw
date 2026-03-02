#!/usr/bin/env bash
set -euo pipefail

# Simple wrapper around OpenClaw native subagent spawning
# Usage: spawn-agent.sh <task-description> [agent-id]
# Example: spawn-agent.sh "Fix GitHub #42 in titlerun-api: Login 401 error" titlerun

TASK_DESCRIPTION="$1"
AGENT_ID="${2:-titlerun}"

# Validate input (prevent command injection)
if [[ -z "$TASK_DESCRIPTION" ]]; then
  echo "Error: Task description required."
  echo "Usage: spawn-agent.sh <task-description> [agent-id]"
  exit 1
fi

# Spawn using OpenClaw native features
openclaw subagents spawn \
  --agent "$AGENT_ID" \
  --task "$TASK_DESCRIPTION" \
  --workdir "$(mktemp -d)" \
  --mode run \
  --timeout 7200

echo "✅ Agent spawned for: $TASK_DESCRIPTION"

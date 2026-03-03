#!/usr/bin/env bash
set -euo pipefail

AGENT="$1"
EVENT="$2"
TARGET="${3:-}"

EVENT_FILE="$HOME/.openclaw/workspace/shared/events/$(date +%Y-%m-%d).jsonl"

echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"agent\":\"$AGENT\",\"event\":\"$EVENT\",\"target\":\"$TARGET\"}" >> "$EVENT_FILE"

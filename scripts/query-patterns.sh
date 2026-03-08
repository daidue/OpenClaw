#!/bin/bash
# Fast grep-based pattern search
# Usage: query-patterns.sh <keyword>

KEYWORD="${1:-}"
PATTERNS_FILE="$HOME/.openclaw/workspace/memory/patterns.md"

if [ -z "$KEYWORD" ]; then
  echo "Usage: query-patterns.sh <keyword>"
  echo ""
  echo "Example:"
  echo "  query-patterns.sh database"
  echo "  query-patterns.sh 'error handling'"
  exit 1
fi

if [ ! -f "$PATTERNS_FILE" ]; then
  echo "❌ Patterns file not found: $PATTERNS_FILE"
  exit 1
fi

# Search and return matching sections with context
# -i = case insensitive
# -B 1 = 1 line before match
# -A 5 = 5 lines after match
# sed = format the -- separator as visual break
RESULTS=$(grep -A 5 -B 1 -i "$KEYWORD" "$PATTERNS_FILE" | sed 's/^--$/\n---\n/')

if [ -z "$RESULTS" ]; then
  echo "No patterns found matching: $KEYWORD"
  exit 0
fi

echo "📚 Patterns matching '$KEYWORD':"
echo ""
echo "$RESULTS"

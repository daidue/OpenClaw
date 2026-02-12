#!/bin/bash
# TitleRun Code Review — Reference Implementation Script
# This demonstrates the review process flow. Agents should adapt this logic.

set -e  # Exit on error

# Configuration
REPO_PATH="$HOME/Desktop/titlerun-api"
WORKSPACE="/Users/jeffdaniels/.openclaw/workspace-titlerun"
REVIEW_DIR="$WORKSPACE/reviews"
STATE_FILE="$WORKSPACE/.last-review-timestamp"
JEFF_INBOX="/Users/jeffdaniels/.openclaw/workspace/inboxes/jeff-inbox.md"

# Ensure directories exist
mkdir -p "$REVIEW_DIR"
mkdir -p "$WORKSPACE"

# Get last review timestamp or default to 8 hours ago
if [ -f "$STATE_FILE" ]; then
    LAST_REVIEW=$(cat "$STATE_FILE")
    echo "📅 Last review: $LAST_REVIEW"
else
    LAST_REVIEW="8 hours ago"
    echo "📅 No previous review found. Using default: $LAST_REVIEW"
fi

# Change to repo directory
cd "$REPO_PATH" || {
    echo "❌ ERROR: Cannot access $REPO_PATH"
    echo "Ensure ~/Desktop/titlerun-api exists and is a valid git repo."
    exit 1
}

# Fetch recent commits
echo "🔍 Fetching commits since $LAST_REVIEW..."
COMMITS=$(gh log --since "$LAST_REVIEW" --format="%H|%s" 2>/dev/null || echo "")

if [ -z "$COMMITS" ]; then
    echo "✅ No new commits to review. Exiting gracefully."
    exit 0
fi

COMMIT_COUNT=$(echo "$COMMITS" | wc -l | xargs)
FIRST_HASH=$(echo "$COMMITS" | tail -1 | cut -d'|' -f1)
LAST_HASH=$(echo "$COMMITS" | head -1 | cut -d'|' -f1)

echo "📊 Found $COMMIT_COUNT commits ($FIRST_HASH..$LAST_HASH)"

# Generate review filename
REVIEW_FILE="$REVIEW_DIR/$(date '+%Y-%m-%d-%H%M').md"
echo "📝 Review will be written to: $REVIEW_FILE"

# Fetch changed files for all commits
echo "📂 Analyzing changed files..."
CHANGED_FILES=""
while IFS='|' read -r hash subject; do
    echo "  - $hash: $subject"
    FILES=$(gh api "repos/daidue/titlerun-api/commits/$hash" --jq '.files[] | "\(.filename)|\(.status)|+\(.additions)|-\(.deletions)"' 2>/dev/null || echo "")
    if [ -n "$FILES" ]; then
        CHANGED_FILES="$CHANGED_FILES\n$FILES"
    fi
done <<< "$COMMITS"

# Count stats
TOTAL_FILES=$(echo -e "$CHANGED_FILES" | grep -v '^$' | wc -l | xargs)
TOTAL_ADDITIONS=$(echo -e "$CHANGED_FILES" | grep -v '^$' | cut -d'|' -f3 | sed 's/+//' | awk '{sum+=$1} END {print sum}')
TOTAL_DELETIONS=$(echo -e "$CHANGED_FILES" | grep -v '^$' | cut -d'|' -f4 | sed 's/-//' | awk '{sum+=$1} END {print sum}')

echo "📈 Stats: $TOTAL_FILES files changed, +$TOTAL_ADDITIONS/-$TOTAL_DELETIONS lines"

# Read file contents (up to 500 lines each)
echo "📖 Reading file contents..."
FILE_CONTENTS=""
while IFS='|' read -r filepath status additions deletions; do
    if [ -n "$filepath" ] && [ -f "$filepath" ]; then
        echo "  - Reading: $filepath"
        CONTENT=$(head -500 "$filepath" 2>/dev/null || echo "[Error reading file]")
        FILE_CONTENTS="$FILE_CONTENTS\n\n### $filepath ($status, $additions/$deletions)\n\`\`\`\n$CONTENT\n\`\`\`"
    fi
done <<< "$(echo -e "$CHANGED_FILES" | grep -v '^$')"

# TODO: Agent implementation would now:
# 1. Load titlerun-dev skill for codebase context
# 2. Run 10-expert panel analysis on the changed files
# 3. Each expert scores: Critical/Major/Minor bugs, Security issues, Improvements
# 4. Aggregate scores: Start at 100, deduct per severity
# 5. Generate markdown output (see SKILL.md for format)

# For this reference script, we'll create a template output
cat > "$REVIEW_FILE" << EOF
# TitleRun Code Review — $(date '+%Y-%m-%d %H:%M EST')

## Summary
**Commits Reviewed:** $COMMIT_COUNT ($FIRST_HASH..$LAST_HASH)
**Files Changed:** $TOTAL_FILES (+$TOTAL_ADDITIONS/-$TOTAL_DELETIONS lines)
**Overall Health Score:** [Agent calculates this]/100 [🟢/🟡/🟠/🔴]

---

## 🔴 Critical Issues (Fix Immediately)
*[Agent populates — if none: "None found — excellent!"]*

---

## 🟡 Major Issues (Fix This Sprint)
*[Agent populates — if none: "None found."]*

---

## 🟢 Minor Issues (Fix When Convenient)
*[Agent populates — if none: "None found."]*

---

## 💡 Improvements Recommended

### High Impact
*[Agent populates]*

### Medium Impact
*[Agent populates]*

### Low Impact
*[Agent populates]*

---

## ✅ What's Working Well
*[Agent populates — celebrate wins]*

---

## Expert Breakdown
1. **Security Architect:** [Agent populates]
2. **Database Engineer:** [Agent populates]
3. **Node.js Performance Engineer:** [Agent populates]
4. **API Design Specialist:** [Agent populates]
5. **Testing Engineer:** [Agent populates]
6. **Fantasy Sports Domain Expert:** [Agent populates]
7. **DevOps/Reliability Engineer:** [Agent populates]
8. **Data Pipeline Architect:** [Agent populates]
9. **Bayesian/Statistical Methods Expert:** [Agent populates]
10. **Frontend/UX Engineer:** [Agent populates]

---

## Scoring Breakdown
| Category | Count | Deduction |
|----------|-------|-----------|
| Critical Bugs | [N] | -[N×15] |
| Major Bugs | [N] | -[N×8] |
| Minor Bugs | [N] | -[N×3] |
| Security Issues | [N] | -[N×20] |
| **Total Deductions** | | **-[sum]** |
| **Final Score** | | **[100-sum]/100** |

---

## Next Actions for Rush
- [ ] [Agent populates prioritized checklist]

---

**Review completed at $(date '+%H:%M:%S EST') by TitleRun Code Review Panel v1.0**

---

## Raw Data (For Agent Processing)

### Commits
$(echo "$COMMITS" | while IFS='|' read -r hash subject; do echo "- $hash: $subject"; done)

### Changed Files
$(echo -e "$CHANGED_FILES" | grep -v '^$' | while IFS='|' read -r filepath status additions deletions; do echo "- $filepath ($status, $additions/$deletions)"; done)

EOF

echo "✅ Review template created: $REVIEW_FILE"

# Update state file
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$STATE_FILE"
echo "📌 Updated last review timestamp: $(cat "$STATE_FILE")"

# Post to Jeff's inbox
echo "" >> "$JEFF_INBOX"
echo "## [$(date '+%Y-%m-%d %H:%M')] TitleRun Code Review Complete" >> "$JEFF_INBOX"
echo "**From:** Rush (via titlerun-code-review skill)" >> "$JEFF_INBOX"
echo "**Score:** [Agent calculates]/100 [🟢/🟡/🟠/🔴]" >> "$JEFF_INBOX"
echo "**Commits:** $COMMIT_COUNT" >> "$JEFF_INBOX"
echo "**Files Changed:** $TOTAL_FILES" >> "$JEFF_INBOX"
echo "**Full Report:** \`$REVIEW_FILE\`" >> "$JEFF_INBOX"
echo "" >> "$JEFF_INBOX"
echo "[Agent: Replace this with actual score and critical issue count]" >> "$JEFF_INBOX"
echo "" >> "$JEFF_INBOX"

echo "📬 Posted summary to Jeff's inbox"

echo ""
echo "✅ Review process complete!"
echo "📄 Full report: $REVIEW_FILE"
echo "📬 Inbox summary: $JEFF_INBOX"
echo ""
echo "⚠️  NOTE: This is a template. Agents should implement the 10-expert analysis logic."

#!/bin/bash
# TitleRun Code Review — Reference Implementation Script
# This demonstrates the review process flow. Agents should adapt this logic.

set -e  # Exit on error

# Configuration
BACKEND_REPO="$HOME/Desktop/titlerun-api"
FRONTEND_REPO="$HOME/Documents/Claude Cowork Business/dpm-app"
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

# Function to fetch commits from a repo
fetch_commits() {
    local repo_path="$1"
    local repo_name="$2"
    
    if [ ! -d "$repo_path" ]; then
        echo "⚠️  WARNING: Cannot access $repo_path (skipping $repo_name)"
        return 1
    fi
    
    cd "$repo_path" || return 1
    
    echo "🔍 Fetching $repo_name commits since $LAST_REVIEW..."
    local commits=$(git log --since="$LAST_REVIEW" --format="%H|%s" 2>/dev/null || echo "")
    
    if [ -n "$commits" ]; then
        echo "$commits" | while IFS='|' read -r hash subject; do
            echo "$repo_name|$hash|$subject"
        done
    fi
}

# Fetch commits from both repositories
ALL_COMMITS=""
BACKEND_COMMITS=$(fetch_commits "$BACKEND_REPO" "backend")
FRONTEND_COMMITS=$(fetch_commits "$FRONTEND_REPO" "frontend")

ALL_COMMITS="$BACKEND_COMMITS"
if [ -n "$FRONTEND_COMMITS" ]; then
    if [ -n "$ALL_COMMITS" ]; then
        ALL_COMMITS="$ALL_COMMITS\n$FRONTEND_COMMITS"
    else
        ALL_COMMITS="$FRONTEND_COMMITS"
    fi
fi

if [ -z "$ALL_COMMITS" ]; then
    echo "✅ No new commits to review in either repository. Exiting gracefully."
    exit 0
fi

COMMIT_COUNT=$(echo -e "$ALL_COMMITS" | grep -v '^$' | wc -l | xargs)
echo "📊 Found $COMMIT_COUNT commits across both repositories"

echo "📊 Found $COMMIT_COUNT commits ($FIRST_HASH..$LAST_HASH)"

# Generate review filename
REVIEW_FILE="$REVIEW_DIR/$(date '+%Y-%m-%d-%H%M').md"
echo "📝 Review will be written to: $REVIEW_FILE"

# Function to get changed files for a commit in a repo
get_changed_files() {
    local repo_path="$1"
    local repo_name="$2"
    local hash="$3"
    
    cd "$repo_path" || return 1
    
    # Get list of changed files using git show
    git show --name-status "$hash" 2>/dev/null | grep -E '^[AMD]' | while read -r status filename; do
        # Get addition/deletion counts (simplified)
        local stats=$(git show --numstat "$hash" -- "$filename" 2>/dev/null | head -1)
        local additions=$(echo "$stats" | cut -f1)
        local deletions=$(echo "$stats" | cut -f2)
        
        # Default to 0 if stats unavailable
        [ "$additions" = "-" ] && additions="0"
        [ "$deletions" = "-" ] && deletions="0"
        [ -z "$additions" ] && additions="0"
        [ -z "$deletions" ] && deletions="0"
        
        echo "$repo_name|$filename|$status|+$additions|-$deletions"
    done
}

# Fetch changed files for all commits
echo "📂 Analyzing changed files..."
CHANGED_FILES=""
while IFS='|' read -r repo_name hash subject; do
    echo "  - [$repo_name] $hash: $subject"
    
    if [ "$repo_name" = "backend" ]; then
        repo_path="$BACKEND_REPO"
    elif [ "$repo_name" = "frontend" ]; then
        repo_path="$FRONTEND_REPO"
    else
        echo "    ⚠️  Unknown repository: $repo_name"
        continue
    fi
    
    FILES=$(get_changed_files "$repo_path" "$repo_name" "$hash")
    if [ -n "$FILES" ]; then
        if [ -n "$CHANGED_FILES" ]; then
            CHANGED_FILES="$CHANGED_FILES\n$FILES"
        else
            CHANGED_FILES="$FILES"
        fi
    fi
done <<< "$(echo -e "$ALL_COMMITS" | grep -v '^$')"

# Count stats
TOTAL_FILES=$(echo -e "$CHANGED_FILES" | grep -v '^$' | wc -l | xargs)
TOTAL_ADDITIONS=$(echo -e "$CHANGED_FILES" | grep -v '^$' | cut -d'|' -f4 | sed 's/+//' | awk '{sum+=$1} END {print sum}')
TOTAL_DELETIONS=$(echo -e "$CHANGED_FILES" | grep -v '^$' | cut -d'|' -f5 | sed 's/-//' | awk '{sum+=$1} END {print sum}')

echo "📈 Stats: $TOTAL_FILES files changed, +$TOTAL_ADDITIONS/-$TOTAL_DELETIONS lines"

# Read file contents (up to 500 lines each)
echo "📖 Reading file contents..."
FILE_CONTENTS=""
while IFS='|' read -r repo_name filepath status additions deletions; do
    if [ -n "$filepath" ]; then
        # Determine full file path
        if [ "$repo_name" = "backend" ]; then
            full_path="$BACKEND_REPO/$filepath"
        elif [ "$repo_name" = "frontend" ]; then
            full_path="$FRONTEND_REPO/$filepath"
        else
            echo "    ⚠️  Unknown repository: $repo_name"
            continue
        fi
        
        if [ -f "$full_path" ]; then
            echo "  - Reading: [$repo_name] $filepath"
            CONTENT=$(head -500 "$full_path" 2>/dev/null || echo "[Error reading file]")
            FILE_CONTENTS="$FILE_CONTENTS\n\n### [$repo_name] $filepath ($status, $additions/$deletions)\n\`\`\`\n$CONTENT\n\`\`\`"
        else
            echo "  - Missing: [$repo_name] $filepath (probably deleted)"
            FILE_CONTENTS="$FILE_CONTENTS\n\n### [$repo_name] $filepath ($status, $additions/$deletions)\n\`\`\`\n[File deleted or not found]\n\`\`\`"
        fi
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
**Commits Reviewed:** $COMMIT_COUNT across backend + frontend
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
$(echo -e "$ALL_COMMITS" | grep -v '^$' | while IFS='|' read -r repo_name hash subject; do echo "- [$repo_name] $hash: $subject"; done)

### Changed Files
$(echo -e "$CHANGED_FILES" | grep -v '^$' | while IFS='|' read -r repo_name filepath status additions deletions; do echo "- [$repo_name] $filepath ($status, $additions/$deletions)"; done)

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

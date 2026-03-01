---
name: titlerun-dogfood
description: 'Systematic QA testing of TitleRun using Vercel Labs dogfood skill. Run weekly before staging deploys to catch bugs early with full video/screenshot reproduction evidence.'
---

# TitleRun Dogfood - Automated QA Testing

**Purpose:** Systematically explore app.titlerun.co like a real user, find bugs, and produce detailed reports with video/screenshot evidence.

**When to run:**
- Weekly (Sunday, part of portfolio review)
- Before staging deploys
- After major feature implementations
- Before production releases

---

## Quick Start

```bash
# Run dogfood session (30-60 min)
cd ~/.openclaw/workspace/titlerun-qa
OUTPUT_DIR="dogfood-$(date +%Y-%m-%d)"
mkdir -p $OUTPUT_DIR/{screenshots,videos}

# Start session
agent-browser --session titlerun-qa open https://app.titlerun.co

# Authenticate (if needed)
agent-browser --session titlerun-qa snapshot -i
# Click sign-in, complete OAuth
agent-browser --session titlerun-qa state save $OUTPUT_DIR/auth-state.json

# Explore systematically
# Trade Builder, Trade Finder, Report Cards, etc.

# Document issues as found
# issue-001.webm, issue-001-step-1.png, etc.

# Close
agent-browser --session titlerun-qa close
```

---

## Core Workflow

### 1. Initialize
```bash
OUTPUT_DIR="dogfood-$(date +%Y-%m-%d)"
mkdir -p $OUTPUT_DIR/{screenshots,videos}
agent-browser --session titlerun-qa open https://app.titlerun.co
agent-browser --session titlerun-qa wait --load networkidle
```

### 2. Authenticate
```bash
# If not already logged in
agent-browser --session titlerun-qa snapshot -i
# Identify sign-in button (@eN from snapshot)
agent-browser --session titlerun-qa click @eN
# Complete Sleeper OAuth
agent-browser --session titlerun-qa state save $OUTPUT_DIR/auth-state.json
```

Or restore previous auth:
```bash
agent-browser --session titlerun-qa state load dogfood-YYYY-MM-DD/auth-state.json
```

### 3. Orient
```bash
agent-browser --session titlerun-qa screenshot --annotate $OUTPUT_DIR/screenshots/initial.png
agent-browser --session titlerun-qa snapshot -i
# Review navigation structure
```

### 4. Explore (Core Workflows)

**Trade Builder:**
```bash
# Navigate
agent-browser --session titlerun-qa click @eN  # Trade Builder nav

# Test functionality
agent-browser --session titlerun-qa snapshot -i
# Add players, remove players, submit trade
# Check for broken features
# Check console: agent-browser --session titlerun-qa console
```

**Trade Finder:**
```bash
# Test search, filters, results
agent-browser --session titlerun-qa snapshot -i
```

**Report Cards:**
```bash
# Test data display, navigation
agent-browser --session titlerun-qa snapshot -i
```

### 5. Document Issues

For each bug found:

```bash
# Start video
agent-browser --session titlerun-qa record start $OUTPUT_DIR/videos/issue-001-repro.webm

# Reproduce (human-paced)
agent-browser --session titlerun-qa screenshot $OUTPUT_DIR/screenshots/issue-001-step-1.png
sleep 1
agent-browser --session titlerun-qa click @eN
sleep 1
agent-browser --session titlerun-qa screenshot $OUTPUT_DIR/screenshots/issue-001-step-2.png
sleep 2
agent-browser --session titlerun-qa screenshot --annotate $OUTPUT_DIR/screenshots/issue-001-result.png

# Stop video
agent-browser --session titlerun-qa record stop

# Append to report.md
cat >> $OUTPUT_DIR/report.md << 'EOF'
### ISSUE-001: Players not removing from trade [CRITICAL]

**Severity:** Critical
**Page:** Trade Builder

**Repro Video:** issue-001-repro.webm

Steps:
1. Navigate to Trade Builder (screenshot: issue-001-step-1.png)
2. Click "Remove Player" button (screenshot: issue-001-step-2.png)
3. BUG: Player stays in trade (screenshot: issue-001-result.png)

Console errors:
- TypeError: Cannot read property 'filter' of undefined
EOF
```

### 6. Wrap Up

```bash
# Update report summary
# Close session
agent-browser --session titlerun-qa close

# Review report
cat $OUTPUT_DIR/report.md
```

---

## Issue Taxonomy

### Severity Levels

| Severity | Definition |
|----------|------------|
| **critical** | Blocks core workflow, causes data loss, crashes app |
| **high** | Major feature broken, no workaround |
| **medium** | Feature works but with problems, workaround exists |
| **low** | Minor cosmetic or polish issue |

### Categories

**Functional:**
- Broken buttons/links
- Form validation errors
- Features that fail silently
- Incorrect calculations
- Race conditions

**Visual/UI:**
- Layout broken
- Overlapping text
- Missing icons
- Dark mode issues
- Responsive problems

**UX:**
- Confusing navigation
- Missing feedback
- Slow interactions (>300ms)
- Unclear errors
- Missing confirmations

**Console/Errors:**
- JavaScript exceptions
- Failed network requests
- CORS errors
- Unhandled rejections

---

## Integration with Weekly Audit

Add to `.openclaw/crons/weekly-review.yaml`:

```yaml
- name: titlerun-dogfood
  schedule: "0 9 * * SUN"  # Sunday 9am
  command: |
    cd ~/.openclaw/workspace/titlerun-qa
    OUTPUT_DIR="dogfood-$(date +%Y-%m-%d)"
    
    # Run dogfood (or spawn agent to run it)
    # Report saved to $OUTPUT_DIR/report.md
    
    # Summarize findings
    echo "TitleRun QA Report: $OUTPUT_DIR/report.md"
```

Or spawn a coding agent to run the full session:

```bash
claude "Run TitleRun dogfood QA session following skills/titlerun-dogfood/SKILL.md"
```

---

## Output Structure

```
titlerun-qa/
├── dogfood-2026-03-01/
│   ├── report.md                 # Main QA report
│   ├── auth-state.json          # Saved login state
│   ├── screenshots/
│   │   ├── initial.png
│   │   ├── issue-001-step-1.png
│   │   ├── issue-001-step-2.png
│   │   ├── issue-001-result.png
│   │   └── ...
│   └── videos/
│       ├── issue-001-repro.webm
│       └── ...
├── dogfood-2026-03-08/
│   └── ...
```

---

## Tips

**Speed up repeated runs:**
- Save auth state once, reuse it
- Focus on core workflows (skip settings, help pages)
- Use `-i` flag in snapshots (interactive elements only)
- Limit to 5-10 issues per run (depth > breadth)

**Better evidence:**
- Add `sleep 1` between actions in videos
- Use annotated screenshots for final state
- Capture console errors: `agent-browser console`
- Screenshot each step, not just final result

**Avoid false positives:**
- Test realistic user workflows
- Don't flag loading spinners as bugs
- Verify "bugs" aren't intentional design

---

## Example Report

```markdown
# TitleRun QA Report - 2026-03-01

## Summary
- 8 issues found
- 2 Critical, 3 High, 2 Medium, 1 Low

## ISSUE-001: Trade Builder - Players not removing [CRITICAL]
**Severity:** Critical
**Page:** Trade Builder
**Repro Video:** issue-001-repro.webm

Steps:
1. Add Patrick Mahomes to Team A (screenshot: issue-001-step-1.png)
2. Click "Remove Player" (screenshot: issue-001-step-2.png)
3. BUG: Player stays in trade (screenshot: issue-001-result.png)

Console errors:
- TypeError: Cannot read property 'filter' of undefined
```

---

## Troubleshooting

**"Cannot find session titlerun-qa"**
```bash
agent-browser --session titlerun-qa open https://app.titlerun.co
```

**"Auth state expired"**
```bash
# Re-authenticate
agent-browser --session titlerun-qa open https://app.titlerun.co
# Complete login flow
agent-browser --session titlerun-qa state save dogfood-$(date +%Y-%m-%d)/auth-state.json
```

**"Too many issues found"**
- Focus scope: "Only test Trade Builder and Trade Finder"
- Prioritize critical/high issues only
- Skip cosmetic issues

---

**Last updated:** 2026-03-01

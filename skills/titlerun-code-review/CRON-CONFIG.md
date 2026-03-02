# Cron Configuration — titlerun-code-review

**To enable automated code reviews, add this cron job to OpenClaw.**

---

## Recommended Configuration

```json
{
  "name": "titlerun-code-review",
  "schedule": "0 14 * * *",
  "command": "Review TitleRun commits since last review. Target: 95+ score. Post results to Jeff's inbox.",
  "type": "code-review",
  "enabled": true
}
```

**Schedule:** Daily at 2pm EST (14:00)  
**Rationale:** Gives developers morning to push commits, reviews before end of workday

---

## Alternative Schedules

**Twice daily (morning + afternoon):**
```json
{"schedule": "0 9,15 * * *"}
```

**After each commit (via git hook):**
- More complex setup
- Requires git post-commit hook
- Higher token usage

**On-demand only:**
- No cron
- Manual trigger: `openclaw run "review [file/PR]" --skill titlerun-code-review`

---

## How to Add to OpenClaw

**Option 1: Edit cron.json directly**
```bash
# Add entry to ~/.openclaw/cron.json
# Restart OpenClaw gateway to pick up changes
openclaw gateway restart
```

**Option 2: Use OpenClaw CLI** (if available)
```bash
openclaw cron add titlerun-code-review \
  --schedule "0 14 * * *" \
  --command "Review TitleRun commits..." \
  --type code-review
```

**Option 3: Web interface** (if available)
- Navigate to Settings → Cron Jobs
- Click "Add New"
- Fill in fields from configuration above

---

## Integration with Git

**To trigger review on every push:**

### GitHub Actions (.github/workflows/code-review.yml)
```yaml
name: OpenClaw Code Review
on: [push]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger OpenClaw Review
        run: |
          curl -X POST https://your-openclaw-instance/api/run \
            -H "Authorization: Bearer ${{ secrets.OPENCLAW_TOKEN }}" \
            -d '{"skill": "titlerun-code-review", "target": "${{ github.sha }}"}'
```

### Git Hook (Local .git/hooks/post-commit)
```bash
#!/bin/bash
openclaw run "review last commit" --skill titlerun-code-review
```

---

## Expected Behavior

**On each cron run:**
1. Detect commits since last review (git diff)
2. Run titlerun-code-review skill
3. Generate report in `workspace-titlerun/reviews/YYYY-MM-DD-HHMM.md`
4. Post summary to `inboxes/jeff-inbox.md`
5. If score <80: Alert Taylor (CRITICAL)

**Output example:**
```
## [CODE REVIEW] Commits since 2026-03-01 — Score: 88/100

**Status:** ⚠️ Below target 95

**Critical issues:** 2 (block merge)
**High issues:** 3 (fix before deploy)

**Full report:** workspace-titlerun/reviews/2026-03-02-1400.md
```

---

## First Run Setup

**Before enabling cron:**
1. ✅ Skill installed (`skills/titlerun-code-review/`)
2. ✅ Cognitive profiles exist (`cognitive-profiles/*.md`)
3. ✅ Output directory created (`workspace-titlerun/reviews/`)
4. ✅ Inbox exists (`inboxes/jeff-inbox.md`)

**Test manually first:**
```bash
openclaw run "review titlerun-api/src/routes/players.ts" --skill titlerun-code-review
```

**Verify:**
- Report generated
- Score calculated
- No errors in logs

**Then enable cron.**

---

## 3-AI Pipeline (Optional, High Coverage)

**For critical pre-deploy reviews:**

**When to use:**
- Pre-launch reviews (high stakes)
- Security-critical changes (auth, payments, data handling)
- Performance-critical paths (trade engine, valuation logic)
- Post-incident reviews (what did we miss?)

### Recommended Schedule

**Weekly pre-deploy (Fridays):**
```json
{
  "name": "titlerun-3ai-pre-deploy",
  "schedule": "0 15 * * 5",
  "command": "Run 3-AI code review on all files changed since last deploy. Mode: 3ai. Target: workspace-titlerun/titlerun-api/src/",
  "type": "code-review-3ai",
  "enabled": false
}
```

**Schedule:** Every Friday at 3pm EST (before staging deploy)  
**Rationale:** Comprehensive review before weekend deploy, catches issues before production

**Cost:** ~$2-4 per review (depends on files changed)  
**Time:** 15-20 minutes (parallel execution)  
**Token budget:** ~60K tokens per file reviewed

### On-Demand Only (Recommended)

**Instead of cron, trigger manually for critical reviews:**

```bash
# Security-critical change
openclaw run "review api/routes/auth.ts mode=3ai" --skill titlerun-code-review

# Performance-critical change
openclaw run "review api/routes/tradeEngine.js mode=3ai" --skill titlerun-code-review

# Pre-deploy review (all changed files)
openclaw run "review all files changed since last deploy mode=3ai" --skill titlerun-code-review
```

### Token Budget Planning

**Monthly budget allocation:**

| Review Type | Frequency | Tokens/review | Monthly tokens | Monthly cost |
|-------------|-----------|---------------|----------------|--------------|
| 1-AI (daily) | 30/month | ~18K | 540K | ~$3.24 |
| 3-AI (weekly) | 4/month | ~60K | 240K | ~$1.44 |
| 3-AI (on-demand) | 2/month | ~60K | 120K | ~$0.72 |
| **Total** | - | - | **900K** | **~$5.40/month** |

**Budget by phase:**
- **Phase 0 (PREP):** 1-AI daily only = ~$3/month
- **Phase 1 (MVP):** 1-AI daily + 3-AI weekly = ~$5/month
- **Phase 2 (SCALE):** 1-AI daily + 3-AI pre-deploy = ~$6/month

**Recommendation:** Start with 1-AI daily, add 3-AI on-demand for critical changes, scale to weekly 3-AI in Phase 1+.

### 3-AI Workflow

**When 3-AI cron triggers:**
1. Spawn 3 parallel reviewers (Security, Performance, UX)
2. Each reviewer analyzes target file(s) with cognitive profile
3. Wait for all 3 to complete (~10-15 minutes)
4. Spawn synthesis agent to deduplicate and rank findings
5. Generate unified report with aggregate score
6. Post to Jeff's inbox with recommendation (SHIP/FIX/BLOCK)

**Output files:**
- `reviews/YYYY-MM-DD-HHMM-security.md`
- `reviews/YYYY-MM-DD-HHMM-performance.md`
- `reviews/YYYY-MM-DD-HHMM-ux.md`
- `reviews/YYYY-MM-DD-HHMM-unified.md` (primary deliverable)

**Inbox format:**
```markdown
## [3-AI CODE REVIEW] [File/PR] — Aggregate Score: XX/100

**Breakdown:**
- Security: XX/100 (40% weight)
- Performance: XX/100 (35% weight)
- UX: XX/100 (25% weight)

**Critical issues:** X (block merge)
**High issues:** Y (fix before deploy)

**Coverage:**
- All 3 reviewers agreed: N issues (high confidence)
- 2 reviewers found: M issues (medium confidence)
- Single reviewer only: K issues (specialist insights)

**Action required:**
[SHIP / FIX FIRST / BLOCK]

**Full report:** workspace-titlerun/reviews/YYYY-MM-DD-HHMM-unified.md
```

### Error Handling

**If any reviewer fails:**
- Continue with available reviews (partial coverage better than none)
- Note failure in synthesis report
- Log error to `workspace-titlerun/reviews/YYYY-MM-DD-HHMM-errors.md`

**If synthesis fails:**
- Deliver individual reports
- Alert for manual synthesis
- Fall back to highest-severity reviewer score

**If all reviewers fail:**
- Fall back to 1-AI review mode
- Alert immediately
- Log catastrophic failure

### Monitoring

**Track metrics per 3-AI review:**
- Total time (target: <15 min)
- Total tokens (target: ~60K)
- Findings: Critical/High/Medium/Low counts
- Consensus rate (2+ reviewers agree)
- Deduplication rate (duplicates found / total findings)
- Unique insights vs 1-AI baseline

**Alert conditions:**
- Any reviewer stalls >15 minutes
- Token usage >80K (over budget)
- Score <80 (BLOCK)
- All reviewers fail (catastrophic)

**Log to:** `workspace-titlerun/reviews/metrics.json`

---

**Created:** 2026-03-01  
**Updated:** 2026-03-01 (added 3-AI pipeline)  
**Status:** 1-AI ready for cron, 3-AI validated (use on-demand)

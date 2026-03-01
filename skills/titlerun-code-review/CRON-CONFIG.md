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

**Created:** 2026-03-01  
**Status:** Awaiting manual cron enablement

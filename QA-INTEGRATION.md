# TitleRun QA Integration - Dogfood Skill

**Date:** 2026-03-01  
**Status:** ✅ DEPLOYED

---

## What We Built

Integrated Vercel Labs' **dogfood skill** into OpenClaw for systematic QA testing of TitleRun before each deploy.

---

## How It Works

**The Agent:**
- Opens app.titlerun.co in headless browser
- Systematically explores every page and feature
- Tests like a real user (clicks, forms, navigation)
- Finds bugs (broken features, console errors, visual issues)
- Documents EVERYTHING with video + screenshot evidence

**The Output:**
- Markdown report with all issues found
- Video reproduction for each bug
- Step-by-step screenshots
- Console error logs
- Severity classification (critical/high/medium/low)

---

## When It Runs

### 1. **Weekly (Automated)**
Every Sunday as part of the weekly portfolio review:
- Jeff's heartbeat runs TitleRun dogfood QA
- QA report generated automatically
- Critical/high findings summarized in weekly review to Taylor
- Full report: `titlerun-qa/dogfood-YYYY-MM-DD/report.md`

### 2. **On-Demand (Manual)**
Run anytime before staging/production deploys:

```bash
cd ~/.openclaw/workspace/titlerun-qa
claude "Run TitleRun dogfood QA following skills/titlerun-dogfood/SKILL.md"
```

### 3. **Before Launch**
Critical checkpoints:
- Before Phase 2 backend deploy → Run dogfood
- Before Phase 3 frontend deploy → Run dogfood  
- Before production launch → Run dogfood
- After major feature implementation → Run dogfood

---

## Example Output

```markdown
# TitleRun QA Report - 2026-03-01

## Summary
- 8 issues found
- 2 Critical, 3 High, 2 Medium, 1 Low

## ISSUE-001: Players not removing from Trade Builder [CRITICAL]
Severity: Critical
Page: Trade Builder
Repro Video: issue-001-repro.webm

Steps to reproduce:
1. Navigate to Trade Builder (screenshot: issue-001-step-1.png)
2. Add player to Team A (screenshot: issue-001-step-2.png)
3. Click "Remove Player" button (screenshot: issue-001-step-3.png)
4. BUG: Player stays in trade (screenshot: issue-001-result.png)

Console errors:
- TypeError: Cannot read property 'filter' of undefined

## ISSUE-002: Trade Fairness calculations wrong [HIGH]
...
```

---

## What Gets Tested

**Core Workflows:**
- Trade Builder (add/remove players, submit trades)
- Trade Finder (search, filters, results)
- Report Cards (data display, navigation)
- League sync
- Settings pages

**Test Categories:**
- **Functional:** Broken buttons, failed submissions, incorrect calculations
- **Visual:** Layout issues, overlapping text, missing icons
- **UX:** Confusing navigation, missing feedback, slow interactions
- **Console:** JavaScript errors, failed API calls, CORS issues

---

## File Structure

```
~/.openclaw/workspace/
├── skills/
│   └── titlerun-dogfood/
│       └── SKILL.md              # Full dogfood workflow documentation
├── titlerun-qa/
│   ├── dogfood-2026-03-01/
│   │   ├── report.md             # Main QA report
│   │   ├── auth-state.json       # Saved Sleeper login
│   │   ├── screenshots/
│   │   │   ├── initial.png
│   │   │   ├── issue-001-step-1.png
│   │   │   ├── issue-001-step-2.png
│   │   │   └── issue-001-result.png
│   │   └── videos/
│   │       ├── issue-001-repro.webm
│   │       └── issue-002-repro.webm
│   ├── dogfood-2026-03-08/
│   │   └── ...
│   └── ...
```

---

## Dependencies

**Installed:**
- ✅ `agent-browser` (npm global package)
- ✅ Chromium browser (via `agent-browser install`)

**Authentication:**
- Sleeper OAuth (one-time login, state saved)
- Auth state persists across runs: `auth-state.json`

---

## Security

**Credentials:**
- Sleeper password never exposed to LLM
- Saved in encrypted state file (`auth-state.json`)
- Only used by agent-browser locally

**Data:**
- All screenshots/videos stored locally
- No external uploads
- Reports contain only TitleRun app data (public app)

---

## ROI

**Time saved:**
- Manual QA: 2-3 hours per deploy
- Automated QA: 30-60 min (runs unattended)
- Savings: 1-2 hours per deploy

**Bugs caught:**
- Before users see them (not after)
- With full reproduction steps (not vague reports)
- Systematic coverage (not ad-hoc testing)

**Cost:**
- ~$0.50 in tokens per run (Claude Code agent)
- ~60MB disk per report
- Zero human time

---

## First Run (Today)

**Status:** Running now (session: ember-dune)  
**Target:** https://app.titlerun.co  
**Output:** `titlerun-qa/dogfood-2026-03-01/`  
**ETA:** 30-60 minutes

**Check progress:**
```bash
process action:log sessionId:ember-dune
```

**When complete:**
- Review report.md
- Prioritize critical/high issues
- Fix before next deploy

---

## Integration with Existing Workflow

**Weekly Review (Sunday):**
1. Morning standup (8:30am)
2. **Run dogfood QA** (NEW - 9:00am)
3. Compile portfolio review (include QA findings)
4. Send to Taylor

**Before Deploy:**
1. Code changes committed
2. **Run dogfood QA** (NEW)
3. Review findings
4. Fix critical/high issues
5. Deploy to staging

**Launch Checklist:**
1. All features implemented
2. Backend tests passing
3. **Dogfood QA: 0 critical, <3 high** (NEW)
4. Manual smoke test
5. Launch

---

## Next Steps

**Today:**
- ✅ First dogfood run in progress
- ⏳ Review findings when complete
- ⏳ Fix any critical issues found

**This Week:**
- Run before Phase 2 backend deploy
- Verify no regressions from validation library migration

**Ongoing:**
- Weekly automated QA via portfolio review
- On-demand runs before each staging deploy

---

## Documentation

**Full Workflow:** `skills/titlerun-dogfood/SKILL.md`  
**Weekly Integration:** `HEARTBEAT.md` (Step 9)  
**This Summary:** `QA-INTEGRATION.md`

---

**Status:** ✅ LIVE - Automated QA now part of TitleRun workflow

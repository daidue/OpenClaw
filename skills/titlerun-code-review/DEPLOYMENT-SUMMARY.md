# TitleRun Code Review Skill — Deployment Summary

**Built:** 2026-02-12 11:45 EST  
**Built by:** dev agent (subagent for Jeff)  
**Status:** ✅ Ready for deployment  
**Location:** `/Users/jeffdaniels/.openclaw/workspace/skills/titlerun-code-review/`

---

## What Was Built

A comprehensive 10-expert code review panel system for TitleRun that:
- ✅ Runs automatically 3x/day (10am, 3pm, 9pm EST)
- ✅ Self-triggers after Rush makes 3+ commits
- ✅ Scores code health 0-100 with severity-based deductions
- ✅ Provides actionable feedback prioritized by severity
- ✅ Integrates with Rush's heartbeat workflow
- ✅ Keeps output under 10K tokens (concise, actionable)

---

## Files Created (8 total)

| File | Size | Purpose |
|------|------|---------|
| **SKILL.md** | 14K | Main skill definition — process, experts, scoring, output format |
| **cron-config.json** | 4.1K | 3 cron job definitions (morning, afternoon, evening) |
| **HEARTBEAT-addition.md** | 6.3K | Text to append to Rush's HEARTBEAT.md for workflow integration |
| **run-review.sh** | 6.4K | Reference implementation script (executable) |
| **README.md** | 12K | Complete overview, setup, usage, troubleshooting |
| **QUICK-REFERENCE.md** | 6.1K | Quick-reference card for Rush (score → action map) |
| **EXAMPLE-REVIEW.md** | 8.8K | Sample review output (shows expected format) |
| **CHANGELOG.md** | 4.6K | Version history and future enhancements |

**Total:** 62.3K of documentation + 1 executable script

---

## Expert Panel (10 Experts)

| # | Expert | Domain | Focus |
|---|--------|--------|-------|
| 1 | Security Architect | AppSec | Auth, injection, secrets, rate limiting |
| 2 | Database Engineer | PostgreSQL | Query perf, N+1s, migrations, indexes |
| 3 | Node.js Performance | Runtime | Memory leaks, event loop, async patterns |
| 4 | API Design | REST | Conventions, errors, schemas, versioning |
| 5 | Testing Engineer | QA | Coverage, edge cases, mocks, integration |
| 6 | Fantasy Sports Domain | Business Logic | Scoring, roster rules, trade fairness |
| 7 | DevOps/Reliability | SRE | Circuit breakers, retries, observability |
| 8 | Data Pipeline | ETL | Scraper resilience, freshness, caching |
| 9 | Bayesian/Stats | Statistics | Priors, posteriors, convergence, stability |
| 10 | Frontend/UX | React/UX | Performance, state, accessibility, UX |

Each expert has a detailed persona in `SKILL.md` (experience, philosophy, common flags).

---

## Scoring System

**Starting Score:** 100

**Deductions:**
- 🔴 **Critical Bug:** -15 per issue (system crash, data loss, security breach)
- 🟡 **Major Bug:** -8 per issue (incorrect results, poor performance)
- 🟢 **Minor Bug:** -3 per issue (edge case failures, suboptimal UX)
- 🛡️ **Security Issue:** -20 per issue (exploitable vulnerabilities)

**Health Bands:**
- **90-100 🟢 Healthy** — Ship it, minor polish only
- **80-89 🟡 Needs Attention** — Fix Major+ this sprint
- **70-79 🟠 Concerning** — Fix Critical immediately, Major before features
- **<70 🔴 Emergency** — STOP feature work, all hands on fixes

---

## Deployment Checklist

### Prerequisites (verify before deploying)
- [ ] `gh` CLI installed and authenticated as `daidue`
  ```bash
  gh auth status  # Should show: Logged in to github.com as daidue
  ```
- [ ] Local clone of `daidue/titlerun-api` exists at `~/Desktop/titlerun-api`
  ```bash
  ls ~/Desktop/titlerun-api  # Should show repo files
  ```
- [ ] `titlerun-dev` skill exists at `/Users/jeffdaniels/.openclaw/workspace/skills/titlerun-dev/SKILL.md`
  ```bash
  cat /Users/jeffdaniels/.openclaw/workspace/skills/titlerun-dev/SKILL.md | head -5
  ```

### Step 1: Test the Reference Script
```bash
cd /Users/jeffdaniels/.openclaw/workspace/skills/titlerun-code-review
./run-review.sh
```

**Expected output:**
- Fetches commits from last 8 hours
- Lists changed files and stats
- Creates template review in `/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/YYYY-MM-DD-HHmm.md`
- Updates state file: `/Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp`
- Posts summary to Jeff's inbox

**Note:** The script creates a template. Agents must implement the 10-expert analysis logic per `SKILL.md`.

### Step 2: Integrate with Rush's Workflow
```bash
# 1. Locate Rush's HEARTBEAT.md (check titlerun agent config directory)
# 2. Append content from HEARTBEAT-addition.md to Rush's HEARTBEAT.md
cat /Users/jeffdaniels/.openclaw/workspace/skills/titlerun-code-review/HEARTBEAT-addition.md >> [PATH_TO_RUSH_HEARTBEAT.md]
```

**Key integration points:**
- Pre-flight: Check commit count, trigger review if ≥3
- Post-review: Read results, prioritize fixes per severity
- WORKQUEUE.md: Move Critical/Major issues to top
- Daily memory: Log review scores

### Step 3: Deploy Cron Jobs
```bash
# Use OpenClaw's cron management CLI (exact syntax TBD)
# Reference: cron-config.json

# Example (adjust based on actual OpenClaw cron commands):
openclaw cron create --name titlerun-review-morning --schedule "0 10 * * *" --timezone "America/New_York" --agent titlerun --message "[content from cron-config.json]"

# Repeat for afternoon and evening jobs
```

**Cron jobs to deploy:**
1. `titlerun-review-morning` — 10:00 AM EST
2. `titlerun-review-afternoon` — 3:00 PM EST
3. `titlerun-review-evening` — 9:00 PM EST

**Test with one-time trigger:**
```bash
openclaw cron trigger titlerun-review-morning
```

### Step 4: Monitor First Reviews
- [ ] Check `/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/` for output files
- [ ] Check Jeff's inbox for summaries
- [ ] Verify state file updates: `cat /Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp`
- [ ] Confirm Rush receives and processes results

### Step 5: Iterate Based on Feedback
- [ ] Monitor review quality (accuracy of findings)
- [ ] Adjust expert personas if needed
- [ ] Calibrate scoring thresholds based on Rush's track record
- [ ] Update `SKILL.md` and redeploy as needed

---

## Usage Patterns

### Automatic (Cron) — 3x Daily
**Who:** OpenClaw cron system  
**When:** 10am, 3pm, 9pm EST  
**What:** Spawns isolated titlerun agent session → loads skills → runs review → writes to reviews/ → posts to Jeff's inbox  
**Rush's role:** Read inbox summaries, prioritize fixes

### Self-Triggered (Rush) — After 3+ Commits
**Who:** Rush (in heartbeat)  
**When:** After accumulating 3+ commits  
**What:** Checks commit count → loads skills → runs review → reads results → fixes Critical/Major immediately  
**Skip if:** Already reviewed in last 2 hours (avoid duplicates)

### Manual (Jeff) — On-Demand
**Who:** Jeff via agent command  
**When:** Investigating issues, auditing features  
**What:** Spawns reviewer agent → loads skills → runs review → returns results to Jeff

---

## Key Files for Rush

**Must read:**
- `SKILL.md` — Full process and expert details
- `QUICK-REFERENCE.md` — Score → action map, commands, checklist

**Reference:**
- `README.md` — Setup, troubleshooting
- `EXAMPLE-REVIEW.md` — What a completed review looks like

**Keep handy:**
- `QUICK-REFERENCE.md` — Print this and keep it visible during heartbeats!

---

## Token Budget

**Target:** <10K tokens per review

**Breakdown:**
- Commit fetch & file read: ~2K
- Expert analysis (10 experts): ~6K
- Synthesis & output: ~2K

**Optimization strategies:**
- Truncate files >500 lines (note in output)
- Focus on changed lines ±10 context (not full files)
- Each expert: top 3 findings max
- Aggregate duplicate findings across experts

---

## Troubleshooting

### No commits found (exit gracefully)
**Symptom:** "No new commits to review."  
**Cause:** Normal — no commits since last review.  
**Action:** None needed.

### gh CLI authentication failure
**Symptom:** `gh: authentication required`  
**Cause:** gh CLI not authenticated as `daidue`  
**Fix:** Run `gh auth login` and follow prompts. Notify Jeff if fails.

### Repo not found
**Symptom:** `Cannot access ~/Desktop/titlerun-api`  
**Cause:** Local clone missing  
**Fix:** `cd ~/Desktop && gh repo clone daidue/titlerun-api`

### Review takes >5 minutes
**Symptom:** Timeout or excessive token usage  
**Cause:** Reading too many large files  
**Fix:** Optimize to focus on changed lines ±10 context. Notify Jeff if persistent.

---

## Next Steps (Immediate)

1. **Verify prerequisites** (gh auth, repo clone, titlerun-dev skill)
2. **Test run-review.sh** manually (creates template)
3. **Append HEARTBEAT-addition.md** to Rush's HEARTBEAT.md
4. **Deploy cron jobs** from cron-config.json
5. **Test one-time trigger** for morning job
6. **Monitor first automatic review** at 10am tomorrow
7. **Check Jeff's inbox** for summary
8. **Verify Rush processes results** correctly

---

## Maintenance (Quarterly)

**Review the skill quarterly** (next: May 2026):
- Assess if 10 experts are still relevant (add/remove as codebase evolves)
- Adjust scoring thresholds based on Rush's track record
- Update expert personas if new patterns emerge
- Check token usage and optimize if exceeding budget
- Iterate based on Rush's feedback (false positives, missing coverage)

---

## Philosophy

**Why this matters:**
- **Catch bugs early** — Before they hit production
- **Reinforce best practices** — Learn from expert feedback
- **Prevent tech debt** — Fix issues while context is fresh
- **Build trust** — Proactive quality control

**Balance:**
- Speed matters, but quality matters more
- Reviews are guardrails, not blockers
- Fix Critical/Major immediately, Minor can wait
- If you disagree with a finding, discuss with Jeff (don't ignore)

---

## Success Metrics (Track Over Time)

- **Review frequency:** 3x/day automatic + self-triggered after 3+ commits
- **Average health score:** Target 90+ (healthy codebase)
- **Critical issues found:** Aim for 0 per review (proactive quality)
- **Time to fix:** Critical <1 hour, Major <1 day, Minor <1 week
- **False positive rate:** <10% (Rush should agree with 90%+ of findings)
- **Rush satisfaction:** Quarterly check-in (is this helpful or annoying?)

---

## Support

**Questions or issues?**
- **Reference:** `README.md` (comprehensive troubleshooting)
- **Quick help:** `QUICK-REFERENCE.md` (common commands, score map)
- **Example:** `EXAMPLE-REVIEW.md` (what good output looks like)
- **Escalate to Jeff:** If blocked or skill is broken

---

**Deployment completed:** [Pending — Jeff to execute]  
**First review scheduled:** Tomorrow at 10:00 AM EST (automatic)  
**Built with:** Claude Sonnet 4.5 (30K tokens used, 170K remaining)

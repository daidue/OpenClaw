# TitleRun Code Review Expert Panel

**Version:** 1.0  
**Created:** 2026-02-12  
**Owner:** Jeff Daniels  
**Primary User:** Rush (titlerun agent)

## Overview

Automated 10-expert code review panel that analyzes Rush's commits to the TitleRun API (`daidue/titlerun-api`) and provides actionable feedback with a health score (0-100).

**Key Features:**
- 🤖 **10 domain experts** — Security, database, Node.js performance, API design, testing, fantasy sports logic, DevOps, data pipelines, Bayesian methods, frontend/UX
- 📊 **Health scoring** — 0-100 with severity-based deductions (Critical -15, Major -8, Minor -3, Security -20)
- ⏰ **3x daily automatic reviews** — 10am, 3pm, 9pm EST via cron
- 🔄 **Self-triggered reviews** — After every 3+ commits by Rush
- 📝 **Concise output** — <10K tokens, actionable, prioritized by severity

## Files in This Skill

| File | Purpose |
|------|---------|
| `SKILL.md` | Main skill definition — process, expert personas, output format, implementation notes |
| `cron-config.json` | Cron job definitions for 3x daily automatic reviews |
| `HEARTBEAT-addition.md` | Text to append to Rush's `HEARTBEAT.md` for workflow integration |
| `run-review.sh` | Reference implementation script (demonstrates commit fetch, file read, state management) |
| `README.md` | This file — overview, setup, usage |

## Setup Instructions

### 1. Ensure Prerequisites

**Required:**
- `gh` CLI installed and authenticated as `daidue`
  ```bash
  gh auth status  # Should show: Logged in to github.com as daidue
  ```
- Local clone of `daidue/titlerun-api` at `~/Desktop/titlerun-api`
  ```bash
  ls ~/Desktop/titlerun-api  # Should show repo files
  ```
- `titlerun-dev` skill loaded (provides codebase context)

**Optional (for testing):**
- `titlerun` agent configured in OpenClaw
- Cron system enabled in OpenClaw gateway

### 2. Test the Skill (Manual)

Run the reference script to test commit fetching and file reading:

```bash
cd /Users/jeffdaniels/.openclaw/workspace/skills/titlerun-code-review
./run-review.sh
```

**Expected output:**
- Fetches commits from the last 8 hours (or since last review)
- Lists changed files and line counts
- Creates a review template in `/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/YYYY-MM-DD-HHmm.md`
- Updates state file: `/Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp`
- Posts summary to Jeff's inbox

**Note:** The script creates a template. Agents must implement the 10-expert analysis logic per `SKILL.md`.

### 3. Deploy Cron Jobs

Use the definitions in `cron-config.json` to configure 3x daily reviews.

**Cron schedule:**
- `titlerun-review-morning` — 10:00 AM EST (`0 10 * * *`)
- `titlerun-review-afternoon` — 3:00 PM EST (`0 15 * * *`)
- `titlerun-review-evening` — 9:00 PM EST (`0 21 * * *`)

**Deployment steps:**
1. Copy the job definitions from `cron-config.json`
2. Use OpenClaw's cron management CLI (exact command TBD — check `openclaw cron --help`)
3. Test with a one-time trigger: `openclaw cron trigger titlerun-review-morning`
4. Monitor output in `/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/`

### 4. Integrate with Rush's Workflow

Append the content from `HEARTBEAT-addition.md` to Rush's `HEARTBEAT.md`:

**Location:** Likely `/Users/jeffdaniels/.openclaw/workspace-titlerun/HEARTBEAT.md` or in the titlerun agent's config directory.

**Key integration points:**
- **After 3+ commits:** Self-trigger a review before continuing
- **After review results:** Fix Critical/Major issues before new features
- **Daily memory:** Log review scores
- **WORKQUEUE.md:** Prioritize Critical/Major issues at top

## Usage Patterns

### Automatic (Cron)
**Who triggers:** OpenClaw cron system  
**When:** 10am, 3pm, 9pm EST daily  
**What happens:**
1. Cron spawns isolated titlerun agent session
2. Agent loads `titlerun-dev` + `titlerun-code-review` skills
3. Agent runs review process (fetch commits, analyze, score)
4. Results written to reviews/ directory
5. Summary posted to Jeff's inbox

**Rush's role:** Read inbox summaries, prioritize fixes per severity.

### Self-Triggered (Rush)
**Who triggers:** Rush (titlerun agent)  
**When:** After accumulating 3+ commits  
**What happens:**
1. Rush checks commit count in heartbeat pre-flight
2. If ≥3 commits since last review → load skills and run review
3. Rush reads results, fixes Critical/Major issues immediately
4. Logs score to daily memory, updates WORKQUEUE.md

**Exception:** Skip if already reviewed in last 2 hours (avoid duplicates with cron).

### Manual (Jeff)
**Who triggers:** Jeff via agent command  
**When:** On-demand (investigating issues, auditing features)  
**What happens:**
1. Jeff spawns a reviewer agent: `@dev Review Rush's work from the last [timeframe]`
2. Agent loads skills and runs review
3. Results returned to Jeff + written to reviews/ directory

## Expert Panel Composition

| # | Expert | Domain | Key Focus |
|---|--------|--------|-----------|
| 1 | Security Architect | AppSec | Auth, injection, secrets, rate limiting |
| 2 | Database Engineer | PostgreSQL | Query perf, N+1s, migrations, indexes |
| 3 | Node.js Performance Engineer | Runtime | Memory leaks, event loop, async patterns |
| 4 | API Design Specialist | REST | Conventions, errors, schemas, versioning |
| 5 | Testing Engineer | QA | Coverage, edge cases, mocks, integration |
| 6 | Fantasy Sports Domain Expert | Business Logic | Scoring, roster rules, trade fairness |
| 7 | DevOps/Reliability Engineer | SRE | Circuit breakers, retries, observability |
| 8 | Data Pipeline Architect | ETL | Scraper resilience, freshness, caching |
| 9 | Bayesian/Statistical Methods Expert | Statistics | Priors, posteriors, convergence, stability |
| 10 | Frontend/UX Engineer | React/UX | Performance, state, accessibility, UX |

See `SKILL.md` for detailed personas and common flags.

## Scoring System

**Starting score:** 100

**Deductions:**
- Critical Bug: -15 per issue (system crash, data loss, security breach, unhandled exceptions)
- Major Bug: -8 per issue (incorrect results, poor performance, missing validation)
- Minor Bug: -3 per issue (edge case failures, suboptimal UX)
- Security Issue: -20 per issue (any exploitable vulnerability, secret exposure, auth bypass)

**No deductions for Improvements** — they're recommendations, not penalties.

**Health bands:**
- **90-100 🟢 Healthy** — Ship it, minor polish only
- **80-89 🟡 Needs Attention** — Fix Major+ issues this sprint
- **70-79 🟠 Concerning** — Fix Critical immediately, Major before new features
- **<70 🔴 Emergency** — STOP feature work, all hands on fixes

## Output Format

Reviews are written to: `/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/YYYY-MM-DD-HHmm.md`

**Structure:**
1. **Summary** — Score, commit count, file count, health emoji
2. **🔴 Critical Issues** — Fix immediately (with file/line references)
3. **🟡 Major Issues** — Fix this sprint
4. **🟢 Minor Issues** — Fix when convenient
5. **💡 Improvements** — High/medium/low impact recommendations
6. **✅ What's Working Well** — Positive reinforcement
7. **Expert Breakdown** — Each expert's top finding
8. **Scoring Breakdown** — Deduction table
9. **Next Actions** — Prioritized checklist for Rush

See `SKILL.md` for the full template.

## State Management

**State file:** `/Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp`

**Format:** ISO 8601 timestamp (`2026-02-12T14:30:00Z`)

**Purpose:** Track when the last review ran to avoid duplicate reviews and fetch only new commits.

**Update logic:**
- After every successful review, write current UTC timestamp
- On read, default to "8 hours ago" if file doesn't exist
- Used by both automatic (cron) and self-triggered (Rush) reviews

## Troubleshooting

### No commits found (exit gracefully)
**Symptom:** Review exits with "No new commits to review."  
**Cause:** No commits since last review timestamp.  
**Action:** This is normal. No action needed.

### gh CLI authentication failure
**Symptom:** `gh: command not found` or `gh: authentication required`  
**Cause:** gh CLI not installed or not authenticated as `daidue`  
**Action:**
1. Check: `gh auth status`
2. If not authenticated: `gh auth login` and follow prompts
3. Notify Jeff if authentication fails

### Repo not found
**Symptom:** `Cannot access ~/Desktop/titlerun-api`  
**Cause:** Local clone missing or wrong path  
**Action:**
1. Check: `ls ~/Desktop/titlerun-api`
2. If missing: `cd ~/Desktop && gh repo clone daidue/titlerun-api`
3. Notify Jeff if clone fails

### Review takes >5 minutes
**Symptom:** Timeout or excessive token usage  
**Cause:** Reading too many large files (>500 lines each)  
**Action:**
1. Check changed file count and sizes
2. Optimize: Focus on changed lines ±10 context (not full files)
3. Truncate files >500 lines, note in output
4. Notify Jeff if persistent

### Duplicate reviews (cron + self-triggered)
**Symptom:** Two reviews within 2 hours of each other  
**Cause:** Rush self-triggered review shortly before/after cron review  
**Action:**
1. Check timestamp in state file
2. Skip self-triggered review if last review <2 hours ago
3. Log skip to memory for audit trail

## Token Budget

**Target:** <10K tokens per review

**Breakdown:**
- Commit fetch & file read: ~2K
- Expert analysis (10 experts): ~6K
- Synthesis & output: ~2K

**Optimization strategies:**
- Truncate files >500 lines
- Focus on changed lines ±10 context
- Each expert provides top 3 findings max
- Aggregate duplicate findings across experts

## Integration Points

### With Rush (titlerun agent)
- **Pre-flight check:** Count commits, trigger review if ≥3
- **Post-review:** Read results, prioritize fixes, log score
- **WORKQUEUE.md:** Move Critical/Major issues to top
- **Daily memory:** Log review scores for trend tracking

### With Jeff (manual reviews)
- **Inbox summaries:** Automatic reviews post to Jeff's inbox
- **On-demand:** Jeff can spawn manual reviews for audits
- **Emergency:** If score <70, Jeff gets urgent notification

### With Cron System
- **3x daily triggers:** 10am, 3pm, 9pm EST
- **Isolated sessions:** Each review runs in fresh agent session
- **State persistence:** Timestamp file tracks last review
- **Monitoring:** Check reviews/ directory for output files

## Deployment Checklist

- [ ] Verify `gh` CLI authenticated as `daidue`
- [ ] Verify `~/Desktop/titlerun-api` clone exists and is up-to-date
- [ ] Test `run-review.sh` manually (creates template)
- [ ] Append `HEARTBEAT-addition.md` to Rush's `HEARTBEAT.md`
- [ ] Deploy cron jobs from `cron-config.json`
- [ ] Test cron trigger: `openclaw cron trigger titlerun-review-morning`
- [ ] Monitor first automatic review at 10am
- [ ] Check Jeff's inbox for summary
- [ ] Verify state file updates: `cat /Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp`

## Maintenance

### Review the skill quarterly
- Assess if 10 experts are still relevant (add/remove as codebase evolves)
- Adjust scoring thresholds based on Rush's track record
- Update expert personas if new patterns emerge
- Check token usage and optimize if exceeding budget

### Monitor review quality
- Are Critical/Major issues accurate? (False positives hurt trust)
- Are Improvements actionable? (Vague suggestions waste time)
- Is Rush fixing issues promptly? (If not, adjust severity or process)

### Iterate based on feedback
- Rush can flag incorrect findings in daily memory
- Jeff can request expert adjustments or new focus areas
- Update `SKILL.md` and redeploy as needed

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

**Built by:** dev agent (subagent for Jeff)  
**Date:** 2026-02-12  
**Status:** Ready for deployment  
**Next Steps:** Deploy cron jobs, integrate with Rush's heartbeat, test first automatic review

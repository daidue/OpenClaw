---
name: titlerun-code-review
description: 10-expert code review panel for TitleRun API commits — security, performance, architecture, testing, domain logic. Runs automatically 3x/day (10am, 3pm, 9pm EST) or on-demand after 3+ commits. Use when you hear "review Rush's commits", "code review TitleRun", "audit recent changes", or "pre-deploy check". Do NOT use for trivial changes (typos, comments), work-in-progress branches, non-TitleRun repos, or when no commits exist. Requires gh CLI authenticated as daidue, access to ~/Desktop/titlerun-api repo. Key capabilities: 10-expert simulation (security, database, Node.js perf, API design, testing, fantasy domain, DevOps, data pipeline, Bayesian stats, frontend), health scoring (0-100), prioritized fix lists, automatic 3x daily runs.
compatibility: Requires gh CLI authenticated as daidue, access to ~/Desktop/titlerun-api repo
metadata:
  author: Jeff Daniels
  version: 1.0.0
  category: development
  last_verified: 2026-02-13
---

# TitleRun Code Review Expert Panel

Structured code review process using 10 simulated domain experts who analyze Rush's recent commits to the TitleRun API, score code health 0-100, and provide actionable feedback prioritized by severity.

## When to Use

- **Automatic (cron):** 3x daily (10am, 3pm, 9pm EST) to catch issues early
- **On-demand (Rush):** After every 3+ commits before continuing feature work
- **On-demand (Jeff):** When investigating production issues or auditing a feature
- **Pre-deploy:** Before pushing major changes to production

## When NOT to Use

- Trivial changes (typos, comments, config adjustments) — use judgment
- Work-in-progress commits on feature branches (wait until ready for review)
- Non-TitleRun repos or infrastructure scripts
- When no commits exist since last review (skip gracefully)

## Related Skills
- `titlerun-dev` — **LOAD FIRST** — provides codebase patterns, architecture, conventions
- `expert-panel` — General methodology pattern (this skill adapts it for code review)

## Process

### 1. Fetch Recent Commits
`gh log --since "8 hours ago"` (or since `.last-review-timestamp`). Exit gracefully if none found.

### 2. Identify Changed Files
`gh api repos/daidue/titlerun-api/commits/{hash}` to get file list with additions/deletions.

### 3. Read Changed Files
`cat ~/Desktop/titlerun-api/{filepath}` for each. Skip files >500 lines (note truncation).

### 4. Expert Review
10 experts (see `references/expert-personas.md`) review through domain lenses: security, database, Node.js perf, API design, testing, fantasy sports, DevOps, data pipelines, Bayesian stats, frontend/UX.

**Finding Severities:**
- Critical Bug (system down, data loss, security breach, unhandled exceptions)
- Major Bug (incorrect results, poor performance, data inconsistency)
- Minor Bug (edge case failure, poor UX, non-critical gap)
- Security Issue (exploitable vulnerability, secret exposure, auth bypass)
- Improvement (better patterns, refactoring, tech debt)

### 5. Scoring
Start: 100 | Deductions: Critical -15, Major -8, Minor -3, Security -20

**Health Bands:**
- 95-100: Healthy (ship it)
- 90-94: Needs Attention (fix Major+)
- 80-89: Concerning (fix Critical immediately)
- <80: Emergency (stop feature work)

### 6. Output
Write to `/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/YYYY-MM-DD-HHmm.md` (<10K tokens)
Template: `references/output-template.md`

## Implementation
State tracking: `.last-review-timestamp` file (ISO 8601 format)
Token budget: <10K total (2K fetch, 6K analysis, 2K output)
Error handling: Graceful failures, notify Jeff on auth/git errors
Delivery: Jeff's inbox (cron) or response (on-demand)

**Full details:** See `references/implementation-guide.md`

## Trigger Phrases
✅ Should trigger: "review Rush's commits", "run code review", "check code quality", "code review panel", "audit recent changes", "score the codebase"
❌ Should NOT trigger: "write code", "fix this bug", "deploy to production", "build a feature", "run tests"

## Reference Files
- `references/expert-personas.md` — All 10 expert personas with backgrounds and common findings
- `references/output-template.md` — Full markdown template for review reports
- `references/example-invocations.md` — How Rush, Jeff, and cron trigger reviews
- `references/implementation-guide.md` — State management, token budgets, error handling, delivery workflows

---

## Changelog
- **2026-02-12:** Initial version, 10-expert panel, 3x daily cron, Rush workflow integration

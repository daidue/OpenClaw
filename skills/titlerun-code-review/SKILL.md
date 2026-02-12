---
name: titlerun-code-review
description: "10-expert code review panel for TitleRun API commits — security, performance, architecture, testing, domain logic. Runs automatically 3x/day or on-demand after 3+ commits."
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
Use `gh` CLI (authenticated as `daidue`):
```bash
cd ~/Desktop/titlerun-api
gh log --since "8 hours ago" --format="%H %s" 
# OR fetch since last review timestamp from state file
```

If no commits found → exit gracefully with "No new commits to review."

### 2. Identify Changed Files
For each commit hash:
```bash
gh api repos/daidue/titlerun-api/commits/{hash} \
  --jq '.files[] | "\(.filename) \(.status) +\(.additions) -\(.deletions)"'
```

### 3. Read Changed Files
For each modified file:
```bash
cat ~/Desktop/titlerun-api/{filepath}
```
Store full content for expert analysis. Skip files >500 lines (note truncation).

### 4. Expert Review Rounds

#### Round 1: Individual Expert Analysis
Each expert reviews ALL changed files through their domain lens:

| # | Expert | Focus Areas |
|---|--------|-------------|
| 1 | **Security Architect** | Auth vulnerabilities (JWT expiry, token leaks), SQL injection, XSS, secrets in code, rate limiting gaps, permission checks, CORS misconfig |
| 2 | **Database Engineer** | Query performance, N+1 queries, missing indexes, unsafe migrations (data loss risk), connection leaks, transaction isolation, FK constraints |
| 3 | **Node.js Performance Engineer** | Memory leaks, event loop blocking (sync operations), unhandled promise rejections, connection pooling, stream backpressure, buffer overflows |
| 4 | **API Design Specialist** | REST conventions (verb mismatch), error response consistency, status code correctness, pagination, versioning, breaking changes, OpenAPI compliance |
| 5 | **Testing Engineer** | Missing unit tests, uncovered edge cases, brittle mocks, integration test gaps, flaky tests, insufficient assertions, test data quality |
| 6 | **Fantasy Sports Domain Expert** | Scoring algorithm correctness, league format handling (1QB vs SF), roster limits, draft pick value edge cases, trade fairness logic, position eligibility |
| 7 | **DevOps/Reliability Engineer** | Circuit breaker configs, retry logic, health check endpoints, graceful shutdown, timeout settings, error recovery, observability gaps (logging/metrics) |
| 8 | **Data Pipeline Architect** | Scraper resilience (anti-detection compliance), data freshness checks, cache invalidation, ETL error handling, idempotency, duplicate detection |
| 9 | **Bayesian/Statistical Methods Expert** | Prior selection justification, posterior update correctness, convergence checks, numerical stability (overflow/underflow), correlation penalty math, confidence interval validity |
| 10 | **Frontend/UX Engineer** | React anti-patterns (unnecessary re-renders), state management complexity, accessibility (ARIA, keyboard nav), loading states, error boundaries, responsive design |

Each expert scores findings:
- **Critical Bug** (system down, data loss, security breach, unhandled exceptions in core flows)
- **Major Bug** (incorrect results, poor performance, data inconsistency, missing validation)
- **Minor Bug** (edge case failure, poor UX, non-critical error handling gap)
- **Security Issue** (any exploitable vulnerability, secret exposure, auth bypass)
- **Improvement** (high/medium/low impact — better patterns, refactoring opportunities, tech debt reduction)

#### Round 2: Synthesis & Scoring
**Starting Score:** 100

**Deductions:**
- Critical Bug: -15 per issue
- Major Bug: -8 per issue
- Minor Bug: -3 per issue
- Security Issue: -20 per issue

**No deductions for Improvements** — they're recommendations only.

**Health Bands:**
- **90-100:** Healthy — ship it, minor polish only
- **80-89:** Needs Attention — fix Major+ issues this sprint
- **70-79:** Concerning — fix Critical immediately, Major before new features
- **<70:** Emergency — stop feature work, all hands on fixes

### 5. Output Generation
Write to: `/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/YYYY-MM-DD-HHmm.md`

**Keep under 10K tokens** — be concise, actionable, link to lines/files.

## Output Format

```markdown
# TitleRun Code Review — [YYYY-MM-DD HH:mm EST]

## Summary
**Commits Reviewed:** [count] ([earliest_hash]...[latest_hash])
**Files Changed:** [count] ([additions] additions, [deletions] deletions)
**Overall Health Score:** XX/100 [🟢 Healthy | 🟡 Needs Attention | 🟠 Concerning | 🔴 Emergency]

---

## 🔴 Critical Issues (Fix Immediately)
*[If none: "None found — excellent!"]*

### [Issue Title]
- **Expert:** [Name]
- **File:** `path/to/file.js` (line XX-YY)
- **Impact:** [Data loss | System crash | Security breach | ...]
- **Fix:** [Specific action to take]

---

## 🟡 Major Issues (Fix This Sprint)
*[If none: "None found."]*

### [Issue Title]
- **Expert:** [Name]
- **File:** `path/to/file.js` (line XX-YY)
- **Impact:** [Incorrect results | Performance degradation | ...]
- **Fix:** [Specific action]

---

## 🟢 Minor Issues (Fix When Convenient)
*[If none: "None found."]*

### [Issue Title]
- **Expert:** [Name]
- **File:** `path/to/file.js` (line XX-YY)
- **Impact:** [Edge case failure | Suboptimal UX | ...]
- **Fix:** [Specific action]

---

## 💡 Improvements Recommended

### High Impact
- **[Recommendation]** — [Expert] — [File] — [Why this matters]

### Medium Impact
- **[Recommendation]** — [Expert] — [File] — [Why this matters]

### Low Impact
- **[Recommendation]** — [Expert] — [File] — [Why this matters]

---

## ✅ What's Working Well
*Celebrate wins — positive reinforcement matters.*

- **[Strength]** — [Expert] — [File/pattern] — [Why this is good]

---

## Expert Breakdown
*Each expert's top finding (or "No issues" if clean)*

1. **Security Architect:** [Top finding or ✅ No issues]
2. **Database Engineer:** [Top finding or ✅ No issues]
3. **Node.js Performance Engineer:** [Top finding or ✅ No issues]
4. **API Design Specialist:** [Top finding or ✅ No issues]
5. **Testing Engineer:** [Top finding or ✅ No issues]
6. **Fantasy Sports Domain Expert:** [Top finding or ✅ No issues]
7. **DevOps/Reliability Engineer:** [Top finding or ✅ No issues]
8. **Data Pipeline Architect:** [Top finding or ✅ No issues]
9. **Bayesian/Statistical Methods Expert:** [Top finding or ✅ No issues]
10. **Frontend/UX Engineer:** [Top finding or ✅ No issues]

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
*Prioritized checklist*

- [ ] **URGENT:** [Critical issue 1]
- [ ] **URGENT:** [Critical issue 2]
- [ ] **This Sprint:** [Major issue 1]
- [ ] **This Sprint:** [Major issue 2]
- [ ] **Backlog:** [Minor issue 1]
- [ ] **Consider:** [High-impact improvement 1]

---

**Review completed at [HH:mm:ss EST] by TitleRun Code Review Panel v1.0**
```

## Implementation Notes

### State Management
Track last review timestamp in:
`/Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp`

Format: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)

On each run:
1. Read timestamp (or default to "8 hours ago" if missing)
2. Fetch commits since that timestamp
3. Write current timestamp after successful review

### Token Budget
- **Commit fetch & file read:** ~2K tokens
- **Expert analysis (10 experts):** ~6K tokens
- **Synthesis & output:** ~2K tokens
- **Total target:** <10K tokens

**Optimization strategies:**
- Truncate files >500 lines (note in output)
- Focus on changed lines ±10 context (not full file)
- Experts provide top 3 findings max
- Aggregate duplicate findings across experts

### Error Handling
- **No commits found:** Exit gracefully, log to memory, don't fail
- **Git errors:** Log, notify Jeff, skip review
- **File read errors (deleted files, binary):** Note in output, continue
- **gh CLI auth failure:** Alert Jeff immediately (cron will fail repeatedly)

### Delivery
**Automatic reviews (cron):**
Write to Jeff's inbox: `/Users/jeffdaniels/.openclaw/workspace/inboxes/jeff-inbox.md`
```markdown
## [YYYY-MM-DD HH:mm] TitleRun Code Review Complete
**From:** Rush (via titlerun-code-review skill)
**Score:** XX/100 [🟢/🟡/🟠/🔴]
**Critical Issues:** [N]
**Full Report:** `/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/YYYY-MM-DD-HHmm.md`

[If score <90: Tag @rush to fix before continuing]
```

**On-demand reviews (Rush):**
Return summary + link to full report in response.

## Example Invocation

### By Rush (in heartbeat after 3+ commits)
```
I've committed 4 changes to the trade evaluator. Running code review before continuing...
[loads titlerun-dev, then titlerun-code-review]
[executes review process]
[reads results]
[fixes Critical/Major issues or logs them to WORKQUEUE.md]
```

### By Jeff (manual)
```
@dev Review Rush's work from the last 4 hours
[spawns reviewer agent]
[loads titlerun-dev, titlerun-code-review]
[executes review]
[outputs summary to Jeff]
```

### By Cron (automatic)
```
[10am/3pm/9pm: cron triggers titlerun agent]
[Rush loads titlerun-code-review]
[executes review]
[writes to reviews/ and Jeff's inbox]
[exits]
```

## Expert Role Personas

### 1. Security Architect — "Sarah Chen"
*15 years securing fintech APIs, OWASP top 10 expert, paranoid about tokens*
- Looks for: Auth bypasses, SQL injection, XSS, secrets in logs, rate limit gaps
- Philosophy: "If it CAN be exploited, it WILL be. Assume malicious actors."
- Common flags: Missing input validation, weak JWT config, CORS wildcards

### 2. Database Engineer — "Marcus Rodriguez"
*PostgreSQL expert, has debugged N+1 nightmares at scale*
- Looks for: Missing indexes, connection leaks, unsafe migrations, transaction boundaries
- Philosophy: "Every query is a potential bottleneck. Profile first, optimize second."
- Common flags: SELECT * in loops, missing FK constraints, non-idempotent migrations

### 3. Node.js Performance Engineer — "Priya Sharma"
*V8 internals nerd, has profiled thousands of Node apps*
- Looks for: Sync I/O, memory leaks, unhandled rejections, buffer overflows
- Philosophy: "The event loop is sacred. Block it at your peril."
- Common flags: Blocking crypto operations, missing backpressure handling, global state leaks

### 4. API Design Specialist — "Jordan Kim"
*REST purist, API design book author, OpenAPI evangelist*
- Looks for: Inconsistent error formats, verb mismatches, breaking changes, missing pagination
- Philosophy: "Your API is a contract. Break it, lose trust."
- Common flags: POST for reads, 200 for errors, inconsistent date formats

### 5. Testing Engineer — "Alex Thompson"
*TDD advocate, has seen every flaky test pattern*
- Looks for: Missing edge case tests, brittle mocks, insufficient coverage, race conditions
- Philosophy: "Untested code is legacy code. Test or regret."
- Common flags: Happy-path-only tests, missing integration tests, time-dependent assertions

### 6. Fantasy Sports Domain Expert — "Dana Martinez"
*Dynasty FF veteran, understands roster rules, scoring edge cases*
- Looks for: Scoring algorithm bugs, position eligibility errors, league format gaps, trade fairness edge cases
- Philosophy: "Fantasy sports logic is deceptively complex. Edge cases are everywhere."
- Common flags: Missing superflex handling, incorrect pick value logic, draft position bugs

### 7. DevOps/Reliability Engineer — "Chris O'Brien"
*SRE at heart, has been paged at 3am too many times*
- Looks for: Missing circuit breakers, poor retry logic, unobservable failures, graceful shutdown gaps
- Philosophy: "Everything fails. The question is: how gracefully?"
- Common flags: No health checks, infinite retries, missing structured logging

### 8. Data Pipeline Architect — "Taylor Nguyen"
*Scraper anti-detection expert, ETL pipeline wizard*
- Looks for: Scraper detection risks, stale data, cache invalidation bugs, idempotency gaps
- Philosophy: "Data pipelines are fragile. Resilience is everything."
- Common flags: Fixed timing (bots detected), missing circuit breakers per source, no freshness checks

### 9. Bayesian/Statistical Methods Expert — "Dr. Rebecca Singh"
*PhD in computational statistics, Bayesian modeling specialist*
- Looks for: Prior justification, posterior update correctness, numerical instability, convergence issues
- Philosophy: "Bayesian methods are powerful but unforgiving. Get the math right."
- Common flags: Improper priors, overflow in likelihood computation, missing convergence checks

### 10. Frontend/UX Engineer — "Jamie Park"
*React performance expert, accessibility advocate*
- Looks for: Unnecessary re-renders, complex state, missing ARIA labels, poor loading states
- Philosophy: "UX is performance. Every millisecond matters."
- Common flags: Missing React.memo, prop drilling, inaccessible forms, missing error boundaries

---

## Changelog
- **2026-02-12:** Initial version, 10-expert panel, 3x daily cron, Rush workflow integration

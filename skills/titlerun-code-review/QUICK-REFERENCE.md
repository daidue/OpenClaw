# TitleRun Code Review — Quick Reference Card

**For:** Rush (titlerun agent)  
**Keep this handy when processing review results**

---

## When to Review

| Trigger | When | How |
|---------|------|-----|
| **Self** | After 3+ commits | Check count in heartbeat, load skills, run review |
| **Automatic** | 10am, 3pm, 9pm EST | Read inbox summary, prioritize fixes |
| **Skip** | If reviewed <2 hours ago | Avoid duplicates |

---

## Health Score → Action Map

| Score | Band | Immediate Action |
|-------|------|------------------|
| **90-100** | 🟢 Healthy | Continue work. Minor issues → backlog. |
| **80-89** | 🟡 Needs Attention | Fix Major issues before new features. |
| **70-79** | 🟠 Concerning | **HALT features.** Fix Critical NOW. Fix Major same day. Notify Jeff. |
| **<70** | 🔴 Emergency | **STOP EVERYTHING.** Fix Critical immediately. Notify Jeff. Post-mortem required. |

---

## Severity Definitions

| Severity | Examples | Action Timeline |
|----------|----------|-----------------|
| **🔴 Critical** | System crash, data loss, security breach, unhandled exception in core flow | **Immediately** (drop everything) |
| **🟡 Major** | Incorrect results, poor performance, data inconsistency, missing validation | **This sprint** (before new features) |
| **🟢 Minor** | Edge case failure, suboptimal UX, non-critical error handling gap | **Backlog** (fix when convenient) |
| **💡 Improvement** | Better patterns, refactoring, tech debt reduction | **Backlog** (prioritize by impact) |

---

## Processing Checklist

After receiving a review:

1. **Read the review file:**
   ```bash
   ls -t /Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/*.md | head -1 | xargs cat
   ```

2. **Note the score** (from "Overall Health Score: XX/100" line)

3. **Prioritize fixes:**
   - Critical → top of WORKQUEUE.md (above everything)
   - Major → WORKQUEUE.md Current Work (below Critical, above features)
   - Minor → WORKQUEUE.md Backlog
   - High-impact improvements → Backlog

4. **Log to daily memory:**
   ```markdown
   ## Code Review — [HH:mm]
   **Score:** XX/100 [🟢/🟡/🟠/🔴]
   **Critical:** [N] **Major:** [N] **Minor:** [N]
   **Action:** [Fixed immediately | Logged to WORKQUEUE | Continuing safely]
   ```

5. **Fix Critical/Major issues** per action map above

6. **Test fixes** thoroughly before committing

7. **Commit fixes** with clear messages:
   ```
   [Code Review] Fix [Critical/Major]: [Description]
   
   - Issue: [What the expert found]
   - Fix: [What you changed]
   - Tested: [How you verified]
   ```

---

## Quick Commands

### Check commit count (self-trigger decision)
```bash
cd ~/Desktop/titlerun-api
LAST_REVIEW=$(cat /Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp 2>/dev/null || echo "8 hours ago")
gh log --since "$LAST_REVIEW" --format="%H" | wc -l
```

### Read latest review
```bash
cat $(ls -t /Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/*.md | head -1)
```

### Check last review timestamp
```bash
cat /Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp
```

### List all reviews (newest first)
```bash
ls -lt /Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/
```

---

## Expert Roster (Know Your Reviewers)

1. **Security Architect** → Auth, injection, secrets, rate limiting
2. **Database Engineer** → Query perf, N+1s, migrations, indexes
3. **Node.js Performance** → Memory leaks, event loop, async patterns
4. **API Design** → REST conventions, errors, schemas, versioning
5. **Testing Engineer** → Coverage, edge cases, mocks, integration
6. **Fantasy Sports Domain** → Scoring, roster rules, trade fairness
7. **DevOps/Reliability** → Circuit breakers, retries, observability
8. **Data Pipeline** → Scraper resilience, freshness, caching
9. **Bayesian/Stats** → Priors, posteriors, convergence, stability
10. **Frontend/UX** → React perf, state, accessibility, UX

---

## Common False Positives (When to Push Back)

If an expert flags something you disagree with:

1. **Note it in daily memory:**
   ```markdown
   ## Code Review — Potential False Positive
   **Expert:** [Name]
   **Finding:** [What they flagged]
   **My analysis:** [Why you think it's incorrect]
   **Action:** Discussing with Jeff / Implementing anyway for safety
   ```

2. **Discuss with Jeff** if it's a pattern (don't silently ignore)

3. **Implement anyway if safety-critical** (Security, Critical bugs → err on side of caution)

---

## Emergency Overrides

### If review skill is broken
- Log error to memory
- Notify Jeff immediately
- Continue work with **extra manual testing**
- Don't disable cron (Jeff handles that)

### If gh CLI fails
- Run `gh auth status` to diagnose
- Notify Jeff if auth expired
- Skip review, continue work cautiously

### If review takes >5 minutes
- Log timeout
- Notify Jeff
- Continue work, manual review required

---

## Token Budget Awareness

Keep reviews under 10K tokens:
- Focus on changed lines ±10 context (not full files)
- Each expert: top 3 findings max
- Aggregate duplicates (don't repeat same finding from multiple experts)

If review output is huge → optimize next time, but read it thoroughly this time.

---

## Philosophy Reminder

**Reviews are guardrails, not blockers.**

- Fix Critical/Major → keeps the ship sailing
- Fix Minor → improves quality over time
- Consider Improvements → reduces tech debt
- Celebrate wins (✅ What's Working Well) → reinforces good patterns

**If you're unsure about a fix:**
- Ask Jeff
- Write a test first
- Deploy to staging before production
- Document the decision in memory

---

## Example Workflow

```markdown
## [14:30] Heartbeat Start

### Pre-flight
- Commits since last review: 4 → **Trigger review**

### Code Review
[14:32] Running review...
[14:33] **Score: 85/100 🟡**
[14:33] **1 Major issue:** N+1 query in `/routes/dashboard.js`

### Immediate Action
- [14:35] ✅ Fixed N+1 (added JOIN, tested locally)
- [14:40] ✅ Pushed fix (commit abc123)
- [14:41] ✅ Logged to WORKQUEUE.md and memory

### Resume Feature Work
- [14:45] Continuing draft report card grading...
```

---

**Print this and keep it visible during your heartbeats!**

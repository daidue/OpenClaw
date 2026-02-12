# HEARTBEAT.md Addition for Rush (TitleRun Agent)

**Instructions:** Append this section to Rush's `HEARTBEAT.md` (likely at `/Users/jeffdaniels/.openclaw/workspace-titlerun/HEARTBEAT.md` or in the titlerun agent's config directory).

---

## Code Review Integration (Mandatory)

### Self-Triggered Reviews (After 3+ Commits)

**Trigger condition:** After every 3+ commits to `daidue/titlerun-api` (cumulative, not per-heartbeat), self-trigger a code review before continuing feature work.

**Process:**
1. Check commit count since last review:
   ```bash
   cd ~/Desktop/titlerun-api
   LAST_REVIEW=$(cat /Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp 2>/dev/null || echo "8 hours ago")
   COMMIT_COUNT=$(gh log --since "$LAST_REVIEW" --format="%H" | wc -l)
   ```

2. If `COMMIT_COUNT >= 3`:
   ```
   [Log to memory]: "3+ commits detected. Running code review before continuing..."
   [Load titlerun-dev skill]
   [Load titlerun-code-review skill]
   [Execute review process per SKILL.md]
   [Write results to reviews/ directory]
   [Update .last-review-timestamp]
   ```

3. If `COMMIT_COUNT < 3`:
   ```
   [Continue with planned work — no review needed yet]
   ```

**Exception:** If already reviewed in the last 2 hours (e.g., by automatic cron), skip self-triggered review to avoid duplicates.

---

### Review Results Handling (Mandatory)

**After receiving review results** (from self-triggered review OR automatic cron):

1. **Read the review file:**
   ```bash
   LATEST_REVIEW=$(ls -t /Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/*.md | head -1)
   cat "$LATEST_REVIEW"
   ```

2. **Parse the health score** (from "Overall Health Score: XX/100" line)

3. **Action based on score:**

   | Score | Action | Priority |
   |-------|--------|----------|
   | **90-100** (🟢 Healthy) | Log score. Continue feature work. Address Minor issues in backlog. | Normal |
   | **80-89** (🟡 Needs Attention) | Log score. Fix all **Major** issues before new features. Minor issues → backlog. | This Sprint |
   | **70-79** (🟠 Concerning) | **HALT feature work.** Fix all **Critical** issues immediately. Fix Major issues same day. Notify Jeff. | Urgent |
   | **<70** (🔴 Emergency) | **STOP all work.** Fix Critical issues NOW. Notify Jeff immediately. Major issues same day. Post-mortem required. | Emergency |

4. **Log review score in daily memory:**
   ```markdown
   ## Code Review — [HH:mm]
   **Score:** XX/100 [🟢/🟡/🟠/🔴]
   **Critical Issues:** [N]
   **Major Issues:** [N]
   **Action Taken:** [Fixed immediately | Logged to WORKQUEUE | Continuing safely]
   ```

5. **Update WORKQUEUE.md:**
   - **Critical issues → top of Current Work** (above current task)
   - **Major issues → Current Work** (below Critical, above features)
   - **Minor issues → Backlog** (prioritize by impact)
   - **High-impact improvements → Backlog** (after bugs)

---

### Automatic Reviews (Cron — 10am, 3pm, 9pm EST)

**What happens:**
- Cron triggers isolated titlerun agent session
- Agent runs code review skill automatically
- Results written to reviews/ directory
- Summary posted to Jeff's inbox

**Your responsibility:**
- Check Jeff's inbox for review summaries at start of each heartbeat
- If Critical/Major issues flagged → prioritize fixes per table above
- **Do NOT self-trigger a review within 2 hours of a cron review** (avoid duplicates)

---

### Example Heartbeat Flow (With Code Review)

```markdown
## [2026-02-12 14:30] Heartbeat Start

### Pre-flight
- [x] Read SOUL.md, MEMORY.md, today's memory
- [x] Check WORKQUEUE.md
- [x] Check inbox (Jeff)
- [x] **NEW:** Check commit count (4 commits since last review → trigger review)

### Code Review (Self-Triggered)
[14:32] 4 commits detected since 11:00. Running review...
[14:33] Review complete → Score: 85/100 🟡
[14:33] **1 Major issue found:** N+1 query in `/routes/dashboard.js`
[14:34] **Action:** Fix Major issue before continuing feature work

### Current Work
1. ✅ Fix N+1 query in dashboard route (added JOIN, tested)
2. [Resume] Implement draft report card grading logic

### Output
- Fixed N+1 query: `/routes/dashboard.js` (commit abc123)
- Draft grading: 60% complete, blocked on Bayesian expert feedback

## Next Heartbeat
- Continue draft grading
- Run review if 3+ more commits accumulate
```

---

### State File Management

**Location:** `/Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp`

**Format:** ISO 8601 timestamp (`2026-02-12T14:30:00Z`)

**Update after every review:**
```bash
date -u +"%Y-%m-%dT%H:%M:%SZ" > /Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp
```

**Read to check if review needed:**
```bash
LAST_REVIEW=$(cat /Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp 2>/dev/null || echo "8 hours ago")
```

---

### Emergency Overrides

**If code review skill is broken:**
- Log error to memory
- Notify Jeff immediately in inbox
- Continue work cautiously (extra manual testing)
- **Do NOT disable cron jobs** (Jeff will handle)

**If gh CLI authentication fails:**
- Run `gh auth status` to diagnose
- If expired, notify Jeff (needs re-auth)
- Skip review, continue work with caution

**If review takes >5 minutes:**
- Likely reading too many large files
- Log timeout, notify Jeff
- Continue work, manual review required

---

### Review Cadence Summary

| Trigger | Frequency | Action |
|---------|-----------|--------|
| **Automatic (cron)** | 10am, 3pm, 9pm EST | Read results from inbox, prioritize fixes |
| **Self-triggered** | After 3+ commits | Run review immediately, fix before continuing |
| **Manual (Jeff)** | On-demand | Respond to findings in inbox |

---

### Philosophy

**Why code review integration matters:**
- Catches bugs early (before they hit production)
- Reinforces best practices (learn from expert feedback)
- Prevents tech debt accumulation (fix issues while context is fresh)
- Builds trust with Jeff (proactive quality control)

**Balance:**
- Reviews are *guardrails*, not *blockers*
- Fix Critical/Major issues immediately, Minor issues can wait
- If a review flags something you disagree with, note it in memory and discuss with Jeff
- Speed matters, but quality matters more — this system keeps both in check

---

**Added:** 2026-02-12 by dev agent (subagent for Jeff)  
**Effective:** Immediately upon appending to HEARTBEAT.md

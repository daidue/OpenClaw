# Weekly Dogfood QA Automation Setup

**Created:** 2026-03-01  
**Status:** Ready to enable  

---

## What We Built

**Comprehensive weekly QA** that runs every Sunday at 4:00pm EST.

**Test suite:** 9 comprehensive tests
- First-time user journey (critical path)
- Trade Engine (core feature validation)
- Player valuation data integrity
- Report Cards (engagement)
- Navigation & links audit
- Performance & perceived speed
- Visual consistency
- Error states & edge cases
- Retention & engagement hooks

**Time:** 60-90 minutes per run  
**Cost:** ~$2.50 in tokens  
**Output:** Full report with screenshots, metrics, and prioritized findings  

---

## Test Instructions

**Location:** `titlerun-qa/test-instructions.md` (12.3 KB)

**Covers:**
- Engagement (< 2 min to value)
- Data integrity (cross-page consistency, calculations)
- Performance (load times, interaction speed)
- Retention (aha moments, reasons to return)
- Polish (navigation, visual consistency, error handling)

---

## Cron Configuration

**To enable weekly automation:**

Add this entry to `~/.openclaw/cron.json`:

```json
{
  "name": "titlerun-dogfood-qa",
  "schedule": "0 16 * * 0",
  "command": "Run comprehensive dogfood QA on app.titlerun.co. Full 9-test suite (engagement, data integrity, performance, retention). Expected: 60-90 min, ~$2.50 tokens. Post findings to Jeff inbox.",
  "nextRun": "2026-03-08T16:00:00-05:00",
  "type": "qa",
  "enabled": true
}
```

**Schedule explained:**
- `0 16 * * 0` = Every Sunday at 4:00pm EST
- First run: March 8, 2026

---

## Manual Execution

**Run anytime:**
```bash
cd ~/.openclaw/workspace
./scripts/run-dogfood.sh app.titlerun.co titlerun-qa/test-instructions.md
```

**Monitor progress:**
```bash
tail -f titlerun-qa/dogfood-YYYY-MM-DD/logs/session.log
```

**Check status:**
```bash
ps aux | grep agent-browser
cat .clawdbot/active-tasks.json | jq '.["dogfood-YYYY-MM-DD"]'
```

---

## Output Structure

Each QA run creates:

```
titlerun-qa/dogfood-YYYY-MM-DD/
├── report.md              # Full test results
├── screenshots/           # All screenshots captured
│   ├── 01-landing.png
│   ├── 02-auth.png
│   ├── 03-trade-engine.png
│   └── ...
├── videos/                # Session recordings (if enabled)
├── logs/
│   └── session.log       # Detailed execution log
└── session-info.json     # Metadata
```

---

## Success Criteria Per Test

### Test 1: First-Time User
- [ ] Value prop clear in < 5 seconds
- [ ] Load < 3 seconds after auth
- [ ] Zero "what do I do now?" moments
- [ ] At least one actionable insight

### Test 2: Trade Engine
- [ ] Intuitive player selection
- [ ] Real-time feedback
- [ ] Clear verdict on trade quality
- [ ] Values consistent across pages

### Test 3: Data Integrity
- [ ] Values identical across all pages
- [ ] Data current (< 24 hours)
- [ ] No obvious errors
- [ ] Relative rankings sensible

### Test 4: Report Cards
- [ ] Personalized insights
- [ ] Actionable recommendations
- [ ] League context visible
- [ ] Quick scan (< 30 sec)

### Test 5: Navigation
- [ ] Zero 404 errors
- [ ] Back button intuitive
- [ ] Deep links work
- [ ] All nav functional

### Test 6: Performance
- [ ] < 1 sec first paint
- [ ] < 3 sec interactive
- [ ] Immediate feedback
- [ ] No blocking

### Test 7: Visual
- [ ] Cohesive product feel
- [ ] Professional polish
- [ ] No inconsistencies

### Test 8: Errors
- [ ] Helpful error messages
- [ ] Graceful empty states
- [ ] Extreme values handled

### Test 9: Retention
- [ ] Aha moment < 60 sec
- [ ] Clear next action
- [ ] Reason to return

---

## Report Structure

**Every report includes:**

1. **Executive Summary**
   - Overall score (0-100)
   - Top 3 wins
   - Top 3 issues
   - Engagement grade (A-F)

2. **Critical Findings**
   - CRITICAL (ship blockers)
   - HIGH (fix within 1 week)
   - MEDIUM (fix within 1 month)
   - LOW (nice to have)

3. **Test Results** (PASS/FAIL for each)

4. **Engagement Analysis**
   - Aha moment speed
   - Value clarity
   - Retention hooks
   - Overall score (1-10)

5. **Performance Metrics**
   - Average page load
   - Time to interactive
   - Slowest interaction

6. **Data Integrity**
   - Players tested
   - Inconsistencies found
   - Calculation errors

7. **Prioritized Recommendations**

---

## Cost Breakdown

**Per weekly run:**
- Agent-browser session: ~50K tokens = ~$2.50
- Screenshot storage: ~5-10 MB
- Session logs: ~100 KB
- Total: ~$2.50 + negligible storage

**Monthly cost:** ~$10/month (4 Sundays)  
**Annual cost:** ~$120/year  

**ROI:** Catching ONE critical bug before launch > entire year of QA costs.

---

## Integration with Workflow

**Weekly cycle:**
1. **Sunday 4:00pm:** Automated QA runs
2. **Sunday 5:30pm:** Report ready in `titlerun-qa/dogfood-latest/`
3. **Sunday evening:** Jeff reviews, posts summary to Rush inbox
4. **Monday morning:** Rush addresses CRITICAL/HIGH findings

**If CRITICAL found:**
- Immediate Telegram notification to Taylor
- Rush spawns hotfix session
- Re-test after fix

**If all PASS:**
- Celebrate in weekly standup
- Track improvement trends

---

## Monitoring & Notifications

**Built-in monitoring:**
- `.clawdbot/scripts/monitor-dogfood-task.sh` checks every 60 seconds
- Detects completion when `report.md` exists
- Counts issues (CRITICAL, HIGH, MEDIUM, LOW)
- Sends notification to Rush inbox

**Notification format:**
```
🔍 TitleRun Dogfood QA Complete

Found: X issues
  • Y critical
  • Z high
  • W medium
  • V low

Report: titlerun-qa/dogfood-YYYY-MM-DD/report.md

⚠️ [Y] CRITICAL issues require immediate attention
```

---

## Continuous Improvement

**Track trends over time:**
- Overall score trend (improving?)
- Common issues (patterns?)
- Performance metrics (faster?)
- Engagement score (more compelling?)

**Quarterly review:**
- Are tests still relevant?
- Any new features to test?
- Any tests to retire?
- Update test-instructions.md

---

## First Run Status

**Launched:** 2026-03-01 20:15:30 EST  
**Session:** dogfood-20260301-201530  
**Target:** app.titlerun.co  
**Status:** Running (PID: 66123)  
**Expected completion:** 21:15-21:45 EST  

**Next scheduled run:** Sunday, March 8, 2026 @ 4:00pm EST

---

**Questions?** See `titlerun-qa/README.md` or `titlerun-qa/test-instructions.md`

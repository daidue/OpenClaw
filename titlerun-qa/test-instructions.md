# TitleRun Weekly Dogfood QA — Test Instructions

**Target:** app.titlerun.co  
**Perspective:** Senior UX/UI Developer (Engagement & Retention Focus)  
**Time Budget:** 60-90 minutes  

---

## Test Execution Philosophy

**Every test asks:**
1. Does it work? (Functional)
2. Does it feel good? (Experiential)
3. Does it deliver value? (Retention)

**Documentation requirements:**
- Screenshot every major screen
- Note load times for key interactions
- Flag any confusion moments ("what do I do now?")
- Verify data consistency across pages

---

## TEST 1: First-Time User Journey (Critical Path)

**Goal:** Can a new user get value in < 2 minutes?

### Steps:

1. **Visit app.titlerun.co (logged out)**
   - Take screenshot of landing page
   - TIME: How long until value prop is clear? (target: < 5 sec)
   - Check: Is primary CTA obvious?
   - Note: What does the hero section promise?

2. **Click primary CTA**
   - Screenshot the next screen
   - Verify: No 404 errors
   - Check: Loading state present? (if transition > 1 sec)
   - Note: Does it explain what happens next?

3. **Auth flow (if testing with credentials)**
   - Note: Which OAuth provider? (Sleeper expected)
   - Screenshot permission screen
   - Check: What data permissions requested?
   - Verify: Redirect after auth works

4. **First screen after auth**
   - TIME: Load time (target: < 3 sec)
   - Screenshot initial state
   - Check: Personalized content OR helpful empty state?
   - Verify: At least ONE actionable insight visible
   - Note: What's the first value delivered?

### Success Criteria:
- [ ] Value prop clear in < 5 seconds
- [ ] Load time after auth < 3 seconds
- [ ] Zero "what do I do now?" moments
- [ ] At least one actionable insight visible

### Document:
- Load times (actual vs target)
- Screenshots of each step
- Any confusion points
- First impression (1-10 engagement score)

---

## TEST 2: Trade Engine (Core Feature)

**Goal:** Validate #1 feature works and delights

### Steps:

1. **Navigate to Trade Engine**
   - Take screenshot
   - TIME: Page load (target: < 2 sec)
   - Verify: Link from nav/home works

2. **Select YOUR team**
   - Screenshot team selection
   - Verify: Team name matches Sleeper
   - Check: Roster loads with player names + positions
   - Visual check: Player cards readable?

3. **Select OPPONENT team**
   - Verify: All league teams listed
   - Check: Opponent roster loads correctly
   - Screenshot opponent selection

4. **Build a trade**
   - Add 1 player to "You Give"
   - Add 1 player to "You Get"
   - Screenshot the trade builder
   - Check: Values update in real-time?
   - Verify: Fairness score/recommendation appears

5. **Trade Fairness Analysis**
   - Take screenshot of fairness verdict
   - Note the score/recommendation shown
   - Check: Is it color-coded? (green=good, red=bad)
   - Verify: Recommendation actionable? ("Accept", "Reject", "Counter")

6. **Data integrity check**
   - Note player value in trade: Player X = [value]
   - Navigate to another page with same player
   - Verify: Value matches across pages

7. **Edge cases**
   - Try empty trade (no players) → What shows?
   - Try unbalanced trade (3 for 1) → Warning?
   - Screenshot edge case handling

### Success Criteria:
- [ ] Intuitive player selection
- [ ] Real-time feedback (updates as you build)
- [ ] Clear verdict on trade quality
- [ ] Values consistent across pages
- [ ] Edge cases handled gracefully

### Document:
- Load times
- Screenshots of trade builder, fairness analysis
- Any calculation errors noticed
- Engagement score (1-10)
- Data consistency verified

---

## TEST 3: Player Valuation Data Integrity

**Goal:** Ensure proprietary data is accurate and current

### Steps:

1. **Select a star player (e.g., Justin Jefferson)**
   - Open player detail view
   - Screenshot full player card
   - Note the valuation shown

2. **Valuation breakdown**
   - Check: Value visible (0-10,000 scale, NO dollar signs)
   - Verify: Data timestamp/freshness indicator?
   - Note: Does it show 10 sources or aggregated score?
   - Screenshot valuation details

3. **Cross-page consistency test**
   - Note value from player card: Justin Jefferson = [X]
   - Navigate to Trade Engine → find same player
   - Verify: Same value [X]
   - Navigate to Report Cards (if exists) → find same player
   - Verify: Same value [X]
   - Document: Any discrepancies found

4. **Spot-check 3 players**
   - Test player 1: [name] = [value]
   - Test player 2: [name] = [value]
   - Test player 3: [name] = [value]
   - Cross-reference: Check same values on different pages

5. **Edge cases**
   - Injured player → Status shown?
   - Bye week player → Reflected in value?
   - Recently traded (real NFL) → Data current?

### Success Criteria:
- [ ] Values identical across all pages
- [ ] Data feels current (< 24 hours for active players)
- [ ] No obvious errors (impossible values)
- [ ] Relative rankings make sense (QB1 > QB15)

### Document:
- 3 player values tested
- Any inconsistencies found
- Data freshness indicators
- Screenshot of player cards

---

## TEST 4: Report Cards (Engagement Feature)

**Goal:** Make users feel smart about their roster

### Steps:

1. **Navigate to Report Cards**
   - Take screenshot
   - TIME: Load time (target: < 3 sec)
   - Verify: Link works from nav

2. **View YOUR roster report**
   - Screenshot report card
   - Check: Shows your actual team?
   - Verify: Grades visible (A+, B-, 0-100, etc.)
   - Visual check: Is it scannable? (quick read)

3. **Insight quality assessment**
   - Read top 3 insights shown
   - Rate: Are they actionable? (specific vs generic)
   - Check: Do they reference YOUR players by name?
   - Verify: No generic fluff

4. **Competitive context**
   - Check: League ranking shown? (4th of 12, etc.)
   - Verify: Meaningful comparisons? ("#1 RB duo in league")
   - Can you see other teams' grades?

### Success Criteria:
- [ ] Personalized insights (uses actual player names)
- [ ] Actionable recommendations (what to DO)
- [ ] League context visible
- [ ] Quick scan (< 30 sec to understand situation)

### Document:
- Screenshot of report card
- Example insights (quote 2-3)
- Engagement score (1-10)
- Any generic/unhelpful content

---

## TEST 5: Navigation & Links Audit

**Goal:** Zero broken experiences

### Steps:

1. **Click every navigation link**
   - Header: Home, Trade Engine, Report Cards, Settings, etc.
   - Footer: Privacy, Terms, Help, etc.
   - Document: Any 404s found

2. **In-page links**
   - Click 5 player names → Verify they navigate correctly
   - Click 3 team names → Verify they load
   - Click any "Learn more" links
   - Document: Any broken links

3. **Back button behavior**
   - Navigate: Home → Trade Engine → Player Detail
   - Click back twice
   - Verify: Lands on Home as expected

4. **Deep link test**
   - Copy URL from a deep page (player detail)
   - Open in new tab
   - Verify: Direct navigation works (not redirect to home)

### Success Criteria:
- [ ] Zero 404 errors
- [ ] Back button intuitive
- [ ] Deep links work correctly
- [ ] All nav elements functional

### Document:
- List of all links tested
- Any 404s found
- Screenshot of any broken states

---

## TEST 6: Performance & Perceived Speed

**Goal:** Feels fast even if it's not

### Steps:

1. **Initial page load**
   - TIME: First contentful paint (when SOMETHING appears)
   - TIME: Time to interactive (when you can click)
   - Check: Loading skeleton or spinner visible?
   - Screenshot initial load state

2. **Page transition timing**
   - Navigate between 5 different pages
   - TIME: Each transition
   - Check: Instant feedback? (page starts changing immediately)
   - Verify: No flash of wrong content

3. **Heavy data load (Trade Engine with full rosters)**
   - TIME: How long to load 24 players (2 rosters)?
   - Check: Lazy loading present?
   - Verify: Can scroll while loading?

4. **Perceived speed features**
   - Check: Optimistic UI? (shows result before server confirms)
   - Check: Skeleton screens while loading?
   - Check: Every click has immediate feedback?

### Success Criteria:
- [ ] < 1 sec first contentful paint
- [ ] < 3 sec time to interactive
- [ ] Every interaction has immediate feedback
- [ ] Heavy pages don't block interaction

### Performance Benchmarks:
- Good: < 2 sec page load
- Acceptable: 2-4 sec
- Poor: > 4 sec

### Document:
- All load times measured
- Screenshots of loading states
- Any slow interactions noted
- Performance score (1-10)

---

## TEST 7: Visual Consistency

**Goal:** Professional, cohesive feel

### Steps:

1. **Typography audit**
   - Screenshot 5 different pages
   - Check: Consistent font families?
   - Check: Clear hierarchy (H1 > H2 > body)?
   - Verify: Readable contrast

2. **Color usage**
   - Primary color consistent across buttons/links?
   - Error states use consistent color?
   - Success states use consistent color?
   - Screenshot color palette in use

3. **Spacing & alignment**
   - Check: Consistent padding/margins?
   - Verify: Elements align properly?
   - Visual: Feels "designed" vs "cobbled together"?

4. **Component consistency**
   - Buttons: Same style everywhere?
   - Cards: Same styling?
   - Forms: Consistent input styling?

### Success Criteria:
- [ ] Feels like one cohesive product
- [ ] Professional polish
- [ ] No obvious design inconsistencies

### Document:
- Screenshot of 5 different pages
- Any inconsistencies noted
- Design score (1-10)

---

## TEST 8: Error States & Edge Cases

**Goal:** Graceful failure

### Steps:

1. **Empty states**
   - New user with no leagues → What shows?
   - League with no trades → Guidance provided?
   - Screenshot empty states found

2. **Extreme values (if testable)**
   - Large league (14 teams) → Performance OK?
   - 1-player trade → Math works?
   - Screenshot any issues

3. **Mobile edge cases (if on mobile)**
   - Landscape orientation → Layout adapts?
   - Small screen → No text cutoff?
   - Touch targets large enough?

### Success Criteria:
- [ ] Every empty state provides guidance
- [ ] Extreme values don't break UI
- [ ] Mobile edge cases handled

### Document:
- Screenshot of empty states
- Any UI breaks found
- Error handling score (1-10)

---

## TEST 9: Retention & Engagement Hooks

**Goal:** Will users return tomorrow?

### Steps:

1. **Aha moment hunt**
   - Within first 60 seconds, identify:
     - One player to trade FOR
     - One player to trade AWAY
     - One team weakness
   - Screenshot the insight that delivered this

2. **Next-action clarity**
   - After first insight, what's the CTA?
   - Check: Is it one-click away?
   - Verify: Clear what to do next

3. **Reasons to return**
   - Can you save a trade for later?
   - Notification system visible?
   - Email/push setup offered?
   - Screenshot retention mechanisms

### Success Criteria:
- [ ] Aha moment within 60 seconds
- [ ] Clear next action (no "now what?")
- [ ] At least one reason to return tomorrow

### Document:
- Time to aha moment
- Screenshot of retention hooks
- Engagement score (1-10)

---

## FINAL REPORT STRUCTURE

### Executive Summary
- Overall score: [0-100]
- Top 3 wins
- Top 3 issues found
- Engagement grade: [A-F]

### Critical Findings
- **CRITICAL** (ship blockers): [list]
- **HIGH** (fix within 1 week): [list]
- **MEDIUM** (fix within 1 month): [list]
- **LOW** (nice to have): [list]

### Test Results Summary
- Test 1 (First-time user): [PASS/FAIL]
- Test 2 (Trade Engine): [PASS/FAIL]
- Test 3 (Data integrity): [PASS/FAIL]
- Test 4 (Report Cards): [PASS/FAIL]
- Test 5 (Navigation): [PASS/FAIL]
- Test 6 (Performance): [PASS/FAIL]
- Test 7 (Visual): [PASS/FAIL]
- Test 8 (Errors): [PASS/FAIL]
- Test 9 (Retention): [PASS/FAIL]

### Engagement Analysis
- Aha moment speed: [X seconds]
- Value clarity: [clear/unclear]
- Retention hooks: [strong/weak]
- Overall engagement: [1-10]

### Performance Metrics
- Average page load: [X sec]
- Time to interactive: [X sec]
- Slowest interaction: [what/time]

### Data Integrity
- Players tested: [count]
- Inconsistencies found: [count]
- Calculation errors: [count]

### Recommendations (Prioritized)
1. [Most critical fix]
2. [Next priority]
3. [Enhancement]

---

**Test Start Time:** [timestamp]  
**Test End Time:** [timestamp]  
**Total Duration:** [X minutes]  
**Tester:** Dogfood QA Agent  
**Build/Version:** [if available]

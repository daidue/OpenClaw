# Season Outlook Probability Fix — Planning Document

**Date:** 2026-03-17
**Status:** PLANNING (do not implement yet)
**Estimated Implementation:** 2-4 hours

---

## 1. Root Cause Analysis

### What's happening
The Season Outlook for TayTwoTime (ranked #1/12 with 127,499 roster value) shows:
- **Projected Finish:** 13th-12th (impossible in a 12-team league!)
- **Playoff Odds:** 0%
- **Championship:** 1%

### The Bug: Draft Pick Value Mismatch in `buildAdjustedLeagueStats()`

**File:** `titlerun-api/src/services/intelligenceHub/seasonOutlook.js`

The bug is in how `buildAdjustedLeagueStats()` adjusts team values. There's a fundamental **apples-to-oranges comparison**:

**Step 1 — Team's adjusted value (correct):**
```javascript
myAdjustedValue = teamValue + (myPickValue * PICK_WEIGHT)
// e.g., 127,499 + (0 * 0.5) = 127,499  (if team has no/few picks)
```

**Step 2 — League team values adjustment (BROKEN):**
```javascript
// buildAdjustedLeagueStats adds AVERAGE pick contribution to ALL teams uniformly
const avgPickContribution = (sumOfAllPickValues / numTeams) * pickWeight;
adjustedTeamValues = teamValues.map(v => v + avgPickContribution);
// e.g., every team gets +15,000 added (if avg pick value is 30,000)
```

**The result:** The team being analyzed uses their ACTUAL pick value, but ALL teams in the comparison array get the AVERAGE pick value. If this team has fewer picks than average:
- Their adjusted value: 127,499 + 0 = **127,499**
- Their OWN entry in the league array: 127,499 + 15,000 = **142,499**
- Even weaker teams: 80,000 + 15,000 = **95,000**

**This makes the #1 team appear to rank LOWER than themselves in the league array.**

### Why "13th-12th" finish in 12-team league

In `calculateProjectedFinishRange()`:
```javascript
const myRank = teamValues.filter(v => v > teamValue).length + 1;
```
If all 12 adjusted team values are higher than `myAdjustedValue`, then `myRank = 13`.

Then in the range calculation:
```javascript
const tierStart = Math.floor((13 - 1) / 4) * 4 + 1; // = 13
const tierEnd = Math.min(13 + 4 - 1, 12);            // = 12
// Result: "13th-12th" ← backwards and impossible!
```

### Why 0% playoff odds

`calculatePlayoffOdds()` uses a logistic curve:
```javascript
const valueDifferential = (myAdjustedValue - adjustedLeagueAverage) / adjustedLeagueAverage;
```
If `myAdjustedValue` is significantly below `adjustedLeagueAverage` (because the average includes pick bonuses the team doesn't actually have), the logistic curve returns near-0%.

### Secondary Issue: `calculateTeamValue()` only counts 1 QB in Superflex

```javascript
const starterCounts = { QB: 1, RB: 2, WR: 3, TE: 1 };
```
In Superflex leagues, this should be `QB: 2`. This affects both the individual team and league-wide calculations equally (so it doesn't cause the 0% bug), but it undervalues QB-heavy rosters relative to what's actually started.

---

## 2. Scope of Fixes Needed

### Fix 1: `buildAdjustedLeagueStats()` — CRITICAL
The approximation of adding average pick value to all teams is fundamentally flawed. Two options:

**Option A (Recommended): Build adjusted values per-roster with actual pick data**
```javascript
buildAdjustedLeagueStats(leagueId, format, pickData, pickWeight) {
  // Get each roster's player value + their ACTUAL pick value
  // Not the average — the real per-team pick value
  
  // 1. Get player values per roster (from getLeagueStats query)
  // 2. Add each roster's actual pickValueByRoster[rosterId] * pickWeight
  // 3. Return the properly adjusted array
}
```
This requires refactoring `getLeagueStats()` to return per-roster values (not just a sorted array of numbers), so we can pair each team's player value with their actual pick value.

**Option B (Quick fix): Don't adjust league comparison at all for picks**
```javascript
// Just compare myAdjustedValue against other teams' adjusted values
// by computing each team's actual adjusted value individually
// OR: remove pick adjustment from league comparison entirely
// and only use player values for ranking
```

### Fix 2: `calculateProjectedFinishRange()` — Guard against out-of-bounds rank
```javascript
// Add bounds check
const myRank = Math.min(
  teamValues.filter(v => v > teamValue).length + 1,
  totalTeams
);
```

### Fix 3: Superflex starter counts (minor)
```javascript
// In calculateTeamValue() and the league stats query:
const starterCounts = {
  QB: format === 'sf' ? 2 : 1,  // 2 QBs in Superflex
  RB: 2,
  WR: 3,
  TE: 1,
};
```
Also update the SQL query in `getLeagueStats()` which hardcodes `position = 'QB' AND pos_rank <= 1`.

---

## 3. Recommended Implementation Approach

### Phase 1: Fix the comparison bug (1-2 hours)

**Refactor `getLeagueStats()` to return per-roster data:**

Instead of returning just a sorted array of team values, return a map of `{ rosterId: playerValue }` so we can properly pair each team's player value with their actual pick value.

```javascript
// Current: returns { leagueAverage, teamValues: [sorted numbers], totalTeams }
// New: returns { leagueAverage, teamValues: [sorted numbers], teamValuesByRoster: { rosterId: value }, totalTeams }
```

**Refactor `buildAdjustedLeagueStats()` to use actual pick values:**

```javascript
buildAdjustedLeagueStats(leagueStats, pickData, pickWeight) {
  const { teamValuesByRoster, totalTeams } = leagueStats;
  const { pickValueByRoster } = pickData;

  // Build properly adjusted values per team
  const adjustedValues = [];
  for (const [rosterId, playerValue] of Object.entries(teamValuesByRoster)) {
    const pickValue = pickValueByRoster[rosterId] || 0;
    adjustedValues.push(playerValue + (pickValue * pickWeight));
  }

  const sorted = adjustedValues.sort((a, b) => b - a);
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;

  return {
    leagueAverage: avg,
    teamValues: sorted,
    totalTeams,
  };
}
```

### Phase 2: Add safety bounds (30 min)

1. Clamp `myRank` to `[1, totalTeams]` in all ranking functions
2. Validate `projectedFinishRange` makes sense (tierStart ≤ tierEnd)
3. Add minimum floor to playoff odds (if rank ≤ totalTeams/2, odds ≥ 30%)

### Phase 3: Superflex-aware starter counts (30 min)

Pass `format` into `calculateTeamValue()` and the SQL query so SF leagues count 2 QBs.

---

## 4. Model Assessment

The existing calculation model (logistic curve for playoff odds, exponential decay for championship odds) is **reasonable for MVP**. The math is sound — the issue is purely the data mismatch in pick value adjustment.

**Current model quality (once bug is fixed):**
- ✅ Logistic curve with k=5 steepness — good distribution
- ✅ Clamps to 1-99% range — realistic
- ✅ Championship odds use exponential decay by rank — appropriate
- ✅ Position analysis for strengths/weaknesses — useful
- ⚠️ Doesn't account for schedule, injuries, or in-season record — fine for offseason
- ⚠️ No Monte Carlo simulation — fine for V1

**No need to replace the probability model.** The logistic/exponential approach is appropriate. Just fix the input data.

---

## 5. Expected Results After Fix

For TayTwoTime (ranked #1/12, value 127,499):

| Metric | Current (Broken) | Expected (Fixed) |
|--------|-----------------|-------------------|
| Projected Finish | 13th-12th | 1st-4th |
| Playoff Odds | 0% | 85-95% |
| Championship | 1% | 20-28% |

For a middle-of-pack team (ranked 6th/12):

| Metric | Expected |
|--------|----------|
| Projected Finish | 5th-8th |
| Playoff Odds | 45-55% |
| Championship | 6-10% |

For the weakest team (ranked 12th/12):

| Metric | Expected |
|--------|----------|
| Projected Finish | 9th-12th |
| Playoff Odds | 5-15% |
| Championship | 1-2% |

---

## 6. Test Cases

```javascript
describe('Season Outlook (fixed)', () => {
  // Sanity checks
  it('#1 ranked team should have 85%+ playoff odds', ...);
  it('#12 ranked team should have <15% playoff odds', ...);
  it('Championship odds should always be ≤ playoff odds', ...);
  it('Projected finish range should be within [1, totalTeams]', ...);
  it('tierStart should always be ≤ tierEnd', ...);
  
  // Pick value integration
  it('Team with 0 picks should still rank correctly by player value', ...);
  it('Team with elite picks should get boost but not dominate', ...);
  it('Pick weight at 0.5 should make picks worth half of player value', ...);
  
  // Edge cases
  it('All teams with equal value → ~50% playoff odds each', ...);
  it('League with 0 average value → 50% default', ...);
  it('Missing pick data → graceful fallback to player-only values', ...);
});
```

---

## 7. Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `titlerun-api/src/services/intelligenceHub/seasonOutlook.js` | Fix `buildAdjustedLeagueStats()`, refactor `getLeagueStats()`, fix SF starter counts | CRITICAL |
| `titlerun-api/src/services/intelligenceHub/seasonOutlook.js` | Add bounds check in `calculateProjectedFinishRange()` | HIGH |
| `titlerun-api/src/services/intelligenceHub/seasonOutlook.js` | Pass format to `calculateTeamValue()` for SF-aware counts | MEDIUM |
| `titlerun-app/src/components/IntelligenceHub/SeasonOutlook.jsx` | No changes needed — frontend correctly displays API data | NONE |
| `titlerun-app/src/services/seasonOutlookService.js` | Legacy client-side service — NOT USED by Intelligence Hub (uses backend API). No changes needed. | NONE |

---

## 8. Data Flow (for reference)

```
Frontend (IntelligenceHub.jsx)
  → intelligenceHubAPI.getSeasonOutlook(leagueId, rosterId)
  → GET /api/intelligence-hub/season-outlook/:leagueId/:rosterId
  → seasonOutlook.generateOutlook(sleeperLeagueId, rosterId)
    → getLeague() — hub_leagues table
    → getRoster() — league_rosters table
    → getPlayersWithTitleRunValues() — titlerun_values join
    → getLeagueStats() — aggregated league-wide player values
    → getLeaguePickValues() — Sleeper API + pick value engine
    → buildAdjustedLeagueStats() ← BUG IS HERE
    → calculatePlayoffOdds() — logistic curve (correct math, bad input)
    → calculateChampionshipOdds() — exponential decay (correct math, bad input)
    → calculateProjectedFinishRange() — rank-based tiers (no bounds check)
  → Response: { outlook: { projectedFinish, playoffOdds, championshipOdds, ... } }
```

**Note:** `titlerun-app/src/services/seasonOutlookService.js` is a LEGACY client-side calculation service that is NOT used by the Intelligence Hub. The Intelligence Hub calls the backend API which runs `seasonOutlook.js` on the server. No frontend service changes needed.

# Ranking Anomalies Investigation — 2026-03-14

## Executive Summary

**Both anomalies confirmed.** Root cause identified as a systemic data quality issue affecting ALL positions, not just TE.

### Root Cause: `sleeper_adp` source uses search popularity, not actual ADP

The `sourceRefreshPipeline.js` Sleeper ADP refresh function (line 144-211) uses Sleeper's `search_rank` field — which is a **search popularity metric** — and incorrectly treats it as dynasty ADP. The exponential formula `10000 * exp(-0.008 * (rank - 1))` converts low search ranks (high popularity) into high dynasty values.

**Result:** Retired legends (Gronkowski, Brady, Brees, Gurley) and obscure players who happen to be searched frequently (Kuntz) get inflated values that corrupt rankings.

---

## Zack Kuntz (TE3 Anomaly)

**Current Ranking:** TE3 (titlerun_value: 6,389 in SF format)
**Expected Ranking:** TE20-30+ (Kuntz is a backup/depth TE on MIA with minimal dynasty value)

### Data Profile
| Field | Value |
|-------|-------|
| Player ID | 9483 |
| Team | MIA |
| Age | 26 |
| Status | Active (correct) |
| Sources Used | **1** (only sleeper_adp) |
| Confidence | **Low** |
| Sleeper search_rank | 57 (very popular in searches) |
| KTC Value | 0 |
| FantasyCalc Value | 0 |
| DynastyProcess Value | 0 |
| Dynasty Daddy Value | 0 |

### Root Cause
- Kuntz has a Sleeper `search_rank` of 57 (high search popularity, possibly from Sleeper users looking him up)
- NO other dynasty source (KTC, FantasyCalc, Dynasty Daddy, DynastyProcess) values him at all
- The single sleeper_adp value of 6,389 becomes his entire titlerun_value
- The calculation engine allows values from just 1 source (minimum threshold is 1)

### Real-World Context
- Kuntz was a 2023 draft pick, listed on Dolphins roster
- He appears to have some 2025 production but is NOT a consensus top-5 TE in any dynasty community
- His 0 value across KTC, FantasyCalc, Dynasty Daddy confirms he's not a relevant dynasty asset

---

## Rob Gronkowski (TE13 Anomaly)

**Current Ranking:** TE13 (titlerun_value: 3,922 in SF format)
**Expected Ranking:** Not ranked (retired since 2021)

### Data Profile
| Field | Value |
|-------|-------|
| Player ID | 515 |
| Team | (none) |
| Age | 32 (stale — real age is 36) |
| Status | **Active** ❌ (should be Retired) |
| Active flag | **true** ❌ (should be false) |
| Sources Used | **1** (only sleeper_adp) |
| Confidence | **Low** |
| Sleeper search_rank | 118 (still popular from legacy) |
| KTC Value | 0 |
| FantasyCalc Value | 0 |
| All other sources | 0 |

### Root Cause
- Gronkowski retired after the 2021 season with the Buccaneers
- His `status` field says "Active" and `active` flag is `true` — both incorrect
- Sleeper still returns him with a `search_rank` (he's a popular search term)
- The sleeper_adp pipeline doesn't filter retired players — it only checks Sleeper's `active` field
- His search_rank of 118 → value of 3,922 → TE13

---

## Systemic Issue: 260 Single-Source Players

This is NOT limited to Kuntz and Gronkowski. **260 players** have titlerun_values based on only 1 source, with **24 having values over 3,000** (appearing in top rankings).

### Most Egregious Examples (single-source, high value):

| Player | Position | Value | Source | Status |
|--------|----------|-------|--------|--------|
| Todd Gurley | RB | 8,122 | sleeper_adp | Retired |
| Lew Nichols | RB | 7,993 | sleeper_adp | Questionable |
| Tom Brady | QB | 7,250 | sleeper_adp | Retired |
| Drew Brees | QB | 7,134 | sleeper_adp | Retired |
| Bryce Ford-Wheaton | WR | 7,089 | sleeper_adp | Unknown |
| Justin Shorter | WR | 6,757 | sleeper_adp | Unknown |
| Zack Kuntz | TE | 6,389 | sleeper_adp | Active |
| Antonio Brown | WR | 4,946 | sleeper_adp | Retired |
| Julian Edelman | WR | 4,829 | sleeper_adp | Retired |
| Rob Gronkowski | TE | 3,922 | sleeper_adp | Retired |

---

## Recommended Fixes (3 layers)

### Fix 1: Immediate — Exclude single-source sleeper_adp players from rankings

**Option A: Require minimum 2 sources for titlerun_value calculation**

In `src/services/titlerunCalculationService.js` line ~260:
```javascript
// CHANGE FROM:
const isValid = Object.keys(filtered).length >= 1;
// CHANGE TO:
const isValid = Object.keys(filtered).length >= 2;
```

**Option B: Cap sleeper_adp-only values (less aggressive)**

In the calculation, if the only source is sleeper_adp, cap the value or flag it as unreliable.

### Fix 2: Fix the sleeper_adp source itself

In `src/services/sourceRefreshPipeline.js` line ~159-162:

```javascript
// CURRENT (buggy):
.filter(([, p]) => p.search_rank && validPositions.has(p.position) && p.active)

// FIX: Also check that the player has recent stats or is on an active roster
// AND cross-reference with our players table status
.filter(([, p]) => {
  if (!p.search_rank || !validPositions.has(p.position) || !p.active) return false;
  // Skip players not on an active NFL team
  if (!p.team || p.team === '') return false;
  // Skip if years_exp indicates they haven't played recently
  // (Sleeper's active flag is unreliable for retired players)
  return true;
})
```

**Even better:** Rename the source from `sleeper_adp` to something honest (like `sleeper_popularity`) since `search_rank` is NOT ADP data, or drop it entirely and use Sleeper's actual ADP endpoint instead.

### Fix 3: Data cleanup — Mark retired players and remove stale values

```sql
-- Step 1: Mark known retired players
UPDATE players SET status = 'Retired', active = false, team = NULL
WHERE full_name IN ('Rob Gronkowski', 'Tom Brady', 'Drew Brees', 'Todd Gurley', 
  'Antonio Brown', 'Julian Edelman', 'Ezekiel Elliott', 'Damien Harris', 'Bryce Love');

-- Step 2: Delete source_values for retired players  
DELETE FROM source_values WHERE player_id IN (
  SELECT id FROM players WHERE status = 'Retired' OR active = false
);

-- Step 3: Delete titlerun_values for retired players
DELETE FROM titlerun_values WHERE player_id IN (
  SELECT id FROM players WHERE status = 'Retired' OR active = false
);

-- Step 4: For Kuntz specifically, remove the inflated sleeper_adp source values
-- (He may have some legitimate value from other sources in the future)
DELETE FROM source_values 
WHERE player_id = '9483' AND source = 'sleeper_adp';

DELETE FROM titlerun_values 
WHERE player_id = '9483' AND sources_used = 1;
```

### Fix 4: Prevention — Add validation to the calculation pipeline

```javascript
// In titlerunCalculationService.js, add before storing:

// 1. Require minimum 2 sources for any player in top 50 per position
if (positionRank <= 50 && sourcesUsed < 2) {
  logger.warn(`[TitleRunCalc] Skipping ${playerName} - only ${sourcesUsed} source(s) for top-50 position rank`);
  continue;
}

// 2. Flag single-source values in the output
if (sourcesUsed === 1) {
  confidenceLevel = 'very_low';
}

// 3. Never allow retired/inactive players to have values
if (playerStatus === 'Retired' || !playerActive) {
  continue;
}
```

---

## Top 15 TEs — Current vs Expected (Post-Fix)

| Rank | Current Player | Issue | Expected Player |
|------|---------------|-------|-----------------|
| 1 | Brock Bowers | ✅ Correct | Brock Bowers |
| 2 | Trey McBride | ✅ Correct | Trey McBride |
| 3 | **Zack Kuntz** | ❌ Single-source inflated | Colston Loveland |
| 4 | Colston Loveland | ✅ Correct (should be 3) | Tyler Warren |
| 5 | Tyler Warren | ✅ Correct (should be 4) | Tucker Kraft |
| 6 | Tucker Kraft | ✅ Correct (should be 5) | Sam LaPorta |
| 7 | Sam LaPorta | ✅ Correct (should be 6) | Kyle Pitts |
| 8 | **Thomas Odukoya** | ❌ Single-source (sleeper_adp) | Harold Fannin |
| 9 | Kenyon Sadiq | ⚠️ Rookie - verify | Oronde Gadsden |
| 10 | Kyle Pitts | ✅ Correct | Dalton Kincaid |
| 11 | Harold Fannin | ✅ Correct | George Kittle |
| 12 | Oronde Gadsden | ✅ Correct | Jake Ferguson |
| 13 | **Rob Gronkowski** | ❌ RETIRED | Brenton Strange |
| 14 | Dalton Kincaid | ✅ Correct | Isaiah Likely |
| 15 | Justin Joly | ⚠️ Single-source (uth) | Juwan Johnson |

---

## Impact Assessment

- **TE position:** 3 of top 15 are anomalous (20% error rate)
- **All positions:** 24 players with inflated single-source values above 3,000
- **Retired players polluting rankings:** At least 8 confirmed (Brady, Brees, Gronk, Gurley, Brown, Edelman, Elliott, Harris)
- **User-facing impact:** If anyone queries TE rankings, they get wrong data

## Priority

**HIGH** — This affects the integrity of the core product (player valuations). Should be fixed before any public launch.

---

## Files to Modify

1. `src/services/sourceRefreshPipeline.js` — Fix sleeper_adp source (filter retired, check team)
2. `src/services/titlerunCalculationService.js` — Require min 2 sources, or heavily discount single-source values
3. Database — Mark retired players, clean up stale values
4. Consider: Drop `sleeper_adp` entirely until a proper ADP data source is implemented

---

*Investigation completed 2026-03-14 12:15 EDT*

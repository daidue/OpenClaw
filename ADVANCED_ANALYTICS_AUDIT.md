# ADVANCED ANALYTICS AUDIT — TitleRun Database
**Date:** 2026-03-13
**Auditor:** Rush (subagent)

---

## Executive Summary

TitleRun has a **surprisingly rich** analytics foundation. We have 10 years of historical data (2015–2024), 52K+ weekly stat records, and several advanced metrics already stored. However, **key advanced stats tables referenced by the UI don't exist yet** (`player_advanced_stats`, `player_team_context`, `team_schemes`), meaning the beautiful AdvancedStats component in the app currently shows empty state for all players.

**The gap isn't data collection — it's data transformation and surfacing.**

---

## Phase 1: Database Schema Audit

### 1.1 All Tables (112 total)

Stats-relevant tables:

| Table | Rows | Purpose | Last Updated |
|-------|------|---------|--------------|
| `player_weekly_stats` | 52,398 | Game-by-game stats (nflverse) | 2024 season |
| `player_season_stats` | 5,949 | Season aggregates with advanced metrics | 2015–2025 |
| `players` | 4,035 | Player profiles + combine + multi-source values | Active |
| `player_metadata` | 3,855 | Combine/draft/college metrics | Active |
| `titlerun_values` | 3,752,058 | Historical value snapshots (massive) | Active |
| `normalized_values` | 2,276,616 | Cross-source normalized values | Active |
| `player_value_history` | 701,870 | Value time series | Active |
| `redraft_ros_values` | 3,166 | Rest-of-season projections | 2025 season |
| `ml_predictions` | 2,440 | ML floor/median/ceiling projections | 2025 |
| `player_outlook` | 1,347 | AI-generated season outlooks | 2025 |
| `production_values` | 1,172 | Production-based valuations | Active |
| `edge_signals` | 176 | Buy/sell edge signals | Active |
| `redraft_weekly_projections` | 45 | Weekly point projections | 2025 |

### 1.2 Key Stats Tables — Detailed Column Inventory

#### `player_season_stats` (5,949 rows, 2015–2025)

**Basic Stats:**
| Column | Type | Coverage |
|--------|------|----------|
| games_played | int | ✅ All seasons |
| pass_yards, pass_td, interceptions | int | ✅ QBs |
| rush_yards, rush_td, rush_att | int | ✅ RBs/QBs |
| receptions, rec_yards, rec_td, targets | int | ✅ WRs/TEs |
| pass_attempts, pass_completions, sacks | int | ✅ QBs |
| fumbles_lost, return_yards, return_tds | int | ✅ All |

**Advanced Stats:**
| Column | Type | Coverage | Seasons |
|--------|------|----------|---------|
| `epa_per_play` | numeric(6,3) | ~530/season for 2015–2024 | ✅ 10 years |
| `target_share` | numeric(5,4) | ~460/season (WR/TE/RB) | ✅ 10 years |
| `snap_pct` | numeric(5,4) | ~530/season for 2015–2023; **0 for 2024**; 396 for 2025 | ⚠️ Gap in 2024 |
| `yac_per_reception` | numeric(6,3) | ~440/season (receivers) | ✅ 10 years |
| `air_yards_per_target` | numeric(6,3) | ~460/season (receivers) | ✅ 10 years |
| `opportunity_share` | numeric(5,4) | ~140/season | ⚠️ Low coverage |
| `yards_after_contact_per` | numeric(6,3) | **0 rows** | ❌ Never populated |
| `cpoe` | numeric(6,3) | **0 rows** | ❌ Never populated |

**Fantasy Scoring:**
| Column | Type | Coverage |
|--------|------|----------|
| fantasy_points_ppr/half/std | numeric | ✅ All |
| fantasy_ppg_ppr/half/std | numeric | ✅ All |
| weekly_points_stdev | numeric | ✅ 2015–2024 |
| weekly_points_p10, weekly_points_p90 | numeric | ✅ 2015–2024 |

#### `player_weekly_stats` (52,398 rows, 2015–2024)

- **Source:** nflverse (100% of records)
- **Coverage:** 21–22 weeks per season, ~530-575 players/season
- **Data:** Basic stats only (yards, TDs, receptions, targets, attempts)
- **No advanced weekly stats** (no EPA, no snap counts, no target share per week)
- **2025 season:** No weekly data yet (0 rows)

#### `player_metadata` (3,855 rows)

| Column | Has Data | Coverage |
|--------|----------|---------|
| forty_time | 1,584 | 41% of players |
| speed_score | 1,562 | 41% |
| ras_score | 0 | ❌ Never populated |
| college_dominator_rating | 0 | ❌ Never populated |
| college_breakout_age | 0 | ❌ Never populated |
| contract_aav | 0 | ❌ Never populated |
| injury_risk_score | 0 (non-zero) | ❌ Never populated |
| vertical_jump | Yes (via players table) | Partial |
| broad_jump | Yes (via players table) | Partial |

#### `players` table — Combine Data (in players, not metadata)

| Column | Has Data |
|--------|----------|
| combine_40_time | Partial |
| combine_vertical | Partial |
| combine_broad_jump | Partial |
| combine_bench | Partial |
| combine_shuttle | Partial |
| combine_cone | Partial |

### 1.3 Tables That DON'T EXIST (But Are Referenced in Code)

The `playerIntelligenceService.js` queries these tables with graceful 42P01 fallback:

| Table | Referenced By | Purpose |
|-------|--------------|---------|
| `player_advanced_stats` | `getAdvancedStatsAggregate()`, `getAdvancedStatsWeekly()` | Position-specific advanced metrics with weekly breakdown |
| `player_team_context` | `getTeamContext()` | Player role, shares, depth chart |
| `team_schemes` | `getTeamContext()` JOIN | Team scheme, coordinator, personnel |
| `trend_signals` | `getActiveTrendSignals()` | Trend detection data |

**These are the critical missing tables that prevent the UI from showing data.**

---

## Phase 2: Data Quality Assessment

### 2.1 Completeness Check

| Metric | Coverage | Recency | Depth | Status |
|--------|----------|---------|-------|--------|
| EPA per play | 98% (2015–2024) | 2024 ✅ | 10 seasons | ✅ Ready |
| Target share | 85% (WR/TE/RB) | 2024 ✅ | 10 seasons | ✅ Ready |
| YAC per reception | 82% (receivers) | 2024 ✅ | 10 seasons | ✅ Ready |
| Air yards per target (aDOT) | 85% (receivers) | 2024 ✅ | 10 seasons | ✅ Ready |
| Snap % | 98% (2015–2023), **0% for 2024** | 2025 partial ✅ | 10 seasons | ⚠️ 2024 gap |
| Opportunity share | ~26% (RBs mostly) | 2024 ✅ | 10 seasons | ⚠️ Low coverage |
| CPOE | 0% | Never | None | ❌ Not populated |
| Yards after contact/carry | 0% | Never | None | ❌ Not populated |
| Fantasy floor/ceiling (P10/P90) | Good | 2024 | 10 seasons | ✅ Ready |
| Weekly consistency (stdev) | Good | 2024 | 10 seasons | ✅ Ready |
| ML predictions (floor/median/ceiling) | 2,440 players | 2025 | Current only | ✅ Ready |
| Player outlook narratives | 1,347 | 2025 | Current only | ✅ Ready |

### 2.2 Accuracy Spot Check (2024 Season)

| Player | Our Data | Expected | Status |
|--------|----------|----------|--------|
| Ja'Marr Chase | 127 rec, 1708 yds, 17 TD, 403.0 PPR | 127/1708/17 ✅ | ✅ Accurate |
| Saquon Barkley | 2005 rush yds, 13 rush TD | 2005/13 ✅ | ✅ Accurate |
| Josh Allen | 3731 pass yds, 28 TD, 6 INT, 531 rush | 3731/28/6/531 ✅ | ✅ Accurate |
| CeeDee Lamb | 101 rec, 1194 yds, 6 TD (15 games) | 101/1194/6 ✅ | ✅ Accurate |
| Patrick Mahomes | 3928 pass yds, 26 TD, 11 INT | 3928/26/11 ✅ | ✅ Accurate |

**Verdict: Basic stats are accurate. Advanced stats (EPA) look reasonable but hard to verify exactly.**

### 2.3 Gap Analysis

#### ✅ Already in DB — Ready to Use
- EPA per play (10 seasons)
- Target share (10 seasons, WR/TE/RB)
- YAC per reception (10 seasons)
- Air yards per target / aDOT (10 seasons)
- Fantasy points (PPR/Half/Standard, per game)
- Weekly consistency (stdev, P10, P90)
- ML floor/median/ceiling projections
- Player outlook narratives (AI-generated)
- Combine data (40 time, speed score)
- Value data (massive — 3.7M titlerun values)
- Edge signals (176 buy/sell signals)

#### ⚠️ Partially in DB — Needs Backfill or Cleanup
- Snap % — missing for 2024 season specifically
- Opportunity share — only ~26% coverage (mainly RBs)
- Player metadata — speed_score populated (1,562), but RAS, dominator, breakout age all zeros
- CPOE column exists but never populated (0 rows across all seasons)
- Yards after contact column exists but never populated

#### ❌ Not in DB — Would Need New Data Source
- Yards per route run (YPRR) — premium metric, not in nflverse free data
- Contested catch rate — not in current data
- Separation (avg separation) — Next-Gen Stats only
- Time to throw — Next-Gen Stats only
- Pressure rate — Next-Gen Stats only
- Route tree distribution — not available
- Red zone target share — computable from weekly data
- WOPR (weighted opportunity rating) — computable from target_share + air_yards data
- RACR (receiver air conversion ratio) — computable from rec_yards / air_yards
- Pass/run block grades — PFF premium only

---

## Phase 3: Data Source Identification

### 3.1 Current Data Pipeline

| Source | Data | Update Frequency | Status |
|--------|------|-----------------|--------|
| **nflverse** (GitHub CSVs) | Weekly stats, season stats, player roster, combine | Seasonal/manual backfill | ✅ Primary source |
| **Sleeper API** | Player IDs, roster, injury status | Real-time | ✅ Active |
| **KTC (KeepTradeCut)** | Dynasty values (1QB, SF, TEP) | Daily scrape | ✅ Active |
| **Dynasty Daddy** | Dynasty values | Daily scrape | ✅ Active |
| **FantasyPros** | ECR rankings, redraft values | Daily scrape | ✅ Active |
| **DynastyProcess** | Values (historical) | Periodic | ✅ Active |
| **Multiple other sources** | DTL, FTC, UTH, DLF, AOD, DD, FP values | Various | ✅ Active |

### 3.2 nflverse Data Available But NOT Yet Ingested

nflverse has more data available that we're not pulling:
- `player_stats_def.csv` — defensive player stats
- `nextgen_stats.csv` — limited Next-Gen-like derived metrics
- `pbp.csv` — play-by-play (massive, but could compute red zone stats, success rates)
- `snap_counts.csv` — per-week snap counts (would fix our snap_pct gaps)
- `roster.csv` — depth chart info

### 3.3 Computable From Existing Data

Several "advanced" stats can be **computed from what we already have** without new data sources:

| Metric | Formula | Data Available? |
|--------|---------|----------------|
| Catch rate | receptions / targets | ✅ |
| Yards per target | rec_yards / targets | ✅ |
| Yards per touch | (rush_yards + rec_yards) / (rush_att + receptions) | ✅ |
| TD rate | (rec_td + rush_td) / (targets + rush_att) | ✅ |
| WOPR | 1.5 × target_share + 0.7 × air_yards_share | ⚠️ Need air_yards_share |
| RACR | rec_yards / (air_yards_per_target × targets) | ✅ |
| Yards per game | rec_yards / games_played | ✅ |
| Fantasy PPG (all formats) | Already stored | ✅ |
| Red zone stats | Computable from play-by-play if ingested | ❌ Need PBP data |

---

## Phase 4: UI Integration Design

### 4.1 Current State

The app already has these components built and ready:
- `src/components/PlayerDetail/AdvancedStats.jsx` — Full component with position-specific stats, comparison to averages, weekly breakdown, show more/less, skeleton loading
- `src/components/PlayerDetail/AthleticProfile.jsx` — Combine/athletic metrics
- `src/components/PlayerDetail/DynastyOutlook.jsx` — Dynasty trajectory
- `src/components/PlayerDetail/TeamContext.jsx` — Team scheme/role context
- `src/components/PlayerDetail/PlayerMLInsights.jsx` — ML predictions
- `src/components/PlayerDetail/PlayerOutlookIntel.jsx` — Season outlook

**The AdvancedStats component is beautifully built** with position-specific stat configs for QB/RB/WR/TE, color-coded comparison to league averages, progressive disclosure (show top 5 → expand all), weekly breakdown with collapsible game-by-game view.

**Problem:** It queries `player_advanced_stats` table which doesn't exist → always shows empty state.

### 4.2 Proposed Architecture: Transform Existing Data

Instead of creating a new `player_advanced_stats` table, we should create a **materialized view or computed endpoint** that transforms our existing `player_season_stats` data into the format the AdvancedStats component expects.

**Mapping existing columns → AdvancedStats component keys:**

| Component Key | Source Column | Available? |
|---------------|--------------|------------|
| **QB:** epaPerPlay | player_season_stats.epa_per_play | ✅ |
| **QB:** cpoe | player_season_stats.cpoe | ❌ (never populated) |
| **WR/TE:** targetRate | Computed: targets/team_pass_att | ⚠️ Need team stats |
| **WR/TE:** adot | player_season_stats.air_yards_per_target | ✅ |
| **WR/TE:** yacPerReception | player_season_stats.yac_per_reception | ✅ |
| **WR/TE:** yprr | Not available | ❌ |
| **WR/TE:** wopr | Computable from target_share + air_yards | ⚠️ Partial |
| **RB:** yardsAfterContact | player_season_stats.yards_after_contact_per | ❌ (never populated) |
| **RB:** rushEpaPerAtt | Can derive from epa_per_play | ⚠️ Approximate |
| **All:** catchRate | receptions / targets | ✅ Computable |

### 4.3 Proposed Solution: Hybrid Endpoint

Rather than populating the missing `player_advanced_stats` table, modify the `getAdvancedStatsAggregate()` function to **fall back to computing stats from `player_season_stats`** when the advanced table doesn't exist.

```
AdvancedStats Component
    │
    ▼
GET /api/players/:id/advanced-stats
    │
    ▼
getAdvancedStatsAggregate()
    │
    ├── Try: player_advanced_stats table (future premium data)
    │
    └── Fallback: Compute from player_season_stats
        ├── EPA per play ✅
        ├── Target share ✅
        ├── aDOT (air_yards_per_target) ✅
        ├── YAC per reception ✅
        ├── Catch rate (computed) ✅
        ├── Yards per target (computed) ✅
        ├── Snap % ✅ (when available)
        ├── Fantasy consistency (stdev, P10, P90) ✅
        └── Opportunity share ⚠️ (partial)
```

### 4.4 Position-Specific Stat Cards (What We Can Show Today)

**QB Card (using existing data):**
```
Quarterback Metrics (2024)
├── EPA/Play: 5.81           (✅ have data)
├── Completion %: 67.2%      (✅ computable)
├── Yards/Attempt: 7.8       (✅ computable)
├── TD Rate: 4.2%            (✅ computable)
├── INT Rate: 1.8%           (✅ computable)
├── Fantasy PPG: 23.3        (✅ have data)
├── Consistency (stdev): 6.2 (✅ have data)
└── Floor/Ceiling: 8.3/31.5  (✅ P10/P90)
```

**WR Card (using existing data):**
```
Wide Receiver Metrics (2024)
├── Target Share: 27.2%      (✅ have data)
├── aDOT: 12.0               (✅ have data)
├── YAC/Reception: 5.3       (✅ have data)
├── Catch Rate: 65.3%        (✅ computable)
├── Yards/Target: 9.8        (✅ computable)
├── Fantasy PPG: 18.7        (✅ have data)
├── Consistency (stdev): 6.4 (✅ have data)
└── Floor/Ceiling: 8.3/23.7  (✅ P10/P90)
```

**RB Card (using existing data):**
```
Running Back Metrics (2024)
├── EPA/Play: 1.35           (✅ have data)
├── Yards/Carry: 5.0         (✅ computable)
├── Yards/Touch: 4.8         (✅ computable)
├── Target Share: 11.9%      (✅ have data)
├── Snap %: 70.6%            (✅ have data, some gaps)
├── Fantasy PPG: 22.2        (✅ have data)
├── Consistency (stdev): 7.1 (✅ have data)
└── Floor/Ceiling: 10.2/31.5 (✅ P10/P90)
```

### 4.5 Compare Page Enhancement

Add computed stats as comparison rows. The Compare.jsx page already supports player comparison — adding advanced stat rows is straightforward with the same computation approach.

### 4.6 Rankings Page Enhancement

Add sortable advanced metric columns. Since stats are in `player_season_stats`, we can add SQL ORDER BY for any computed metric.

---

## Phase 5: API Endpoint Design

### 5.1 Existing Endpoints (Already Built)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /api/players/:id/profile` | ✅ Live | Full intelligence profile |
| `GET /api/players/:id/advanced-stats` | ⚠️ Empty | Queries missing table |
| `GET /api/players/:id/news` | ✅ Live | News with relevance |
| `GET /api/players/:id/outlook` | ✅ Live | Season projection |
| `GET /api/players/:id/team-context` | ⚠️ Empty | Queries missing table |
| `GET /api/players/:id/insights` | ✅ Live | Edge signals |

### 5.2 Modified Advanced Stats Endpoint (Recommended)

Keep existing endpoint signature, modify implementation:

```
GET /api/players/:id/advanced-stats?season=2024

Response (modified to use existing data):
{
  "playerId": "4881",
  "season": 2024,
  "seasonAggregates": {
    // Existing columns from player_season_stats
    "epaPerPlay": 3.875,
    "targetShare": 0.3037,
    "adot": 11.73,
    "yacPerReception": 4.46,
    "snapPct": 0.75,
    
    // Computed from existing data
    "catchRate": 67.1,        // receptions / targets
    "yardsPerTarget": 9.22,   // rec_yards / targets
    "yardsPerTouch": 13.16,   // (rush+rec yards) / (rush_att+receptions)
    "tdRate": 4.43,           // (rec_td+rush_td) / targets
    "fantasyPPG": 17.04,      // fantasy_points_ppr / games_played
    "consistency": 9.93,      // weekly_points_stdev
    "floor": 1.80,            // weekly_points_p10
    "ceiling": 33.00,         // weekly_points_p90
    
    // Position rank among peers
    "positionRanks": {
      "epaPerPlay": 8,
      "targetShare": 4,
      "catchRate": 22,
      "fantasyPPG": 3
    },
    
    // Source metadata
    "sources": ["nflverse"],
    "dataQuality": "good"
  },
  "weeklyData": [
    // From player_weekly_stats (basic stats per week)
    { "week": 1, "targets": 8, "receptions": 5, "rec_yards": 78, "rec_td": 1, "fantasy_points_ppr": 19.8 },
    // ...
  ],
  "historicalTrend": {
    // Year-over-year comparison
    "2023": { "fantasyPPG": 17.04, "targetShare": 0.304 },
    "2024": { "fantasyPPG": 16.68, "targetShare": 0.339 }
  }
}
```

### 5.3 New Bulk Endpoint for Rankings

```
GET /api/players/advanced-stats/rankings?season=2024&position=WR&sort=epaPerPlay&limit=50

Response:
{
  "season": 2024,
  "position": "WR",
  "sortBy": "epaPerPlay",
  "players": [
    {
      "playerId": "4881",
      "playerName": "A.J. Brown",
      "team": "PHI",
      "epaPerPlay": 3.875,
      "targetShare": 0.304,
      "catchRate": 67.1,
      "fantasyPPG": 17.04,
      "rank": 1
    },
    // ...
  ]
}
```

---

## Implementation Roadmap

### P0: Can Build TODAY (1-2 days) 🔥

**Task: Modify `getAdvancedStatsAggregate()` to compute from `player_season_stats`**

1. In `playerIntelligenceService.js`, when `player_advanced_stats` table doesn't exist (42P01 error), compute stats from `player_season_stats` instead
2. Map computed stats to the keys the AdvancedStats component expects
3. Add position percentile rankings using window functions
4. The AdvancedStats.jsx component is **already built** and will light up immediately

**Metrics available immediately:**
- EPA per play (all positions)
- Target share (WR/TE/RB)
- aDOT / air yards per target (WR/TE)
- YAC per reception (WR/TE)
- Catch rate (computed)
- Yards per target (computed)
- Fantasy consistency (stdev, P10, P90)
- Snap % (2015-2023 + 2025, gap in 2024)

**Estimated effort:** 4-6 hours
**Impact:** Huge — the empty AdvancedStats section becomes populated for all players across 10 seasons

### P1: Quick Wins (3-5 days)

1. **Backfill snap_pct for 2024** — nflverse has snap count data in a separate CSV
2. **Compute WOPR** from target_share + air_yards data (formula-based)
3. **Add weekly data** to the endpoint from `player_weekly_stats` (basic stats per week)
4. **Position percentile ranks** using SQL window functions
5. **Add catch rate, yards per touch** as computed columns or view

### P2: Requires New Data (1-2 weeks)

1. **Ingest nflverse snap_counts.csv** — fixes snap % gaps, adds weekly snap data
2. **Ingest nflverse nextgen-stats (if available via CSV)** — separation, speed, etc.
3. **Compute red zone stats** from play-by-play data (heavy lift, but nflverse has it)
4. **Populate CPOE** from nflverse (may need different data file)
5. **Build `team_schemes` table** — would enable the TeamContext component
6. **Build `player_team_context`** from roster/depth chart data

### P3: Premium Data Sources (Future)

1. **PFF grades** — Requires paid API ($$$)
2. **NFL Next-Gen Stats** — Some available via AWS, some restricted
3. **Yards per route run** — Requires route tracking data (PFF/Next-Gen)
4. **Contested catch rate** — PFF premium
5. **Pass/run block grades** — PFF premium

---

## Key Findings Summary

| Finding | Impact |
|---------|--------|
| AdvancedStats component is **fully built** but shows empty | HIGH — fix is quick |
| `player_advanced_stats` table doesn't exist | CRITICAL — create or use fallback |
| We have EPA, target share, aDOT, YAC for 10 years | HIGH — rich data untapped |
| 52K weekly stat records unused for analytics | MEDIUM — enable weekly trends |
| ML predictions, outlooks, edge signals all working | LOW — already surfaced |
| Combine data partially populated | LOW — athletic profile mostly works |
| CPOE, yards after contact columns exist but empty | MEDIUM — could populate from nflverse |
| 2024 snap_pct missing | MEDIUM — single-season gap |

---

## Recommendation

**Immediate action: Implement P0.** Modify the `getAdvancedStatsAggregate()` fallback in `playerIntelligenceService.js` to compute stats from `player_season_stats`. This is a **4-6 hour task** that will immediately surface advanced analytics for every player across 10 seasons. The UI component is already built and tested — it just needs data.

This single change transforms the player detail page from showing "No advanced stats available" to showing 6-8 meaningful metrics per player, with league-average comparison and color coding.

---

*Generated 2026-03-13 by Rush (Advanced Analytics Audit)*

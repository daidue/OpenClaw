# Draft Capital System — Master Architecture

**Date:** 2026-03-14
**Author:** Jeff (Orchestrated by 5 expert domains)
**Status:** ARCHITECTURE COMPLETE — Ready for implementation

---

## Executive Summary

The Draft Capital system transforms TitleRun's pick display from static round/points/timing cards into an intelligent draft portfolio manager that shows users **which actual players they're likely to draft at each pick position**. By syncing real draft pick ownership from Sleeper's API (`/league/:id/traded_picks` + roster-based rank projection), combining it with the existing Pick Value Engine v2's per-slot granularity, and layering in a rookie prospect projection engine fed by ADP data from FantasyCalc/DynastyProcess/KTC, each pick card becomes a window into "who am I getting here?" — the single most valuable question in dynasty offseason.

This is a 4-phase build. **Phase 1 (Sleeper pick sync + ownership display)** is the MVP and delivers immediate value by replacing manually-entered pick data with real league data. **Phase 2 (Rookie prospect database)** adds the player catalog. **Phase 3 (Projection engine)** connects picks to projected players. **Phase 4 (Advanced UI — trade scenarios, positional filters, "what if I trade up")** creates the premium experience that differentiates TitleRun from every competitor. No one else maps per-slot projected players to actual owned picks with league-format-aware adjustments.

---

## Requirements

1. **Pull actual draft capital from Sleeper leagues** — real picks users own, not manual entry
2. **Backend projects which players will be available at each pick** — ADP-driven prospect mapping
3. **Based on most recent year's data** — 2026 rookie class now, with rolling updates
4. **3-year rolling window** — 2026-2028 now, add 2029 after 2026 season ends
5. **Enhance existing pick cards** — currently show round/points/timing, add player projections

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DRAFT CAPITAL SYSTEM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │  SLEEPER API  │───▶│  PICK SYNC   │───▶│  PICK OWNERSHIP DB   │  │
│  │  (External)   │    │  SERVICE     │    │  (who owns what)     │  │
│  └──────────────┘    └──────────────┘    └──────────┬───────────┘  │
│                                                      │              │
│  ┌──────────────┐    ┌──────────────┐               │              │
│  │  ADP SOURCES  │───▶│  ROOKIE DB   │               │              │
│  │  FC/DP/KTC   │    │  SERVICE     │               │              │
│  └──────────────┘    └──────┬───────┘               │              │
│                              │                       │              │
│                     ┌────────▼───────────────────────▼──────────┐  │
│                     │        PROJECTION ENGINE                   │  │
│                     │  pick_slot + league_format + class_data    │  │
│                     │  → projected_players[]                     │  │
│                     └────────────────────┬──────────────────────┘  │
│                                          │                         │
│  ┌──────────────────┐    ┌───────────────▼──────────────────────┐  │
│  │  PICK VALUE       │───▶│  DRAFT CAPITAL API                   │  │
│  │  ENGINE v2        │    │  GET /api/draft-capital/:leagueId    │  │
│  │  (existing)       │    │  → picks + values + projections      │  │
│  └──────────────────┘    └───────────────┬──────────────────────┘  │
│                                          │                         │
│                              ┌───────────▼──────────────────────┐  │
│                              │  FRONTEND                         │  │
│                              │  DraftCapitalView                 │  │
│                              │  ├── PickCard (enhanced)          │  │
│                              │  ├── ProspectList                 │  │
│                              │  ├── PositionFilter               │  │
│                              │  └── TradeScenarioPanel           │  │
│                              └──────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Designs

### 1. Data Model

#### Core Tables

```sql
-- ═══════════════════════════════════════════
-- PICK OWNERSHIP (synced from Sleeper)
-- ═══════════════════════════════════════════

CREATE TABLE league_draft_picks (
  id              SERIAL PRIMARY KEY,
  league_id       VARCHAR(20) NOT NULL,        -- Sleeper league ID
  season          SMALLINT NOT NULL,            -- 2026, 2027, 2028
  round           SMALLINT NOT NULL,            -- 1, 2, 3, 4
  original_roster_id  SMALLINT NOT NULL,        -- Sleeper roster_id of original owner
  current_owner_id    SMALLINT NOT NULL,        -- Sleeper roster_id of current owner
  previous_owner_id   SMALLINT,                 -- For trade tracking
  pick_slot       SMALLINT,                     -- Projected slot (1-12) based on standings
  pick_timing     VARCHAR(10),                  -- 'early', 'mid', 'late' (derived from slot)
  is_traded       BOOLEAN DEFAULT FALSE,
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (league_id, season, round, original_roster_id)
);

CREATE INDEX idx_ldp_league_owner ON league_draft_picks(league_id, current_owner_id);
CREATE INDEX idx_ldp_league_season ON league_draft_picks(league_id, season);

-- ═══════════════════════════════════════════
-- ROOKIE PROSPECTS (scraped from ADP sources)
-- ═══════════════════════════════════════════

CREATE TABLE rookie_prospects (
  id              SERIAL PRIMARY KEY,
  player_id       VARCHAR(20),                  -- Sleeper player ID (null pre-NFL draft)
  name            VARCHAR(100) NOT NULL,
  position        VARCHAR(5) NOT NULL,          -- QB, RB, WR, TE
  college         VARCHAR(100),
  draft_class     SMALLINT NOT NULL,            -- 2026, 2027, 2028
  
  -- NFL Draft info (populated post-NFL draft)
  nfl_draft_round     SMALLINT,
  nfl_draft_pick      SMALLINT,
  nfl_team            VARCHAR(5),
  
  -- Headshot/image
  image_url       TEXT,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rp_class ON rookie_prospects(draft_class);
CREATE INDEX idx_rp_position ON rookie_prospects(position);

-- ═══════════════════════════════════════════
-- ADP DATA (consensus from multiple sources)
-- ═══════════════════════════════════════════

CREATE TABLE rookie_adp (
  id              SERIAL PRIMARY KEY,
  prospect_id     INTEGER REFERENCES rookie_prospects(id),
  source          VARCHAR(30) NOT NULL,         -- 'fantasycalc', 'dynastyprocess', 'ktc', 'consensus'
  format          VARCHAR(5) NOT NULL,          -- 'sf', '1qb'
  adp_rank        DECIMAL(5,2) NOT NULL,        -- e.g., 1.03 = 3rd pick, 2.05 = 17th pick
  adp_slot        SMALLINT NOT NULL,            -- Linear slot: 1, 2, 3...24
  adp_high        SMALLINT,                     -- Best-case slot (e.g., pick 1)
  adp_low         SMALLINT,                     -- Worst-case slot (e.g., pick 8)
  recorded_date   DATE NOT NULL,
  
  UNIQUE (prospect_id, source, format, recorded_date)
);

CREATE INDEX idx_adp_prospect ON rookie_adp(prospect_id, format);
CREATE INDEX idx_adp_date ON rookie_adp(recorded_date DESC);

-- ═══════════════════════════════════════════
-- PICK-TO-PROSPECT PROJECTIONS (computed)
-- ═══════════════════════════════════════════

CREATE TABLE pick_projections (
  id              SERIAL PRIMARY KEY,
  draft_class     SMALLINT NOT NULL,            -- 2026, 2027
  pick_slot       SMALLINT NOT NULL,            -- 1-48 (4 rounds × 12 teams)
  format          VARCHAR(5) NOT NULL,          -- 'sf', '1qb'
  prospect_id     INTEGER REFERENCES rookie_prospects(id),
  probability     DECIMAL(4,3) NOT NULL,        -- 0.000 - 1.000
  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (draft_class, pick_slot, format, prospect_id)
);

CREATE INDEX idx_pp_slot ON pick_projections(draft_class, pick_slot, format);

-- ═══════════════════════════════════════════
-- LEAGUE ROSTER MAP (Sleeper roster_id → user)
-- ═══════════════════════════════════════════

CREATE TABLE league_roster_map (
  league_id       VARCHAR(20) NOT NULL,
  roster_id       SMALLINT NOT NULL,
  user_id         VARCHAR(20) NOT NULL,         -- Sleeper user_id
  display_name    VARCHAR(100),
  team_name       VARCHAR(100),
  wins            SMALLINT DEFAULT 0,
  losses          SMALLINT DEFAULT 0,
  fpts            DECIMAL(8,2) DEFAULT 0,       -- For projected standings
  last_synced_at  TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (league_id, roster_id)
);
```

#### Entity Relationships

```
league_roster_map 1──────M league_draft_picks
                          │
                          │ (pick_slot + format)
                          ▼
                    pick_projections M──────1 rookie_prospects
                                                    │
                                                    │
                                              rookie_adp (history)
```

#### Data Source Plan

| Data | Source | Refresh Cadence | Notes |
|------|--------|----------------|-------|
| Pick ownership | Sleeper `/league/:id/traded_picks` + `/league/:id/rosters` | On page load, 30-min cache | Free, no auth |
| Roster standings | Sleeper `/league/:id/rosters` (fpts, wins) | On page load, 30-min cache | For pick slot projection |
| League settings | Sleeper `/league/:id` (roster_positions for SF detection) | On first load, 24h cache | Detects SF/1QB/TEP |
| Rookie prospects | Manual seed + FantasyCalc API | Weekly during offseason | ~50-80 prospects per class |
| ADP data | FantasyCalc API + DynastyProcess CSV | Daily during draft season, weekly otherwise | Primary: FantasyCalc (has API) |
| KTC values | KTC scraping (existing infrastructure) | Daily | Already scraped for player values |
| NFL draft results | Manual + Sleeper players API | Once per year (April) | Landing spots critical for value |

---

### 2. Sleeper API Integration

#### Endpoint Map

| Endpoint | Data Retrieved | When Called | Cache TTL |
|----------|---------------|-------------|-----------|
| `GET /v1/user/:username` | `user_id` | Onboarding (once) | Permanent |
| `GET /v1/user/:userId/leagues/nfl/2026` | All user leagues | Dashboard load | 1 hour |
| `GET /v1/league/:leagueId` | League settings (SF detection via `roster_positions`) | First load per league | 24 hours |
| `GET /v1/league/:leagueId/rosters` | All rosters (players, wins, fpts, owner_id) | Draft Capital page load | 30 min |
| `GET /v1/league/:leagueId/users` | User display names, team names | First load per league | 24 hours |
| `GET /v1/league/:leagueId/traded_picks` | **All traded picks** (season, round, roster_id, owner_id) | Draft Capital page load | 30 min |
| `GET /v1/league/:leagueId/drafts` | Draft metadata (type, status, rounds) | Draft Capital page load | 1 hour |
| `GET /v1/state/nfl` | Current season, week | App startup | 6 hours |

#### Pick Ownership Resolution Algorithm

```javascript
/**
 * Resolve who owns every pick in a league for seasons 2026-2028.
 * 
 * Sleeper's /traded_picks only returns picks that HAVE been traded.
 * All other picks are still owned by their original roster.
 * 
 * Algorithm:
 * 1. Get league rosters → extract all roster_ids
 * 2. Get traded_picks → build traded pick map
 * 3. For each (season, round, roster_id):
 *    - If in traded_picks → owner = traded_picks.owner_id
 *    - Else → owner = roster_id (original owner)
 * 4. Get roster standings (wins, fpts) → project pick slots
 */
async function resolvePickOwnership(leagueId) {
  const [rosters, tradedPicks, leagueInfo] = await Promise.all([
    sleeperApi.getLeagueRosters(leagueId),
    sleeperApi.getTradedPicks(leagueId),
    sleeperApi.getLeague(leagueId),
  ]);
  
  const leagueSize = leagueInfo.total_rosters;  // 10, 12, 14
  const draftRounds = leagueInfo.settings?.draft_rounds || 4;
  const currentSeason = 2026;  // from /state/nfl
  const windowEnd = currentSeason + 2;  // 3-year window
  
  // Build traded picks index: key = `${season}_${round}_${roster_id}`
  const tradedIndex = new Map();
  for (const tp of tradedPicks) {
    const key = `${tp.season}_${tp.round}_${tp.roster_id}`;
    tradedIndex.set(key, tp.owner_id);
  }
  
  // Project pick slots from standings
  const standings = projectStandings(rosters);  // sorted worst→best
  // standings[0] = worst team = pick 1.01
  // standings[11] = best team = pick 1.12
  
  const allPicks = [];
  
  for (let season = currentSeason; season <= windowEnd; season++) {
    for (let round = 1; round <= draftRounds; round++) {
      for (const roster of rosters) {
        const key = `${season}_${round}_${roster.roster_id}`;
        const currentOwner = tradedIndex.get(key) || roster.roster_id;
        
        // Determine pick slot from standings
        const standingIndex = standings.findIndex(
          s => s.roster_id === roster.roster_id
        );
        const pickSlot = standingIndex + 1;  // 1-based
        const timing = pickSlot <= Math.ceil(leagueSize / 3) ? 'early'
          : pickSlot <= Math.ceil(2 * leagueSize / 3) ? 'mid' : 'late';
        
        allPicks.push({
          league_id: leagueId,
          season,
          round,
          original_roster_id: roster.roster_id,
          current_owner_id: currentOwner,
          pick_slot: pickSlot,
          pick_timing: timing,
          is_traded: currentOwner !== roster.roster_id,
        });
      }
    }
  }
  
  return allPicks;
}

/**
 * Project standings for future pick slot estimation.
 * 
 * Current year: Use actual standings (wins, then fpts tiebreaker)
 * Future years: Use Power Rankings (total roster value) as proxy
 * Unknown years (2028+): Default to "mid" for all picks
 */
function projectStandings(rosters) {
  return [...rosters].sort((a, b) => {
    // Sort ascending (worst team first = highest pick)
    const winsA = a.settings?.wins || 0;
    const winsB = b.settings?.wins || 0;
    if (winsA !== winsB) return winsA - winsB;
    
    const fptsA = (a.settings?.fpts || 0) + (a.settings?.fpts_decimal || 0) / 100;
    const fptsB = (b.settings?.fpts || 0) + (b.settings?.fpts_decimal || 0) / 100;
    return fptsA - fptsB;
  });
}
```

#### Edge Cases

| Scenario | Detection | Handling |
|----------|-----------|---------|
| League hasn't drafted yet | `league.status === 'pre_draft'` | All picks available; show full draft capital |
| Mid-draft | `league.status === 'drafting'` | Some picks consumed; show remaining + "Draft in progress" banner |
| Post-draft (picks consumed) | Draft status `complete` for that season | Hide consumed year, show future years only |
| Offseason (current state) | `state.season_type === 'off'` | Normal mode — all future picks shown |
| New league (no previous season) | No standings data | All future picks default to "mid" timing |
| League size change year-to-year | `previous_league_id` chain | Follow league chain, use most recent size |
| Conditional picks | Not in Sleeper API | Out of scope — note in UI ("conditional picks not tracked") |
| Pick swaps | Not in Sleeper API | Out of scope |

#### Sync Strategy

```
Page Load Flow:
1. Check cache (Redis/in-memory) for league pick data
2. If cache miss OR stale (>30 min):
   a. Fetch rosters, traded_picks, league in parallel (3 API calls)
   b. Resolve pick ownership
   c. Store in DB + cache
   d. Return to frontend
3. If cache hit:
   a. Return cached data immediately
   b. Background refresh if >15 min old (stale-while-revalidate)
```

#### Rate Limiting

Sleeper allows 1000 calls/minute. TitleRun's Draft Capital page needs 3-4 calls per league load:
- At 10,000 users × 3 leagues each × 4 calls = 120,000 calls
- Spread over a day = ~83 calls/minute → **well within limits**
- Cache ensures repeat visits don't re-fetch
- Add exponential backoff on 429s

---

### 3. Projection Engine

#### Algorithm Design

The projection engine answers: **"At pick slot X in format Y for class Z, which prospects are most likely available?"**

```javascript
/**
 * Core projection: For a given pick slot, return ranked list of 
 * prospects likely available, with probability estimates.
 * 
 * Method: Monte Carlo simulation of draft outcomes based on ADP distributions.
 * 
 * Simplified version (MVP): Direct ADP mapping with overlap ranges.
 */
function projectProspectsAtSlot(pickSlot, format, draftClass) {
  // 1. Get all prospects for this class with ADP data
  const prospects = getConsensusADP(draftClass, format);
  
  // 2. For each prospect, calculate P(available at this slot)
  //    P(available) = P(not picked in slots 1 through pickSlot-1)
  //    Approximation: Use ADP distribution curve
  
  const projections = [];
  
  for (const prospect of prospects) {
    const adp = prospect.consensus_adp;  // e.g., 3.5 (3rd-4th pick)
    const spread = prospect.adp_spread;  // e.g., 2.0 (ranges from pick 1.5 to 5.5)
    
    // Normal distribution: P(available at slot) ≈ P(ADP >= slot)
    // Using simplified logistic curve
    const zScore = (pickSlot - adp) / (spread * 0.6);
    const pAvailable = 1 / (1 + Math.exp(zScore * 2));
    
    // P(picked here) = P(available) × P(this is the pick)
    // Simplified: if available, probability they're the pick depends on
    // how many other prospects are also available and ranked higher
    const pPickedHere = pAvailable * getSelectionProbability(prospect, pickSlot, prospects);
    
    if (pPickedHere > 0.02) {  // >2% chance threshold
      projections.push({
        prospect_id: prospect.id,
        name: prospect.name,
        position: prospect.position,
        college: prospect.college,
        probability: pPickedHere,
        adp_range: `${prospect.adp_high}-${prospect.adp_low}`,
        titlerun_value: prospect.projected_value,
      });
    }
  }
  
  // Sort by probability descending, return top 5
  return projections
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
}

/**
 * Consensus ADP calculation from multiple sources.
 * Weighted average: FantasyCalc 40%, DynastyProcess 30%, KTC 30%
 */
function getConsensusADP(draftClass, format) {
  const sources = getRawADPByClass(draftClass, format);
  
  return sources.map(prospect => {
    const weights = { fantasycalc: 0.40, dynastyprocess: 0.30, ktc: 0.30 };
    let weightedSum = 0, totalWeight = 0;
    
    for (const [source, weight] of Object.entries(weights)) {
      if (prospect.adp[source]) {
        weightedSum += prospect.adp[source] * weight;
        totalWeight += weight;
      }
    }
    
    return {
      ...prospect,
      consensus_adp: weightedSum / totalWeight,
      adp_spread: Math.max(...Object.values(prospect.adp)) - 
                  Math.min(...Object.values(prospect.adp)) + 1,
    };
  });
}
```

#### Data Sources for ADP

| Source | API/Method | Data Quality | Refresh Rate |
|--------|-----------|-------------|-------------|
| **FantasyCalc** | REST API (https://api.fantasycalc.com) | Excellent — crowd-sourced trades | Daily |
| **DynastyProcess** | GitHub CSV (https://github.com/dynastyprocess/data) | Good — community consensus | Weekly |
| **KTC (KeepTradeCut)** | Web scraping (existing infrastructure) | Excellent — largest dataset | Daily |
| **Sleeper ADP** | Sleeper draft results (historical) | Good — actual draft data | Post-draft |
| **FantasyPros** | Web scraping / expert consensus | Good — expert rankings | Weekly |

**Primary source for MVP:** FantasyCalc API — it has the best programmatic access and includes rookie-specific ADP rankings. KTC is already being scraped by TitleRun for player values.

#### Format-Specific Adjustments

```javascript
const FORMAT_ADP_ADJUSTMENTS = {
  sf: {
    // In SF, QBs go 2-5 picks earlier than 1QB
    QB: { adp_shift: -3, premium_slots: [1, 2, 3, 4, 5] },
    RB: { adp_shift: 0 },
    WR: { adp_shift: 0 },
    TE: { adp_shift: 0 },
  },
  '1qb': {
    // In 1QB, QBs drop 5-10 picks vs SF
    QB: { adp_shift: +5, premium_slots: [] },
    RB: { adp_shift: -1 },  // RBs rise slightly
    WR: { adp_shift: 0 },
    TE: { adp_shift: 0 },
  },
  tep: {
    // TEP boosts elite TEs by 2-3 picks
    QB: { adp_shift: 0 },
    RB: { adp_shift: 0 },
    WR: { adp_shift: 0 },
    TE: { adp_shift: -2 },  // Sadiq moves up in TEP
  },
};
```

#### Accuracy Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Top-3 prospect at pick | 80%+ hit rate | Did one of our top-3 actually go at/near that pick? |
| ADP drift | ±2 picks on average | Actual draft slot vs projected ADP |
| Position distribution | Within 10% | Predicted 40% RB at slot → actual was 30-50% |

#### Class-Specific Data (2026 Pre-Seed)

Based on existing research in `pick-valuation-v2-design.md`:

```javascript
const ROOKIE_CLASS_2026_SF = [
  { rank: 1, name: 'Jeremiah Love', position: 'RB', college: 'Notre Dame', adp: 1.0, range: [1, 2] },
  { rank: 2, name: 'Fernando Mendoza', position: 'QB', college: 'California', adp: 2.0, range: [1, 3] },
  { rank: 3, name: 'Carnell Tate', position: 'WR', college: 'Ohio State', adp: 3.5, range: [3, 6] },
  { rank: 4, name: 'Makai Lemon', position: 'WR', college: 'USC', adp: 4.0, range: [3, 6] },
  { rank: 5, name: 'Jordyn Tyson', position: 'WR', college: 'Arizona State', adp: 5.0, range: [3, 7] },
  { rank: 6, name: 'Denzel Boston', position: 'WR', college: 'Washington', adp: 5.5, range: [4, 8] },
  { rank: 7, name: 'K.C. Concepcion', position: 'WR', college: 'NC State', adp: 7.0, range: [5, 9] },
  { rank: 8, name: 'Kenyon Sadiq', position: 'TE', college: 'Oregon', adp: 8.0, range: [6, 10] },
  // Cliff after pick 8 — weak 2026 class
  { rank: 9, name: 'Emeka Egbuka', position: 'WR', college: 'Ohio State', adp: 9.5, range: [8, 12] },
  { rank: 10, name: 'Jaylin Noel', position: 'WR', college: 'Iowa State', adp: 10.0, range: [8, 12] },
  { rank: 11, name: 'Trey Benson', position: 'RB', college: 'FSU', adp: 11.0, range: [9, 14] },
  { rank: 12, name: 'Cameron Skattebo', position: 'RB', college: 'Arizona State', adp: 12.0, range: [10, 15] },
];
```

#### Future Year Handling

| Year | Data Availability | Projection Approach |
|------|-------------------|---------------------|
| 2026 | Full ADP data, NFL Draft complete | Per-slot prospect mapping with high confidence |
| 2027 | Devy rankings only, pre-NFL draft | Top 20 prospects known, wider ADP ranges |
| 2028 | Speculative devy only | Show "Class rated X/10" + position distribution only, no individual names |

For 2028+: Instead of projecting specific players, show:
- "Based on historical data, picks 1-4 are typically: 40% RB, 30% WR, 20% QB, 10% TE"
- "2028 class quality: Unknown (estimated 5/10)"
- Individual prospect mapping only for top-5 devy names with high certainty

---

### 4. UI/UX Design

#### Current State (What Exists)

Pick cards showing:
- Round label (e.g., "Round 1")
- Points value (from Pick Value Engine v2)
- Timing badge ("Early", "Mid", "Late")
- Ownership note ("Your original pick" / "Traded from TeamX")
- Grouped by year (2026, 2027, 2028)
- Total points per year

#### Enhanced Pick Card Design

```
┌─────────────────────────────────────────────────────────┐
│  2026 Round 1  •  Pick 1.05                    ⚡ 5,100 │
│  ─────────────────────────────────────────────────────  │
│  📊 Mid  •  Traded from Team Alpha                      │
│                                                         │
│  ┌─── PROJECTED PLAYERS ──────────────────────────────┐ │
│  │                                                     │ │
│  │  🟢 65% Jordyn Tyson  WR • Arizona State           │ │
│  │       ADP: 3-7  •  Value: ~5,100                   │ │
│  │                                                     │ │
│  │  🟡 20% Denzel Boston  WR • Washington             │ │
│  │       ADP: 4-8  •  Value: ~4,800                   │ │
│  │                                                     │ │
│  │  ⚪ 10% Makai Lemon  WR • USC                      │ │
│  │       ADP: 3-6  •  Value: ~5,400                   │ │
│  │                                                     │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │ Position Mix:  WR 70% │ RB 15% │ QB 10% │TE 5%│ │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  [View All Candidates]  [Trade Scenario ↗]              │
└─────────────────────────────────────────────────────────┘
```

#### Component Hierarchy

```
DraftCapitalPage
├── DraftCapitalHeader
│   ├── LeagueSelector (dropdown if multi-league)
│   ├── FormatBadge (SF / 1QB / TEP)
│   └── TotalValueSummary
│
├── YearSection (repeated for 2026, 2027, 2028)
│   ├── YearHeader
│   │   ├── Year label + class quality badge (★★★☆☆)
│   │   ├── Total picks count
│   │   └── Total year value
│   │
│   └── PickCardGrid
│       └── PickCard (repeated per pick)
│           ├── PickHeader (round, slot, value, timing)
│           ├── OwnershipBadge (original / traded)
│           ├── ProspectList (Phase 3)
│           │   └── ProspectRow (name, position, probability, ADP)
│           ├── PositionMixBar (horizontal stacked bar)
│           └── PickCardActions
│               ├── ViewAllCandidates (opens modal)
│               └── TradeScenario (Phase 4)
│
├── PositionFilter (Phase 4)
│   └── "Show RBs at my picks" / "Show QBs" / etc.
│
└── DraftCapitalSummary
    ├── PickCountByRound
    ├── PositionNeedAnalysis (Phase 4)
    └── ShareButton
```

#### Interaction Flows

**Flow 1: Page Load**
1. User navigates to Draft Capital tab
2. Skeleton cards render immediately (existing pick card layout)
3. Background: Fetch Sleeper data (3 parallel calls)
4. Pick cards populate with ownership + slot data
5. Background: Compute projections per pick
6. Prospect lists fade in on each card

**Flow 2: Click "View All Candidates"**
1. Bottom sheet (mobile) / modal (desktop) opens
2. Full prospect list for that pick slot (up to 15 players)
3. Each prospect shows: name, position, college, ADP range, probability, TitleRun value
4. Filter by position within the modal

**Flow 3: Trade Scenario (Phase 4)**
1. User clicks "Trade Scenario" on a pick card
2. Opens trade builder pre-populated with that pick
3. "If you trade for 1.03, you could get: [Carnell Tate, Makai Lemon, ...]"
4. Shows what you give up vs what you gain in expected value

#### Mobile-First Design

- **Cards**: Full-width stack, single column
- **Prospect list on card**: Show top 2 (collapsed), expand to see all
- **Position mix bar**: Always visible (compact, informative)
- **Year sections**: Collapsible accordion (default: current year expanded)
- **Modals**: Bottom sheet pattern (swipe-to-dismiss)
- **Touch targets**: Minimum 44px height for all tappable elements

#### Loading States

| State | UI |
|-------|-----|
| Initial load | Skeleton cards matching current pick card layout |
| Sleeper sync in progress | Cards with spinning icon, "Syncing with Sleeper..." |
| Projections computing | Pick cards shown, prospect area shows shimmer placeholders |
| Error (Sleeper down) | "Couldn't reach Sleeper. Showing cached data from [time]." |
| No picks owned | "You don't own any picks in [year]. Build your draft capital!" with CTA to trade finder |

---

### 5. System Architecture

#### Technology Stack (Existing + Extensions)

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | React + TypeScript + Zustand | Existing |
| API | Express.js | Existing |
| Database | PostgreSQL (Railway) | Existing |
| Cache | In-memory (node-cache) + Redis when scaling | New cache layer |
| Background Jobs | node-cron / Railway cron | New |
| External APIs | Sleeper (free), FantasyCalc, KTC (existing scraper) | Extend existing |

#### API Endpoints (New)

```
# Draft Capital
GET  /api/draft-capital/:leagueId
     → Returns all picks for user in this league (3-year window)
     → Includes pick values, timing, ownership, projected prospects
     
GET  /api/draft-capital/:leagueId/projections/:season/:round/:slot
     → Returns full prospect list for a specific pick
     
POST /api/draft-capital/:leagueId/refresh
     → Force re-sync from Sleeper (rate limited to 1/min)

# Rookie Prospects (internal/admin)
GET  /api/prospects/:draftClass
     → All prospects for a class with ADP data
     
GET  /api/prospects/:draftClass/:format/rankings
     → Consensus rankings by format

# Admin
POST /api/admin/prospects/sync
     → Trigger ADP data refresh from all sources
```

#### Caching Strategy

```
┌─────────────────────────────────────────────────┐
│                CACHE LAYERS                       │
├─────────────────────────────────────────────────┤
│                                                   │
│  L1: In-Memory (node-cache)                       │
│  ├── League settings: 24h TTL                     │
│  ├── Pick ownership per league: 30min TTL         │
│  ├── NFL state: 6h TTL                            │
│  └── Prospect rankings: 24h TTL                   │
│                                                   │
│  L2: PostgreSQL (persistent)                       │
│  ├── league_draft_picks: synced on demand          │
│  ├── rookie_prospects: weekly refresh              │
│  ├── rookie_adp: daily refresh                     │
│  └── pick_projections: recomputed when ADP changes │
│                                                   │
│  L3: Sleeper API (source of truth)                │
│  └── Real-time on cache miss                      │
│                                                   │
│  INVALIDATION:                                    │
│  - User clicks "Refresh": Clear L1 for league     │
│  - ADP data updates: Clear L1 projections          │
│  - Trade detected: Clear L1 for league             │
│  - Season change: Clear all L1                     │
│                                                   │
└─────────────────────────────────────────────────┘
```

#### Background Jobs

| Job | Schedule | Description | Priority |
|-----|----------|-------------|----------|
| `adp-sync` | Daily 4am ET | Fetch latest ADP from FantasyCalc + KTC | HIGH |
| `projection-recompute` | After `adp-sync` completes | Recompute all pick_projections | HIGH |
| `prospect-refresh` | Weekly Sunday 6am ET | Full prospect data refresh (new names, college updates) | MEDIUM |
| `nfl-draft-watch` | April NFL Draft weekend: every 15 min | Sync NFL draft results, update landing spots | CRITICAL |
| `league-cleanup` | Monthly | Remove expired cache entries, archive old seasons | LOW |

#### Performance Budget

| Operation | Target | Approach |
|-----------|--------|----------|
| Draft Capital page load (cold) | <2s | Parallel Sleeper API calls + pre-computed projections |
| Draft Capital page load (warm) | <500ms | L1 cache hit for picks + projections |
| Single pick projection | <100ms | Pre-computed in DB, served from cache |
| ADP sync job | <5min | Batch API calls, bulk DB inserts |
| Projection recompute | <2min | Pre-compute for all slots × formats |

#### Scalability (10,000 concurrent users)

Current TitleRun is pre-launch. Architecture designed for growth:

1. **Sleeper API bottleneck mitigation**: 30-min cache means even 10K users loading Draft Capital = ~600 unique league fetches/hour (assuming 3 leagues average, 30-min cache). At 4 calls per league = 2,400 Sleeper calls/hour = 40/min. Well under 1000/min limit.

2. **Horizontal scaling**: Stateless Express API → can run N instances behind load balancer. PostgreSQL handles shared state.

3. **Projection pre-computation**: Projections are computed per (class, slot, format) — only ~300 unique combinations (3 classes × 48 slots × 2 formats). Cache ALL of them. Refresh on ADP change.

4. **CDN**: Static prospect images cached at CDN edge.

#### Monitoring Plan

| Metric | Alert Threshold | Tool |
|--------|----------------|------|
| Sleeper API success rate | <95% over 5min | Application logs + alert |
| Sleeper API latency (p95) | >2s | Application logs |
| ADP data freshness | >48h stale | Cron job check |
| Cache hit rate (L1) | <60% | Application metrics |
| Draft Capital page load (p95) | >3s | Frontend analytics |
| Projection accuracy (post-draft) | <60% top-3 hit rate | Seasonal retrospective |

---

## Implementation Roadmap

### Phase 1: Sleeper Pick Sync (MVP) — ~12 hours

**Delivers:** Real pick ownership from Sleeper, displayed on existing pick cards

- [ ] Create `league_draft_picks` and `league_roster_map` DB tables
- [ ] Build Sleeper API client (`sleeperApiClient.js`)
  - [ ] `getUser(username)` → user_id
  - [ ] `getLeague(leagueId)` → settings (SF detection)
  - [ ] `getLeagueRosters(leagueId)` → standings + roster_ids
  - [ ] `getTradedPicks(leagueId)` → traded pick ownership
- [ ] Build `pickOwnershipService.js`
  - [ ] `resolvePickOwnership(leagueId)` → all picks with owners
  - [ ] `projectPickSlots(rosters)` → slot assignment from standings
  - [ ] Cache layer (node-cache, 30-min TTL)
- [ ] Build `GET /api/draft-capital/:leagueId` endpoint
- [ ] Frontend: Update existing pick cards to use real Sleeper data
- [ ] Frontend: Add "Syncing with Sleeper..." loading state
- [ ] Tests: Unit tests for ownership resolution + edge cases
- [ ] **Estimated time: 12 hours**

### Phase 2: Rookie Prospect Database — ~8 hours

**Delivers:** Searchable prospect catalog with ADP data

- [ ] Create `rookie_prospects` and `rookie_adp` DB tables
- [ ] Seed 2026 class data (manual from existing research)
- [ ] Build FantasyCalc ADP API integration
- [ ] Build ADP scraping for KTC (extend existing scraper)
- [ ] Build `rookieProspectService.js`
  - [ ] `getProspectsByClass(year, format)` → ranked prospects
  - [ ] `getConsensusADP(prospectId, format)` → weighted ADP
- [ ] Build `adp-sync` cron job (daily)
- [ ] Admin endpoint: `POST /api/admin/prospects/sync`
- [ ] Seed 2027 class (top 20 devy prospects)
- [ ] **Estimated time: 8 hours**

### Phase 3: Projection Engine — ~10 hours

**Delivers:** "Who am I getting at each pick?" projections

- [ ] Create `pick_projections` table
- [ ] Build `projectionEngine.js`
  - [ ] `projectProspectsAtSlot(slot, format, class)` → prospect list
  - [ ] `computeAllProjections(class, format)` → batch compute
  - [ ] Format-specific adjustments (SF/1QB/TEP)
- [ ] Build `projection-recompute` cron job
- [ ] Extend `GET /api/draft-capital/:leagueId` to include projections
- [ ] Frontend: Add ProspectList component to pick cards
- [ ] Frontend: Add PositionMixBar to pick cards
- [ ] Frontend: "View All Candidates" modal/bottom sheet
- [ ] Tests: Projection accuracy validation against historical data
- [ ] **Estimated time: 10 hours**

### Phase 4: Advanced Features — ~15 hours

**Delivers:** Trade scenarios, position filters, premium experience

- [ ] Frontend: Position filter ("Show me RBs at my picks")
- [ ] Frontend: Trade scenario integration (pre-populate trade builder)
- [ ] "If you trade for pick X, you could get..." projections
- [ ] Multi-league aggregate view ("All my picks across 3 leagues")
- [ ] Draft Capital sharing (generate shareable image/link)
- [ ] 2028+ class quality badges (dynamic from market data)
- [ ] Historical ADP accuracy tracking (post-draft retrospective)
- [ ] Push notification: "Pick trade detected in your league!"
- [ ] **Estimated time: 15 hours**

---

## Timeline

| Phase | Hours | With 1 Agent | With 2 Parallel |
|-------|-------|-------------|-----------------|
| Phase 1: Sleeper Pick Sync | 12h | 2 days | 1.5 days |
| Phase 2: Rookie DB | 8h | 1.5 days | 1 day |
| Phase 3: Projection Engine | 10h | 2 days | 1.5 days |
| Phase 4: Advanced Features | 15h | 3 days | 2 days |
| **Total** | **45h** | **~8.5 days** | **~6 days** |

**Recommended approach:** Build Phase 1+2 in parallel (backend DB + Sleeper client can be built alongside prospect seeding). Then Phase 3 depends on both. Phase 4 is independent feature work.

**Critical path:** Phase 1 → Phase 3 (projections need pick ownership to be meaningful)

---

## Risks & Mitigation

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| 1 | Sleeper API rate limiting / IP blocking | LOW | HIGH | 30-min cache, exponential backoff, user-triggered refresh rate-limited to 1/min |
| 2 | ADP data sources change their format/API | MEDIUM | MEDIUM | Multiple sources (FantasyCalc + KTC + DP), graceful degradation to last-known data |
| 3 | Projection accuracy disappoints users | MEDIUM | MEDIUM | Show as "projected" with probability %, not certainty. Transparency builds trust. |
| 4 | 2027/2028 prospect data too thin for useful projections | HIGH for 2028 | LOW | 2027: Use devy rankings (adequate). 2028: Show only class quality + position mix, no names |
| 5 | Sleeper doesn't expose conditional/swap picks | CERTAIN | LOW | Document limitation. 99% of picks are standard. Add disclaimer in UI. |
| 6 | NFL Draft reshuffles all ADP projections overnight | CERTAIN (annual) | HIGH | `nfl-draft-watch` job runs every 15min during draft weekend. Manual curator review within 24h. |
| 7 | Pick slot projection wrong (standings change) | MEDIUM | LOW | Re-project slots on every sync. In-season: use current standings. Offseason: use power rankings. |
| 8 | FantasyCalc API goes down or changes auth | LOW | MEDIUM | Fall back to KTC + DynastyProcess. Multiple source redundancy. |

---

## Success Criteria

- [ ] Users see their real Sleeper picks (not manually entered) with correct ownership
- [ ] Each pick shows 2-5 projected prospects with probability estimates
- [ ] Format-aware (SF picks show QBs higher, 1QB shows QBs lower)
- [ ] 3-year rolling window (2026-2028) displayed correctly
- [ ] Page loads in <2s (warm cache <500ms)
- [ ] ADP data refreshes daily without manual intervention
- [ ] Post-NFL-Draft (April 2026): projections update within 24 hours
- [ ] Users can filter by position ("Show me which RBs I could draft")
- [ ] Trade scenario: "To get Player X, you need pick 1.03 or better"

---

## Competitive Advantage

This system creates **5 differentiators no competitor offers together:**

1. **Real pick ownership** from Sleeper (not manual entry like KTC/DP)
2. **Per-slot prospect mapping** (KTC only shows Early/Mid/Late tiers)
3. **Format-aware projections** (SF/1QB/TEP dynamically shift ADP)
4. **Class quality intelligence** (weak 2026 vs monster 2027, reflected in UI)
5. **Integrated trade scenarios** (see what you'd gain by trading up/down)

The combination of "I own picks 1.05, 2.01, and 3.07 in my Sleeper league → here's exactly who I'm likely to draft at each" is something **no one else does**. It transforms Draft Capital from a value tracking tool into a strategic planning platform.

---

## Next Steps

1. **Taylor approval** — Review architecture, confirm Phase 1 scope is right for MVP
2. **Phase 1 kickoff** — Spawn coding agent for Sleeper API client + pick ownership service
3. **Seed 2026 prospect data** — Manual seed from existing research (pick-valuation-v2-design.md has the data)
4. **FantasyCalc API exploration** — Validate ADP endpoints, test response format
5. **Frontend design** — Mock up enhanced pick cards in existing React component structure

---

*Architecture designed 2026-03-14. Ready for implementation.*

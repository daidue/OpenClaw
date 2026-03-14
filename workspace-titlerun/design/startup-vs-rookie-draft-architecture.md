# Startup vs Rookie Draft — Master Architecture

**Date:** 2026-03-14  
**Author:** Rush (TitleRun Owner/Operator)  
**Status:** ARCHITECTURE COMPLETE — Ready for implementation  

---

## Executive Summary

TitleRun's Draft Capital projection engine currently treats ALL draft picks as rookie draft picks, showing only 2026 rookies (Jeremiah Love, Fernando Mendoza, etc.) regardless of the league's actual draft context. This is fundamentally wrong for **startup drafts**, where all NFL players are available — the 1.01 in a startup is CeeDee Lamb or Ja'Marr Chase, not Jeremiah Love.

The fix requires three interconnected changes: **(1)** a detection layer that determines whether a league's upcoming draft is a startup or rookie draft using Sleeper API signals, **(2)** a dual-mode projection engine that queries the correct player pool (all dynasty players vs. only rookies) based on draft type, and **(3)** frontend updates to show contextually appropriate projections with clear labeling. The solution leverages existing data — `titlerun_values` for startup rankings, `rookie_prospects` + `rookie_adp` for rookie rankings — requiring no new scraping infrastructure.

## Problem Statement

**Current State:** Phase 3 projection engine maps pick slots to projected players using ONLY the `rookie_prospects` table. Every pick card shows 2026 rookie projections (e.g., Pick 1.01 → Jeremiah Love 65%, Fernando Mendoza 20%).

**Why it's wrong:** A user who just created a brand new Sleeper dynasty league is doing a **startup draft** — all 400+ NFL players are available. Their 1.01 pick projects to be CeeDee Lamb (~9,000 value), not Jeremiah Love (~6,000 value). Showing rookie-only projections for startup drafts is:
- **Factually incorrect** — wrong player pool entirely
- **Value-misleading** — startup 1.01 is worth ~50% more than rookie 1.01
- **Trust-destroying** — users immediately see the system doesn't understand their league

**What should happen:**
- **Startup draft (new league, no history):** Show dynasty rankings — CeeDee Lamb, Ja'Marr Chase, Brock Bowers, Breece Hall, etc. sourced from `titlerun_values`
- **Rookie draft (existing league):** Show only 2026 rookies — Jeremiah Love, Mendoza, Carnell Tate, etc. sourced from `rookie_prospects` (current behavior, already correct)

---

## Solution Architecture

### 1. Detection Strategy

#### The Key Insight

Sleeper leagues have a `previous_league_id` field. Dynasty leagues that have played seasons link back to their prior season's league ID. A brand new league has `previous_league_id: null`. This is the single most reliable detection signal.

#### Detection Algorithm

```javascript
/**
 * Detect whether a league's upcoming draft is a startup or rookie draft.
 * 
 * PRIMARY SIGNAL: previous_league_id
 *   - null → League has no history → STARTUP
 *   - non-null → League carried over from prior season → ROOKIE
 * 
 * SECONDARY SIGNALS (for edge case validation):
 *   - league.status: 'pre_draft' + no previous_league_id = startup
 *   - Roster player count: 0 players on all rosters = startup
 *   - Draft type from /drafts endpoint: can confirm startup vs rookie
 * 
 * @param {string} leagueId - Sleeper league ID
 * @returns {Promise<'startup'|'rookie'>}
 */
async function detectDraftType(leagueId) {
  const [league, rosters, drafts] = await Promise.all([
    sleeperApi.getLeague(leagueId),
    sleeperApi.getLeagueRosters(leagueId),
    sleeperApi.getLeagueDrafts(leagueId),
  ]);

  // ═══════════════════════════════════════════
  // SIGNAL 1 (Primary): previous_league_id
  // ═══════════════════════════════════════════
  // Dynasty leagues on Sleeper create a new league_id each season
  // but link back via previous_league_id. A null value means
  // this is the league's first season ever = startup.
  const hasPreviousSeason = league.previous_league_id != null;

  // ═══════════════════════════════════════════
  // SIGNAL 2 (Confirming): Roster composition
  // ═══════════════════════════════════════════
  // If ALL rosters have 0 players, this is pre-startup-draft.
  // If rosters have players, this is an existing league.
  const totalPlayersOnRosters = rosters.reduce(
    (sum, r) => sum + (r.players?.length || 0), 0
  );
  const rostersEmpty = totalPlayersOnRosters === 0;

  // ═══════════════════════════════════════════
  // SIGNAL 3 (Confirming): Draft metadata
  // ═══════════════════════════════════════════
  // Sleeper drafts have a `type` field ('snake', 'auction', 'linear')
  // and a `settings.rounds` field. Startup drafts typically have
  // many rounds (20-30+), rookie drafts have 3-5 rounds.
  const upcomingDraft = drafts.find(d => d.status !== 'complete');
  const draftRounds = upcomingDraft?.settings?.rounds || 0;
  const isHighRoundDraft = draftRounds > 10; // >10 rounds = likely startup

  // ═══════════════════════════════════════════
  // DECISION MATRIX
  // ═══════════════════════════════════════════
  // 
  // | previous_league_id | Rosters Empty | Draft Rounds | → Result   |
  // |--------------------|---------------|--------------|------------|
  // | null               | yes           | >10          | STARTUP ✅ |
  // | null               | yes           | ≤10          | STARTUP ✅ |
  // | null               | no            | any          | STARTUP*   |
  // | non-null           | any           | ≤10          | ROOKIE  ✅ |
  // | non-null           | yes           | >10          | STARTUP†   |
  // | non-null           | any           | any          | ROOKIE  ✅ |
  //
  // *Startup draft in progress (some picks made)
  // †League reset/reboot — rare edge case, treat as startup

  if (!hasPreviousSeason) {
    return 'startup';
  }

  // Edge case: League has previous_league_id BUT rosters are empty
  // AND draft has many rounds → league was reset/rebooted
  if (hasPreviousSeason && rostersEmpty && isHighRoundDraft) {
    return 'startup';
  }

  return 'rookie';
}
```

#### Sleeper API Calls Needed

| Endpoint | Purpose | Already Called? |
|----------|---------|----------------|
| `GET /v1/league/:id` | Get `previous_league_id`, `status`, `season` | YES (existing in pick ownership flow) |
| `GET /v1/league/:id/rosters` | Check if rosters have players | YES (existing) |
| `GET /v1/league/:id/drafts` | Get draft round count, draft status | YES (existing) |

**Key: NO additional API calls needed.** All three endpoints are already fetched in the pick ownership resolution flow. Detection is a pure computation layer on top of existing data.

#### Edge Cases

| Scenario | Detection | Correct Behavior |
|----------|-----------|------------------|
| **Brand new league, pre-draft** | `previous_league_id: null`, empty rosters | STARTUP → show all players |
| **Startup draft in progress** | `previous_league_id: null`, some rosters have players | STARTUP → show remaining undrafted players |
| **Year 2 dynasty, pre-rookie-draft** | `previous_league_id: non-null`, rosters have players | ROOKIE → show 2026 rookies only |
| **League reset/reboot** | `previous_league_id: non-null`, empty rosters, 20+ round draft | STARTUP → show all players |
| **Orphan takeover** | `previous_league_id: non-null`, roster has players | ROOKIE → correct (league has history) |
| **Dynasty league just finished first season** | `previous_league_id: null` for first season, but `previous_league_id` set after first season rolls over | STARTUP for first iteration, ROOKIE after rollover — correct |
| **Keeper league (not dynasty)** | `previous_league_id: non-null`, may have keeper settings | ROOKIE → close enough (keeper drafts are similar to rookie drafts) |

#### Caching Strategy

Detection result should be cached at the league level with the pick ownership data:

```javascript
// Add to the existing league cache object
const leagueCache = {
  league_id: '12345',
  draft_type: 'startup',  // or 'rookie'
  // ... existing cached fields
  cached_at: Date.now(),
  ttl: 30 * 60 * 1000, // 30 minutes (same as pick ownership)
};
```

No need for a separate database column — the detection is fast (pure computation on already-fetched data) and should be computed on every cache refresh. If we DO want to persist it, add `draft_type VARCHAR(10)` to the `league_draft_picks` table, but it's not necessary for MVP.

---

### 2. Projection Engine Design

#### Dual-Mode Architecture

The projection engine needs to return different player pools based on `draft_type`:

```
                    detectDraftType(leagueId)
                            │
                    ┌───────┴───────┐
                    ▼               ▼
              draft_type =      draft_type = 
              'startup'         'rookie'
                    │               │
                    ▼               ▼
          ┌─────────────┐  ┌──────────────┐
          │ titlerun_   │  │ rookie_      │
          │ values      │  │ prospects +  │
          │ (all players│  │ rookie_adp   │
          │  ranked by  │  │ (2026 class  │
          │  dynasty    │  │  only)       │
          │  value)     │  │              │
          └──────┬──────┘  └──────┬───────┘
                 │                │
                 ▼                ▼
          ┌─────────────────────────────┐
          │  projectProspectsAtSlot()    │
          │  (same algorithm, different │
          │   player pool input)        │
          └──────────────┬──────────────┘
                         │
                         ▼
                  Pick Card UI
```

#### Startup Draft Projections

For startup drafts, use `titlerun_values` as the player ranking source:

```javascript
/**
 * Get projected players for a startup draft pick slot.
 * 
 * Uses titlerun_values (existing dynasty player rankings) as the source.
 * Rankings are format-aware (SF/1QB/TEP).
 * 
 * @param {number} pickSlot - Linear pick number (1 = 1.01, 13 = 2.01 for 12-team)
 * @param {string} format - 'sf', '1qb', or 'tep'
 * @param {number} leagueSize - 10, 12, or 14
 * @returns {Array<ProjectedPlayer>}
 */
async function projectStartupSlot(pickSlot, format, leagueSize) {
  // Get all players ranked by dynasty value for this format
  const valueColumn = getValueColumn(format); // 'ktc_sf', 'ktc_1qb', etc.
  
  const query = `
    SELECT 
      p.player_id,
      p.full_name,
      p.position,
      p.team,
      p.age,
      tv.${valueColumn} as dynasty_value,
      tv.overall_rank_${format} as adp_rank
    FROM titlerun_values tv
    JOIN players p ON p.player_id = tv.player_id
    WHERE tv.${valueColumn} IS NOT NULL
      AND tv.${valueColumn} > 0
    ORDER BY tv.${valueColumn} DESC
    LIMIT ${pickSlot + 10}  -- Fetch enough for probability windows
  `;
  
  const rankedPlayers = await db.query(query);
  
  // Apply probability distribution around the pick slot
  // In startup drafts, ADP is tighter (less variance) for top picks
  // and wider for later rounds
  return calculatePickProbabilities(rankedPlayers, pickSlot, 'startup');
}

/**
 * Map format string to titlerun_values column name
 */
function getValueColumn(format) {
  const columns = {
    'sf': 'ktc_sf',       // Superflex dynasty value
    '1qb': 'ktc_1qb',    // 1QB dynasty value  
    'tep': 'ktc_tep',     // TEP dynasty value
  };
  return columns[format] || 'ktc_sf';
}
```

**Startup draft top-10 projections (SF) would look like:**

| Slot | Primary Projection | Value |
|------|--------------------|-------|
| 1.01 | CeeDee Lamb (WR) | ~9,200 |
| 1.02 | Ja'Marr Chase (WR) | ~9,100 |
| 1.03 | Brock Bowers (TE) | ~8,800 |
| 1.04 | Malik Nabers (WR) | ~8,500 |
| 1.05 | Breece Hall (RB) | ~8,200 |
| 1.06 | Sam LaPorta (TE) | ~8,000 |
| 1.07 | Jayden Daniels (QB) | ~7,800 |
| 1.08 | Nico Collins (WR) | ~7,600 |
| 1.09 | Drake London (WR) | ~7,400 |
| 1.10 | Bijan Robinson (RB) | ~7,200 |

#### Rookie Draft Projections (Existing — No Change)

Current implementation already works correctly:

```javascript
async function projectRookieSlot(pickSlot, format, draftClass) {
  // Query rookie_prospects + rookie_adp (existing code)
  // Returns 2026 class only
  // Already format-aware (SF vs 1QB)
  return existingProjectionEngine.projectProspectsAtSlot(pickSlot, format, draftClass);
}
```

#### Unified Interface

```javascript
/**
 * Main entry point — delegates to startup or rookie projection based on draft type.
 * 
 * @param {number} pickSlot - Linear pick number
 * @param {string} format - 'sf', '1qb', 'tep'
 * @param {string} draftType - 'startup' or 'rookie'
 * @param {number} draftClass - Year (2026, 2027) — used for rookie only
 * @param {number} leagueSize - 10, 12, 14
 * @returns {Array<ProjectedPlayer>}
 */
async function projectPlayersAtSlot(pickSlot, format, draftType, draftClass, leagueSize) {
  if (draftType === 'startup') {
    return projectStartupSlot(pickSlot, format, leagueSize);
  } else {
    return projectRookieSlot(pickSlot, format, draftClass);
  }
}
```

#### Database Schema Changes

**No new tables needed.** The solution reuses existing infrastructure:

| Draft Type | Data Source | Table | Status |
|-----------|------------|-------|--------|
| Startup | Dynasty player rankings | `titlerun_values` + `players` | ✅ EXISTS |
| Rookie | Rookie ADP | `rookie_prospects` + `rookie_adp` | ✅ EXISTS (or Phase 2 planned) |

**Optional enhancement** — add `draft_type` to `pick_projections` for pre-computed caching:

```sql
-- Modify existing pick_projections table
ALTER TABLE pick_projections ADD COLUMN draft_type VARCHAR(10) NOT NULL DEFAULT 'rookie';
-- Values: 'startup' or 'rookie'

-- Update unique constraint
ALTER TABLE pick_projections DROP CONSTRAINT pick_projections_draft_class_pick_slot_format_prospect_id_key;
ALTER TABLE pick_projections ADD CONSTRAINT pick_projections_unique 
  UNIQUE (draft_type, draft_class, pick_slot, format, prospect_id);
```

This lets us pre-compute projections for BOTH modes and serve them from cache.

#### Pre-Computation Strategy

```javascript
/**
 * Background job: Pre-compute projections for both draft types.
 * Runs after ADP sync or titlerun_values update.
 */
async function recomputeAllProjections() {
  const formats = ['sf', '1qb'];
  const leagueSizes = [10, 12, 14];
  
  // ═══ ROOKIE PROJECTIONS ═══
  for (const format of formats) {
    for (const draftClass of [2026, 2027]) {
      const maxSlots = 48; // 4 rounds × 12 teams (max)
      for (let slot = 1; slot <= maxSlots; slot++) {
        const projections = await projectRookieSlot(slot, format, draftClass);
        await saveProjections('rookie', draftClass, slot, format, projections);
      }
    }
  }
  
  // ═══ STARTUP PROJECTIONS ═══
  for (const format of formats) {
    for (const leagueSize of leagueSizes) {
      const maxSlots = leagueSize * 25; // ~25 rounds for startup
      for (let slot = 1; slot <= maxSlots; slot++) {
        const projections = await projectStartupSlot(slot, format, leagueSize);
        await saveProjections('startup', 2026, slot, format, projections);
      }
    }
  }
}
```

**Performance note:** Startup projections have a larger scope (300+ players vs 50 rookies), but the algorithm is the same — rank by value, apply probability windows. The query is slightly heavier but still <100ms per slot with proper indexing.

---

### 3. Implementation Plan

#### Affected Files

```
titlerun-api/
├── src/
│   ├── services/
│   │   ├── draftTypeDetection.js          ← NEW
│   │   ├── pickProjectionService.js       ← MODIFY (add draftType branching)
│   │   └── pickOwnershipService.js        ← MODIFY (integrate detection)
│   ├── routes/
│   │   └── draftCapital.js                ← MODIFY (pass draftType to projections)
│   └── __tests__/
│       ├── draftTypeDetection.test.js     ← NEW
│       └── pickProjectionService.test.js  ← MODIFY (add startup test cases)

Frontend (React):
├── components/
│   ├── PickCard.jsx                       ← MODIFY (show draft type context)
│   ├── DraftCapitalView.jsx              ← MODIFY (pass draftType down)
│   └── ProspectList.jsx                  ← MODIFY (handle veteran vs rookie display)
```

#### Step-by-Step Implementation

##### Phase 1: Detection + UI Indicator (MVP) — ~3 hours

**Goal:** Detect draft type, show "Startup Draft" vs "2026 Rookie Draft" label. No projection changes yet.

- [ ] **1a.** Create `draftTypeDetection.js` service
  - `detectDraftType(league, rosters, drafts)` — pure function, no API calls
  - Input: already-fetched Sleeper data objects
  - Output: `'startup'` | `'rookie'`
  - ~30 lines of code
  
- [ ] **1b.** Write `draftTypeDetection.test.js`
  - Test: new league (null previous_league_id) → startup
  - Test: existing league (has previous_league_id) → rookie
  - Test: league reset (has previous_league_id, empty rosters, 20+ rounds) → startup
  - Test: orphan takeover (has previous_league_id, has players) → rookie
  - Test: keeper league → rookie
  - ~60 lines of code

- [ ] **1c.** Integrate detection into pick ownership flow
  - In `pickOwnershipService.js` (or wherever `resolvePickOwnership` lives):
    ```javascript
    const draftType = detectDraftType(league, rosters, drafts);
    // Include in response
    return { picks: allPicks, draftType };
    ```

- [ ] **1d.** Pass `draftType` through API response
  - `GET /api/draft-capital/:leagueId` response adds `draftType` field:
    ```json
    {
      "draftType": "startup",
      "picks": [...],
      "projections": [...]
    }
    ```

- [ ] **1e.** Frontend: Show draft type badge
  - Add badge to `DraftCapitalView` header:
    - Startup: 🏗️ "Startup Draft — All Players Available"
    - Rookie: 🌱 "2026 Rookie Draft"
  - ~10 lines JSX

**Estimated time:** 3 hours  
**Risk:** LOW — pure computation, no data model changes, no new API calls

---

##### Phase 2: Startup Projections — ~5 hours

**Goal:** When draft type is startup, show dynasty player rankings instead of rookies.

- [ ] **2a.** Add `projectStartupSlot()` function to projection service
  - Query `titlerun_values` JOIN `players` ordered by dynasty value
  - Apply probability distribution (same algorithm as rookie, different pool)
  - Format-aware: SF prioritizes QBs, 1QB deprioritizes them
  - ~50 lines of code

- [ ] **2b.** Add `draftType` branching to main projection function
  ```javascript
  // In pickProjectionService.js
  if (draftType === 'startup') {
    return projectStartupSlot(pickSlot, format, leagueSize);
  } else {
    return projectRookieSlot(pickSlot, format, draftClass);
  }
  ```

- [ ] **2c.** Update `pick_projections` table schema
  - Add `draft_type` column (VARCHAR(10), default 'rookie')
  - Update unique constraint to include draft_type
  - Migration script:
    ```sql
    ALTER TABLE pick_projections 
      ADD COLUMN draft_type VARCHAR(10) NOT NULL DEFAULT 'rookie';
    ```

- [ ] **2d.** Update background projection job
  - Pre-compute startup projections in addition to rookie
  - Run after `titlerun_values` update (dynasty rankings change)
  - Run after `rookie_adp` update (rookie rankings change)

- [ ] **2e.** Write tests for startup projections
  - Test: Slot 1 in SF → returns CeeDee Lamb as top projection
  - Test: Slot 1 in 1QB → returns CeeDee Lamb (or close — QBs deprioritized)
  - Test: Slot 50+ → returns mid-tier veterans
  - Test: Format differences (SF vs 1QB QB rankings)
  - ~40 lines of code

- [ ] **2f.** Frontend: Update ProspectList for veteran players
  - Show team (NFL team) instead of college for veterans
  - Show age for veterans (relevant for dynasty)
  - Show dynasty value instead of rookie ADP
  - Startup card example:
    ```
    🟢 70% CeeDee Lamb  WR • DAL • Age 27
         Dynasty Value: 9,200  •  Rank: #1 SF
    ```
  - Rookie card example (unchanged):
    ```
    🟢 65% Jeremiah Love  RB • Notre Dame
         ADP: 1.01  •  Value: ~6,000
    ```

**Estimated time:** 5 hours  
**Risk:** MEDIUM — depends on `titlerun_values` data quality (are all columns populated?)

---

##### Phase 3: Polish + Edge Cases — ~3 hours

- [ ] **3a.** Handle startup-draft-in-progress
  - If draft has started, filter out already-drafted players
  - Use Sleeper `/draft/:draftId/picks` to get completed picks
  - Remove drafted players from projection pool

- [ ] **3b.** Handle mixed-year picks in startup
  - Year 1 picks = startup (all players)
  - Year 2+ picks in same league = rookie (league will have history by then)
  - Show different projection pools per year section

- [ ] **3c.** Add "Why am I seeing these players?" tooltip
  - Startup: "This is a new league — all NFL players are available in your startup draft"
  - Rookie: "This league has played seasons — only 2026 rookies are available"

- [ ] **3d.** Handle TEP format for startup
  - Ensure TEP premium applies to startup projections
  - Brock Bowers, Sam LaPorta rise in TEP startup rankings

- [ ] **3e.** Smoke test with real Sleeper leagues
  - Find a real startup league on Sleeper (or create one)
  - Find a real dynasty league with history
  - Verify detection works for both
  - Verify projections show correct player pools

- [ ] **3f.** Error handling & fallback
  - If `titlerun_values` is empty/null → fall back to rookie projections + show warning
  - If detection is ambiguous → default to rookie (safer assumption)
  - Log detection results for monitoring

**Estimated time:** 3 hours  
**Risk:** LOW — polish work, incremental improvements

---

## Implementation Phases Summary

### Phase 1: Detection + UI Indicator (MVP)
- [ ] Create `draftTypeDetection.js` service (~30 LOC)
- [ ] Write unit tests (~60 LOC)
- [ ] Integrate into pick ownership flow
- [ ] Add `draftType` to API response
- [ ] Frontend badge showing draft type
- **Estimated time: 3 hours**
- **Dependencies: None — pure computation on existing data**

### Phase 2: Startup Projections
- [ ] Add `projectStartupSlot()` function (~50 LOC)
- [ ] Add draft type branching to projection engine
- [ ] DB migration: add `draft_type` column to `pick_projections`
- [ ] Update background projection job
- [ ] Write startup projection tests
- [ ] Frontend: show veteran player info (team, age, dynasty value)
- **Estimated time: 5 hours**
- **Dependencies: Phase 1 + `titlerun_values` table populated**

### Phase 3: Polish + Edge Cases
- [ ] Handle in-progress startup drafts
- [ ] Handle mixed-year pick projections
- [ ] Add explanatory tooltips
- [ ] TEP format support for startup
- [ ] Real Sleeper league smoke tests
- [ ] Error handling & fallback
- **Estimated time: 3 hours**
- **Dependencies: Phase 2**

---

## Timeline

| Phase | Hours | Calendar Time |
|-------|-------|---------------|
| Phase 1: Detection + UI | 3h | Half a day |
| Phase 2: Startup Projections | 5h | 1 day |
| Phase 3: Polish | 3h | Half a day |
| **Total** | **11h** | **~2 days** |

---

## Risks & Mitigation

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| 1 | `titlerun_values` columns not fully populated (some NULLs) | MEDIUM | HIGH | Check data quality before Phase 2. If gaps exist, run value sync first. Fallback: use KTC raw values directly. |
| 2 | `previous_league_id` detection fails for edge cases | LOW | MEDIUM | Secondary signals (roster count, draft rounds) catch most edge cases. Default to 'rookie' if ambiguous. |
| 3 | Startup projections too many players (300+ vs 50 rookies) | LOW | LOW | Limit to top N players per slot. Startup pick 1.01 only needs top 5 candidates, not 300. |
| 4 | Users confused by two different projection modes | MEDIUM | LOW | Clear labeling ("Startup Draft" vs "Rookie Draft") + explanatory tooltip. |
| 5 | Sleeper league rollover timing edge case | LOW | LOW | When a league rolls over (season ends, new league_id created), the new instance has `previous_league_id` set. Detection handles this correctly. |

---

## Success Criteria

- [ ] New leagues (no `previous_league_id`) correctly detected as startup
- [ ] Existing leagues correctly detected as rookie
- [ ] Startup picks show veteran players (CeeDee Lamb, not Jeremiah Love at 1.01)
- [ ] Rookie picks continue showing only rookies (unchanged behavior)
- [ ] Format-aware projections for both modes (SF/1QB/TEP)
- [ ] UI clearly labels which draft type the user is viewing
- [ ] No additional Sleeper API calls required (zero performance impact)
- [ ] Edge cases handled gracefully (league reset, orphan takeover)

---

## Key Technical Decisions

### 1. Why `previous_league_id` and not draft rounds count?

Draft round count (>10 = startup) is unreliable:
- Some leagues do 6-round startup drafts with free agency
- Some leagues do 15-round keeper drafts
- `previous_league_id` is **definitive**: either the league has history or it doesn't

### 2. Why no separate `startup_projections` table?

The existing `pick_projections` table + a `draft_type` column handles both modes. No need for schema complexity. The query is the same structure, just different WHERE clause on the player pool.

### 3. Why not auto-detect from draft settings?

Sleeper's draft object has a `type` field ('snake', 'auction', 'linear') but NOT a 'startup' vs 'rookie' field. The draft type must be inferred from league context, not draft settings.

### 4. Why pre-compute both modes?

Startup projections are more expensive to compute (larger player pool), but only ~300 unique slot × format combinations exist. Pre-computing both modes on ADP/value updates means pick cards render instantly from cache.

---

## Next Steps

1. **Validate `titlerun_values` data quality** — Confirm that `ktc_sf`, `ktc_1qb` columns are populated for top 300 players
2. **Phase 1 implementation** — Create detection service + tests (3h)
3. **Phase 2 implementation** — Add startup projection function + DB migration (5h)
4. **Phase 3 implementation** — Polish, edge cases, smoke tests (3h)
5. **Deploy incrementally** — Phase 1 first (low risk), then Phase 2 + 3

---

*Architecture designed 2026-03-14. Total implementation: ~11 hours across 3 phases.*

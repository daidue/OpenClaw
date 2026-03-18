# PLAN: League Settings Auto-Population

**Status:** ✅ PLANNING COMPLETE  
**Date:** 2026-03-17  
**Estimated Implementation:** 1-2 hours (less than expected — most infrastructure exists)

---

## Executive Summary

**Good news: ~80% of this is already built.** The system is NOT hardcoded — it's already auto-populating from Sleeper API data. The existing flow works end-to-end:

1. ✅ Backend fetches league from Sleeper API (`sleeperService.getLeague()`)
2. ✅ Backend stores `roster_positions`, `scoring_settings`, `total_rosters` in `hub_leagues.settings` (JSONB)
3. ✅ Dashboard endpoint returns `league.settings` with all raw Sleeper data
4. ✅ Frontend `LeagueSettingsBadges` component parses settings into badges
5. ✅ `IntelligenceHub.jsx` passes dashboard data → `LeagueSettingsBadges`

**What might appear "hardcoded":** If a user's league happens to be 12-team SF TEP++ 0.5 PPR, the badges look static but are actually derived from real data.

---

## Current Architecture (Already Working)

### Data Flow
```
Sleeper API (/v1/league/{id})
  → sleeperService.getLeague() [cached 1hr]
  → POST /sync (upserts hub_leagues with settings JSON)
  → GET /dashboard/:leagueId (returns league.settings)
  → IntelligenceHub.jsx (passes settings to LeagueSettingsBadges)
  → LeagueSettingsBadges parses & renders badges
```

### Backend: `intelligenceHub.js` — Dashboard Endpoint (line 262-536)
- Fetches league from `hub_leagues` table
- Returns `league.settings` (stored as JSON with `roster_positions`, `scoring_settings`)
- Also returns `league.totalRosters`, `league.leagueType`

### Frontend: `IntelligenceHub.jsx` (line 282-296)
- Already imports `LeagueSettingsBadges` from report card
- Passes `dashboardData.league.settings` with proper data transformation
- Handles both array and object formats for `roster_positions`

### Component: `LeagueSettingsBadges.jsx` (report card)
- Already has full detection logic for:
  - **League Size** — `num_teams`, `totalRosters`, `leagueSize` (multiple fallbacks)
  - **SF/2QB** — checks `SUPER_FLEX` in roster positions, `format === 'sf'`, `superflex` flag
  - **Starters Count** — filters `roster_positions` by starter slots
  - **TEP** — `bonus_rec_te`: 0=none, ≥0.5=TEP+, ≥1.0=TEP++
  - **PPR** — `rec`: 0=Standard, 0.5=Half PPR, 1.0=Full PPR
  - **Draft Type** — startup vs rookie

---

## Gaps & Improvements Needed

### Gap 1: Missing Badges (Enhancement)
These badge types could be added but aren't detected yet:

| Badge | Source | Logic |
|-------|--------|-------|
| **Dynasty** / **Redraft** | `league.league_type` or `settings.type` | `type=2` = dynasty, `type=0` = redraft |
| **IDP** | `roster_positions` | Contains `DL`, `LB`, `DB`, `IDP_FLEX` |
| **Best Ball** | `settings.best_ball` | `1` = best ball |
| **Keeper** | `settings.type` | `type=1` = keeper |

**Implementation:** Add to `parseSettingsBadges()` in `LeagueSettingsBadges.jsx`:

```javascript
// Dynasty / Redraft / Keeper detection
const leagueType = settings.type || extraData.leagueType;
if (leagueType === 2 || leagueType === 'dynasty') {
  badges.push({ label: 'Dynasty', color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' });
} else if (leagueType === 1 || leagueType === 'keeper') {
  badges.push({ label: 'Keeper', color: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' });
} else if (leagueType === 0 || leagueType === 'redraft') {
  badges.push({ label: 'Redraft', color: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' });
}

// IDP detection
const idpPositions = ['DL', 'LB', 'DB', 'IDP_FLEX', 'DE', 'DT', 'SS', 'FS', 'CB'];
const hasIDP = rosterPositions.some(p => idpPositions.includes(p));
if (hasIDP) {
  badges.push({ label: 'IDP', color: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' });
}

// Best Ball detection
if (settings.best_ball === 1) {
  badges.push({ label: 'Best Ball', color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' });
}
```

### Gap 2: `leagueType` Not Passed to Badges from Dashboard
The dashboard returns `league.leagueType` but `IntelligenceHub.jsx` only passes `league.settings` — the `leagueType` field isn't inside `settings`.

**Fix in `IntelligenceHub.jsx` (line 286):**
```jsx
<LeagueSettingsBadges
  settings={{
    ...dashboardData.league.settings,
    leagueType: dashboardData.league.leagueType, // ADD THIS
    rosterPositions: (() => { /* existing logic */ })(),
    scoringSettings: dashboardData.league.settings?.scoring_settings || {},
    leagueSize: dashboardData.league.totalRosters,
  }}
  className="mb-6"
/>
```

### Gap 3: Edge Case — Empty/Missing Settings
If league hasn't been synced or settings are empty, badges render nothing (component returns `null` — already handled). But we should consider showing a "Sync your league" prompt instead.

### Gap 4: Badge Ordering Consistency
Current: badges appear in code order (size → format → starters → TEP → PPR → draft).  
No issue here — ordering is deterministic and logical.

### Gap 5: Tailwind Dynamic Classes
The component uses dynamic Tailwind classes like `bg-red-500/20`. These need to be in the safelist or used as full string literals (currently they ARE full string literals — ✅ safe).

---

## Verification Checklist

To confirm badges are truly dynamic (not hardcoded), test with:

1. **Different league types:**
   - [ ] 1QB league → should show "1QB" instead of "SF/2QB"
   - [ ] 10-team → should show "10 Teams"
   - [ ] Full PPR → should show "Full PPR"
   - [ ] No TEP → should NOT show TEP badge at all
   
2. **Check data flow:**
   - [ ] `GET /api/intelligence-hub/dashboard/:leagueId` → verify `league.settings` has `roster_positions` and `scoring_settings`
   - [ ] Verify `roster_positions` is an array (not object) coming from Sleeper

3. **Test edge cases:**
   - [ ] League not yet synced → should show empty/prompt
   - [ ] League with IDP positions
   - [ ] League with unusual TEP value (0.75)

---

## Implementation Plan (Prioritized)

### Phase 1: Quick Wins (30 min)
1. **Add `leagueType` passthrough** in `IntelligenceHub.jsx` — 1 line change
2. **Add Dynasty/Redraft/Keeper badge** in `LeagueSettingsBadges.jsx` — 10 lines
3. **Add IDP badge** — 5 lines
4. **Add Best Ball badge** — 3 lines

### Phase 2: Polish (30 min)
5. **Badge tooltips** — hover to see raw values (e.g., "TEP++ — TE bonus: 1.0 PPR")
6. **"Sync required" empty state** — show if no settings available
7. **Badge icons** (optional) — add Lucide icons per badge type

### Phase 3: Testing (30 min)
8. **Manual test** with 2-3 different league types
9. **Unit test** for `parseSettingsBadges()` helper function
10. **Verify caching** — ensure league settings don't cause unnecessary re-fetches

---

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `titlerun-app/src/components/reportCard/LeagueSettingsBadges.jsx` | Add Dynasty/IDP/BestBall badges | P1 |
| `titlerun-app/src/pages/IntelligenceHub.jsx` | Pass `leagueType` to badges | P1 |
| `titlerun-api/src/routes/intelligenceHub.js` | No changes needed (already returns all data) | — |
| `titlerun-api/src/services/sleeperService.js` | No changes needed (already fetches/caches league) | — |

---

## Caching (Already Implemented)

- **Backend:** `sleeperService` caches league data for 1 hour (line 14: `LEAGUE: 60 * 60`)
- **Frontend:** React Query handles caching (configured per-query)
- **Database:** `hub_leagues.settings` persists settings; `synced_at` tracks freshness

No additional caching work needed.

---

## Badge Detection Reference

| Badge | Sleeper Field | Detection Logic |
|-------|--------------|-----------------|
| `X Teams` | `total_rosters` | Direct value |
| `1QB` | `roster_positions` | No `SUPER_FLEX` AND only 1 `QB` |
| `SF/2QB` | `roster_positions` | Has `SUPER_FLEX` OR ≥2 `QB` slots |
| `Start X` | `roster_positions` | Count of non-BN/TAXI/IR slots |
| `TEP` | `scoring_settings.bonus_rec_te` | 0 < value < 0.5 |
| `TEP+` | `scoring_settings.bonus_rec_te` | ≥ 0.5 |
| `TEP++` | `scoring_settings.bonus_rec_te` | ≥ 1.0 |
| `Standard` | `scoring_settings.rec` | = 0 |
| `0.5 PPR` | `scoring_settings.rec` | = 0.5 |
| `Full PPR` | `scoring_settings.rec` | ≥ 1.0 |
| `Dynasty` | `settings.type` / `league_type` | = 2 or 'dynasty' |
| `Redraft` | `settings.type` / `league_type` | = 0 or 'redraft' |
| `Keeper` | `settings.type` / `league_type` | = 1 or 'keeper' |
| `IDP` | `roster_positions` | Contains DL/LB/DB/IDP_FLEX |
| `Best Ball` | `settings.best_ball` | = 1 |
| `Startup Draft` | Draft metadata | Draft type = startup |
| `Rookie Draft` | Draft metadata | Draft type = rookie |

---

## Key Finding

**The badges are NOT hardcoded.** The entire pipeline from Sleeper API → database → API → frontend → badges is already wired up. The screenshot showing "12 Teams, SF/2QB, Start 10, TEP++, 0.5 PPR" is displaying real league data — it just happens to match a common dynasty SF league setup.

**Only minor enhancements needed:** Dynasty/Redraft badge, IDP detection, `leagueType` passthrough, and optional tooltips.

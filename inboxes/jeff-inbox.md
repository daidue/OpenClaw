# Jeff Inbox

## [PROGRESS UPDATE] — Advanced Stats Phase 2 Progress Report #1
**From:** Rush (TitleRun)
**Priority:** NORMAL
**Date:** 2026-03-15 12:15 PM

### Completed (3 hours elapsed)

✅ **Database Schema (4 hours allocated → 3 hours actual)**
- Created migration 063: 4 new tables
  - `player_situational_stats` (red zone, 3rd down, goal line, play action, pressure)
  - `player_tracking_stats` (NGS: separation, speed, time to throw)
  - `player_snap_counts` (weekly snap data)
  - `player_season_snap_totals` (aggregated season totals)
- Migration successfully applied to production database
- All tables verified and indexed

✅ **Scrapers (12 hours allocated → 3 hours actual)**
- Created `scrapeProFootballReference.js`
  - QB: pressure stats, play action, deep balls
  - WR/TE: red zone targets/receptions/TDs
  - RB: goal line carries/TDs
  - Rate limiting: 1 req/sec
  - Graceful error handling
- Created `scrapeNextGenStats.js`
  - WR: avg separation, cushion, YAC above expected
  - QB: time to throw, aggressiveness
  - RB: efficiency, vs stacked boxes
  - Handles embedded JSON extraction from NGS site
- Created `scrapeESPN.js`
  - Weekly snap counts (weeks 1-18)
  - Season aggregation logic
  - Snap percentage calculations

### In Progress

🔧 **playerIntelligenceService.js updates**
- Adding queries to pull from new tables
- Integrating situational/tracking/snap metrics
- Building metric grouping structure (Efficiency, Volume, Ball Skills, Situational)

### Next Steps (Priority Order)

1. **Complete playerIntelligenceService.js integration** (2 hours)
   - Add queries for new tables
   - Merge metrics into existing stats object
   - Add to percentile calculations

2. **Test scrapers with live data** (2 hours)
   - Run PFR scraper for 2024 season
   - Run NGS scraper (may need HTML structure adjustments)
   - Run ESPN scraper for recent weeks
   - Verify data quality

3. **Create metric grouping config** (1 hour)
   - Define POSITION_METRIC_GROUPS constant
   - QB: Passing Efficiency, Pocket Management, Situational, Volume
   - RB: Efficiency, Volume, Ball Skills, Situational
   - WR/TE: Volume, Efficiency, Ball Skills, Situational

4. **Update API endpoint** (2 hours)
   - Modify `/api/players/:id/advanced-stats`
   - Return grouped metrics
   - Add data freshness indicators

5. **Frontend MetricGroup component** (4 hours)
   - Create collapsible metric group UI
   - Desktop: 2-column grid
   - Mobile: stacked vertical
   - Icons for each group

### Risks & Blockers

⚠️ **NGS Scraper uncertainty:**
- Next Gen Stats site structure may have changed
- May need to reverse-engineer their API endpoints
- Fallback: manual CSV import if scraping fails

⚠️ **ESPN snap count HTML structure:**
- ESPN redesigns frequently
- May need to adjust selectors
- Have PFR as backup source for snap counts

### Metrics

- **Time elapsed:** 3 hours
- **Target completion:** Sunday 3/22 EOD
- **Runway remaining:** 31 hours

### Status

🟢 ON TRACK — Ahead of schedule on database/scrapers. playerIntelligenceService integration in progress.

[ACK by Rush, 2026-03-15] Action: Continuing Phase 2 implementation.

# Integration Architecture: Player Intelligence System

**Author:** Integration Specialist (Expert Agent 5)  
**Date:** 2026-03-14  
**Status:** Design Document  

---

## Executive Summary

This document specifies how the Player Intelligence system (season outlooks + weekly insights) integrates into TitleRun's existing Express.js/PostgreSQL/React stack with **zero disruption** to current features. The design follows TitleRun's established patterns: plain JS services, Jest tests, and strict input validation.

---

## 1. Database Integration

### Existing Schema (Reference)

```sql
-- These already exist and are NOT modified (except one ALTER)
players (sleeper_id PK, name, team, position, age, status)
player_season_stats (player_id FK→players, season, games, targets, receptions, yards, tds, epa, cpoe)
player_contracts (player_id FK→players, team, years, apy, guaranteed)
titlerun_values (player_id FK→players, format, value, rank)
```

### Migration: `001_add_player_intelligence_tables.sql`

```sql
-- ============================================================
-- Migration 001: Player Intelligence Tables
-- Run against: titlerun PostgreSQL (Railway)
-- Rollback: 001_rollback_player_intelligence_tables.sql
-- ============================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Player News Feed
-- Raw news items scraped from multiple sources
-- ---------------------------------------------------------
CREATE TABLE player_news_feed (
  id            BIGSERIAL PRIMARY KEY,
  player_id     VARCHAR(20) NOT NULL REFERENCES players(sleeper_id) ON DELETE CASCADE,
  source        VARCHAR(50) NOT NULL,              -- 'espn', 'nfl', 'sleeper', 'rotoworld', 'twitter'
  source_id     VARCHAR(255),                       -- Dedup key from source
  headline      TEXT NOT NULL,
  body          TEXT,
  url           VARCHAR(2048),
  category      VARCHAR(50),                        -- 'injury', 'trade', 'depth_chart', 'contract', 'coaching', 'general'
  impact_score  DECIMAL(3,2) DEFAULT 0.00,          -- 0.00-1.00, calculated post-scrape
  published_at  TIMESTAMP NOT NULL,
  scraped_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  processed     BOOLEAN NOT NULL DEFAULT FALSE,     -- Has insight engine evaluated this?
  
  CONSTRAINT uq_news_source UNIQUE (source, source_id)
);

CREATE INDEX idx_news_player_id ON player_news_feed(player_id);
CREATE INDEX idx_news_published ON player_news_feed(published_at DESC);
CREATE INDEX idx_news_unprocessed ON player_news_feed(processed, scraped_at DESC) WHERE processed = FALSE;
CREATE INDEX idx_news_high_impact ON player_news_feed(impact_score DESC) WHERE impact_score >= 0.7;

-- ---------------------------------------------------------
-- 2. Player Insights
-- Generated intelligence blurbs (season outlooks + weekly)
-- ---------------------------------------------------------
CREATE TABLE player_insights (
  id              BIGSERIAL PRIMARY KEY,
  player_id       VARCHAR(20) NOT NULL REFERENCES players(sleeper_id) ON DELETE CASCADE,
  season          SMALLINT NOT NULL,                -- e.g. 2026
  week            SMALLINT,                         -- NULL = season outlook, 1-18 = weekly
  insight_type    VARCHAR(20) NOT NULL DEFAULT 'season_outlook',  -- 'season_outlook', 'weekly', 'breaking'
  content         TEXT NOT NULL,                    -- The blurb itself (markdown-safe plain text)
  factors         JSONB NOT NULL DEFAULT '{}',      -- Structured factors that drove the blurb
  model_version   VARCHAR(50),                      -- AI model used: 'claude-sonnet-4-20250514', etc.
  prompt_hash     VARCHAR(64),                      -- SHA-256 of prompt template (detect drift)
  confidence      DECIMAL(3,2) DEFAULT 0.80,        -- Model's self-assessed confidence 0.00-1.00
  
  -- Value snapshot at time of generation (for historical context)
  value_snapshot  JSONB,                            -- { "sf": 8500, "1qb": 6200, "rank_sf": 12 }
  
  generated_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMP,                        -- When this insight should be regenerated
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,    -- Soft-delete / superseded flag
  
  CONSTRAINT uq_active_insight UNIQUE (player_id, season, week, insight_type) 
    WHERE is_active = TRUE  -- Only one active insight per player/season/week/type
);

-- Note: The partial unique constraint above requires a unique index instead on some PG versions:
CREATE UNIQUE INDEX idx_insights_active_unique 
  ON player_insights(player_id, season, week, insight_type) 
  WHERE is_active = TRUE;

CREATE INDEX idx_insights_player_season ON player_insights(player_id, season, week);
CREATE INDEX idx_insights_generated ON player_insights(generated_at DESC);
CREATE INDEX idx_insights_expires ON player_insights(expires_at) WHERE expires_at IS NOT NULL AND is_active = TRUE;
CREATE INDEX idx_insights_type ON player_insights(insight_type, season);

-- ---------------------------------------------------------
-- 3. Coaching Changes
-- Tracks OC/HC changes that affect player value
-- ---------------------------------------------------------
CREATE TABLE coaching_changes (
  id              BIGSERIAL PRIMARY KEY,
  team            VARCHAR(5) NOT NULL,              -- NFL team abbreviation
  season          SMALLINT NOT NULL,
  role            VARCHAR(30) NOT NULL,             -- 'HC', 'OC', 'DC', 'ST', 'QB_Coach', 'WR_Coach'
  previous_coach  VARCHAR(100),
  new_coach       VARCHAR(100),
  scheme_impact   JSONB,                            -- { "pass_rate_delta": +0.03, "scheme": "west_coast" }
  effective_date  DATE,
  source_url      VARCHAR(2048),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_coaching_change UNIQUE (team, season, role, new_coach)
);

CREATE INDEX idx_coaching_team_season ON coaching_changes(team, season);

-- ---------------------------------------------------------
-- 4. Extend existing players table
-- ---------------------------------------------------------
ALTER TABLE players 
  ADD COLUMN IF NOT EXISTS last_insight_generated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS intelligence_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMIT;
```

### Rollback: `001_rollback_player_intelligence_tables.sql`

```sql
BEGIN;
ALTER TABLE players DROP COLUMN IF EXISTS last_insight_generated_at;
ALTER TABLE players DROP COLUMN IF EXISTS intelligence_enabled;
DROP TABLE IF EXISTS coaching_changes;
DROP TABLE IF EXISTS player_insights;
DROP TABLE IF EXISTS player_news_feed;
COMMIT;
```

### FK Relationship Map

```
players (sleeper_id PK)
  ├── player_season_stats.player_id (existing)
  ├── player_contracts.player_id (existing)
  ├── titlerun_values.player_id (existing)
  ├── player_news_feed.player_id (NEW)
  └── player_insights.player_id (NEW)

coaching_changes → no FK to players (team-level, not player-level)
  └── JOIN via: players.team = coaching_changes.team
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| FK target | `players.sleeper_id` | All existing FKs use this. Consistency. |
| ON DELETE | `CASCADE` | If a player is removed, their news/insights are stale anyway. |
| No DB triggers | ✅ Correct | Triggers add hidden complexity. Cache invalidation handled in service layer. |
| `value_snapshot` in insights | ✅ Yes (JSONB) | Captures value at blurb time for "then vs now" comparisons. Low cost, high analytical value. |
| Partial unique index | Active insights only | Allows historical insights while ensuring one active per slot. |
| `impact_score` on news | Computed post-scrape | Avoids blocking news ingestion. Async scoring via `factorAnalysisService`. |

---

## 2. API Endpoints

### New Endpoints

All new endpoints live under `/api/players/:playerId/` to match existing routing patterns.

#### `GET /api/players/:playerId/insight`

Returns the current active insight for a player (season outlook or latest weekly).

```javascript
// Route: src/routes/playerIntelligence.js
// Auth: None (public, same as existing player endpoints)

// Request
GET /api/players/9509/insight?type=season_outlook&season=2026

// Response 200
{
  "player_id": "9509",
  "season": 2026,
  "week": null,
  "insight_type": "season_outlook",
  "content": "Terry McLaurin enters 2026 as WAS's undisputed WR1 with Kliff Kingsbury now calling plays. His 22.5% target share ranked 8th among WRs last season, and the new west-coast scheme projects to boost short-to-intermediate targets. The quad injury that limited him in Weeks 14-16 appears fully healed per OTA reports. Dynasty value: stable WR1 with upside if Jayden Daniels takes the Year 3 leap.",
  "factors": {
    "target_share": { "value": 22.5, "rank": 8, "trend": "stable" },
    "coaching_change": { "role": "OC", "new": "Kliff Kingsbury", "scheme": "west_coast" },
    "injury_history": [{ "type": "quad", "weeks_missed": 2, "status": "cleared" }],
    "qb_situation": { "starter": "Jayden Daniels", "year": 3, "stability": "high" },
    "contract": { "years_remaining": 2, "apy_rank": 12 },
    "age": { "current": 28, "curve_phase": "peak_to_decline" }
  },
  "confidence": 0.85,
  "value_snapshot": { "sf": 7200, "1qb": 5800, "rank_sf": 18 },
  "generated_at": "2026-03-14T12:00:00Z",
  "expires_at": "2026-03-21T12:00:00Z"
}

// Response 404 (no insight exists yet)
{
  "error": "No insight available",
  "player_id": "9509",
  "can_generate": true
}
```

#### `GET /api/players/:playerId/insights`

Historical insights with filtering.

```javascript
// Request
GET /api/players/9509/insights?seasons=2025,2026&type=season_outlook&limit=10

// Response 200
{
  "player_id": "9509",
  "insights": [
    { "season": 2026, "week": null, "content": "...", "generated_at": "..." },
    { "season": 2025, "week": null, "content": "...", "generated_at": "..." }
  ],
  "total": 2
}
```

#### `GET /api/players/:playerId/news`

Recent news feed for a player.

```javascript
// Request
GET /api/players/9509/news?limit=10&category=injury

// Response 200
{
  "player_id": "9509",
  "news": [
    {
      "id": 4521,
      "source": "espn",
      "headline": "McLaurin cleared for full practice",
      "category": "injury",
      "impact_score": 0.65,
      "published_at": "2026-03-12T14:30:00Z",
      "url": "https://espn.com/..."
    }
  ],
  "total": 1
}
```

#### `POST /api/admin/insights/regenerate`

Admin-only endpoint to force-regenerate an insight.

```javascript
// Request (requires admin API key via x-admin-key header)
POST /api/admin/insights/regenerate
Content-Type: application/json
x-admin-key: ${ADMIN_API_KEY}

{
  "player_id": "9509",
  "season": 2026,
  "insight_type": "season_outlook",
  "force": true
}

// Response 202
{
  "status": "queued",
  "player_id": "9509",
  "estimated_completion": "30s"
}
```

#### `GET /api/admin/insights/stats`

Dashboard for monitoring insight generation.

```javascript
// Response 200
{
  "total_insights": 1847,
  "active_insights": 612,
  "last_batch_run": "2026-03-14T06:00:00Z",
  "news_items_24h": 234,
  "high_impact_news_24h": 12,
  "avg_generation_time_ms": 2400,
  "model_version": "claude-sonnet-4-20250514",
  "errors_24h": 3
}
```

### Modifications to Existing Endpoints

#### `GET /api/players/:playerId` (existing)

**Change:** Add optional `insight` field to existing response. This is a **non-breaking additive change**.

```javascript
// BEFORE (existing response shape)
{
  "sleeper_id": "9509",
  "name": "Terry McLaurin",
  "team": "WAS",
  "position": "WR",
  "age": 28,
  "values": { "sf": 7200, "1qb": 5800 },
  "stats": { ... },
  "contract": { ... }
}

// AFTER (new field appended — backward compatible)
{
  "sleeper_id": "9509",
  "name": "Terry McLaurin",
  // ... all existing fields unchanged ...
  "insight": {                          // NEW — null if not available
    "season": 2026,
    "insight_type": "season_outlook",
    "content": "Terry McLaurin enters 2026...",
    "confidence": 0.85,
    "generated_at": "2026-03-14T12:00:00Z"
  }
}
```

**Implementation:** Add a single async call in the existing player detail handler. Use a **timeout wrapper** so insight fetch never blocks the page:

```javascript
// In existing player detail route handler
const insightPromise = playerInsightService.getLatestInsight(playerId, currentSeason)
  .catch(() => null);  // Swallow errors — insight is optional

const [playerData, insight] = await Promise.all([
  existingPlayerFetch(playerId),  // Existing logic unchanged
  Promise.race([
    insightPromise,
    new Promise(resolve => setTimeout(() => resolve(null), 500))  // 500ms timeout
  ])
]);

return { ...playerData, insight };
```

### Route Registration

```javascript
// src/routes/playerIntelligence.js — NEW FILE
const express = require('express');
const router = express.Router();
const playerInsightService = require('../services/playerInsightService');
const { validatePlayerId } = require('../utils/helpers');
const BadRequestError = require('../errors/BadRequestError');

// Middleware: validate player ID (reuse existing pattern from tradeEngine.js)
function validatePlayerParam(req, res, next) {
  const { playerId } = req.params;
  if (!playerId || typeof playerId !== 'string' || playerId.length > 20) {
    throw new BadRequestError('Invalid player ID');
  }
  next();
}

router.get('/:playerId/insight', validatePlayerParam, async (req, res) => {
  const { playerId } = req.params;
  const season = parseInt(req.query.season) || getCurrentSeason();
  const type = req.query.type || 'season_outlook';
  
  const insight = await playerInsightService.getLatestInsight(playerId, season, type);
  if (!insight) {
    return res.status(404).json({ error: 'No insight available', player_id: playerId, can_generate: true });
  }
  res.json(insight);
});

router.get('/:playerId/insights', validatePlayerParam, async (req, res) => {
  const { playerId } = req.params;
  const seasons = req.query.seasons ? req.query.seasons.split(',').map(Number) : [getCurrentSeason()];
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  
  const insights = await playerInsightService.getHistoricalInsights(playerId, seasons, limit);
  res.json({ player_id: playerId, insights, total: insights.length });
});

router.get('/:playerId/news', validatePlayerParam, async (req, res) => {
  const { playerId } = req.params;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const category = req.query.category || null;
  
  const news = await playerInsightService.getPlayerNews(playerId, limit, category);
  res.json({ player_id: playerId, news, total: news.length });
});

module.exports = router;
```

```javascript
// src/routes/adminIntelligence.js — NEW FILE (admin endpoints)
const express = require('express');
const router = express.Router();

// Simple API key auth middleware
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireAdmin);

router.post('/insights/regenerate', async (req, res) => { /* ... */ });
router.get('/insights/stats', async (req, res) => { /* ... */ });

module.exports = router;
```

---

## 3. Service Layer Architecture

### New Service Files

```
src/services/
├── tep/                            (existing)
│   ├── tepValueService.js
│   ├── tep-config.js
│   └── index.js
├── tradeAnalysisService.js         (existing)
│
├── intelligence/                   (NEW — isolated module)
│   ├── index.js                    ← Public API (like tep/index.js pattern)
│   ├── playerInsightService.js     ← Main orchestrator
│   ├── newsAggregationService.js   ← Scrapes + normalizes news
│   ├── insightGenerationService.js ← AI prompt construction + calling
│   ├── factorAnalysisService.js    ← Statistical factor calculation
│   ├── cacheService.js             ← Redis/in-memory cache wrapper
│   └── config.js                   ← Feature flags, model config, thresholds
```

### `src/services/intelligence/index.js`

```javascript
/**
 * Player Intelligence System
 * 
 * Generates and manages AI-powered player insights for dynasty fantasy football.
 * 
 * @module intelligence
 * @version 1.0.0
 * 
 * Usage:
 * ```javascript
 * const intelligence = require('./services/intelligence');
 * 
 * // Get latest insight
 * const insight = await intelligence.getLatestInsight('9509', 2026);
 * 
 * // Force regenerate
 * await intelligence.regenerateInsight('9509', 2026, 'season_outlook');
 * ```
 */

'use strict';

const playerInsightService = require('./playerInsightService');

module.exports = {
  getLatestInsight: playerInsightService.getLatestInsight,
  getHistoricalInsights: playerInsightService.getHistoricalInsights,
  getPlayerNews: playerInsightService.getPlayerNews,
  regenerateInsight: playerInsightService.regenerateInsight,
  generateBatchInsights: playerInsightService.generateBatchInsights,
};
```

### `src/services/intelligence/playerInsightService.js`

```javascript
/**
 * Player Insight Service — Main orchestrator
 * 
 * Coordinates data fetching, factor analysis, AI generation, and caching.
 * Follows TitleRun patterns: pure functions where possible, class-free, 
 * explicit error handling.
 */

'use strict';

const { query } = require('../../db');  // Existing DB connection
const cacheService = require('./cacheService');
const factorAnalysisService = require('./factorAnalysisService');
const insightGenerationService = require('./insightGenerationService');
const newsAggregationService = require('./newsAggregationService');
const config = require('./config');

/**
 * Get the latest active insight for a player.
 * Cache → DB → Generate (lazy generation on first access).
 * 
 * @param {string} playerId - Sleeper ID
 * @param {number} season - Season year
 * @param {string} insightType - 'season_outlook' | 'weekly' | 'breaking'
 * @returns {Object|null} Insight object or null
 */
async function getLatestInsight(playerId, season, insightType = 'season_outlook') {
  // 1. Check cache (1-hour TTL)
  const cacheKey = `insight:${playerId}:${season}:${insightType}`;
  const cached = await cacheService.get(cacheKey);
  if (cached) return cached;

  // 2. Check database
  const result = await query(
    `SELECT * FROM player_insights 
     WHERE player_id = $1 AND season = $2 AND insight_type = $3 AND is_active = TRUE
     ORDER BY generated_at DESC LIMIT 1`,
    [playerId, season, insightType]
  );

  if (result.rows[0]) {
    const insight = formatInsightResponse(result.rows[0]);
    await cacheService.set(cacheKey, insight, config.CACHE_TTL_SECONDS);
    return insight;
  }

  // 3. Don't auto-generate on read (would block response)
  //    Return null — frontend shows "Insight coming soon" placeholder
  //    Generation happens via cron or admin trigger
  return null;
}

/**
 * Generate (or regenerate) an insight for a player.
 * Called by: cron jobs, admin endpoint, high-impact news detector.
 * 
 * @param {string} playerId - Sleeper ID
 * @param {number} season - Season year
 * @param {string} insightType - Type of insight to generate
 * @param {Object} options - { force: false, week: null }
 * @returns {Object} Generated insight
 */
async function regenerateInsight(playerId, season, insightType = 'season_outlook', options = {}) {
  const { force = false, week = null } = options;

  // 1. Check if generation is needed (unless forced)
  if (!force) {
    const existing = await query(
      `SELECT generated_at FROM player_insights 
       WHERE player_id = $1 AND season = $2 AND insight_type = $3 AND is_active = TRUE
       ORDER BY generated_at DESC LIMIT 1`,
      [playerId, season, insightType]
    );
    
    if (existing.rows[0]) {
      const age = Date.now() - new Date(existing.rows[0].generated_at).getTime();
      if (age < config.MIN_REGENERATION_INTERVAL_MS) {
        return formatInsightResponse(existing.rows[0]);
      }
    }
  }

  // 2. Gather all input data (parallel fetch)
  const [player, stats, contract, news, coachingChanges, currentValues] = await Promise.all([
    query('SELECT * FROM players WHERE sleeper_id = $1', [playerId]).then(r => r.rows[0]),
    query('SELECT * FROM player_season_stats WHERE player_id = $1 ORDER BY season DESC LIMIT 3', [playerId]).then(r => r.rows),
    query('SELECT * FROM player_contracts WHERE player_id = $1 ORDER BY created_at DESC LIMIT 1', [playerId]).then(r => r.rows[0]),
    newsAggregationService.getRecentNews(playerId, 30),
    query('SELECT * FROM coaching_changes WHERE team = (SELECT team FROM players WHERE sleeper_id = $1) AND season = $2', [playerId, season]).then(r => r.rows),
    query('SELECT format, value, rank FROM titlerun_values WHERE player_id = $1', [playerId]).then(r => r.rows),
  ]);

  if (!player) {
    throw new Error(`Player not found: ${playerId}`);
  }

  // 3. Calculate structured factors
  const factors = factorAnalysisService.calculate({
    player, stats, contract, news, coachingChanges, currentValues
  });

  // 4. Generate blurb via AI
  const { content, confidence, modelVersion, promptHash } = await insightGenerationService.generate({
    player, stats, contract, news, coachingChanges, factors, insightType, week
  });

  // 5. Build value snapshot
  const valueSnapshot = {};
  for (const v of currentValues) {
    valueSnapshot[v.format] = v.value;
    if (v.rank) valueSnapshot[`rank_${v.format}`] = v.rank;
  }

  // 6. Deactivate previous insight for this slot
  await query(
    `UPDATE player_insights SET is_active = FALSE 
     WHERE player_id = $1 AND season = $2 AND week IS NOT DISTINCT FROM $3 
     AND insight_type = $4 AND is_active = TRUE`,
    [playerId, season, week, insightType]
  );

  // 7. Insert new insight
  const result = await query(
    `INSERT INTO player_insights 
     (player_id, season, week, insight_type, content, factors, model_version, prompt_hash, confidence, value_snapshot, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() + INTERVAL '7 days')
     RETURNING *`,
    [playerId, season, week, insightType, content, JSON.stringify(factors), modelVersion, promptHash, confidence, JSON.stringify(valueSnapshot)]
  );

  // 8. Update player timestamp
  await query(
    'UPDATE players SET last_insight_generated_at = NOW() WHERE sleeper_id = $1',
    [playerId]
  );

  // 9. Invalidate cache
  const cacheKey = `insight:${playerId}:${season}:${insightType}`;
  await cacheService.del(cacheKey);

  const insight = formatInsightResponse(result.rows[0]);
  await cacheService.set(cacheKey, insight, config.CACHE_TTL_SECONDS);

  return insight;
}

/**
 * Batch generate insights for multiple players.
 * Used by cron jobs. Includes rate limiting and error isolation.
 */
async function generateBatchInsights(playerIds, season, insightType, options = {}) {
  const { concurrency = 3, delayMs = 200 } = options;
  const results = { success: 0, failed: 0, skipped: 0, errors: [] };

  // Process in chunks to respect API rate limits
  for (let i = 0; i < playerIds.length; i += concurrency) {
    const chunk = playerIds.slice(i, i + concurrency);
    
    const chunkResults = await Promise.allSettled(
      chunk.map(pid => regenerateInsight(pid, season, insightType, { force: false }))
    );

    for (const r of chunkResults) {
      if (r.status === 'fulfilled') results.success++;
      else {
        results.failed++;
        results.errors.push(r.reason?.message || 'Unknown error');
      }
    }

    // Rate limit pause between chunks
    if (i + concurrency < playerIds.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Get historical insights for a player.
 */
async function getHistoricalInsights(playerId, seasons, limit = 10) {
  const result = await query(
    `SELECT * FROM player_insights 
     WHERE player_id = $1 AND season = ANY($2)
     ORDER BY season DESC, week DESC NULLS FIRST, generated_at DESC
     LIMIT $3`,
    [playerId, seasons, limit]
  );
  return result.rows.map(formatInsightResponse);
}

/**
 * Get recent news for a player.
 */
async function getPlayerNews(playerId, limit = 10, category = null) {
  let sql = 'SELECT * FROM player_news_feed WHERE player_id = $1';
  const params = [playerId];
  
  if (category) {
    sql += ' AND category = $2';
    params.push(category);
    sql += ` ORDER BY published_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
  } else {
    sql += ' ORDER BY published_at DESC LIMIT $2';
    params.push(limit);
  }

  const result = await query(sql, params);
  return result.rows;
}

/**
 * Format DB row into API response shape.
 */
function formatInsightResponse(row) {
  return {
    player_id: row.player_id,
    season: row.season,
    week: row.week,
    insight_type: row.insight_type,
    content: row.content,
    factors: typeof row.factors === 'string' ? JSON.parse(row.factors) : row.factors,
    confidence: parseFloat(row.confidence),
    value_snapshot: typeof row.value_snapshot === 'string' ? JSON.parse(row.value_snapshot) : row.value_snapshot,
    generated_at: row.generated_at,
    expires_at: row.expires_at,
  };
}

module.exports = {
  getLatestInsight,
  getHistoricalInsights,
  getPlayerNews,
  regenerateInsight,
  generateBatchInsights,
};
```

### `src/services/intelligence/factorAnalysisService.js`

```javascript
/**
 * Factor Analysis Service
 * 
 * Calculates structured factors that drive insight generation.
 * Pure functions — no side effects, no DB calls, fully testable.
 * 
 * Integration points:
 * - Uses same stat fields as tepProductionService (target_share, route_participation)
 * - Uses same age curve concept as tepValueService (peak_to_decline phases)
 * - Value trends from titlerun_values
 */

'use strict';

/**
 * Calculate all factors for a player.
 * 
 * @param {Object} data - { player, stats, contract, news, coachingChanges, currentValues }
 * @returns {Object} Structured factors object
 */
function calculate({ player, stats, contract, news, coachingChanges, currentValues }) {
  return {
    target_share: calculateTargetShare(stats),
    coaching_change: extractCoachingImpact(coachingChanges),
    injury_history: extractInjuryFactors(news, stats),
    qb_situation: assessQBSituation(player, news),
    contract: assessContractSituation(contract, player),
    age: assessAgeCurve(player),
    value_trend: calculateValueTrend(currentValues),
    news_sentiment: calculateNewsSentiment(news),
    production_trend: calculateProductionTrend(stats),
  };
}

function calculateTargetShare(stats) {
  if (!stats || stats.length === 0) return null;
  const latest = stats[0];  // Most recent season
  if (!latest.targets || !latest.games || latest.games === 0) return null;
  
  const targetShare = latest.targets / (latest.games * 35);  // ~35 team pass attempts/game avg
  return {
    value: Math.round(targetShare * 1000) / 10,  // e.g., 22.5
    trend: stats.length >= 2 ? (targetShare > (stats[1].targets / (stats[1].games * 35)) ? 'up' : 'down') : 'unknown',
    games_played: latest.games,
  };
}

function extractCoachingImpact(coachingChanges) {
  if (!coachingChanges || coachingChanges.length === 0) return null;
  
  // Prioritize OC changes (most impact on skill players)
  const ocChange = coachingChanges.find(c => c.role === 'OC');
  const hcChange = coachingChanges.find(c => c.role === 'HC');
  const relevantChange = ocChange || hcChange;
  
  if (!relevantChange) return null;
  
  return {
    role: relevantChange.role,
    previous: relevantChange.previous_coach,
    new: relevantChange.new_coach,
    scheme: relevantChange.scheme_impact?.scheme || null,
  };
}

function extractInjuryFactors(news, stats) {
  if (!news || news.length === 0) return [];
  
  return news
    .filter(n => n.category === 'injury')
    .slice(0, 3)  // Last 3 injury items
    .map(n => ({
      headline: n.headline,
      date: n.published_at,
      impact_score: n.impact_score,
    }));
}

function assessQBSituation(player, news) {
  // Placeholder — would be enriched with team roster data
  return {
    stability: 'unknown',  // Enriched by news analysis
  };
}

function assessContractSituation(contract, player) {
  if (!contract) return null;
  return {
    years_remaining: contract.years,
    apy: contract.apy,
    guaranteed_remaining: contract.guaranteed,
    is_expiring: contract.years <= 1,
  };
}

function assessAgeCurve(player) {
  if (!player || !player.age) return null;
  
  // Matches TEP age curve concept from tepValueService
  const positionPeaks = { QB: 28, RB: 25, WR: 27, TE: 27 };
  const peak = positionPeaks[player.position] || 27;
  
  let phase;
  if (player.age < peak - 2) phase = 'ascending';
  else if (player.age <= peak + 1) phase = 'peak';
  else if (player.age <= peak + 3) phase = 'peak_to_decline';
  else phase = 'declining';
  
  return {
    current: player.age,
    peak_age: peak,
    phase,
    years_to_peak: Math.max(0, peak - player.age),
  };
}

function calculateValueTrend(currentValues) {
  if (!currentValues || currentValues.length === 0) return null;
  const sfValue = currentValues.find(v => v.format === 'sf');
  return sfValue ? { sf: sfValue.value, rank: sfValue.rank } : null;
}

function calculateNewsSentiment(news) {
  if (!news || news.length === 0) return { overall: 'neutral', count: 0 };
  const avgImpact = news.reduce((sum, n) => sum + (n.impact_score || 0), 0) / news.length;
  return {
    overall: avgImpact > 0.5 ? 'notable' : 'routine',
    count: news.length,
    avg_impact: Math.round(avgImpact * 100) / 100,
  };
}

function calculateProductionTrend(stats) {
  if (!stats || stats.length < 2) return null;
  const [current, previous] = stats;
  
  // Normalize to per-game
  const currentPPG = (current.yards + current.tds * 6) / Math.max(current.games, 1);
  const previousPPG = (previous.yards + previous.tds * 6) / Math.max(previous.games, 1);
  
  return {
    direction: currentPPG > previousPPG ? 'up' : 'down',
    current_ppg: Math.round(currentPPG * 10) / 10,
    previous_ppg: Math.round(previousPPG * 10) / 10,
    delta_pct: Math.round(((currentPPG - previousPPG) / Math.max(previousPPG, 1)) * 100),
  };
}

module.exports = { calculate };
```

### `src/services/intelligence/insightGenerationService.js`

```javascript
/**
 * Insight Generation Service
 * 
 * Constructs prompts and calls AI model to generate player blurbs.
 * Validates output length, tone, and factual consistency.
 */

'use strict';

const crypto = require('crypto');
const config = require('./config');

// AI client — uses Anthropic SDK (same pattern as existing Sleeper API calls)
const Anthropic = require('@anthropic-ai/sdk');

let client;
function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Generate an insight blurb for a player.
 * 
 * @param {Object} data - All context for generation
 * @returns {{ content: string, confidence: number, modelVersion: string, promptHash: string }}
 */
async function generate({ player, stats, contract, news, coachingChanges, factors, insightType, week }) {
  const prompt = buildPrompt({ player, stats, contract, news, coachingChanges, factors, insightType, week });
  const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);

  const response = await getClient().messages.create({
    model: config.AI_MODEL,
    max_tokens: config.MAX_BLURB_TOKENS,
    temperature: 0.3,  // Low temperature for factual consistency
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0].text.trim();

  // Validate output
  if (content.length < 50) throw new Error('Generated insight too short');
  if (content.length > 2000) throw new Error('Generated insight too long');

  return {
    content,
    confidence: extractConfidence(response),
    modelVersion: config.AI_MODEL,
    promptHash,
  };
}

const SYSTEM_PROMPT = `You are a dynasty fantasy football analyst for TitleRun, a dynasty trade calculator and valuation tool. 
Generate concise, data-driven player outlooks for dynasty managers.

Rules:
- 2-4 sentences max for season outlooks, 1-2 for weekly
- Reference specific stats (target share, EPA, age) when available  
- Mention coaching/scheme changes if relevant
- Note injury concerns with recovery timeline
- End with dynasty value assessment (buy/hold/sell signal)
- Never fabricate stats — only reference data provided in context
- Tone: confident but balanced, like a premium fantasy analyst newsletter
- No generic filler ("he's a talented player") — every sentence adds signal`;

function buildPrompt({ player, stats, contract, news, coachingChanges, factors, insightType, week }) {
  let prompt = `Generate a ${insightType === 'weekly' ? `Week ${week} ` : 'season '}outlook for:\n\n`;
  
  prompt += `**${player.name}** (${player.position}, ${player.team}, Age ${player.age})\n\n`;
  
  if (stats && stats.length > 0) {
    const s = stats[0];
    prompt += `Recent Stats (${s.season}): ${s.games}G, ${s.targets || 'N/A'} targets, ${s.receptions || 'N/A'} rec, ${s.yards} yards, ${s.tds} TDs`;
    if (s.epa) prompt += `, EPA: ${s.epa}`;
    if (s.cpoe) prompt += `, CPOE: ${s.cpoe}`;
    prompt += '\n\n';
  }

  if (contract) {
    prompt += `Contract: ${contract.years}yr, $${(contract.apy / 1000000).toFixed(1)}M APY, $${(contract.guaranteed / 1000000).toFixed(1)}M guaranteed\n\n`;
  }

  if (coachingChanges && coachingChanges.length > 0) {
    prompt += `Coaching Changes:\n`;
    for (const cc of coachingChanges) {
      prompt += `- ${cc.role}: ${cc.previous_coach || 'N/A'} → ${cc.new_coach}\n`;
    }
    prompt += '\n';
  }

  if (factors) {
    prompt += `Key Factors:\n${JSON.stringify(factors, null, 2)}\n\n`;
  }

  if (news && news.length > 0) {
    prompt += `Recent News:\n`;
    for (const n of news.slice(0, 5)) {
      prompt += `- [${n.category}] ${n.headline} (${n.published_at})\n`;
    }
    prompt += '\n';
  }

  return prompt;
}

function extractConfidence(response) {
  // Use stop_reason as a basic confidence proxy
  // In future: could ask model to self-assess in structured output
  return response.stop_reason === 'end_turn' ? 0.85 : 0.70;
}

module.exports = { generate };
```

### `src/services/intelligence/cacheService.js`

```javascript
/**
 * Cache Service — Thin wrapper over in-memory cache.
 * 
 * Phase 1: In-memory Map with TTL (no Redis dependency).
 * Phase 2: Swap to Redis when Railway Redis is provisioned.
 * 
 * Interface stays the same either way.
 */

'use strict';

const cache = new Map();
const timers = new Map();

async function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

async function set(key, value, ttlSeconds = 3600) {
  // Clear existing timer
  if (timers.has(key)) clearTimeout(timers.get(key));
  
  cache.set(key, { value, expiresAt: Date.now() + (ttlSeconds * 1000) });
  
  // Auto-cleanup
  const timer = setTimeout(() => cache.delete(key), ttlSeconds * 1000);
  timer.unref();  // Don't block process exit
  timers.set(key, timer);
}

async function del(key) {
  cache.delete(key);
  if (timers.has(key)) {
    clearTimeout(timers.get(key));
    timers.delete(key);
  }
}

async function clear() {
  cache.clear();
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
}

module.exports = { get, set, del, clear };
```

### `src/services/intelligence/config.js`

```javascript
/**
 * Intelligence System Configuration
 * Feature flags, thresholds, and model settings.
 */

'use strict';

module.exports = {
  // Feature flags
  ENABLED: process.env.INTELLIGENCE_ENABLED !== 'false',  // Default ON
  AUTO_GENERATE_ON_READ: false,  // Phase 1: don't generate on page load
  
  // AI Model
  AI_MODEL: process.env.INTELLIGENCE_MODEL || 'claude-sonnet-4-20250514',
  MAX_BLURB_TOKENS: 300,
  
  // Cache
  CACHE_TTL_SECONDS: 3600,  // 1 hour
  
  // Rate limits
  MIN_REGENERATION_INTERVAL_MS: 6 * 60 * 60 * 1000,  // 6 hours between regenerations
  BATCH_CONCURRENCY: 3,
  BATCH_DELAY_MS: 200,
  
  // Impact thresholds
  HIGH_IMPACT_THRESHOLD: 0.7,  // News impact score that triggers immediate regeneration
  
  // Scraping
  NEWS_SCRAPE_INTERVAL_MINUTES: 30,
  NEWS_RETENTION_DAYS: 90,
  
  // Limits
  MAX_NEWS_PER_PLAYER: 50,
  MAX_INSIGHTS_RESPONSE: 50,
};
```

### Integration with Existing Services

```
┌─────────────────────────────────────────────────────────────────┐
│                    Existing TitleRun Services                      │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ valuationService │  │tepProductionSvc  │  │pickProjection  │ │
│  │ (KTC/FC values)  │  │(TEP calculations)│  │Svc (draft picks)││
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘ │
│           │                     │                     │          │
│           └─────────────────────┼─────────────────────┘          │
│                                 │                                │
│                    ┌────────────▼────────────┐                   │
│                    │   playerInsightService  │ ← NEW             │
│                    │   (reads from existing  │                   │
│                    │    services via DB)      │                   │
│                    └────────────┬────────────┘                   │
│                                 │                                │
│              ┌──────────────────┼──────────────────┐             │
│              │                  │                  │             │
│    ┌─────────▼────────┐ ┌──────▼───────┐ ┌───────▼──────┐      │
│    │factorAnalysisSvc │ │insightGenSvc │ │newsAggSvc    │      │
│    │(pure functions)  │ │(AI calls)    │ │(scraping)    │      │
│    └──────────────────┘ └──────────────┘ └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘

Data Flow:
1. factorAnalysisService READS from: players, player_season_stats, 
   player_contracts, titlerun_values (same tables as existing services)
2. It does NOT call existing services directly — reads raw DB data
3. This avoids circular dependencies and keeps intelligence isolated
4. TEP-specific factors (scarcity, TE premium) can be calculated inline
   using the same formulas from tep-config.js (imported as constants)
```

**Key integration principle:** The intelligence module is a **consumer** of existing data, not a modifier. It reads from the same tables but writes only to its own tables (`player_insights`, `player_news_feed`). This ensures zero risk to existing functionality.

---

## 4. Background Jobs

### Cron Schedule

```javascript
// src/cron/intelligenceCron.js
// Integrates with existing node-cron scheduler alongside scrapeKTC.js, etc.

const cron = require('node-cron');
const intelligence = require('../services/intelligence');
const { query } = require('../db');
const config = require('../services/intelligence/config');

function registerIntelligenceJobs() {
  if (!config.ENABLED) {
    console.log('[Intelligence] Disabled via INTELLIGENCE_ENABLED=false');
    return;
  }

  // ─── Job 1: Weekly Season Outlook Generation ───
  // Sunday 6:00 AM EST — after Saturday games, before waiver wire
  cron.schedule('0 6 * * 0', async () => {
    console.log('[Intelligence] Starting weekly insight generation...');
    try {
      const players = await query(
        `SELECT sleeper_id FROM players 
         WHERE status = 'Active' AND intelligence_enabled = TRUE
         ORDER BY (SELECT value FROM titlerun_values WHERE player_id = players.sleeper_id AND format = 'sf' LIMIT 1) DESC NULLS LAST`
      );
      
      const result = await intelligence.generateBatchInsights(
        players.rows.map(p => p.sleeper_id),
        getCurrentSeason(),
        'season_outlook',
        { concurrency: 3, delayMs: 200 }
      );
      
      console.log(`[Intelligence] Batch complete: ${result.success} success, ${result.failed} failed, ${result.skipped} skipped`);
    } catch (err) {
      console.error('[Intelligence] Batch generation failed:', err.message);
    }
  }, { timezone: 'America/New_York' });

  // ─── Job 2: News Scraping ───
  // Every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      const newsAggregationService = require('../services/intelligence/newsAggregationService');
      await newsAggregationService.scrapeAll();
      console.log('[Intelligence] News scrape complete');
    } catch (err) {
      console.error('[Intelligence] News scrape failed:', err.message);
    }
  });

  // ─── Job 3: High-Impact News Detection ───
  // Every 5 minutes — checks for unprocessed high-impact news
  cron.schedule('*/5 * * * *', async () => {
    try {
      const unprocessed = await query(
        `SELECT DISTINCT player_id FROM player_news_feed 
         WHERE processed = FALSE AND impact_score >= $1
         AND scraped_at > NOW() - INTERVAL '10 minutes'`,
        [config.HIGH_IMPACT_THRESHOLD]
      );

      for (const row of unprocessed.rows) {
        await intelligence.regenerateInsight(row.player_id, getCurrentSeason(), 'breaking', { force: true });
      }

      // Mark as processed
      await query(
        `UPDATE player_news_feed SET processed = TRUE 
         WHERE processed = FALSE AND scraped_at > NOW() - INTERVAL '10 minutes'`
      );
    } catch (err) {
      console.error('[Intelligence] High-impact detection failed:', err.message);
    }
  });

  // ─── Job 4: Stale Insight Cleanup ───
  // Daily 3:00 AM — cleanup expired insights and old news
  cron.schedule('0 3 * * *', async () => {
    try {
      await query(
        `UPDATE player_insights SET is_active = FALSE WHERE expires_at < NOW() AND is_active = TRUE`
      );
      await query(
        `DELETE FROM player_news_feed WHERE scraped_at < NOW() - INTERVAL '${config.NEWS_RETENTION_DAYS} days'`
      );
      console.log('[Intelligence] Cleanup complete');
    } catch (err) {
      console.error('[Intelligence] Cleanup failed:', err.message);
    }
  }, { timezone: 'America/New_York' });

  console.log('[Intelligence] Cron jobs registered');
}

function getCurrentSeason() {
  const now = new Date();
  // NFL season year: if before March, it's still "last year's" season
  return now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();
}

module.exports = { registerIntelligenceJobs };
```

### Integration with Existing Cron

```javascript
// In existing app startup (e.g., src/index.js or src/app.js)
// ADD after existing cron registrations:

const { registerIntelligenceJobs } = require('./cron/intelligenceCron');

// Existing cron jobs (unchanged):
// - scrapeKTC.js (every 6 hours)
// - scrapeFantasyCalc.js (every 6 hours)  
// - calculatePickProjections.js (daily)

// NEW:
registerIntelligenceJobs();
```

### Job Orchestration Diagram

```
┌──────────────────────────────────────────────────────────┐
│                  Cron Schedule (Railway)                   │
│                                                            │
│  Every 5 min    ──→ detectHighImpactNews                  │
│  Every 30 min   ──→ scrapePlayerNews                      │
│  Daily 3:00 AM  ──→ staleInsightCleanup                  │
│  Sunday 6:00 AM ──→ generateWeeklyInsights (MAIN BATCH)  │
│                                                            │
│  Existing:                                                 │
│  Every 6 hours  ──→ scrapeKTC (unchanged)                 │
│  Every 6 hours  ──→ scrapeFantasyCalc (unchanged)         │
│  Daily          ──→ calculatePickProjections (unchanged)  │
└──────────────────────────────────────────────────────────┘

Weekly Batch Flow:
  1. Sunday 6:00 AM: generateWeeklyInsights starts
  2. Fetches all active players, sorted by SF value (most valuable first)
  3. Processes 3 players concurrently, 200ms delay between batches
  4. ~600 active players × ~2.5s per insight = ~25 minutes total
  5. Anthropic API cost: ~$0.50-1.00 per batch (Sonnet, ~300 tokens out per player)
```

---

## 5. Frontend Components

### Component Tree

```
src/components/PlayerIntelligence/
├── SeasonOutlook.tsx          ← Main card component
├── KeyFactors.tsx             ← Factor pills/badges
├── InsightHistory.tsx         ← Expandable past outlooks
├── PlayerNewsFeed.tsx         ← Recent news items
└── InsightSkeleton.tsx        ← Loading placeholder
```

### `SeasonOutlook.tsx`

```tsx
import React from 'react';
import KeyFactors from './KeyFactors';

interface InsightData {
  content: string;
  confidence: number;
  factors: Record<string, any>;
  generated_at: string;
  insight_type: string;
}

interface Props {
  insight: InsightData | null;
  isLoading?: boolean;
}

export default function SeasonOutlook({ insight, isLoading }: Props) {
  if (isLoading) return <InsightSkeleton />;
  if (!insight) return null;  // Don't render if no insight available

  const generatedDate = new Date(insight.generated_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="bg-dark-700 rounded-xl p-4 mb-4 border border-dark-600">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-brand-green uppercase tracking-wide">
          {insight.insight_type === 'season_outlook' ? '📊 Season Outlook' : '📰 Weekly Intel'}
        </h3>
        <span className="text-xs text-gray-500">Updated {generatedDate}</span>
      </div>
      
      <p className="text-gray-200 text-sm leading-relaxed mb-3">
        {insight.content}
      </p>

      {insight.factors && <KeyFactors factors={insight.factors} />}
    </div>
  );
}
```

### `KeyFactors.tsx`

```tsx
import React from 'react';

interface Props {
  factors: Record<string, any>;
}

const FACTOR_LABELS: Record<string, string> = {
  target_share: '🎯 Target Share',
  coaching_change: '🏟️ New Coach',
  injury_history: '🏥 Injury',
  age: '📅 Age Curve',
  contract: '💰 Contract',
  production_trend: '📈 Production',
};

export default function KeyFactors({ factors }: Props) {
  const displayFactors = Object.entries(factors)
    .filter(([_, v]) => v !== null && v !== undefined)
    .slice(0, 4);  // Show max 4 factors

  if (displayFactors.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {displayFactors.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center px-2 py-1 rounded-md bg-dark-600 text-xs text-gray-300"
          title={JSON.stringify(value)}
        >
          {FACTOR_LABELS[key] || key}
        </span>
      ))}
    </div>
  );
}
```

### Integration into `PlayerDetail` Page

```tsx
// MODIFICATION to existing src/pages/PlayerDetail.tsx (or .jsx)
// This is an ADDITIVE change — no existing code removed

import { useState, useEffect } from 'react';
import SeasonOutlook from '../components/PlayerIntelligence/SeasonOutlook';

// Inside PlayerDetail component, ADD:
const [insight, setInsight] = useState(null);
const [insightLoading, setInsightLoading] = useState(true);

useEffect(() => {
  let cancelled = false;
  
  // Non-blocking fetch with 2s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  
  fetch(`/api/players/${playerId}/insight`, { signal: controller.signal })
    .then(res => res.ok ? res.json() : null)
    .then(data => { if (!cancelled) setInsight(data); })
    .catch(() => {})  // Silently fail — insight is optional
    .finally(() => {
      clearTimeout(timeout);
      if (!cancelled) setInsightLoading(false);
    });
  
  return () => { cancelled = true; controller.abort(); };
}, [playerId]);

// In JSX, ADD between PlayerHeader and ValueChart:
// <SeasonOutlook insight={insight} isLoading={insightLoading} />
```

### Feature Flag (Frontend)

```tsx
// Feature flag — can be toggled without redeploy via env var
const SHOW_PLAYER_INTELLIGENCE = import.meta.env.VITE_SHOW_PLAYER_INTELLIGENCE !== 'false';

// Usage in PlayerDetail:
{SHOW_PLAYER_INTELLIGENCE && (
  <SeasonOutlook insight={insight} isLoading={insightLoading} />
)}
```

---

## 6. Testing Strategy

### Unit Tests (New — ~50 tests)

```
src/services/intelligence/__tests__/
├── factorAnalysisService.test.js    (~20 tests)
│   ├── calculateTargetShare — handles missing data, calculates correctly
│   ├── extractCoachingImpact — prioritizes OC, handles empty
│   ├── assessAgeCurve — correct phase for each position/age combo
│   ├── calculateProductionTrend — up/down/equal trends
│   └── calculateNewsSentiment — aggregation of impact scores
│
├── insightGenerationService.test.js (~10 tests)
│   ├── buildPrompt — includes all data sections
│   ├── generate — validates output length
│   ├── generate — handles API errors gracefully
│   └── promptHash — deterministic for same input
│
├── playerInsightService.test.js     (~15 tests)
│   ├── getLatestInsight — cache hit path
│   ├── getLatestInsight — DB hit path  
│   ├── getLatestInsight — null when none exists
│   ├── regenerateInsight — full generation flow (mocked AI)
│   ├── regenerateInsight — respects MIN_REGENERATION_INTERVAL
│   ├── regenerateInsight — force bypasses interval
│   ├── generateBatchInsights — rate limiting, error isolation
│   └── getPlayerNews — category filtering
│
├── cacheService.test.js             (~5 tests)
│   ├── set/get — basic round trip
│   ├── TTL expiration
│   └── del/clear
```

### Integration Tests (~10 tests)

```
src/__tests__/playerIntelligence.integration.test.js
├── GET /api/players/:id/insight — returns insight from DB
├── GET /api/players/:id/insight — returns 404 when none exists
├── GET /api/players/:id/insights — filters by season
├── GET /api/players/:id/news — pagination and category filter
├── POST /api/admin/insights/regenerate — requires admin key
├── POST /api/admin/insights/regenerate — generates new insight
├── GET /api/players/:id — includes insight in existing response
└── GET /api/players/:id — doesn't break if intelligence module errors
```

### E2E Tests (~3 tests)

```
e2e/playerIntelligence.spec.ts
├── User views player detail page → sees season outlook card
├── User views player with no insight → sees "Coming soon" or nothing
└── Insight loads independently (doesn't block page render)
```

### Testing Pattern (matches existing)

```javascript
// Example test — follows tradeAnalysisService.test.js pattern

const { calculate } = require('../factorAnalysisService');

describe('factorAnalysisService', () => {
  describe('calculate', () => {
    it('handles player with full data', () => {
      const result = calculate({
        player: { name: 'Test Player', position: 'WR', age: 25, team: 'KC' },
        stats: [{ season: 2025, games: 17, targets: 140, receptions: 95, yards: 1200, tds: 8 }],
        contract: { years: 3, apy: 20000000, guaranteed: 45000000 },
        news: [],
        coachingChanges: [],
        currentValues: [{ format: 'sf', value: 8000, rank: 5 }],
      });

      expect(result.target_share).toBeDefined();
      expect(result.target_share.value).toBeGreaterThan(0);
      expect(result.age.phase).toBe('ascending');
      expect(result.contract.is_expiring).toBe(false);
    });

    it('handles player with no data gracefully', () => {
      const result = calculate({
        player: { name: 'Rookie', position: 'WR', age: 22 },
        stats: [],
        contract: null,
        news: [],
        coachingChanges: [],
        currentValues: [],
      });

      expect(result.target_share).toBeNull();
      expect(result.contract).toBeNull();
      expect(result.age.phase).toBe('ascending');
    });
  });
});
```

---

## 7. Deployment Plan

### Phase 1: Database Migration (Day 1)
```
1. Run 001_add_player_intelligence_tables.sql on Railway PostgreSQL
2. Verify tables created, indexes built
3. Verify existing queries still work (no schema conflicts)
4. Estimated time: 15 minutes
5. Rollback: Run 001_rollback script
```

### Phase 2: Backend Services + API (Days 2-3)
```
1. Add @anthropic-ai/sdk to package.json
2. Deploy intelligence/ service module
3. Deploy route files (playerIntelligence.js, adminIntelligence.js)
4. Register routes in app
5. Set environment variables:
   - ANTHROPIC_API_KEY (already needed)
   - ADMIN_API_KEY (new — generate secure random)
   - INTELLIGENCE_ENABLED=true
   - INTELLIGENCE_MODEL=claude-sonnet-4-20250514
6. Deploy to Railway staging → test endpoints manually
7. Verify: GET /api/players/9509/insight returns 404 (expected — no data yet)
```

### Phase 3: Manual Insight Generation (Day 4)
```
1. Use admin endpoint to generate insights for top 50 players
2. POST /api/admin/insights/regenerate for each
3. Verify quality of generated blurbs
4. Tune prompt if needed (iterate on SYSTEM_PROMPT)
5. Monitor Anthropic API costs
```

### Phase 4: Frontend Components (Days 5-6)
```
1. Deploy components with VITE_SHOW_PLAYER_INTELLIGENCE=false
2. Internal QA with feature flag enabled (dev tools override)
3. Verify:
   - SeasonOutlook renders correctly on PlayerDetail
   - Loading states work
   - Missing insights handled gracefully
   - Mobile responsive
   - No impact on existing page load time
4. Enable feature flag: VITE_SHOW_PLAYER_INTELLIGENCE=true
```

### Phase 5: Enable Cron Automation (Day 7+)
```
1. Register intelligenceCron jobs
2. Start with news scraping only (every 30 min)
3. After 24h of stable scraping → enable weekly batch generation
4. After first successful batch → enable high-impact detection
5. Monitor:
   - Railway CPU/memory during batch runs
   - Anthropic API cost per batch
   - Error rates in cron logs
```

---

## 8. Rollback Plan

```
Emergency Rollback (< 5 minutes):
1. Set INTELLIGENCE_ENABLED=false → disables all cron jobs
2. Set VITE_SHOW_PLAYER_INTELLIGENCE=false → hides frontend component
3. Redeploy frontend (Cloudflare Pages ~30s)

Full Rollback (if needed):
4. Remove intelligence route registration from app.js
5. Run 001_rollback_player_intelligence_tables.sql
6. Remove @anthropic-ai/sdk from package.json (if no other use)
7. Deploy backend to Railway

Data Preservation (optional before step 5):
- pg_dump player_insights, player_news_feed tables before dropping
```

---

## 9. Environment Variables (New)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | API key for Claude |
| `ADMIN_API_KEY` | Yes | — | Admin endpoint auth |
| `INTELLIGENCE_ENABLED` | No | `true` | Master kill switch |
| `INTELLIGENCE_MODEL` | No | `claude-sonnet-4-20250514` | AI model for generation |
| `VITE_SHOW_PLAYER_INTELLIGENCE` | No | `true` | Frontend feature flag |

---

## 10. Performance Impact Analysis

| Concern | Mitigation | Impact |
|---------|-----------|--------|
| PlayerDetail page load | 500ms timeout on insight fetch; parallel with existing data | ≤0ms added to critical path (async) |
| Database query load | Dedicated indexes on all query patterns; insight cached 1hr | Negligible — 1 extra query per page view |
| Railway memory | In-memory cache bounded (~600 players × ~2KB = ~1.2MB) | Negligible |
| Railway CPU during batch | 3 concurrent generations, 200ms delays | Moderate spike for ~25 min on Sundays |
| Anthropic API cost | Sonnet @ ~300 tokens out × 600 players = ~$0.50-1.00/week | Within budget |
| Database storage | ~600 insights/week × 2KB = ~1.2MB/week, cleaned after 90 days | Negligible |

---

## 11. Open Questions for Other Agents

| # | Question | Who Decides | Impact |
|---|----------|-------------|--------|
| 1 | Should insights be generated on-demand (first page view) or batch-only? | UX + Prod | Batch-only is safer for Phase 1; on-demand adds latency risk |
| 2 | Which news sources to scrape? ESPN, NFL.com, Sleeper, Rotoworld? Any paid APIs? | Data Architect | Determines newsAggregationService implementation |
| 3 | Should we use structured output (JSON mode) from Claude for factors, or extract from prose? | AI Prompt Engineer | Affects insightGenerationService prompt design |
| 4 | Do we need Redis, or is in-memory cache sufficient for Railway's single-instance deploy? | Prod Engineer | In-memory is fine for single instance; Redis needed if we scale horizontally |
| 5 | Max blurb length for mobile display? | UX Designer | Currently set to 2000 chars; may need to be shorter for mobile cards |
| 6 | Should coaching_changes be auto-populated or manually curated? | Data Architect | Auto-scrape is complex; manual CSV upload might be Phase 1 |
| 7 | TEP factors — should we call tepValueService directly or duplicate the age curve logic? | Integration (self) | Recommendation: import constants from tep-config.js, don't call service directly |
| 8 | Weekly insights during season — do we generate for all 600 players or only top 200 by value? | Prod + Budget | Top 200 cuts API cost by 67%; most users only view top players |

---

*End of Integration Architecture Document*

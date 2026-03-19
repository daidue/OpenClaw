# Context Intelligence Layer — Architecture Design

**Author:** Rush (TitleRun Owner/Operator)  
**Date:** 2026-03-18  
**Status:** Design Document — Ready for Implementation  
**Priority:** HIGH — Pre-launch trust feature  

---

## Executive Summary

The Context Intelligence Layer enriches Trade Finder recommendations with real-world player context (injuries, position changes, suspensions, expert rankings, breakout/bust signals). This prevents catastrophic recommendation failures like "Trade for Travis Hunter" when he's on IR with a torn ACL and transitioning to CB-only.

**Key Insight:** We already have a Player Intelligence architecture (`player-intelligence-integration-architecture.md`) with `player_news_feed`, `player_insights`, and `coaching_changes` tables. This design **extends that foundation** rather than creating parallel infrastructure.

**Effort:** ~40 hours across 3 weeks  
**Cost:** $0 (free APIs + existing Sleeper integration)  
**Impact:** Blocks bad trade recommendations, surfaces actionable insights, builds user trust

---

## 1. Problem Statement

### Current State
Trade Finder generates candidates using:
- TitleRun Bayesian values (10-source composite)
- Lineup simulation (pre/post impact)
- Acceptance prediction (10-factor model)
- Dynasty outlook (age curves)
- Championship equity (Monte Carlo, top 5 trades)

### What's Missing
The system operates in a **vacuum** — it knows player values and lineup math but nothing about the real world:

| Missing Context | Example Failure | User Impact |
|----------------|-----------------|-------------|
| Injuries | Recommends IR player as WR2 upgrade | User looks clueless proposing trade |
| Position changes | Values dual-sport player at WR when NFL uses him at CB | Value is fantasy-irrelevant |
| Suspensions | Recommends suspended player for championship push | Wastes limited trade capital |
| Expert consensus | Our rank differs wildly from ECR with no explanation | Erodes trust in our values |
| Breakout signals | Misses trending player everyone is buying | User gets outbid by savvy managers |
| Bust signals | Recommends buying hype player at peak | User overpays, roster regresses |

### Success Criteria
1. **Zero false negatives** on critical alerts (IR, suspended, out-for-season)
2. **<2% false positive rate** on blocking healthy players
3. **90%+ coverage** of rostered players with fresh context (<24h for injuries, <7d for rankings)
4. **Context visible** on every trade card in Trade Finder results

---

## 2. Architecture — Extending Player Intelligence

### Relationship to Existing Design

The existing `player-intelligence-integration-architecture.md` defines:
- `player_news_feed` — raw news items from multiple sources
- `player_insights` — generated intelligence blurbs (season outlooks, weekly)
- `coaching_changes` — OC/HC changes affecting player value

**This design adds a new focused table** for structured, machine-readable context that the Trade Finder can query programmatically (not prose blurbs):

```
players (sleeper_id PK)
  ├── player_news_feed (existing design)     — raw news
  ├── player_insights (existing design)      — prose blurbs  
  ├── coaching_changes (existing design)     — scheme changes
  ├── player_context (NEW)                   — structured flags/metrics
  └── context_alerts (NEW)                   — time-boxed warnings
```

### Why a Separate Table?

`player_insights` stores **prose** ("Terry McLaurin enters 2026 as WAS's undisputed WR1..."). That's great for display but useless for programmatic filtering. Trade Finder needs:
- `WHERE injury_status != 'IR'` — can't parse prose for this
- `WHERE breakout_candidate = true` — boolean flags for sorting
- `WHERE weeks_out < 4` — numeric thresholds for filtering

---

## 3. Database Schema

### Migration: `002_add_context_intelligence.sql`

```sql
-- ============================================================
-- Migration 002: Context Intelligence Layer
-- Run against: titlerun PostgreSQL (Railway)
-- Depends on: players table (sleeper_id PK)
-- Rollback: 002_rollback_context_intelligence.sql
-- ============================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Player Context — Structured flags and metrics
-- Machine-readable context for Trade Finder filtering/enrichment
-- ---------------------------------------------------------
CREATE TABLE player_context (
  player_id           VARCHAR(20) NOT NULL REFERENCES players(sleeper_id) ON DELETE CASCADE,
  
  -- Injury Data (Tier 1 — blocks bad trades)
  injury_status       VARCHAR(20),          -- Active, Questionable, Doubtful, Out, IR, PUP, Suspended
  injury_body_part    VARCHAR(100),          -- Knee (ACL), Hamstring, Concussion, etc.
  injury_notes        TEXT,                  -- Free-text details
  injury_updated_at   TIMESTAMPTZ,          -- When injury data was last refreshed
  estimated_return    DATE,                 -- Best-guess return date (NULL = unknown)
  weeks_out           SMALLINT DEFAULT 0,   -- Estimated weeks until return (0 = active/healthy)
  
  -- Position Data (Tier 1 — blocks bad trades)
  position_change_flag  BOOLEAN DEFAULT FALSE,  -- True if expected to change fantasy position
  position_change_to    VARCHAR(10),            -- e.g., 'CB' for Travis Hunter scenario
  position_notes        TEXT,
  
  -- Suspension/Off-field (Tier 1)
  is_suspended        BOOLEAN DEFAULT FALSE,
  suspension_games    SMALLINT DEFAULT 0,       -- Games remaining
  suspension_reason   VARCHAR(255),
  
  -- Team Status (Tier 1)
  is_free_agent       BOOLEAN DEFAULT FALSE,
  trade_rumor         BOOLEAN DEFAULT FALSE,    -- Rumored to be traded
  released            BOOLEAN DEFAULT FALSE,    -- Cut from NFL roster
  
  -- Expert Rankings (Tier 2 — improves recommendations)
  ecr_dynasty_rank    SMALLINT,                 -- FantasyPros/KTC dynasty consensus rank
  ecr_dynasty_tier    SMALLINT,                 -- Tier 1-10
  ecr_redraft_rank    SMALLINT,                 -- Redraft rank (seasonal context)
  ecr_source          VARCHAR(50),              -- 'fantasypros', 'ktc', 'composite'
  ecr_updated_at      TIMESTAMPTZ,
  
  -- Opportunity Metrics (Tier 2)
  nfl_team            VARCHAR(5),               -- Current NFL team
  depth_chart_order   SMALLINT,                 -- 1 = starter, 2 = backup, etc.
  target_share_pct    DECIMAL(5,2),             -- Season/recent average
  snap_pct            DECIMAL(5,2),             -- Snap count percentage
  opportunity_updated_at TIMESTAMPTZ,
  
  -- Sentiment & Signals (Tier 2)
  expert_sentiment    VARCHAR(20),              -- bullish, neutral, bearish
  breakout_candidate  BOOLEAN DEFAULT FALSE,
  bust_candidate      BOOLEAN DEFAULT FALSE,
  sell_high           BOOLEAN DEFAULT FALSE,    -- Overvalued, sell now
  buy_low             BOOLEAN DEFAULT FALSE,    -- Undervalued, buy now
  sentiment_notes     TEXT,                     -- Why flagged
  sentiment_updated_at TIMESTAMPTZ,
  
  -- Contract (Tier 3 — adds color)
  contract_years      SMALLINT,
  is_holdout          BOOLEAN DEFAULT FALSE,
  is_franchise_tagged BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_freshness      VARCHAR(20) DEFAULT 'stale', -- fresh (<24h), aging (24-72h), stale (>72h)
  
  PRIMARY KEY (player_id)
);

-- Performance indexes for Trade Finder queries
CREATE INDEX idx_ctx_injury_status ON player_context(injury_status) WHERE injury_status IS NOT NULL;
CREATE INDEX idx_ctx_breakout ON player_context(breakout_candidate) WHERE breakout_candidate = TRUE;
CREATE INDEX idx_ctx_bust ON player_context(bust_candidate) WHERE bust_candidate = TRUE;
CREATE INDEX idx_ctx_updated ON player_context(updated_at);
CREATE INDEX idx_ctx_freshness ON player_context(data_freshness);

-- ---------------------------------------------------------
-- 2. Context Alerts — Time-boxed warnings
-- Critical notifications that expire (e.g., "Out this week")
-- ---------------------------------------------------------
CREATE TABLE context_alerts (
  id              BIGSERIAL PRIMARY KEY,
  player_id       VARCHAR(20) NOT NULL REFERENCES players(sleeper_id) ON DELETE CASCADE,
  alert_type      VARCHAR(50) NOT NULL,         -- injury, position_change, suspension, breakout, bust, trade_rumor, released
  severity        VARCHAR(20) NOT NULL,          -- critical, high, medium, low
  title           VARCHAR(255) NOT NULL,         -- Short headline: "Season-Ending ACL Tear"
  message         TEXT NOT NULL,                 -- Full explanation
  details         JSONB DEFAULT '{}',            -- Structured metadata
  source          VARCHAR(100),                  -- Where this came from
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,                   -- NULL = permanent until resolved
  resolved_at     TIMESTAMPTZ,                   -- When alert was cleared
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  
  CONSTRAINT chk_severity CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  CONSTRAINT chk_alert_type CHECK (alert_type IN (
    'injury', 'position_change', 'suspension', 'breakout', 'bust', 
    'trade_rumor', 'released', 'coaching_change', 'depth_chart_change'
  ))
);

CREATE INDEX idx_alerts_player_active ON context_alerts(player_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_alerts_severity ON context_alerts(severity, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_alerts_expires ON context_alerts(expires_at) WHERE is_active = TRUE AND expires_at IS NOT NULL;
CREATE INDEX idx_alerts_type ON context_alerts(alert_type, is_active) WHERE is_active = TRUE;

-- ---------------------------------------------------------
-- 3. Context update log — audit trail for data pipeline
-- ---------------------------------------------------------
CREATE TABLE context_update_log (
  id              BIGSERIAL PRIMARY KEY,
  source          VARCHAR(50) NOT NULL,          -- 'sleeper', 'espn', 'fantasypros', 'manual'
  players_updated INTEGER DEFAULT 0,
  alerts_created  INTEGER DEFAULT 0,
  errors          INTEGER DEFAULT 0,
  duration_ms     INTEGER,
  details         JSONB DEFAULT '{}',
  run_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ctx_log_run ON context_update_log(run_at DESC);

COMMIT;
```

### Rollback: `002_rollback_context_intelligence.sql`

```sql
BEGIN;
DROP TABLE IF EXISTS context_update_log;
DROP TABLE IF EXISTS context_alerts;
DROP TABLE IF EXISTS player_context;
COMMIT;
```

---

## 4. Data Sources — Prioritized by Value & Feasibility

### Tier 1: Day-1 Sources (Week 1)

| Source | Data | Method | Rate Limit | Reliability |
|--------|------|--------|------------|-------------|
| **Sleeper API** | Injury status, injury notes, team, position | REST API (`/players/nfl`) | None (bulk fetch) | ★★★★★ Already integrated |
| **ESPN API** | Injury reports, player news, transactions | Public REST | ~100/min | ★★★★☆ Stable public API |

**Sleeper API** — already in `sleeperService.js` (currently a stub, but the full version uses `/players/nfl`):
```javascript
// The /players/nfl endpoint returns ALL players with:
// - injury_status: "IR", "Out", "Doubtful", "Questionable", "Probable", null
// - injury_body_part: "Knee", "Hamstring", etc.
// - injury_notes: free text
// - injury_start_date: when injury was reported
// - status: "Active", "Inactive", "Injured Reserve"
// - team: current NFL team (null = free agent)
// - position: fantasy-relevant position
// - search_rank: Sleeper's internal ranking (proxy for value/activity)
// - trending_value: hot adds (breakout signal)
```

**ESPN API** — free, no auth required:
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{teamId}/injuries
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?player={playerId}
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/transactions
```

### Tier 2: Week 2-3 Sources

| Source | Data | Method | Rate Limit | Reliability |
|--------|------|--------|------------|-------------|
| **KeepTradeCut** | Dynasty rankings, crowd values | Scrape public page | Respect robots.txt | ★★★★☆ Stable |
| **Sleeper Trending** | Hot adds/drops (breakout signal) | REST API | None | ★★★★★ |
| **Reddit r/DynastyFF** | Community sentiment, breakout buzz | Reddit JSON API | 60/min | ★★★☆☆ Noisy |

### Tier 3: Month 2 Sources

| Source | Data | Method | Rate Limit | Reliability |
|--------|------|--------|------------|-------------|
| **Pro Football Reference** | Target share, snap %, depth charts | Scrape | Aggressive bot detection | ★★☆☆☆ |
| **FantasyPros** | ECR (expert consensus rankings) | API (free tier) | 10 calls/day | ★★★★☆ |
| **TeamRankings** | Team pass/rush rates | Scrape | Unknown | ★★★☆☆ |

### Source Prioritization Rationale

**Sleeper first** because:
1. Already integrated (just need to use more fields from `/players/nfl`)
2. No rate limits on bulk fetch
3. Injury data is sourced from official NFL reports
4. Includes trending data (breakout signals)
5. Player IDs match our entire system (no mapping needed)

---

## 5. Service Architecture

### New Service: `contextIntelligenceService.js`

```
src/services/
  ├── contextIntelligenceService.js   ← NEW: Data pipeline + context queries
  ├── tradeFinderService.js           ← MODIFIED: Integrates context
  ├── acceptancePredictionService.js  ← MODIFIED: Context-aware acceptance
  ├── championshipEquityCalculator.js ← MODIFIED: Injury-adjusted equity
  └── sleeperService.js              ← ENHANCED: Expose injury fields
```

### `contextIntelligenceService.js` — Core Module

```javascript
/**
 * Context Intelligence Service
 * 
 * Provides real-world player context for Trade Finder enrichment.
 * 
 * Responsibilities:
 * 1. Fetch context data from external sources (Sleeper, ESPN)
 * 2. Store/update player_context table
 * 3. Generate context_alerts for critical changes
 * 4. Provide query interface for Trade Finder
 * 
 * Design: In-memory cache with DB persistence. Cache refreshed every 4h.
 * Trade Finder reads from cache (fast), background job writes to DB (durable).
 */

const sleeperService = require('./sleeperService');
const logger = require('../utils/logger').child({ service: 'context-intel' });

// ─── In-Memory Context Cache ──────────────────────────────────
// Trade Finder reads this synchronously for zero-latency enrichment.
// Refreshed from DB on startup + every 4 hours.

let contextCache = new Map();  // player_id → context object
let alertCache = new Map();    // player_id → [active alerts]
let lastRefresh = null;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// ─── Public API ────────────────────────────────────────────────

/**
 * Get context for a single player. Returns null if no context available.
 * Used by Trade Finder for per-player enrichment.
 */
function getPlayerContext(playerId) {
  return contextCache.get(String(playerId)) || null;
}

/**
 * Get context for multiple players at once. Returns Map<playerId, context>.
 * Used by Trade Finder for batch enrichment of candidates.
 */
function getPlayerContextBatch(playerIds) {
  const result = {};
  for (const id of playerIds) {
    const ctx = contextCache.get(String(id));
    if (ctx) result[String(id)] = ctx;
  }
  return result;
}

/**
 * Get active alerts for a player. Returns array of alerts, newest first.
 */
function getPlayerAlerts(playerId) {
  return alertCache.get(String(playerId)) || [];
}

/**
 * Check if a player has any critical/high alerts that should block trades.
 * Returns { blocked: boolean, reason: string | null, alerts: Alert[] }
 */
function checkTradeBlockers(playerId) {
  const ctx = getPlayerContext(playerId);
  const alerts = getPlayerAlerts(playerId);
  
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  
  // Tier 1 blocks: These should prevent recommending a trade
  if (ctx) {
    if (ctx.injury_status === 'IR' && ctx.weeks_out > 8) {
      return {
        blocked: true,
        reason: `Season-ending injury (${ctx.injury_body_part || 'undisclosed'})`,
        severity: 'critical',
        alerts: criticalAlerts
      };
    }
    if (ctx.is_suspended && ctx.suspension_games > 4) {
      return {
        blocked: true,
        reason: `Suspended ${ctx.suspension_games} games (${ctx.suspension_reason || 'undisclosed'})`,
        severity: 'critical',
        alerts: criticalAlerts
      };
    }
    if (ctx.position_change_flag) {
      return {
        blocked: true,
        reason: `Expected position change to ${ctx.position_change_to} (no fantasy value at current position)`,
        severity: 'critical',
        alerts: criticalAlerts
      };
    }
    if (ctx.released) {
      return {
        blocked: true,
        reason: 'Released from NFL roster — no current team',
        severity: 'high',
        alerts: criticalAlerts
      };
    }
  }
  
  return { blocked: false, reason: null, severity: null, alerts };
}

/**
 * Get context warnings for trade display (non-blocking).
 * Returns { warnings: string[], insights: string[], badges: Badge[] }
 */
function getTradeContextDisplay(playerIds) {
  const warnings = [];
  const insights = [];
  const badges = [];
  
  for (const playerId of playerIds) {
    const ctx = getPlayerContext(playerId);
    if (!ctx) continue;
    
    const name = ctx.player_name || 'Unknown';
    
    // Warnings (⚠️)
    if (ctx.injury_status && !['Active', null].includes(ctx.injury_status)) {
      const severity = ['IR', 'Out'].includes(ctx.injury_status) ? 'critical' : 
                       ctx.injury_status === 'Doubtful' ? 'high' : 'medium';
      warnings.push({
        text: `${name} — ${ctx.injury_status}${ctx.injury_body_part ? ` (${ctx.injury_body_part})` : ''}`,
        severity,
        weeksOut: ctx.weeks_out
      });
    }
    if (ctx.is_suspended) {
      warnings.push({
        text: `${name} — Suspended (${ctx.suspension_games} games remaining)`,
        severity: 'critical'
      });
    }
    if (ctx.position_change_flag) {
      warnings.push({
        text: `${name} — May transition to ${ctx.position_change_to}`,
        severity: 'high'
      });
    }
    if (ctx.bust_candidate) {
      warnings.push({
        text: `${name} — Bust candidate (${ctx.sentiment_notes || 'declining metrics'})`,
        severity: 'medium'
      });
    }
    if (ctx.trade_rumor) {
      warnings.push({
        text: `${name} — Trade rumors (value volatile)`,
        severity: 'medium'
      });
    }
    
    // Insights (💎)
    if (ctx.breakout_candidate) {
      insights.push({
        text: `${name} — Breakout candidate 📈`,
        type: 'breakout'
      });
    }
    if (ctx.depth_chart_order === 1) {
      insights.push({
        text: `${name} — Starter on ${ctx.nfl_team}`,
        type: 'starter'
      });
    }
    if (ctx.buy_low) {
      insights.push({
        text: `${name} — Buy-low window (undervalued)`,
        type: 'buy_low'
      });
    }
    if (ctx.sell_high) {
      insights.push({
        text: `${name} — Sell-high candidate (overvalued)`,
        type: 'sell_high'
      });
    }
    if (ctx.ecr_dynasty_rank && ctx.ecr_dynasty_rank <= 30) {
      insights.push({
        text: `${name} — Expert consensus: Top ${ctx.ecr_dynasty_rank} dynasty`,
        type: 'ecr'
      });
    }
    if (ctx.target_share_pct && ctx.target_share_pct >= 25) {
      insights.push({
        text: `${name} — ${ctx.target_share_pct}% target share (elite)`,
        type: 'opportunity'
      });
    }
    
    // Badges (compact UI indicators)
    if (ctx.injury_status === 'IR') badges.push({ label: 'IR', color: 'red', playerId });
    if (ctx.injury_status === 'Out') badges.push({ label: 'OUT', color: 'red', playerId });
    if (ctx.injury_status === 'Doubtful') badges.push({ label: 'D', color: 'orange', playerId });
    if (ctx.injury_status === 'Questionable') badges.push({ label: 'Q', color: 'yellow', playerId });
    if (ctx.breakout_candidate) badges.push({ label: '📈', color: 'green', playerId });
    if (ctx.bust_candidate) badges.push({ label: '📉', color: 'red', playerId });
    if (ctx.is_suspended) badges.push({ label: 'SUS', color: 'red', playerId });
  }
  
  return { warnings, insights, badges };
}

// ─── Data Pipeline ─────────────────────────────────────────────

/**
 * Full context refresh — called by daily cron job.
 * Fetches from all configured sources, merges, upserts to DB.
 */
async function refreshAllContext(db) {
  const startTime = Date.now();
  let playersUpdated = 0;
  let alertsCreated = 0;
  let errors = 0;
  
  logger.info('[ContextIntel] Starting full context refresh...');
  
  try {
    // ── Source 1: Sleeper API (bulk player data) ──
    const sleeperContext = await fetchSleeperContext();
    const sleeperCount = await upsertContextBatch(db, sleeperContext, 'sleeper');
    playersUpdated += sleeperCount;
    logger.info(`[ContextIntel] Sleeper: ${sleeperCount} players updated`);
    
  } catch (err) {
    logger.error('[ContextIntel] Sleeper fetch failed', { error: err.message });
    errors++;
  }
  
  try {
    // ── Source 2: ESPN injuries (per-team) ──
    const espnContext = await fetchESPNInjuries();
    const espnCount = await upsertContextBatch(db, espnContext, 'espn');
    playersUpdated += espnCount;
    logger.info(`[ContextIntel] ESPN: ${espnCount} players updated`);
    
  } catch (err) {
    logger.error('[ContextIntel] ESPN fetch failed', { error: err.message });
    errors++;
  }
  
  try {
    // ── Source 3: Generate alerts for critical changes ──
    alertsCreated = await generateAlerts(db);
    logger.info(`[ContextIntel] Generated ${alertsCreated} new alerts`);
    
  } catch (err) {
    logger.error('[ContextIntel] Alert generation failed', { error: err.message });
    errors++;
  }
  
  // ── Refresh in-memory cache from DB ──
  await refreshCache(db);
  
  // ── Log the run ──
  const durationMs = Date.now() - startTime;
  try {
    await db.query(`
      INSERT INTO context_update_log (source, players_updated, alerts_created, errors, duration_ms)
      VALUES ('full_refresh', $1, $2, $3, $4)
    `, [playersUpdated, alertsCreated, errors, durationMs]);
  } catch (err) {
    logger.error('[ContextIntel] Failed to log update', { error: err.message });
  }
  
  logger.info('[ContextIntel] Full refresh complete', { playersUpdated, alertsCreated, errors, durationMs });
  return { playersUpdated, alertsCreated, errors, durationMs };
}

/**
 * Fetch context from Sleeper API's /players/nfl endpoint.
 * Returns array of { player_id, injury_status, injury_body_part, ... }
 */
async function fetchSleeperContext() {
  // The full Sleeper /players/nfl endpoint returns ~10K players
  // We only care about rostered/relevant players
  // This data is already fetched by valuationService — we just need to use more fields
  
  const response = await fetch('https://api.sleeper.app/v1/players/nfl');
  if (!response.ok) throw new Error(`Sleeper API failed: ${response.status}`);
  
  const players = await response.json();
  const contexts = [];
  
  for (const [sleeperId, player] of Object.entries(players)) {
    // Only process fantasy-relevant players (QB, RB, WR, TE)
    if (!['QB', 'RB', 'WR', 'TE'].includes(player.position)) continue;
    // Skip players with no activity/value (too old, retired, etc.)
    if (!player.team && !player.injury_status && (player.years_exp || 0) > 15) continue;
    
    contexts.push({
      player_id: sleeperId,
      player_name: player.full_name || `${player.first_name} ${player.last_name}`,
      injury_status: mapSleeperInjuryStatus(player.injury_status, player.status),
      injury_body_part: player.injury_body_part || null,
      injury_notes: player.injury_notes || null,
      injury_updated_at: player.injury_start_date ? new Date(player.injury_start_date) : null,
      weeks_out: estimateWeeksOut(player.injury_status, player.status),
      nfl_team: player.team || null,
      is_free_agent: !player.team,
      depth_chart_order: player.depth_chart_order || null,
      // Sleeper trending data as breakout signal
      breakout_candidate: (player.search_rank || 9999) < 50 && (player.years_exp || 0) <= 3,
    });
  }
  
  return contexts;
}

/**
 * Map Sleeper injury statuses to our normalized format.
 */
function mapSleeperInjuryStatus(injuryStatus, playerStatus) {
  if (playerStatus === 'Injured Reserve') return 'IR';
  if (playerStatus === 'Physically Unable to Perform') return 'PUP';
  if (playerStatus === 'Suspended') return 'Suspended';
  
  switch (injuryStatus) {
    case 'IR': return 'IR';
    case 'Out': return 'Out';
    case 'Doubtful': return 'Doubtful';
    case 'Questionable': return 'Questionable';
    case 'Probable': return 'Active'; // Probable ≈ playing
    case 'PUP': return 'PUP';
    case 'Suspended': return 'Suspended';
    default: return 'Active';
  }
}

/**
 * Estimate weeks out based on injury status.
 * Conservative estimates — better to over-warn than under-warn.
 */
function estimateWeeksOut(injuryStatus, playerStatus) {
  if (playerStatus === 'Injured Reserve') return 12; // IR = minimum 4 weeks, often season
  if (playerStatus === 'Physically Unable to Perform') return 16; // PUP = start of season
  if (injuryStatus === 'Out') return 2; // Game-time out, usually 1-2 weeks
  if (injuryStatus === 'Doubtful') return 1;
  if (injuryStatus === 'Questionable') return 0; // Usually plays
  return 0;
}

/**
 * Fetch ESPN injury data per team.
 * ESPN team IDs: 1-32 for NFL teams.
 */
async function fetchESPNInjuries() {
  const ESPN_TEAM_IDS = Array.from({ length: 32 }, (_, i) => i + 1);
  const contexts = [];
  
  // Fetch in batches of 8 with 500ms delays to avoid rate limiting
  for (let i = 0; i < ESPN_TEAM_IDS.length; i += 8) {
    const batch = ESPN_TEAM_IDS.slice(i, i + 8);
    const results = await Promise.allSettled(
      batch.map(teamId => fetchESPNTeamInjuries(teamId))
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        contexts.push(...result.value);
      }
    }
    
    // Rate limit: 500ms between batches
    if (i + 8 < ESPN_TEAM_IDS.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return contexts;
}

async function fetchESPNTeamInjuries(teamId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/injuries`;
  const response = await fetch(url);
  if (!response.ok) return [];
  
  const data = await response.json();
  const injuries = [];
  
  // ESPN injury data structure varies — defensive parsing
  const items = data.injuries || data.team?.injuries || [];
  for (const item of items) {
    if (!item.athlete) continue;
    
    // We need to map ESPN player ID → Sleeper player ID
    // This requires a mapping table or name-based fuzzy match
    // For MVP: store by name, resolve IDs during merge
    injuries.push({
      espn_id: String(item.athlete.id),
      player_name: item.athlete.displayName,
      injury_status: mapESPNStatus(item.status),
      injury_body_part: item.type?.description || item.details?.detail || null,
      injury_notes: item.longComment || item.shortComment || null,
    });
  }
  
  return injuries;
}

function mapESPNStatus(status) {
  switch (status?.toLowerCase()) {
    case 'injured reserve': return 'IR';
    case 'out': return 'Out';
    case 'doubtful': return 'Doubtful';
    case 'questionable': return 'Questionable';
    case 'probable': return 'Active';
    case 'suspended': return 'Suspended';
    case 'physically unable to perform': return 'PUP';
    default: return null; // Unknown
  }
}

// ─── Database Operations ───────────────────────────────────────

async function upsertContextBatch(db, contexts, source) {
  if (!contexts.length) return 0;
  
  let updated = 0;
  // Batch upsert in chunks of 100
  for (let i = 0; i < contexts.length; i += 100) {
    const batch = contexts.slice(i, i + 100);
    
    for (const ctx of batch) {
      try {
        await db.query(`
          INSERT INTO player_context (
            player_id, injury_status, injury_body_part, injury_notes,
            injury_updated_at, weeks_out, nfl_team, is_free_agent,
            depth_chart_order, breakout_candidate, updated_at, data_freshness
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), 'fresh')
          ON CONFLICT (player_id) DO UPDATE SET
            injury_status = COALESCE(EXCLUDED.injury_status, player_context.injury_status),
            injury_body_part = COALESCE(EXCLUDED.injury_body_part, player_context.injury_body_part),
            injury_notes = COALESCE(EXCLUDED.injury_notes, player_context.injury_notes),
            injury_updated_at = COALESCE(EXCLUDED.injury_updated_at, player_context.injury_updated_at),
            weeks_out = COALESCE(EXCLUDED.weeks_out, player_context.weeks_out),
            nfl_team = COALESCE(EXCLUDED.nfl_team, player_context.nfl_team),
            is_free_agent = COALESCE(EXCLUDED.is_free_agent, player_context.is_free_agent),
            depth_chart_order = COALESCE(EXCLUDED.depth_chart_order, player_context.depth_chart_order),
            breakout_candidate = COALESCE(EXCLUDED.breakout_candidate, player_context.breakout_candidate),
            updated_at = NOW(),
            data_freshness = 'fresh'
        `, [
          ctx.player_id, ctx.injury_status, ctx.injury_body_part, ctx.injury_notes,
          ctx.injury_updated_at, ctx.weeks_out, ctx.nfl_team, ctx.is_free_agent,
          ctx.depth_chart_order, ctx.breakout_candidate
        ]);
        updated++;
      } catch (err) {
        logger.debug(`[ContextIntel] Upsert failed for ${ctx.player_id}`, { error: err.message });
      }
    }
  }
  
  return updated;
}

async function generateAlerts(db) {
  // Find players whose context changed significantly since last check
  const result = await db.query(`
    SELECT player_id, injury_status, weeks_out, is_suspended, 
           suspension_games, position_change_flag, position_change_to,
           released, player_name
    FROM player_context 
    WHERE updated_at > NOW() - INTERVAL '24 hours'
      AND (
        injury_status IN ('IR', 'Out', 'Suspended')
        OR weeks_out > 8
        OR is_suspended = TRUE
        OR position_change_flag = TRUE
        OR released = TRUE
      )
  `);
  
  let created = 0;
  for (const row of result.rows || []) {
    const alertType = row.is_suspended ? 'suspension' :
                      row.released ? 'released' :
                      row.position_change_flag ? 'position_change' :
                      'injury';
    
    const severity = (row.weeks_out > 8 || row.is_suspended || row.released) ? 'critical' : 'high';
    
    const title = row.is_suspended ? `${row.player_name} Suspended` :
                  row.released ? `${row.player_name} Released` :
                  row.position_change_flag ? `${row.player_name} Position Change` :
                  `${row.player_name} — ${row.injury_status}`;
    
    const message = row.is_suspended ? `Suspended for ${row.suspension_games} games` :
                    row.released ? 'Released from NFL roster — no current team' :
                    row.position_change_flag ? `Expected to transition to ${row.position_change_to}` :
                    `${row.injury_status} — estimated ${row.weeks_out} weeks out`;
    
    try {
      await db.query(`
        INSERT INTO context_alerts (player_id, alert_type, severity, title, message, source)
        VALUES ($1, $2, $3, $4, $5, 'auto')
        ON CONFLICT DO NOTHING
      `, [row.player_id, alertType, severity, title, message]);
      created++;
    } catch (err) {
      logger.debug(`[ContextIntel] Alert creation failed`, { error: err.message });
    }
  }
  
  return created;
}

async function refreshCache(db) {
  try {
    const contextResult = await db.query('SELECT * FROM player_context');
    const alertResult = await db.query(`
      SELECT * FROM context_alerts 
      WHERE is_active = TRUE 
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
    `);
    
    const newContextCache = new Map();
    for (const row of contextResult.rows || []) {
      newContextCache.set(String(row.player_id), row);
    }
    
    const newAlertCache = new Map();
    for (const row of alertResult.rows || []) {
      const pid = String(row.player_id);
      if (!newAlertCache.has(pid)) newAlertCache.set(pid, []);
      newAlertCache.get(pid).push(row);
    }
    
    contextCache = newContextCache;
    alertCache = newAlertCache;
    lastRefresh = Date.now();
    
    logger.info('[ContextIntel] Cache refreshed', {
      players: contextCache.size,
      playersWithAlerts: alertCache.size
    });
  } catch (err) {
    logger.error('[ContextIntel] Cache refresh failed', { error: err.message });
  }
}

module.exports = {
  // Query API (synchronous, reads from cache)
  getPlayerContext,
  getPlayerContextBatch,
  getPlayerAlerts,
  checkTradeBlockers,
  getTradeContextDisplay,
  
  // Data pipeline (async, writes to DB)
  refreshAllContext,
  fetchSleeperContext,
  fetchESPNInjuries,
  refreshCache,
  
  // For testing
  mapSleeperInjuryStatus,
  estimateWeeksOut,
  _getCache: () => contextCache,
};
```

---

## 6. Trade Finder Integration

### Integration Points in `tradeFinderService.js`

Four surgical integration points — minimal disruption to the existing 700-line service:

#### 6.1 Candidate Filtering (Pre-Generation)

**Location:** `findTrades()`, after enriched teams are built, before `generateCandidates()`.

```javascript
// ── NEW: Context-aware filtering ──
const contextIntel = require('./contextIntelligenceService');

// In findTrades(), after enrichedTeams is built:

// Filter out players with critical context blockers from candidate pools
for (const team of enrichedTeams) {
  team.players = team.players.map(player => {
    const blocker = contextIntel.checkTradeBlockers(player.playerId);
    return {
      ...player,
      contextBlocked: blocker.blocked,
      contextReason: blocker.reason,
      contextSeverity: blocker.severity
    };
  });
}

// In generateCandidates(), modify oppTradeable:
// const oppTradeable = identifyTradeable(opponent, [], leagueSettings)
//   .filter(p => !p.contextBlocked);  // Don't recommend blocked players
```

**Why here:** Prevents generating 100s of candidates for injured players, saving CPU.

#### 6.2 Acceptance Score Adjustment

**Location:** `acceptancePredictionService.js`, new Factor 11.

```javascript
// Factor 11: Context intelligence adjustment (±15) — NEW
const contextIntel = require('./contextIntelligenceService');

// For players WE'RE GIVING (opponent receives):
for (const asset of candidate.give) {
  if (asset.type !== 'player') continue;
  const ctx = contextIntel.getPlayerContext(asset.id);
  if (!ctx) continue;
  
  // Opponent won't want injured player
  if (ctx.injury_status === 'Questionable') score -= 3;
  if (ctx.injury_status === 'Doubtful') score -= 8;
  if (ctx.injury_status === 'Out' || ctx.injury_status === 'IR') score -= 15;
  
  // Opponent wants breakout candidates
  if (ctx.breakout_candidate) score += 5;
}

// For players WE'RE GETTING (opponent gives up):
for (const asset of candidate.get) {
  if (asset.type !== 'player') continue;
  const ctx = contextIntel.getPlayerContext(asset.id);
  if (!ctx) continue;
  
  // Easier to get injured players
  if (ctx.injury_status === 'Out' || ctx.injury_status === 'IR') score += 5;
  
  // Harder to get breakout candidates
  if (ctx.breakout_candidate) score -= 8;
  // Easier to get bust candidates
  if (ctx.bust_candidate) score += 5;
}
```

#### 6.3 Trade Response Enrichment

**Location:** `deepAnalyze()`, in the result object construction.

```javascript
// In deepAnalyze(), after building the result object:

// ── NEW: Context enrichment ──
const allPlayerIds = [
  ...candidate.give.filter(a => a.type === 'player').map(a => a.id),
  ...candidate.get.filter(a => a.type === 'player').map(a => a.id)
];
const contextDisplay = contextIntel.getTradeContextDisplay(allPlayerIds);

results.push({
  // ... existing fields ...
  
  // NEW: Context intelligence
  context: {
    warnings: contextDisplay.warnings,    // ⚠️ Injury, suspension, etc.
    insights: contextDisplay.insights,    // 💎 Breakout, starter, etc.
    badges: contextDisplay.badges,        // Compact UI indicators
    hasBlocker: candidate.get.some(a => 
      a.type === 'player' && contextIntel.checkTradeBlockers(a.id).blocked
    ),
    dataFreshness: contextDisplay.warnings.length > 0 || contextDisplay.insights.length > 0 
      ? 'fresh' : 'no_data'
  }
});
```

#### 6.4 Championship Equity Adjustment

**Location:** `championshipEquityCalculator.js`, adjust team strength for injuries.

```javascript
// In calculateEquityChange(), adjust post-trade team strength:

const contextIntel = require('./contextIntelligenceService');

// Reduce team strength for injured starters
function adjustStrengthForContext(starterStrength, starters) {
  let adjusted = starterStrength;
  for (const player of starters) {
    const ctx = contextIntel.getPlayerContext(player.playerId);
    if (ctx && ctx.weeks_out > 8) {
      // Starter out for season = remove their value contribution
      adjusted -= (player.value || 0) * 0.8; // 80% reduction (not 100% — bench fill)
    } else if (ctx && ctx.weeks_out > 4) {
      adjusted -= (player.value || 0) * 0.4; // Partial-season reduction
    }
  }
  return Math.max(0, adjusted);
}
```

---

## 7. API Response Shape

### Enhanced Trade Finder Response

```jsonc
{
  "trades": [
    {
      "id": "tf_1710806400_abc123",
      "opponent": { /* unchanged */ },
      "give": [ /* unchanged */ ],
      "get": [ /* unchanged */ ],
      "scores": { /* unchanged */ },
      "impact": { /* unchanged */ },
      "narrative": { /* unchanged */ },
      
      // ── NEW: Context Intelligence ──
      "context": {
        "warnings": [
          {
            "text": "Travis Hunter — IR (Knee - ACL)",
            "severity": "critical",
            "weeksOut": 32
          }
        ],
        "insights": [
          {
            "text": "Garrett Wilson — Breakout candidate 📈",
            "type": "breakout"
          },
          {
            "text": "Garrett Wilson — 28.1% target share (elite)",
            "type": "opportunity"
          }
        ],
        "badges": [
          { "label": "IR", "color": "red", "playerId": "11621" },
          { "label": "📈", "color": "green", "playerId": "8155" }
        ],
        "hasBlocker": true,
        "dataFreshness": "fresh"
      }
    }
  ],
  
  // ── NEW: League-wide context summary ──
  "contextSummary": {
    "playersOnIR": 12,
    "criticalAlerts": 3,
    "breakoutCandidates": 8,
    "lastRefresh": "2026-03-18T12:00:00Z",
    "coverage": 0.94  // 94% of rostered players have context
  }
}
```

---

## 8. Frontend Components

### 8.1 `ContextWarningBanner` — Trade Card Top

Renders above the trade card content when `context.hasBlocker` is true:

```jsx
// Full-width red banner at top of trade card
<div className="bg-red-50 border-l-4 border-red-500 p-3 mb-3 rounded-r">
  <div className="flex items-center gap-2">
    <span className="text-red-600 font-bold">⛔ TRADE BLOCKED</span>
  </div>
  <ul className="mt-1 text-sm text-red-700">
    {warnings.filter(w => w.severity === 'critical').map(w => (
      <li key={w.text}>• {w.text}</li>
    ))}
  </ul>
</div>
```

### 8.2 `ContextBadges` — Inline on Player Names

Small colored badges next to player names in give/get lists:

```jsx
// Next to "Travis Hunter (WR)"
<span className="inline-flex items-center gap-1">
  Travis Hunter (WR)
  <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-red-100 text-red-700">IR</span>
</span>
```

### 8.3 `ContextInsightsPanel` — Expandable Section

Collapsible section below trade scores showing insights:

```jsx
// Collapsed: "💡 2 insights, ⚠️ 1 warning" 
// Expanded: full list
<details className="mt-2 border-t pt-2">
  <summary className="cursor-pointer text-sm text-gray-600">
    💡 {insights.length} insights, ⚠️ {warnings.length} warnings
  </summary>
  <div className="mt-2 space-y-1">
    {insights.map(i => <div className="text-sm text-green-700">💎 {i.text}</div>)}
    {warnings.map(w => <div className="text-sm text-amber-700">⚠️ {w.text}</div>)}
  </div>
</details>
```

### 8.4 Filter Controls

New filter section in Trade Finder:

```jsx
<div className="flex gap-3 flex-wrap">
  <label className="flex items-center gap-1.5 text-sm">
    <input type="checkbox" checked={hideInjured} onChange={...} />
    Hide IR/Out players
  </label>
  <label className="flex items-center gap-1.5 text-sm">
    <input type="checkbox" checked={onlyBreakouts} onChange={...} />
    Only breakout candidates
  </label>
  <label className="flex items-center gap-1.5 text-sm">
    <input type="checkbox" checked={excludeBusts} onChange={...} />
    Exclude bust candidates  
  </label>
</div>
```

---

## 9. Data Pipeline Schedule

### Cron Jobs

| Job | Schedule | What It Does | Duration |
|-----|----------|-------------|----------|
| `context:full-refresh` | Daily 8:00 AM ET | Sleeper + ESPN fetch, full upsert | ~30s |
| `context:injury-check` | Every 4 hours (game days) | Sleeper injury status only | ~10s |
| `context:cache-refresh` | On startup + every 4 hours | Reload in-memory cache from DB | ~2s |
| `context:expire-alerts` | Daily midnight | Mark expired alerts as inactive | ~1s |
| `context:freshness-decay` | Every 12 hours | Update `data_freshness` column | ~1s |

### Game Day Schedule (Sep-Jan)

During NFL season, injury-check runs more frequently:
- Sunday: Every 2 hours (8 AM → 8 PM)
- Monday/Thursday: Every 3 hours (game days)
- Off-days: Daily at 8 AM only

---

## 10. Implementation Roadmap

### Week 1: Foundation (12 hours)

| Task | Hours | Priority |
|------|-------|----------|
| DB migration (`002_add_context_intelligence.sql`) | 1 | P0 |
| `contextIntelligenceService.js` — core module | 4 | P0 |
| Sleeper API context fetcher | 2 | P0 |
| ESPN injury fetcher | 2 | P0 |
| Unit tests (20+ tests) | 2 | P0 |
| Wire into `findTrades()` — basic integration | 1 | P0 |

### Week 2: Deep Integration (10 hours)

| Task | Hours | Priority |
|------|-------|----------|
| Candidate filtering (block IR/suspended) | 2 | P0 |
| Acceptance score adjustment | 2 | P1 |
| Context in trade response (API enrichment) | 2 | P1 |
| Championship equity adjustment | 1 | P1 |
| Cron job setup (daily + game-day) | 1 | P1 |
| Integration tests | 2 | P1 |

### Week 3: Frontend + Polish (10 hours)

| Task | Hours | Priority |
|------|-------|----------|
| `ContextWarningBanner` component | 2 | P1 |
| `ContextBadges` component | 1 | P1 |
| `ContextInsightsPanel` component | 2 | P1 |
| Filter controls (hide injured, etc.) | 2 | P1 |
| Mobile responsive testing | 1 | P2 |
| E2E tests | 2 | P2 |

### Post-Launch: Advanced Sources (15 hours)

| Task | Hours | Priority |
|------|-------|----------|
| KeepTradeCut dynasty rankings scraper | 3 | P2 |
| Reddit r/DynastyFF sentiment analysis | 4 | P2 |
| Breakout/bust detection model | 4 | P2 |
| Expert consensus divergence alerts | 2 | P2 |
| Admin dashboard (view/edit context) | 2 | P3 |

**Total: ~47 hours**

---

## 11. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Sleeper API changes/breaks | Low | High | Cache last-good data, alert on fetch failure |
| ESPN blocks scraping | Medium | Medium | ESPN is public API, not scraping. Fallback: Sleeper-only |
| Stale data served | Medium | High | `data_freshness` column + UI indicator "Last updated: 3h ago" |
| Over-blocking (false positives) | Low | High | Conservative: only block IR + weeks_out > 8. Log all blocks for review. |
| Under-blocking (false negatives) | Medium | Critical | Multi-source verification for injuries. Sleeper + ESPN must agree. |
| Performance degradation | Low | Medium | In-memory cache, no DB queries in hot path. Cache lookup is O(1) Map.get() |
| Context data inconsistency | Medium | Medium | Source priority: Sleeper > ESPN > manual. Latest timestamp wins. |

### Graceful Degradation

If the context system fails entirely:
1. Trade Finder continues working exactly as today (no context enrichment)
2. `getPlayerContext()` returns `null` → all integration points handle null gracefully
3. No crashes, no blocked trades — just missing the extra intelligence layer
4. Logs warning so we know to investigate

---

## 12. Testing Strategy

### Unit Tests (20+)

```
contextIntelligenceService.test.js:
  ✓ mapSleeperInjuryStatus — maps all status combinations
  ✓ estimateWeeksOut — correct estimates for each status
  ✓ checkTradeBlockers — blocks IR with weeks_out > 8
  ✓ checkTradeBlockers — blocks suspended players
  ✓ checkTradeBlockers — blocks position-change players
  ✓ checkTradeBlockers — does NOT block Questionable players
  ✓ checkTradeBlockers — does NOT block healthy players
  ✓ getTradeContextDisplay — generates warnings for injured
  ✓ getTradeContextDisplay — generates insights for breakout
  ✓ getTradeContextDisplay — generates badges with correct colors
  ✓ getTradeContextDisplay — handles empty/missing context
  ✓ getPlayerContextBatch — returns Map for valid IDs
  ✓ getPlayerContextBatch — handles unknown IDs gracefully
  ✓ fetchSleeperContext — parses real API shape
  ✓ fetchSleeperContext — handles missing fields
  ✓ generateAlerts — creates critical alerts for IR
  ✓ generateAlerts — creates critical alerts for suspended
  ✓ generateAlerts — skips Questionable (not critical)
  ✓ upsertContextBatch — upserts without duplicates
  ✓ refreshCache — populates in-memory maps
```

### Integration Tests

```
tradeFinderService.context.test.js:
  ✓ Trade Finder filters out IR players from candidates
  ✓ Trade Finder includes context warnings in response
  ✓ Trade Finder works normally when context service unavailable
  ✓ Acceptance score adjusts for injured give-side players
  ✓ Championship equity adjusts for injured starters
```

---

## 13. Appendix: ESPN Team ID Mapping

```javascript
const ESPN_TEAM_MAP = {
  1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE',
  6: 'DAL', 7: 'DEN', 8: 'DET', 9: 'GB', 10: 'TEN',
  11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR', 15: 'MIA',
  16: 'MIN', 17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ',
  21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC', 25: 'SF',
  26: 'SEA', 27: 'TB', 28: 'WAS', 29: 'CAR', 30: 'JAX',
  33: 'BAL', 34: 'HOU'
};
```

---

## 14. Appendix: Player ID Mapping Strategy

Sleeper uses its own player IDs. ESPN uses ESPN athlete IDs. We need to map between them.

**Approach:** Name + Team + Position fuzzy matching during ESPN ingestion.

```javascript
function findSleeperIdForESPN(espnPlayer, sleeperPlayers) {
  // Exact match on name + team
  const exact = sleeperPlayers.find(sp => 
    sp.full_name?.toLowerCase() === espnPlayer.player_name?.toLowerCase() &&
    sp.team === espnPlayer.team
  );
  if (exact) return exact.player_id;
  
  // Fuzzy: last name + team + position
  const lastName = espnPlayer.player_name?.split(' ').pop()?.toLowerCase();
  const fuzzy = sleeperPlayers.find(sp =>
    sp.last_name?.toLowerCase() === lastName &&
    sp.team === espnPlayer.team &&
    sp.position === espnPlayer.position
  );
  return fuzzy?.player_id || null;
}
```

For MVP, this is sufficient. Long-term: maintain a `player_id_map` table with verified mappings.

---

**End of Design Document**

_Ready for implementation. Start with Week 1 foundation: DB migration → Sleeper integration → Trade Finder wiring._

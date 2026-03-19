-- Migration: 090_trade_narratives_schema.sql
-- AI Trade Narratives V2 - Schema for player context, narrative cache, and audit log
-- Created: 2026-03-19
-- Author: Rush (TitleRun)

-- ============================================================================
-- Table 1: Player Narrative Context
-- Refreshed daily from real 2025 NFL data via ETL pipeline
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_narrative_context (
  player_id VARCHAR(50) PRIMARY KEY,
  season INTEGER NOT NULL,

  -- Bio
  full_name VARCHAR(255),
  age INTEGER,
  position VARCHAR(10),
  nfl_team VARCHAR(5),
  years_in_league INTEGER,
  draft_year INTEGER,
  draft_round INTEGER,
  draft_pick INTEGER,

  -- 2025 Season Stats
  games_played INTEGER DEFAULT 0,
  targets INTEGER DEFAULT 0,
  receptions INTEGER DEFAULT 0,
  yards INTEGER DEFAULT 0,
  touchdowns INTEGER DEFAULT 0,
  rush_attempts INTEGER DEFAULT 0,
  rush_yards INTEGER DEFAULT 0,
  rush_tds INTEGER DEFAULT 0,

  -- Team Context
  team_record VARCHAR(10),            -- e.g. "12-5"
  team_playoff_result VARCHAR(100),   -- e.g. "Lost Divisional Round"
  oline_rank_run INTEGER,             -- 1-32 (1 = best)
  oline_rank_pass INTEGER,            -- 1-32 (1 = best)
  coaching_staff JSONB DEFAULT '{}',  -- {"HC": "Ben Johnson", "OC": "..."}

  -- Opportunity
  depth_chart_position INTEGER,       -- 1 = starter
  target_share_pct DECIMAL(5,2),
  snap_count_pct DECIMAL(5,2),

  -- Transactions (last 90 days)
  recent_transactions JSONB DEFAULT '[]',  -- [{"date": "2026-03-05", "type": "trade", "to": "BUF"}]
  recent_contract JSONB DEFAULT '{}',      -- {"type": "extension", "years": 4, "aav": "15M"}

  -- Dynasty Context
  dynasty_rank INTEGER,               -- TitleRun rank
  value_trend VARCHAR(20),            -- "rising", "stable", "falling"

  -- Metadata
  updated_at TIMESTAMP DEFAULT NOW(),
  data_quality_score INTEGER DEFAULT 0  -- 0-100
);

CREATE INDEX IF NOT EXISTS idx_player_narrative_updated
  ON player_narrative_context (updated_at);

CREATE INDEX IF NOT EXISTS idx_player_narrative_position
  ON player_narrative_context (position);

CREATE INDEX IF NOT EXISTS idx_player_narrative_team
  ON player_narrative_context (nfl_team);


-- ============================================================================
-- Table 2: Trade Narrative Cache
-- Stores pre-generated and on-demand 5-part trade narratives
-- ============================================================================
CREATE TABLE IF NOT EXISTS trade_narrative_cache (
  id SERIAL PRIMARY KEY,
  give_player_id VARCHAR(50) NOT NULL,
  get_player_id VARCHAR(50) NOT NULL,
  season INTEGER NOT NULL,

  -- 5-part narrative
  narrative JSONB NOT NULL,
  -- Expected shape:
  -- {
  --   "forTradingAway": "...",
  --   "forReceiving": "...",
  --   "againstTradingAway": "...",
  --   "againstReceiving": "...",
  --   "consensus": "...",
  --   "generatedDate": "3/19"
  -- }

  -- Generation metadata
  model_used VARCHAR(50),              -- "gpt-5-mini", "deepseek-v3.2", etc.
  prompt_version VARCHAR(20),          -- "v2.0"
  tokens_used INTEGER DEFAULT 0,
  generation_time_ms INTEGER DEFAULT 0,
  quality_score INTEGER DEFAULT 0,     -- 0-100 (from post-gen validator)

  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,

  CONSTRAINT uq_narrative_cache_pair_season
    UNIQUE (give_player_id, get_player_id, season)
);

CREATE INDEX IF NOT EXISTS idx_narrative_cache_expires
  ON trade_narrative_cache (expires_at);

CREATE INDEX IF NOT EXISTS idx_narrative_cache_players
  ON trade_narrative_cache (give_player_id, get_player_id);

CREATE INDEX IF NOT EXISTS idx_narrative_cache_quality
  ON trade_narrative_cache (quality_score);


-- ============================================================================
-- Table 3: Narrative Generation Log (Audit Trail)
-- Tracks every narrative generation for cost monitoring and quality analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS narrative_generation_log (
  id SERIAL PRIMARY KEY,
  give_player_id VARCHAR(50),
  get_player_id VARCHAR(50),
  generation_type VARCHAR(20) NOT NULL,  -- "pre-gen", "on-demand", "regeneration"
  model_used VARCHAR(50),
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  cache_hit BOOLEAN DEFAULT FALSE,
  quality_score INTEGER DEFAULT 0,
  validation_warnings TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_narrative_log_created
  ON narrative_generation_log (created_at);

CREATE INDEX IF NOT EXISTS idx_narrative_log_type
  ON narrative_generation_log (generation_type);

CREATE INDEX IF NOT EXISTS idx_narrative_log_model
  ON narrative_generation_log (model_used);


-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- DROP TABLE IF EXISTS narrative_generation_log;
-- DROP TABLE IF EXISTS trade_narrative_cache;
-- DROP TABLE IF EXISTS player_narrative_context;

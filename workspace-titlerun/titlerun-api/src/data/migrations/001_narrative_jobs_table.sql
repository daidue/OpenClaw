-- Migration: Add narrative_generation_jobs table for persistent job tracking
-- Issue: H5 - Jobs stored in-memory Map are lost on server restart

CREATE TABLE IF NOT EXISTS narrative_generation_jobs (
  job_id VARCHAR(50) PRIMARY KEY,
  give_player_id VARCHAR(50) NOT NULL,
  get_player_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_id VARCHAR(100)
);

-- Index for polling by status
CREATE INDEX IF NOT EXISTS idx_narrative_jobs_status ON narrative_generation_jobs (status);

-- Auto-cleanup old jobs (older than 1 hour)
-- Run periodically or use pg_cron
CREATE INDEX IF NOT EXISTS idx_narrative_jobs_created ON narrative_generation_jobs (created_at);

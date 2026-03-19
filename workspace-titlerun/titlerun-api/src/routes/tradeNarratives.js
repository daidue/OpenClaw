/**
 * Trade Narratives API Routes
 *
 * Endpoints for AI-generated trade narratives.
 * Supports synchronous and async generation with polling.
 *
 * Routes:
 *   GET  /api/trade-narratives/:giveId/:getId  - Get cached narrative
 *   POST /api/trade-narratives/generate         - Generate fresh narrative
 *   GET  /api/trade-narratives/status/:jobId    - Poll async job status
 *   GET  /api/trade-narratives/stats            - Cache/generation stats
 *
 * Security: All routes require authentication + rate limiting (C1)
 * Jobs: Persisted to DB for restart survival (H5)
 *
 * @module routes/tradeNarratives
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger').child({ service: 'narrative-routes' });
const { requireAuth } = require('../middleware/auth');

// ─── Rate Limiting (C1) ───────────────────────────────────────

/**
 * Rate limiter factory. Uses express-rate-limit if available,
 * falls back to simple in-memory counter.
 */
function createRateLimiter({ windowMs, max, message }) {
  try {
    const rateLimit = require('express-rate-limit');
    return rateLimit({ windowMs, max, message, standardHeaders: true, legacyHeaders: false });
  } catch {
    // Fallback: simple in-memory rate limiter
    const requests = new Map();
    return (req, res, next) => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      const windowStart = now - windowMs;

      if (!requests.has(key)) requests.set(key, []);
      const timestamps = requests.get(key).filter(t => t > windowStart);
      requests.set(key, timestamps);

      if (timestamps.length >= max) {
        return res.status(429).json({
          success: false,
          error: message || 'Too many requests',
        });
      }

      timestamps.push(now);
      next();
    };
  }
}

const generateLimiter = createRateLimiter({
  windowMs: 60 * 1000,   // 1 minute
  max: 10,                // 10 generate requests per minute
  message: 'Too many generation requests, please try again later',
});

const readLimiter = createRateLimiter({
  windowMs: 60 * 1000,   // 1 minute
  max: 60,                // 60 read requests per minute
  message: 'Too many requests, please try again later',
});

// ─── Lazy Service Loading ─────────────────────────────────────

let narrativeService = null;
function getNarrativeService() {
  if (!narrativeService) {
    narrativeService = require('../services/intelligence/narrativeGenerationService');
  }
  return narrativeService;
}

// ─── Job Persistence (H5) ─────────────────────────────────────

/**
 * In-memory fallback for job tracking when DB is unavailable.
 * DB-backed jobs survive restarts; memory jobs have 5-min TTL.
 */
const memoryJobs = new Map();
const JOB_TTL_MS = 5 * 60 * 1000;

async function createJob(db, giveId, getId, userId) {
  const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  if (db) {
    try {
      await db.query(`
        INSERT INTO narrative_generation_jobs (job_id, give_player_id, get_player_id, status, user_id)
        VALUES ($1, $2, $3, 'pending', $4)
      `, [jobId, giveId, getId, userId || null]);
      return jobId;
    } catch (err) {
      logger.warn(`[NarrativeRoute] DB job creation failed, using memory: ${err.message}`);
    }
  }

  // Memory fallback
  memoryJobs.set(jobId, {
    status: 'pending',
    giveId,
    getId,
    createdAt: Date.now(),
    result: null,
    error: null,
  });
  setTimeout(() => memoryJobs.delete(jobId), JOB_TTL_MS);
  return jobId;
}

async function updateJobStatus(db, jobId, status, result, error) {
  if (db) {
    try {
      await db.query(`
        UPDATE narrative_generation_jobs
        SET status = $2, result = $3, error = $4, completed_at = NOW()
        WHERE job_id = $1
      `, [jobId, status, result ? JSON.stringify(result) : null, error || null]);
      return;
    } catch (err) {
      logger.warn(`[NarrativeRoute] DB job update failed: ${err.message}`);
    }
  }

  // Memory fallback
  const job = memoryJobs.get(jobId);
  if (job) {
    job.status = status;
    job.result = result;
    job.error = error;
  }
}

async function getJob(db, jobId) {
  if (db) {
    try {
      const result = await db.query(`
        SELECT job_id, give_player_id, get_player_id, status,
               result, error, created_at, completed_at
        FROM narrative_generation_jobs WHERE job_id = $1
      `, [jobId]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          jobId: row.job_id,
          status: row.status,
          result: row.result,
          error: row.error,
          createdAt: new Date(row.created_at).getTime(),
        };
      }
    } catch (err) {
      logger.warn(`[NarrativeRoute] DB job lookup failed: ${err.message}`);
    }
  }

  // Memory fallback
  const job = memoryJobs.get(jobId);
  if (!job) return null;
  return {
    jobId,
    status: job.status,
    result: job.result,
    error: job.error,
    createdAt: job.createdAt,
  };
}

// ─── Routes (C1: auth + rate limiting applied) ────────────────

/**
 * GET /api/trade-narratives/stats
 * Cache and generation statistics.
 */
router.get('/stats', requireAuth, readLimiter, (req, res) => {
  const service = getNarrativeService();
  const cacheStats = service.narrativeCache.stats();

  return res.json({
    success: true,
    cache: cacheStats,
    activeJobs: memoryJobs.size,
    config: {
      primaryModel: service.CONFIG.primaryModel,
      fallbackModel: service.CONFIG.fallbackModel,
      cacheTTLDays: service.CONFIG.cacheTTLDays,
      promptVersion: service.CONFIG.promptVersion,
    },
  });
});

/**
 * GET /api/trade-narratives/status/:jobId
 * Poll async job status.
 * Returns: pending, processing, completed, or failed.
 */
router.get('/status/:jobId', requireAuth, readLimiter, async (req, res) => {
  const { jobId } = req.params;
  const job = await getJob(req.db, jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found or expired',
    });
  }

  return res.json({
    success: true,
    jobId: job.jobId || jobId,
    status: job.status,
    narrative: job.result,
    error: job.error,
    elapsedMs: Date.now() - job.createdAt,
  });
});

/**
 * GET /api/trade-narratives/:giveId/:getId
 * Retrieve a cached narrative for a trade pair.
 * Returns 404 if no cached narrative exists.
 */
router.get('/:giveId/:getId', requireAuth, readLimiter, async (req, res) => {
  try {
    const { giveId, getId } = req.params;
    const service = getNarrativeService();

    const cached = await service.getCachedNarrative(giveId, getId, req.db);

    if (cached) {
      return res.json({
        success: true,
        cached: true,
        narrative: cached,
      });
    }

    return res.status(404).json({
      success: false,
      cached: false,
      message: 'No cached narrative found. Use POST /generate to create one.',
    });
  } catch (err) {
    logger.error(`[NarrativeRoute] GET failed: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/trade-narratives/generate
 * Generate a fresh narrative for a trade.
 * Async by default - returns a jobId for polling.
 *
 * Body: { givePlayer, getPlayer, userTeam, oppTeam, sync: boolean }
 */
router.post('/generate', requireAuth, generateLimiter, async (req, res) => {
  try {
    const { givePlayer, getPlayer, userTeam, oppTeam, sync = false } = req.body;

    if (!givePlayer || !getPlayer) {
      return res.status(400).json({
        success: false,
        error: 'givePlayer and getPlayer are required',
      });
    }

    const service = getNarrativeService();

    // Synchronous mode - wait for result
    if (sync) {
      const narrative = await service.generateTradeNarrative(
        givePlayer, getPlayer, userTeam, oppTeam,
        { db: req.db }
      );

      return res.json({
        success: !!narrative,
        narrative: narrative || null,
        cached: false,
      });
    }

    // Async mode - return job ID for polling
    const giveId = givePlayer.player_id || givePlayer.id;
    const getId = getPlayer.player_id || getPlayer.id;
    const jobId = await createJob(req.db, giveId, getId, req.userId);

    // Start generation in background
    service.generateTradeNarrative(
      givePlayer, getPlayer, userTeam, oppTeam,
      { db: req.db }
    ).then(async (narrative) => {
      const status = narrative ? 'completed' : 'failed';
      await updateJobStatus(req.db, jobId, status, narrative, null);
    }).catch(async (err) => {
      await updateJobStatus(req.db, jobId, 'failed', null, err.message);
    });

    return res.status(202).json({
      success: true,
      jobId,
      status: 'pending',
      pollUrl: `/api/trade-narratives/status/${jobId}`,
    });
  } catch (err) {
    logger.error(`[NarrativeRoute] POST generate failed: ${err.message}`);

    // C3: Handle cost cap errors with specific status code
    if (err.code === 'COST_CAP_EXCEEDED') {
      return res.status(429).json({
        success: false,
        error: 'Daily generation limit reached. Try again tomorrow.',
        code: 'COST_CAP_EXCEEDED',
      });
    }

    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;

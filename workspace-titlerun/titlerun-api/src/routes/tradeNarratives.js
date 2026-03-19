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
 * @module routes/tradeNarratives
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger').child({ service: 'narrative-routes' });

// Import services lazily to avoid circular deps
let narrativeService = null;
function getNarrativeService() {
  if (!narrativeService) {
    narrativeService = require('../services/intelligence/narrativeGenerationService');
  }
  return narrativeService;
}

// ─── In-flight job tracking ────────────────────────────────────

const activeJobs = new Map();
const JOB_TTL_MS = 5 * 60 * 1000; // 5 minutes

function createJob(giveId, getId) {
  const jobId = `${giveId}:${getId}:${Date.now()}`;
  activeJobs.set(jobId, {
    status: 'pending',
    giveId,
    getId,
    createdAt: Date.now(),
    result: null,
    error: null,
  });

  // Auto-cleanup after TTL
  setTimeout(() => activeJobs.delete(jobId), JOB_TTL_MS);

  return jobId;
}

// ─── Routes ────────────────────────────────────────────────────

/**
 * GET /api/trade-narratives/:giveId/:getId
 * Retrieve a cached narrative for a trade pair.
 * Returns 404 if no cached narrative exists.
 */
router.get('/:giveId/:getId', async (req, res) => {
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
router.post('/generate', async (req, res) => {
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
    const jobId = createJob(giveId, getId);

    // Start generation in background
    service.generateTradeNarrative(
      givePlayer, getPlayer, userTeam, oppTeam,
      { db: req.db }
    ).then(narrative => {
      const job = activeJobs.get(jobId);
      if (job) {
        job.status = narrative ? 'complete' : 'failed';
        job.result = narrative;
      }
    }).catch(err => {
      const job = activeJobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = err.message;
      }
    });

    return res.status(202).json({
      success: true,
      jobId,
      status: 'pending',
      pollUrl: `/api/trade-narratives/status/${jobId}`,
    });
  } catch (err) {
    logger.error(`[NarrativeRoute] POST generate failed: ${err.message}`);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/trade-narratives/status/:jobId
 * Poll async job status.
 * Returns: pending, complete (with narrative), or failed.
 */
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found or expired',
    });
  }

  return res.json({
    success: true,
    jobId,
    status: job.status,
    narrative: job.result,
    error: job.error,
    elapsedMs: Date.now() - job.createdAt,
  });
});

/**
 * GET /api/trade-narratives/stats
 * Cache and generation statistics.
 */
router.get('/stats', (req, res) => {
  const service = getNarrativeService();
  const cacheStats = service.narrativeCache.stats();

  return res.json({
    success: true,
    cache: cacheStats,
    activeJobs: activeJobs.size,
    config: {
      primaryModel: service.CONFIG.primaryModel,
      fallbackModel: service.CONFIG.fallbackModel,
      cacheTTLDays: service.CONFIG.cacheTTLDays,
      promptVersion: service.CONFIG.promptVersion,
    },
  });
});

module.exports = router;

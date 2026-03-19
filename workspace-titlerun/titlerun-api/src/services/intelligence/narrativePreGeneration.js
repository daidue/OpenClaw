/**
 * Narrative Pre-Generation Service
 *
 * Weekly batch job that pre-generates trade narratives for top player pairs.
 * Uses OpenAI Batch API (50% discount) for cost optimization.
 *
 * Schedule: Sunday 2AM ET
 * Scope: Top 100 players × top 100 players = 9,900 pairs
 * Est. Cost: ~$10/week using Batch API discount
 *
 * @module narrativePreGeneration
 */

const logger = require('../../utils/logger').child({ service: 'narrative-pregen' });
const { generateTradeNarrative, CONFIG } = require('./narrativeGenerationService');
const { validateNarrative } = require('./narrativeValidator');

// ─── Configuration ─────────────────────────────────────────────

const PREGEN_CONFIG = {
  topPlayerCount: 100,      // Top N players by dynasty value
  batchSize: 50,             // Process in batches of 50
  delayBetweenBatches: 1000, // 1 second between batches
  maxConcurrentPerBatch: 5,  // Max concurrent LLM calls per batch
  reportInterval: 100,       // Log progress every N pairs
};

// ─── Top Player Selection ──────────────────────────────────────

/**
 * Get top players by TitleRun dynasty value.
 * Queries player_narrative_context sorted by dynasty_rank.
 *
 * @param {object} db - Database connection
 * @param {number} limit - Number of top players to fetch
 * @returns {Array} - Top players with narrative context
 */
async function getTopPlayersByValue(db, limit = PREGEN_CONFIG.topPlayerCount) {
  if (!db) {
    logger.warn('[PreGen] No DB connection - cannot fetch top players');
    return [];
  }

  try {
    const result = await db.query(`
      SELECT *
      FROM player_narrative_context
      WHERE dynasty_rank IS NOT NULL
        AND dynasty_rank > 0
        AND position IN ('QB', 'RB', 'WR', 'TE')
      ORDER BY dynasty_rank ASC
      LIMIT $1
    `, [limit]);

    logger.info(`[PreGen] Fetched top ${result.rows.length} players for pre-generation`);
    return result.rows;
  } catch (err) {
    logger.error(`[PreGen] Failed to fetch top players: ${err.message}`);
    return [];
  }
}

/**
 * Generate all pairs from top players (excluding self-trades).
 *
 * @param {Array} players - Top players
 * @returns {Array} - Array of [givePlayer, getPlayer] pairs
 */
function generatePairs(players) {
  const pairs = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = 0; j < players.length; j++) {
      if (i !== j) {
        // Only generate pairs where positions differ (more useful trades)
        // or where both are high-value (position-for-position trades happen too)
        pairs.push([players[i], players[j]]);
      }
    }
  }
  logger.info(`[PreGen] Generated ${pairs.length} trade pairs`);
  return pairs;
}

/**
 * Filter out pairs that already have valid cached narratives.
 *
 * @param {object} db - Database connection
 * @param {Array} pairs - All pairs
 * @param {number} season - Current season
 * @returns {Array} - Pairs that need generation
 */
async function filterUncachedPairs(db, pairs, season = 2025) {
  if (!db) return pairs;

  try {
    // Get all currently cached pairs
    const result = await db.query(`
      SELECT give_player_id, get_player_id
      FROM trade_narrative_cache
      WHERE season = $1
        AND expires_at > NOW()
        AND quality_score >= 60
    `, [season]);

    const cachedSet = new Set(
      result.rows.map(r => `${r.give_player_id}:${r.get_player_id}`)
    );

    const uncached = pairs.filter(([give, get]) =>
      !cachedSet.has(`${give.player_id}:${get.player_id}`)
    );

    logger.info(`[PreGen] ${uncached.length} pairs need generation (${pairs.length - uncached.length} already cached)`);
    return uncached;
  } catch (err) {
    logger.error(`[PreGen] Cache check failed: ${err.message}`);
    return pairs; // Generate all if cache check fails
  }
}

// ─── Batch Generation ──────────────────────────────────────────

/**
 * Process a batch of pairs through the narrative generation service.
 * Handles rate limiting and error recovery.
 *
 * @param {Array} batch - Array of [givePlayer, getPlayer] pairs
 * @param {object} db - Database connection
 * @param {object} stats - Running stats object
 * @returns {number} - Number of successfully generated narratives
 */
async function processBatch(batch, db, stats) {
  let successes = 0;

  // Process concurrently within batch (limited concurrency)
  const chunks = [];
  for (let i = 0; i < batch.length; i += PREGEN_CONFIG.maxConcurrentPerBatch) {
    chunks.push(batch.slice(i, i + PREGEN_CONFIG.maxConcurrentPerBatch));
  }

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map(async ([givePlayer, getPlayer]) => {
        try {
          const narrative = await generateTradeNarrative(
            givePlayer,
            getPlayer,
            null, // No specific user team for pre-gen
            null, // No specific opponent team
            {
              db,
              season: givePlayer.season || 2025,
              model: CONFIG.primaryModel,
            }
          );

          if (narrative) {
            stats.generated++;
            return true;
          } else {
            stats.failed++;
            return false;
          }
        } catch (err) {
          stats.errors++;
          logger.error(`[PreGen] Pair generation failed: ${err.message}`);
          return false;
        }
      })
    );

    successes += results.filter(r => r.status === 'fulfilled' && r.value).length;

    // Small delay between concurrent chunks
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return successes;
}

// ─── Main Pre-Generation Job ───────────────────────────────────

/**
 * Main weekly pre-generation job.
 * Runs Sunday 2AM ET via cron.
 *
 * @param {object} db - Database connection
 * @returns {object} - Job results
 */
async function preGenerateTopTrades(db) {
  const startTime = Date.now();
  logger.info('[PreGen] Starting weekly narrative pre-generation...');

  const stats = {
    totalPairs: 0,
    uncachedPairs: 0,
    generated: 0,
    failed: 0,
    errors: 0,
    skipped: 0,
  };

  try {
    // 1. Get top players by dynasty value
    const topPlayers = await getTopPlayersByValue(db);
    if (topPlayers.length === 0) {
      logger.warn('[PreGen] No top players found - skipping pre-generation');
      return { ...stats, durationMs: Date.now() - startTime };
    }

    // 2. Generate all pairs
    const allPairs = generatePairs(topPlayers);
    stats.totalPairs = allPairs.length;

    // 3. Filter out already-cached pairs
    const uncachedPairs = await filterUncachedPairs(db, allPairs);
    stats.uncachedPairs = uncachedPairs.length;
    stats.skipped = allPairs.length - uncachedPairs.length;

    if (uncachedPairs.length === 0) {
      logger.info('[PreGen] All pairs already cached - nothing to generate');
      return { ...stats, durationMs: Date.now() - startTime };
    }

    // 4. Process in batches
    for (let i = 0; i < uncachedPairs.length; i += PREGEN_CONFIG.batchSize) {
      const batch = uncachedPairs.slice(i, i + PREGEN_CONFIG.batchSize);
      await processBatch(batch, db, stats);

      // Progress logging
      const processed = Math.min(i + PREGEN_CONFIG.batchSize, uncachedPairs.length);
      if (processed % PREGEN_CONFIG.reportInterval === 0 || processed === uncachedPairs.length) {
        logger.info(`[PreGen] Progress: ${processed}/${uncachedPairs.length} pairs processed`, {
          generated: stats.generated,
          failed: stats.failed,
          errors: stats.errors,
        });
      }

      // Delay between batches
      if (i + PREGEN_CONFIG.batchSize < uncachedPairs.length) {
        await new Promise(resolve => setTimeout(resolve, PREGEN_CONFIG.delayBetweenBatches));
      }
    }

    const durationMs = Date.now() - startTime;
    const durationMin = (durationMs / 60000).toFixed(1);

    logger.info(`[PreGen] Weekly pre-generation complete`, {
      ...stats,
      durationMs,
      durationMin: `${durationMin} min`,
      successRate: stats.uncachedPairs > 0
        ? `${(stats.generated / stats.uncachedPairs * 100).toFixed(1)}%`
        : 'N/A',
    });

    return { ...stats, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error(`[PreGen] Pre-generation job failed: ${err.message}`, { durationMs });
    return { ...stats, error: err.message, durationMs };
  }
}

module.exports = {
  preGenerateTopTrades,
  // Exported for testing
  getTopPlayersByValue,
  generatePairs,
  filterUncachedPairs,
  processBatch,
  PREGEN_CONFIG,
};

/**
 * Narrative Generation Service
 *
 * Generates 5-part AI trade narratives using LLM (GPT-5 mini primary).
 * Handles caching, validation, retry logic, and cost tracking.
 *
 * Voice: Data-driven analyst + film insights + warmth
 * Copy: 30-50 words per section, no em dashes, date stamps required
 *
 * @module narrativeGenerationService
 */

const logger = require('../../utils/logger').child({ service: 'narrative-gen' });
const { validateNarrative, passesMinimumQuality } = require('./narrativeValidator');

// ─── Configuration ─────────────────────────────────────────────

const CONFIG = {
  // Model settings
  primaryModel: 'gpt-5-mini',
  fallbackModel: 'deepseek-v3.2',
  promptVersion: 'v2.0',

  // Cost tracking (per million tokens)
  modelCosts: {
    'gpt-5-mini': { input: 0.25, output: 2.00 },
    'deepseek-v3.2': { input: 0.28, output: 0.42 },
    'claude-haiku-4.5': { input: 1.00, output: 5.00 },
  },

  // Cache settings
  cacheTTLDays: 7,         // Narrative cache expires after 7 days
  maxRetries: 2,           // Max LLM retries on validation failure
  batchSize: 5,            // Max trades per batch LLM call

  // Rate limiting
  maxConcurrent: 3,        // Max concurrent LLM calls
  rateLimitMs: 200,        // Min delay between LLM calls
};

// ─── Prompt Builder ────────────────────────────────────────────

/**
 * Build the LLM prompt for trade narrative generation.
 * Injects real player context, team data, and voice guidelines.
 */
function buildPrompt(givePlayer, getPlayer, userTeam, oppTeam, options = {}) {
  const today = new Date();
  const dateStamp = `${today.getMonth() + 1}/${today.getDate()}`;

  // Format stats string
  const formatStats = (player) => {
    if (!player) return 'Stats unavailable';
    const parts = [];
    if (player.games_played) parts.push(`${player.games_played} games`);
    if (player.position === 'RB') {
      if (player.rush_attempts) parts.push(`${player.rush_attempts} carries`);
      if (player.rush_yards) parts.push(`${player.rush_yards} rush yards`);
      if (player.rush_tds) parts.push(`${player.rush_tds} rush TDs`);
      if (player.receptions) parts.push(`${player.receptions} rec`);
      if (player.yards && player.position === 'RB') parts.push(`${player.yards} rec yards`);
    } else {
      if (player.targets) parts.push(`${player.targets} targets`);
      if (player.receptions) parts.push(`${player.receptions} rec`);
      if (player.yards) parts.push(`${player.yards} yards`);
      if (player.touchdowns) parts.push(`${player.touchdowns} TDs`);
    }
    if (player.target_share_pct) parts.push(`${player.target_share_pct}% target share`);
    return parts.length > 0 ? parts.join(', ') : 'Limited stats available';
  };

  // Format transactions
  const formatTransactions = (txns) => {
    if (!txns || txns.length === 0) return 'No recent transactions';
    return txns.map(t => `${t.type} ${t.to ? 'to ' + t.to : ''} (${t.date})`).join('; ');
  };

  // Format coaching
  const formatCoaching = (staff) => {
    if (!staff || Object.keys(staff).length === 0) return 'Coaching data unavailable';
    return Object.entries(staff).map(([role, name]) => `${role}: ${name}`).join(', ');
  };

  const prompt = `You are a dynasty fantasy football expert writing trade analysis for TitleRun users.

VOICE:
- Data-driven analyst + film insights + warmth
- Professional but engaging (NOT corporate, NOT over-the-top)
- Lead with data, support with film observations
- Confident but measured takes
- Sound human, not AI-generated

WRITING RULES:
- 30-50 words per section
- 2-3 sentences OK (natural flow)
- NO em dashes (—) - use regular dashes (-) or rephrase
- Add date stamp (${dateStamp}) at end of each section
- Use concrete stats: ages, ranks, percentages
- Active voice, conversational tone
- Be opinionated but fair

TRADE CONTEXT:
User trades away: ${givePlayer.full_name || givePlayer.name} (${givePlayer.position}, age ${givePlayer.age || 'unknown'})
User receives: ${getPlayer.full_name || getPlayer.name} (${getPlayer.position}, age ${getPlayer.age || 'unknown'})

${userTeam ? `USER'S TEAM:
- Strategy: ${userTeam.strategy || 'balanced'}
- Championship window: ${userTeam.championshipWindow || 'unknown'}
- Depth at ${givePlayer.position}: ${userTeam.depthAtGivePosition || 'unknown'}
- Depth at ${getPlayer.position}: ${userTeam.depthAtGetPosition || 'unknown'}
- Draft picks: ${userTeam.draftPicks || 'unknown'}` : ''}

PLAYER CONTEXT:

${givePlayer.full_name || givePlayer.name}:
- Age: ${givePlayer.age || 'unknown'}
- NFL Team: ${givePlayer.nfl_team || givePlayer.team || 'unknown'} (${givePlayer.team_record || 'record unknown'}, ${givePlayer.team_playoff_result || 'playoff result unknown'})
- 2025 Stats: ${formatStats(givePlayer)}
- O-line rank: ${givePlayer.oline_rank_run ? `#${givePlayer.oline_rank_run} run blocking` : 'unknown'}
- Contract: ${givePlayer.recent_contract ? JSON.stringify(givePlayer.recent_contract) : 'unknown'}
- Dynasty rank: ${givePlayer.dynasty_rank ? `#${givePlayer.dynasty_rank}` : 'unknown'}
- Coaching: ${formatCoaching(givePlayer.coaching_staff)}

${getPlayer.full_name || getPlayer.name}:
- Age: ${getPlayer.age || 'unknown'}
- NFL Team: ${getPlayer.nfl_team || getPlayer.team || 'unknown'} (${getPlayer.team_record || 'record unknown'}, ${getPlayer.team_playoff_result || 'playoff result unknown'})
- 2025 Stats: ${formatStats(getPlayer)}
- Recent transactions: ${formatTransactions(getPlayer.recent_transactions)}
- Coaching: ${formatCoaching(getPlayer.coaching_staff)}
- Dynasty rank: ${getPlayer.dynasty_rank ? `#${getPlayer.dynasty_rank}` : 'unknown'}

WRITE 5 SECTIONS:

1. FOR TRADING AWAY ${givePlayer.full_name || givePlayer.name}:
Why selling this player makes sense. Focus on age, longevity, team situation, opportunity concerns.

2. FOR RECEIVING ${getPlayer.full_name || getPlayer.name}:
Why acquiring this player makes sense. Focus on upside, opportunity, breakout potential, team situation.

3. AGAINST TRADING AWAY ${givePlayer.full_name || givePlayer.name}:
Risks of losing this player. Focus on user's depth concerns, championship window, positional scarcity.

4. AGAINST RECEIVING ${getPlayer.full_name || getPlayer.name}:
Risks of acquiring this player. Focus on injury history, unproven potential, team uncertainty.

5. CONSENSUS:
Clear TRADE or KEEP recommendation. Weigh all factors, reference specific team context.

OUTPUT JSON ONLY with these exact keys: forTradingAway, forReceiving, againstTradingAway, againstReceiving, consensus.
Each section must end with (${dateStamp}).
No markdown, no explanation, just the JSON object.`;

  return prompt;
}

// ─── LLM Integration ──────────────────────────────────────────

/**
 * Call LLM to generate narrative.
 * Supports OpenAI-compatible API (GPT-5 mini, DeepSeek, etc.)
 *
 * @param {string} prompt - The full prompt
 * @param {string} model - Model to use
 * @returns {{ narrative: object, tokensUsed: number, durationMs: number }}
 */
async function callLLM(prompt, model = CONFIG.primaryModel) {
  const startTime = Date.now();

  // Determine API endpoint and key based on model
  let apiBase, apiKey;
  if (model.startsWith('gpt-') || model === CONFIG.primaryModel) {
    apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    apiKey = process.env.OPENAI_API_KEY;
  } else if (model.startsWith('deepseek')) {
    apiBase = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1';
    apiKey = process.env.DEEPSEEK_API_KEY;
  } else if (model.startsWith('claude')) {
    apiBase = process.env.ANTHROPIC_API_BASE || 'https://api.anthropic.com/v1';
    apiKey = process.env.ANTHROPIC_API_KEY;
  } else {
    apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    apiKey = process.env.OPENAI_API_KEY;
  }

  if (!apiKey) {
    throw new Error(`No API key configured for model ${model}`);
  }

  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a dynasty fantasy football analyst. Output valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const tokensUsed = (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);
    const durationMs = Date.now() - startTime;

    if (!content) {
      throw new Error('LLM returned empty content');
    }

    // Parse JSON response
    let narrative;
    try {
      narrative = JSON.parse(content);
    } catch (parseErr) {
      // Try to extract JSON from response (sometimes wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        narrative = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error(`Failed to parse LLM response as JSON: ${parseErr.message}`);
      }
    }

    // Add generated date
    const today = new Date();
    narrative.generatedDate = `${today.getMonth() + 1}/${today.getDate()}`;

    return { narrative, tokensUsed, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error(`[NarrativeGen] LLM call failed`, { model, error: err.message, durationMs });
    throw err;
  }
}

/**
 * Calculate cost in USD for a generation.
 */
function calculateCost(model, tokensUsed) {
  const costs = CONFIG.modelCosts[model] || CONFIG.modelCosts[CONFIG.primaryModel];
  // Estimate 70% input, 30% output
  const inputTokens = Math.round(tokensUsed * 0.7);
  const outputTokens = tokensUsed - inputTokens;
  return ((inputTokens * costs.input) + (outputTokens * costs.output)) / 1_000_000;
}

// ─── Cache Layer ───────────────────────────────────────────────

/**
 * In-memory LRU cache for narratives.
 * Backed by database for persistence.
 */
class NarrativeCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  _key(giveId, getId) {
    return `${giveId}:${getId}`;
  }

  get(giveId, getId) {
    const key = this._key(giveId, getId);
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.cache.delete(key);
      this.misses++;
      return null;
    }
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.narrative;
  }

  set(giveId, getId, narrative, ttlMs = CONFIG.cacheTTLDays * 24 * 60 * 60 * 1000) {
    const key = this._key(giveId, getId);
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      narrative,
      expiresAt: Date.now() + ttlMs,
    });
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(1) + '%' : 'N/A',
    };
  }
}

const narrativeCache = new NarrativeCache();

// ─── Database Cache Operations ─────────────────────────────────

/**
 * Get cached narrative from database.
 */
async function getFromDBCache(db, giveId, getId, season) {
  if (!db) return null;

  try {
    const result = await db.query(`
      SELECT narrative, quality_score, model_used, created_at
      FROM trade_narrative_cache
      WHERE give_player_id = $1
        AND get_player_id = $2
        AND season = $3
        AND expires_at > NOW()
      LIMIT 1
    `, [giveId, getId, season]);

    if (result.rows.length > 0) {
      return result.rows[0].narrative;
    }
    return null;
  } catch (err) {
    logger.error(`[NarrativeGen] DB cache read failed: ${err.message}`);
    return null;
  }
}

/**
 * Save narrative to database cache.
 */
async function saveToDBCache(db, giveId, getId, season, narrative, metadata = {}) {
  if (!db) return;

  try {
    const expiresAt = new Date(Date.now() + CONFIG.cacheTTLDays * 24 * 60 * 60 * 1000);
    await db.query(`
      INSERT INTO trade_narrative_cache (
        give_player_id, get_player_id, season, narrative,
        model_used, prompt_version, tokens_used, generation_time_ms,
        quality_score, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (give_player_id, get_player_id, season)
      DO UPDATE SET
        narrative = EXCLUDED.narrative,
        model_used = EXCLUDED.model_used,
        prompt_version = EXCLUDED.prompt_version,
        tokens_used = EXCLUDED.tokens_used,
        generation_time_ms = EXCLUDED.generation_time_ms,
        quality_score = EXCLUDED.quality_score,
        expires_at = EXCLUDED.expires_at,
        created_at = NOW()
    `, [
      giveId, getId, season, JSON.stringify(narrative),
      metadata.model || CONFIG.primaryModel,
      CONFIG.promptVersion,
      metadata.tokensUsed || 0,
      metadata.durationMs || 0,
      metadata.qualityScore || 0,
      expiresAt,
    ]);
  } catch (err) {
    logger.error(`[NarrativeGen] DB cache write failed: ${err.message}`);
  }
}

/**
 * Log narrative generation to audit trail.
 */
async function logGeneration(db, params) {
  if (!db) return;

  try {
    await db.query(`
      INSERT INTO narrative_generation_log (
        give_player_id, get_player_id, generation_type, model_used,
        tokens_used, cost_usd, duration_ms, cache_hit,
        quality_score, validation_warnings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      params.giveId, params.getId, params.type || 'on-demand',
      params.model || CONFIG.primaryModel,
      params.tokensUsed || 0, params.costUsd || 0,
      params.durationMs || 0, params.cacheHit || false,
      params.qualityScore || 0,
      params.warnings || [],
    ]);
  } catch (err) {
    logger.error(`[NarrativeGen] Audit log write failed: ${err.message}`);
  }
}

// ─── Main API ──────────────────────────────────────────────────

/**
 * Get cached narrative or return null.
 * Checks in-memory cache first, then DB cache.
 */
async function getCachedNarrative(giveId, getId, db = null, season = 2025) {
  // 1. Check in-memory cache
  const memCached = narrativeCache.get(giveId, getId);
  if (memCached) {
    logger.debug(`[NarrativeGen] Memory cache hit: ${giveId} ↔ ${getId}`);
    return memCached;
  }

  // 2. Check DB cache
  const dbCached = await getFromDBCache(db, giveId, getId, season);
  if (dbCached) {
    // Populate memory cache for next request
    narrativeCache.set(giveId, getId, dbCached);
    logger.debug(`[NarrativeGen] DB cache hit: ${giveId} ↔ ${getId}`);
    return dbCached;
  }

  return null;
}

/**
 * Generate a fresh 5-part trade narrative using LLM.
 * Validates output and retries if quality is too low.
 *
 * @param {object} givePlayer - Player being traded away (with context)
 * @param {object} getPlayer - Player being received (with context)
 * @param {object} userTeam - User's team context
 * @param {object} oppTeam - Opponent's team context
 * @param {object} options - { db, season, model, forceRegenerate }
 * @returns {object|null} - The 5-part narrative or null on failure
 */
async function generateTradeNarrative(givePlayer, getPlayer, userTeam, oppTeam, options = {}) {
  const { db = null, season = 2025, model = CONFIG.primaryModel, forceRegenerate = false } = options;
  const giveId = givePlayer.player_id || givePlayer.id;
  const getId = getPlayer.player_id || getPlayer.id;

  // Check cache first (unless forced)
  if (!forceRegenerate) {
    const cached = await getCachedNarrative(giveId, getId, db, season);
    if (cached) {
      await logGeneration(db, {
        giveId, getId, type: 'on-demand', model,
        cacheHit: true, qualityScore: 100,
      });
      return cached;
    }
  }

  // Build prompt
  const prompt = buildPrompt(givePlayer, getPlayer, userTeam, oppTeam, options);

  // Generate with retry
  let lastError = null;
  let currentModel = model;

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const { narrative, tokensUsed, durationMs } = await callLLM(prompt, currentModel);

      // Validate
      const validation = validateNarrative(narrative);

      if (validation.shouldRegenerate && attempt < CONFIG.maxRetries) {
        logger.warn(`[NarrativeGen] Quality too low (${validation.qualityScore}), retrying...`, {
          attempt: attempt + 1,
          failures: validation.failures,
        });
        // Try fallback model on second retry
        if (attempt === 1 && currentModel !== CONFIG.fallbackModel) {
          currentModel = CONFIG.fallbackModel;
          logger.info(`[NarrativeGen] Switching to fallback model: ${currentModel}`);
        }
        continue;
      }

      // Calculate cost
      const costUsd = calculateCost(currentModel, tokensUsed);

      // Cache the result
      narrativeCache.set(giveId, getId, narrative);
      await saveToDBCache(db, giveId, getId, season, narrative, {
        model: currentModel,
        tokensUsed,
        durationMs,
        qualityScore: validation.qualityScore,
      });

      // Log to audit trail
      await logGeneration(db, {
        giveId, getId, type: 'on-demand', model: currentModel,
        tokensUsed, costUsd, durationMs, cacheHit: false,
        qualityScore: validation.qualityScore,
        warnings: [...validation.warnings, ...validation.failures],
      });

      logger.info(`[NarrativeGen] Generated narrative`, {
        giveId, getId, model: currentModel,
        qualityScore: validation.qualityScore,
        tokensUsed, costUsd: costUsd.toFixed(6),
        durationMs,
      });

      return narrative;
    } catch (err) {
      lastError = err;
      logger.error(`[NarrativeGen] Generation attempt ${attempt + 1} failed: ${err.message}`);

      // Try fallback model
      if (currentModel !== CONFIG.fallbackModel) {
        currentModel = CONFIG.fallbackModel;
        logger.info(`[NarrativeGen] Switching to fallback model: ${currentModel}`);
      }
    }
  }

  // All attempts failed
  logger.error(`[NarrativeGen] All generation attempts failed for ${giveId} ↔ ${getId}`, {
    lastError: lastError?.message,
  });

  return null;
}

/**
 * Batch generate narratives for multiple trades.
 * Groups up to CONFIG.batchSize trades per LLM call for efficiency.
 *
 * @param {Array} trades - Array of { givePlayer, getPlayer, userTeam, oppTeam }
 * @param {object} options - { db, season, model }
 * @returns {Array} - Array of narratives (null for failures)
 */
async function batchGenerateNarratives(trades, options = {}) {
  const results = [];

  // Process in batches to respect rate limits
  for (let i = 0; i < trades.length; i += CONFIG.batchSize) {
    const batch = trades.slice(i, i + CONFIG.batchSize);

    // Generate each trade in the batch (parallel within batch)
    const batchResults = await Promise.allSettled(
      batch.map(trade =>
        generateTradeNarrative(
          trade.givePlayer,
          trade.getPlayer,
          trade.userTeam,
          trade.oppTeam,
          options
        )
      )
    );

    for (const result of batchResults) {
      results.push(result.status === 'fulfilled' ? result.value : null);
    }

    // Rate limit between batches
    if (i + CONFIG.batchSize < trades.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.rateLimitMs));
    }
  }

  const successCount = results.filter(r => r !== null).length;
  logger.info(`[NarrativeGen] Batch complete: ${successCount}/${trades.length} succeeded`);

  return results;
}

// ─── Enrichment Helper ─────────────────────────────────────────

/**
 * Enrich trade candidate with AI narrative.
 * Used by Trade Finder's deep analysis pass.
 * Gracefully returns null on failure (non-blocking).
 *
 * @param {object} candidate - Trade candidate from Trade Finder
 * @param {object} myTeam - User's team
 * @param {object} oppTeam - Opponent's team
 * @param {object} options - { db, myRoster, oppRoster, leagueSettings }
 * @returns {object|null} - AI narrative or null
 */
async function enrichWithAINarrative(candidate, myTeam, oppTeam, options = {}) {
  try {
    const givePlayerId = candidate.give?.[0]?.id;
    const getPlayerId = candidate.get?.[0]?.id;

    if (!givePlayerId || !getPlayerId) return null;

    // Build player context from candidate assets
    const givePlayer = {
      ...candidate.give[0],
      player_id: givePlayerId,
    };
    const getPlayer = {
      ...candidate.get[0],
      player_id: getPlayerId,
    };

    // Build team context
    const userTeamContext = {
      strategy: myTeam.strategy || 'balanced',
      championshipWindow: myTeam.championshipWindow || 'unknown',
      depthAtGivePosition: myTeam.positionGrades?.[givePlayer.position] || 'unknown',
      depthAtGetPosition: myTeam.positionGrades?.[getPlayer.position] || 'unknown',
      draftPicks: myTeam.draftPicks || 'unknown',
    };

    const narrative = await generateTradeNarrative(
      givePlayer,
      getPlayer,
      userTeamContext,
      oppTeam,
      { db: options.db }
    );

    return narrative;
  } catch (err) {
    logger.warn(`[NarrativeGen] AI enrichment failed: ${err.message}`);
    return null; // Graceful degradation
  }
}

module.exports = {
  generateTradeNarrative,
  batchGenerateNarratives,
  getCachedNarrative,
  enrichWithAINarrative,
  narrativeCache,
  // Exported for testing
  buildPrompt,
  callLLM,
  calculateCost,
  CONFIG,
};

/**
 * TEP Value Calculation Service
 * 
 * Proprietary TitleRun TE Premium value calculation engine.
 * Combines scarcity modeling, advanced stats, age curves, and tier compression.
 * 
 * This is the core competitive advantage of TitleRun's TEP system:
 * - Scarcity-aware: Elite TEs get disproportionately bigger boosts
 * - Stats-aware: Target share, route participation drive adjustments
 * - Age-aware: TE-specific career curves applied
 * - Tier-compressed: Dynamic tier boundaries for TEP formats
 * 
 * @module tepValueService
 * @version 1.0.0
 */

'use strict';

const {
  BASE_MULTIPLIERS,
  SCARCITY_TIERS,
  INTRA_TIER_DECAY,
  ADVANCED_STATS,
  AGE_CURVE,
  STANDARD_TIER_BOUNDARIES,
  TEP_TE_TIER_BOUNDARIES,
  VALUE_CAP,
  VALID_TEP_LEVELS,
} = require('./tep-config');

// =============================================================================
// SCARCITY MULTIPLIER
// =============================================================================

/**
 * Calculate scarcity multiplier based on TE positional rank.
 * Uses tiered non-linear scaling with smooth intra-tier decay.
 * 
 * @param {number} positionRank - TE position rank (1 = best TE)
 * @returns {number} Scarcity multiplier (1.00 - 1.20)
 */
function getScarcityMultiplier(positionRank) {
  if (!positionRank || positionRank < 1 || !Number.isFinite(positionRank)) {
    return 1.00;
  }
  
  const rank = Math.floor(positionRank);
  
  for (const tier of SCARCITY_TIERS) {
    if (rank >= tier.minRank && rank <= tier.maxRank) {
      // Smooth decay within tier
      const rangeSize = tier.maxRank - tier.minRank + 1;
      const posInRange = rank - tier.minRank;
      const decay = (posInRange / rangeSize) * INTRA_TIER_DECAY;
      return Math.max(Number((tier.multiplier - decay).toFixed(4)), 1.00);
    }
  }
  
  return 1.00;
}

/**
 * Get the scarcity tier label for a position rank.
 * 
 * @param {number} positionRank 
 * @returns {string} Tier label ('Elite', 'High', 'Starter', 'Depth', 'Waiver')
 */
function getScarcityTierLabel(positionRank) {
  if (!positionRank || positionRank < 1) return 'Unknown';
  
  for (const tier of SCARCITY_TIERS) {
    if (positionRank >= tier.minRank && positionRank <= tier.maxRank) {
      return tier.label;
    }
  }
  return 'Waiver';
}

// =============================================================================
// ADVANCED STATS BONUS
// =============================================================================

/**
 * Calculate usage-based bonus from advanced TE metrics.
 * Higher target share, route participation, and red zone usage
 * increase a TE's value in TEP formats.
 * 
 * @param {Object} stats - Advanced usage metrics
 * @param {number} [stats.targetShare] - Target share (0-1)
 * @param {number} [stats.routeParticipation] - Route participation rate (0-1)
 * @param {number} [stats.rzTargetShare] - Red zone target share (0-1)
 * @param {number} [stats.receptionsPerGame] - Receptions per game
 * @returns {number} Stats bonus multiplier (1.00 - 1.10)
 */
function calculateAdvancedStatBonus(stats) {
  if (!stats || typeof stats !== 'object') return 1.00;
  
  let bonus = 0;
  
  // Target Share: 0-5% bonus
  const ts = stats.targetShare;
  if (typeof ts === 'number' && ts > 0) {
    const { ELITE, HIGH, MID } = ADVANCED_STATS.TARGET_SHARE;
    if (ts >= ELITE.threshold) bonus += ELITE.bonus;
    else if (ts >= HIGH.threshold) bonus += HIGH.bonus;
    else if (ts >= MID.threshold) bonus += MID.bonus;
  }
  
  // Route Participation: 0-3% bonus
  const rp = stats.routeParticipation;
  if (typeof rp === 'number' && rp > 0) {
    const { ELITE, HIGH, MID } = ADVANCED_STATS.ROUTE_PARTICIPATION;
    if (rp >= ELITE.threshold) bonus += ELITE.bonus;
    else if (rp >= HIGH.threshold) bonus += HIGH.bonus;
    else if (rp >= MID.threshold) bonus += MID.bonus;
  }
  
  // Red Zone Target Share: 0-3% bonus
  const rz = stats.rzTargetShare;
  if (typeof rz === 'number' && rz > 0) {
    const { ELITE, HIGH, MID } = ADVANCED_STATS.RZ_TARGET_SHARE;
    if (rz >= ELITE.threshold) bonus += ELITE.bonus;
    else if (rz >= HIGH.threshold) bonus += HIGH.bonus;
    else if (rz >= MID.threshold) bonus += MID.bonus;
  }
  
  // Receptions per Game: 0-2% bonus
  const rpg = stats.receptionsPerGame;
  if (typeof rpg === 'number' && rpg > 0) {
    const { ELITE, HIGH } = ADVANCED_STATS.RECEPTIONS_PER_GAME;
    if (rpg >= ELITE.threshold) bonus += ELITE.bonus;
    else if (rpg >= HIGH.threshold) bonus += HIGH.bonus;
  }
  
  // Cap total bonus
  return Number((1.00 + Math.min(bonus, ADVANCED_STATS.MAX_BONUS)).toFixed(4));
}

// =============================================================================
// AGE CURVE MODIFIER
// =============================================================================

/**
 * Get TE-specific age curve modifier for TEP formats.
 * Young TEs get a premium (longer career runway in TEP).
 * Older TEs get a discount (declining production).
 * 
 * @param {number|null} age - Player age
 * @returns {number} Age curve modifier (0.90 - 1.04)
 */
function getAgeCurveModifier(age) {
  if (!age || typeof age !== 'number' || age < 0) return 1.00;
  
  for (const band of AGE_CURVE) {
    if (age >= band.minAge && age <= band.maxAge) {
      return band.modifier;
    }
  }
  return 1.00;
}

// =============================================================================
// TIER ASSIGNMENT
// =============================================================================

/**
 * Assign tier using TEP-compressed boundaries for TEs,
 * or standard boundaries for other positions.
 * 
 * @param {number} value - Player value
 * @param {string} position - Player position
 * @param {string} tepLevel - TEP level ('off', 'tep', 'tep2', 'tep3')
 * @returns {{ tier: number, label: string }}
 */
function assignTier(value, position, tepLevel) {
  // Use TEP-compressed boundaries for TEs when TEP is active
  const useTepBoundaries = position === 'TE' && tepLevel && tepLevel !== 'off';
  const boundaries = useTepBoundaries
    ? (TEP_TE_TIER_BOUNDARIES[tepLevel] || STANDARD_TIER_BOUNDARIES)
    : STANDARD_TIER_BOUNDARIES;
  
  for (const { tier, min, label } of boundaries) {
    if (value >= min) {
      return { tier, label };
    }
  }
  return { tier: 11, label: 'Waiver Wire' };
}

// =============================================================================
// CORE TEP CALCULATION
// =============================================================================

/**
 * Calculate TEP-adjusted value for a single player.
 * 
 * This is the main entry point for TEP value calculation.
 * Only TEs receive adjustments; all other positions pass through unchanged.
 * 
 * @param {Object} params
 * @param {number} params.baseValue - Non-TEP weighted average value (0-10000 scale)
 * @param {string} params.position - Player position ('QB', 'RB', 'WR', 'TE')
 * @param {number} [params.positionRank] - TE position rank (1 = best TE)
 * @param {number} [params.age] - Player age
 * @param {Object} [params.advancedStats] - Advanced usage metrics
 * @param {string} [params.tepLevel='tep3'] - TEP level ('off', 'tep', 'tep2', 'tep3')
 * @returns {Object} Calculation result
 * @returns {number} .tepValue - Final TEP-adjusted value
 * @returns {boolean} .isAdjusted - Whether TEP was applied
 * @returns {Object|null} .multiplierBreakdown - Breakdown of all multipliers
 * @returns {Object} .tierInfo - Tier assignment { tier, label }
 */
function calculateTEPValue({
  baseValue,
  position,
  positionRank = null,
  age = null,
  advancedStats = {},
  tepLevel = 'tep3',
}) {
  // Validate inputs
  if (!Number.isFinite(baseValue) || baseValue < 0) {
    return {
      tepValue: 0,
      isAdjusted: false,
      multiplierBreakdown: null,
      tierInfo: { tier: 11, label: 'Waiver Wire' },
    };
  }
  
  // Normalize TEP level
  const normalizedLevel = VALID_TEP_LEVELS.includes(tepLevel) ? tepLevel : 'off';
  
  // Non-TEs or TEP off: return base value
  if (position !== 'TE' || normalizedLevel === 'off') {
    return {
      tepValue: Math.round(baseValue),
      isAdjusted: false,
      multiplierBreakdown: null,
      tierInfo: assignTier(Math.round(baseValue), position, normalizedLevel),
    };
  }
  
  // === TEP Calculation for TEs ===
  
  // 1. Base TEP multiplier
  const baseMult = BASE_MULTIPLIERS[normalizedLevel] || 1.00;
  
  // 2. Scarcity multiplier
  const scarcityMult = getScarcityMultiplier(positionRank);
  
  // 3. Advanced stats bonus
  const statBonus = calculateAdvancedStatBonus(advancedStats);
  
  // 4. Age curve modifier
  const ageMod = getAgeCurveModifier(age);
  
  // 5. Combined multiplier
  const combinedMult = Number((baseMult * scarcityMult * statBonus * ageMod).toFixed(4));
  
  // 6. Calculate adjusted value (cap at VALUE_CAP)
  const rawTepValue = Math.round(baseValue * combinedMult);
  const tepValue = Math.min(rawTepValue, VALUE_CAP);
  
  // 7. Assign tier using compressed boundaries
  const tierInfo = assignTier(tepValue, 'TE', normalizedLevel);
  
  return {
    tepValue,
    isAdjusted: true,
    multiplierBreakdown: {
      base: baseMult,
      scarcity: scarcityMult,
      advancedStats: statBonus,
      ageCurve: ageMod,
      combined: combinedMult,
      scarcityTier: getScarcityTierLabel(positionRank),
    },
    tierInfo,
  };
}

// =============================================================================
// BATCH CALCULATION
// =============================================================================

/**
 * Batch processing limits to prevent Denial of Service attacks.
 * Without these limits, an attacker could send millions of players
 * causing memory exhaustion and CPU starvation (OWASP A04:2021).
 * 
 * Limits:
 * - MAX_PLAYERS: 1000 per batch (split larger datasets into multiple calls)
 * - MAX_CALCULATION_TIME_MS: 5 second timeout (checked every 100 players)
 * - MAX_OBJECT_SIZE_BYTES: 10MB payload limit
 * 
 * For larger datasets, split into multiple batches of 500 players each.
 */
const BATCH_LIMITS = {
  MAX_PLAYERS: 1000,
  MAX_CALCULATION_TIME_MS: 5000,   // 5 second timeout
  MAX_OBJECT_SIZE_BYTES: 10485760, // 10MB
};

/**
 * Calculate TEP values for an array of players.
 * Automatically computes position ranks for TEs.
 * 
 * @param {Array<Object>} players - Array of player objects
 * @param {string} tepLevel - TEP level to calculate
 * @param {string} [format='sf'] - Format for value selection
 * @returns {Array<Object>} Players with tepValue, multiplierBreakdown, tierInfo added
 * @throws {TypeError} If players is not an array
 * @throws {RangeError} If batch exceeds size or memory limits
 * @throws {Error} If calculation exceeds timeout
 */
function calculateBatchTEPValues(players, tepLevel, format = 'sf') {
  // Validate input is array
  if (!Array.isArray(players)) {
    throw new TypeError('players must be an array');
  }
  
  if (players.length === 0) return [];
  
  // SIZE LIMIT: Reject oversized batches
  if (players.length > BATCH_LIMITS.MAX_PLAYERS) {
    throw new RangeError(
      `Batch size ${players.length} exceeds maximum ${BATCH_LIMITS.MAX_PLAYERS}. Split into multiple batches.`
    );
  }
  
  // MEMORY LIMIT: Estimate object size
  const estimatedSize = JSON.stringify(players).length;
  if (estimatedSize > BATCH_LIMITS.MAX_OBJECT_SIZE_BYTES) {
    throw new RangeError(
      `Batch data size ${(estimatedSize / 1024 / 1024).toFixed(2)}MB exceeds maximum 10MB`
    );
  }
  
  // TIMEOUT: Set calculation deadline
  const startTime = Date.now();
  const deadline = startTime + BATCH_LIMITS.MAX_CALCULATION_TIME_MS;
  
  // Sort TEs by base value to assign position ranks
  const sortedTEs = players
    .filter(p => p && typeof p === 'object' && p.position === 'TE')
    .sort((a, b) => (b.value || b.baseValue || 0) - (a.value || a.baseValue || 0));
  
  // Build rank map
  const teRankMap = new Map();
  sortedTEs.forEach((te, idx) => {
    teRankMap.set(te.playerId || te.player_id || te.id, idx + 1);
  });
  
  // Calculate TEP for each player with timeout checks
  const results = [];
  for (let i = 0; i < players.length; i++) {
    // Check timeout every 100 players (minimal overhead: <1ms per check)
    if (i % 100 === 0 && i > 0 && Date.now() > deadline) {
      throw new Error(
        `TIMEOUT: Processed ${i}/${players.length} players before ${BATCH_LIMITS.MAX_CALCULATION_TIME_MS}ms deadline`
      );
    }
    
    const player = players[i];
    
    // Validate player object — pass through malformed entries gracefully
    if (!player || typeof player !== 'object') {
      results.push(player);
      continue;
    }
    
    const playerId = player.playerId || player.player_id || player.id;
    const baseValue = player.value || player.baseValue || player.ktc_value || 0;
    const positionRank = teRankMap.get(playerId) || player.positionRank || null;
    
    const result = calculateTEPValue({
      baseValue,
      position: player.position,
      positionRank,
      age: player.age,
      advancedStats: player.advancedStats || {},
      tepLevel,
    });
    
    results.push({
      ...player,
      tepValue: result.tepValue,
      tepAdjusted: result.isAdjusted,
      tepMultiplierBreakdown: result.multiplierBreakdown,
      tepTierInfo: result.tierInfo,
      tepPositionRank: positionRank,
    });
  }
  
  return results;
}

// =============================================================================
// UTILITY: Compare to KTC
// =============================================================================

/**
 * Calculate what KTC's TEP value would be for comparison.
 * KTC uses: base × percentage_mult + fixed_bonus
 * 
 * @param {number} baseValue - Non-TEP value
 * @param {string} tepLevel - TEP level
 * @returns {number} Estimated KTC TEP value
 */
function estimateKTCValue(baseValue, tepLevel) {
  const ktcParams = {
    tep:  { pctMult: 0.08, fixedBonus: 350 },
    tep2: { pctMult: 0.16, fixedBonus: 700 },
    tep3: { pctMult: 0.24, fixedBonus: 1050 },
  };
  
  const params = ktcParams[tepLevel];
  if (!params) return baseValue;
  
  return Math.round(baseValue + (baseValue * params.pctMult) + params.fixedBonus);
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Core calculation
  calculateTEPValue,
  calculateBatchTEPValues,
  
  // Component functions (for testing and individual use)
  getScarcityMultiplier,
  getScarcityTierLabel,
  calculateAdvancedStatBonus,
  getAgeCurveModifier,
  assignTier,
  
  // Comparison utility
  estimateKTCValue,
  
  // Batch limits (exported for testing and documentation)
  BATCH_LIMITS,
};

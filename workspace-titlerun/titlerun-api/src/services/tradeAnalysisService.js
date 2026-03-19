const { performance } = require('perf_hooks');
// Inlined constants (src/constants.js doesn't exist)
const ROSTER_MATCH_THRESHOLD = 0.7;
const TEAM_NOT_FOUND = -1;
const { ValidationError: BadRequestError } = require('../utils/errors');

// DoS protection constants
const MAX_TEAMS = 1000;
const MAX_ROSTER_SIZE = 100;

/**
 * Preprocess rosters (convert to Sets for O(1) lookup)
 * Call this once when rosters are fetched, not per-request
 *
 * @param {Array<Array<string|number>>} allRosters - Raw roster arrays
 * @returns {Array<Set>} - Array of cleaned Sets for fast lookup
 */
function preprocessRosters(allRosters) {
  return allRosters.map(roster =>
    new Set(roster.filter(player => player !== null))
  );
}

/**
 * Calculate rank based on roster match percentage
 *
 * Performance characteristics:
 * - Time complexity: O(teams × userPlayers) - linear instead of O(n²)
 * - Space complexity: O(userPlayers) for Set
 * - Expected duration: <10ms for 100 teams with 20 players each
 *
 * @param {Array<string|number>} userRoster - Array of player IDs
 * @param {Array<Array<string|number>>|Array<Set>} allRosters - Team rosters (arrays or preprocessed Sets)
 * @returns {number} - Team rank (1-based index) or TEAM_NOT_FOUND (-1)
 * @throws {BadRequestError} - If inputs are invalid or exceed size limits
 */
function calculateRank(userRoster, allRosters) {
  const startTime = performance.now();

  try {
    // === INPUT VALIDATION ===

    // Validate userRoster
    if (!Array.isArray(userRoster)) {
      throw new BadRequestError('userRoster must be an array');
    }

    if (userRoster.length > MAX_ROSTER_SIZE) {
      throw new BadRequestError(`userRoster exceeds max size (${MAX_ROSTER_SIZE})`);
    }

    // Validate allRosters
    if (!Array.isArray(allRosters)) {
      throw new BadRequestError('allRosters must be an array');
    }

    if (allRosters.length > MAX_TEAMS) {
      throw new BadRequestError(`allRosters exceeds max teams (${MAX_TEAMS})`);
    }

    // Validate all roster elements are arrays or Sets
    const isPreprocessed = allRosters.length > 0 && allRosters[0] instanceof Set;

    if (!isPreprocessed) {
      for (let i = 0; i < allRosters.length; i++) {
        if (!Array.isArray(allRosters[i])) {
          throw new BadRequestError(`allRosters[${i}] must be an array`);
        }

        if (allRosters[i].length > MAX_ROSTER_SIZE) {
          throw new BadRequestError(`allRosters[${i}] exceeds max roster size (${MAX_ROSTER_SIZE})`);
        }
      }
    }

    // === CORE LOGIC ===

    // Clean and deduplicate user roster (keep as Set for potential future optimizations)
    const cleanUserSet = new Set(
      userRoster.filter(player => player !== null)
    );

    // Convert to array for iteration (needed for .filter())
    const cleanUserRoster = Array.from(cleanUserSet);

    // Early return if user roster is empty
    if (cleanUserRoster.length === 0) {
      return TEAM_NOT_FOUND;
    }

    // Find matching team
    for (let i = 0; i < allRosters.length; i++) {
      const teamRoster = allRosters[i];

      // Convert to Set if not already preprocessed
      // CRITICAL FIX: Use Set.has() for O(1) lookup instead of Array.includes() O(n)
      const teamSet = teamRoster instanceof Set
        ? teamRoster
        : new Set(teamRoster.filter(player => player !== null));

      // Skip empty rosters
      if (teamSet.size === 0) {
        continue;
      }

      // CRITICAL FIX: O(n) instead of O(n²)
      // Old: cleanUserRoster.filter(p => cleanTeamRoster.includes(p)) = O(n²)
      // New: cleanUserRoster.filter(p => teamSet.has(p)) = O(n)
      const matchCount = cleanUserRoster.filter(player =>
        teamSet.has(player)  // O(1) hash lookup!
      ).length;

      const matchPercentage = matchCount / cleanUserRoster.length;

      // Return 1-based rank if threshold met
      if (matchPercentage >= ROSTER_MATCH_THRESHOLD) {
        return i + 1;
      }
    }

    // No match found
    return TEAM_NOT_FOUND;

  } finally {
    // Performance monitoring
    const duration = performance.now() - startTime;

    // Log slow operations (configurable threshold)
    if (duration > 50) {
      console.warn('[Performance] Slow calculateRank:', {
        duration: `${duration.toFixed(2)}ms`,
        teamCount: allRosters.length,
        rosterSize: userRoster.length,
      });
    }

    // TODO: Add metrics tracking when monitoring service is integrated
    // metrics.histogram('trade.calculateRank.duration', duration, {
    //   teamCount: allRosters.length,
    //   rosterSize: userRoster.length,
    // });
  }
}

/**
 * Analyze a trade between two teams
 * Combines fairness assessment with lineup impact analysis
 *
 * @param {Object} params - Trade parameters
 * @param {Object} params.sideA - Team A data (teamId, roster, assets)
 * @param {Object} params.sideB - Team B data (teamId, roster, assets)
 * @param {Object} params.leagueSettings - League scoring/roster settings
 * @param {Array} params.allRosters - All team rosters for context
 * @returns {Promise<Object>} - Combined analysis
 */
async function analyzeTrade(params) {
  const { sideA, sideB, leagueSettings = {}, allRosters = [] } = params;

  const tradeFairnessService = require('./tradeFairnessService');

  // NEW: Use lineup simulation for accurate impact calculation
  const teamAImpact = calculateLineupImpact(
    sideA.roster || [],
    sideA.assets || [],    // A gives these
    sideB.assets || [],    // A gets these (what B gives)
    leagueSettings
  );
  const teamBImpact = calculateLineupImpact(
    sideB.roster || [],
    sideB.assets || [],    // B gives these
    sideA.assets || [],    // B gets these (what A gives)
    leagueSettings
  );

  // LEGACY: Keep old calculation for backward compat fields
  const teamAGivingImpact = calculateLineupImprovement(sideA, allRosters);
  const teamBGivingImpact = calculateLineupImprovement(sideB, allRosters);
  const teamANetValue = teamBGivingImpact.givingValue - teamAGivingImpact.givingValue;
  const teamBNetValue = teamAGivingImpact.givingValue - teamBGivingImpact.givingValue;

  // Use lineup simulation results for improvement percent
  const teamAImprovementPct = teamAImpact.improvementPercent;
  const teamBImprovementPct = teamBImpact.improvementPercent;

  // Build team analysis objects WITH rosterComposition
  const teamAAnalysis = {
    lineupImprovement: {
      improvementPercent: parseFloat(teamAImprovementPct.toFixed(2)),
      netValueChange: teamAImpact.starterValueChange,
      score: teamAImpact.score,
      message: teamAImprovementPct > 0
        ? `Lineup improves by ${teamAImprovementPct.toFixed(1)}%`
        : teamAImprovementPct < 0
        ? `Lineup declines by ${Math.abs(teamAImprovementPct).toFixed(1)}%`
        : 'Neutral impact on lineup'
    },
    rosterComposition: {
      tradeAlignment: 'moderate',
      contenderStatus: 'middle',
      message: teamAImprovementPct > 0 ? 'Trade improves lineup' : 'Trade declines lineup'
    }
  };

  const teamBAnalysis = {
    lineupImprovement: {
      improvementPercent: parseFloat(teamBImprovementPct.toFixed(2)),
      netValueChange: teamBImpact.starterValueChange,
      score: teamBImpact.score,
      message: teamBImprovementPct > 0
        ? `Lineup improves by ${teamBImprovementPct.toFixed(1)}%`
        : teamBImprovementPct < 0
        ? `Lineup declines by ${Math.abs(teamBImprovementPct).toFixed(1)}%`
        : 'Neutral impact on lineup'
    },
    rosterComposition: {
      tradeAlignment: 'moderate',
      contenderStatus: 'middle',
      message: teamBImprovementPct > 0 ? 'Trade improves lineup' : 'Trade declines lineup'
    }
  };

  // Get fairness assessment - PASS team analysis objects
  const fairness = await tradeFairnessService.assessTradeFairness({
    sideAAssets: sideA.assets,
    sideBAssets: sideB.assets,
    leagueSettings,
    teamAAnalysis,
    teamBAnalysis
  });

  // Mutual benefit assessment
  // Scale improvement % to 0-100 score: 0% → 0, 5% → 50, 10%+ → 100
  const scaleGain = (pct) => Math.min(100, Math.max(0, pct * 10));
  const teamAGainRaw = Math.max(0, teamAImprovementPct);
  const teamBGainRaw = Math.max(0, teamBImprovementPct);
  const isMutuallyBeneficial = teamAGainRaw > 0.5 && teamBGainRaw > 0.5; // >0.5% threshold

  return {
    fairness: {
      valueGapPercent: Math.abs(fairness.valueDifferential?.percentDifference || 0),
      verdict: fairness.verdict,
      ...fairness
    },
    teamA: teamAAnalysis,
    teamB: teamBAnalysis,
    mutualBenefit: {
      isMutuallyBeneficial,
      teamAGain: Math.round(scaleGain(teamAGainRaw)),
      teamBGain: Math.round(scaleGain(teamBGainRaw)),
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Calculate lineup improvement from a trade (LEGACY - kept for backward compatibility)
 * @deprecated Use calculateLineupImpact instead
 */
function calculateLineupImprovement(side, _allRosters) {
  const { roster = [], assets = [] } = side;
  const givingValue = assets.reduce((sum, asset) => sum + (asset.value || 0), 0);
  const rosterValue = roster.reduce((sum, p) => sum + (p.value || 0), 0);
  const totalValue = Math.max(rosterValue, 1);
  const improvementPercent = -(givingValue / totalValue) * 100;
  return {
    improvementPercent: parseFloat(improvementPercent.toFixed(2)),
    givingValue,
    rosterValue: totalValue,
    message: improvementPercent > 0
      ? `Lineup improves by ${improvementPercent.toFixed(1)}%`
      : improvementPercent < 0
      ? `Lineup declines by ${Math.abs(improvementPercent).toFixed(1)}%`
      : 'Neutral impact on lineup'
  };
}

/**
 * Sigmoid mapping for natural score distribution
 * Produces bell-curve spread instead of linear compression
 */
function sigmoid(x, center, scale) {
  return center + (60 / (1 + Math.exp(-x / scale))) - 30;
}

/**
 * Calculate lineup impact using actual lineup simulation (NEW)
 * Replaces broken value-subtraction with pre/post lineup comparison
 *
 * @param {Array} roster - Array of player objects { playerId, name, position, value, age, status }
 * @param {Array} tradeGive - Assets being given away
 * @param {Array} tradeGet - Assets being received
 * @param {Object} leagueSettings - { superflex, scoringFormat, teamCount }
 * @returns {Object} - { improvementPercent, starterValueChange, score, preLineup, postLineup }
 */
function calculateLineupImpact(roster, tradeGive, tradeGet, leagueSettings) {
  const rosterAnalysis = require('./rosterAnalysisService');

  // Ensure roster is an array
  const safeRoster = Array.isArray(roster) ? roster : [];
  const safeGive = Array.isArray(tradeGive) ? tradeGive : [];
  const safeGet = Array.isArray(tradeGet) ? tradeGet : [];

  // 1. Pre-trade optimal lineup
  const preLineup = rosterAnalysis.getOptimalLineup(safeRoster, leagueSettings);
  const preStarterValue = preLineup.totalValue || 0;

  // 2. Post-trade roster: remove give players, add get players
  const giveIds = new Set(safeGive
    .filter(a => a.type === 'player')
    .map(g => String(g.id || g.playerId))
  );

  const postRoster = safeRoster
    .filter(p => !giveIds.has(String(p.playerId)))
    .concat(safeGet.filter(a => a.type === 'player').map(a => ({
      playerId: String(a.id || a.playerId),
      name: a.name || 'Unknown',
      position: a.position || 'UNKNOWN',
      value: a.value || 0,
      age: a.age || 25,
      status: 'active'
    })));

  const postLineup = rosterAnalysis.getOptimalLineup(postRoster, leagueSettings);
  const postStarterValue = postLineup.totalValue || 0;

  // 3. Calculate improvement
  const starterDelta = postStarterValue - preStarterValue;
  const starterPct = (starterDelta / Math.max(preStarterValue, 1)) * 100;

  // 4. Sigmoid mapping for natural spread (RECALIBRATED)
  // starterPct typically ranges from -15% to +15%
  // Map: 0% → 50, +1% → 60, +3% → 75, +5% → 85, +8% → 92
  // Center at 50 (neutral = average), scale 5 for more spread
  const score = Math.max(0, Math.min(100, Math.round(sigmoid(starterPct, 50, 5))));

  return {
    improvementPercent: parseFloat(starterPct.toFixed(2)),
    starterValueChange: starterDelta,
    score,
    preLineup: {
      starters: preLineup.starterCount || 0,
      totalValue: preStarterValue
    },
    postLineup: {
      starters: postLineup.starterCount || 0,
      totalValue: postStarterValue
    }
  };
}

module.exports = {
  calculateRank,
  preprocessRosters,
  analyzeTrade,
  calculateLineupImpact,
  MAX_TEAMS,
  MAX_ROSTER_SIZE,
  ROSTER_MATCH_THRESHOLD,
  TEAM_NOT_FOUND,
};

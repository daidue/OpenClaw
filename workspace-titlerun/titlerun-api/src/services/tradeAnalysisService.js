const { performance } = require('perf_hooks');
const { ROSTER_MATCH_THRESHOLD, TEAM_NOT_FOUND } = require('../constants');
const BadRequestError = require('../errors/BadRequestError');

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
    new Set(roster.filter(player => player != null))
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
      userRoster.filter(player => player != null)
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
        : new Set(teamRoster.filter(player => player != null));

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

module.exports = {
  calculateRank,
  preprocessRosters,
  MAX_TEAMS,
  MAX_ROSTER_SIZE,
};

const { ROSTER_MATCH_THRESHOLD, TEAM_NOT_FOUND } = require('../constants');
const BadRequestError = require('../errors/BadRequestError');

/**
 * Calculate rank based on roster match percentage
 * @param {Array<string|number>} userRoster - Array of player IDs (strings or numbers)
 * @param {Array<Array<string|number>>} allRosters - Array of team rosters
 * @returns {number} - Team rank (1-based index) or TEAM_NOT_FOUND (-1)
 * @throws {BadRequestError} - If inputs are invalid
 */
function calculateRank(userRoster, allRosters) {
  // Validate userRoster
  if (!Array.isArray(userRoster)) {
    throw new BadRequestError('userRoster must be an array');
  }

  // Validate allRosters
  if (!Array.isArray(allRosters)) {
    throw new BadRequestError('allRosters must be an array');
  }

  // Validate all roster elements are arrays before processing
  for (let i = 0; i < allRosters.length; i++) {
    if (!Array.isArray(allRosters[i])) {
      throw new BadRequestError(`allRosters[${i}] must be an array`);
    }
  }

  // Filter out null/undefined players and deduplicate
  const cleanUserRoster = [...new Set(
    userRoster.filter(player => player != null)
  )];

  // If user roster is empty after cleaning, no match possible
  if (cleanUserRoster.length === 0) {
    return TEAM_NOT_FOUND;
  }

  // Find matching team
  for (let i = 0; i < allRosters.length; i++) {
    const teamRoster = allRosters[i];

    // Clean and deduplicate team roster
    const cleanTeamRoster = [...new Set(
      teamRoster.filter(player => player != null)
    )];

    // Skip empty rosters
    if (cleanTeamRoster.length === 0) {
      continue;
    }

    // Calculate match percentage using deduplicated sets
    const matchCount = cleanUserRoster.filter(player =>
      cleanTeamRoster.includes(player)
    ).length;

    const matchPercentage = matchCount / cleanUserRoster.length;

    // Return 1-based rank if threshold met
    if (matchPercentage >= ROSTER_MATCH_THRESHOLD) {
      return i + 1;
    }
  }

  // No match found
  return TEAM_NOT_FOUND;
}

module.exports = {
  calculateRank,
};

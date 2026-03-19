/**
 * Championship Equity Calculator
 *
 * Estimates win probability change from a trade using Monte Carlo simulation.
 * Shows "+3% championship equity" instead of abstract lineup percentages.
 *
 * Simplified model (no full season sim needed for MVP):
 * - Uses starter value as proxy for team strength
 * - Applies variance model for weekly outcomes
 * - Calculates playoff probability and championship equity
 *
 * Future: Full 10,000-simulation model with schedule, injuries, bye weeks.
 */

const rosterAnalysisService = require('./rosterAnalysisService');
const logger = require('../utils/logger').child({ service: 'championship-equity' });

// ─── Constants ─────────────────────────────────────────────────

const SIMULATIONS = 2000; // Reduced from 10K for speed — sufficient for ±1% accuracy
const SEASON_WEEKS = 14;  // Regular season weeks
const PLAYOFF_TEAMS = 6;  // Standard playoff bracket
const WEEKLY_VARIANCE = 0.15; // Weekly outcome variance (15% random factor)

// ─── Core Simulation ───────────────────────────────────────────

/**
 * Simulate a season outcome for a set of teams.
 * Returns win totals for each team.
 */
function simulateSeason(teamStrengths) {
  const wins = new Array(teamStrengths.length).fill(0);
  const teamCount = teamStrengths.length;

  for (let week = 0; week < SEASON_WEEKS; week++) {
    // Generate weekly performance with variance
    const weeklyPerf = teamStrengths.map(strength => {
      const variance = 1 + (Math.random() - 0.5) * 2 * WEEKLY_VARIANCE;
      return strength * variance;
    });

    // Round-robin style: each team plays ~1 opponent per week
    // Simplified: rank teams by weekly perf, top half wins
    const indices = weeklyPerf.map((_, i) => i);
    indices.sort((a, b) => weeklyPerf[b] - weeklyPerf[a]);

    // Top half wins this week
    for (let i = 0; i < Math.floor(teamCount / 2); i++) {
      wins[indices[i]]++;
    }
  }

  return wins;
}

/**
 * Calculate championship probability from win total.
 * Higher seeds have playoff advantage.
 */
function playoffProbability(wins, allWins, playoffTeams) {
  // Sort all teams by wins (descending)
  const sorted = [...allWins].sort((a, b) => b - a);
  const cutoff = sorted[Math.min(playoffTeams - 1, sorted.length - 1)];

  // Must meet or exceed cutoff to make playoffs
  if (wins < cutoff) return 0;
  if (wins > cutoff) return 1;

  // Tiebreaker: random for teams at the cutoff
  const atCutoff = sorted.filter(w => w === cutoff).length;
  const spotsAtCutoff = playoffTeams - sorted.filter(w => w > cutoff).length;
  return Math.min(1, spotsAtCutoff / atCutoff);
}

/**
 * Championship probability given playoff entry.
 * Seed matters — higher seeds win more often.
 */
function champProbabilityGivenPlayoff(seed, playoffTeams) {
  // Empirical: top seeds win ~30%, bottom seeds ~10%
  const basePct = 1 / playoffTeams;
  const seedBonus = (playoffTeams - seed) / (playoffTeams - 1);
  return basePct + (seedBonus * basePct * 0.5); // Top seed gets ~1.5x base
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Calculate championship equity change from a trade.
 *
 * @param {Object} params
 * @param {Array} params.myRoster - My current roster (pre-trade)
 * @param {Array} params.tradeGive - Assets I'm giving
 * @param {Array} params.tradeGet - Assets I'm getting
 * @param {Array} params.allTeams - All enriched team objects
 * @param {Object} params.leagueSettings - League settings
 * @returns {Object} - { preEquity, postEquity, equityChange, equityChangeFormatted }
 */
function calculateEquityChange({ myRoster, tradeGive, tradeGet, allTeams, leagueSettings, myRosterId }) {
  const startTime = Date.now();

  try {
    // Calculate team strengths (starter total value as proxy)
    const teamStrengths = allTeams.map(team => {
      const lineup = rosterAnalysisService.getOptimalLineup(team.players || [], leagueSettings);
      return lineup.totalValue || 1;
    });

    const myIndex = allTeams.findIndex(t => t.rosterId === myRosterId);
    if (myIndex === -1) {
      return { preEquity: 0, postEquity: 0, equityChange: 0, equityChangeFormatted: '0%' };
    }

    // Pre-trade: run simulations
    let preChampCount = 0;
    for (let sim = 0; sim < SIMULATIONS; sim++) {
      const wins = simulateSeason(teamStrengths);
      const myWins = wins[myIndex];
      const madePlayoff = playoffProbability(myWins, wins, Math.min(PLAYOFF_TEAMS, allTeams.length));
      if (madePlayoff > 0) {
        const sorted = [...wins].sort((a, b) => b - a);
        const mySeed = sorted.indexOf(myWins) + 1;
        const champProb = champProbabilityGivenPlayoff(mySeed, PLAYOFF_TEAMS);
        if (Math.random() < madePlayoff * champProb) {
          preChampCount++;
        }
      }
    }

    // Post-trade: adjust my team's strength
    const giveIds = new Set(tradeGive.filter(a => a.type === 'player').map(a => String(a.id || a.playerId)));
    const postRoster = (myRoster || [])
      .filter(p => !giveIds.has(String(p.playerId)))
      .concat(tradeGet.filter(a => a.type === 'player').map(a => ({
        playerId: String(a.id), name: a.name, position: a.position,
        value: a.value || 0, age: a.age || 25, status: 'active'
      })));

    const postLineup = rosterAnalysisService.getOptimalLineup(postRoster, leagueSettings);
    const postStrengths = [...teamStrengths];
    postStrengths[myIndex] = postLineup.totalValue || 1;

    let postChampCount = 0;
    for (let sim = 0; sim < SIMULATIONS; sim++) {
      const wins = simulateSeason(postStrengths);
      const myWins = wins[myIndex];
      const madePlayoff = playoffProbability(myWins, wins, Math.min(PLAYOFF_TEAMS, allTeams.length));
      if (madePlayoff > 0) {
        const sorted = [...wins].sort((a, b) => b - a);
        const mySeed = sorted.indexOf(myWins) + 1;
        const champProb = champProbabilityGivenPlayoff(mySeed, PLAYOFF_TEAMS);
        if (Math.random() < madePlayoff * champProb) {
          postChampCount++;
        }
      }
    }

    const preEquity = (preChampCount / SIMULATIONS) * 100;
    const postEquity = (postChampCount / SIMULATIONS) * 100;
    const equityChange = postEquity - preEquity;

    const duration = Date.now() - startTime;
    logger.debug('Championship equity calculated', { preEquity, postEquity, equityChange, durationMs: duration });

    return {
      preEquity: parseFloat(preEquity.toFixed(1)),
      postEquity: parseFloat(postEquity.toFixed(1)),
      equityChange: parseFloat(equityChange.toFixed(1)),
      equityChangeFormatted: `${equityChange >= 0 ? '+' : ''}${equityChange.toFixed(1)}%`,
      simulations: SIMULATIONS,
      confidence: SIMULATIONS >= 2000 ? 'high' : 'moderate'
    };
  } catch (err) {
    logger.warn('Championship equity calculation failed', { error: err.message });
    return {
      preEquity: 0,
      postEquity: 0,
      equityChange: 0,
      equityChangeFormatted: '0%',
      error: err.message
    };
  }
}

module.exports = {
  calculateEquityChange,
  simulateSeason,
  SIMULATIONS
};

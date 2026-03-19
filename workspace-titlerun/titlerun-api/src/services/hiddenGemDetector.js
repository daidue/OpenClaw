/**
 * Hidden Gem Detector Service
 *
 * Identifies buy-low and sell-high opportunities within a league.
 * Used by Trade Finder to surface non-obvious trade targets.
 *
 * Detectors:
 * - Sell-High: Players at/past age cliff, recent performance peak
 * - Buy-Low: Injured players, recent slump, inactive/rebuilding owners
 */

const logger = require('../utils/logger').child({ service: 'hidden-gem-detector' });

// ─── Age Cliff Detection ───────────────────────────────────────

const AGE_CLIFFS = {
  QB: { warning: 32, cliff: 35, label: 'QB decline window' },
  RB: { warning: 26, cliff: 28, label: 'RB age cliff (historically steep)' },
  WR: { warning: 29, cliff: 31, label: 'WR declining production' },
  TE: { warning: 30, cliff: 32, label: 'TE decline phase' }
};

/**
 * Detect sell-high candidates on a roster.
 * These are players whose value may be at or near peak before decline.
 *
 * @param {Array} players - Team roster
 * @returns {Array} - Sell-high candidates with reason
 */
function detectSellHigh(players) {
  const candidates = [];

  for (const player of players) {
    if (player.status !== 'active' && player.status !== undefined) continue;
    if ((player.value || 0) < 2000) continue; // Only worth selling if valuable

    const cliff = AGE_CLIFFS[player.position];
    if (!cliff) continue;

    const age = player.age || 25;
    const reasons = [];
    let urgency = 0; // 0-100

    // Age-based sell-high
    if (age >= cliff.cliff) {
      reasons.push(`Past ${cliff.label} (${age}yo)`);
      urgency += 60;
    } else if (age >= cliff.warning) {
      reasons.push(`Approaching ${cliff.label} (${age}yo, cliff at ${cliff.cliff})`);
      urgency += 40;
    }

    // High value + old = classic sell-high
    if (age >= cliff.warning && (player.value || 0) > 5000) {
      reasons.push('High value at advanced age — peak selling window');
      urgency += 20;
    }

    // RB special: elite value + age 26+ = urgent sell
    if (player.position === 'RB' && age >= 26 && (player.value || 0) > 6000) {
      reasons.push('Elite RB value decays fastest — sell now');
      urgency += 30;
    }

    if (reasons.length > 0) {
      candidates.push({
        playerId: player.playerId,
        name: player.name,
        position: player.position,
        age,
        value: player.value,
        sellHighReasons: reasons,
        urgency: Math.min(100, urgency),
        type: 'sell-high'
      });
    }
  }

  return candidates.sort((a, b) => b.urgency - a.urgency);
}

/**
 * Detect buy-low candidates across opponent rosters.
 * These are undervalued players that could be acquired cheaply.
 *
 * @param {Array} opponents - Array of opponent team objects
 * @returns {Array} - Buy-low candidates with reason
 */
function detectBuyLow(opponents) {
  const candidates = [];

  for (const team of opponents) {
    const players = team.players || [];
    const strategy = team.detectedStrategy || team.strategy;
    const isRebuilding = strategy === 'rebuilding' || strategy === 'bottoming-out';

    for (const player of players) {
      if ((player.value || 0) < 1000) continue;
      
      const reasons = [];
      let discount = 0; // Estimated discount percentage (0-50)

      // IR players — owners want to move on
      if (player.injuryStatus === 'IR' || player.status === 'ir') {
        reasons.push('Currently on IR — owner may want to move on');
        discount += 15;
      }

      // Young player on rebuilding team that doesn't need their position
      if (isRebuilding && (player.age || 25) >= 27 && (player.value || 0) > 3000) {
        reasons.push(`Veteran on a rebuilding team — may be available`);
        discount += 10;
      }

      // Young high-upside player buried on deep roster
      if ((player.age || 25) <= 23 && (player.value || 0) >= 2000 && (player.value || 0) < 5000) {
        const posPlayers = players.filter(p => p.position === player.position);
        const rank = posPlayers.sort((a, b) => (b.value || 0) - (a.value || 0))
          .findIndex(p => p.playerId === player.playerId) + 1;
        
        if (rank >= 3) {
          reasons.push(`Young talent buried at ${player.position}${rank} — may be expendable`);
          discount += 10;
        }
      }

      // Older high-value player that could be had for picks
      if ((player.age || 25) >= 28 && (player.value || 0) > 5000 && isRebuilding) {
        reasons.push(`Star player on rebuilding team — classic buy-low target`);
        discount += 20;
      }

      if (reasons.length > 0) {
        candidates.push({
          playerId: player.playerId,
          name: player.name,
          position: player.position,
          age: player.age,
          value: player.value,
          team: player.team,
          ownerTeam: team.teamName || team.ownerDisplayName,
          ownerRosterId: team.rosterId,
          buyLowReasons: reasons,
          estimatedDiscount: Math.min(50, discount),
          type: 'buy-low'
        });
      }
    }
  }

  return candidates.sort((a, b) => b.estimatedDiscount - a.estimatedDiscount);
}

/**
 * Full hidden gem scan for a league from a team's perspective.
 *
 * @param {Object} myTeam - My team object
 * @param {Array} opponents - All opponent team objects
 * @returns {Object} - { sellHigh, buyLow, combined }
 */
function scanForGems(myTeam, opponents) {
  const sellHigh = detectSellHigh(myTeam.players || []);
  const buyLow = detectBuyLow(opponents);

  logger.debug('Hidden gem scan', {
    sellHighCount: sellHigh.length,
    buyLowCount: buyLow.length
  });

  return {
    sellHigh: sellHigh.slice(0, 10),
    buyLow: buyLow.slice(0, 15),
    combined: [...sellHigh, ...buyLow]
      .sort((a, b) => (b.urgency || b.estimatedDiscount || 0) - (a.urgency || a.estimatedDiscount || 0))
      .slice(0, 20)
  };
}

module.exports = {
  detectSellHigh,
  detectBuyLow,
  scanForGems,
  AGE_CLIFFS
};

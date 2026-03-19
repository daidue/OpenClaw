/**
 * Trade Finder Service
 *
 * Smart Trade Finder — scans all opponents and generates the best possible
 * trades, ranked by benefit × likelihood of acceptance.
 *
 * Two-pass architecture:
 *   Pass 1 (FAST): Generate + quick-score ~2,000-5,000 candidates (< 500ms)
 *   Pass 2 (DEEP): Full analysis on top 50 candidates (< 2s)
 *
 * Spec: workspace-titlerun/specs/smart-trade-finder-v2.md
 */

const rosterAnalysisService = require('./rosterAnalysisService');
const tradeAnalysisService = require('./tradeAnalysisService');
const valuationService = require('./valuationService');
const tepDetectionService = require('./tepDetectionService');
const pickValueEngineV2 = require('./pickValueEngineV2');
const sleeperService = require('./sleeperService');
const { predictAcceptance, generateReasoning, assessAvailability } = require('./acceptancePredictionService');
const logger = require('../utils/logger').child({ service: 'trade-finder' });
const hiddenGemDetector = require('./hiddenGemDetector');
const championshipEquityCalculator = require('./championshipEquityCalculator');

// ─── LRU Cache ─────────────────────────────────────────────────

class LRUCache {
  constructor(maxSize = 500, ttlMs = 15 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses = (this.misses || 0) + 1;
      this._logSample();
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses = (this.misses || 0) + 1;
      this._logSample();
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits = (this.hits || 0) + 1;
    this._logSample();
    return entry.data;
  }

  _logSample() {
    const total = (this.hits || 0) + (this.misses || 0);
    if (total > 0 && total % 100 === 0) {
      logger.info('[TradeFinder] Cache stats', {
        size: this.cache.size,
        max: this.maxSize,
        hits: this.hits || 0,
        misses: this.misses || 0,
        hitRate: total > 0 ? ((this.hits || 0) / total).toFixed(2) : '0',
      });
    }
  }

  set(key, data) {
    this.cache.delete(key);
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, expiresAt: Date.now() + this.ttlMs });
  }

  clear() {
    this.cache.clear();
  }
}

const finderCache = new LRUCache(500, 15 * 60 * 1000);

// NOTE: Cache is cleared in src/index.js after server startup
// to ensure logs are captured by Railway

// ─── Sanitization ──────────────────────────────────────────────

/**
 * M7: Sanitize player names to prevent XSS in narratives.
 * Strips HTML tags and limits length.
 */
function sanitizeName(name) {
  if (!name || typeof name !== 'string') return 'Unknown';
  return name.replace(/<[^>]*>/g, '').replace(/[&<>"']/g, '').trim().slice(0, 100);
}

// ─── Strategy Detection ────────────────────────────────────────

const STRATEGY_PROFILES = {
  'contending': {
    preferAge: [25, 29],
    preferPicks: false,
    preferConsolidation: true,
    description: 'Your team is built to win NOW. Trade picks for proven talent.'
  },
  'retooling': {
    preferAge: [23, 27],
    preferPicks: 'selective',
    preferConsolidation: false,
    description: 'Competitive but aging. Selectively inject youth without gutting your core.'
  },
  'rebuilding': {
    preferAge: [20, 24],
    preferPicks: true,
    preferConsolidation: false,
    description: 'Building for the future. Sell veterans for picks and young assets.'
  },
  'bottoming-out': {
    preferAge: [20, 23],
    preferPicks: true,
    preferConsolidation: false,
    description: 'Full tank mode. Maximize future capital at all costs.'
  }
};

function detectStrategy(team) {
  const activePlayers = team.players.filter(p =>
    p.status === 'active' || p.status === undefined
  );
  if (activePlayers.length === 0) {return 'rebuilding';}

  // Value-weighted age (stars matter more than depth)
  const totalValue = activePlayers.reduce((s, p) => s + (p.value || 0), 0);
  const valueWeightedAge = totalValue > 0
    ? activePlayers.reduce((s, p) => s + ((p.age || 25) * (p.value || 0)), 0) / totalValue
    : activePlayers.reduce((s, p) => s + (p.age || 25), 0) / activePlayers.length;

  // Count high-value players (stars)
  const stars = activePlayers.filter(p => (p.value || 0) > 5000).length;
  const hasEliteCore = stars >= 3;

  // Also factor in composition for robustness
  const composition = rosterAnalysisService.getRosterComposition(activePlayers);
  const winNowScore = composition.winNowScore || 50;

  // Combined multi-factor detection
  if (hasEliteCore && valueWeightedAge < 26) {return 'contending';}
  if (hasEliteCore && valueWeightedAge < 28) {return winNowScore >= 60 ? 'contending' : 'retooling';}
  if (stars >= 2 && valueWeightedAge < 27) {return 'retooling';}
  if (winNowScore >= 75 && valueWeightedAge < 29) {return 'contending';}
  if (winNowScore >= 50) {return 'retooling';}
  if (stars < 2 && valueWeightedAge > 27) {return 'bottoming-out';}
  if (winNowScore >= 25) {return 'rebuilding';}
  return 'bottoming-out';
}

// ─── Need & Tradeable Identification ───────────────────────────

/**
 * Graduated need scores (0-100) — replaces binary needs detection.
 * Higher score = bigger need. 0 = fully stacked, 100 = desperate.
 */
function identifyNeedScores(team, leagueSettings) {
  const isSF = leagueSettings.superflex;
  const scores = {};

  const thresholds = {
    QB: { min: isSF ? 2 : 1, starterStrength: isSF ? 45 : 40, weight: isSF ? 1.2 : 1.0 },
    RB: { min: 2, starterStrength: 40, weight: 1.0 },
    WR: { min: 3, starterStrength: 40, weight: 1.0 },
    TE: { min: 1, starterStrength: 35, weight: 0.9 }
  };

  const metrics = team.metrics || {};

  for (const [pos, config] of Object.entries(thresholds)) {
    const group = metrics[pos];

    if (!group || group.count === 0) {
      scores[pos] = 100; // Desperate need
      continue;
    }

    let score = 0;

    // Starter strength deficit (0-50 points)
    const strengthDeficit = Math.max(0, config.starterStrength - (group.starterStrength || 0));
    score += Math.min(50, strengthDeficit * 2.5);

    // Depth shortage (0-30 points)
    const depthShortage = Math.max(0, config.min - (group.count || 0));
    score += Math.min(30, depthShortage * 15);

    // Low absolute value penalty (0-15 points) — mediocre starters = need
    const topValue = group.topPlayerValue || 0;
    if (topValue < 3000) score += Math.min(15, Math.round((3000 - topValue) / 200));

    // Age risk bonus (0-20 points) — older starters = higher need
    const avgAge = group.avgAge || 25;
    const ageRisk = pos === 'RB' ? Math.max(0, (avgAge - 25) * 5) :
                    pos === 'QB' ? Math.max(0, (avgAge - 30) * 3) :
                    Math.max(0, (avgAge - 27) * 4);
    score += Math.min(20, ageRisk);

    // Apply position weight
    scores[pos] = Math.min(100, Math.round(score * (config.weight || 1)));
  }

  return scores;
}

/**
 * Binary needs identification (kept for backward compatibility).
 * Now uses graduated scores internally.
 */
function identifyNeeds(team, leagueSettings) {
  const scores = identifyNeedScores(team, leagueSettings);
  return Object.entries(scores)
    .filter(([_, score]) => score > 20)
    .map(([pos]) => pos);
}

function identifyTradeable(team, untouchableIds = [], leagueSettings = {}) {
  const isSF = leagueSettings.superflex;
  const activePlayers = team.players.filter(p => p.status === 'active');

  const positionCounts = {};
  const positionBest = {};
  activePlayers.forEach(p => {
    positionCounts[p.position] = (positionCounts[p.position] || 0) + 1;
    if (!positionBest[p.position] || p.value > positionBest[p.position].value) {
      positionBest[p.position] = p;
    }
  });

  return activePlayers.filter(p => {
    if (untouchableIds.includes(p.playerId)) {return false;}

    // Never trade only/best QB in SF with ≤ 2 QBs
    if (p.position === 'QB' && isSF && (positionCounts.QB || 0) <= 2 &&
        positionBest.QB?.playerId === p.playerId) {return false;}

    // Never trade only QB in 1QB
    if (p.position === 'QB' && !isSF && (positionCounts.QB || 0) <= 1 &&
        positionBest.QB?.playerId === p.playerId) {return false;}

    // Don't trade best at thin position
    const isBest = positionBest[p.position]?.playerId === p.playerId;
    const isThin = (positionCounts[p.position] || 0) <= 2;
    return !(isBest && isThin);
  });
}

// ─── Position Grading ──────────────────────────────────────────

function calculatePositionGrades(team, allTeams) {
  const grades = {};
  const positions = ['QB', 'RB', 'WR', 'TE'];

  for (const pos of positions) {
    // team.metrics IS the position groups object directly (no .positionGroups wrapper)
    const myStrength = team.metrics?.[pos]?.starterStrength || 0;

    // League-relative percentile ranking
    // Rank this team against all teams by position strength
    const allStrengths = allTeams
      .map(t => t.metrics?.[pos]?.starterStrength || 0);
    
    const leagueSize = allStrengths.length;
    if (leagueSize <= 1) {
      grades[pos] = 'C';
      continue;
    }

    // Count how many teams we're better than (higher strength = better)
    const teamsBelow = allStrengths.filter(s => s < myStrength).length;
    const percentile = teamsBelow / (leagueSize - 1); // 0 = worst, 1 = best

    if (percentile >= 0.90) {grades[pos] = 'A+';}
    else if (percentile >= 0.80) {grades[pos] = 'A';}
    else if (percentile >= 0.70) {grades[pos] = 'A-';}
    else if (percentile >= 0.60) {grades[pos] = 'B+';}
    else if (percentile >= 0.50) {grades[pos] = 'B';}
    else if (percentile >= 0.40) {grades[pos] = 'B-';}
    else if (percentile >= 0.30) {grades[pos] = 'C+';}
    else if (percentile >= 0.20) {grades[pos] = 'C';}
    else if (percentile >= 0.10) {grades[pos] = 'D';}
    else {grades[pos] = 'F';}
  }

  return grades;
}

// ─── Candidate Generation (Pass 1) ────────────────────────────

function generateCandidates(myTeam, myTradeable, myPicks, opponent, oppNeeds, leagueSettings, includePicks = true) {
  const candidates = [];
  const seen = new Set();
  const myNeeds = identifyNeeds(myTeam, leagueSettings);
  const oppTradeable = identifyTradeable(opponent, [], leagueSettings);

  // Strategy A: Position Need Crossmatch
  for (const myPlayer of myTradeable) {
    for (const oppPlayer of oppTradeable) {
      if (myPlayer.position === oppPlayer.position) {continue;}
      const meGivingNeeded = oppNeeds.includes(myPlayer.position);
      const meGettingNeeded = myNeeds.includes(oppPlayer.position);
      if (!meGivingNeeded && !meGettingNeeded) {continue;}

      const gap = Math.abs(myPlayer.value - oppPlayer.value) / Math.max(myPlayer.value, oppPlayer.value, 1);
      if (gap > 0.30) {continue;}

      const key = deduplicateKey({ give: [myPlayer], get: [oppPlayer] });
      if (seen.has(key)) {continue;}
      seen.add(key);

      candidates.push({
        give: [toAsset(myPlayer)],
        get: [toAsset(oppPlayer)],
        opponentRosterId: opponent.rosterId,
        structure: '1-for-1'
      });
    }
  }

  // Strategy B: Value Tier Matching
  const tiers = [[8000, Infinity], [5000, 8000], [3000, 5000], [1000, 3000]];
  for (const [min, max] of tiers) {
    const myInTier = myTradeable.filter(p => p.value >= min && p.value < max);
    const oppInTier = oppTradeable.filter(p => p.value >= min && p.value < max);

    for (const mp of myInTier) {
      for (const op of oppInTier) {
        if (mp.position === op.position) {continue;}
        const gap = Math.abs(mp.value - op.value) / Math.max(mp.value, op.value, 1);
        if (gap > 0.25) {continue;}
        if (!myNeeds.includes(op.position) && !oppNeeds.includes(mp.position)) {continue;}

        const key = deduplicateKey({ give: [mp], get: [op] });
        if (seen.has(key)) {continue;}
        seen.add(key);

        candidates.push({
          give: [toAsset(mp)],
          get: [toAsset(op)],
          opponentRosterId: opponent.rosterId,
          structure: '1-for-1'
        });
      }
    }
  }

  // Strategy C: Consolidation (2-for-1)
  const oppStarters = oppTradeable
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  for (const oppStar of oppStarters) {
    if (!myNeeds.includes(oppStar.position)) {continue;}

    const myDepth = myTradeable
      .filter(p => p.playerId !== oppStar.playerId && p.value < oppStar.value)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    for (let i = 0; i < myDepth.length; i++) {
      for (let j = i + 1; j < myDepth.length; j++) {
        const combined = myDepth[i].value + myDepth[j].value;
        const gap = Math.abs(combined - oppStar.value) / Math.max(combined, oppStar.value, 1);
        if (gap > 0.20) {continue;}

        const fillsOppNeed = oppNeeds.includes(myDepth[i].position) || oppNeeds.includes(myDepth[j].position);
        if (!fillsOppNeed) {continue;}

        const key = deduplicateKey({ give: [myDepth[i], myDepth[j]], get: [oppStar] });
        if (seen.has(key)) {continue;}
        seen.add(key);

        candidates.push({
          give: [toAsset(myDepth[i]), toAsset(myDepth[j])],
          get: [toAsset(oppStar)],
          opponentRosterId: opponent.rosterId,
          structure: '2-for-1'
        });
      }
    }
  }

  // Strategy D: Deconsolidation (1-for-2)
  const myStars = myTradeable
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  for (const myStar of myStars) {
    if (!oppNeeds.includes(myStar.position)) {continue;}

    const oppDepth = oppTradeable
      .filter(p => p.value < myStar.value)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    for (let i = 0; i < oppDepth.length; i++) {
      for (let j = i + 1; j < oppDepth.length; j++) {
        const combined = oppDepth[i].value + oppDepth[j].value;
        const gap = Math.abs(combined - myStar.value) / Math.max(combined, myStar.value, 1);
        if (gap > 0.20) {continue;}

        const meGettingNeeded = myNeeds.includes(oppDepth[i].position) || myNeeds.includes(oppDepth[j].position);
        if (!meGettingNeeded) {continue;}

        const key = deduplicateKey({ give: [myStar], get: [oppDepth[i], oppDepth[j]] });
        if (seen.has(key)) {continue;}
        seen.add(key);

        candidates.push({
          give: [toAsset(myStar)],
          get: [toAsset(oppDepth[i]), toAsset(oppDepth[j])],
          opponentRosterId: opponent.rosterId,
          structure: '1-for-2'
        });
      }
    }
  }

  // Strategy E: Player + Pick Packages (skip if includePicks=false)
  if (includePicks && myPicks && myPicks.length > 0) {
    for (const myPlayer of myTradeable.slice(0, 15)) {
      for (const pick of myPicks.slice(0, 3)) {
        const myTotal = myPlayer.value + (pick.value || 0);

        for (const oppPlayer of oppTradeable) {
          if (myPlayer.position === oppPlayer.position) {continue;}
          if (!myNeeds.includes(oppPlayer.position)) {continue;}

          const gap = Math.abs(myTotal - oppPlayer.value) / Math.max(myTotal, oppPlayer.value, 1);
          if (gap > 0.20) {continue;}

          const key = deduplicateKey({ give: [myPlayer, pick], get: [oppPlayer] });
          if (seen.has(key)) {continue;}
          seen.add(key);

          candidates.push({
            give: [toAsset(myPlayer), toPickAsset(pick)],
            get: [toAsset(oppPlayer)],
            opponentRosterId: opponent.rosterId,
            structure: 'player+pick'
          });
        }
      }
    }
  }

  // Strategy G: Same-Position Upgrades (NEW)
  // Allow WR-for-WR, RB-for-RB when value tier gap exists
  for (const myPlayer of myTradeable) {
    for (const oppPlayer of oppTradeable) {
      if (myPlayer.position !== oppPlayer.position) {continue;} // Same position only
      if (myPlayer.value >= oppPlayer.value) {continue;} // Only upgrade direction

      // Value tier gap must exist (we're trading up)
      const tierGap = oppPlayer.value - myPlayer.value;
      const tierGapPct = tierGap / Math.max(oppPlayer.value, 1);
      if (tierGapPct < 0.10 || tierGapPct > 0.40) {continue;} // 10-40% gap (meaningful but bridgeable)

      // Check if we have surplus depth at this position
      const myPosCount = myTradeable.filter(p => p.position === myPlayer.position).length;
      if (myPosCount <= 2) {continue;} // Don't trade from thin position

      // Balance with a pick if needed
      if (tierGapPct > 0.15 && myPicks.length > 0) {
        const balancingPick = myPicks.find(p => {
          const combined = myPlayer.value + (p.value || 0);
          const gap = Math.abs(combined - oppPlayer.value) / Math.max(combined, oppPlayer.value, 1);
          return gap < 0.15;
        });
        if (balancingPick) {
          const key = deduplicateKey({ give: [myPlayer, balancingPick], get: [oppPlayer] });
          if (!seen.has(key)) {
            seen.add(key);
            candidates.push({
              give: [toAsset(myPlayer), toPickAsset(balancingPick)],
              get: [toAsset(oppPlayer)],
              opponentRosterId: opponent.rosterId,
              structure: 'upgrade+pick'
            });
          }
        }
      } else if (tierGapPct <= 0.15) {
        // Close enough for straight swap
        const key = deduplicateKey({ give: [myPlayer], get: [oppPlayer] });
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({
            give: [toAsset(myPlayer)],
            get: [toAsset(oppPlayer)],
            opponentRosterId: opponent.rosterId,
            structure: 'same-pos-upgrade'
          });
        }
      }
    }
  }

  // Strategy F: 2-for-2 Swaps (PRUNED per panel review)
  // PERF FIX: Reduced pool sizes from 8 to 5, added early break when enough candidates found
  const MAX_CANDIDATES_PER_OPPONENT = 200; // Cap total candidates per opponent
  for (const myNeed of myNeeds) {
    if (candidates.length >= MAX_CANDIDATES_PER_OPPONENT) {break;}
    for (const oppNeed of oppNeeds) {
      if (myNeed === oppNeed) {continue;}
      if (candidates.length >= MAX_CANDIDATES_PER_OPPONENT) {break;}

      const myGivePool = myTradeable
        .filter(p => p.position === oppNeed)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // PERF FIX: Reduced from 8 to 5 (5*4/2 * 5*4/2 = 100 vs 8*7/2 * 8*7/2 = 784)

      const oppGivePool = oppTradeable
        .filter(p => p.position === myNeed)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // PERF FIX: Reduced from 8 to 5

      for (let i = 0; i < myGivePool.length; i++) {
        if (candidates.length >= MAX_CANDIDATES_PER_OPPONENT) {break;}
        for (let j = i + 1; j < myGivePool.length; j++) {
          const myGiveValue = myGivePool[i].value + myGivePool[j].value;
          if (candidates.length >= MAX_CANDIDATES_PER_OPPONENT) {break;}

          for (let k = 0; k < oppGivePool.length; k++) {
            for (let l = k + 1; l < oppGivePool.length; l++) {
              const oppGiveValue = oppGivePool[k].value + oppGivePool[l].value;
              const gap = Math.abs(myGiveValue - oppGiveValue) / Math.max(myGiveValue, oppGiveValue, 1);
              if (gap > 0.20) {continue;}

              const key = deduplicateKey({
                give: [myGivePool[i], myGivePool[j]],
                get: [oppGivePool[k], oppGivePool[l]]
              });
              if (seen.has(key)) {continue;}
              seen.add(key);

              candidates.push({
                give: [toAsset(myGivePool[i]), toAsset(myGivePool[j])],
                get: [toAsset(oppGivePool[k]), toAsset(oppGivePool[l])],
                opponentRosterId: opponent.rosterId,
                structure: '2-for-2'
              });
            }
          }
        }
      }
    }
  }

  return candidates;
}

// ─── Pass 1: Quick Scoring ─────────────────────────────────────

function quickScore(candidate, myTeam, opponentTeam, strategy, leagueSettings) {
  const giveValue = candidate.give.reduce((s, a) => s + (a.value || 0), 0);
  const getValue = candidate.get.reduce((s, a) => s + (a.value || 0), 0);
  const myNeedScores = identifyNeedScores(myTeam, leagueSettings);
  const oppNeedScores = identifyNeedScores(opponentTeam, leagueSettings);
  const myNeeds = Object.entries(myNeedScores).filter(([_, s]) => s > 30).map(([p]) => p);
  const oppNeeds = Object.entries(oppNeedScores).filter(([_, s]) => s > 30).map(([p]) => p);

  // 1. Value Match (0-25 points)
  const valueGap = Math.abs(giveValue - getValue) / Math.max(giveValue, getValue, 1);
  const valueScore = Math.max(0, 25 * (1 - valueGap / 0.30));

  // 2. Need Match (0-25 points) — now weighted by graduated need scores
  const myNeedPositions = candidate.get.filter(a => a.type === 'player').map(a => a.position);
  const oppNeedPositions = candidate.give.filter(a => a.type === 'player').map(a => a.position);
  
  // Higher need score = more points for filling it
  const myNeedBonus = myNeedPositions.reduce((sum, pos) => {
    const score = myNeedScores[pos] || 0;
    return sum + (score > 70 ? 15 : score > 50 ? 10 : score > 30 ? 5 : 0);
  }, 0);
  const oppNeedBonus = oppNeedPositions.reduce((sum, pos) => {
    const score = oppNeedScores[pos] || 0;
    return sum + (score > 70 ? 10 : score > 50 ? 7 : score > 30 ? 3 : 0);
  }, 0);
  const needScore = Math.min(25, myNeedBonus + oppNeedBonus);

  // 3. Strategy Alignment (0-20 points)
  const strategyScore = calculateStrategyScore(candidate, strategy);

  // 4. Acceptance Heuristic (0-20 points)
  const acceptScore = quickAcceptance(candidate, opponentTeam);

  // 5. Availability (0-10 points)
  const availScore = assessAvailability(candidate.get);

  return valueScore + needScore + strategyScore + acceptScore + availScore;
}

function calculateStrategyScore(candidate, strategy) {
  if (strategy === 'balanced' || strategy === 'retooling') {return 10;}

  const gettingPlayers = candidate.get.filter(a => a.type === 'player');
  const gettingPicks = candidate.get.filter(a => a.type === 'pick');
  const givingPicks = candidate.give.filter(a => a.type === 'pick');

  const avgAge = gettingPlayers.length > 0
    ? gettingPlayers.reduce((s, p) => s + (p.age || 25), 0) / gettingPlayers.length
    : 25;

  if (strategy === 'contending') {
    let score = 0;
    if (avgAge >= 24 && avgAge <= 29) {score += 10;}
    if (gettingPicks.length === 0) {score += 5;}
    if (givingPicks.length > 0) {score += 5;}
    return score;
  }

  if (strategy === 'rebuilding' || strategy === 'bottoming-out') {
    let score = 0;
    if (avgAge < 24) {score += 10;}
    if (gettingPicks.length > 0) {score += 7;}
    if (givingPicks.length === 0) {score += 3;}
    return score;
  }

  return 10;
}

function quickAcceptance(candidate, opponentTeam) {
  let score = 10;

  // 1-for-1 trades are cleaner
  const total = candidate.give.length + candidate.get.length;
  if (total === 2) {score += 5;}
  else if (total > 4) {score -= 3;}

  // Consolidation dynamics from OPPONENT perspective:
  // candidate.get = what opponent gives, candidate.give = what opponent gets
  // Opponent giving 1 star for 3 role players = they hate it (deconsolidation)
  // Opponent getting 1 star for 3 role players = they love it (consolidation)
  if (candidate.get.length === 1 && candidate.give.length >= 3) {score -= 5;} // They deconsolidate — penalty
  if (candidate.give.length === 1 && candidate.get.length >= 3) {score += 3;} // They consolidate — bonus

  // Are we asking for their best player?
  const theirBestValue = Math.max(...opponentTeam.players.map(p => p.value), 0);
  const askingForStar = candidate.get.some(a => a.type === 'player' && a.value > theirBestValue * 0.85);
  if (askingForStar) {score -= 5;}

  return Math.max(0, Math.min(20, score));
}

// ─── Dynasty Outlook Calculation ───────────────────────────────

/**
 * Calculate dynasty outlook score for a trade.
 * Compares age-adjusted future value of assets received vs given.
 * Getting younger assets + picks = higher dynasty outlook.
 */
function calculateDynastyOutlook(tradeGive, tradeGet) {
  const POSITION_PRIME_AGES = {
    QB: { peak: 28, decline: 35 },
    RB: { peak: 24, decline: 28 },
    WR: { peak: 26, decline: 31 },
    TE: { peak: 27, decline: 32 }
  };

  function ageScore(player) {
    const curve = POSITION_PRIME_AGES[player.position] || POSITION_PRIME_AGES.WR;
    const age = player.age || 25;

    if (age <= curve.peak) {return 100;}          // Prime or ascending
    else if (age <= curve.peak + 2) {return 80;}  // Still good
    else if (age <= curve.decline) {return 60;}   // Declining but viable
    else if (age <= curve.decline + 3) {return 30;} // Aging out
    else {return 10;}                              // Past prime
  }

  function weightedAgeScore(assets) {
    const players = assets.filter(a => a.type === 'player');
    const totalValue = players.reduce((sum, p) => sum + (p.value || 0), 0);

    if (totalValue === 0) {return 50;} // Neutral if no players

    const weightedSum = players.reduce((sum, p) => {
      return sum + (ageScore(p) * (p.value || 0));
    }, 0);

    return Math.round(weightedSum / totalValue);
  }

  const givingAgeScore = weightedAgeScore(tradeGive);
  const gettingAgeScore = weightedAgeScore(tradeGet);

  // Score based on age improvement
  const ageDelta = gettingAgeScore - givingAgeScore;

  // Getting picks = higher dynasty outlook
  const pickBonus = tradeGet.filter(a => a.type === 'pick').length * 8;
  const pickPenalty = tradeGive.filter(a => a.type === 'pick').length * 8;

  // Map delta to 0-100: getting younger = better
  const dynastyScore = Math.max(0, Math.min(100, 50 + ageDelta + pickBonus - pickPenalty));

  return {
    score: Math.round(dynastyScore),
    givingAvgAge: givingAgeScore,
    gettingAvgAge: gettingAgeScore,
    trend: ageDelta > 10 ? 'getting-younger' : ageDelta < -10 ? 'getting-older' : 'neutral'
  };
}

// ─── Fairness Score (Non-Linear) ───────────────────────────────

/**
 * Calculate fairness score using non-linear curve.
 * Small gaps are fine, big gaps kill the score.
 */
function calculateFairnessScore(valueGapPercent) {
  const gap = Math.abs(valueGapPercent);

  if (gap < 3) {return 100;}        // Dead even
  else if (gap < 5) {return 95;}    // Extremely close
  else if (gap < 8) {return 85;}    // Very fair
  else if (gap < 12) {return 75;}   // Fair
  else if (gap < 18) {return 60;}   // Noticeable gap
  else if (gap < 25) {return 45;}   // Lopsided
  else if (gap < 35) {return 25;}   // Very lopsided
  else {return 10;}                  // Extremely lopsided
}

// ─── Trade Grade Labels ────────────────────────────────────────

function getTradeGradeLabel(score) {
  if (score >= 80) {return 'Great Trade';}
  if (score >= 65) {return 'Good Trade';}
  if (score >= 50) {return 'Fair Trade';}
  if (score >= 35) {return 'Risky Trade';}
  return 'Bad Trade';
}

function getAcceptanceLabel(score) {
  if (score >= 70) {return 'LIKELY';}
  if (score >= 50) {return 'POSSIBLE';}
  if (score >= 30) {return 'TOUGH SELL';}
  return 'UNLIKELY';
}

// ─── Score Explanation Generation ──────────────────────────────

function generateScoreExplanation({ overall, myImprovement, acceptance, fairness, dynastyOutlook, primaryBenefit }) {
  const parts = [];

  if (myImprovement >= 70) {parts.push(`it significantly improves your lineup`);}
  else if (myImprovement >= 60) {parts.push(`it improves your lineup`);}
  else if (myImprovement < 35) {parts.push(`it weakens your lineup short-term`);}

  if (acceptance >= 70) {parts.push(`they're likely to accept`);}
  else if (acceptance >= 50) {parts.push(`there's a reasonable chance they accept`);}
  else if (acceptance < 30) {parts.push(`acceptance is unlikely`);}

  if (fairness >= 85) {parts.push('the value is nearly even');}
  else if (fairness >= 70) {parts.push('the value is fair');}
  else if (fairness < 45) {parts.push('the value gap is significant');}

  if (dynastyOutlook >= 65) {parts.push(`you're getting younger`);}
  else if (dynastyOutlook <= 35) {parts.push(`you're getting older`);}

  if (parts.length === 0) {
    return `This trade scores ${overall}. ${primaryBenefit || ''}`.trim();
  }

  return `This trade scores ${overall} because ${parts.join(', ')}.`;
}

// ─── Positional Upgrade Narrative ───────────────────────────────

/**
 * Describe positional upgrades in human-readable format.
 * e.g., "WR3 → WR2 (↑6 spots)" or "RB2 → RB1"
 */
function describePositionalUpgrade(preLineup, postLineup, myPlayers, _leagueSettings) {
  const changes = [];
  const positions = ['QB', 'RB', 'WR', 'TE', 'FLEX'];

  for (const pos of positions) {
    const preStarters = (preLineup?.lineup?.[pos] || []);
    const postStarters = (postLineup?.lineup?.[pos] || []);

    // Compare starters at each slot
    const maxSlots = Math.max(preStarters.length, postStarters.length);
    for (let i = 0; i < maxSlots; i++) {
      const pre = preStarters[i];
      const post = postStarters[i];
      if (!pre && !post) continue;
      if (pre?.playerId === post?.playerId) continue;

      // Calculate rank among all players at this position
      const posPlayers = myPlayers
        .filter(p => p.position === (pos === 'FLEX' ? (post?.position || pre?.position) : pos))
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      const preRank = pre ? posPlayers.findIndex(p => p.playerId === pre.playerId) + 1 : 0;
      const postRank = post ? posPlayers.findIndex(p => p.playerId === post.playerId) + 1 : 0;

      changes.push({
        position: pos,
        slot: i + 1,
        before: pre ? { name: pre.name, rank: preRank || null, value: pre.value } : null,
        after: post ? { name: post.name, rank: postRank || null, value: post.value } : null,
        valueDelta: (post?.value || 0) - (pre?.value || 0),
        label: post && pre
          ? `${pos}${maxSlots > 1 ? i + 1 : ''}: ${pre.name} → ${post.name}`
          : post ? `${pos}${maxSlots > 1 ? i + 1 : ''}: +${post.name}` : `${pos}${maxSlots > 1 ? i + 1 : ''}: -${pre.name}`
      });
    }
  }

  return changes.filter(c => c.valueDelta !== 0 || c.before?.playerId !== c.after?.playerId);
}

// ─── Trade Narrative Generation ────────────────────────────────

/**
 * Generate human-readable trade narrative with bullet points.
 * Returns whyGoodForYou, whyTheyAccept, keyRisk, headline, tldr.
 */
function generateTradeNarrative(candidate, myTeam, oppTeam, preLineup, postLineup, analysis, leagueSettings) {
  const whyGoodForYou = [];
  const whyTheyAccept = [];

  const myNeeds = identifyNeeds(myTeam, leagueSettings);
  const myNeedScores = identifyNeedScores(myTeam, leagueSettings);
  const oppNeeds = identifyNeeds(oppTeam, leagueSettings);
  const oppNeedScores = identifyNeedScores(oppTeam, leagueSettings);
  const positionGrades = myTeam.positionGrades || {};

  // Analyze what you're getting
  for (const asset of candidate.get) {
    if (asset.type === 'player') {
      const becomesStarter = postLineup?.lineup
        ? Object.values(postLineup.lineup).flat().some(p => String(p.playerId) === String(asset.id))
        : false;

      if (becomesStarter) {
        whyGoodForYou.push(`${asset.name} becomes a starter in your lineup`);
      } else if (myNeeds.includes(asset.position)) {
        whyGoodForYou.push(`Fills your ${asset.position} need (need score: ${myNeedScores[asset.position] || 0})`);
      }

      // Age upside
      if ((asset.age || 25) <= 24) {
        whyGoodForYou.push(`${asset.name} is only ${asset.age} — prime years ahead`);
      }
    } else if (asset.type === 'pick') {
      whyGoodForYou.push(`Adds ${asset.name} for future flexibility`);
    }
  }

  // Analyze what you're giving
  for (const asset of candidate.give) {
    if (asset.type === 'player') {
      const isStarter = preLineup?.lineup
        ? Object.values(preLineup.lineup).flat().some(p => String(p.playerId) === String(asset.id))
        : false;

      if (!isStarter) {
        const grade = positionGrades[asset.position];
        const goodGrades = ['A+', 'A', 'A-', 'B+', 'B'];
        if (grade && goodGrades.includes(grade)) {
          whyGoodForYou.push(`Trading from ${asset.position} depth (grade: ${grade})`);
        } else {
          whyGoodForYou.push(`${asset.name} is on your bench — not a core piece`);
        }
      }

      // Sell-high detection
      if (asset.type === 'player' && (asset.age || 25) >= 28 && asset.position === 'RB') {
        whyGoodForYou.push(`Selling ${asset.name} before RB age cliff (${asset.age}yo)`);
      } else if (asset.type === 'player' && (asset.age || 25) >= 30) {
        whyGoodForYou.push(`Selling ${asset.name} at peak value (${asset.age}yo)`);
      }
    }
  }

  // Why they'd accept
  for (const asset of candidate.give) {
    if (asset.type === 'player' && oppNeeds.includes(asset.position)) {
      whyTheyAccept.push(`Fills their ${asset.position} need (need score: ${oppNeedScores[asset.position] || 0})`);
    }
    if (asset.type === 'pick') {
      whyTheyAccept.push(`Gets a draft pick for their rebuild/future`);
    }
  }

  for (const asset of candidate.give) {
    if (asset.type === 'player' && (asset.value || 0) > 5000) {
      whyTheyAccept.push(`Gets a star player: ${asset.name} (${asset.value?.toLocaleString()} value)`);
    }
  }

  if (whyTheyAccept.length === 0) {
    whyTheyAccept.push('Fair value exchange');
  }

  // Key risk identification
  const keyRisk = identifyKeyRisk(candidate, myTeam, preLineup, postLineup);

  // Headline
  const topGet = candidate.get.filter(a => a.type === 'player').sort((a, b) => (b.value || 0) - (a.value || 0))[0];
  const topGive = candidate.give.filter(a => a.type === 'player').sort((a, b) => (b.value || 0) - (a.value || 0))[0];
  const headline = topGet && topGive
    ? `Upgrade: Get ${topGet.name} (${topGet.position}) for ${topGive.name}`
    : topGet ? `Acquire ${topGet.name}` : 'Roster improvement trade';

  // TL;DR
  const tldr = whyGoodForYou.length > 0
    ? whyGoodForYou[0] + (whyTheyAccept[0] ? `. ${whyTheyAccept[0]}.` : '.')
    : 'Balanced trade that improves your roster.';

  return { headline, whyGoodForYou, whyTheyAccept, keyRisk, tldr };
}

function identifyKeyRisk(candidate, myTeam, preLineup, postLineup) {
  // Check if trading a starter
  const givingStarter = candidate.give.some(a => {
    if (a.type !== 'player') return false;
    return preLineup?.lineup
      ? Object.values(preLineup.lineup).flat().some(p => String(p.playerId) === String(a.id))
      : false;
  });

  if (givingStarter) {
    const starterGiven = candidate.give.find(a =>
      a.type === 'player' && preLineup?.lineup &&
      Object.values(preLineup.lineup).flat().some(p => String(p.playerId) === String(a.id))
    );
    return `Trading starter ${starterGiven?.name || 'player'} — verify your lineup still works`;
  }

  // Check injury risk
  const irPlayers = candidate.get.filter(a => a.injuryStatus === 'IR');
  if (irPlayers.length > 0) {
    return `${irPlayers[0].name} is currently on IR — uncertain return timeline`;
  }

  // Check age risk
  const oldPlayers = candidate.get.filter(a => a.type === 'player' && (a.age || 25) >= 29);
  if (oldPlayers.length > 0) {
    return `${oldPlayers[0].name} is ${oldPlayers[0].age}yo — limited dynasty upside`;
  }

  return null;
}

// ─── Coaching Tip Generation ───────────────────────────────────

function generateCoachingTip(candidate, narrative, scores) {
  if (scores.myImprovement > 75 && scores.acceptance > 70) {
    return `🎯 ${narrative.headline}. ${narrative.whyTheyAccept[0] || 'They need what you\'re offering.'}`;
  }

  if (scores.acceptance < 30) {
    return `⚠️ Low acceptance chance (${scores.acceptance}%). Consider sweetening with a pick or messaging them first.`;
  }

  if (scores.acceptance < 50 && scores.myImprovement > 60) {
    return `💬 Good trade for you but might need convincing. Message them with context about why it helps them.`;
  }

  if (narrative.keyRisk) {
    return `⚠️ ${narrative.keyRisk}`;
  }

  if (scores.overall >= 70) {
    return `🎯 Strong trade! ${narrative.whyGoodForYou[0] || 'Improves your roster significantly.'}`;
  }

  if (narrative.whyGoodForYou.length > 0) {
    return `💡 ${narrative.whyGoodForYou[0]}`;
  }

  return `Trade improves your roster. Review details to confirm it fits your strategy.`;
}

// ─── Multiplicative Floor Scoring ──────────────────────────────

/**
 * Apply multiplicative floor to composite score.
 * If any dimension is below its floor, cap the overall score.
 * Bonus for "complete" trades where all dimensions are strong.
 */
function applyScoreFloors(overall, scores) {
  const floors = {
    myImprovement: 20,
    acceptance: 15,
    fairness: 25,
    dynastyOutlook: 10
  };

  let capped = overall;
  let belowFloorCount = 0;

  for (const [metric, floor] of Object.entries(floors)) {
    if (scores[metric] !== undefined && scores[metric] < floor) {
      belowFloorCount++;
      // Cap overall to max 50 if any factor is critically low
      capped = Math.min(capped, 50 - (belowFloorCount * 5));
    }
  }

  // Bonus for "complete" trades (all factors present and > 60)
  const allAbove60 = Object.keys(floors).every(m => scores[m] !== undefined && scores[m] > 60);
  if (allAbove60 && belowFloorCount === 0) {
    capped = Math.min(100, capped + 5);
  }

  return Math.max(0, capped);
}

// ─── Pass 2: Deep Analysis ─────────────────────────────────────

async function deepAnalyze(candidates, enrichedTeams, myRosterId, leagueSettings, _strategy) {
  const results = [];

  for (const candidate of candidates) {
    try {
      const myTeam = enrichedTeams.find(t => t.rosterId === myRosterId);
      const oppTeam = enrichedTeams.find(t => t.rosterId === candidate.opponentRosterId);
      if (!myTeam || !oppTeam) {continue;}

      const allRosterArrays = enrichedTeams.map(t => t.players);

      // Full trade analysis (reuse existing engine — now uses lineup simulation internally)
      const analysis = await tradeAnalysisService.analyzeTrade({
        sideA: {
          teamId: String(myRosterId),
          roster: myTeam.players,
          assets: candidate.give
        },
        sideB: {
          teamId: String(candidate.opponentRosterId),
          roster: oppTeam.players,
          assets: candidate.get
        },
        leagueSettings,
        allRosters: allRosterArrays
      });

      // Pre-compute needs to avoid circular dependency
      const myTeamNeeds = identifyNeeds(myTeam, leagueSettings);
      const oppTeamNeeds = identifyNeeds(oppTeam, leagueSettings);

      // Acceptance prediction (now uses wider ranges)
      const acceptance = predictAcceptance(candidate, analysis, oppTeam, leagueSettings, oppTeamNeeds);

      // Dual-perspective reasoning
      const reasons = generateReasoning(candidate, myTeam, oppTeam, analysis, leagueSettings, myTeamNeeds, oppTeamNeeds);

      // NEW: Non-linear fairness score
      const fairnessScore = calculateFairnessScore(analysis.fairness?.valueGapPercent || 0);

      // NEW: Use lineup simulation score directly
      const myImprovement = analysis.teamA?.lineupImprovement?.score
        || Math.min(100, Math.max(0, (analysis.teamA?.lineupImprovement?.improvementPercent || 0) * 5 + 40));

      // NEW: Dynasty Outlook
      const dynastyOutlook = calculateDynastyOutlook(candidate.give, candidate.get);

      // NEW: Overall composite with dynasty outlook (replaces mutual benefit)
      let overall = Math.round(
        myImprovement * 0.35 +
        acceptance * 0.30 +
        fairnessScore * 0.20 +
        dynastyOutlook.score * 0.15
      );

      // Apply multiplicative floor scoring
      overall = applyScoreFloors(overall, {
        myImprovement: Math.round(myImprovement),
        acceptance: Math.round(acceptance),
        fairness: Math.round(fairnessScore),
        dynastyOutlook: dynastyOutlook.score
      });

      // LEGACY: Keep mutualBenefit for backward compat
      const teamAGain = Math.min(100, Math.max(0, analysis.mutualBenefit?.teamAGain || 0));
      const teamBGain = Math.min(100, Math.max(0, analysis.mutualBenefit?.teamBGain || 0));
      const mutualBenefit = analysis.mutualBenefit?.isMutuallyBeneficial
        ? Math.round((teamAGain + teamBGain) / 2)
        : Math.round(Math.min(teamAGain, teamBGain) * 0.5);

      // NEW: Acceptance label (categories)
      const acceptanceLabel = getAcceptanceLabel(acceptance);

      // LEGACY: Keep old acceptance category for backward compat
      let acceptanceCategory = 'UNLIKELY';
      if (acceptance >= 70) {acceptanceCategory = 'HIGH';}
      else if (acceptance >= 50) {acceptanceCategory = 'MEDIUM';}
      else if (acceptance >= 30) {acceptanceCategory = 'LOW';}

      // Impact
      const rankChange = analysis.teamA?.competitiveRank?.change || 0;
      const winsChange = analysis.teamA?.seasonProjection?.winsChange || 0;
      const lineupChange = analysis.teamA?.lineupImprovement?.improvementPercent || 0;

      // Primary benefit description
      const primaryBenefit = buildPrimaryBenefit(candidate, myTeam, leagueSettings);

      // Flags
      const flags = [];
      const irPlayers = candidate.get.filter(a => a.injuryStatus === 'IR');
      if (irPlayers.length > 0) {
        flags.push(`⚠️ ${irPlayers.map(p => p.name).join(', ')} on IR`);
      }

      // NEW: Score explanation
      const scoreExplanation = generateScoreExplanation({
        overall: Math.max(0, Math.min(100, overall)),
        myImprovement: Math.round(myImprovement),
        acceptance: Math.round(acceptance),
        fairness: Math.round(fairnessScore),
        dynastyOutlook: dynastyOutlook.score,
        primaryBenefit
      });

      // ── NEW: Positional Upgrade Narrative ──
      // Calculate pre/post lineups for positional narrative
      const myPlayers = myTeam.players || [];
      const giveIds = new Set(candidate.give.filter(a => a.type === 'player').map(a => String(a.id)));
      const postRoster = myPlayers
        .filter(p => !giveIds.has(String(p.playerId)))
        .concat(candidate.get.filter(a => a.type === 'player').map(a => ({
          playerId: String(a.id),
          name: a.name,
          position: a.position,
          value: a.value || 0,
          age: a.age || 25,
          status: 'active'
        })));

      const preLineupData = rosterAnalysisService.getOptimalLineup(myPlayers, leagueSettings);
      const postLineupData = rosterAnalysisService.getOptimalLineup(postRoster, leagueSettings);

      const positionalUpgrade = describePositionalUpgrade(preLineupData, postLineupData, myPlayers, leagueSettings);

      // ── NEW: Trade Narrative ──
      const narrative = generateTradeNarrative(
        candidate, myTeam, oppTeam, preLineupData, postLineupData, analysis, leagueSettings
      );

      // ── NEW: Coaching Tip ──
      const scoresToUse = {
        overall: Math.max(0, Math.min(100, overall)),
        myImprovement: Math.round(myImprovement),
        acceptance: Math.round(acceptance),
        fairness: Math.round(fairnessScore),
        dynastyOutlook: dynastyOutlook.score
      };
      const coachingTip = generateCoachingTip(candidate, narrative, scoresToUse);

      // ── NEW: Need scores for this trade ──
      const myNeedScores = identifyNeedScores(myTeam, leagueSettings);
      const oppNeedScores = identifyNeedScores(oppTeam, leagueSettings);

      // Debug: Log score variance
      logger.debug('Trade score calculation', {
        tradeId: `${candidate.give[0]?.name || '?'} → ${candidate.get[0]?.name || '?'}`,
        overall,
        myImprovement,
        fairnessScore,
        dynastyOutlook: dynastyOutlook.score,
        acceptance,
        lineupChange
      });

      results.push({
        id: `tf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        opponent: {
          rosterId: candidate.opponentRosterId,
          teamName: oppTeam.teamName || `Team ${candidate.opponentRosterId}`,
          ownerDisplayName: oppTeam.ownerDisplayName || 'Unknown',
          strategy: detectStrategy(oppTeam),
          needs: identifyNeeds(oppTeam, leagueSettings),
          needScores: oppNeedScores
        },
        give: candidate.give,
        get: candidate.get,
        scores: {
          overall: Math.max(0, Math.min(100, overall)),
          fairness: Math.round(fairnessScore),
          mutualBenefit: Math.round(mutualBenefit), // LEGACY
          myImprovement: Math.round(myImprovement),
          acceptance: Math.round(acceptance),
          dynastyOutlook: dynastyOutlook.score       // NEW
        },
        impact: {
          lineupChange: parseFloat(lineupChange.toFixed(1)),
          rankChange,
          winsChange: parseFloat(winsChange.toFixed(1)),
          primaryBenefit
        },
        // NEW: Rich narrative data
        narrative: {
          headline: narrative.headline,
          whyGoodForYou: narrative.whyGoodForYou,
          whyTheyAccept: narrative.whyTheyAccept,
          keyRisk: narrative.keyRisk,
          tldr: narrative.tldr
        },
        positionalUpgrade,      // NEW: Array of position changes
        coachingTip,             // NEW: Specific coaching tip string
        reasoning: reasons.reasoning,
        pitch: reasons.pitch,
        tradeGradeLabel: getTradeGradeLabel(Math.max(0, Math.min(100, overall))),
        acceptanceLabel,
        scoreExplanation,
        dynastyTrend: dynastyOutlook.trend,
        acceptanceCategory,  // LEGACY
        tradeStructure: candidate.structure,
        flags
      });
    } catch (err) {
      logger.warn('Deep analysis failed for candidate', { error: err.message });
    }
  }

  // Sort by overall score
  results.sort((a, b) => b.scores.overall - a.scores.overall);

  // Championship equity calculation (top 5 trades scoring >= 60 only for performance)
  const myTeam = enrichedTeams.find(t => t.rosterId === myRosterId);
  for (let i = 0; i < Math.min(5, results.length); i++) {
    try {
      const trade = results[i];
      // Skip equity calculation for low-scoring trades (P0: performance fix)
      if (trade.scores.overall < 60) continue;
      const equity = championshipEquityCalculator.calculateEquityChange({
        myRoster: myTeam?.players || [],
        tradeGive: trade.give,
        tradeGet: trade.get,
        allTeams: enrichedTeams,
        leagueSettings,
        myRosterId
      });
      trade.championshipEquity = equity;
    } catch (err) {
      logger.debug('Championship equity calc failed for trade', { error: err.message });
    }
  }

  return results;
}

function buildPrimaryBenefit(candidate, myTeam, leagueSettings) {
  const myNeeds = identifyNeeds(myTeam, leagueSettings);
  const gettingPlayers = candidate.get.filter(a => a.type === 'player');
  const gettingPositions = [...new Set(gettingPlayers.map(p => p.position))];
  const needsFilled = gettingPositions.filter(p => myNeeds.includes(p));

  if (needsFilled.length > 0) {
    const topGet = gettingPlayers.sort((a, b) => b.value - a.value)[0];
    return `Fills ${needsFilled.join('/')} need${needsFilled.length > 1 ? 's' : ''} with ${topGet?.name || 'upgrade'}`;
  }

  return 'Improves overall roster value';
}

// ─── Helpers ───────────────────────────────────────────────────

function toAsset(player) {
  return {
    type: 'player',
    id: String(player.playerId),
    name: sanitizeName(player.name),
    position: player.position,
    value: player.value,
    age: player.age,
    team: player.team || '',
    status: player.status || 'active',
    injuryStatus: player.injuryStatus || null
  };
}

function toPickAsset(pick) {
  return {
    type: 'pick',
    id: `${pick.season}_${pick.round}_${pick.rosterId || 'unknown'}`,
    name: pick.label || `${pick.season} Round ${pick.round}`,
    value: pick.value || 0,
    season: pick.season,
    round: pick.round
  };
}

function deduplicateKey(candidate) {
  const giveIds = candidate.give.map(a => `${a.type || 'player'}:${a.playerId || a.id}`).sort().join(',');
  const getIds = candidate.get.map(a => `${a.type || 'player'}:${a.playerId || a.id}`).sort().join(',');
  return `${giveIds}|${getIds}`;
}

function generateCacheKey(userId, leagueId, rosterId, filters) {
  // Sort keys for deterministic serialization (prevents cache misses from key ordering)
  const sortedFilter = Object.keys(filters || {}).sort().reduce((acc, key) => {
    acc[key] = filters[key];
    return acc;
  }, {});
  return `${userId}:${leagueId}:${rosterId}:${JSON.stringify(sortedFilter)}`;
}

// ─── Smart Grouping & Trade Targets ────────────────────────────

/**
 * Diversify trade results to avoid repetitive suggestions.
 * Max 3 per opponent, max 4 per primary get position.
 */
function smartDiversify(trades) {
  const opponentCounts = {};
  const positionCounts = {};
  const result = [];

  // Sort by overall score first (keep best)
  const sorted = [...trades].sort((a, b) => (b.scores?.overall || 0) - (a.scores?.overall || 0));

  for (const trade of sorted) {
    const oppId = trade.opponent?.rosterId;
    const primaryGetPos = trade.get?.[0]?.position;

    const oppCount = opponentCounts[oppId] || 0;
    const posCount = positionCounts[primaryGetPos] || 0;

    if (oppCount >= 3) continue; // Max 3 per opponent
    if (posCount >= 4) continue; // Max 4 per position

    result.push(trade);
    opponentCounts[oppId] = oppCount + 1;
    positionCounts[primaryGetPos] = posCount + 1;
  }

  return result;
}

/**
 * Group trades by target player (what you're GETTING).
 * Presents as "Trade Targets" with multiple paths per target.
 */
function buildTradeTargets(trades) {
  const targetMap = {};

  for (const trade of trades) {
    const primaryGet = trade.get?.find(a => a.type === 'player');
    if (!primaryGet) continue;

    const targetKey = primaryGet.id || primaryGet.name;
    if (!targetMap[targetKey]) {
      targetMap[targetKey] = {
        player: {
          id: primaryGet.id,
          name: primaryGet.name,
          position: primaryGet.position,
          value: primaryGet.value,
          age: primaryGet.age,
          team: primaryGet.team
        },
        paths: []
      };
    }

    targetMap[targetKey].paths.push({
      tradeId: trade.id,
      opponent: trade.opponent?.ownerDisplayName || 'Unknown',
      opponentRosterId: trade.opponent?.rosterId,
      give: trade.give,
      score: trade.scores?.overall || 0,
      acceptance: trade.scores?.acceptance || 0,
      coachingTip: trade.coachingTip
    });
  }

  // Sort paths within each target by score
  for (const target of Object.values(targetMap)) {
    target.paths.sort((a, b) => b.score - a.score);
    target.bestPath = target.paths[0];
    target.pathCount = target.paths.length;
  }

  // Sort targets by best path score
  return Object.values(targetMap)
    .sort((a, b) => (b.bestPath?.score || 0) - (a.bestPath?.score || 0))
    .slice(0, 20); // Max 20 trade targets
}

// ─── Main Entry Point ──────────────────────────────────────────

async function findTrades({ userId, leagueId, myRosterId, untouchablePlayerIds = [], filters = {} }) {
  const startTime = Date.now();

  // M8: Input validation
  if (!leagueId) {
    throw new Error('leagueId is required');
  }
  if (!myRosterId && myRosterId !== 0) {
    throw new Error('myRosterId is required');
  }
  if (!Array.isArray(untouchablePlayerIds)) {
    throw new Error('untouchablePlayerIds must be an array');
  }

  // Cache check
  const cacheKey = generateCacheKey(userId, leagueId, myRosterId, { ...filters, untouchablePlayerIds });
  const cached = finderCache.get(cacheKey);
  if (cached) {
    logger.info('Trade finder cache hit', { leagueId, rosterId: myRosterId });
    return { ...cached, meta: { ...cached.meta, cached: true } };
  }

  logger.info('Trade finder starting', { leagueId, myRosterId, filters });

  // ── Pre-Computation ──────────────────────────────────

  // 1. Fetch league data
  const [allRosters, leagueInfo, leagueUsers] = await Promise.all([
    sleeperService.getLeagueRosters(leagueId),
    sleeperService.getLeague(leagueId),
    sleeperService.getLeagueUsers(leagueId)
  ]);

  const isSF = (leagueInfo.roster_positions || []).includes('SUPER_FLEX');
  const tepTier = await tepDetectionService.detectTEPTier(leagueInfo);
  const format = tepTier && tepTier !== 'off' ? tepTier : (isSF ? 'sf' : '1qb');

  const leagueSettings = {
    superflex: isSF,
    scoringFormat: 'ppr',
    teamCount: leagueInfo.total_rosters || 12,
    tepTier: tepTier || 'off'
  };

  // 2. Batch player values
  const allPlayerIds = allRosters.flatMap(r => r.players || []);
  const playerValues = await valuationService.getPlayerValues(allPlayerIds, isSF, format !== '1qb' ? format : undefined);

  // 3. User lookup
  const userMap = {};
  if (Array.isArray(leagueUsers)) {
    leagueUsers.forEach(u => {
      userMap[u.user_id] = u.display_name || u.username || 'Unknown';
    });
  }

  // 4. Enrich teams
  const enrichedTeams = allRosters.map(roster => {
    const players = (roster.players || []).map(pid => {
      const pv = playerValues[String(pid)];
      return {
        playerId: String(pid),
        name: pv?.name || pv?.full_name || 'Unknown Player',
        position: pv?.position || 'UNKNOWN',
        value: Number(pv?.value || pv?.composite_value || 0),
        age: Number(pv?.age || 25),
        team: pv?.team || '',
        injuryStatus: pv?.injuryStatus || pv?.injury_status || null,
        yearsExp: Number(pv?.yearsExp || pv?.years_exp || 0),
        status: (roster.taxi || []).map(String).includes(String(pid)) ? 'taxi' :
                ((pv?.injuryStatus || pv?.injury_status) === 'IR' ? 'ir' : 'active')
      };
    });

    const activePlayers = players.filter(p => p.status === 'active');

    return {
      rosterId: roster.roster_id,
      ownerId: roster.owner_id,
      teamName: userMap[roster.owner_id] ? `${userMap[roster.owner_id]}'s Team` : `Team ${roster.roster_id}`,
      ownerDisplayName: userMap[roster.owner_id] || 'Unknown',
      players: activePlayers,
      allPlayers: players,
      metrics: rosterAnalysisService.getPositionGroupMetrics(activePlayers, leagueSettings),
      composition: rosterAnalysisService.getRosterComposition(activePlayers),
      totalValue: activePlayers.reduce((s, p) => s + p.value, 0)
    };
  });

  // 5. My team
  const myTeam = enrichedTeams.find(t => t.rosterId === Number(myRosterId) || t.rosterId === myRosterId);
  if (!myTeam) {
    throw new Error(`Roster ${myRosterId} not found in league ${leagueId}`);
  }

  const myNeeds = identifyNeeds(myTeam, leagueSettings);
  const myTradeable = identifyTradeable(myTeam, untouchablePlayerIds.map(String), leagueSettings);

  // Strategy: user override or auto-detect
  const appliedStrategy = filters.strategy && filters.strategy !== 'auto'
    ? filters.strategy
    : detectStrategy(myTeam);

  // Get my picks (simplified — use pickValueEngineV2 for values)
  let myPicks = [];
  try {
    const draftPicks = await sleeperService.getLeagueDraftPicks(leagueId);
    myPicks = (draftPicks || [])
      .filter(p => String(p.owner_id) === String(myTeam.ownerId) || p.roster_id === myTeam.rosterId)
      .map(p => ({
        season: p.season,
        round: p.round,
        rosterId: p.roster_id,
        value: pickValueEngineV2.getPickValue(p.round, null, {
          leagueSize: leagueSettings.teamCount,
          isSF: isSF
        })?.value || 0,
        label: `${p.season} Round ${p.round}`
      }))
      .filter(p => p.value > 0);
  } catch (err) {
    logger.warn('Could not fetch draft picks', { error: err.message });
  }

  // Position grades
  const positionGrades = calculatePositionGrades(myTeam, enrichedTeams);

  // Attach position grades to myTeam for narrative access
  myTeam.positionGrades = positionGrades;

  // Hidden gem scan
  let hiddenGems = { sellHigh: [], buyLow: [], combined: [] };
  try {
    hiddenGems = hiddenGemDetector.scanForGems(myTeam, enrichedTeams.filter(t => t.rosterId !== myTeam.rosterId));
  } catch (err) {
    logger.warn('Hidden gem scan failed', { error: err.message });
  }

  // ── Pass 1: Fast Candidate Generation ──────────────

  const allCandidates = [];
  const opponents = enrichedTeams.filter(t => t.rosterId !== myTeam.rosterId);

  // Apply opponent filter
  const targetOpponents = filters.opponents && filters.opponents.length > 0
    ? opponents.filter(o => filters.opponents.includes(o.rosterId))
    : opponents;

  for (const opponent of targetOpponents) {
    const oppNeeds = identifyNeeds(opponent, leagueSettings);
    const candidates = generateCandidates(myTeam, myTradeable, myPicks, opponent, oppNeeds, leagueSettings, filters.includePicks !== false);

    // Apply structure filter
    let filtered = candidates;
    if (filters.tradeStructure && filters.tradeStructure !== 'any') {
      filtered = candidates.filter(c => c.structure === filters.tradeStructure);
    }

    // Apply max give/get filters
    if (filters.maxGive) {
      filtered = filtered.filter(c => c.give.length <= filters.maxGive);
    }
    if (filters.maxGet) {
      filtered = filtered.filter(c => c.get.length <= filters.maxGet);
    }

    // Apply target position filter
    if (filters.targetPositions && filters.targetPositions.length > 0) {
      filtered = filtered.filter(c =>
        c.get.some(a => a.type === 'player' && filters.targetPositions.includes(a.position))
      );
    }

    // Quick score each candidate
    filtered.forEach(c => {
      c.quickScore = quickScore(c, myTeam, opponent, appliedStrategy, leagueSettings);
    });

    allCandidates.push(...filtered);
  }

  logger.info('Pass 1 complete', {
    candidatesGenerated: allCandidates.length,
    opponents: targetOpponents.length
  });

  // PERF FIX: If too many candidates generated, pre-sort and trim before deep scoring
  // This prevents the quickScore sort from being O(n log n) on 5000+ candidates
  if (allCandidates.length > 500) {
    logger.info('Trimming excess candidates', { before: allCandidates.length, after: 500 });
  }

  // Sort by quick score, take top 50 for deep analysis
  allCandidates.sort((a, b) => b.quickScore - a.quickScore);
  const topCandidates = allCandidates.slice(0, 50);

  // ── Pass 2: Deep Analysis ──────────────────────────

  let trades = await deepAnalyze(topCandidates, enrichedTeams, myTeam.rosterId, leagueSettings, appliedStrategy);

  // Apply min fairness / acceptance filters
  if (filters.minFairness) {
    trades = trades.filter(t => t.scores.fairness >= filters.minFairness);
  }
  if (filters.minAcceptance) {
    trades = trades.filter(t => t.scores.acceptance >= filters.minAcceptance);
  }

  // ── Smart Grouping/Dedup ──
  // Diversify results: max 3 per opponent, max 2 per primary get position
  trades = smartDiversify(trades);

  // Apply sort
  const sortBy = filters.sortBy || 'overall';
  trades.sort((a, b) => {
    switch (sortBy) {
      case 'fairness': return b.scores.fairness - a.scores.fairness;
      case 'myImprovement': return b.scores.myImprovement - a.scores.myImprovement;
      case 'acceptance': return b.scores.acceptance - a.scores.acceptance;
      default: return b.scores.overall - a.scores.overall;
    }
  });

  // ── Trade Targets Grouping ──
  // Group trades by what you're GETTING for the response
  const tradeTargets = buildTradeTargets(trades);

  // Rank
  trades.forEach((t, i) => { t.rank = i + 1; });

  // Pagination
  const offset = filters.offset || 0;
  const limit = filters.limit || 20;
  const paginatedTrades = trades.slice(offset, offset + limit);

  const executionMs = Date.now() - startTime;

  // Graduated need scores for response
  const myNeedScores = identifyNeedScores(myTeam, leagueSettings);

  const result = {
    myTeam: {
      rosterId: myTeam.rosterId,
      teamName: myTeam.teamName,
      detectedStrategy: detectStrategy(myTeam),
      appliedStrategy,
      needs: myNeeds,
      needScores: myNeedScores,
      strengths: ['QB', 'RB', 'WR', 'TE'].filter(p => !myNeeds.includes(p)),
      positionGrades,
      untouchables: untouchablePlayerIds
    },
    trades: paginatedTrades,
    tradeTargets,  // NEW: Grouped by target player
    hiddenGems: {  // NEW: Buy-low/sell-high opportunities
      sellHigh: hiddenGems.sellHigh.slice(0, 5),
      buyLow: hiddenGems.buyLow.slice(0, 8)
    },
    pagination: {
      total: trades.length,
      limit,
      offset,
      hasMore: offset + limit < trades.length
    },
    meta: {
      opponentsScanned: targetOpponents.length,
      candidatesGenerated: allCandidates.length,
      candidatesAnalyzed: topCandidates.length,
      tradesReturned: paginatedTrades.length,
      executionMs,
      cached: false,
      cacheExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
    }
  };

  // Cache result
  finderCache.set(cacheKey, result);

  // M6: Performance monitoring — warn on slow operations
  if (executionMs > 5000) {
    logger.warn('[TradeFinder] Slow execution detected', {
      executionMs,
      tradesFound: trades.length,
      candidatesGenerated: allCandidates.length,
      opponentsScanned: targetOpponents.length
    });
  }
  
  logger.info('Trade finder complete', {
    executionMs,
    tradesFound: trades.length,
    candidatesGenerated: allCandidates.length
  });

  return result;
}

module.exports = {
  findTrades,
  identifyNeeds,
  identifyNeedScores,
  identifyTradeable,
  detectStrategy,
  calculatePositionGrades,
  finderCache,
  STRATEGY_PROFILES,
  // Exported for testing
  calculateDynastyOutlook,
  calculateFairnessScore,
  getTradeGradeLabel,
  getAcceptanceLabel,
  deepAnalyze,
  // NEW exports
  describePositionalUpgrade,
  generateTradeNarrative,
  generateCoachingTip,
  applyScoreFloors,
  smartDiversify,
  buildTradeTargets,
};

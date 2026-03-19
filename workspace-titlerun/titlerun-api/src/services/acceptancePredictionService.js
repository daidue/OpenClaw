/**
 * Acceptance Prediction Service
 *
 * Predicts likelihood (0-95%) that opponent will accept a trade proposal.
 *
 * 10-factor model starting at baseline 35:
 * 1. Value fairness (±25)
 * 2. Opponent benefit (±20)
 * 3. Need match (±15)
 * 4. Strategy alignment (±10)
 * 5. Structure complexity (±8)
 * 6. 1-for-many penalty (±12)
 * 7. Elite player ask / Endowment effect (±12)
 * 8. Endowment resistance (-5)
 * 9. Positional replacement fear (±5)
 * 10. IR discount (+3)
 *
 * Output capped at 5-95 to reflect real-world variance.
 *
 * Dual-perspective reasoning generation (my view + their pitch).
 *
 * Spec: workspace-titlerun/specs/smart-trade-finder-v2.md §3.8-3.10
 */

const _logger = require('../utils/logger').child({ service: 'acceptance-prediction' });

// ─── Acceptance Prediction ─────────────────────────────────────

/**
 * Predict trade acceptance probability (0-95 scale).
 *
 * 10 factors starting at baseline 35:
 * 1. Value fairness (±25) — fair trades accepted more
 * 2. Opponent benefit (±20) — trades that help them accepted more
 * 3. Need match (±15) — fills their need = more likely
 * 4. Strategy alignment (±10) — aligns with rebuilding/contending
 * 5. Structure complexity (±8) — simple trades accepted more
 * 6. 1-for-many penalty (±12) — dynasty managers hate giving 1 star for 3 role players
 * 7. Elite player ask (±12) — asking for their best player = harder
 * 8. Endowment resistance (-5) — people inherently resist trades
 * 9. Positional replacement fear (±5) — trading away a starter is scary
 * 10. IR discount (+3) — injured players are easier to acquire
 */
/**
 * @param {Array} [opponentNeeds] - Pre-computed opponent needs (avoids circular dep with tradeFinderService)
 */
function predictAcceptance(candidate, analysis, opponentTeam, leagueSettings, opponentNeeds) {
  let score = 35; // LOWERED from 50 — most dynasty trades get rejected

  // Factor 1: Fairness (±25, WIDENED from ±20)
  const fairnessGap = analysis.fairness?.valueGapPercent || 0;
  const inTheirFavor = isValueInTheirFavor(candidate);
  if (fairnessGap < 3) {score += 25;}        // dead even
  else if (fairnessGap < 8) {score += 15;}   // close enough
  else if (fairnessGap < 15) {score += (inTheirFavor ? 10 : -5);}
  else if (fairnessGap < 25) {score += (inTheirFavor ? 5 : -15);}
  else {score -= 20;}                         // too lopsided

  // Factor 2: Their lineup improvement (±25, INCREASED weight — most important factor)
  // Use lineup simulation score if available, fall back to raw percent
  const theirImprovementScore = analysis.teamB?.lineupImprovement?.score;
  const theirImprovement = analysis.teamB?.lineupImprovement?.improvementPercent || 0;
  if (theirImprovementScore !== undefined) {
    // Use new simulation-based score (REBALANCED: wider range, more weight)
    if (theirImprovementScore >= 70) {score += 25;}
    else if (theirImprovementScore >= 60) {score += 18;}
    else if (theirImprovementScore >= 55) {score += 12;}
    else if (theirImprovementScore >= 50) {score += 6;}
    else if (theirImprovementScore >= 45) {score += 2;}
    else if (theirImprovementScore >= 35) {score -= 5;}
    else {score -= 15;}
  } else {
    // Legacy fallback
    if (theirImprovement > 5) {score += 25;}
    else if (theirImprovement > 2) {score += 15;}
    else if (theirImprovement > 0) {score += 5;}
    else {score -= 10;}
  }

  // Factor 2b: Recency/hype bias (NEW)
  // Players with high value relative to age have hype = harder to acquire
  const playerHype = candidate.get.reduce((maxHype, a) => {
    if (a.type !== 'player') return maxHype;
    const ageValue = (a.value || 0) / Math.max(a.age || 25, 20);
    return Math.max(maxHype, ageValue);
  }, 0);
  if (playerHype > 400) {score -= 5;} // Hyped young star — harder to get
  else if (playerHype > 300) {score -= 2;}

  // Factor 3: Need match (±15, WIDENED from ±5)
  const oppNeeds = opponentNeeds || [];
  const fillsNeed = candidate.give.some(a =>
    a.type === 'player' && oppNeeds.includes(a.position)
  );
  const fillsMultipleNeeds = candidate.give.filter(a =>
    a.type === 'player' && oppNeeds.includes(a.position)
  ).length >= 2;
  if (fillsMultipleNeeds) {score += 15;}
  else if (fillsNeed) {score += 10;}
  else {score -= 5;} // offering what they don't need

  // Factor 4: Strategy alignment (±10, NEW)
  const oppPlayers = opponentTeam.players || [];
  const oppActivePlayers = oppPlayers.filter(p => p.status === 'active' || !p.status);
  const oppAvgAge = oppActivePlayers.length > 0
    ? oppActivePlayers.reduce((s, p) => s + (p.age || 25), 0) / oppActivePlayers.length
    : 25;
  const oppStrategy = oppAvgAge >= 27 ? 'contending' : oppAvgAge <= 24 ? 'rebuilding' : 'retooling';
  const gettingYoung = candidate.give.filter(a => a.type === 'player' && (a.age || 25) <= 24).length;
  const gettingOld = candidate.give.filter(a => a.type === 'player' && (a.age || 25) >= 28).length;
  const gettingPicks = candidate.give.filter(a => a.type === 'pick').length;
  if (oppStrategy === 'rebuilding' && (gettingYoung > 0 || gettingPicks > 0)) {score += 10;}
  else if (oppStrategy === 'contending' && gettingOld > 0) {score += 8;}
  else if (oppStrategy === 'rebuilding' && gettingOld > 0 && gettingPicks === 0) {score -= 8;}

  // Factor 5: Structure complexity (±8)
  const totalPieces = candidate.give.length + candidate.get.length;
  if (totalPieces === 2) {score += 8;}
  else if (totalPieces <= 4) {score += 3;}
  else {score -= 5;}

  // Factor 6: 1-for-many penalty (±12)
  if (candidate.get.length === 1 && candidate.give.length >= 3) {score -= 12;}
  if (candidate.give.length === 1 && candidate.get.length >= 3) {score += 5;}

  // Factor 7: Elite player ask (±12)
  const theirBestValue = oppPlayers.length > 0
    ? Math.max(...oppPlayers.map(p => p.value || 0))
    : 0;
  const askingForElite = candidate.get.some(a =>
    a.type === 'player' && (a.value || 0) > theirBestValue * 0.85
  );
  if (askingForElite) {score -= 12;}

  // Factor 8: Endowment effect — always subtract small penalty
  score -= 5; // People inherently resist trades

  // Factor 9: Positional replacement fear (±5)
  const positionBest = {};
  oppPlayers.forEach(p => {
    if (!positionBest[p.position] || p.value > positionBest[p.position].value) {
      positionBest[p.position] = p;
    }
  });
  const tradingTheirStarter = candidate.get.some(a => {
    if (a.type !== 'player') {return false;}
    return positionBest[a.position]?.playerId === a.id;
  });
  if (tradingTheirStarter) {score -= 5;}

  // Factor 10: IR discount (+3)
  const gettingIR = candidate.get.some(a => a.injuryStatus === 'IR');
  if (gettingIR) {score += 3;}

  return Math.max(5, Math.min(95, Math.round(score)));
}

/**
 * Check if the trade value favors the opponent (they get more value than they give)
 */
function isValueInTheirFavor(candidate) {
  const giveValue = candidate.give.reduce((sum, a) => sum + (a.value || 0), 0);
  const getValue = candidate.get.reduce((sum, a) => sum + (a.value || 0), 0);
  return giveValue > getValue; // We give more than we get = value in their favor
}

// ─── Reasoning Generation ──────────────────────────────────────

/**
 * Generate dual-perspective reasoning.
 * - reasoning: why this trade is good for ME
 * - pitch: why the OPPONENT should accept
 */
/**
 * @param {Array} [myNeeds] - Pre-computed my needs
 * @param {Array} [opponentNeeds] - Pre-computed opponent needs
 */
function generateReasoning(candidate, myTeam, opponentTeam, analysis, leagueSettings, myNeeds, opponentNeeds) {
  const myNeedsList = myNeeds || [];
  const oppNeeds = opponentNeeds || [];

  const reasoning = buildMyReasoning(candidate, myNeedsList, analysis?.teamA);
  const pitch = buildTheirReasoning(candidate, oppNeeds, analysis?.teamB, opponentTeam);

  return { reasoning, pitch };
}

function buildMyReasoning(candidate, myNeeds, myAnalysis) {
  const parts = [];

  const gettingPlayers = candidate.get.filter(a => a.type === 'player');
  const givingPlayers = candidate.give.filter(a => a.type === 'player');
  const gettingPicks = candidate.get.filter(a => a.type === 'pick');

  // Position needs
  const positionsAcquired = [...new Set(gettingPlayers.map(p => p.position))];
  const needsFilled = positionsAcquired.filter(p => myNeeds.includes(p));

  if (needsFilled.length > 0) {
    const topGet = gettingPlayers.sort((a, b) => (b.value || 0) - (a.value || 0))[0];
    parts.push(`Fills your ${needsFilled.join('/')} need with ${topGet?.name || 'upgrade'}`);
  }

  // What I'm giving
  const positionsGiving = [...new Set(givingPlayers.map(p => p.position))];
  if (positionsGiving.length > 0) {
    parts.push(`You trade from ${positionsGiving.join('/')} depth`);
  }

  // Lineup impact
  const improvement = myAnalysis?.lineupImprovement?.improvementPercent || 0;
  if (improvement > 0) {
    parts.push(`Your lineup improves ${improvement.toFixed(1)}%`);
  } else if (improvement < 0) {
    parts.push(`Short-term lineup dip of ${Math.abs(improvement).toFixed(1)}% — future upside trade`);
  }

  // Picks
  if (gettingPicks.length > 0) {
    parts.push(`Adds ${gettingPicks.length} draft pick${gettingPicks.length > 1 ? 's' : ''} for future`);
  }

  return parts.length > 0 ? parts.join('. ') + '.' : 'Improves overall roster composition.';
}

function buildTheirReasoning(candidate, oppNeeds, oppAnalysis, _opponentTeam) {
  const parts = [];

  // What they get (from our give)
  const theirGetting = candidate.give.filter(a => a.type === 'player');
  const theirGettingPicks = candidate.give.filter(a => a.type === 'pick');

  if (theirGetting.length > 0) {
    const positionsFilled = [...new Set(theirGetting.map(p => p.position))];
    const needsFilled = positionsFilled.filter(p => oppNeeds.includes(p));

    if (needsFilled.length > 0) {
      parts.push(`Fills their ${needsFilled.join(' and ')} need${needsFilled.length > 1 ? 's' : ''}`);
    }

    const topPlayer = theirGetting.sort((a, b) => (b.value || 0) - (a.value || 0))[0];
    if (topPlayer) {
      parts.push(`Gets ${topPlayer.name} (${topPlayer.position}, ${topPlayer.value?.toLocaleString() || '?'} value)`);
    }
  }

  if (theirGettingPicks.length > 0) {
    parts.push(`Adds ${theirGettingPicks.length} draft pick${theirGettingPicks.length > 1 ? 's' : ''} for future flexibility`);
  }

  // Their lineup impact
  const improvement = oppAnalysis?.lineupImprovement?.improvementPercent || 0;
  if (improvement > 0) {
    parts.push(`Their lineup improves ${improvement.toFixed(1)}%`);
  }

  if (parts.length === 0) {
    parts.push('Offers fair value for roster flexibility');
  }

  return parts.join('. ') + '.';
}

// ─── Availability Assessment ───────────────────────────────────

/**
 * Assess how "available" target players are (0-10 scale).
 * Elite players are harder to trade for.
 */
function assessAvailability(assets) {
  let score = 10;

  for (const asset of assets) {
    if (asset.type !== 'player') {continue;}
    if ((asset.value || 0) > 9000) {score -= 5;}
    else if ((asset.value || 0) > 7500) {score -= 2;}
    if (asset.injuryStatus === 'IR') {score += 2;}
  }

  return Math.max(0, Math.min(10, score));
}

module.exports = {
  predictAcceptance,
  generateReasoning,
  assessAvailability
};

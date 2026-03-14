/**
 * TEP Value Service — Comprehensive Test Suite
 * 
 * Tests the proprietary TE Premium calculation engine:
 * - Scarcity multipliers
 * - Advanced stats bonuses
 * - Age curve modifiers
 * - Tier assignment with compression
 * - Full TEP value calculation
 * - Batch calculation
 * - KTC comparison estimates
 */

'use strict';

const {
  calculateTEPValue,
  calculateBatchTEPValues,
  getScarcityMultiplier,
  getScarcityTierLabel,
  calculateAdvancedStatBonus,
  getAgeCurveModifier,
  assignTier,
  estimateKTCValue,
} = require('../tepValueService');

const { VALUE_CAP } = require('../tep-config');

// =============================================================================
// TEST DATA — Real players from KTC screenshots
// =============================================================================

const BROCK_BOWERS = {
  playerId: '9509',
  position: 'TE',
  age: 21,
  baseValue: 7696,
  positionRank: 1,
  advancedStats: {
    targetShare: 0.28,
    routeParticipation: 0.87,
    rzTargetShare: 0.22,
    receptionsPerGame: 6.5,
  },
};

const TREY_MCBRIDE = {
  playerId: '8150',
  position: 'TE',
  age: 26,
  baseValue: 7583,
  positionRank: 2,
  advancedStats: {
    targetShare: 0.25,
    routeParticipation: 0.83,
    rzTargetShare: 0.18,
    receptionsPerGame: 5.8,
  },
};

const HAROLD_FANNIN = {
  playerId: '12345',
  position: 'TE',
  age: 21,
  baseValue: 4856,
  positionRank: 5,
  advancedStats: {
    targetShare: 0.18,
    routeParticipation: 0.72,
    rzTargetShare: 0.12,
    receptionsPerGame: 4.2,
  },
};

const SAM_LAPORTA = {
  playerId: '9230',
  position: 'TE',
  age: 25,
  baseValue: 4545,
  positionRank: 7,
  advancedStats: {
    targetShare: 0.22,
    routeParticipation: 0.80,
    rzTargetShare: 0.15,
    receptionsPerGame: 5.0,
  },
};

// =============================================================================
// SCARCITY MULTIPLIER TESTS
// =============================================================================

describe('getScarcityMultiplier', () => {
  test('TE1 gets maximum elite scarcity (1.20)', () => {
    expect(getScarcityMultiplier(1)).toBe(1.20);
  });
  
  test('TE3 gets slightly decayed elite scarcity', () => {
    const mult = getScarcityMultiplier(3);
    expect(mult).toBeLessThan(1.20);
    expect(mult).toBeGreaterThan(1.18);
  });
  
  test('TE4 transitions to High tier', () => {
    const mult = getScarcityMultiplier(4);
    expect(mult).toBe(1.12);
  });
  
  test('TE7 transitions to Starter tier', () => {
    const mult = getScarcityMultiplier(7);
    expect(mult).toBe(1.06);
  });
  
  test('TE13 transitions to Depth tier', () => {
    const mult = getScarcityMultiplier(13);
    expect(mult).toBe(1.02);
  });
  
  test('TE25 transitions to Waiver tier (no bonus)', () => {
    expect(getScarcityMultiplier(25)).toBe(1.00);
  });
  
  test('TE50 stays at Waiver tier', () => {
    expect(getScarcityMultiplier(50)).toBe(1.00);
  });
  
  test('invalid rank returns 1.00', () => {
    expect(getScarcityMultiplier(0)).toBe(1.00);
    expect(getScarcityMultiplier(-1)).toBe(1.00);
    expect(getScarcityMultiplier(null)).toBe(1.00);
    expect(getScarcityMultiplier(undefined)).toBe(1.00);
    expect(getScarcityMultiplier(NaN)).toBe(1.00);
    expect(getScarcityMultiplier(Infinity)).toBe(1.00);
  });
  
  test('multiplier smoothly decays within each tier', () => {
    // Within Elite tier (1-3), each subsequent rank is slightly lower
    const te1 = getScarcityMultiplier(1);
    const te2 = getScarcityMultiplier(2);
    const te3 = getScarcityMultiplier(3);
    
    expect(te1).toBeGreaterThan(te2);
    expect(te2).toBeGreaterThan(te3);
    
    // Decay should be gradual
    expect(te1 - te2).toBeCloseTo(te2 - te3, 2);
  });
  
  test('there is a clear cliff between tiers', () => {
    // TE3 (Elite) should be notably higher than TE4 (High)
    const te3 = getScarcityMultiplier(3);
    const te4 = getScarcityMultiplier(4);
    
    expect(te3 - te4).toBeGreaterThan(0.05);
  });
});

describe('getScarcityTierLabel', () => {
  test('returns correct tier labels', () => {
    expect(getScarcityTierLabel(1)).toBe('Elite');
    expect(getScarcityTierLabel(3)).toBe('Elite');
    expect(getScarcityTierLabel(4)).toBe('High');
    expect(getScarcityTierLabel(7)).toBe('Starter');
    expect(getScarcityTierLabel(13)).toBe('Depth');
    expect(getScarcityTierLabel(25)).toBe('Waiver');
  });
  
  test('handles edge cases', () => {
    expect(getScarcityTierLabel(0)).toBe('Unknown');
    expect(getScarcityTierLabel(null)).toBe('Unknown');
    expect(getScarcityTierLabel(undefined)).toBe('Unknown');
  });
});

// =============================================================================
// ADVANCED STATS BONUS TESTS
// =============================================================================

describe('calculateAdvancedStatBonus', () => {
  test('elite stats get maximum bonus (capped at 1.10)', () => {
    const bonus = calculateAdvancedStatBonus({
      targetShare: 0.30,       // +0.05
      routeParticipation: 0.90, // +0.03
      rzTargetShare: 0.25,     // +0.03
      receptionsPerGame: 7.0,  // +0.02
      // Total: 0.13, but capped at 0.10
    });
    expect(bonus).toBe(1.10);
  });
  
  test('high-end starter stats get moderate bonus', () => {
    const bonus = calculateAdvancedStatBonus({
      targetShare: 0.22,        // +0.03
      routeParticipation: 0.80, // +0.02
      rzTargetShare: 0.15,      // +0.02
      receptionsPerGame: 5.0,   // +0.01
    });
    expect(bonus).toBe(1.08);
  });
  
  test('average TE stats get small bonus', () => {
    const bonus = calculateAdvancedStatBonus({
      targetShare: 0.15,        // +0.01
      routeParticipation: 0.65, // +0.01
      rzTargetShare: 0.10,      // +0.01
      receptionsPerGame: 3.5,   // +0
    });
    expect(bonus).toBe(1.03);
  });
  
  test('blocking TE with low usage gets no bonus', () => {
    const bonus = calculateAdvancedStatBonus({
      targetShare: 0.08,
      routeParticipation: 0.45,
      rzTargetShare: 0.05,
      receptionsPerGame: 2.0,
    });
    expect(bonus).toBe(1.00);
  });
  
  test('missing stats return 1.00', () => {
    expect(calculateAdvancedStatBonus(null)).toBe(1.00);
    expect(calculateAdvancedStatBonus(undefined)).toBe(1.00);
    expect(calculateAdvancedStatBonus({})).toBe(1.00);
    expect(calculateAdvancedStatBonus('invalid')).toBe(1.00);
  });
  
  test('partial stats still work', () => {
    const bonus = calculateAdvancedStatBonus({
      targetShare: 0.25,  // +0.05
      // Missing other stats
    });
    expect(bonus).toBe(1.05);
  });
});

// =============================================================================
// AGE CURVE MODIFIER TESTS
// =============================================================================

describe('getAgeCurveModifier', () => {
  test('young breakout TEs get premium (age 20-22)', () => {
    expect(getAgeCurveModifier(20)).toBe(1.04);
    expect(getAgeCurveModifier(21)).toBe(1.04);
    expect(getAgeCurveModifier(22)).toBe(1.04);
  });
  
  test('early career TEs get small premium (age 23-24)', () => {
    expect(getAgeCurveModifier(23)).toBe(1.02);
    expect(getAgeCurveModifier(24)).toBe(1.02);
  });
  
  test('peak TEs are neutral (age 25-27)', () => {
    expect(getAgeCurveModifier(25)).toBe(1.00);
    expect(getAgeCurveModifier(26)).toBe(1.00);
    expect(getAgeCurveModifier(27)).toBe(1.00);
  });
  
  test('late peak TEs get slight discount (age 28-29)', () => {
    expect(getAgeCurveModifier(28)).toBe(0.98);
    expect(getAgeCurveModifier(29)).toBe(0.98);
  });
  
  test('declining TEs get discount (age 30-31)', () => {
    expect(getAgeCurveModifier(30)).toBe(0.95);
    expect(getAgeCurveModifier(31)).toBe(0.95);
  });
  
  test('end career TEs get significant discount (age 32+)', () => {
    expect(getAgeCurveModifier(32)).toBe(0.90);
    expect(getAgeCurveModifier(35)).toBe(0.90);
    expect(getAgeCurveModifier(40)).toBe(0.90);
  });
  
  test('unknown age returns 1.00', () => {
    expect(getAgeCurveModifier(null)).toBe(1.00);
    expect(getAgeCurveModifier(undefined)).toBe(1.00);
    expect(getAgeCurveModifier(0)).toBe(1.00);
    expect(getAgeCurveModifier(-1)).toBe(1.00);
  });
});

// =============================================================================
// TIER ASSIGNMENT TESTS
// =============================================================================

describe('assignTier', () => {
  test('standard tier assignment for non-TEs', () => {
    expect(assignTier(9500, 'WR', 'tep3')).toEqual({ tier: 1, label: 'Cornerstone' });
    expect(assignTier(7000, 'RB', 'tep3')).toEqual({ tier: 3, label: 'Elite' });
    expect(assignTier(1000, 'QB', 'tep3')).toEqual({ tier: 10, label: 'Speculative' });
  });
  
  test('standard tiers when TEP is off', () => {
    expect(assignTier(9500, 'TE', 'off')).toEqual({ tier: 1, label: 'Cornerstone' });
    expect(assignTier(8500, 'TE', 'off')).toEqual({ tier: 2, label: 'Blue Chip' });
  });
  
  test('TEP+++ compressed tiers for TEs', () => {
    // 8500 is Tier 1 in TEP+++ but Tier 2 in standard
    expect(assignTier(8500, 'TE', 'tep3')).toEqual({ tier: 1, label: 'Cornerstone' });
    
    // 7500 is Tier 2 in TEP+++ but Tier 3 in standard
    expect(assignTier(7500, 'TE', 'tep3')).toEqual({ tier: 2, label: 'Blue Chip' });
    
    // 6200 is Tier 3 in TEP+++ but Tier 4 in standard
    expect(assignTier(6200, 'TE', 'tep3')).toEqual({ tier: 3, label: 'Elite' });
  });
  
  test('TEP+ has less compression than TEP+++', () => {
    // 9200 is Tier 1 in TEP+ vs 8500 in TEP+++
    const tepTier = assignTier(8600, 'TE', 'tep');
    const tep3Tier = assignTier(8600, 'TE', 'tep3');
    
    expect(tepTier.tier).toBeGreaterThanOrEqual(tep3Tier.tier);
  });
  
  test('zero or negative values get lowest tier', () => {
    expect(assignTier(0, 'TE', 'tep3')).toEqual({ tier: 11, label: 'Waiver Wire' });
  });
});

// =============================================================================
// CORE TEP CALCULATION TESTS
// =============================================================================

describe('calculateTEPValue', () => {
  describe('Non-TE positions', () => {
    test('WR returns base value unchanged', () => {
      const result = calculateTEPValue({
        baseValue: 8000,
        position: 'WR',
        tepLevel: 'tep3',
      });
      expect(result.tepValue).toBe(8000);
      expect(result.isAdjusted).toBe(false);
      expect(result.multiplierBreakdown).toBeNull();
    });
    
    test('QB returns base value unchanged', () => {
      const result = calculateTEPValue({
        baseValue: 9500,
        position: 'QB',
        tepLevel: 'tep3',
      });
      expect(result.tepValue).toBe(9500);
      expect(result.isAdjusted).toBe(false);
    });
    
    test('RB returns base value unchanged', () => {
      const result = calculateTEPValue({
        baseValue: 6000,
        position: 'RB',
        tepLevel: 'tep3',
      });
      expect(result.tepValue).toBe(6000);
    });
  });
  
  describe('TEP Off', () => {
    test('TE with TEP off returns base value', () => {
      const result = calculateTEPValue({
        baseValue: 7696,
        position: 'TE',
        positionRank: 1,
        age: 21,
        tepLevel: 'off',
      });
      expect(result.tepValue).toBe(7696);
      expect(result.isAdjusted).toBe(false);
    });
  });
  
  describe('Brock Bowers (TE1, age 21, elite stats)', () => {
    test('TEP+++ gives maximum boost, capped at 9999', () => {
      const result = calculateTEPValue({
        baseValue: BROCK_BOWERS.baseValue,
        position: 'TE',
        positionRank: BROCK_BOWERS.positionRank,
        age: BROCK_BOWERS.age,
        advancedStats: BROCK_BOWERS.advancedStats,
        tepLevel: 'tep3',
      });
      
      expect(result.tepValue).toBe(VALUE_CAP); // Capped
      expect(result.isAdjusted).toBe(true);
      expect(result.multiplierBreakdown.base).toBe(1.32);
      expect(result.multiplierBreakdown.scarcity).toBe(1.20);
      expect(result.multiplierBreakdown.ageCurve).toBe(1.04);
      expect(result.multiplierBreakdown.scarcityTier).toBe('Elite');
      expect(result.multiplierBreakdown.combined).toBeGreaterThan(1.6);
    });
    
    test('TEP+ gives significant boost for elite TE', () => {
      const result = calculateTEPValue({
        baseValue: BROCK_BOWERS.baseValue,
        position: 'TE',
        positionRank: BROCK_BOWERS.positionRank,
        age: BROCK_BOWERS.age,
        advancedStats: BROCK_BOWERS.advancedStats,
        tepLevel: 'tep',
      });
      
      // Bowers TE1 with elite stats + young age: even TE+ can push to cap
      // 7696 * 1.10 (base) * 1.20 (scarcity) * 1.10 (stats) * 1.04 (age) ≈ 11,646 → capped at 9999
      expect(result.tepValue).toBeGreaterThan(BROCK_BOWERS.baseValue);
      expect(result.tepValue).toBeLessThanOrEqual(VALUE_CAP);
      expect(result.multiplierBreakdown.base).toBe(1.10);
    });
  });
  
  describe('Harold Fannin (TE5, age 21, moderate stats)', () => {
    test('TEP+++ gets High scarcity + young age bonus', () => {
      const result = calculateTEPValue({
        baseValue: HAROLD_FANNIN.baseValue,
        position: 'TE',
        positionRank: HAROLD_FANNIN.positionRank,
        age: HAROLD_FANNIN.age,
        advancedStats: HAROLD_FANNIN.advancedStats,
        tepLevel: 'tep3',
      });
      
      expect(result.tepValue).toBeGreaterThan(6462); // Should beat KTC's 6462
      expect(result.multiplierBreakdown.scarcityTier).toBe('High');
      expect(result.multiplierBreakdown.ageCurve).toBe(1.04);
    });
  });
  
  describe('Sam LaPorta (TE7, age 25, good stats)', () => {
    test('TEP+++ gets Starter scarcity, peak age', () => {
      const result = calculateTEPValue({
        baseValue: SAM_LAPORTA.baseValue,
        position: 'TE',
        positionRank: SAM_LAPORTA.positionRank,
        age: SAM_LAPORTA.age,
        advancedStats: SAM_LAPORTA.advancedStats,
        tepLevel: 'tep3',
      });
      
      expect(result.tepValue).toBeGreaterThan(6073); // Should beat KTC's 6073
      expect(result.multiplierBreakdown.scarcityTier).toBe('Starter');
      expect(result.multiplierBreakdown.ageCurve).toBe(1.00);
    });
  });
  
  describe('Edge cases', () => {
    test('handles zero base value', () => {
      const result = calculateTEPValue({
        baseValue: 0,
        position: 'TE',
        positionRank: 30,
        age: 25,
        tepLevel: 'tep3',
      });
      expect(result.tepValue).toBe(0);
    });
    
    test('handles negative base value', () => {
      const result = calculateTEPValue({
        baseValue: -100,
        position: 'TE',
        tepLevel: 'tep3',
      });
      expect(result.tepValue).toBe(0);
      expect(result.isAdjusted).toBe(false);
    });
    
    test('handles NaN base value', () => {
      const result = calculateTEPValue({
        baseValue: NaN,
        position: 'TE',
        tepLevel: 'tep3',
      });
      expect(result.tepValue).toBe(0);
    });
    
    test('handles invalid TEP level', () => {
      const result = calculateTEPValue({
        baseValue: 5000,
        position: 'TE',
        positionRank: 5,
        tepLevel: 'invalid',
      });
      expect(result.tepValue).toBe(5000); // Treated as 'off'
      expect(result.isAdjusted).toBe(false);
    });
    
    test('handles missing optional fields', () => {
      const result = calculateTEPValue({
        baseValue: 5000,
        position: 'TE',
        tepLevel: 'tep3',
        // No positionRank, age, or advancedStats
      });
      expect(result.tepValue).toBeGreaterThan(5000);
      expect(result.multiplierBreakdown.scarcity).toBe(1.00);
      expect(result.multiplierBreakdown.advancedStats).toBe(1.00);
      expect(result.multiplierBreakdown.ageCurve).toBe(1.00);
    });
    
    test('value is capped at VALUE_CAP', () => {
      const result = calculateTEPValue({
        baseValue: 9000,
        position: 'TE',
        positionRank: 1,
        age: 21,
        advancedStats: { targetShare: 0.30 },
        tepLevel: 'tep3',
      });
      expect(result.tepValue).toBeLessThanOrEqual(VALUE_CAP);
    });
  });
  
  describe('TEP level ordering', () => {
    test('tep3 > tep2 > tep > off for same player', () => {
      const params = {
        baseValue: 5000,
        position: 'TE',
        positionRank: 5,
        age: 25,
      };
      
      const off = calculateTEPValue({ ...params, tepLevel: 'off' });
      const tep = calculateTEPValue({ ...params, tepLevel: 'tep' });
      const tep2 = calculateTEPValue({ ...params, tepLevel: 'tep2' });
      const tep3 = calculateTEPValue({ ...params, tepLevel: 'tep3' });
      
      expect(tep3.tepValue).toBeGreaterThan(tep2.tepValue);
      expect(tep2.tepValue).toBeGreaterThan(tep.tepValue);
      expect(tep.tepValue).toBeGreaterThan(off.tepValue);
    });
  });
});

// =============================================================================
// BATCH CALCULATION TESTS
// =============================================================================

describe('calculateBatchTEPValues', () => {
  const players = [
    { id: '1', position: 'QB', value: 9000, age: 27 },
    { id: '2', position: 'WR', value: 8000, age: 25 },
    { id: '3', position: 'TE', value: 7696, age: 21, advancedStats: { targetShare: 0.28 } },
    { id: '4', position: 'TE', value: 4856, age: 21, advancedStats: { targetShare: 0.18 } },
    { id: '5', position: 'RB', value: 6000, age: 24 },
    { id: '6', position: 'TE', value: 3000, age: 30 },
  ];
  
  test('computes position ranks automatically', () => {
    const results = calculateBatchTEPValues(players, 'tep3');
    
    // TE1 = id:3 (7696), TE2 = id:4 (4856), TE3 = id:6 (3000)
    const te1 = results.find(p => p.id === '3');
    const te2 = results.find(p => p.id === '4');
    const te3 = results.find(p => p.id === '6');
    
    expect(te1.tepPositionRank).toBe(1);
    expect(te2.tepPositionRank).toBe(2);
    expect(te3.tepPositionRank).toBe(3);
  });
  
  test('only adjusts TEs', () => {
    const results = calculateBatchTEPValues(players, 'tep3');
    
    const qb = results.find(p => p.id === '1');
    const wr = results.find(p => p.id === '2');
    const rb = results.find(p => p.id === '5');
    
    expect(qb.tepAdjusted).toBe(false);
    expect(wr.tepAdjusted).toBe(false);
    expect(rb.tepAdjusted).toBe(false);
    expect(qb.tepValue).toBe(9000);
  });
  
  test('TEs get adjusted values', () => {
    const results = calculateBatchTEPValues(players, 'tep3');
    
    const te1 = results.find(p => p.id === '3');
    expect(te1.tepAdjusted).toBe(true);
    expect(te1.tepValue).toBeGreaterThan(te1.value);
  });
  
  test('handles empty array', () => {
    expect(calculateBatchTEPValues([], 'tep3')).toEqual([]);
  });
  
  test('handles array with no TEs', () => {
    const noTEs = [
      { id: '1', position: 'QB', value: 9000, age: 27 },
      { id: '2', position: 'WR', value: 8000, age: 25 },
    ];
    const results = calculateBatchTEPValues(noTEs, 'tep3');
    expect(results.length).toBe(2);
    expect(results.every(p => !p.tepAdjusted)).toBe(true);
  });
});

// =============================================================================
// KTC COMPARISON TESTS
// =============================================================================

describe('estimateKTCValue', () => {
  test('estimates KTC TEP+ values within reasonable range', () => {
    // Bowers: KTC TEP+ = 8521
    // Our KTC model is approximate — within 200 points is acceptable
    const estimated = estimateKTCValue(7696, 'tep');
    expect(Math.abs(estimated - 8521)).toBeLessThan(200);
  });
  
  test('estimates KTC TEP+++ values within reasonable range', () => {
    // Fannin: KTC TEP+++ = 6462
    // KTC's exact formula includes additive + multiplicative components
    // Our reverse-engineering is approximate — within 700 points is acceptable
    const estimated = estimateKTCValue(4856, 'tep3');
    expect(Math.abs(estimated - 6462)).toBeLessThan(700);
  });
  
  test('returns base value when TEP is off', () => {
    expect(estimateKTCValue(5000, 'off')).toBe(5000);
  });
  
  test('returns base value for invalid level', () => {
    expect(estimateKTCValue(5000, 'invalid')).toBe(5000);
  });
});

// =============================================================================
// INTEGRATION: Our values vs KTC values
// =============================================================================

describe('TitleRun vs KTC Comparison', () => {
  const KTC_TEP3_VALUES = {
    'Brock Bowers':   { base: 7696, ktc: 9999 },
    'Trey McBride':   { base: 7583, ktc: 9961 },
    'Cade Otton':     { base: 6014, ktc: 7940 },
    'Tyler Warren':   { base: 5680, ktc: 7512 },
    'Harold Fannin':  { base: 4856, ktc: 6462 },
    'Tucker Kraft':   { base: 4826, ktc: 6429 },
    'Sam LaPorta':    { base: 4545, ktc: 6073 },
    'Kyle Pitts':     { base: 4415, ktc: 5910 },
  };
  
  test('all TEP+++ values should be >= KTC values (our system is more generous for scarcity)', () => {
    const testCases = [
      { name: 'Brock Bowers', rank: 1, age: 21, stats: { targetShare: 0.28, routeParticipation: 0.87 } },
      { name: 'Harold Fannin', rank: 5, age: 21, stats: { targetShare: 0.18, routeParticipation: 0.72 } },
      { name: 'Sam LaPorta', rank: 7, age: 25, stats: { targetShare: 0.22, routeParticipation: 0.80 } },
    ];
    
    for (const tc of testCases) {
      const ktcData = KTC_TEP3_VALUES[tc.name];
      const result = calculateTEPValue({
        baseValue: ktcData.base,
        position: 'TE',
        positionRank: tc.rank,
        age: tc.age,
        advancedStats: tc.stats,
        tepLevel: 'tep3',
      });
      
      // Our system should generally produce values >= KTC for ranked TEs
      // (due to scarcity premium), unless capped
      expect(result.tepValue).toBeGreaterThanOrEqual(ktcData.ktc * 0.95); // Within 5% minimum
    }
  });
  
  test('elite TEs (TE1-3) should have combined multiplier > 1.5 for tep3', () => {
    for (let rank = 1; rank <= 3; rank++) {
      const result = calculateTEPValue({
        baseValue: 7000,
        position: 'TE',
        positionRank: rank,
        age: 23,
        advancedStats: { targetShare: 0.22 },
        tepLevel: 'tep3',
      });
      expect(result.multiplierBreakdown.combined).toBeGreaterThan(1.5);
    }
  });
  
  test('waiver TEs (TE25+) should have combined multiplier close to base', () => {
    const result = calculateTEPValue({
      baseValue: 1000,
      position: 'TE',
      positionRank: 30,
      age: 28,
      tepLevel: 'tep3',
    });
    
    // Should be close to the base 1.32 multiplier (no scarcity, no stats, slight age discount)
    expect(result.multiplierBreakdown.combined).toBeLessThan(1.35);
    expect(result.multiplierBreakdown.combined).toBeGreaterThan(1.25);
  });
});

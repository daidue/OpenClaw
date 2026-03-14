/**
 * TEP Configuration — Single Source of Truth
 * 
 * All tunable parameters for the TE Premium value system.
 * Centralized here for easy adjustment and A/B testing.
 * 
 * @module tep-config
 * @version 1.0.0
 */

'use strict';

const VERSION = '1.0.0';

// =============================================================================
// BASE TEP MULTIPLIERS
// =============================================================================
// These represent the raw format-based boost before scarcity/stats adjustments.
// Derived from analysis of TEP league scoring impact on TE point production.
//
// TE+ = +0.5 PPR bonus → ~10% value increase
// TE++ = +1.0 PPR bonus → ~20% value increase  
// TE+++ = +1.5 PPR bonus → ~32% value increase (non-linear due to scarcity)
const BASE_MULTIPLIERS = Object.freeze({
  off:  1.00,
  tep:  1.10,
  tep2: 1.20,
  tep3: 1.32,
});

// =============================================================================
// SCARCITY TIERS
// =============================================================================
// Non-linear scarcity multipliers based on TE positional rank.
// Elite TEs are scarcer than elite WRs/RBs — TEP amplifies this scarcity.
//
// KTC uses flat multipliers. Our system rewards elite scarcity with bigger boosts.
const SCARCITY_TIERS = Object.freeze([
  { label: 'Elite',   minRank: 1,  maxRank: 3,   multiplier: 1.20 },
  { label: 'High',    minRank: 4,  maxRank: 6,   multiplier: 1.12 },
  { label: 'Starter', minRank: 7,  maxRank: 12,  multiplier: 1.06 },
  { label: 'Depth',   minRank: 13, maxRank: 24,  multiplier: 1.02 },
  { label: 'Waiver',  minRank: 25, maxRank: 999, multiplier: 1.00 },
]);

// Within a scarcity tier, rank 1 in the tier gets the full multiplier.
// Each subsequent rank within the tier loses this much.
// Example: Elite tier (3 players), decay 0.02:
//   TE1 = 1.200, TE2 = 1.193, TE3 = 1.187
const INTRA_TIER_DECAY = 0.02;

// =============================================================================
// ADVANCED STATS BONUS
// =============================================================================
// Usage-based bonus that rewards TEs who catch a lot of passes.
// In TEP format, target share directly correlates with value.
const ADVANCED_STATS = Object.freeze({
  MAX_BONUS: 0.10, // Cap at 10% total bonus
  
  TARGET_SHARE: Object.freeze({
    ELITE: { threshold: 0.25, bonus: 0.05 },
    HIGH:  { threshold: 0.20, bonus: 0.03 },
    MID:   { threshold: 0.15, bonus: 0.01 },
  }),
  
  ROUTE_PARTICIPATION: Object.freeze({
    ELITE: { threshold: 0.85, bonus: 0.03 },
    HIGH:  { threshold: 0.75, bonus: 0.02 },
    MID:   { threshold: 0.65, bonus: 0.01 },
  }),
  
  RZ_TARGET_SHARE: Object.freeze({
    ELITE: { threshold: 0.20, bonus: 0.03 },
    HIGH:  { threshold: 0.15, bonus: 0.02 },
    MID:   { threshold: 0.10, bonus: 0.01 },
  }),
  
  RECEPTIONS_PER_GAME: Object.freeze({
    ELITE: { threshold: 6.0, bonus: 0.02 },
    HIGH:  { threshold: 4.5, bonus: 0.01 },
  }),
});

// =============================================================================
// AGE CURVE
// =============================================================================
// TE-specific aging curve for TEP formats.
// Young TEs get a premium (longer career runway in TEP).
// TEs peak later than RBs/WRs (ages 25-29).
const AGE_CURVE = Object.freeze([
  { label: 'Young Breakout', minAge: 0,  maxAge: 22, modifier: 1.04 },
  { label: 'Early Career',   minAge: 23, maxAge: 24, modifier: 1.02 },
  { label: 'Peak',           minAge: 25, maxAge: 27, modifier: 1.00 },
  { label: 'Late Peak',      minAge: 28, maxAge: 29, modifier: 0.98 },
  { label: 'Declining',      minAge: 30, maxAge: 31, modifier: 0.95 },
  { label: 'End Career',     minAge: 32, maxAge: 99, modifier: 0.90 },
]);

// =============================================================================
// TIER BOUNDARIES
// =============================================================================
// Standard (all positions, no TEP) tier boundaries
const STANDARD_TIER_BOUNDARIES = Object.freeze([
  { tier: 1,  min: 9500, label: 'Cornerstone' },
  { tier: 2,  min: 8500, label: 'Blue Chip' },
  { tier: 3,  min: 7000, label: 'Elite' },
  { tier: 4,  min: 6000, label: 'High-End Starter' },
  { tier: 5,  min: 5000, label: 'Solid Starter' },
  { tier: 6,  min: 4200, label: 'Flex Starter' },
  { tier: 7,  min: 3500, label: 'Bench/Matchup' },
  { tier: 8,  min: 2800, label: 'Deep Bench' },
  { tier: 9,  min: 2000, label: 'Prospect' },
  { tier: 10, min: 1000, label: 'Speculative' },
  { tier: 11, min: 0,    label: 'Waiver Wire' },
]);

// TEP-compressed tier boundaries for TEs only.
// Boundaries shift DOWN as TEP level increases, reflecting that
// TEP leagues make more TEs "startable" at each tier.
const TEP_TE_TIER_BOUNDARIES = Object.freeze({
  tep: Object.freeze([
    { tier: 1,  min: 9200, label: 'Cornerstone' },
    { tier: 2,  min: 8200, label: 'Blue Chip' },
    { tier: 3,  min: 6800, label: 'Elite' },
    { tier: 4,  min: 5800, label: 'High-End Starter' },
    { tier: 5,  min: 4800, label: 'Solid Starter' },
    { tier: 6,  min: 4000, label: 'Flex Starter' },
    { tier: 7,  min: 3200, label: 'Bench/Matchup' },
    { tier: 8,  min: 2500, label: 'Deep Bench' },
    { tier: 9,  min: 1800, label: 'Prospect' },
    { tier: 10, min: 900,  label: 'Speculative' },
    { tier: 11, min: 0,    label: 'Waiver Wire' },
  ]),
  tep2: Object.freeze([
    { tier: 1,  min: 8800, label: 'Cornerstone' },
    { tier: 2,  min: 7800, label: 'Blue Chip' },
    { tier: 3,  min: 6500, label: 'Elite' },
    { tier: 4,  min: 5500, label: 'High-End Starter' },
    { tier: 5,  min: 4600, label: 'Solid Starter' },
    { tier: 6,  min: 3800, label: 'Flex Starter' },
    { tier: 7,  min: 3000, label: 'Bench/Matchup' },
    { tier: 8,  min: 2300, label: 'Deep Bench' },
    { tier: 9,  min: 1600, label: 'Prospect' },
    { tier: 10, min: 800,  label: 'Speculative' },
    { tier: 11, min: 0,    label: 'Waiver Wire' },
  ]),
  tep3: Object.freeze([
    { tier: 1,  min: 8500, label: 'Cornerstone' },
    { tier: 2,  min: 7500, label: 'Blue Chip' },
    { tier: 3,  min: 6200, label: 'Elite' },
    { tier: 4,  min: 5200, label: 'High-End Starter' },
    { tier: 5,  min: 4400, label: 'Solid Starter' },
    { tier: 6,  min: 3600, label: 'Flex Starter' },
    { tier: 7,  min: 2800, label: 'Bench/Matchup' },
    { tier: 8,  min: 2100, label: 'Deep Bench' },
    { tier: 9,  min: 1400, label: 'Prospect' },
    { tier: 10, min: 700,  label: 'Speculative' },
    { tier: 11, min: 0,    label: 'Waiver Wire' },
  ]),
});

// =============================================================================
// SOURCE WEIGHTS
// =============================================================================
// Different weighting for TEP vs standard formats.
// TEP weights prioritize sources that have TEP-specific data.
const SOURCE_WEIGHTS = Object.freeze({
  STANDARD: Object.freeze({
    fantasyCalc: 0.22, ktc: 0.17, sleeperMarket: 0.12,
    uth: 0.12, dynastyProcess: 0.10, dynastyDaddy: 0.10,
    fantasyPros: 0.08, dynastyNerds: 0.05, production: 0.04,
  }),
  TEP: Object.freeze({
    fantasyCalc: 0.25, ktc: 0.20, dynastyDaddy: 0.15,
    sleeperMarket: 0.10, uth: 0.10, dynastyProcess: 0.08,
    fantasyPros: 0.05, dynastyNerds: 0.04, production: 0.03,
  }),
});

// Maximum value on the 0-10K scale
const VALUE_CAP = 9999;

// Valid TEP level values
const VALID_TEP_LEVELS = Object.freeze(['off', 'tep', 'tep2', 'tep3']);

module.exports = {
  VERSION,
  BASE_MULTIPLIERS,
  SCARCITY_TIERS,
  INTRA_TIER_DECAY,
  ADVANCED_STATS,
  AGE_CURVE,
  STANDARD_TIER_BOUNDARIES,
  TEP_TE_TIER_BOUNDARIES,
  SOURCE_WEIGHTS,
  VALUE_CAP,
  VALID_TEP_LEVELS,
};

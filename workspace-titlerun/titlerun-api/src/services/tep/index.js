/**
 * TEP (TE Premium) Value System
 * 
 * Proprietary TitleRun TE Premium calculation engine.
 * 
 * @module tep
 * @version 1.0.0
 * 
 * Usage:
 * ```javascript
 * const tep = require('./services/tep');
 * 
 * // Single player calculation
 * const result = tep.calculateTEPValue({
 *   baseValue: 7696,
 *   position: 'TE',
 *   positionRank: 1,
 *   age: 21,
 *   advancedStats: { targetShare: 0.28 },
 *   tepLevel: 'tep3',
 * });
 * // result.tepValue → 9999
 * // result.multiplierBreakdown → { base: 1.32, scarcity: 1.20, ... }
 * 
 * // Batch calculation (auto-ranks TEs)
 * const players = [...];
 * const withTEP = tep.calculateBatchTEPValues(players, 'tep3');
 * ```
 */

'use strict';

const tepValueService = require('./tepValueService');
const tepConfig = require('./tep-config');
const positionRankCache = require('./positionRankCache');

module.exports = {
  // Core calculation functions
  calculateTEPValue: tepValueService.calculateTEPValue,
  calculateBatchTEPValues: tepValueService.calculateBatchTEPValues,
  
  // Component functions
  getScarcityMultiplier: tepValueService.getScarcityMultiplier,
  getScarcityTierLabel: tepValueService.getScarcityTierLabel,
  calculateAdvancedStatBonus: tepValueService.calculateAdvancedStatBonus,
  getAgeCurveModifier: tepValueService.getAgeCurveModifier,
  assignTier: tepValueService.assignTier,
  
  // Comparison utility
  estimateKTCValue: tepValueService.estimateKTCValue,
  
  // Configuration
  config: tepConfig,

  // Position rank caching (performance)
  positionRankCache,
};

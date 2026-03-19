/**
 * Intelligence Services Index
 *
 * Exports all AI-powered intelligence services for TitleRun.
 * Currently: Trade Narratives (V2 architecture)
 *
 * @module intelligence
 */

const narrativeGenerationService = require('./narrativeGenerationService');
const narrativeDataPipeline = require('./narrativeDataPipeline');
const narrativeValidator = require('./narrativeValidator');
const narrativePreGeneration = require('./narrativePreGeneration');

module.exports = {
  // Generation
  generateTradeNarrative: narrativeGenerationService.generateTradeNarrative,
  batchGenerateNarratives: narrativeGenerationService.batchGenerateNarratives,
  getCachedNarrative: narrativeGenerationService.getCachedNarrative,
  enrichWithAINarrative: narrativeGenerationService.enrichWithAINarrative,
  narrativeCache: narrativeGenerationService.narrativeCache,

  // ETL Pipeline
  refreshNarrativeContext: narrativeDataPipeline.refreshNarrativeContext,

  // Validation
  validateNarrative: narrativeValidator.validateNarrative,
  passesMinimumQuality: narrativeValidator.passesMinimumQuality,

  // Pre-generation
  preGenerateTopTrades: narrativePreGeneration.preGenerateTopTrades,
};

/**
 * Schedule Configuration
 *
 * Defines all cron jobs for TitleRun backend services.
 * Jobs are registered with the scheduler service at startup.
 *
 * C4 FIX: Handlers now properly invoke the required function
 * instead of just returning a reference to it.
 *
 * @module scheduleConfig
 */

const schedules = [
  {
    name: 'refresh-narrative-context',
    description: 'Daily ETL refresh of player narrative context from Sleeper, ESPN, PFR',
    schedule: '0 8 * * *',  // 8AM ET daily
    // C4 FIX: Actually call the function instead of returning a reference
    handler: async (db) => {
      const { refreshNarrativeContext } = require('../services/intelligence/narrativeDataPipeline');
      return await refreshNarrativeContext(db);
    },
    enabled: true,
    timeout: 300000, // 5 minutes max
  },
  {
    name: 'pre-generate-narratives',
    description: 'Weekly pre-generation of trade narratives for top 100 player pairs',
    schedule: '0 2 * * 0',  // Sunday 2AM ET
    // C4 FIX: Actually call the function instead of returning a reference
    handler: async (db) => {
      const { preGenerateTopTrades } = require('../services/intelligence/narrativePreGeneration');
      return await preGenerateTopTrades(db);
    },
    enabled: true,
    timeout: 3600000, // 1 hour max
  },
];

module.exports = {
  schedules,
};

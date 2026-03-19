/**
 * Schedule Configuration
 *
 * Defines all cron jobs for TitleRun backend services.
 * Jobs are registered with the scheduler service at startup.
 *
 * @module scheduleConfig
 */

const schedules = [
  {
    name: 'refresh-narrative-context',
    description: 'Daily ETL refresh of player narrative context from Sleeper, ESPN, PFR',
    schedule: '0 8 * * *',  // 8AM ET daily
    handler: () => require('../services/intelligence/narrativeDataPipeline').refreshNarrativeContext,
    enabled: true,
    timeout: 300000, // 5 minutes max
  },
  {
    name: 'pre-generate-narratives',
    description: 'Weekly pre-generation of trade narratives for top 100 player pairs',
    schedule: '0 2 * * 0',  // Sunday 2AM ET
    handler: () => require('../services/intelligence/narrativePreGeneration').preGenerateTopTrades,
    enabled: true,
    timeout: 3600000, // 1 hour max
  },
];

module.exports = {
  schedules,
};

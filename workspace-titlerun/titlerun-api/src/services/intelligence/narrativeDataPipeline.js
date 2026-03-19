/**
 * Narrative Data Pipeline (ETL)
 *
 * Daily pipeline that refreshes player_narrative_context from multiple data sources.
 * Runs at 8AM ET via cron. Merges Sleeper, ESPN, PFR, and TitleRun data.
 *
 * Data Sources:
 *   1. Sleeper API - Player bio (age, position, NFL team)
 *   2. ESPN API - Transactions, coaching changes
 *   3. Pro Football Reference / Static JSON - 2025 stats, O-line rankings
 *   4. TitleRun DB - Dynasty values, team metrics
 *
 * Fixes applied:
 *   H6: Batch upserts (eliminates N+1 query problem)
 *   H7: Sleeper API response filtering (reduces memory)
 *   H8: Corrected coaching data
 *   H9: Real stats via static JSON import
 *   H10: O-line rankings via static JSON import
 *
 * @module narrativeDataPipeline
 */

const logger = require('../../utils/logger').child({ service: 'narrative-etl' });

// ─── Configuration ─────────────────────────────────────────────

const SLEEPER_API_BASE = 'https://api.sleeper.app/v1';
const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const CURRENT_SEASON = 2025;
const TRANSACTION_LOOKBACK_DAYS = 90;

// H9: Static player stats for MVP
let playerStats2025 = null;
function getPlayerStats2025() {
  if (!playerStats2025) {
    try {
      playerStats2025 = require('../../data/player-stats-2025.json');
    } catch {
      logger.warn('[NarrativeETL] player-stats-2025.json not found, stats will be empty');
      playerStats2025 = {};
    }
  }
  return playerStats2025;
}

// H10: Static O-line rankings for MVP
let olineData2025 = null;
function getOLineRankings2025() {
  if (!olineData2025) {
    try {
      olineData2025 = require('../../data/oline-rankings-2025.json');
    } catch {
      logger.warn('[NarrativeETL] oline-rankings-2025.json not found, rankings will be empty');
      olineData2025 = {};
    }
  }
  return olineData2025;
}

// ─── Data Source Fetchers ──────────────────────────────────────

/**
 * Fetch all NFL players from Sleeper API.
 * H7: Filters to only fantasy-relevant positions to reduce memory usage.
 * Returns player bio data: name, age, position, team, draft info.
 */
async function fetchSleeperPlayers() {
  try {
    const response = await fetch(`${SLEEPER_API_BASE}/players/nfl`);
    if (!response.ok) {
      throw new Error(`Sleeper API returned ${response.status}`);
    }
    const players = await response.json();

    // H7: Filter to only fantasy-relevant active players
    const totalCount = Object.keys(players).length;
    const transformed = {};

    for (const [playerId, player] of Object.entries(players)) {
      if (!player.active) continue;
      if (!['QB', 'RB', 'WR', 'TE'].includes(player.position)) continue;

      transformed[playerId] = {
        player_id: playerId,
        full_name: `${player.first_name} ${player.last_name}`,
        age: player.age || null,
        position: player.position,
        nfl_team: player.team || null,
        years_in_league: player.years_exp || 0,
        draft_year: player.draft_year || null,
        draft_round: player.draft_round || null,
        draft_pick: player.draft_pick || null,
        depth_chart_position: player.depth_chart_order || null,
      };
    }

    // H7: Log filtering stats
    logger.info(`[NarrativeETL] Filtered Sleeper players: ${totalCount} total → ${Object.keys(transformed).length} fantasy-relevant`);
    return transformed;
  } catch (err) {
    logger.error(`[NarrativeETL] Sleeper fetch failed: ${err.message}`);
    return {};
  }
}

/**
 * Fetch recent NFL transactions from ESPN API (last 90 days).
 * Covers trades, signings, releases, extensions.
 */
async function fetchESPNTransactions() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TRANSACTION_LOOKBACK_DAYS);

    const response = await fetch(
      `${ESPN_API_BASE}/transactions?limit=200`
    );
    if (!response.ok) {
      throw new Error(`ESPN API returned ${response.status}`);
    }
    const data = await response.json();

    // Group transactions by player
    const transactionsByPlayer = {};
    for (const txn of (data.items || [])) {
      const txnDate = new Date(txn.date);
      if (txnDate < cutoffDate) continue;

      for (const athlete of (txn.athletes || [])) {
        const name = athlete.displayName;
        if (!transactionsByPlayer[name]) {
          transactionsByPlayer[name] = [];
        }
        transactionsByPlayer[name].push({
          date: txn.date,
          type: txn.type?.text || 'unknown',
          description: txn.description || '',
          to: txn.team?.abbreviation || null,
        });
      }
    }

    logger.info(`[NarrativeETL] Fetched ${Object.keys(transactionsByPlayer).length} player transactions from ESPN`);
    return transactionsByPlayer;
  } catch (err) {
    logger.error(`[NarrativeETL] ESPN transaction fetch failed: ${err.message}`);
    return {};
  }
}

/**
 * Get 2025 season stats.
 * H9: Uses static JSON import for MVP. In production, use paid stats API
 * (e.g., SportsDataIO, ESPN Stats API).
 *
 * Returns: { playerName: { gamesPlayed, targets, receptions, yards, tds, ... } }
 */
async function scrapePFRStats(season) {
  try {
    if (season !== CURRENT_SEASON) {
      logger.warn(`[NarrativeETL] No stats data for season ${season}`);
      return {};
    }

    const stats = getPlayerStats2025();
    const playerCount = Object.keys(stats).filter(k => k !== '_meta').length;
    logger.info(`[NarrativeETL] Loaded ${playerCount} player stats from static data (season ${season})`);
    return stats;
  } catch (err) {
    logger.error(`[NarrativeETL] Stats loading failed: ${err.message}`);
    return {};
  }
}

/**
 * Get coaching staff data.
 * H8: Fixed incorrect coaching assignments (DAL, DET, TB, etc.)
 * Maps NFL teams to their HC/OC for context in narratives.
 */
async function scrapeCoachingData() {
  // H8: Corrected coaching data for 2025-2026 season
  const coachingStaffs = {
    ARI: { HC: 'Jonathan Gannon', OC: 'Drew Petzing' },
    ATL: { HC: 'Raheem Morris', OC: 'Zac Robinson' },
    BAL: { HC: 'John Harbaugh', OC: 'Todd Monken' },
    BUF: { HC: 'Sean McDermott', OC: 'Joe Brady' },
    CAR: { HC: 'Dave Canales', OC: 'Brad Idzik' },
    CHI: { HC: 'Ben Johnson', OC: 'TBD' },
    CIN: { HC: 'Zac Taylor', OC: 'Dan Pitcher' },
    CLE: { HC: 'Kevin Stefanski', OC: 'Ken Dorsey' },
    // H8 FIX: Schottenheimer is HC now, not OC. Kellen Moore left for PHI OC.
    DAL: { HC: 'Brian Schottenheimer', OC: 'TBD' },
    DEN: { HC: 'Sean Payton', OC: 'Joe Lombardi' },
    // H8 FIX: Ben Johnson left DET to become CHI HC
    DET: { HC: 'TBD', OC: 'TBD' },
    GB: { HC: 'Matt LaFleur', OC: 'Adam Stenavich' },
    HOU: { HC: 'DeMeco Ryans', OC: 'Bobby Slowik' },
    IND: { HC: 'Shane Steichen', OC: 'Jim Bob Cooter' },
    JAX: { HC: 'Liam Coen', OC: 'TBD' },
    KC: { HC: 'Andy Reid', OC: 'Matt Nagy' },
    LAC: { HC: 'Jim Harbaugh', OC: 'Greg Roman' },
    LAR: { HC: 'Sean McVay', OC: 'Mike LaFleur' },
    LV: { HC: 'Pete Carroll', OC: 'TBD' },
    MIA: { HC: 'Mike McDaniel', OC: 'Frank Smith' },
    MIN: { HC: 'Kevin O\'Connell', OC: 'Wes Phillips' },
    NE: { HC: 'Mike Vrabel', OC: 'Josh McDaniels' },
    NO: { HC: 'Darren Rizzi', OC: 'Klint Kubiak' },
    NYG: { HC: 'Brian Daboll', OC: 'Mike Kafka' },
    NYJ: { HC: 'Aaron Glenn', OC: 'TBD' },
    // H8 FIX: Kellen Moore is PHI OC (moved from DAL)
    PHI: { HC: 'Nick Sirianni', OC: 'Kellen Moore' },
    PIT: { HC: 'Mike Tomlin', OC: 'Arthur Smith' },
    SF: { HC: 'Kyle Shanahan', OC: 'TBD' },
    SEA: { HC: 'Mike Macdonald', OC: 'Ryan Grubb' },
    // H8 FIX: Liam Coen left TB to become JAX HC
    TB: { HC: 'Todd Bowles', OC: 'TBD' },
    TEN: { HC: 'Brian Callahan', OC: 'Nick Holz' },
    WAS: { HC: 'Dan Quinn', OC: 'Kliff Kingsbury' },
  };

  logger.info(`[NarrativeETL] Loaded coaching data for ${Object.keys(coachingStaffs).length} teams`);
  return coachingStaffs;
}

/**
 * Get offensive line rankings (run and pass blocking).
 * H10: Uses static JSON for MVP. PFF-style 1-32 rankings.
 */
async function scrapeOLineRankings() {
  try {
    const rankings = getOLineRankings2025();
    const teamCount = Object.keys(rankings).filter(k => k !== '_meta').length;
    logger.info(`[NarrativeETL] Loaded O-line rankings for ${teamCount} teams`);
    return rankings;
  } catch (err) {
    logger.error(`[NarrativeETL] O-line rankings loading failed: ${err.message}`);
    return {};
  }
}

/**
 * Fetch TitleRun dynasty values and rankings from our own DB.
 */
async function fetchTitleRunDynastyData(db) {
  try {
    if (!db) {
      logger.warn('[NarrativeETL] No DB connection provided, skipping dynasty data');
      return {};
    }

    // Query TitleRun's own valuation tables
    const result = await db.query(`
      SELECT player_id, dynasty_rank, value_trend
      FROM player_values
      WHERE season = $1
      ORDER BY dynasty_rank ASC
    `, [CURRENT_SEASON]);

    const dynastyData = {};
    for (const row of (result?.rows || [])) {
      dynastyData[row.player_id] = {
        dynasty_rank: row.dynasty_rank,
        value_trend: row.value_trend || 'stable',
      };
    }

    logger.info(`[NarrativeETL] Fetched dynasty data for ${Object.keys(dynastyData).length} players`);
    return dynastyData;
  } catch (err) {
    logger.error(`[NarrativeETL] Dynasty data fetch failed: ${err.message}`);
    return {};
  }
}

// ─── Merge & Transform ────────────────────────────────────────

/**
 * Merge all data sources into a unified player_narrative_context format.
 */
function mergeNarrativeContext({ sleeperPlayers, stats2025, transactions, coaching, olineRanks, dynastyData }) {
  const merged = [];

  for (const [playerId, player] of Object.entries(sleeperPlayers)) {
    const playerName = player.full_name;
    const team = player.nfl_team;
    const playerStats = stats2025[playerName] || {};
    const playerTxns = transactions[playerName] || [];
    const teamCoaching = team ? (coaching[team] || {}) : {};
    const teamOLine = team ? (olineRanks[team] || {}) : {};
    const dynasty = (dynastyData || {})[playerId] || {};

    // Calculate data quality score (0-100)
    let qualityScore = 0;
    if (player.full_name) qualityScore += 20;
    if (player.age) qualityScore += 15;
    if (player.nfl_team) qualityScore += 15;
    if (Object.keys(playerStats).length > 0) qualityScore += 25;
    if (Object.keys(teamCoaching).length > 0) qualityScore += 10;
    if (dynasty.dynasty_rank) qualityScore += 15;

    merged.push({
      player_id: playerId,
      season: CURRENT_SEASON,
      full_name: player.full_name,
      age: player.age,
      position: player.position,
      nfl_team: team,
      years_in_league: player.years_in_league,
      draft_year: player.draft_year,
      draft_round: player.draft_round,
      draft_pick: player.draft_pick,
      games_played: playerStats.games_played || 0,
      targets: playerStats.targets || 0,
      receptions: playerStats.receptions || 0,
      yards: playerStats.yards || 0,
      touchdowns: playerStats.touchdowns || 0,
      rush_attempts: playerStats.rush_attempts || 0,
      rush_yards: playerStats.rush_yards || 0,
      rush_tds: playerStats.rush_tds || 0,
      team_record: playerStats.team_record || null,
      team_playoff_result: playerStats.team_playoff_result || null,
      oline_rank_run: teamOLine.run || null,
      oline_rank_pass: teamOLine.pass || null,
      coaching_staff: teamCoaching,
      depth_chart_position: player.depth_chart_position,
      target_share_pct: playerStats.target_share_pct || null,
      snap_count_pct: playerStats.snap_count_pct || null,
      recent_transactions: playerTxns,
      recent_contract: playerStats.recent_contract || null,
      dynasty_rank: dynasty.dynasty_rank || null,
      value_trend: dynasty.value_trend || 'stable',
      data_quality_score: qualityScore,
    });
  }

  logger.info(`[NarrativeETL] Merged context for ${merged.length} players`);
  return merged;
}

// ─── Database Operations ───────────────────────────────────────

/**
 * H6 FIX: Batch upsert merged player context into player_narrative_context table.
 * Uses multi-value INSERT with ON CONFLICT to eliminate N+1 query problem.
 * Processes in batches of 50 for memory efficiency.
 */
async function upsertNarrativeContext(db, mergedPlayers) {
  if (!db) {
    logger.warn('[NarrativeETL] No DB connection - skipping upsert');
    return { upserted: 0 };
  }

  let upserted = 0;
  const batchSize = 50;
  const COLS_PER_ROW = 31;

  for (let i = 0; i < mergedPlayers.length; i += batchSize) {
    const batch = mergedPlayers.slice(i, i + batchSize);

    try {
      // H6: Build multi-value INSERT for the entire batch
      const values = [];
      const placeholders = [];

      batch.forEach((player, idx) => {
        const offset = idx * COLS_PER_ROW;
        const params = Array.from({ length: COLS_PER_ROW }, (_, k) => `$${offset + k + 1}`);
        placeholders.push(`(${params.join(', ')})`);

        values.push(
          player.player_id,              // 1
          player.season,                 // 2
          player.full_name,              // 3
          player.age,                    // 4
          player.position,               // 5
          player.nfl_team,               // 6
          player.years_in_league,        // 7
          player.draft_year,             // 8
          player.draft_round,            // 9
          player.draft_pick,             // 10
          player.games_played,           // 11
          player.targets,                // 12
          player.receptions,             // 13
          player.yards,                  // 14
          player.touchdowns,             // 15
          player.rush_attempts,          // 16
          player.rush_yards,             // 17
          player.rush_tds,               // 18
          player.team_record,            // 19
          player.team_playoff_result,    // 20
          player.oline_rank_run,         // 21
          player.oline_rank_pass,        // 22
          JSON.stringify(player.coaching_staff),  // 23
          player.depth_chart_position,   // 24
          player.target_share_pct,       // 25
          player.snap_count_pct,         // 26
          JSON.stringify(player.recent_transactions), // 27
          player.recent_contract ? JSON.stringify(player.recent_contract) : null, // 28
          player.dynasty_rank,           // 29
          player.value_trend,            // 30
          player.data_quality_score,     // 31
        );
      });

      await db.query(`
        INSERT INTO player_narrative_context (
          player_id, season, full_name, age, position, nfl_team,
          years_in_league, draft_year, draft_round, draft_pick,
          games_played, targets, receptions, yards, touchdowns,
          rush_attempts, rush_yards, rush_tds,
          team_record, team_playoff_result, oline_rank_run, oline_rank_pass,
          coaching_staff, depth_chart_position, target_share_pct, snap_count_pct,
          recent_transactions, recent_contract,
          dynasty_rank, value_trend, data_quality_score
        ) VALUES ${placeholders.join(', ')}
        ON CONFLICT (player_id) DO UPDATE SET
          season = EXCLUDED.season,
          full_name = EXCLUDED.full_name,
          age = EXCLUDED.age,
          position = EXCLUDED.position,
          nfl_team = EXCLUDED.nfl_team,
          years_in_league = EXCLUDED.years_in_league,
          games_played = EXCLUDED.games_played,
          targets = EXCLUDED.targets,
          receptions = EXCLUDED.receptions,
          yards = EXCLUDED.yards,
          touchdowns = EXCLUDED.touchdowns,
          rush_attempts = EXCLUDED.rush_attempts,
          rush_yards = EXCLUDED.rush_yards,
          rush_tds = EXCLUDED.rush_tds,
          team_record = EXCLUDED.team_record,
          team_playoff_result = EXCLUDED.team_playoff_result,
          oline_rank_run = EXCLUDED.oline_rank_run,
          oline_rank_pass = EXCLUDED.oline_rank_pass,
          coaching_staff = EXCLUDED.coaching_staff,
          depth_chart_position = EXCLUDED.depth_chart_position,
          target_share_pct = EXCLUDED.target_share_pct,
          snap_count_pct = EXCLUDED.snap_count_pct,
          recent_transactions = EXCLUDED.recent_transactions,
          recent_contract = EXCLUDED.recent_contract,
          dynasty_rank = EXCLUDED.dynasty_rank,
          value_trend = EXCLUDED.value_trend,
          data_quality_score = EXCLUDED.data_quality_score,
          updated_at = NOW()
      `, values);

      upserted += batch.length;
      logger.info(`[NarrativeETL] Batch upserted ${batch.length} players (${upserted}/${mergedPlayers.length})`);
    } catch (err) {
      logger.error(`[NarrativeETL] Batch upsert failed for batch starting at index ${i}: ${err.message}`);
      // Fallback: try individual upserts for this batch
      for (const player of batch) {
        try {
          await upsertSinglePlayer(db, player);
          upserted++;
        } catch (innerErr) {
          logger.error(`[NarrativeETL] Individual upsert failed for ${player.player_id}: ${innerErr.message}`);
        }
      }
    }
  }

  logger.info(`[NarrativeETL] Upserted ${upserted} player contexts`);
  return { upserted };
}

/**
 * Fallback: Upsert a single player (used when batch fails).
 */
async function upsertSinglePlayer(db, player) {
  await db.query(`
    INSERT INTO player_narrative_context (
      player_id, season, full_name, age, position, nfl_team,
      years_in_league, draft_year, draft_round, draft_pick,
      games_played, targets, receptions, yards, touchdowns,
      rush_attempts, rush_yards, rush_tds,
      team_record, team_playoff_result, oline_rank_run, oline_rank_pass,
      coaching_staff, depth_chart_position, target_share_pct, snap_count_pct,
      recent_transactions, recent_contract,
      dynasty_rank, value_trend, data_quality_score, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24, $25, $26,
      $27, $28, $29, $30, $31, NOW()
    )
    ON CONFLICT (player_id) DO UPDATE SET
      season = EXCLUDED.season,
      full_name = EXCLUDED.full_name,
      age = EXCLUDED.age,
      position = EXCLUDED.position,
      nfl_team = EXCLUDED.nfl_team,
      years_in_league = EXCLUDED.years_in_league,
      games_played = EXCLUDED.games_played,
      targets = EXCLUDED.targets,
      receptions = EXCLUDED.receptions,
      yards = EXCLUDED.yards,
      touchdowns = EXCLUDED.touchdowns,
      rush_attempts = EXCLUDED.rush_attempts,
      rush_yards = EXCLUDED.rush_yards,
      rush_tds = EXCLUDED.rush_tds,
      team_record = EXCLUDED.team_record,
      team_playoff_result = EXCLUDED.team_playoff_result,
      oline_rank_run = EXCLUDED.oline_rank_run,
      oline_rank_pass = EXCLUDED.oline_rank_pass,
      coaching_staff = EXCLUDED.coaching_staff,
      depth_chart_position = EXCLUDED.depth_chart_position,
      target_share_pct = EXCLUDED.target_share_pct,
      snap_count_pct = EXCLUDED.snap_count_pct,
      recent_transactions = EXCLUDED.recent_transactions,
      recent_contract = EXCLUDED.recent_contract,
      dynasty_rank = EXCLUDED.dynasty_rank,
      value_trend = EXCLUDED.value_trend,
      data_quality_score = EXCLUDED.data_quality_score,
      updated_at = NOW()
  `, [
    player.player_id, player.season, player.full_name, player.age,
    player.position, player.nfl_team, player.years_in_league,
    player.draft_year, player.draft_round, player.draft_pick,
    player.games_played, player.targets, player.receptions,
    player.yards, player.touchdowns, player.rush_attempts,
    player.rush_yards, player.rush_tds,
    player.team_record, player.team_playoff_result,
    player.oline_rank_run, player.oline_rank_pass,
    JSON.stringify(player.coaching_staff),
    player.depth_chart_position, player.target_share_pct,
    player.snap_count_pct,
    JSON.stringify(player.recent_transactions),
    player.recent_contract ? JSON.stringify(player.recent_contract) : null,
    player.dynasty_rank, player.value_trend, player.data_quality_score,
  ]);
}

/**
 * Invalidate narrative caches affected by recent transactions.
 * When a player changes teams, existing narratives are stale.
 */
async function invalidateStaleNarratives(db, transactions) {
  if (!db || Object.keys(transactions).length === 0) return { invalidated: 0 };

  try {
    // Get player IDs for players with recent transactions
    const result = await db.query(`
      SELECT player_id FROM player_narrative_context
      WHERE full_name = ANY($1)
    `, [Object.keys(transactions)]);

    const affectedIds = result.rows.map(r => r.player_id);
    if (affectedIds.length === 0) return { invalidated: 0 };

    // Delete cached narratives involving these players
    const deleteResult = await db.query(`
      DELETE FROM trade_narrative_cache
      WHERE give_player_id = ANY($1) OR get_player_id = ANY($1)
    `, [affectedIds]);

    const invalidated = deleteResult.rowCount || 0;
    logger.info(`[NarrativeETL] Invalidated ${invalidated} stale narrative caches`);
    return { invalidated };
  } catch (err) {
    logger.error(`[NarrativeETL] Cache invalidation failed: ${err.message}`);
    return { invalidated: 0 };
  }
}

// ─── Main Pipeline ─────────────────────────────────────────────

/**
 * Main daily ETL refresh.
 * Runs at 8AM ET daily via cron job.
 *
 * @param {object} db - Database connection (pg Pool or Client)
 */
async function refreshNarrativeContext(db) {
  const startTime = Date.now();
  logger.info('[NarrativeETL] Starting daily context refresh...');

  try {
    // 1. Fetch Sleeper player data (H7: filtered)
    const sleeperPlayers = await fetchSleeperPlayers();

    // 2. Get 2025 stats (H9: from static JSON)
    const stats2025 = await scrapePFRStats(CURRENT_SEASON);

    // 3. Fetch ESPN transactions (last 90 days)
    const transactions = await fetchESPNTransactions();

    // 4. Get coaching staffs (H8: corrected)
    const coaching = await scrapeCoachingData();

    // 5. Get O-line rankings (H10: from static JSON)
    const olineRanks = await scrapeOLineRankings();

    // 6. Fetch TitleRun dynasty data
    const dynastyData = await fetchTitleRunDynastyData(db);

    // 7. Merge all sources
    const merged = mergeNarrativeContext({
      sleeperPlayers,
      stats2025,
      transactions,
      coaching,
      olineRanks,
      dynastyData,
    });

    // 8. Upsert to player_narrative_context (H6: batch upsert)
    const upsertResult = await upsertNarrativeContext(db, merged);

    // 9. Invalidate affected narrative caches
    const invalidateResult = await invalidateStaleNarratives(db, transactions);

    const durationMs = Date.now() - startTime;
    logger.info('[NarrativeETL] Context refresh complete', {
      playersProcessed: merged.length,
      upserted: upsertResult.upserted,
      cachesInvalidated: invalidateResult.invalidated,
      durationMs,
    });

    return {
      success: true,
      playersProcessed: merged.length,
      upserted: upsertResult.upserted,
      cachesInvalidated: invalidateResult.invalidated,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    logger.error('[NarrativeETL] Pipeline failed', { error: err.message, durationMs });
    return { success: false, error: err.message, durationMs };
  }
}

module.exports = {
  refreshNarrativeContext,
  // Exported for testing
  fetchSleeperPlayers,
  fetchESPNTransactions,
  scrapePFRStats,
  scrapeCoachingData,
  scrapeOLineRankings,
  fetchTitleRunDynastyData,
  mergeNarrativeContext,
  upsertNarrativeContext,
  invalidateStaleNarratives,
  CURRENT_SEASON,
};

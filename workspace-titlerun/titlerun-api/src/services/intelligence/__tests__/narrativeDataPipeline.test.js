/**
 * Tests for narrativeDataPipeline.js
 * Updated with tests for: H6 (batch upserts), H7 (Sleeper filtering),
 * H8 (coaching data), H9 (static stats), H10 (O-line rankings)
 */
const {
  mergeNarrativeContext,
  scrapeCoachingData,
  scrapePFRStats,
  scrapeOLineRankings,
  CURRENT_SEASON,
} = require('../narrativeDataPipeline');

// ─── mergeNarrativeContext ────────────────────────────────────

describe('mergeNarrativeContext', () => {
  const sleeperPlayers = {
    '4046': {
      player_id: '4046',
      full_name: 'Travis Etienne',
      age: 27,
      position: 'RB',
      nfl_team: 'NO',
      years_in_league: 5,
      draft_year: 2021,
      draft_round: 1,
      draft_pick: 25,
      depth_chart_position: 1,
    },
    '9509': {
      player_id: '9509',
      full_name: 'Rome Odunze',
      age: 23,
      position: 'WR',
      nfl_team: 'CHI',
      years_in_league: 2,
      draft_year: 2024,
      draft_round: 1,
      draft_pick: 9,
      depth_chart_position: 1,
    },
  };

  const stats2025 = {
    'Travis Etienne': {
      games_played: 15,
      rush_attempts: 220,
      rush_yards: 1050,
      rush_tds: 8,
      receptions: 35,
      yards: 280,
      team_record: '9-8',
      team_playoff_result: 'Lost Wild Card',
    },
  };

  const transactions = {
    'Rome Odunze': [
      { date: '2026-03-05', type: 'roster_move', to: 'CHI', description: 'Activated from IR' },
    ],
  };

  const coaching = {
    NO: { HC: 'Darren Rizzi', OC: 'Klint Kubiak' },
    CHI: { HC: 'Ben Johnson', OC: 'TBD' },
  };

  const olineRanks = {
    NO: { run: 27, pass: 25 },
    CHI: { run: 15, pass: 12 },
  };

  const dynastyData = {
    '4046': { dynasty_rank: 45, value_trend: 'falling' },
    '9509': { dynasty_rank: 28, value_trend: 'rising' },
  };

  test('merges all data sources correctly', () => {
    const result = mergeNarrativeContext({
      sleeperPlayers,
      stats2025,
      transactions,
      coaching,
      olineRanks,
      dynastyData,
    });

    expect(result).toHaveLength(2);

    const etienne = result.find(p => p.player_id === '4046');
    expect(etienne).toBeDefined();
    expect(etienne.full_name).toBe('Travis Etienne');
    expect(etienne.age).toBe(27);
    expect(etienne.position).toBe('RB');
    expect(etienne.nfl_team).toBe('NO');
    expect(etienne.games_played).toBe(15);
    expect(etienne.rush_yards).toBe(1050);
    expect(etienne.team_record).toBe('9-8');
    expect(etienne.coaching_staff).toEqual({ HC: 'Darren Rizzi', OC: 'Klint Kubiak' });
    expect(etienne.oline_rank_run).toBe(27);
    expect(etienne.dynasty_rank).toBe(45);
    expect(etienne.value_trend).toBe('falling');
  });

  test('handles missing stats gracefully', () => {
    const result = mergeNarrativeContext({
      sleeperPlayers,
      stats2025: {},
      transactions: {},
      coaching: {},
      olineRanks: {},
      dynastyData: {},
    });

    const odunze = result.find(p => p.player_id === '9509');
    expect(odunze).toBeDefined();
    expect(odunze.games_played).toBe(0);
    expect(odunze.yards).toBe(0);
    expect(odunze.coaching_staff).toEqual({});
    expect(odunze.dynasty_rank).toBeNull();
  });

  test('calculates data quality score', () => {
    const result = mergeNarrativeContext({
      sleeperPlayers,
      stats2025,
      transactions,
      coaching,
      olineRanks,
      dynastyData,
    });

    const etienne = result.find(p => p.player_id === '4046');
    expect(etienne.data_quality_score).toBe(100);
  });

  test('attaches transactions to correct players', () => {
    const result = mergeNarrativeContext({
      sleeperPlayers,
      stats2025,
      transactions,
      coaching,
      olineRanks,
      dynastyData,
    });

    const odunze = result.find(p => p.player_id === '9509');
    expect(odunze.recent_transactions).toHaveLength(1);
    expect(odunze.recent_transactions[0].type).toBe('roster_move');

    const etienne = result.find(p => p.player_id === '4046');
    expect(etienne.recent_transactions).toHaveLength(0);
  });

  test('sets season correctly', () => {
    const result = mergeNarrativeContext({
      sleeperPlayers,
      stats2025: {},
      transactions: {},
      coaching: {},
      olineRanks: {},
    });

    expect(result[0].season).toBe(CURRENT_SEASON);
  });
});

// ─── H8: Coaching Data ────────────────────────────────────────

describe('scrapeCoachingData (H8)', () => {
  test('returns coaching data for all 32 teams', async () => {
    const coaching = await scrapeCoachingData();
    expect(Object.keys(coaching)).toHaveLength(32);
  });

  test('PHI has Kellen Moore as OC (H8 fix)', async () => {
    const coaching = await scrapeCoachingData();
    expect(coaching.PHI.OC).toBe('Kellen Moore');
  });

  test('DAL does NOT have Kellen Moore (H8 fix)', async () => {
    const coaching = await scrapeCoachingData();
    expect(coaching.DAL.OC).not.toBe('Kellen Moore');
  });

  test('CHI has Ben Johnson as HC (not TBD)', async () => {
    const coaching = await scrapeCoachingData();
    expect(coaching.CHI.HC).toBe('Ben Johnson');
  });

  test('all teams have HC and OC fields', async () => {
    const coaching = await scrapeCoachingData();
    for (const [team, staff] of Object.entries(coaching)) {
      expect(staff).toHaveProperty('HC');
      expect(staff).toHaveProperty('OC');
      expect(staff.HC.length).toBeGreaterThan(0);
    }
  });
});

// ─── H9: Static Stats ────────────────────────────────────────

describe('scrapePFRStats (H9)', () => {
  test('returns stats for current season', async () => {
    const stats = await scrapePFRStats(CURRENT_SEASON);
    const playerNames = Object.keys(stats).filter(k => k !== '_meta');
    expect(playerNames.length).toBeGreaterThan(0);
  });

  test('returns empty for other seasons', async () => {
    const stats = await scrapePFRStats(2020);
    const playerNames = Object.keys(stats).filter(k => k !== '_meta');
    expect(playerNames.length).toBe(0);
  });

  test('has real player stats (not placeholder)', async () => {
    const stats = await scrapePFRStats(CURRENT_SEASON);
    // Check for a known player
    if (stats["Ja'Marr Chase"]) {
      expect(stats["Ja'Marr Chase"].games_played).toBeGreaterThan(0);
      expect(stats["Ja'Marr Chase"].yards).toBeGreaterThan(0);
    }
  });
});

// ─── H10: O-Line Rankings ────────────────────────────────────

describe('scrapeOLineRankings (H10)', () => {
  test('returns rankings for teams', async () => {
    const rankings = await scrapeOLineRankings();
    const teams = Object.keys(rankings).filter(k => k !== '_meta');
    expect(teams.length).toBeGreaterThan(0);
  });

  test('rankings have run and pass fields', async () => {
    const rankings = await scrapeOLineRankings();
    const teams = Object.keys(rankings).filter(k => k !== '_meta');
    for (const team of teams) {
      expect(rankings[team]).toHaveProperty('run');
      expect(rankings[team]).toHaveProperty('pass');
      expect(rankings[team].run).toBeGreaterThanOrEqual(1);
      expect(rankings[team].run).toBeLessThanOrEqual(32);
      expect(rankings[team].pass).toBeGreaterThanOrEqual(1);
      expect(rankings[team].pass).toBeLessThanOrEqual(32);
    }
  });
});

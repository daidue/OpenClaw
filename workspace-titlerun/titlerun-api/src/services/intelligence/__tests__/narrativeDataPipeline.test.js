/**
 * Tests for narrativeDataPipeline.js
 */
const {
  mergeNarrativeContext,
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
    // Has name (20), age (15), team (15), stats (25), coaching (10), dynasty (15) = 100
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

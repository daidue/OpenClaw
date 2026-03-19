/**
 * Tests for narrativeGenerationService.js
 */
const {
  buildPrompt,
  calculateCost,
  narrativeCache,
  CONFIG,
} = require('../narrativeGenerationService');

// ─── buildPrompt ──────────────────────────────────────────────

describe('buildPrompt', () => {
  const givePlayer = {
    full_name: 'Travis Etienne',
    position: 'RB',
    age: 27,
    nfl_team: 'NO',
    team_record: '9-8',
    team_playoff_result: 'Lost Wild Card',
    games_played: 15,
    rush_attempts: 220,
    rush_yards: 1050,
    rush_tds: 8,
    receptions: 35,
    yards: 280,
    oline_rank_run: 27,
    dynasty_rank: 45,
    coaching_staff: { HC: 'Darren Rizzi', OC: 'Klint Kubiak' },
  };

  const getPlayer = {
    full_name: 'Rome Odunze',
    position: 'WR',
    age: 23,
    nfl_team: 'CHI',
    team_record: '10-7',
    team_playoff_result: 'Lost Divisional',
    games_played: 12,
    targets: 95,
    receptions: 62,
    yards: 820,
    touchdowns: 5,
    target_share_pct: 22.5,
    dynasty_rank: 28,
    coaching_staff: { HC: 'Ben Johnson', OC: 'TBD' },
    recent_transactions: [
      { date: '2026-03-05', type: 'trade', to: 'BUF', description: 'DJ Moore traded to BUF' },
    ],
  };

  const userTeam = {
    strategy: 'contender',
    championshipWindow: '2026-2028',
    depthAtGivePosition: 'thin',
    depthAtGetPosition: 'developing',
    draftPicks: '1.05, 2.03, 3.07',
  };

  test('includes both player names', () => {
    const prompt = buildPrompt(givePlayer, getPlayer, userTeam);
    expect(prompt).toContain('Travis Etienne');
    expect(prompt).toContain('Rome Odunze');
  });

  test('includes voice guidelines', () => {
    const prompt = buildPrompt(givePlayer, getPlayer, userTeam);
    expect(prompt).toContain('Data-driven analyst');
    expect(prompt).toContain('NO em dashes');
    expect(prompt).toContain('30-50 words per section');
  });

  test('includes player stats', () => {
    const prompt = buildPrompt(givePlayer, getPlayer, userTeam);
    expect(prompt).toContain('220 carries');
    expect(prompt).toContain('95 targets');
    expect(prompt).toContain('22.5% target share');
  });

  test('includes team context', () => {
    const prompt = buildPrompt(givePlayer, getPlayer, userTeam);
    expect(prompt).toContain('9-8');
    expect(prompt).toContain('10-7');
    expect(prompt).toContain('#27 run blocking');
  });

  test('includes coaching data', () => {
    const prompt = buildPrompt(givePlayer, getPlayer, userTeam);
    expect(prompt).toContain('Ben Johnson');
    expect(prompt).toContain('Darren Rizzi');
  });

  test('includes date stamp instruction', () => {
    const prompt = buildPrompt(givePlayer, getPlayer, userTeam);
    // Should have a date stamp format
    expect(prompt).toMatch(/\(\d{1,2}\/\d{1,2}\)/);
  });

  test('includes all 5 section instructions', () => {
    const prompt = buildPrompt(givePlayer, getPlayer, userTeam);
    expect(prompt).toContain('FOR TRADING AWAY');
    expect(prompt).toContain('FOR RECEIVING');
    expect(prompt).toContain('AGAINST TRADING AWAY');
    expect(prompt).toContain('AGAINST RECEIVING');
    expect(prompt).toContain('CONSENSUS');
  });

  test('includes user team context when provided', () => {
    const prompt = buildPrompt(givePlayer, getPlayer, userTeam);
    expect(prompt).toContain('contender');
    expect(prompt).toContain('2026-2028');
    expect(prompt).toContain('1.05, 2.03, 3.07');
  });

  test('handles missing user team gracefully', () => {
    const prompt = buildPrompt(givePlayer, getPlayer, null);
    expect(prompt).toContain('Travis Etienne');
    expect(prompt).not.toContain('USER\'S TEAM');
  });

  test('handles player with name field instead of full_name', () => {
    const playerWithName = { ...givePlayer, full_name: undefined, name: 'Travis Etienne' };
    const prompt = buildPrompt(playerWithName, getPlayer, userTeam);
    expect(prompt).toContain('Travis Etienne');
  });
});

// ─── calculateCost ────────────────────────────────────────────

describe('calculateCost', () => {
  test('calculates GPT-5 mini cost correctly', () => {
    // 1000 tokens: 700 input × $0.25/MTok + 300 output × $2.00/MTok
    const cost = calculateCost('gpt-5-mini', 1000);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.01); // Should be very cheap
  });

  test('deepseek is cheaper than GPT-5 mini for output-heavy', () => {
    const gptCost = calculateCost('gpt-5-mini', 1000);
    const dsCost = calculateCost('deepseek-v3.2', 1000);
    // DeepSeek should be cheaper overall for most use cases
    expect(dsCost).toBeLessThan(gptCost);
  });

  test('handles unknown model with default costs', () => {
    const cost = calculateCost('unknown-model', 1000);
    expect(cost).toBeGreaterThan(0);
  });
});

// ─── NarrativeCache ───────────────────────────────────────────

describe('NarrativeCache', () => {
  beforeEach(() => {
    // Reset cache
    narrativeCache.cache.clear();
    narrativeCache.hits = 0;
    narrativeCache.misses = 0;
  });

  test('stores and retrieves narratives', () => {
    const narrative = { forTradingAway: 'test', consensus: 'trade' };
    narrativeCache.set('player1', 'player2', narrative);

    const result = narrativeCache.get('player1', 'player2');
    expect(result).toEqual(narrative);
  });

  test('returns null for uncached pairs', () => {
    expect(narrativeCache.get('unknown1', 'unknown2')).toBeNull();
  });

  test('tracks hit/miss stats', () => {
    narrativeCache.set('p1', 'p2', { test: true });
    narrativeCache.get('p1', 'p2');  // hit
    narrativeCache.get('p3', 'p4');  // miss

    const stats = narrativeCache.stats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe('50.0%');
  });

  test('evicts oldest entries when full', () => {
    // Set max size to 3 for testing
    const smallCache = narrativeCache;
    const originalMax = smallCache.maxSize;
    smallCache.maxSize = 3;

    smallCache.set('a', 'b', { n: 1 });
    smallCache.set('c', 'd', { n: 2 });
    smallCache.set('e', 'f', { n: 3 });
    smallCache.set('g', 'h', { n: 4 }); // Should evict a:b

    expect(smallCache.get('a', 'b')).toBeNull();
    expect(smallCache.get('g', 'h')).toEqual({ n: 4 });

    smallCache.maxSize = originalMax;
  });

  test('respects TTL expiry', () => {
    // Set with very short TTL
    narrativeCache.set('p1', 'p2', { test: true }, 1); // 1ms TTL

    // Wait for expiry
    return new Promise(resolve => {
      setTimeout(() => {
        expect(narrativeCache.get('p1', 'p2')).toBeNull();
        resolve();
      }, 10);
    });
  });
});

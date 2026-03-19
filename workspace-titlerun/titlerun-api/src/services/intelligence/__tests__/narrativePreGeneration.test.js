/**
 * Tests for narrativePreGeneration.js
 */
const {
  generatePairs,
  PREGEN_CONFIG,
} = require('../narrativePreGeneration');

// ─── generatePairs ────────────────────────────────────────────

describe('generatePairs', () => {
  test('generates correct number of pairs (n × (n-1))', () => {
    const players = [
      { player_id: 'a', full_name: 'Player A' },
      { player_id: 'b', full_name: 'Player B' },
      { player_id: 'c', full_name: 'Player C' },
    ];

    const pairs = generatePairs(players);
    // 3 players × 2 others each = 6 pairs
    expect(pairs).toHaveLength(6);
  });

  test('excludes self-trades', () => {
    const players = [
      { player_id: 'a', full_name: 'Player A' },
      { player_id: 'b', full_name: 'Player B' },
    ];

    const pairs = generatePairs(players);
    for (const [give, get] of pairs) {
      expect(give.player_id).not.toBe(get.player_id);
    }
  });

  test('handles empty array', () => {
    expect(generatePairs([])).toHaveLength(0);
  });

  test('handles single player', () => {
    const players = [{ player_id: 'a', full_name: 'Player A' }];
    expect(generatePairs(players)).toHaveLength(0);
  });

  test('scales correctly for 100 players', () => {
    const players = Array.from({ length: 100 }, (_, i) => ({
      player_id: `p${i}`,
      full_name: `Player ${i}`,
    }));

    const pairs = generatePairs(players);
    expect(pairs).toHaveLength(100 * 99); // 9,900
  });
});

// ─── PREGEN_CONFIG ────────────────────────────────────────────

describe('PREGEN_CONFIG', () => {
  test('has sensible defaults', () => {
    expect(PREGEN_CONFIG.topPlayerCount).toBe(100);
    expect(PREGEN_CONFIG.batchSize).toBeGreaterThan(0);
    expect(PREGEN_CONFIG.maxConcurrentPerBatch).toBeGreaterThan(0);
    expect(PREGEN_CONFIG.delayBetweenBatches).toBeGreaterThan(0);
  });
});

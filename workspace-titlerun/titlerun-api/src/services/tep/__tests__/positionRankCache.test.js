/**
 * Position Rank Caching — Performance & Correctness Tests
 *
 * Validates:
 * - Cache hit/miss behavior
 * - TTL expiration
 * - Manual invalidation (single key + flush all)
 * - Performance improvement on cached lookups
 * - Graceful behavior without cache key
 * - Stats tracking
 */

'use strict';

const positionRankCache = require('../positionRankCache');

// Helper: generate unique player arrays (each player needs a distinct id)
function makePlayers(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    position: 'TE',
    value: 10000 - i, // descending values → rank = i+1
  }));
}

// Reset cache state between tests
beforeEach(() => {
  positionRankCache.resetStats();
});

// =============================================================================
// CORE CACHING BEHAVIOR
// =============================================================================

describe('Position Rank Cache — Core', () => {
  test('should compute and cache position ranks', () => {
    const players = makePlayers(100);
    const cacheKey = 'test-sf-core';

    const ranks = positionRankCache.getPositionRanks(players, cacheKey);

    expect(ranks).toBeInstanceOf(Map);
    expect(ranks.size).toBe(100);
    // Best player (value 10000) should be rank 1
    expect(ranks.get('player-0')).toBe(1);
    // Worst player should be rank 100
    expect(ranks.get('player-99')).toBe(100);

    const stats = positionRankCache.getStats();
    expect(stats.keys).toBe(1);
    expect(stats.misses).toBe(1);
  });

  test('second call with same key returns cached result (hit)', () => {
    const players = makePlayers(100);
    const cacheKey = 'test-sf-hit';

    positionRankCache.getPositionRanks(players, cacheKey); // miss
    positionRankCache.getPositionRanks(players, cacheKey); // hit

    const stats = positionRankCache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe('50.00%');
  });

  test('different cache keys are independent', () => {
    const players = makePlayers(50);
    positionRankCache.getPositionRanks(players, 'sf-2026-03-17');
    positionRankCache.getPositionRanks(players, 'ppr-2026-03-17');

    const stats = positionRankCache.getStats();
    expect(stats.keys).toBe(2);
    expect(stats.misses).toBe(2);
  });
});

// =============================================================================
// INVALIDATION
// =============================================================================

describe('Position Rank Cache — Invalidation', () => {
  test('invalidateCache(key) removes only that key', () => {
    const players = makePlayers(50);
    positionRankCache.getPositionRanks(players, 'key-a');
    positionRankCache.getPositionRanks(players, 'key-b');

    expect(positionRankCache.getStats().keys).toBe(2);

    positionRankCache.invalidateCache('key-a');
    expect(positionRankCache.getStats().keys).toBe(1);

    // key-b still cached
    positionRankCache.getPositionRanks(players, 'key-b'); // hit
    expect(positionRankCache.getStats().hits).toBe(1);
  });

  test('invalidateCache() (no arg) flushes all keys', () => {
    const players = makePlayers(50);
    positionRankCache.getPositionRanks(players, 'flush-a');
    positionRankCache.getPositionRanks(players, 'flush-b');
    positionRankCache.getPositionRanks(players, 'flush-c');

    expect(positionRankCache.getStats().keys).toBe(3);

    positionRankCache.invalidateCache();
    expect(positionRankCache.getStats().keys).toBe(0);
  });
});

// =============================================================================
// TTL EXPIRATION
// =============================================================================

describe('Position Rank Cache — TTL', () => {
  test('expired entries are treated as cache misses', () => {
    const players = makePlayers(20);

    // Insert with a very short TTL (1 ms)
    positionRankCache.getPositionRanks(players, 'ttl-test', 1);

    // Wait for expiration
    const start = Date.now();
    while (Date.now() - start < 5) { /* spin */ }

    // Should be a miss now
    positionRankCache.getPositionRanks(players, 'ttl-test', 1);
    const stats = positionRankCache.getStats();
    expect(stats.misses).toBe(2); // both calls are misses
  });
});

// =============================================================================
// GRACEFUL BEHAVIOR
// =============================================================================

describe('Position Rank Cache — Edge Cases', () => {
  test('works without a cache key (no caching)', () => {
    const players = makePlayers(50);

    const ranks = positionRankCache.getPositionRanks(players);
    expect(ranks).toBeInstanceOf(Map);
    expect(ranks.size).toBe(50);

    // No keys stored
    expect(positionRankCache.getStats().keys).toBe(0);
  });

  test('handles empty player array', () => {
    const ranks = positionRankCache.getPositionRanks([], 'empty');
    expect(ranks.size).toBe(0);
  });

  test('filters out non-TE players', () => {
    const mixed = [
      { id: 'qb1', position: 'QB', value: 9000 },
      { id: 'te1', position: 'TE', value: 7000 },
      { id: 'wr1', position: 'WR', value: 8000 },
      { id: 'te2', position: 'TE', value: 5000 },
    ];
    const ranks = positionRankCache.getPositionRanks(mixed, 'mixed');
    expect(ranks.size).toBe(2);
    expect(ranks.get('te1')).toBe(1);
    expect(ranks.get('te2')).toBe(2);
  });

  test('handles null/undefined entries in player array', () => {
    const players = [
      null,
      { id: 'te1', position: 'TE', value: 5000 },
      undefined,
      { id: 'te2', position: 'TE', value: 3000 },
    ];
    const ranks = positionRankCache.getPositionRanks(players, 'nulls');
    expect(ranks.size).toBe(2);
  });

  test('stats show 0.00% hit rate with zero lookups', () => {
    const stats = positionRankCache.getStats();
    expect(stats.hitRate).toBe('0.00%');
  });
});

// =============================================================================
// PERFORMANCE
// =============================================================================

describe('Position Rank Cache — Performance', () => {
  test('cached lookup is significantly faster than initial computation', () => {
    const players = makePlayers(1000);
    const cacheKey = 'perf-1k';

    // First call: compute + cache
    const start1 = Date.now();
    const ranks1 = positionRankCache.getPositionRanks(players, cacheKey);
    const duration1 = Date.now() - start1;

    // Second call: cache hit
    const start2 = Date.now();
    const ranks2 = positionRankCache.getPositionRanks(players, cacheKey);
    const duration2 = Date.now() - start2;

    // Cached call should be sub-millisecond (Map lookup vs sort+filter+map)
    // Use a generous threshold to avoid flaky CI
    expect(duration2).toBeLessThanOrEqual(Math.max(1, duration1));
    expect(ranks1.size).toBe(ranks2.size);
  });

  test('batch calculation uses cache on repeated calls', () => {
    const { calculateBatchTEPValues } = require('../tepValueService');
    const players = makePlayers(500);

    // Reset stats before this test
    positionRankCache.resetStats();

    // First batch: miss
    calculateBatchTEPValues(players, 'tep3', 'sf');

    // Second batch (same format): hit
    calculateBatchTEPValues(players, 'tep3', 'sf');

    const stats = positionRankCache.getStats();
    expect(stats.hits).toBeGreaterThanOrEqual(1);
    expect(stats.misses).toBeGreaterThanOrEqual(1);
  });
});

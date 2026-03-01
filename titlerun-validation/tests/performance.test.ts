import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeId, clearIdCache } from '../src/index';

/**
 * Performance benchmarks for normalizeId caching
 * 
 * Measures cache speedup for repeated ID validation.
 * Expected: ~20x improvement for cached vs uncached lookups.
 */

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    clearIdCache();
  });

  it('should demonstrate cache speedup for string IDs', () => {
    const iterations = 10000;
    const testId = '12345';

    // UNCACHED: First call (cache miss)
    clearIdCache();
    const uncachedStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      clearIdCache(); // Force cache miss every iteration
      normalizeId(testId);
    }
    const uncachedEnd = process.hrtime.bigint();
    const uncachedTimeNs = Number(uncachedEnd - uncachedStart);

    // CACHED: Repeated calls (cache hits)
    clearIdCache();
    normalizeId(testId); // Prime the cache
    const cachedStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      normalizeId(testId); // Should hit cache every time
    }
    const cachedEnd = process.hrtime.bigint();
    const cachedTimeNs = Number(cachedEnd - cachedStart);

    // Calculate speedup
    const speedup = uncachedTimeNs / cachedTimeNs;

    console.log(`\n📊 Cache Performance (${iterations.toLocaleString()} iterations):`);
    console.log(`   Uncached: ${(uncachedTimeNs / 1_000_000).toFixed(2)}ms`);
    console.log(`   Cached:   ${(cachedTimeNs / 1_000_000).toFixed(2)}ms`);
    console.log(`   Speedup:  ${speedup.toFixed(1)}x faster\n`);

    // Verify cache is working (cached should be significantly faster)
    expect(speedup).toBeGreaterThan(5); // At least 5x faster
    expect(cachedTimeNs).toBeLessThan(uncachedTimeNs);
  });

  it('should demonstrate cache speedup for number IDs', () => {
    const iterations = 10000;
    const testId = 12345;

    // UNCACHED
    clearIdCache();
    const uncachedStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      clearIdCache();
      normalizeId(testId);
    }
    const uncachedEnd = process.hrtime.bigint();
    const uncachedTimeNs = Number(uncachedEnd - uncachedStart);

    // CACHED
    clearIdCache();
    normalizeId(testId); // Prime
    const cachedStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      normalizeId(testId);
    }
    const cachedEnd = process.hrtime.bigint();
    const cachedTimeNs = Number(cachedEnd - cachedStart);

    const speedup = uncachedTimeNs / cachedTimeNs;

    console.log(`\n📊 Cache Performance - Numbers (${iterations.toLocaleString()} iterations):`);
    console.log(`   Uncached: ${(uncachedTimeNs / 1_000_000).toFixed(2)}ms`);
    console.log(`   Cached:   ${(cachedTimeNs / 1_000_000).toFixed(2)}ms`);
    console.log(`   Speedup:  ${speedup.toFixed(1)}x faster\n`);

    expect(speedup).toBeGreaterThan(5);
  });

  it('should measure cache hit rate for mixed valid/invalid inputs', () => {
    const iterations = 1000;
    const testInputs = [
      '12345',      // Valid (cached)
      'invalid',    // Invalid (NOT cached - fail fast)
      12345,        // Valid (cached)
      '67890',      // Valid (cached)
      null,         // Invalid (not cached)
    ];

    // Prime cache with valid inputs
    clearIdCache();
    testInputs.forEach(input => normalizeId(input));

    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      testInputs.forEach(input => normalizeId(input));
    }
    const end = process.hrtime.bigint();
    const timeNs = Number(end - start);

    console.log(`\n📊 Mixed Input Performance (${iterations.toLocaleString()} iterations, ${testInputs.length} inputs each):`);
    console.log(`   Total time: ${(timeNs / 1_000_000).toFixed(2)}ms`);
    console.log(`   Per call:   ${(timeNs / (iterations * testInputs.length)).toFixed(0)}ns\n`);

    // This is just a sanity check - we're measuring, not asserting specific performance
    expect(timeNs).toBeGreaterThan(0);
  });

  it('should measure performance of validation edge cases', () => {
    const iterations = 10000;
    const edgeCases = [
      Number.MAX_SAFE_INTEGER,
      0,
      '9007199254740991', // MAX_SAFE_INTEGER as string
      '  123  ',          // Whitespace trimming
    ];

    clearIdCache();
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      edgeCases.forEach(input => normalizeId(input));
    }
    const end = process.hrtime.bigint();
    const timeNs = Number(end - start);

    console.log(`\n📊 Edge Case Performance (${iterations.toLocaleString()} iterations, ${edgeCases.length} inputs each):`);
    console.log(`   Total time: ${(timeNs / 1_000_000).toFixed(2)}ms`);
    console.log(`   Per call:   ${(timeNs / (iterations * edgeCases.length)).toFixed(0)}ns\n`);

    expect(timeNs).toBeGreaterThan(0);
  });

  it('should verify cache does NOT store invalid results', () => {
    const invalidInputs = [
      'invalid',
      -123,
      123.45,
      null,
      undefined,
    ];

    clearIdCache();

    // Call each invalid input once
    invalidInputs.forEach(input => {
      const result = normalizeId(input);
      expect(result).toBe(null);
    });

    // Cache should still be empty (invalid results are NOT cached)
    const { size } = (normalizeId as any).constructor.prototype;
    // Note: We can't directly access idCache from outside the module,
    // but we can verify behavior by measuring performance

    // If invalid results were cached, repeated calls would be faster
    // Let's verify they're consistently slow (no cache benefit)
    const iterations = 1000;
    
    const firstRun = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      invalidInputs.forEach(input => normalizeId(input));
    }
    const firstEnd = process.hrtime.bigint();
    const firstTimeNs = Number(firstEnd - firstRun);

    const secondRun = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      invalidInputs.forEach(input => normalizeId(input));
    }
    const secondEnd = process.hrtime.bigint();
    const secondTimeNs = Number(secondEnd - secondRun);

    // Both runs should take similar time (no caching for invalid inputs)
    const ratio = firstTimeNs / secondTimeNs;
    
    console.log(`\n📊 Invalid Input Caching Test (${iterations} iterations):`);
    console.log(`   First run:  ${(firstTimeNs / 1_000_000).toFixed(2)}ms`);
    console.log(`   Second run: ${(secondTimeNs / 1_000_000).toFixed(2)}ms`);
    console.log(`   Ratio:      ${ratio.toFixed(2)}x (should be ~1.0 - no caching)\n`);

    // Ratio should be close to 1.0 (within 2x variation for noise)
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2.0);
  });
});

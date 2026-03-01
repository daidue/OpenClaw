import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeId,
  clearIdCache,
  resetCacheStats,
  resetValidationStats,
  getIdCacheStats,
  getValidationStats,
  setMetrics,
  type MetricsCollector,
} from '../src/index';

describe('Monitoring & Observability', () => {
  beforeEach(() => {
    clearIdCache();
    resetCacheStats();
    resetValidationStats();
    setMetrics({}); // Clear metrics collector
  });

  describe('Cache Statistics', () => {
    it('should track cache hits', () => {
      // First call - cache miss
      normalizeId('12345');
      
      // Second call - cache hit
      normalizeId('12345');
      normalizeId('12345');
      
      const stats = getIdCacheStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.totalRequests).toBe(3);
    });

    it('should calculate hit rate correctly', () => {
      // 3 misses
      normalizeId('111');
      normalizeId('222');
      normalizeId('333');
      
      // 6 hits (2 per ID)
      normalizeId('111');
      normalizeId('111');
      normalizeId('222');
      normalizeId('222');
      normalizeId('333');
      normalizeId('333');
      
      const stats = getIdCacheStats();
      expect(stats.totalRequests).toBe(9);
      expect(stats.hits).toBe(6);
      expect(stats.misses).toBe(3);
      expect(stats.hitRate).toBe(66.67); // 6/9 = 66.67%
    });

    it('should handle zero requests', () => {
      const stats = getIdCacheStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should reset cache stats', () => {
      normalizeId('12345');
      normalizeId('12345');
      
      resetCacheStats();
      
      const stats = getIdCacheStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });

    it('should include LRU cache internals', () => {
      normalizeId('111');
      normalizeId('222');
      
      const stats = getIdCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.max).toBeGreaterThan(0);
      expect(typeof stats.calculatedSize).toBe('number');
    });

    it('should track uncacheable inputs as misses', () => {
      normalizeId(null); // Uncacheable
      normalizeId(undefined); // Uncacheable
      normalizeId(Symbol('test')); // Uncacheable
      
      const stats = getIdCacheStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.misses).toBe(3);
      expect(stats.hits).toBe(0);
    });
  });

  describe('Validation Error Statistics', () => {
    it('should track error counts by type', () => {
      normalizeId(null); // NULL_OR_UNDEFINED
      normalizeId(undefined); // NULL_OR_UNDEFINED
      normalizeId('abc'); // NOT_A_NUMBER
      normalizeId(-5); // NEGATIVE_ID
      normalizeId(123.45); // NOT_AN_INTEGER
      
      const stats = getValidationStats();
      expect(stats.totalErrors).toBe(5);
      expect(stats.errorCounts.NULL_OR_UNDEFINED).toBe(2);
      expect(stats.errorCounts.NOT_A_NUMBER).toBe(1);
      expect(stats.errorCounts.NEGATIVE_ID).toBe(1);
      expect(stats.errorCounts.NOT_AN_INTEGER).toBe(1);
    });

    it('should calculate error rate correctly', () => {
      // 3 valid
      normalizeId('123');
      normalizeId('456');
      normalizeId('789');
      
      // 2 invalid
      normalizeId(null);
      normalizeId('abc');
      
      const stats = getValidationStats();
      expect(stats.totalValidations).toBe(5);
      expect(stats.totalErrors).toBe(2);
      expect(stats.errorRate).toBe(40.0); // 2/5 = 40%
    });

    it('should track all error code types', () => {
      normalizeId(null); // NULL_OR_UNDEFINED
      normalizeId(Symbol('x')); // INVALID_TYPE
      normalizeId(NaN); // NOT_A_NUMBER
      normalizeId(123.45); // NOT_AN_INTEGER
      normalizeId(-1); // NEGATIVE_ID
      normalizeId(Number.MAX_SAFE_INTEGER + 1); // OUT_OF_RANGE
      normalizeId(''); // EMPTY_STRING
      normalizeId('   '); // WHITESPACE_ONLY
      normalizeId('123\u200B'); // INVISIBLE_UNICODE_DETECTED
      normalizeId('１２３'); // NON_ASCII_DIGITS_DETECTED
      normalizeId('<script>'); // HTML_TAGS_DETECTED
      normalizeId('12345678901234567890'); // PRECISION_LOSS
      
      const stats = getValidationStats();
      expect(stats.totalErrors).toBe(12);
      expect(stats.errorCounts.NULL_OR_UNDEFINED).toBeGreaterThan(0);
      expect(stats.errorCounts.INVALID_TYPE).toBeGreaterThan(0);
      expect(stats.errorCounts.NOT_A_NUMBER).toBeGreaterThan(0);
      expect(stats.errorCounts.NOT_AN_INTEGER).toBeGreaterThan(0);
      expect(stats.errorCounts.NEGATIVE_ID).toBeGreaterThan(0);
      expect(stats.errorCounts.OUT_OF_RANGE).toBeGreaterThan(0);
      expect(stats.errorCounts.EMPTY_STRING).toBeGreaterThan(0);
      expect(stats.errorCounts.WHITESPACE_ONLY).toBeGreaterThan(0);
      expect(stats.errorCounts.INVISIBLE_UNICODE_DETECTED).toBeGreaterThan(0);
      expect(stats.errorCounts.NON_ASCII_DIGITS_DETECTED).toBeGreaterThan(0);
      expect(stats.errorCounts.HTML_TAGS_DETECTED).toBeGreaterThan(0);
      expect(stats.errorCounts.PRECISION_LOSS).toBeGreaterThan(0);
    });

    it('should reset validation stats', () => {
      normalizeId(null);
      normalizeId('abc');
      
      resetValidationStats();
      
      const stats = getValidationStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.totalValidations).toBe(0);
      expect(stats.errorRate).toBe(0);
    });

    it('should return immutable error counts', () => {
      normalizeId(null);
      
      const stats = getValidationStats();
      stats.errorCounts.NULL_OR_UNDEFINED = 999;
      
      const stats2 = getValidationStats();
      expect(stats2.errorCounts.NULL_OR_UNDEFINED).toBe(1); // Not mutated
    });

    it('should handle zero validations', () => {
      const stats = getValidationStats();
      expect(stats.totalValidations).toBe(0);
      expect(stats.totalErrors).toBe(0);
      expect(stats.errorRate).toBe(0);
    });
  });

  describe('Metrics Hooks', () => {
    it('should call cacheHit hook on cache hit', () => {
      const mockMetrics: MetricsCollector = {
        cacheHit: vi.fn(),
        cacheMiss: vi.fn(),
      };
      
      setMetrics(mockMetrics);
      
      normalizeId('12345'); // Miss
      normalizeId('12345'); // Hit
      
      expect(mockMetrics.cacheMiss).toHaveBeenCalledTimes(1);
      expect(mockMetrics.cacheHit).toHaveBeenCalledTimes(1);
    });

    it('should call cacheMiss hook on cache miss', () => {
      const mockMetrics: MetricsCollector = {
        cacheMiss: vi.fn(),
      };
      
      setMetrics(mockMetrics);
      
      normalizeId('12345');
      normalizeId('67890');
      
      expect(mockMetrics.cacheMiss).toHaveBeenCalledTimes(2);
    });

    it('should call validationError hook with error code', () => {
      const mockMetrics: MetricsCollector = {
        validationError: vi.fn(),
      };
      
      setMetrics(mockMetrics);
      
      normalizeId(null);
      normalizeId('abc');
      normalizeId(-5);
      
      expect(mockMetrics.validationError).toHaveBeenCalledTimes(3);
      expect(mockMetrics.validationError).toHaveBeenCalledWith('NULL_OR_UNDEFINED');
      expect(mockMetrics.validationError).toHaveBeenCalledWith('NOT_A_NUMBER');
      expect(mockMetrics.validationError).toHaveBeenCalledWith('NEGATIVE_ID');
    });

    it('should call validationTiming hook with duration', () => {
      const mockMetrics: MetricsCollector = {
        validationTiming: vi.fn(),
      };
      
      setMetrics(mockMetrics);
      
      normalizeId('12345');
      
      expect(mockMetrics.validationTiming).toHaveBeenCalledTimes(1);
      expect(mockMetrics.validationTiming).toHaveBeenCalledWith(expect.any(Number));
      
      const duration = (mockMetrics.validationTiming as any).mock.calls[0][0];
      expect(duration).toBeGreaterThan(0);
    });

    it('should handle partial metrics collector (only some hooks)', () => {
      const mockMetrics: MetricsCollector = {
        cacheHit: vi.fn(),
        // Missing cacheMiss, validationError, validationTiming
      };
      
      setMetrics(mockMetrics);
      
      normalizeId('12345'); // Miss
      normalizeId('12345'); // Hit
      normalizeId(null); // Error
      
      // Should not throw
      expect(mockMetrics.cacheHit).toHaveBeenCalledTimes(1);
    });

    it('should handle empty metrics collector', () => {
      setMetrics({});
      
      // Should not throw
      normalizeId('12345');
      normalizeId('12345');
      normalizeId(null);
      
      const stats = getIdCacheStats();
      expect(stats.totalRequests).toBe(3);
    });

    it('should allow metrics collector replacement', () => {
      const mockMetrics1: MetricsCollector = {
        cacheHit: vi.fn(),
      };
      
      const mockMetrics2: MetricsCollector = {
        cacheHit: vi.fn(),
      };
      
      setMetrics(mockMetrics1);
      normalizeId('12345');
      normalizeId('12345'); // Hit with mockMetrics1
      
      setMetrics(mockMetrics2);
      normalizeId('67890');
      normalizeId('67890'); // Hit with mockMetrics2
      
      expect(mockMetrics1.cacheHit).toHaveBeenCalledTimes(1);
      expect(mockMetrics2.cacheHit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Production Monitoring Scenarios', () => {
    it('should provide comprehensive cache performance metrics', () => {
      // Simulate production traffic
      for (let i = 0; i < 100; i++) {
        normalizeId(String(i % 10)); // 10 unique IDs, repeated 10 times each
      }
      
      const stats = getIdCacheStats();
      expect(stats.totalRequests).toBe(100);
      expect(stats.hits).toBe(90); // First 10 are misses, next 90 are hits
      expect(stats.misses).toBe(10);
      expect(stats.hitRate).toBe(90.0);
      expect(stats.size).toBe(10);
    });

    it('should identify most common validation errors', () => {
      // Simulate common error patterns
      for (let i = 0; i < 50; i++) normalizeId(null);
      for (let i = 0; i < 30; i++) normalizeId('invalid');
      for (let i = 0; i < 20; i++) normalizeId(-1);
      
      const stats = getValidationStats();
      expect(stats.totalErrors).toBe(100);
      expect(stats.errorCounts.NULL_OR_UNDEFINED).toBe(50);
      expect(stats.errorCounts.NOT_A_NUMBER).toBe(30);
      expect(stats.errorCounts.NEGATIVE_ID).toBe(20);
    });

    it('should track performance over time', () => {
      const timings: number[] = [];
      
      const mockMetrics: MetricsCollector = {
        validationTiming: (ns) => timings.push(ns),
      };
      
      setMetrics(mockMetrics);
      
      for (let i = 0; i < 100; i++) {
        normalizeId(String(i));
      }
      
      expect(timings.length).toBe(100);
      expect(Math.min(...timings)).toBeGreaterThan(0);
      expect(Math.max(...timings)).toBeLessThan(1000000); // Less than 1ms
    });
  });
});

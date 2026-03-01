import { describe, it, expect, beforeEach } from 'vitest';
import { 
  setLogger, 
  clearIdCache, 
  getIdCacheStats,
  normalizeId 
} from '../src/index';

describe('Utility functions', () => {
  beforeEach(() => {
    clearIdCache();
  });

  describe('setLogger', () => {
    it('should accept custom logger', () => {
      const warnings: string[] = [];
      const errors: string[] = [];
      
      setLogger({
        warn: (msg) => warnings.push(msg),
        error: (msg) => errors.push(msg),
      });
      
      // Trigger a validation warning
      normalizeId(null);
      
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('[normalizeId]');
    });
  });

  describe('clearIdCache', () => {
    it('should clear the cache', () => {
      // Populate cache
      normalizeId(123);
      normalizeId(456);
      
      let stats = getIdCacheStats();
      expect(stats.size).toBe(2);
      
      // Clear
      clearIdCache();
      
      stats = getIdCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('getIdCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = getIdCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('max');
      expect(stats).toHaveProperty('calculatedSize');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.max).toBe('number');
    });

    it('should show cache size increasing', () => {
      clearIdCache();
      
      let stats = getIdCacheStats();
      expect(stats.size).toBe(0);
      
      normalizeId(123);
      stats = getIdCacheStats();
      expect(stats.size).toBe(1);
      
      normalizeId(456);
      stats = getIdCacheStats();
      expect(stats.size).toBe(2);
    });
  });
});

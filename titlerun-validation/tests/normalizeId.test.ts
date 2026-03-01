import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeId, clearIdCache, VALIDATION_CONSTANTS } from '../src/index';

describe('normalizeId', () => {
  beforeEach(() => {
    clearIdCache();
  });

  describe('Valid inputs', () => {
    it('should accept valid number ID', () => {
      expect(normalizeId(12345)).toBe(12345);
    });

    it('should accept valid string ID', () => {
      expect(normalizeId('12345')).toBe(12345);
    });

    it('should accept zero', () => {
      expect(normalizeId(0)).toBe(0);
      expect(normalizeId('0')).toBe(0);
    });

    it('should accept MAX_SAFE_INTEGER', () => {
      expect(normalizeId(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
      expect(normalizeId(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should trim leading whitespace', () => {
      expect(normalizeId('  123')).toBe(123);
    });

    it('should trim trailing whitespace', () => {
      expect(normalizeId('123  ')).toBe(123);
    });

    it('should trim both leading and trailing whitespace', () => {
      expect(normalizeId('  123  ')).toBe(123);
    });
  });

  describe('Null and undefined', () => {
    it('should reject null', () => {
      expect(normalizeId(null)).toBe(null);
    });

    it('should reject undefined', () => {
      expect(normalizeId(undefined)).toBe(null);
    });

    it('should reject "null" string', () => {
      expect(normalizeId('null')).toBe(null);
    });

    it('should reject "undefined" string', () => {
      expect(normalizeId('undefined')).toBe(null);
    });
  });

  describe('Type validation', () => {
    it('should reject boolean true', () => {
      expect(normalizeId(true)).toBe(null);
    });

    it('should reject boolean false', () => {
      expect(normalizeId(false)).toBe(null);
    });

    it('should reject object', () => {
      expect(normalizeId({})).toBe(null);
      expect(normalizeId({ id: 123 })).toBe(null);
    });

    it('should reject array', () => {
      expect(normalizeId([])).toBe(null);
      expect(normalizeId([123])).toBe(null);
    });

    it('should reject Symbol', () => {
      expect(normalizeId(Symbol('test'))).toBe(null);
      expect(normalizeId(Symbol.for('123'))).toBe(null);
    });

    it('should reject function', () => {
      expect(normalizeId(() => 123)).toBe(null);
    });
  });

  describe('Number validation', () => {
    it('should reject NaN', () => {
      expect(normalizeId(NaN)).toBe(null);
    });

    it('should reject Infinity', () => {
      expect(normalizeId(Infinity)).toBe(null);
    });

    it('should reject -Infinity', () => {
      expect(normalizeId(-Infinity)).toBe(null);
    });

    it('should reject floating point', () => {
      expect(normalizeId(123.45)).toBe(null);
    });

    it('should reject negative numbers', () => {
      expect(normalizeId(-1)).toBe(null);
      expect(normalizeId(-123)).toBe(null);
    });

    it('should reject numbers above MAX_SAFE_INTEGER', () => {
      expect(normalizeId(Number.MAX_SAFE_INTEGER + 1)).toBe(null);
      expect(normalizeId(9007199254740992)).toBe(null);
    });
  });

  describe('String validation', () => {
    it('should reject empty string', () => {
      expect(normalizeId('')).toBe(null);
    });

    it('should reject whitespace-only string', () => {
      expect(normalizeId('   ')).toBe(null);
      expect(normalizeId('\t')).toBe(null);
      expect(normalizeId('\n')).toBe(null);
    });

    it('should reject non-numeric string', () => {
      expect(normalizeId('abc')).toBe(null);
      expect(normalizeId('12abc')).toBe(null);
    });

    it('should reject floating point string', () => {
      expect(normalizeId('123.45')).toBe(null);
    });

    it('should reject negative string', () => {
      expect(normalizeId('-123')).toBe(null);
    });

    it('should reject scientific notation', () => {
      expect(normalizeId('1e5')).toBe(null); // Would parse to 100000, but we reject it
    });

    it('should reject string longer than 16 chars (precision loss)', () => {
      expect(normalizeId('12345678901234567')).toBe(null);
    });
  });

  describe('Security: Unicode attacks', () => {
    it('should reject zero-width space (\\u200B)', () => {
      expect(normalizeId('123\u200B')).toBe(null);
      expect(normalizeId('\u200B123')).toBe(null);
    });

    it('should reject zero-width non-joiner (\\u200C)', () => {
      expect(normalizeId('123\u200C')).toBe(null);
    });

    it('should reject zero-width joiner (\\u200D)', () => {
      expect(normalizeId('123\u200D')).toBe(null);
    });

    it('should reject zero-width no-break space (\\uFEFF)', () => {
      expect(normalizeId('123\uFEFF')).toBe(null);
    });

    it('should reject Mongolian vowel separator (\\u180E)', () => {
      expect(normalizeId('123\u180E')).toBe(null);
    });

    it('should reject word joiner (\\u2060)', () => {
      expect(normalizeId('123\u2060')).toBe(null);
    });

    it('should reject full-width digits (０-９)', () => {
      expect(normalizeId('１２３')).toBe(null); // Full-width 123
    });

    it('should reject circled digits (①-⑳)', () => {
      expect(normalizeId('①②③')).toBe(null);
    });

    it('should reject mixed ASCII + full-width', () => {
      expect(normalizeId('12３')).toBe(null); // 12 + full-width 3
    });
  });

  describe('Security: HTML injection', () => {
    it('should reject string with < character', () => {
      expect(normalizeId('<123')).toBe(null);
    });

    it('should reject string with > character', () => {
      expect(normalizeId('123>')).toBe(null);
    });

    it('should reject string with <script> tag', () => {
      expect(normalizeId('<script>alert(1)</script>')).toBe(null);
    });

    it('should reject string with HTML tag', () => {
      expect(normalizeId('<img src=x onerror=alert(1)>')).toBe(null);
    });
  });

  describe('Caching behavior', () => {
    it('should cache valid results', () => {
      const result1 = normalizeId('12345');
      const result2 = normalizeId('12345'); // Should hit cache
      expect(result1).toBe(result2);
      expect(result1).toBe(12345);
    });

    it('should cache invalid results', () => {
      const result1 = normalizeId('invalid');
      const result2 = normalizeId('invalid'); // Should hit cache
      expect(result1).toBe(null);
      expect(result2).toBe(null);
    });

    it('should cache number inputs', () => {
      const result1 = normalizeId(123);
      const result2 = normalizeId(123);
      expect(result1).toBe(result2);
      expect(result1).toBe(123);
    });

    it('should treat "123" and 123 as different cache keys', () => {
      const stringResult = normalizeId('123');
      const numberResult = normalizeId(123);
      expect(stringResult).toBe(123);
      expect(numberResult).toBe(123);
      // Both should work but are cached separately
    });
  });

  describe('Edge cases', () => {
    it('should handle very large valid IDs', () => {
      const largeId = 9007199254740991; // MAX_SAFE_INTEGER
      expect(normalizeId(largeId)).toBe(largeId);
    });

    it('should handle ID exactly at MAX_SAFE_INTEGER', () => {
      expect(normalizeId(VALIDATION_CONSTANTS.MAX_SAFE_ID)).toBe(VALIDATION_CONSTANTS.MAX_SAFE_ID);
    });

    it('should reject ID one above MAX_SAFE_INTEGER', () => {
      expect(normalizeId(VALIDATION_CONSTANTS.MAX_SAFE_ID + 1)).toBe(null);
    });

    it('should handle repeated calls with same input', () => {
      for (let i = 0; i < 100; i++) {
        expect(normalizeId(12345)).toBe(12345);
      }
    });

    it('should handle leading zeros in strings', () => {
      expect(normalizeId('00123')).toBe(123);
      expect(normalizeId('000')).toBe(0);
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { idMatch, clearIdCache } from '../src/index';

describe('idMatch', () => {
  beforeEach(() => {
    clearIdCache();
  });

  describe('Basic matching', () => {
    it('should match identical number IDs', () => {
      expect(idMatch(123, 123)).toBe(true);
    });

    it('should match identical string IDs', () => {
      expect(idMatch('123', '123')).toBe(true);
    });

    it('should match number and string representations', () => {
      expect(idMatch(123, '123')).toBe(true);
      expect(idMatch('123', 123)).toBe(true);
    });

    it('should match zero in different forms', () => {
      expect(idMatch(0, 0)).toBe(true);
      expect(idMatch(0, '0')).toBe(true);
      expect(idMatch('0', 0)).toBe(true);
    });

    it('should match large IDs', () => {
      const largeId = 9007199254740991; // MAX_SAFE_INTEGER
      expect(idMatch(largeId, largeId)).toBe(true);
      expect(idMatch(largeId, String(largeId))).toBe(true);
    });
  });

  describe('Non-matching valid IDs', () => {
    it('should not match different numbers', () => {
      expect(idMatch(123, 456)).toBe(false);
    });

    it('should not match different strings', () => {
      expect(idMatch('123', '456')).toBe(false);
    });

    it('should not match number and different string', () => {
      expect(idMatch(123, '456')).toBe(false);
    });
  });

  describe('CRITICAL: Null handling (BUG #2 fix)', () => {
    it('should NOT match null with null', () => {
      expect(idMatch(null, null)).toBe(false);
    });

    it('should NOT match undefined with undefined', () => {
      expect(idMatch(undefined, undefined)).toBe(false);
    });

    it('should NOT match null with undefined', () => {
      expect(idMatch(null, undefined)).toBe(false);
    });

    it('should NOT match valid ID with null', () => {
      expect(idMatch(123, null)).toBe(false);
      expect(idMatch(null, 123)).toBe(false);
    });

    it('should NOT match valid ID with undefined', () => {
      expect(idMatch(123, undefined)).toBe(false);
      expect(idMatch(undefined, 123)).toBe(false);
    });

    it('should NOT match "null" string with null', () => {
      expect(idMatch('null', null)).toBe(false);
    });

    it('should NOT match "undefined" string with undefined', () => {
      expect(idMatch('undefined', undefined)).toBe(false);
    });
  });

  describe('Invalid inputs', () => {
    it('should return false for both invalid', () => {
      expect(idMatch('abc', 'def')).toBe(false);
    });

    it('should return false for one valid, one invalid', () => {
      expect(idMatch(123, 'abc')).toBe(false);
      expect(idMatch('abc', 123)).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(idMatch(-123, -123)).toBe(false); // Both invalid
      expect(idMatch(-123, 123)).toBe(false);
    });

    it('should return false for floats', () => {
      expect(idMatch(123.45, 123.45)).toBe(false); // Both invalid
    });

    it('should return false for NaN', () => {
      expect(idMatch(NaN, NaN)).toBe(false);
    });

    it('should return false for Infinity', () => {
      expect(idMatch(Infinity, Infinity)).toBe(false);
    });

    it('should return false for symbols', () => {
      const sym = Symbol('test');
      expect(idMatch(sym, sym)).toBe(false);
    });

    it('should return false for objects', () => {
      expect(idMatch({}, {})).toBe(false);
      expect(idMatch({ id: 123 }, { id: 123 })).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(idMatch([123], [123])).toBe(false);
    });
  });

  describe('Whitespace handling', () => {
    it('should match after trimming leading spaces', () => {
      expect(idMatch('  123', '123')).toBe(true);
    });

    it('should match after trimming trailing spaces', () => {
      expect(idMatch('123  ', '123')).toBe(true);
    });

    it('should match after trimming both sides', () => {
      expect(idMatch('  123  ', '123')).toBe(true);
    });

    it('should match two trimmed strings', () => {
      expect(idMatch('  123  ', '  123  ')).toBe(true);
    });

    it('should NOT match whitespace-only strings', () => {
      expect(idMatch('   ', '   ')).toBe(false); // Both invalid
    });
  });

  describe('Security: Unicode attacks', () => {
    it('should NOT match IDs with invisible Unicode', () => {
      expect(idMatch('123\u200B', '123')).toBe(false); // First is invalid
    });

    it('should NOT match two invalid Unicode IDs', () => {
      expect(idMatch('123\u200B', '123\u200B')).toBe(false); // Both invalid
    });

    it('should NOT match full-width digits', () => {
      expect(idMatch('１２３', '123')).toBe(false); // First is invalid
    });
  });

  describe('Security: HTML injection', () => {
    it('should NOT match IDs with HTML tags', () => {
      expect(idMatch('<script>123</script>', '123')).toBe(false);
    });

    it('should NOT match two HTML-containing inputs', () => {
      expect(idMatch('<123>', '<123>')).toBe(false); // Both invalid
    });
  });

  describe('Edge cases', () => {
    it('should handle string with leading zeros', () => {
      expect(idMatch('00123', '123')).toBe(true);
      expect(idMatch('00123', 123)).toBe(true);
    });

    it('should handle zero in multiple forms', () => {
      expect(idMatch(0, '0')).toBe(true);
      expect(idMatch('0', '00')).toBe(true);
      expect(idMatch('000', 0)).toBe(true);
    });

    it('should handle repeated calls', () => {
      for (let i = 0; i < 100; i++) {
        expect(idMatch(12345, 12345)).toBe(true);
      }
    });

    it('should be symmetric', () => {
      expect(idMatch(123, '456')).toBe(idMatch('456', 123));
      expect(idMatch(123, 456)).toBe(idMatch(456, 123));
      expect(idMatch('123', '456')).toBe(idMatch('456', '123'));
    });
  });
});

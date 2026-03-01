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

    it('should accept scientific notation if result is valid integer', () => {
      expect(normalizeId('1e5')).toBe(100000); // Parses to 100000 (valid integer)
      expect(normalizeId('1e3')).toBe(1000);
      expect(normalizeId('1.5e2')).toBe(150); // Parses to 150 (valid integer)
    });

    it('should reject string longer than 16 chars (precision loss)', () => {
      expect(normalizeId('12345678901234567')).toBe(null);
    });

    it('should reject string representation of number above MAX_SAFE_INTEGER', () => {
      expect(normalizeId('9007199254740992')).toBe(null); // MAX_SAFE_INTEGER + 1
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

    it('should reject right-to-left override (\\u202E)', () => {
      expect(normalizeId('123\u202E')).toBe(null);
      expect(normalizeId('\u202E123')).toBe(null);
    });

    it('should reject left-to-right override (\\u202D)', () => {
      expect(normalizeId('123\u202D')).toBe(null);
    });

    it('should reject non-breaking space (\\u00A0)', () => {
      expect(normalizeId('123\u00A0')).toBe(null);
      expect(normalizeId('\u00A0123')).toBe(null);
    });

    it('should reject right-to-left embedding (\\u202B)', () => {
      expect(normalizeId('123\u202B')).toBe(null);
    });

    it('should reject left-to-right embedding (\\u202A)', () => {
      expect(normalizeId('123\u202A')).toBe(null);
    });

    it('should reject bidirectional isolates (\\u2066-\\u2069)', () => {
      expect(normalizeId('123\u2066')).toBe(null);
      expect(normalizeId('123\u2067')).toBe(null);
      expect(normalizeId('123\u2068')).toBe(null);
      expect(normalizeId('123\u2069')).toBe(null);
    });

    it('should reject combining grapheme joiner (\\u034F)', () => {
      expect(normalizeId('123\u034F')).toBe(null);
    });

    it('should reject Arabic letter mark (\\u061C)', () => {
      expect(normalizeId('123\u061C')).toBe(null);
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

    it('should NOT cache invalid results (fail fast)', () => {
      const result1 = normalizeId('invalid');
      const result2 = normalizeId('invalid'); // Should re-validate (not cached)
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

    // NEW: Number.MIN_VALUE edge case (it's a float, should reject)
    it('should reject Number.MIN_VALUE (smallest positive float)', () => {
      // Number.MIN_VALUE = 5e-324 (not an integer)
      expect(normalizeId(Number.MIN_VALUE)).toBe(null);
    });

    // NEW: -0 vs +0 behavior (both normalized to -0 due to MIN_SAFE_ID comparison)
    it('should normalize -0 to +0 (prevents cache collision)', () => {
      // JavaScript quirk: String(-0) === String(+0) === "0"
      // This causes cache collision if -0 and +0 aren't normalized
      const resultNegativeZero = normalizeId(-0);
      const resultPositiveZero = normalizeId(+0);
      
      // Both are valid IDs
      expect(resultNegativeZero).not.toBe(null);
      expect(resultPositiveZero).not.toBe(null);
      
      // Both are equal with === (because -0 === +0 in JavaScript)
      expect(resultNegativeZero === 0).toBe(true);
      expect(resultPositiveZero === 0).toBe(true);
      
      // Both are normalized to +0 (NOT -0) to prevent cache bugs
      expect(Object.is(resultNegativeZero, 0)).toBe(true);
      expect(Object.is(resultPositiveZero, 0)).toBe(true);
    });

    // NEW: Very long valid ID strings (near precision limit)
    it('should handle 15-character ID strings (safe)', () => {
      // 15 digits is safe (< 16 char limit)
      expect(normalizeId('123456789012345')).toBe(123456789012345);
    });

    it('should handle 16-character ID strings at boundary', () => {
      // 16 digits is at the boundary - depends on the value
      // MAX_SAFE_INTEGER is 9007199254740991 (16 digits)
      expect(normalizeId('9007199254740991')).toBe(9007199254740991);
      
      // But a different 16-digit number might exceed MAX_SAFE_INTEGER
      expect(normalizeId('9999999999999999')).toBe(null); // Above MAX_SAFE_INTEGER
    });

    it('should reject 17+ character ID strings (precision loss)', () => {
      expect(normalizeId('12345678901234567')).toBe(null); // 17 chars
      expect(normalizeId('123456789012345678')).toBe(null); // 18 chars
    });

    // NEW: Large scientific notation
    it('should handle large scientific notation (if result is valid integer)', () => {
      expect(normalizeId('1e20')).toBe(null); // 1e20 > MAX_SAFE_INTEGER
      expect(normalizeId('1e100')).toBe(null); // Way above MAX_SAFE_INTEGER
      expect(normalizeId('1e15')).toBe(1000000000000000); // Valid (1 quadrillion)
    });

    // NEW: Small scientific notation (should reject floats)
    it('should reject small scientific notation that produces floats', () => {
      expect(normalizeId('1e-5')).toBe(null); // 0.00001 (not an integer)
      expect(normalizeId('1e-1')).toBe(null); // 0.1 (not an integer)
      expect(normalizeId('5e-10')).toBe(null); // 0.0000000005 (not an integer)
    });

    // NEW: Object.create(null) - null prototype object
    it('should reject Object.create(null)', () => {
      const nullProtoObj = Object.create(null);
      expect(normalizeId(nullProtoObj)).toBe(null);
    });

    it('should reject Object.create(null) with numeric property', () => {
      const nullProtoObj = Object.create(null);
      nullProtoObj.id = 123;
      expect(normalizeId(nullProtoObj)).toBe(null);
    });
  });

  describe('Symbol.toPrimitive edge cases', () => {
    // NEW: Verify Symbol.toPrimitive doesn't execute side effects
    it('should not execute Symbol.toPrimitive side effects', () => {
      let sideEffectExecuted = false;
      
      const obj = {
        [Symbol.toPrimitive]() {
          sideEffectExecuted = true;
          return 123;
        }
      };
      
      // normalizeId should reject based on typeof check BEFORE coercion
      const result = normalizeId(obj);
      
      expect(result).toBe(null); // Should reject objects
      expect(sideEffectExecuted).toBe(false); // Side effect should NOT run
    });

    it('should not call valueOf on objects', () => {
      let valueOfCalled = false;
      
      const obj = {
        valueOf() {
          valueOfCalled = true;
          return 123;
        }
      };
      
      const result = normalizeId(obj);
      
      expect(result).toBe(null);
      expect(valueOfCalled).toBe(false); // valueOf should NOT be called
    });

    it('should not call toString on objects', () => {
      let toStringCalled = false;
      
      const obj = {
        toString() {
          toStringCalled = true;
          return '123';
        }
      };
      
      const result = normalizeId(obj);
      
      expect(result).toBe(null);
      expect(toStringCalled).toBe(false); // toString should NOT be called
    });
  });
});

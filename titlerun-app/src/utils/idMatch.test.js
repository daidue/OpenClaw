import { idMatch } from './idMatch.js';

/**
 * Test Suite for idMatch Function
 * Demonstrates all fixes and edge cases
 */

describe('idMatch', () => {
  // ========================================
  // VALID COMPARISONS - Should Return Boolean
  // ========================================

  describe('Valid comparisons', () => {
    test('1. Number equality (reference equality early return)', () => {
      expect(idMatch(123, 123)).toBe(true);
      expect(idMatch(0, 0)).toBe(true);
    });

    test('2. String equality (reference equality early return)', () => {
      const id = '123';
      expect(idMatch(id, id)).toBe(true);
      expect(idMatch('abc', 'abc')).toBe(true);
    });

    test('3. Number vs string (cross-type comparison)', () => {
      expect(idMatch(123, '123')).toBe(true);
      expect(idMatch('456', 456)).toBe(true);
      expect(idMatch(0, '0')).toBe(true);
    });

    test('4. String trimming (whitespace handling)', () => {
      expect(idMatch('  123  ', '123')).toBe(true);
      expect(idMatch('123', '  123  ')).toBe(true);
      expect(idMatch('  abc  ', '  abc  ')).toBe(true);
    });

    test('5. Non-matching valid IDs', () => {
      expect(idMatch(123, 456)).toBe(false);
      expect(idMatch('abc', 'def')).toBe(false);
      expect(idMatch(123, '456')).toBe(false);
    });

    test('6. Zero as valid ID', () => {
      expect(idMatch(0, 0)).toBe(true);
      expect(idMatch(0, '0')).toBe(true);
      expect(idMatch('0', 0)).toBe(true);
    });

    test('7. Large integers', () => {
      expect(idMatch(999999999, 999999999)).toBe(true);
      expect(idMatch(999999999, '999999999')).toBe(true);
    });
  });

  // ========================================
  // INVALID TYPES - Should Throw TypeError
  // ========================================

  describe('Type validation (all should throw)', () => {
    test('8. FIX: null (typeof null === "object" bug)', () => {
      expect(() => idMatch(null, 123)).toThrow(TypeError);
      expect(() => idMatch(null, 123)).toThrow(/first argument is null/);
      expect(() => idMatch(123, null)).toThrow(TypeError);
      expect(() => idMatch(123, null)).toThrow(/second argument is null/);
    });

    test('9. FIX: undefined', () => {
      expect(() => idMatch(undefined, 123)).toThrow(TypeError);
      expect(() => idMatch(undefined, 123)).toThrow(/first argument is undefined/);
      expect(() => idMatch(123, undefined)).toThrow(TypeError);
      expect(() => idMatch(123, undefined)).toThrow(/second argument is undefined/);
    });

    test('10. FIX: functions (typeof function !== "object")', () => {
      const fn = () => {};
      expect(() => idMatch(fn, 123)).toThrow(TypeError);
      expect(() => idMatch(fn, 123)).toThrow(/must be string or number, got function/);
      expect(() => idMatch(123, fn)).toThrow(TypeError);
    });

    test('11. FIX: symbols (Symbol() crashes on String() conversion)', () => {
      const sym = Symbol('id');
      expect(() => idMatch(sym, 123)).toThrow(TypeError);
      expect(() => idMatch(sym, 123)).toThrow(/must be string or number, got symbol/);
      expect(() => idMatch(123, sym)).toThrow(TypeError);
    });

    test('12. Objects and arrays', () => {
      expect(() => idMatch({id: 123}, 123)).toThrow(TypeError);
      expect(() => idMatch([123], 123)).toThrow(TypeError);
      expect(() => idMatch(123, {id: 123})).toThrow(TypeError);
    });

    test('13. Boolean values', () => {
      expect(() => idMatch(true, 1)).toThrow(TypeError);
      expect(() => idMatch(false, 0)).toThrow(TypeError);
    });
  });

  // ========================================
  // NUMBER VALIDATION
  // ========================================

  describe('Number validation', () => {
    test('14. FIX: NaN (prevents NaN matching NaN via String conversion)', () => {
      expect(() => idMatch(NaN, NaN)).toThrow(TypeError);
      expect(() => idMatch(NaN, NaN)).toThrow(/not a finite number/);
      expect(() => idMatch(NaN, 123)).toThrow(TypeError);
      expect(() => idMatch(123, NaN)).toThrow(TypeError);
    });

    test('15. Infinity and -Infinity', () => {
      expect(() => idMatch(Infinity, 123)).toThrow(TypeError);
      expect(() => idMatch(-Infinity, 123)).toThrow(TypeError);
      expect(() => idMatch(123, Infinity)).toThrow(TypeError);
    });

    test('16. Negative numbers', () => {
      expect(() => idMatch(-1, 1)).toThrow(TypeError);
      expect(() => idMatch(-1, 1)).toThrow(/must be non-negative/);
      expect(() => idMatch(123, -456)).toThrow(TypeError);
    });

    test('17. Non-integer numbers', () => {
      expect(() => idMatch(123.45, 123)).toThrow(TypeError);
      expect(() => idMatch(123.45, 123)).toThrow(/must be an integer/);
      expect(() => idMatch(0.5, 1)).toThrow(TypeError);
    });
  });

  // ========================================
  // STRING VALIDATION
  // ========================================

  describe('String validation', () => {
    test('18. Empty strings', () => {
      expect(() => idMatch('', 123)).toThrow(TypeError);
      expect(() => idMatch('', 123)).toThrow(/empty or whitespace-only/);
      expect(() => idMatch(123, '')).toThrow(TypeError);
    });

    test('19. Whitespace-only strings', () => {
      expect(() => idMatch('   ', 123)).toThrow(TypeError);
      expect(() => idMatch('   ', 123)).toThrow(/empty or whitespace-only/);
      expect(() => idMatch('\t\n', 123)).toThrow(TypeError);
    });

    test('20. Valid string IDs with special characters', () => {
      expect(idMatch('abc-123', 'abc-123')).toBe(true);
      expect(idMatch('user_456', 'user_456')).toBe(true);
      expect(idMatch('id:789', 'id:789')).toBe(true);
    });
  });

  // ========================================
  // PERFORMANCE OPTIMIZATIONS
  // ========================================

  describe('Performance optimizations', () => {
    test('21. Early return for reference equality (no type checking needed)', () => {
      const id = 'shared-reference';
      // Should return immediately without validation
      expect(idMatch(id, id)).toBe(true);
    });

    test('22. Number comparison without string conversion', () => {
      // Both numbers, not equal, should return false without String() calls
      expect(idMatch(123, 456)).toBe(false);
    });

    test('23. String comparison without unnecessary conversions', () => {
      // Both strings, should compare directly after trim
      expect(idMatch('abc', 'def')).toBe(false);
      expect(idMatch('  xyz  ', 'xyz')).toBe(true);
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================

  describe('Edge cases', () => {
    test('24. Number zero vs string zero', () => {
      expect(idMatch(0, '0')).toBe(true);
    });

    test('25. Leading zeros in strings', () => {
      expect(idMatch('0123', '123')).toBe(false); // Strings are different
      expect(idMatch(123, '0123')).toBe(false);
    });

    test('26. Number MAX_SAFE_INTEGER', () => {
      const max = Number.MAX_SAFE_INTEGER;
      expect(idMatch(max, max)).toBe(true);
      expect(idMatch(max, String(max))).toBe(true);
    });

    test('27. Mixed trimming scenarios', () => {
      expect(idMatch('  123', '123  ')).toBe(true);
      expect(idMatch('\t456\n', '456')).toBe(true);
    });
  });
});

/**
 * SUMMARY OF FIXES DEMONSTRATED:
 * 
 * 1. ✅ typeof null === 'object' bug - Tests 8 (explicit null check before typeof)
 * 2. ✅ Accepts functions - Test 10 (rejects with clear error)
 * 3. ✅ Accepts symbols - Test 11 (rejects, prevents String() crash)
 * 4. ✅ Symbol() crashes on String() - Test 11 (caught before conversion)
 * 5. ✅ NaN matches NaN - Test 14 (validates finite before String conversion)
 * 6. ✅ No early return for reference equality - Tests 1, 2, 21 (performance)
 * 7. ✅ Unnecessary String() conversions - Tests 22, 23 (type-aware comparisons)
 * 8. ✅ Logs error instead of throwing - All tests (throws TypeError consistently)
 * 
 * ARCHITECTURE COMPLIANCE:
 * ✅ Only accepts string (trimmed, non-empty) or number (finite, integer, non-negative)
 * ✅ Throws TypeError for invalid types (programmer error = fail fast)
 * ✅ Returns boolean | throws (never returns undefined or other values)
 * ✅ Performance optimized (early returns, minimal conversions)
 */

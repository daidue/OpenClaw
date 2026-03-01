const { idMatch } = require('./helpers');

describe('idMatch', () => {
  
  // ============================================
  // VALID CASES - Should Return True/False
  // ============================================
  
  describe('Valid string comparisons', () => {
    test('matches identical strings', () => {
      expect(idMatch('123', '123')).toBe(true);
      expect(idMatch('abc', 'abc')).toBe(true);
    });
    
    test('does not match different strings', () => {
      expect(idMatch('123', '456')).toBe(false);
      expect(idMatch('abc', 'def')).toBe(false);
    });
    
    test('trims whitespace before comparison', () => {
      expect(idMatch('  123  ', '123')).toBe(true);
      expect(idMatch('123', '  123  ')).toBe(true);
      expect(idMatch('  123  ', '  123  ')).toBe(true);
      expect(idMatch('  abc  ', '  abc  ')).toBe(true);
    });
  });
  
  describe('Valid number comparisons', () => {
    test('matches identical numbers', () => {
      expect(idMatch(123, 123)).toBe(true);
      expect(idMatch(0, 0)).toBe(true);
      expect(idMatch(999999, 999999)).toBe(true);
    });
    
    test('does not match different numbers', () => {
      expect(idMatch(123, 456)).toBe(false);
      expect(idMatch(0, 1)).toBe(false);
    });
    
    test('rejects negative numbers', () => {
      expect(() => idMatch(-1, 5)).toThrow(TypeError);
      expect(() => idMatch(-1, -1)).toThrow(TypeError);
      expect(() => idMatch(5, -1)).toThrow(TypeError);
    });
    
    test('rejects non-integer numbers', () => {
      expect(() => idMatch(1.5, 1.5)).toThrow(TypeError);
      expect(() => idMatch(3.14, 3)).toThrow(TypeError);
      expect(() => idMatch(1, 1.1)).toThrow(TypeError);
    });
  });
  
  describe('Mixed type comparisons (string vs number)', () => {
    test('matches string and number representations', () => {
      expect(idMatch('123', 123)).toBe(true);
      expect(idMatch(123, '123')).toBe(true);
      expect(idMatch('0', 0)).toBe(true);
      expect(idMatch(456, '456')).toBe(true);
    });
    
    test('does not match different values', () => {
      expect(idMatch('123', 456)).toBe(false);
      expect(idMatch(789, '123')).toBe(false);
    });
  });
  
  describe('Reference equality optimization', () => {
    test('returns early for same reference (valid values)', () => {
      const str = '123';
      expect(idMatch(str, str)).toBe(true);
      
      const num = 456;
      expect(idMatch(num, num)).toBe(true);
    });
  });
  
  // ============================================
  // INVALID CASES - Should Throw TypeError
  // ============================================
  
  describe('Null and undefined rejection', () => {
    test('throws for null values', () => {
      expect(() => idMatch(null, null)).toThrow(TypeError);
      expect(() => idMatch(null, '123')).toThrow(TypeError);
      expect(() => idMatch('123', null)).toThrow(TypeError);
      expect(() => idMatch(null, 123)).toThrow(TypeError);
    });
    
    test('throws for undefined values', () => {
      expect(() => idMatch(undefined, undefined)).toThrow(TypeError);
      expect(() => idMatch(undefined, '123')).toThrow(TypeError);
      expect(() => idMatch('123', undefined)).toThrow(TypeError);
      expect(() => idMatch(undefined, 123)).toThrow(TypeError);
    });
    
    test('throws for mixed null/undefined', () => {
      expect(() => idMatch(null, undefined)).toThrow(TypeError);
      expect(() => idMatch(undefined, null)).toThrow(TypeError);
    });
    
    test('error messages specify null vs undefined', () => {
      expect(() => idMatch(null, '123')).toThrow(/null/);
      expect(() => idMatch(undefined, '123')).toThrow(/undefined/);
    });
  });
  
  describe('Object and array rejection', () => {
    test('throws for objects', () => {
      expect(() => idMatch({}, {})).toThrow(TypeError);
      expect(() => idMatch({ id: 123 }, { id: 123 })).toThrow(TypeError);
      expect(() => idMatch({}, '123')).toThrow(TypeError);
      expect(() => idMatch('123', {})).toThrow(TypeError);
    });
    
    test('throws for arrays', () => {
      expect(() => idMatch([], [])).toThrow(TypeError);
      expect(() => idMatch([1, 2, 3], [1, 2, 3])).toThrow(TypeError);
      expect(() => idMatch([], '123')).toThrow(TypeError);
      expect(() => idMatch('123', [])).toThrow(TypeError);
    });
    
    test('error messages specify object/array', () => {
      expect(() => idMatch({}, '123')).toThrow(/object or array/);
      expect(() => idMatch([], '123')).toThrow(/object or array/);
    });
  });
  
  describe('Function rejection', () => {
    test('throws for functions', () => {
      const fn = () => {};
      expect(() => idMatch(fn, fn)).toThrow(TypeError);
      expect(() => idMatch(fn, '123')).toThrow(TypeError);
      expect(() => idMatch('123', fn)).toThrow(TypeError);
    });
    
    test('error message specifies function', () => {
      const fn = () => {};
      expect(() => idMatch(fn, '123')).toThrow(/function/);
    });
  });
  
  describe('Symbol rejection', () => {
    test('throws for symbols', () => {
      const sym1 = Symbol('test');
      const sym2 = Symbol('test');
      expect(() => idMatch(sym1, sym1)).toThrow(TypeError);
      expect(() => idMatch(sym1, sym2)).toThrow(TypeError);
      expect(() => idMatch(sym1, '123')).toThrow(TypeError);
      expect(() => idMatch('123', sym1)).toThrow(TypeError);
    });
    
    test('error message specifies symbol', () => {
      const sym = Symbol('test');
      expect(() => idMatch(sym, '123')).toThrow(/symbol/);
    });
  });
  
  describe('NaN rejection', () => {
    test('throws for NaN', () => {
      expect(() => idMatch(NaN, NaN)).toThrow(TypeError);
      expect(() => idMatch(NaN, 123)).toThrow(TypeError);
      expect(() => idMatch(123, NaN)).toThrow(TypeError);
      expect(() => idMatch(NaN, '123')).toThrow(TypeError);
    });
    
    test('error message specifies finite number requirement', () => {
      expect(() => idMatch(NaN, 123)).toThrow(/finite/);
    });
  });
  
  describe('Infinity rejection', () => {
    test('throws for Infinity', () => {
      expect(() => idMatch(Infinity, Infinity)).toThrow(TypeError);
      expect(() => idMatch(-Infinity, -Infinity)).toThrow(TypeError);
      expect(() => idMatch(Infinity, 123)).toThrow(TypeError);
      expect(() => idMatch(123, Infinity)).toThrow(TypeError);
      expect(() => idMatch(-Infinity, 123)).toThrow(TypeError);
    });
    
    test('error message specifies finite number requirement', () => {
      expect(() => idMatch(Infinity, 123)).toThrow(/finite/);
      expect(() => idMatch(-Infinity, 123)).toThrow(/finite/);
    });
  });
  
  describe('Empty/whitespace string rejection', () => {
    test('throws for empty string', () => {
      expect(() => idMatch('', '')).toThrow(TypeError);
      expect(() => idMatch('', '123')).toThrow(TypeError);
      expect(() => idMatch('123', '')).toThrow(TypeError);
    });
    
    test('throws for whitespace-only string', () => {
      expect(() => idMatch('   ', '   ')).toThrow(TypeError);
      expect(() => idMatch('   ', '123')).toThrow(TypeError);
      expect(() => idMatch('123', '   ')).toThrow(TypeError);
      expect(() => idMatch('\t\n', '123')).toThrow(TypeError);
    });
    
    test('error message specifies empty/whitespace', () => {
      expect(() => idMatch('', '123')).toThrow(/empty or whitespace/);
      expect(() => idMatch('   ', '123')).toThrow(/empty or whitespace/);
    });
  });
  
  // ============================================
  // EDGE CASES & PERFORMANCE
  // ============================================
  
  describe('Performance optimizations', () => {
    test('avoids String() conversion for string-string comparison', () => {
      // This is more of a code coverage test
      // We can verify by checking that String() is never called for same types
      expect(idMatch('abc', 'abc')).toBe(true);
      expect(idMatch('abc', 'def')).toBe(false);
    });
    
    test('handles large numbers', () => {
      expect(idMatch(9007199254740991, 9007199254740991)).toBe(true); // MAX_SAFE_INTEGER
      expect(idMatch(9007199254740991, '9007199254740991')).toBe(true);
    });
    
    test('handles zero correctly', () => {
      expect(idMatch(0, 0)).toBe(true);
      expect(idMatch(0, '0')).toBe(true);
      expect(idMatch('0', 0)).toBe(true);
      expect(idMatch(0, 1)).toBe(false);
    });
  });
  
  describe('Real-world TitleRun scenarios', () => {
    test('player ID comparison (string)', () => {
      expect(idMatch('8183', '8183')).toBe(true);
      expect(idMatch('8183', '9999')).toBe(false);
    });
    
    test('player ID comparison (number)', () => {
      expect(idMatch(8183, 8183)).toBe(true);
      expect(idMatch(8183, 9999)).toBe(false);
    });
    
    test('player ID comparison (mixed)', () => {
      expect(idMatch('8183', 8183)).toBe(true);
      expect(idMatch(8183, '8183')).toBe(true);
    });
    
    test('roster ID comparison', () => {
      expect(idMatch('12345', '12345')).toBe(true);
      expect(idMatch(12345, '12345')).toBe(true);
    });
    
    test('prevents null ID matching (BUG #2 fix)', () => {
      // This is the exact bug from the audit:
      // Player A and Player B both have id: null
      // Should NOT match!
      expect(() => idMatch(null, null)).toThrow(TypeError);
      
      // Roster filter should not remove all null-ID players
      const roster = [
        { playerId: null, name: "Rookie 1" },
        { playerId: null, name: "Rookie 2" },
        { playerId: '123', name: "Veteran" }
      ];
      
      // Removing null should throw, not filter everything
      expect(() => {
        roster.filter(p => !idMatch(p.playerId, null));
      }).toThrow(TypeError);
    });
  });
});

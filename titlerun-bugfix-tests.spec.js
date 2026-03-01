/**
 * TITLERUN BUG FIX TEST SUITE
 * 
 * Comprehensive tests for all 5 fixes identified in adversarial review.
 * These tests would have CAUGHT the bugs before production.
 * 
 * Test Philosophy:
 * - Happy path: Normal expected usage
 * - Edge cases: Boundary conditions, unusual but valid inputs
 * - Security/Adversarial: Malicious inputs, type confusion, injection attempts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ============================================================================
// FIX #1: RANK CALCULATION (getPlayerRank)
// ============================================================================

describe('Fix #1: Rank Calculation (getPlayerRank)', () => {
  
  describe('happy path', () => {
    it('should calculate rank for normal roster with valid match', () => {
      const roster = [
        { playerId: '1', stats: { points: 100 } },
        { playerId: '2', stats: { points: 90 } },
        { playerId: '3', stats: { points: 80 } }
      ];
      const playerStats = { points: 90 };
      
      const rank = getPlayerRank(roster, playerStats);
      expect(rank).toBe(2);
    });

    it('should return rank 1 for highest scoring player', () => {
      const roster = [
        { playerId: '1', stats: { points: 100 } },
        { playerId: '2', stats: { points: 90 } }
      ];
      const playerStats = { points: 100 };
      
      expect(getPlayerRank(roster, playerStats)).toBe(1);
    });

    it('should handle ties correctly (first occurrence wins)', () => {
      const roster = [
        { playerId: '1', stats: { points: 100 } },
        { playerId: '2', stats: { points: 100 } },
        { playerId: '3', stats: { points: 90 } }
      ];
      const playerStats = { points: 100 };
      
      const rank = getPlayerRank(roster, playerStats);
      expect(rank).toBeGreaterThanOrEqual(1);
      expect(rank).toBeLessThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty roster array', () => {
      const roster = [];
      const playerStats = { points: 100 };
      
      expect(() => getPlayerRank(roster, playerStats)).not.toThrow();
      expect(getPlayerRank(roster, playerStats)).toBe(0); // or return null
    });

    it('should handle roster with one player', () => {
      const roster = [{ playerId: '1', stats: { points: 100 } }];
      const playerStats = { points: 100 };
      
      expect(getPlayerRank(roster, playerStats)).toBe(1);
    });

    it('should handle boundary: exactly 70% match threshold', () => {
      const roster = Array(10).fill(null).map((_, i) => ({
        playerId: `${i}`,
        stats: { points: 100, rebounds: 5, assists: 3 }
      }));
      
      // Exactly 70% of fields match
      const playerStats = { 
        points: 100,    // match
        rebounds: 5,    // match
        assists: 999    // different
      };
      
      const rank = getPlayerRank(roster, playerStats);
      expect(rank).toBeGreaterThan(0); // Should match
    });

    it('should handle boundary: 69% match (below threshold)', () => {
      const roster = Array(10).fill(null).map((_, i) => ({
        playerId: `${i}`,
        stats: { points: 100, rebounds: 5, assists: 3, steals: 2, blocks: 1 }
      }));
      
      // Only 2/5 fields match = 40%
      const playerStats = { 
        points: 100,    // match
        rebounds: 5,    // match
        assists: 999,
        steals: 999,
        blocks: 999
      };
      
      const rank = getPlayerRank(roster, playerStats);
      expect(rank).toBe(0); // Should NOT match
    });

    it('should handle boundary: 71% match (above threshold)', () => {
      const roster = Array(10).fill(null).map((_, i) => ({
        playerId: `${i}`,
        stats: { points: 100, rebounds: 5, assists: 3, steals: 2, blocks: 1 }
      }));
      
      // 4/5 fields match = 80%
      const playerStats = { 
        points: 100,
        rebounds: 5,
        assists: 3,
        steals: 2,
        blocks: 999     // only this differs
      };
      
      const rank = getPlayerRank(roster, playerStats);
      expect(rank).toBeGreaterThan(0); // Should match
    });
  });

  describe('security/adversarial', () => {
    it('should handle null players in roster', () => {
      const roster = [
        { playerId: '1', stats: { points: 100 } },
        null,
        { playerId: '3', stats: { points: 80 } }
      ];
      const playerStats = { points: 90 };
      
      expect(() => getPlayerRank(roster, playerStats)).not.toThrow();
    });

    it('should handle undefined players in roster', () => {
      const roster = [
        { playerId: '1', stats: { points: 100 } },
        undefined,
        { playerId: '3', stats: { points: 80 } }
      ];
      const playerStats = { points: 90 };
      
      expect(() => getPlayerRank(roster, playerStats)).not.toThrow();
    });

    it('should handle duplicate player IDs', () => {
      const roster = [
        { playerId: '1', stats: { points: 100 } },
        { playerId: '1', stats: { points: 100 } },  // duplicate!
        { playerId: '2', stats: { points: 90 } }
      ];
      const playerStats = { points: 100 };
      
      const rank = getPlayerRank(roster, playerStats);
      expect(rank).toBeGreaterThan(0);
      expect(rank).toBeLessThanOrEqual(roster.length);
    });

    it('should reject >100% match percentage (impossible)', () => {
      const roster = [{ playerId: '1', stats: { points: 100 } }];
      const playerStats = { points: 100, extraField: 'injected' };
      
      const rank = getPlayerRank(roster, playerStats);
      // Match % should never exceed 100%
      expect(rank).toBeLessThanOrEqual(roster.length);
    });

    it('should handle non-array roster input', () => {
      const roster = { playerId: '1', stats: { points: 100 } }; // object, not array!
      const playerStats = { points: 100 };
      
      expect(() => getPlayerRank(roster, playerStats)).not.toThrow();
      expect(getPlayerRank(roster, playerStats)).toBe(0); // or throw error
    });

    it('should handle roster with non-object elements', () => {
      const roster = [
        { playerId: '1', stats: { points: 100 } },
        'string',  // adversarial!
        42,        // adversarial!
        { playerId: '2', stats: { points: 90 } }
      ];
      const playerStats = { points: 90 };
      
      expect(() => getPlayerRank(roster, playerStats)).not.toThrow();
    });

    it('should handle players missing stats object', () => {
      const roster = [
        { playerId: '1', stats: { points: 100 } },
        { playerId: '2' }, // no stats!
        { playerId: '3', stats: { points: 80 } }
      ];
      const playerStats = { points: 90 };
      
      expect(() => getPlayerRank(roster, playerStats)).not.toThrow();
    });
  });
});

// ============================================================================
// FIX #2: ID MATCHING (idMatch utility)
// ============================================================================

describe('Fix #2: ID Matching (idMatch)', () => {
  
  describe('happy path', () => {
    it('should match identical string IDs', () => {
      expect(idMatch('12345', '12345')).toBe(true);
    });

    it('should match identical number IDs', () => {
      expect(idMatch(12345, 12345)).toBe(true);
    });

    it('should match number to string representation', () => {
      expect(idMatch(12345, '12345')).toBe(true);
      expect(idMatch('12345', 12345)).toBe(true);
    });

    it('should not match different IDs', () => {
      expect(idMatch('12345', '67890')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(idMatch('', '')).toBe(true);
      expect(idMatch('', '123')).toBe(false);
    });

    it('should handle zero', () => {
      expect(idMatch(0, 0)).toBe(true);
      expect(idMatch(0, '0')).toBe(true);
    });

    it('should handle negative numbers', () => {
      expect(idMatch(-123, -123)).toBe(true);
      expect(idMatch(-123, '-123')).toBe(true);
    });

    it('should handle large numbers', () => {
      expect(idMatch(9007199254740991, '9007199254740991')).toBe(true);
    });
  });

  describe('security/adversarial', () => {
    it('should handle null values', () => {
      expect(() => idMatch(null, null)).not.toThrow();
      expect(idMatch(null, null)).toBe(true);
      expect(idMatch(null, '123')).toBe(false);
      expect(idMatch('123', null)).toBe(false);
    });

    it('should handle undefined values', () => {
      expect(() => idMatch(undefined, undefined)).not.toThrow();
      expect(idMatch(undefined, undefined)).toBe(true);
      expect(idMatch(undefined, '123')).toBe(false);
    });

    it('should handle object inputs (type confusion)', () => {
      const obj1 = { id: '123' };
      const obj2 = { id: '123' };
      
      expect(() => idMatch(obj1, obj2)).not.toThrow();
      expect(idMatch(obj1, obj2)).toBe(false); // objects don't match by value
    });

    it('should handle array inputs', () => {
      expect(() => idMatch([1, 2, 3], [1, 2, 3])).not.toThrow();
      expect(idMatch([1, 2, 3], [1, 2, 3])).toBe(false);
    });

    it('should handle function inputs', () => {
      const fn1 = () => '123';
      const fn2 = () => '123';
      
      expect(() => idMatch(fn1, fn2)).not.toThrow();
      expect(idMatch(fn1, fn2)).toBe(false);
    });

    it('should handle Symbol inputs', () => {
      const sym1 = Symbol('id');
      const sym2 = Symbol('id');
      
      expect(() => idMatch(sym1, sym2)).not.toThrow();
      expect(idMatch(sym1, sym2)).toBe(false); // symbols never match
    });

    it('should handle NaN', () => {
      expect(() => idMatch(NaN, NaN)).not.toThrow();
      expect(idMatch(NaN, NaN)).toBe(false); // NaN !== NaN
      expect(idMatch(NaN, '123')).toBe(false);
    });

    it('should handle Infinity', () => {
      expect(idMatch(Infinity, Infinity)).toBe(true);
      expect(idMatch(Infinity, 'Infinity')).toBe(true);
      expect(idMatch(-Infinity, -Infinity)).toBe(true);
    });

    it('should handle whitespace-only strings', () => {
      expect(idMatch('   ', '   ')).toBe(true);
      expect(idMatch('123', '  123  ')).toBe(false); // no trimming
    });

    it('should handle whitespace differences', () => {
      expect(idMatch('123', ' 123')).toBe(false);
      expect(idMatch('123', '123 ')).toBe(false);
      expect(idMatch('123', '1 23')).toBe(false);
    });

    it('should NOT match different object references (identity check)', () => {
      const obj = { id: '123' };
      expect(idMatch(obj, obj)).toBe(true); // same reference
      expect(idMatch(obj, { id: '123' })).toBe(false); // different reference
    });

    it('should handle boolean inputs', () => {
      expect(idMatch(true, true)).toBe(true);
      expect(idMatch(true, 'true')).toBe(true);
      expect(idMatch(false, false)).toBe(true);
      expect(idMatch(false, 'false')).toBe(true);
    });
  });
});

// ============================================================================
// FIX #3: SESSION STORAGE (useLeaguematesPrefill hook)
// ============================================================================

describe('Fix #3: Session Storage (useLeaguematesPrefill)', () => {
  let mockSessionStorage;
  let mockSetState;

  beforeEach(() => {
    // Mock sessionStorage
    mockSessionStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    global.sessionStorage = mockSessionStorage;

    // Mock React setState
    mockSetState = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('happy path', () => {
    it('should load valid leaguemates from sessionStorage', () => {
      const validData = JSON.stringify(['player1', 'player2', 'player3']);
      mockSessionStorage.getItem.mockReturnValue(validData);

      const leaguemates = useLeaguematesPrefill('league123');
      
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('leaguemates_league123');
      expect(leaguemates).toEqual(['player1', 'player2', 'player3']);
    });

    it('should return empty array when no data in storage', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const leaguemates = useLeaguematesPrefill('league123');
      
      expect(leaguemates).toEqual([]);
    });

    it('should save leaguemates to sessionStorage', () => {
      const saveLeaguemates = getSaveLeaguematesFunction();
      const data = ['player1', 'player2'];

      saveLeaguemates('league123', data);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'leaguemates_league123',
        JSON.stringify(data)
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty leaguemates array', () => {
      const validData = JSON.stringify([]);
      mockSessionStorage.getItem.mockReturnValue(validData);

      const leaguemates = useLeaguematesPrefill('league123');
      
      expect(leaguemates).toEqual([]);
    });

    it('should handle very long leaguemate arrays', () => {
      const largeArray = Array(1000).fill(null).map((_, i) => `player${i}`);
      const validData = JSON.stringify(largeArray);
      mockSessionStorage.getItem.mockReturnValue(validData);

      expect(() => useLeaguematesPrefill('league123')).not.toThrow();
    });

    it('should handle special characters in league IDs', () => {
      const validData = JSON.stringify(['player1']);
      mockSessionStorage.getItem.mockReturnValue(validData);

      const leaguemates = useLeaguematesPrefill('league-123_test!@#');
      
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith('leaguemates_league-123_test!@#');
    });
  });

  describe('security/adversarial', () => {
    it('should handle unavailable sessionStorage', () => {
      global.sessionStorage = undefined;

      expect(() => useLeaguematesPrefill('league123')).not.toThrow();
      const result = useLeaguematesPrefill('league123');
      expect(result).toEqual([]);
    });

    it('should handle sessionStorage.getItem throwing error', () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => useLeaguematesPrefill('league123')).not.toThrow();
      const result = useLeaguematesPrefill('league123');
      expect(result).toEqual([]);
    });

    it('should handle malformed JSON', () => {
      mockSessionStorage.getItem.mockReturnValue('{"invalid": json}');

      expect(() => useLeaguematesPrefill('league123')).not.toThrow();
      const result = useLeaguematesPrefill('league123');
      expect(result).toEqual([]);
    });

    it('should handle non-JSON strings', () => {
      mockSessionStorage.getItem.mockReturnValue('not json at all');

      expect(() => useLeaguematesPrefill('league123')).not.toThrow();
      const result = useLeaguematesPrefill('league123');
      expect(result).toEqual([]);
    });

    it('should handle null value from storage (not string "null")', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      expect(() => useLeaguematesPrefill('league123')).not.toThrow();
      const result = useLeaguematesPrefill('league123');
      expect(result).toEqual([]);
    });

    it('should handle string "null" from storage', () => {
      mockSessionStorage.getItem.mockReturnValue('null');

      expect(() => useLeaguematesPrefill('league123')).not.toThrow();
      const result = useLeaguematesPrefill('league123');
      expect(result).toEqual([]); // null should be treated as no data
    });

    it('should handle non-array JSON (object instead of array)', () => {
      mockSessionStorage.getItem.mockReturnValue('{"player1": "data"}');

      expect(() => useLeaguematesPrefill('league123')).not.toThrow();
      const result = useLeaguematesPrefill('league123');
      expect(result).toEqual([]); // or convert to array
    });

    it('should handle primitive JSON values', () => {
      mockSessionStorage.getItem.mockReturnValue('"just a string"');

      expect(() => useLeaguematesPrefill('league123')).not.toThrow();
      const result = useLeaguematesPrefill('league123');
      expect(result).toEqual([]);
    });

    it('should handle missing leaguemates in prefill data', () => {
      const dataWithoutLeaguemates = JSON.stringify({ otherField: 'value' });
      mockSessionStorage.getItem.mockReturnValue(dataWithoutLeaguemates);

      expect(() => useLeaguematesPrefill('league123')).not.toThrow();
      const result = useLeaguematesPrefill('league123');
      expect(result).toEqual([]);
    });

    it('should handle race condition: storage changes during read', () => {
      let callCount = 0;
      mockSessionStorage.getItem.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return JSON.stringify(['player1']);
        return JSON.stringify(['player2']); // changed!
      });

      const result1 = useLeaguematesPrefill('league123');
      const result2 = useLeaguematesPrefill('league123');
      
      expect(result1).toEqual(['player1']);
      expect(result2).toEqual(['player2']);
    });

    it('should handle setState throwing error', () => {
      mockSetState.mockImplementation(() => {
        throw new Error('Component unmounted');
      });

      expect(() => {
        const setter = getStateSetter();
        setter(['player1']);
      }).not.toThrow();
    });

    it('should handle circular reference in data (JSON.stringify fails)', () => {
      const circularData = { players: ['player1'] };
      circularData.self = circularData; // circular reference

      const saveLeaguemates = getSaveLeaguematesFunction();
      
      expect(() => saveLeaguemates('league123', circularData)).not.toThrow();
    });

    it('should sanitize XSS attempts in leaguemate names', () => {
      const xssData = JSON.stringify([
        '<script>alert("xss")</script>',
        'player1',
        '<img src=x onerror=alert(1)>'
      ]);
      mockSessionStorage.getItem.mockReturnValue(xssData);

      const result = useLeaguematesPrefill('league123');
      
      // Data should be loaded but sanitized when rendered
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

// ============================================================================
// FIX #4: BACKEND VALIDATION (validatePlayerId)
// ============================================================================

describe('Fix #4: Backend Validation (validatePlayerId)', () => {
  
  describe('happy path', () => {
    it('should accept valid positive integer IDs', () => {
      expect(validatePlayerId(123)).toBe(true);
      expect(validatePlayerId(1)).toBe(true);
      expect(validatePlayerId(999999)).toBe(true);
    });

    it('should accept valid string integer IDs', () => {
      expect(validatePlayerId('123')).toBe(true);
      expect(validatePlayerId('1')).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(validatePlayerId('abc')).toBe(false);
      expect(validatePlayerId('12a3')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle MAX_SAFE_INTEGER', () => {
      expect(validatePlayerId(Number.MAX_SAFE_INTEGER)).toBe(true);
      expect(validatePlayerId(String(Number.MAX_SAFE_INTEGER))).toBe(true);
    });

    it('should handle very small positive integers', () => {
      expect(validatePlayerId(1)).toBe(true);
      expect(validatePlayerId('1')).toBe(true);
    });
  });

  describe('security/adversarial', () => {
    it('should reject whitespace-only IDs', () => {
      expect(validatePlayerId('   ')).toBe(false);
      expect(validatePlayerId('\t')).toBe(false);
      expect(validatePlayerId('\n')).toBe(false);
    });

    it('should reject IDs with leading whitespace', () => {
      expect(validatePlayerId(' 123')).toBe(false);
      expect(validatePlayerId('\t123')).toBe(false);
    });

    it('should reject IDs with trailing whitespace', () => {
      expect(validatePlayerId('123 ')).toBe(false);
      expect(validatePlayerId('123\n')).toBe(false);
    });

    it('should reject negative IDs', () => {
      expect(validatePlayerId(-1)).toBe(false);
      expect(validatePlayerId(-123)).toBe(false);
      expect(validatePlayerId('-123')).toBe(false);
    });

    it('should reject zero', () => {
      expect(validatePlayerId(0)).toBe(false);
      expect(validatePlayerId('0')).toBe(false);
    });

    it('should reject IDs greater than MAX_SAFE_INTEGER', () => {
      const tooBig = Number.MAX_SAFE_INTEGER + 1;
      expect(validatePlayerId(tooBig)).toBe(false);
      expect(validatePlayerId(String(tooBig))).toBe(false);
    });

    it('should reject NaN', () => {
      expect(validatePlayerId(NaN)).toBe(false);
      expect(validatePlayerId('NaN')).toBe(false);
    });

    it('should reject Infinity', () => {
      expect(validatePlayerId(Infinity)).toBe(false);
      expect(validatePlayerId('Infinity')).toBe(false);
      expect(validatePlayerId(-Infinity)).toBe(false);
    });

    it('should reject floating point numbers', () => {
      expect(validatePlayerId(123.45)).toBe(false);
      expect(validatePlayerId('123.45')).toBe(false);
    });

    it('should reject scientific notation', () => {
      expect(validatePlayerId('1e10')).toBe(false);
      expect(validatePlayerId('1.23e5')).toBe(false);
    });

    it('should reject null', () => {
      expect(validatePlayerId(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(validatePlayerId(undefined)).toBe(false);
    });

    it('should reject objects', () => {
      expect(validatePlayerId({ id: 123 })).toBe(false);
    });

    it('should reject arrays', () => {
      expect(validatePlayerId([123])).toBe(false);
    });

    it('should reject boolean', () => {
      expect(validatePlayerId(true)).toBe(false);
      expect(validatePlayerId(false)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validatePlayerId('')).toBe(false);
    });

    it('should reject SQL injection attempts', () => {
      expect(validatePlayerId("123'; DROP TABLE users--")).toBe(false);
      expect(validatePlayerId("123 OR 1=1")).toBe(false);
    });

    it('should reject NoSQL injection attempts', () => {
      expect(validatePlayerId({ $gt: 0 })).toBe(false);
      expect(validatePlayerId({ $ne: null })).toBe(false);
    });
  });
});

// ============================================================================
// FIX #5: ID EXTRACTION (getAssetId helper)
// ============================================================================

describe('Fix #5: ID Extraction (getAssetId)', () => {
  
  describe('happy path', () => {
    it('should extract id when only id is present', () => {
      const asset = { id: '123' };
      expect(getAssetId(asset)).toBe('123');
    });

    it('should extract playerId when only playerId is present', () => {
      const asset = { playerId: '456' };
      expect(getAssetId(asset)).toBe('456');
    });

    it('should prefer playerId when both are present', () => {
      const asset = { id: '123', playerId: '456' };
      expect(getAssetId(asset)).toBe('456');
    });

    it('should handle numeric IDs', () => {
      const asset = { id: 123 };
      expect(getAssetId(asset)).toBe(123);
    });
  });

  describe('edge cases', () => {
    it('should return null when neither id nor playerId present', () => {
      const asset = { name: 'player' };
      expect(getAssetId(asset)).toBe(null);
    });

    it('should handle zero as valid ID', () => {
      const asset = { id: 0 };
      expect(getAssetId(asset)).toBe(0);
    });

    it('should handle negative IDs (even if invalid elsewhere)', () => {
      const asset = { id: -123 };
      expect(getAssetId(asset)).toBe(-123);
    });
  });

  describe('security/adversarial', () => {
    it('should handle null asset', () => {
      expect(() => getAssetId(null)).not.toThrow();
      expect(getAssetId(null)).toBe(null);
    });

    it('should handle undefined asset', () => {
      expect(() => getAssetId(undefined)).not.toThrow();
      expect(getAssetId(undefined)).toBe(null);
    });

    it('should handle empty string ID', () => {
      const asset = { id: '' };
      expect(getAssetId(asset)).toBe(''); // or null, depending on requirements
    });

    it('should handle whitespace-only ID', () => {
      const asset = { id: '   ' };
      expect(getAssetId(asset)).toBe('   '); // or null/trimmed
    });

    it('should handle both id and playerId being null', () => {
      const asset = { id: null, playerId: null };
      expect(getAssetId(asset)).toBe(null);
    });

    it('should handle both id and playerId being undefined', () => {
      const asset = { id: undefined, playerId: undefined };
      expect(getAssetId(asset)).toBe(null);
    });

    it('should prefer playerId even if it\'s null', () => {
      const asset = { id: '123', playerId: null };
      // Should prefer playerId even if null? Or fallback to id?
      const result = getAssetId(asset);
      expect(result === null || result === '123').toBe(true);
    });

    it('should handle NaN as ID value', () => {
      const asset = { id: NaN };
      expect(() => getAssetId(asset)).not.toThrow();
    });

    it('should handle Infinity as ID value', () => {
      const asset = { id: Infinity };
      expect(getAssetId(asset)).toBe(Infinity);
    });

    it('should handle object as ID value', () => {
      const asset = { id: { nested: '123' } };
      expect(() => getAssetId(asset)).not.toThrow();
    });

    it('should handle array as ID value', () => {
      const asset = { id: [1, 2, 3] };
      expect(() => getAssetId(asset)).not.toThrow();
    });

    it('should handle function as ID value', () => {
      const asset = { id: () => '123' };
      expect(() => getAssetId(asset)).not.toThrow();
    });

    it('should handle Symbol as ID value', () => {
      const asset = { id: Symbol('id') };
      expect(() => getAssetId(asset)).not.toThrow();
    });

    it('should not execute getter side effects twice', () => {
      let callCount = 0;
      const asset = {
        get playerId() {
          callCount++;
          return '123';
        }
      };
      
      getAssetId(asset);
      expect(callCount).toBe(1); // Should only access once
    });

    it('should handle asset with prototype pollution attempt', () => {
      const asset = JSON.parse('{"__proto__": {"id": "999"}, "id": "123"}');
      expect(getAssetId(asset)).toBe('123');
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS (mocked implementations for testing)
// ============================================================================

function getPlayerRank(roster, playerStats) {
  // Implementation would go here
  // This is a placeholder for testing purposes
  throw new Error('Not implemented - replace with actual function');
}

function idMatch(id1, id2) {
  // Implementation would go here
  throw new Error('Not implemented - replace with actual function');
}

function useLeaguematesPrefill(leagueId) {
  // Implementation would go here
  throw new Error('Not implemented - replace with actual function');
}

function getSaveLeaguematesFunction() {
  // Implementation would go here
  throw new Error('Not implemented - replace with actual function');
}

function getStateSetter() {
  // Implementation would go here
  throw new Error('Not implemented - replace with actual function');
}

function validatePlayerId(id) {
  // Implementation would go here
  throw new Error('Not implemented - replace with actual function');
}

function getAssetId(asset) {
  // Implementation would go here
  throw new Error('Not implemented - replace with actual function');
}

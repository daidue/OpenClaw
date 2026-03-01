/**
 * Tests for FIX #5: ID Extraction & Normalization
 */

import {
  normalizeId,
  extractAssetId,
  validateAndNormalizeAssets,
  idMatch
} from './idNormalization';

describe('FIX #5: ID Extraction & Normalization', () => {
  let consoleWarnSpy, consoleErrorSpy;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('normalizeId', () => {
    describe('Valid inputs', () => {
      test('should accept valid string IDs', () => {
        expect(normalizeId('123')).toBe('123');
        expect(normalizeId('player_456')).toBe('player_456');
        expect(normalizeId('abc-def-789')).toBe('abc-def-789');
      });

      test('should trim whitespace from strings', () => {
        expect(normalizeId('  123  ')).toBe('123');
        expect(normalizeId('\t456\n')).toBe('456');
        expect(normalizeId('  spaced  id  ')).toBe('spaced  id');
      });

      test('should accept valid integer numbers', () => {
        expect(normalizeId(0)).toBe('0');
        expect(normalizeId(123)).toBe('123');
        expect(normalizeId(999999)).toBe('999999');
      });

      test('should accept large integers', () => {
        expect(normalizeId(Number.MAX_SAFE_INTEGER)).toBe(String(Number.MAX_SAFE_INTEGER));
      });
    });

    describe('Invalid inputs - null/undefined', () => {
      test('should return null for null', () => {
        expect(normalizeId(null)).toBeNull();
      });

      test('should return null for undefined', () => {
        expect(normalizeId(undefined)).toBeNull();
      });
    });

    describe('Invalid inputs - empty strings', () => {
      test('should return null for empty string', () => {
        const result = normalizeId('');
        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Empty or whitespace-only')
        );
      });

      test('should return null for whitespace-only string', () => {
        expect(normalizeId('   ')).toBeNull();
        expect(normalizeId('\t\n')).toBeNull();
        expect(normalizeId('  \t  \n  ')).toBeNull();
      });
    });

    describe('Invalid inputs - bad numbers', () => {
      test('should return null for NaN', () => {
        const result = normalizeId(NaN);
        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('NaN rejected')
        );
      });

      test('should return null for Infinity', () => {
        const result = normalizeId(Infinity);
        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Infinity rejected')
        );
      });

      test('should return null for -Infinity', () => {
        const result = normalizeId(-Infinity);
        expect(result).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Infinity rejected')
        );
      });

      test('should return null for negative numbers', () => {
        expect(normalizeId(-1)).toBeNull();
        expect(normalizeId(-999)).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Negative number rejected'),
          expect.any(Number)
        );
      });

      test('should return null for non-integer numbers', () => {
        expect(normalizeId(3.14)).toBeNull();
        expect(normalizeId(1.5)).toBeNull();
        expect(normalizeId(0.999)).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Non-integer number rejected'),
          expect.any(Number)
        );
      });
    });

    describe('Invalid inputs - wrong types', () => {
      test('should return null for objects', () => {
        expect(normalizeId({})).toBeNull();
        expect(normalizeId({ id: '123' })).toBeNull();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid type rejected'),
          'object',
          expect.anything()
        );
      });

      test('should return null for arrays', () => {
        expect(normalizeId([])).toBeNull();
        expect(normalizeId(['123'])).toBeNull();
      });

      test('should return null for functions', () => {
        expect(normalizeId(() => {})).toBeNull();
      });

      test('should return null for booleans', () => {
        expect(normalizeId(true)).toBeNull();
        expect(normalizeId(false)).toBeNull();
      });
    });

    describe('Edge cases', () => {
      test('should accept zero', () => {
        expect(normalizeId(0)).toBe('0');
      });

      test('should accept string zero', () => {
        expect(normalizeId('0')).toBe('0');
      });

      test('should handle string numbers consistently', () => {
        expect(normalizeId('123')).toBe(normalizeId(123));
      });
    });
  });

  describe('extractAssetId', () => {
    describe('Valid extractions', () => {
      test('should extract from id field', () => {
        expect(extractAssetId({ id: '123' })).toBe('123');
        expect(extractAssetId({ id: 456 })).toBe('456');
      });

      test('should extract from playerId field', () => {
        expect(extractAssetId({ playerId: '789' })).toBe('789');
        expect(extractAssetId({ playerId: 999 })).toBe('999');
      });

      test('should prefer id over playerId when both valid and same', () => {
        expect(extractAssetId({ id: '123', playerId: '123' })).toBe('123');
        expect(extractAssetId({ id: 456, playerId: 456 })).toBe('456');
      });

      test('should prefer id when both exist and differ', () => {
        const result = extractAssetId({ id: '111', playerId: '222' });
        expect(result).toBe('111');
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Both id and playerId exist and differ'),
          expect.objectContaining({
            id: '111',
            playerId: '222'
          })
        );
      });
    });

    describe('Null guard on asset parameter', () => {
      test('should return null for null asset', () => {
        const result = extractAssetId(null);
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Invalid asset'),
          expect.stringContaining('object')
        );
      });

      test('should return null for undefined asset', () => {
        const result = extractAssetId(undefined);
        expect(result).toBeNull();
      });

      test('should return null for non-object asset', () => {
        expect(extractAssetId('string')).toBeNull();
        expect(extractAssetId(123)).toBeNull();
        expect(extractAssetId([])).toBeNull();
      });
    });

    describe('Missing/invalid IDs', () => {
      test('should return null when both id and playerId are missing', () => {
        const result = extractAssetId({ type: 'player', name: 'Test' });
        expect(result).toBeNull();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('No valid ID found'),
          expect.objectContaining({ type: 'player' })
        );
      });

      test('should return null when id is empty string', () => {
        expect(extractAssetId({ id: '' })).toBeNull();
      });

      test('should return null when playerId is whitespace', () => {
        expect(extractAssetId({ playerId: '   ' })).toBeNull();
      });

      test('should return null when id is NaN', () => {
        expect(extractAssetId({ id: NaN })).toBeNull();
      });

      test('should return null when playerId is Infinity', () => {
        expect(extractAssetId({ playerId: Infinity })).toBeNull();
      });
    });

    describe('Conflict detection', () => {
      test('should NOT warn when both are null', () => {
        extractAssetId({ id: null, playerId: null });
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      test('should NOT warn when both normalize to same value', () => {
        extractAssetId({ id: '123', playerId: 123 });
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      test('should warn when both are valid but different', () => {
        extractAssetId({ id: 100, playerId: 200 });
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('differ'),
          expect.any(Object)
        );
      });
    });
  });

  describe('validateAndNormalizeAssets', () => {
    test('should return empty array for non-array input', () => {
      expect(validateAndNormalizeAssets(null)).toEqual([]);
      expect(validateAndNormalizeAssets('string')).toEqual([]);
      expect(validateAndNormalizeAssets({})).toEqual([]);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Expected array'),
        expect.any(String)
      );
    });

    test('should validate and normalize valid assets', () => {
      const assets = [
        { id: '123', name: 'Player 1' },
        { playerId: 456, name: 'Player 2' },
        { id: '  789  ', name: 'Player 3' }
      ];

      const result = validateAndNormalizeAssets(assets);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: '123', name: 'Player 1' });
      expect(result[1]).toEqual({ id: '456', name: 'Player 2' });
      expect(result[2]).toEqual({ id: '789', name: 'Player 3' });
    });

    test('should filter out assets with invalid IDs', () => {
      const assets = [
        { id: '123', name: 'Valid 1' },
        { id: '', name: 'Invalid - empty' },
        { id: null, name: 'Invalid - null' },
        { name: 'Invalid - no ID' },
        { playerId: 456, name: 'Valid 2' },
        { id: NaN, name: 'Invalid - NaN' }
      ];

      const result = validateAndNormalizeAssets(assets);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('123');
      expect(result[1].id).toBe('456');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid assets filtered out'),
        expect.objectContaining({
          count: 4,
          invalidAssets: expect.any(Array)
        })
      );
    });

    test('should handle empty array', () => {
      const result = validateAndNormalizeAssets([]);
      expect(result).toEqual([]);
    });

    test('should preserve all asset properties', () => {
      const assets = [
        {
          id: '123',
          name: 'Player',
          position: 'RB',
          team: 'SF',
          metadata: { custom: 'data' }
        }
      ];

      const result = validateAndNormalizeAssets(assets);

      expect(result[0]).toEqual({
        id: '123',
        name: 'Player',
        position: 'RB',
        team: 'SF',
        metadata: { custom: 'data' }
      });
    });
  });

  describe('idMatch', () => {
    describe('Matching behavior', () => {
      test('should match identical string IDs', () => {
        expect(idMatch('123', '123')).toBe(true);
        expect(idMatch('abc', 'abc')).toBe(true);
      });

      test('should match string and number IDs', () => {
        expect(idMatch('123', 123)).toBe(true);
        expect(idMatch(456, '456')).toBe(true);
      });

      test('should match after trimming', () => {
        expect(idMatch('  123  ', '123')).toBe(true);
        expect(idMatch('123', '  123  ')).toBe(true);
      });

      test('should not match different IDs', () => {
        expect(idMatch('123', '456')).toBe(false);
        expect(idMatch(111, 222)).toBe(false);
      });
    });

    describe('Null/undefined handling (CRITICAL FIX)', () => {
      test('should NOT match null with null', () => {
        expect(idMatch(null, null)).toBe(false);
      });

      test('should NOT match undefined with undefined', () => {
        expect(idMatch(undefined, undefined)).toBe(false);
      });

      test('should NOT match null with undefined', () => {
        expect(idMatch(null, undefined)).toBe(false);
        expect(idMatch(undefined, null)).toBe(false);
      });

      test('should NOT match null with any value', () => {
        expect(idMatch(null, '123')).toBe(false);
        expect(idMatch('123', null)).toBe(false);
        expect(idMatch(null, 0)).toBe(false);
      });

      test('should NOT match undefined with any value', () => {
        expect(idMatch(undefined, '123')).toBe(false);
        expect(idMatch('123', undefined)).toBe(false);
      });
    });

    describe('Invalid input handling', () => {
      test('should NOT match empty strings', () => {
        expect(idMatch('', '')).toBe(false);
        expect(idMatch('', '123')).toBe(false);
      });

      test('should NOT match whitespace-only strings', () => {
        expect(idMatch('   ', '   ')).toBe(false);
        expect(idMatch('  ', '123')).toBe(false);
      });

      test('should NOT match NaN values', () => {
        expect(idMatch(NaN, NaN)).toBe(false);
        expect(idMatch(NaN, 123)).toBe(false);
      });

      test('should NOT match Infinity values', () => {
        expect(idMatch(Infinity, Infinity)).toBe(false);
        expect(idMatch(Infinity, 123)).toBe(false);
      });

      test('should NOT match negative numbers', () => {
        expect(idMatch(-1, -1)).toBe(false);
        expect(idMatch(-5, 5)).toBe(false);
      });
    });

    describe('Real-world usage scenarios', () => {
      test('should correctly filter roster by ID', () => {
        const roster = [
          { id: '111', name: 'Player 1' },
          { id: '222', name: 'Player 2' },
          { id: '333', name: 'Player 3' }
        ];

        const filtered = roster.filter(p => !idMatch(p.id, '222'));

        expect(filtered).toHaveLength(2);
        expect(filtered.find(p => p.id === '222')).toBeUndefined();
      });

      test('should NOT remove all null-ID players when removing one', () => {
        const roster = [
          { id: null, name: 'Rookie 1' },
          { id: null, name: 'Rookie 2' },
          { id: '123', name: 'Veteran' }
        ];

        const filtered = roster.filter(p => !idMatch(p.id, null));

        // CRITICAL: Should keep all players (null doesn't match null)
        expect(filtered).toHaveLength(3);
      });

      test('should correctly check if asset already in trade', () => {
        const trade = [
          { id: '100', name: 'Player A' },
          { id: '200', name: 'Player B' }
        ];

        const assetToAdd = { id: 200, name: 'Player B' };

        const alreadyInTrade = trade.some(a => idMatch(a.id, assetToAdd.id));

        expect(alreadyInTrade).toBe(true);
      });
    });
  });

  describe('Integration: Full asset validation flow', () => {
    test('should handle prefill assets with mixed ID formats', () => {
      const prefillAssets = [
        { id: '123', type: 'player', name: 'Valid String' },
        { playerId: 456, type: 'player', name: 'Valid Number' },
        { id: '  789  ', type: 'player', name: 'Needs Trim' },
        { id: '', type: 'player', name: 'Invalid Empty' },
        { type: 'player', name: 'Invalid Missing' },
        { id: null, playerId: null, type: 'player', name: 'Invalid Nulls' }
      ];

      const validated = validateAndNormalizeAssets(prefillAssets);

      expect(validated).toHaveLength(3);
      expect(validated[0].id).toBe('123');
      expect(validated[1].id).toBe('456');
      expect(validated[2].id).toBe('789');
    });

    test('should prevent duplicate additions using idMatch', () => {
      const currentAssets = [{ id: '100' }, { id: '200' }];
      const assetToAdd = { id: 100 }; // Number version

      const isDuplicate = currentAssets.some(a => idMatch(a.id, assetToAdd.id));

      expect(isDuplicate).toBe(true);
    });
  });
});

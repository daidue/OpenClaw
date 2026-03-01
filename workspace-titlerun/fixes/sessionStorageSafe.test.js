/**
 * Tests for FIX #3: SessionStorage Transaction Safety
 */

import { readPrefillSafe, writePrefillSafe, clearPrefillSafe } from './sessionStorageSafe';

// Mock sessionStorage
let mockStorage = {};
const sessionStorageMock = {
  getItem: jest.fn((key) => mockStorage[key] || null),
  setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
  removeItem: jest.fn((key) => { delete mockStorage[key]; }),
  clear: jest.fn(() => { mockStorage = {}; })
};

describe('FIX #3: SessionStorage Transaction Safety', () => {
  let consoleWarnSpy, consoleErrorSpy;

  beforeEach(() => {
    // Reset mock storage
    mockStorage = {};
    sessionStorageMock.getItem.mockClear();
    sessionStorageMock.setItem.mockClear();
    sessionStorageMock.removeItem.mockClear();
    
    // Mock global sessionStorage
    global.sessionStorage = sessionStorageMock;
    
    // Spy on console methods
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('readPrefillSafe', () => {
    test('should return null when sessionStorage is unavailable', () => {
      global.sessionStorage = undefined;
      
      const result = readPrefillSafe();
      
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Not available')
      );
    });

    test('should return null when no prefill data exists', () => {
      const result = readPrefillSafe();
      
      expect(result).toBeNull();
      expect(sessionStorageMock.getItem).toHaveBeenCalledWith('titlerun_prefill_trade');
    });

    test('should successfully parse valid prefill data', () => {
      const validData = {
        opponentRosterId: '123',
        get: [{ id: '456', type: 'player' }],
        give: [{ id: '789', type: 'player' }]
      };
      mockStorage['titlerun_prefill_trade'] = JSON.stringify(validData);
      
      const result = readPrefillSafe();
      
      expect(result).toEqual(validData);
    });

    test('should return null for invalid JSON', () => {
      mockStorage['titlerun_prefill_trade'] = 'invalid{json';
      
      const result = readPrefillSafe();
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read prefill'),
        expect.any(String),
        expect.any(Error)
      );
    });

    test('should return null when parsed result is not an object', () => {
      mockStorage['titlerun_prefill_trade'] = JSON.stringify('string');
      
      const result = readPrefillSafe();
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid prefill format'),
        'string'
      );
    });

    test('should return null when parsed result is an array', () => {
      mockStorage['titlerun_prefill_trade'] = JSON.stringify([1, 2, 3]);
      
      const result = readPrefillSafe();
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid prefill format'),
        'object'
      );
    });

    test('should return null when opponentRosterId is missing', () => {
      const invalidData = {
        get: [],
        give: []
      };
      mockStorage['titlerun_prefill_trade'] = JSON.stringify(invalidData);
      
      const result = readPrefillSafe();
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing required field: opponentRosterId')
      );
    });

    test('should convert non-array get/give to empty arrays', () => {
      const dataWithInvalidArrays = {
        opponentRosterId: '123',
        get: 'not-an-array',
        give: null
      };
      mockStorage['titlerun_prefill_trade'] = JSON.stringify(dataWithInvalidArrays);
      
      const result = readPrefillSafe();
      
      expect(result).toEqual({
        opponentRosterId: '123',
        get: [],
        give: []
      });
    });

    test('should reject when get array exceeds MAX_PREFILL_ASSETS', () => {
      const tooManyAssets = Array(101).fill({ id: '1' });
      const data = {
        opponentRosterId: '123',
        get: tooManyAssets,
        give: []
      };
      mockStorage['titlerun_prefill_trade'] = JSON.stringify(data);
      
      const result = readPrefillSafe();
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Asset count exceeds limit'),
        expect.objectContaining({
          getCount: 101,
          max: 100
        })
      );
    });

    test('should reject when give array exceeds MAX_PREFILL_ASSETS', () => {
      const tooManyAssets = Array(101).fill({ id: '1' });
      const data = {
        opponentRosterId: '123',
        get: [],
        give: tooManyAssets
      };
      mockStorage['titlerun_prefill_trade'] = JSON.stringify(data);
      
      const result = readPrefillSafe();
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Asset count exceeds limit'),
        expect.objectContaining({
          giveCount: 101,
          max: 100
        })
      );
    });

    test('should accept exactly MAX_PREFILL_ASSETS (100)', () => {
      const exactlyMax = Array(100).fill({ id: '1' });
      const data = {
        opponentRosterId: '123',
        get: exactlyMax,
        give: []
      };
      mockStorage['titlerun_prefill_trade'] = JSON.stringify(data);
      
      const result = readPrefillSafe();
      
      expect(result).not.toBeNull();
      expect(result.get).toHaveLength(100);
    });
  });

  describe('writePrefillSafe', () => {
    test('should return false when sessionStorage is unavailable', () => {
      global.sessionStorage = undefined;
      
      const result = writePrefillSafe({ test: 'data' });
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot write - not available')
      );
    });

    test('should successfully write valid data', () => {
      const data = {
        opponentRosterId: '123',
        get: [],
        give: []
      };
      
      const result = writePrefillSafe(data);
      
      expect(result).toBe(true);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'titlerun_prefill_trade',
        JSON.stringify(data)
      );
    });

    test('should return false for null data', () => {
      const result = writePrefillSafe(null);
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid data type')
      );
    });

    test('should return false for non-object data', () => {
      const result = writePrefillSafe('string');
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid data type')
      );
    });

    test('should handle QuotaExceededError', () => {
      sessionStorageMock.setItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      const result = writePrefillSafe({ data: 'test' });
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write prefill'),
        expect.any(String)
      );
    });
  });

  describe('clearPrefillSafe', () => {
    test('should silently return when sessionStorage is unavailable', () => {
      global.sessionStorage = undefined;
      
      // Should not throw
      expect(() => clearPrefillSafe()).not.toThrow();
    });

    test('should successfully remove item', () => {
      mockStorage['titlerun_prefill_trade'] = 'some-data';
      
      clearPrefillSafe();
      
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('titlerun_prefill_trade');
      expect(mockStorage['titlerun_prefill_trade']).toBeUndefined();
    });

    test('should handle removeItem errors gracefully', () => {
      sessionStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Should not throw
      expect(() => clearPrefillSafe()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to clear prefill'),
        expect.any(String)
      );
    });
  });

  describe('Integration: Safe prefill flow', () => {
    test('should maintain data integrity through read-apply-clear cycle', () => {
      // Setup: write prefill data
      const originalData = {
        opponentRosterId: '999',
        get: [{ id: '111' }],
        give: [{ id: '222' }]
      };
      
      writePrefillSafe(originalData);
      
      // Step 1: Read (should NOT clear yet)
      const prefill = readPrefillSafe();
      expect(prefill).toEqual(originalData);
      
      // Data should still be in storage
      expect(mockStorage['titlerun_prefill_trade']).toBeDefined();
      
      // Step 2: Apply to state (simulated - would check opponent exists)
      const opponentFound = true;
      
      if (opponentFound) {
        // Step 3: Only clear after successful application
        clearPrefillSafe();
        expect(mockStorage['titlerun_prefill_trade']).toBeUndefined();
      }
    });

    test('should keep data on failed opponent lookup', () => {
      const data = {
        opponentRosterId: '999',
        get: [],
        give: []
      };
      
      writePrefillSafe(data);
      
      // Read prefill
      const prefill = readPrefillSafe();
      expect(prefill).not.toBeNull();
      
      // Simulate opponent not found
      const opponentFound = false;
      
      if (!opponentFound) {
        // DON'T clear - keep for retry
        // clearPrefillSafe(); // ← NOT called
      }
      
      // Data should still be available for next attempt
      const retryRead = readPrefillSafe();
      expect(retryRead).toEqual(data);
    });
  });
});

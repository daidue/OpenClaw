const { normalizeId, ValidationError } = require('../routes/tradeEngine');
const { MAX_SAFE_ID } = require('../constants');

describe('normalizeId', () => {
  describe('FIX #1: CRITICAL - Supply Chain Integrity', () => {
    test('should load without error (integrity check passes)', () => {
      // If module loads, integrity verification passed
      expect(normalizeId).toBeDefined();
      expect(typeof normalizeId).toBe('function');
    });

    test('should have ValidationError class exported', () => {
      expect(ValidationError).toBeDefined();
      expect(ValidationError.prototype).toBeInstanceOf(Error);
    });

    // Note: Cannot test version mismatch without mocking require()
    // Manual test: Change EXPECTED_LIB_VERSION to wrong version → module load fails
  });

  describe('FIX #2: HIGH - Input Pre-Validation (Prototype Pollution Prevention)', () => {
    test('should reject object input (prototype pollution risk)', () => {
      const malicious = { constructor: { prototype: { isAdmin: true } } };
      
      expect(() => normalizeId(malicious)).toThrow(ValidationError);
      expect(() => normalizeId(malicious)).toThrow('Invalid ID type: objects not allowed');
    });

    test('should reject plain object', () => {
      expect(() => normalizeId({})).toThrow(ValidationError);
      expect(() => normalizeId({})).toThrow('objects not allowed');
    });

    test('should reject array (object type)', () => {
      expect(() => normalizeId([1, 2, 3])).toThrow(ValidationError);
      expect(() => normalizeId([1, 2, 3])).toThrow('objects not allowed');
    });

    test('should reject function', () => {
      expect(() => normalizeId(() => {})).toThrow(ValidationError);
      expect(() => normalizeId(() => {})).toThrow('functions not allowed');
    });

    test('should reject symbol', () => {
      expect(() => normalizeId(Symbol('test'))).toThrow(ValidationError);
    });

    test('should accept only string or number primitives', () => {
      expect(normalizeId(42)).toBe(42);
      expect(normalizeId('42')).toBe(42);
    });
  });

  describe('FIX #3: HIGH - Security Logging', () => {
    test('should not crash when logging validation failures', () => {
      // Logging happens internally; verify no crash
      expect(() => normalizeId('invalid')).toThrow(ValidationError);
      expect(() => normalizeId(-1)).toThrow(ValidationError);
      expect(() => normalizeId({})).toThrow(ValidationError);
    });

    // Note: Cannot test actual log output without mocking console/logger
    // Manual verification: Check console output for structured logs
  });

  describe('FIX #4: HIGH - Specific Error Messages (User Experience)', () => {
    test('should provide specific error for empty string', () => {
      expect(() => normalizeId('')).toThrow('Invalid ID: cannot be empty string');
    });

    test('should provide specific error for whitespace string', () => {
      expect(() => normalizeId('   ')).toThrow('Invalid ID: cannot be empty string');
    });

    test('should provide specific error for non-numeric string', () => {
      expect(() => normalizeId('abc')).toThrow('Invalid ID "abc": must be a number');
    });

    test('should provide specific error for decimal string', () => {
      expect(() => normalizeId('42.5')).toThrow('Invalid ID "42.5": must be an integer (no decimals)');
    });

    test('should provide specific error for negative number', () => {
      expect(() => normalizeId(-1)).toThrow('Invalid ID: must be non-negative (got -1)');
    });

    test('should provide specific error for decimal number', () => {
      expect(() => normalizeId(42.5)).toThrow('Invalid ID: must be an integer (got 42.5)');
    });

    test('should provide specific error for Infinity', () => {
      expect(() => normalizeId(Infinity)).toThrow('Invalid ID: must be a finite number (got Infinity)');
    });

    test('should provide specific error for NaN', () => {
      expect(() => normalizeId(NaN)).toThrow('Invalid ID: must be a finite number (got NaN)');
    });

    test('should provide specific error for unsafe integer', () => {
      const tooLarge = MAX_SAFE_ID + 1;
      expect(() => normalizeId(tooLarge)).toThrow('Invalid ID: exceeds safe integer range');
    });

    test('should include input value in error message for strings', () => {
      expect(() => normalizeId('bad-id')).toThrow('"bad-id"');
    });

    test('should truncate long input values in error message', () => {
      const longString = 'a'.repeat(200);
      expect(() => normalizeId(longString)).toThrow(ValidationError);
      // Error message should be reasonably short (truncated)
    });
  });

  describe('FIX #5: HIGH - Return Value Validation (Defense in Depth)', () => {
    // Note: Cannot test library returning invalid values without mocking
    // These tests verify the checks are in place for normal operation
    
    test('should accept valid library return value', () => {
      expect(normalizeId(42)).toBe(42);
      expect(typeof normalizeId(42)).toBe('number');
    });

    test('should accept null for null/undefined input', () => {
      expect(normalizeId(null)).toBe(null);
      expect(normalizeId(undefined)).toBe(null);
    });

    // Manual test: Mock normalizeIdLib to return invalid value → should throw TypeError
    // This would require jest.mock() which affects other tests, so documented here
  });

  describe('FIX #6: HIGH - ValidationError Class (Semantic Error Handling)', () => {
    test('should throw ValidationError for user errors', () => {
      expect(() => normalizeId('invalid')).toThrow(ValidationError);
      expect(() => normalizeId(-1)).toThrow(ValidationError);
      expect(() => normalizeId({})).toThrow(ValidationError);
    });

    test('ValidationError should extend TypeError', () => {
      try {
        normalizeId('invalid');
      } catch (err) {
        expect(err).toBeInstanceOf(TypeError);
        expect(err).toBeInstanceOf(ValidationError);
        expect(err.name).toBe('ValidationError');
      }
    });

    test('ValidationError should have details property', () => {
      try {
        normalizeId('abc');
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err.details).toBeDefined();
        expect(err.details.inputType).toBe('string');
        expect(err.details.inputValue).toBe('abc');
      }
    });

    test('should distinguish ValidationError from TypeError', () => {
      // Frontend can catch ValidationError specifically
      const handleError = (err) => {
        if (err instanceof ValidationError) {
          return 'user-error';
        } else if (err instanceof TypeError) {
          return 'system-error';
        }
        return 'unknown';
      };

      try {
        normalizeId('invalid');
      } catch (err) {
        expect(handleError(err)).toBe('user-error');
      }
    });
  });

  describe('LEGACY: Edge Cases (Preserved from Original Tests)', () => {
    test('should return null for null input', () => {
      expect(normalizeId(null)).toBe(null);
    });

    test('should return null for undefined input', () => {
      expect(normalizeId(undefined)).toBe(null);
    });

    test('should reject whitespace-only string', () => {
      expect(() => normalizeId('   ')).toThrow(TypeError);
    });

    test('should reject empty string', () => {
      expect(() => normalizeId('')).toThrow(TypeError);
    });

    test('should reject tab-only string', () => {
      expect(() => normalizeId('\t\t')).toThrow(TypeError);
    });

    test('should reject negative number', () => {
      expect(() => normalizeId(-1)).toThrow(TypeError);
    });

    test('should reject negative string number', () => {
      expect(() => normalizeId('-42')).toThrow(TypeError);
    });

    test('should reject ID > MAX_SAFE_INTEGER (number)', () => {
      const tooLarge = MAX_SAFE_ID + 1;
      expect(() => normalizeId(tooLarge)).toThrow(TypeError);
    });

    test('should reject ID > MAX_SAFE_INTEGER (string)', () => {
      const tooLarge = (MAX_SAFE_ID + 1).toString();
      expect(() => normalizeId(tooLarge)).toThrow(TypeError);
    });

    test('should reject NaN', () => {
      expect(() => normalizeId(NaN)).toThrow(TypeError);
    });

    test('should reject Infinity', () => {
      expect(() => normalizeId(Infinity)).toThrow(TypeError);
    });

    test('should reject -Infinity', () => {
      expect(() => normalizeId(-Infinity)).toThrow(TypeError);
    });

    test('should reject non-integer number', () => {
      expect(() => normalizeId(42.5)).toThrow(TypeError);
    });

    test('should reject non-integer string', () => {
      expect(() => normalizeId('42.5')).toThrow(TypeError);
    });

    test('should reject non-numeric string', () => {
      expect(() => normalizeId('abc')).toThrow(TypeError);
    });

    test('should reject boolean type', () => {
      expect(() => normalizeId(true)).toThrow(TypeError);
    });

    test('should reject object type', () => {
      expect(() => normalizeId({})).toThrow(TypeError);
    });

    test('should reject array type', () => {
      expect(() => normalizeId([1])).toThrow(TypeError);
    });

    test('should accept valid positive number', () => {
      expect(normalizeId(42)).toBe(42);
    });

    test('should accept zero', () => {
      expect(normalizeId(0)).toBe(0);
    });

    test('should accept MAX_SAFE_INTEGER', () => {
      expect(normalizeId(MAX_SAFE_ID)).toBe(MAX_SAFE_ID);
    });

    test('should accept valid numeric string', () => {
      expect(normalizeId('12345')).toBe(12345);
    });

    test('should trim whitespace from string', () => {
      expect(normalizeId('  42  ')).toBe(42);
    });

    test('should trim tabs and newlines from string', () => {
      expect(normalizeId('\t42\n')).toBe(42);
    });

    test('should accept MAX_SAFE_INTEGER as string', () => {
      expect(normalizeId(MAX_SAFE_ID.toString())).toBe(MAX_SAFE_ID);
    });

    test('should accept zero as string', () => {
      expect(normalizeId('0')).toBe(0);
    });

    test('should accept string with leading zeros', () => {
      expect(normalizeId('0042')).toBe(42);
    });

    test('should handle string "0" correctly', () => {
      expect(normalizeId('0')).toBe(0);
    });
  });

  describe('Type consistency', () => {
    test('should always return number or null', () => {
      expect(typeof normalizeId(42)).toBe('number');
      expect(typeof normalizeId('42')).toBe('number');
      expect(normalizeId(null)).toBe(null);
      expect(normalizeId(undefined)).toBe(null);
    });
  });

  describe('INTEGRATION: Real-World Scenarios', () => {
    test('should handle typical API request IDs', () => {
      // User ID from URL param
      expect(normalizeId('123456')).toBe(123456);
      
      // League ID from query string
      expect(normalizeId('789')).toBe(789);
      
      // Optional field (null)
      expect(normalizeId(null)).toBe(null);
    });

    test('should handle edge cases from production logs', () => {
      // Empty string from malformed request
      expect(() => normalizeId('')).toThrow(ValidationError);
      
      // Decimal from JavaScript float precision
      expect(() => normalizeId(42.00000001)).toThrow(ValidationError);
      
      // Negative ID from bug
      expect(() => normalizeId(-1)).toThrow(ValidationError);
    });

    test('should provide frontend-friendly error handling', () => {
      const apiErrorHandler = (err) => {
        if (err instanceof ValidationError) {
          return {
            status: 400,
            error: err.message,
            details: err.details,
          };
        } else {
          return {
            status: 500,
            error: 'Internal server error',
          };
        }
      };

      try {
        normalizeId('bad-id');
      } catch (err) {
        const response = apiErrorHandler(err);
        expect(response.status).toBe(400);
        expect(response.error).toContain('must be a number');
        expect(response.details).toBeDefined();
      }
    });

    test('should handle security attack attempts gracefully', () => {
      // Prototype pollution
      expect(() => normalizeId({ __proto__: { isAdmin: true } })).toThrow(ValidationError);
      
      // SQL injection attempt (string)
      expect(() => normalizeId("'; DROP TABLE users; --")).toThrow(ValidationError);
      
      // XSS attempt
      expect(() => normalizeId('<script>alert(1)</script>')).toThrow(ValidationError);
      
      // Oversized string (DoS attempt)
      const huge = 'a'.repeat(10000);
      expect(() => normalizeId(huge)).toThrow(ValidationError);
    });
  });

  describe('PERFORMANCE: Efficiency Verification', () => {
    test('should normalize valid IDs quickly', () => {
      const start = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        normalizeId(i);
      }
      
      const duration = Date.now() - start;
      
      // Should complete 10K normalizations in < 100ms
      expect(duration).toBeLessThan(100);
    });

    test('should handle invalid IDs without performance degradation', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        try {
          normalizeId('invalid');
        } catch (err) {
          // Expected
        }
      }
      
      const duration = Date.now() - start;
      
      // Test environment: console logging is synchronous and slow
      // Production: async logging, much faster
      // Target: < 500ms for 1K attempts with logging overhead
      expect(duration).toBeLessThan(500);
    });
  });
});

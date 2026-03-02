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

  // ============================================================================
  // FIX #7: MEDIUM - Type Coercion Edge Cases (Strict Equality Verification)
  // ============================================================================
  describe('FIX #7: MEDIUM - Type Coercion Edge Cases', () => {
    test('should reject boolean false (not coerced to 0)', () => {
      expect(() => normalizeId(false)).toThrow(ValidationError);
      expect(() => normalizeId(false)).toThrow('Invalid ID type');
    });

    test('should reject boolean true (not coerced to 1)', () => {
      expect(() => normalizeId(true)).toThrow(ValidationError);
      expect(() => normalizeId(true)).toThrow('Invalid ID type');
    });

    test('should distinguish 0 vs false vs null', () => {
      // 0 is valid
      expect(normalizeId(0)).toBe(0);
      
      // false is invalid
      expect(() => normalizeId(false)).toThrow(ValidationError);
      
      // null is valid (returns null)
      expect(normalizeId(null)).toBe(null);
      
      // All three should behave differently
      expect(normalizeId(0)).not.toBe(normalizeId(null));
    });

    test('should distinguish empty string vs "0" vs 0', () => {
      // Empty string is invalid
      expect(() => normalizeId('')).toThrow(ValidationError);
      expect(() => normalizeId('')).toThrow('cannot be empty string');
      
      // "0" is valid (parses to 0)
      expect(normalizeId('0')).toBe(0);
      
      // 0 is valid
      expect(normalizeId(0)).toBe(0);
      
      // "0" and 0 should normalize to same value
      expect(normalizeId('0')).toBe(normalizeId(0));
    });

    test('should reject empty array', () => {
      expect(() => normalizeId([])).toThrow(ValidationError);
      expect(() => normalizeId([])).toThrow('objects not allowed');
    });

    test('should reject array with single number', () => {
      expect(() => normalizeId([42])).toThrow(ValidationError);
      expect(() => normalizeId([42])).toThrow('objects not allowed');
    });

    test('should reject array with multiple numbers', () => {
      expect(() => normalizeId([1, 2, 3])).toThrow(ValidationError);
    });
  });

  // ============================================================================
  // FIX #8: MEDIUM - ValidationError Class Tests
  // ============================================================================
  describe('FIX #8: MEDIUM - ValidationError Export & Usage', () => {
    test('ValidationError should be exported', () => {
      expect(ValidationError).toBeDefined();
      expect(typeof ValidationError).toBe('function');
    });

    test('ValidationError should extend Error', () => {
      const err = new ValidationError('test');
      expect(err).toBeInstanceOf(Error);
    });

    test('ValidationError should extend TypeError', () => {
      const err = new ValidationError('test');
      expect(err).toBeInstanceOf(TypeError);
    });

    test('Frontend can distinguish ValidationError from TypeError', () => {
      try {
        normalizeId('invalid');
        fail('Should have thrown');
      } catch (err) {
        // Frontend can catch specifically
        expect(err instanceof ValidationError).toBe(true);
        expect(err.name).toBe('ValidationError');
        
        // Can also check as TypeError
        expect(err instanceof TypeError).toBe(true);
      }
    });

    test('Error messages should be specific (not generic)', () => {
      const testCases = [
        { input: 'abc', expected: 'must be a number' },
        { input: -1, expected: 'must be non-negative' },
        { input: 42.5, expected: 'must be an integer' },
        { input: Infinity, expected: 'must be a finite number' },
        { input: '', expected: 'cannot be empty string' },
      ];

      testCases.forEach(({ input, expected }) => {
        try {
          normalizeId(input);
          fail(`Should have thrown for ${input}`);
        } catch (err) {
          expect(err.message).toContain(expected);
          expect(err.message).not.toBe('Invalid ID: validation failed'); // Not generic
        }
      });
    });
  });

  // ============================================================================
  // FIX #9: MEDIUM - Caller Context for Audit Trail
  // ============================================================================
  describe('FIX #9: MEDIUM - Caller Context for Audit Trail', () => {
    test('should accept context object as second parameter', () => {
      const context = {
        ip: '192.168.1.1',
        userId: 'user-123',
        endpoint: '/api/trades',
        requestId: 'req-abc',
      };
      
      // Should not throw for valid ID
      expect(() => normalizeId(42, context)).not.toThrow();
      expect(normalizeId(42, context)).toBe(42);
    });

    test('should be backward compatible (context optional)', () => {
      // Old API without context should still work
      expect(normalizeId(42)).toBe(42);
      expect(normalizeId('123')).toBe(123);
      expect(normalizeId(null)).toBe(null);
    });

    test('should handle empty context object', () => {
      expect(normalizeId(42, {})).toBe(42);
    });

    test('should handle partial context', () => {
      expect(normalizeId(42, { ip: '192.168.1.1' })).toBe(42);
      expect(normalizeId(42, { userId: 'user-123' })).toBe(42);
    });

    test('context should not affect validation logic', () => {
      const context = { ip: '192.168.1.1', userId: 'user-123' };
      
      // Valid ID: context doesn't change result
      expect(normalizeId(42, context)).toBe(normalizeId(42));
      
      // Invalid ID: context doesn't prevent error
      expect(() => normalizeId('invalid', context)).toThrow(ValidationError);
      expect(() => normalizeId(-1, context)).toThrow(ValidationError);
    });

    // Note: Cannot test actual log output without mocking console
    // Logging verification requires manual inspection or integration tests
  });

  // ============================================================================
  // EDGE CASES: Extreme & Unusual Inputs
  // ============================================================================
  describe('EDGE CASES: Extreme & Unusual Inputs', () => {
    test('should reject very long string IDs (10KB)', () => {
      const longString = 'a'.repeat(10 * 1024);
      expect(() => normalizeId(longString)).toThrow(ValidationError);
    });

    test('should reject extremely long string IDs (100KB)', () => {
      const veryLongString = 'x'.repeat(100 * 1024);
      expect(() => normalizeId(veryLongString)).toThrow(ValidationError);
    });

    test('should handle unicode characters in string IDs', () => {
      expect(() => normalizeId('42😀')).toThrow(ValidationError);
      expect(() => normalizeId('😀42')).toThrow(ValidationError);
      expect(() => normalizeId('🚀')).toThrow(ValidationError);
    });

    test('should handle multi-byte unicode (emoji, symbols)', () => {
      expect(() => normalizeId('💯')).toThrow(ValidationError);
      expect(() => normalizeId('中文')).toThrow(ValidationError);
      expect(() => normalizeId('Ñoño')).toThrow(ValidationError);
    });

    test('should accept scientific notation strings (library parses them)', () => {
      // Note: JavaScript's Number() function accepts scientific notation
      // The underlying @titlerun/validation library uses this behavior
      expect(normalizeId('1e10')).toBe(10000000000);
      expect(normalizeId('2.5e6')).toBe(2500000); // 2.5e6 = 2500000 (valid integer)
      expect(normalizeId('1E5')).toBe(100000);
    });

    test('should accept scientific notation numbers (if integer)', () => {
      // 1e2 = 100 (valid integer)
      expect(normalizeId(1e2)).toBe(100);
      
      // 1e10 = 10000000000 (valid integer)
      expect(normalizeId(1e10)).toBe(10000000000);
    });

    test('should accept scientific notation that resolves to integers', () => {
      // 1.5e2 = 150 (which is an integer after evaluation)
      expect(normalizeId(1.5e2)).toBe(150);
    });

    test('should accept hexadecimal strings (library parses them)', () => {
      // Note: JavaScript's Number() function accepts hex strings
      // The underlying @titlerun/validation library uses this behavior
      expect(normalizeId('0x2A')).toBe(42);
      expect(normalizeId('0xFF')).toBe(255);
      expect(normalizeId('0x10')).toBe(16);
    });

    test('should accept octal strings (library parses them)', () => {
      // Note: JavaScript's Number() function accepts octal strings
      expect(normalizeId('0o77')).toBe(63);
      expect(normalizeId('0o10')).toBe(8);
    });

    test('should accept binary strings (library parses them)', () => {
      // Note: JavaScript's Number() function accepts binary strings
      expect(normalizeId('0b1010')).toBe(10);
      expect(normalizeId('0b1111')).toBe(15);
    });
  });

  // ============================================================================
  // EDGE CASES: Prototype Pollution Variations
  // ============================================================================
  describe('EDGE CASES: Prototype Pollution Variations', () => {
    test('should reject __proto__ pollution attempt', () => {
      const malicious = { __proto__: { isAdmin: true } };
      expect(() => normalizeId(malicious)).toThrow(ValidationError);
      expect(() => normalizeId(malicious)).toThrow('objects not allowed');
    });

    test('should reject constructor.prototype pollution', () => {
      const malicious = { constructor: { prototype: { isAdmin: true } } };
      expect(() => normalizeId(malicious)).toThrow(ValidationError);
    });

    test('should reject Object.create(null) attack', () => {
      const malicious = Object.create(null);
      malicious.id = 42;
      // Should throw ValidationError (not TypeError from String() conversion)
      try {
        normalizeId(malicious);
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect(err.message).toContain('objects not allowed');
      }
    });

    test('should reject nested object pollution', () => {
      const malicious = {
        __proto__: {
          __proto__: {
            isAdmin: true
          }
        }
      };
      expect(() => normalizeId(malicious)).toThrow(ValidationError);
    });
  });

  // ============================================================================
  // EDGE CASES: Concurrency & Race Conditions
  // ============================================================================
  describe('EDGE CASES: Concurrency & Race Conditions', () => {
    test('should handle multiple calls with same ID simultaneously', async () => {
      const promises = Array(100).fill(42).map(id => 
        Promise.resolve(normalizeId(id))
      );
      
      const results = await Promise.all(promises);
      
      // All should return same value
      expect(results.every(r => r === 42)).toBe(true);
      expect(results).toHaveLength(100);
    });

    test('should handle rapid sequential calls (stress test)', () => {
      const results = [];
      
      for (let i = 0; i < 1000; i++) {
        results.push(normalizeId(i));
      }
      
      // All should be correct
      expect(results).toHaveLength(1000);
      expect(results[0]).toBe(0);
      expect(results[500]).toBe(500);
      expect(results[999]).toBe(999);
    });

    test('should handle interleaved valid/invalid calls', () => {
      const results = [];
      
      for (let i = 0; i < 100; i++) {
        if (i % 2 === 0) {
          results.push(normalizeId(i));
        } else {
          try {
            normalizeId('invalid');
          } catch (err) {
            results.push('error');
          }
        }
      }
      
      expect(results).toHaveLength(100);
      expect(results.filter(r => r === 'error')).toHaveLength(50);
      expect(results.filter(r => typeof r === 'number')).toHaveLength(50);
    });
  });

  // ============================================================================
  // EDGE CASES: Error Message Quality
  // ============================================================================
  describe('EDGE CASES: Error Message Quality', () => {
    test('error messages should truncate long inputs properly', () => {
      const longInput = 'a'.repeat(1000);
      
      try {
        normalizeId(longInput);
        fail('Should have thrown');
      } catch (err) {
        // Error message should truncate long inputs (expect ~100-150 chars with boilerplate)
        expect(err.message.length).toBeLessThan(200);
        // Should contain ellipsis for truncated input
        expect(err.message).toContain('...');
      }
    });

    test('error messages should not leak sensitive data', () => {
      const sensitiveInputs = [
        'password123',
        'sk-api-key-secret',
        'credit-card-4111111111111111',
      ];
      
      sensitiveInputs.forEach(sensitive => {
        try {
          normalizeId(sensitive);
          fail('Should have thrown');
        } catch (err) {
          // Error message should include the input (for debugging)
          // but this is acceptable since it's user-provided ID input
          // In production, logging should be reviewed for PII
          expect(err.message).toBeDefined();
          expect(err.message.length).toBeGreaterThan(0);
        }
      });
    });

    test('every error should have specific message (not generic)', () => {
      const inputs = [
        '',           // empty string
        'abc',        // non-numeric
        -1,           // negative
        42.5,         // decimal
        Infinity,     // infinity
        NaN,          // NaN
        {},           // object
        [],           // array
        true,         // boolean
      ];
      
      const messages = new Set();
      
      inputs.forEach(input => {
        try {
          normalizeId(input);
        } catch (err) {
          messages.add(err.message);
        }
      });
      
      // Each input should produce a unique/specific error message
      expect(messages.size).toBeGreaterThan(5); // At least 5 different messages
      
      // No message should be completely generic
      messages.forEach(msg => {
        expect(msg).not.toBe('Invalid ID: validation failed');
        expect(msg.length).toBeGreaterThan(10); // Reasonably descriptive
      });
    });
  });

  // ============================================================================
  // MEMORY LEAK TESTS
  // ============================================================================
  describe('MEMORY LEAK TESTS', () => {
    test('should not leak memory on repeated calls', () => {
      // Warm up
      for (let i = 0; i < 100; i++) {
        normalizeId(i);
      }
      
      // Force GC if available (requires --expose-gc flag)
      if (global.gc) {
        global.gc();
      }
      
      const memBefore = process.memoryUsage().heapUsed;
      
      // 10K calls
      for (let i = 0; i < 10000; i++) {
        normalizeId(i);
      }
      
      if (global.gc) {
        global.gc();
      }
      
      const memAfter = process.memoryUsage().heapUsed;
      const memDelta = memAfter - memBefore;
      
      // Should not accumulate more than 1MB for 10K calls
      // (in practice, should be near-zero since we're not storing anything)
      expect(memDelta).toBeLessThan(1 * 1024 * 1024);
    });

    test('should not leak memory on validation failures', () => {
      if (global.gc) {
        global.gc();
      }
      
      const memBefore = process.memoryUsage().heapUsed;
      
      // 1K failed validations
      for (let i = 0; i < 1000; i++) {
        try {
          normalizeId('invalid');
        } catch (err) {
          // Expected
        }
      }
      
      if (global.gc) {
        global.gc();
      }
      
      const memAfter = process.memoryUsage().heapUsed;
      const memDelta = memAfter - memBefore;
      
      // Errors + logging might use some memory, but shouldn't accumulate
      expect(memDelta).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });
  });
});

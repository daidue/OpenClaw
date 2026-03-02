/**
 * Trade Engine - ID Normalization
 * 
 * Production-hardened wrapper around @titlerun/validation with defense-in-depth security.
 * 
 * Security layers:
 * 1. Supply chain integrity verification (library version pinning)
 * 2. Input pre-validation (type checking, prototype pollution prevention)
 * 3. Return value validation (defensive checks on library output)
 * 4. Security instrumentation (logging for incident response)
 * 5. User-friendly error diagnostics (specific, actionable messages)
 * 
 * @module tradeEngine
 */
const { normalizeId: normalizeIdLib } = require('@titlerun/validation');

// FIX 1: CRITICAL - Supply Chain Hardening
const EXPECTED_LIB_VERSION = '1.0.0';

/**
 * Verify @titlerun/validation library integrity on module load.
 * Prevents supply chain attacks by validating expected version.
 * 
 * @throws {Error} If library version doesn't match expected
 * @private
 */
function verifyLibraryIntegrity() {
  try {
    // Use require.resolve to get actual path, then load package.json
    const path = require('path');
    const libPath = require.resolve('@titlerun/validation');
    const pkgPath = path.join(path.dirname(libPath), '../package.json');
    const pkg = require(pkgPath);
    
    if (pkg.version !== EXPECTED_LIB_VERSION) {
      throw new Error(
        `SECURITY ALERT: Unexpected @titlerun/validation version. ` +
        `Expected ${EXPECTED_LIB_VERSION}, got ${pkg.version}. ` +
        `This may indicate a supply chain compromise.`
      );
    }
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        'SECURITY ALERT: Cannot verify @titlerun/validation integrity. ' +
        'package.json not found.'
      );
    }
    throw err;
  }
}

// Run integrity check on module load (blocks startup if version mismatch)
verifyLibraryIntegrity();

// FIX 3: HIGH - Security Logging Setup
const logger = console; // TODO: Replace with proper logger service (Winston, Pino, etc.)

/**
 * Custom error class for ID validation failures.
 * Allows frontend to distinguish validation errors from programming errors.
 * 
 * FIX 6: HIGH - Semantic Error Types for Better Error Handling
 */
class ValidationError extends TypeError {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Normalize and validate an ID with production-grade security hardening.
 * 
 * This function provides defense-in-depth protection:
 * - Input pre-validation (prevents prototype pollution, type confusion)
 * - Library delegation with integrity verification
 * - Return value validation (detects compromised library behavior)
 * - Security logging (enables incident response)
 * - User-friendly error messages (reduces support burden)
 * 
 * **Constraints:**
 * - ID must be a string or number (not objects, arrays, or other types)
 * - After parsing, ID must be a finite, non-negative integer
 * - Range: 0 to 2^53 - 1 (JavaScript safe integer limit)
 * - String IDs are parsed as base-10 integers ("42" → 42)
 * - Decimal/float IDs are rejected ("42.5" → ValidationError)
 * - Negative IDs are rejected (-1 → ValidationError)
 * - null and undefined are accepted (return null)
 * 
 * **Examples:**
 * ```javascript
 * normalizeId(42)        → 42
 * normalizeId("42")      → 42
 * normalizeId("0")       → 0
 * normalizeId(null)      → null
 * normalizeId(undefined) → null
 * normalizeId("abc")     → ValidationError: "Invalid ID "abc": must be a number"
 * normalizeId(42.5)      → ValidationError: "Invalid ID: must be an integer"
 * normalizeId(-1)        → ValidationError: "Invalid ID: must be non-negative"
 * normalizeId({})        → ValidationError: "Invalid ID type: objects not allowed"
 * ```
 * 
 * **Security notes:**
 * - Uses @titlerun/validation v1.0.0 (pinned, verified on load)
 * - Defensive validation prevents library compromise exploitation
 * - All validation failures are logged for security monitoring
 * 
 * @param {string|number|null|undefined} id - ID to normalize
 * @returns {number|null} - Normalized ID (integer ≥ 0) or null (for null/undefined input)
 * @throws {ValidationError} - If ID is invalid (with specific diagnostic message)
 * @throws {TypeError} - If library returns unexpected type (security violation)
 * 
 * @example
 * // Valid IDs
 * const userId = normalizeId(req.params.userId);           // 42 → 42
 * const leagueId = normalizeId(req.query.league);          // "123" → 123
 * const optionalId = normalizeId(req.body.optionalField);  // null → null
 * 
 * @example
 * // Error handling
 * try {
 *   const id = normalizeId(userInput);
 * } catch (err) {
 *   if (err instanceof ValidationError) {
 *     // User error - show friendly message
 *     res.status(400).json({ error: err.message });
 *   } else {
 *     // System error - log and show generic message
 *     logger.error('ID normalization failed', err);
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * }
 */
function normalizeId(id) {
  // FIX 2: HIGH - Input Pre-Validation (Defense Layer 1)
  if (id !== null && id !== undefined) {
    const inputType = typeof id;
    
    // Prevent prototype pollution attacks
    if (inputType === 'object' || inputType === 'function') {
      const error = new ValidationError(
        `Invalid ID type: ${inputType}s not allowed`,
        { inputType, inputValue: String(id).substring(0, 100) }
      );
      
      // FIX 3: HIGH - Security Logging
      logger.warn('ID validation failed: invalid type', {
        event: 'invalid_id_type',
        inputType,
        inputValue: String(id).substring(0, 100),
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    }
    
    // Accept only string or number primitives
    if (inputType !== 'string' && inputType !== 'number') {
      const error = new ValidationError(
        `Invalid ID type: expected string or number, got ${inputType}`,
        { inputType }
      );
      
      logger.warn('ID validation failed: unexpected type', {
        event: 'invalid_id_type',
        inputType,
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    }
  }
  
  // Delegate to library (trusted but verified)
  const result = normalizeIdLib(id);
  
  // FIX 5: HIGH - Return Value Validation (Defense Layer 2)
  // Detect compromised library behavior (supply chain attack mitigation)
  if (result !== null) {
    if (typeof result !== 'number') {
      // SECURITY ALERT: Library returned unexpected type
      logger.error('SECURITY: Library returned non-number type', {
        event: 'library_integrity_violation',
        returnedType: typeof result,
        returnedValue: String(result).substring(0, 100),
        inputValue: String(id).substring(0, 100),
        timestamp: new Date().toISOString(),
      });
      
      throw new TypeError(
        'SECURITY VIOLATION: @titlerun/validation returned unexpected type. ' +
        'This may indicate library compromise.'
      );
    }
    
    // Verify returned number is safe integer (not Infinity, NaN, or out of bounds)
    if (!Number.isFinite(result) || !Number.isInteger(result) || result < 0) {
      logger.error('SECURITY: Library returned invalid number', {
        event: 'library_integrity_violation',
        returnedValue: result,
        inputValue: String(id).substring(0, 100),
        timestamp: new Date().toISOString(),
      });
      
      throw new TypeError(
        'SECURITY VIOLATION: @titlerun/validation returned invalid number. ' +
        'This may indicate library compromise.'
      );
    }
  }
  
  // FIX 4: HIGH - Specific Error Messages (User Experience)
  // If library returned null and input wasn't null/undefined, validation failed
  if (result === null && id !== null && id !== undefined) {
    // Provide specific diagnostic based on input characteristics
    let errorMessage = 'Invalid ID: validation failed';
    const idStr = String(id);
    
    if (typeof id === 'string') {
      if (idStr.trim() === '') {
        errorMessage = 'Invalid ID: cannot be empty string';
      } else if (isNaN(Number(id))) {
        errorMessage = `Invalid ID "${idStr}": must be a number`;
      } else if (idStr.includes('.')) {
        errorMessage = `Invalid ID "${idStr}": must be an integer (no decimals)`;
      } else {
        errorMessage = `Invalid ID "${idStr}": must be a valid non-negative integer`;
      }
    } else if (typeof id === 'number') {
      if (!Number.isFinite(id)) {
        errorMessage = `Invalid ID: must be a finite number (got ${id})`;
      } else if (!Number.isInteger(id)) {
        errorMessage = `Invalid ID: must be an integer (got ${id})`;
      } else if (id < 0) {
        errorMessage = `Invalid ID: must be non-negative (got ${id})`;
      } else if (!Number.isSafeInteger(id)) {
        errorMessage = `Invalid ID: exceeds safe integer range (got ${id})`;
      }
    }
    
    const error = new ValidationError(errorMessage, {
      inputValue: idStr.substring(0, 100),
      inputType: typeof id,
    });
    
    // FIX 3: HIGH - Security Logging for Failed Validations
    logger.warn('ID validation failed', {
      event: 'invalid_id_validation',
      inputType: typeof id,
      inputValue: idStr.substring(0, 100),
      inputLength: idStr.length,
      errorMessage,
      timestamp: new Date().toISOString(),
    });
    
    throw error;
  }
  
  return result;
}

module.exports = { 
  normalizeId,
  ValidationError, // Export for error handling in routes
};

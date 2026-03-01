/**
 * idMatch - Type-safe ID comparison utility
 * 
 * Compares two IDs (string or number primitives only) for equality.
 * Throws TypeError on invalid inputs - this is a pure utility where
 * programmer errors should fail fast.
 * 
 * @param {string|number} a - First ID
 * @param {string|number} b - Second ID
 * @returns {boolean} True if IDs match, false otherwise
 * @throws {TypeError} If inputs are invalid types
 * 
 * Valid inputs:
 * - Strings: non-empty after trimming
 * - Numbers: finite, integer, non-negative
 * 
 * Invalid inputs (throws):
 * - null, undefined
 * - Objects, arrays, functions, symbols
 * - Empty/whitespace-only strings
 * - NaN, Infinity, -Infinity
 * - Negative numbers
 * - Non-integer numbers
 */
export function idMatch(a, b) {
  // FIX: Early return for reference equality (performance optimization)
  // Handles same-reference objects and identical primitives
  if (a === b) return true;

  // FIX: Explicit null/undefined checks BEFORE typeof
  // (typeof null === 'object' is a JS quirk we must work around)
  if (a == null) {
    throw new TypeError(`idMatch: first argument is ${a === null ? 'null' : 'undefined'}`);
  }
  if (b == null) {
    throw new TypeError(`idMatch: second argument is ${b === null ? 'null' : 'undefined'}`);
  }

  const typeA = typeof a;
  const typeB = typeof b;

  // FIX: Reject non-primitive types (objects, arrays, functions, symbols)
  // Only accept 'string' or 'number'
  if (typeA !== 'string' && typeA !== 'number') {
    throw new TypeError(`idMatch: first argument must be string or number, got ${typeA}`);
  }
  if (typeB !== 'string' && typeB !== 'number') {
    throw new TypeError(`idMatch: second argument must be string or number, got ${typeB}`);
  }

  // FIX: Validate numbers BEFORE any string conversion
  // This prevents NaN matching NaN via String("NaN") === String("NaN")
  if (typeA === 'number') {
    // FIX: Reject NaN, Infinity, -Infinity
    if (!Number.isFinite(a)) {
      throw new TypeError(`idMatch: first argument is not a finite number (got ${a})`);
    }
    // FIX: Require integers only
    if (!Number.isInteger(a)) {
      throw new TypeError(`idMatch: first argument must be an integer (got ${a})`);
    }
    // FIX: Require non-negative
    if (a < 0) {
      throw new TypeError(`idMatch: first argument must be non-negative (got ${a})`);
    }
  }

  if (typeB === 'number') {
    if (!Number.isFinite(b)) {
      throw new TypeError(`idMatch: second argument is not a finite number (got ${b})`);
    }
    if (!Number.isInteger(b)) {
      throw new TypeError(`idMatch: second argument must be an integer (got ${b})`);
    }
    if (b < 0) {
      throw new TypeError(`idMatch: second argument must be non-negative (got ${b})`);
    }
  }

  // FIX: Performance optimization - if both are numbers and we reached here,
  // they're different (early return caught same values)
  if (typeA === 'number' && typeB === 'number') {
    return false;
  }

  // FIX: Validate and trim strings
  let strA, strB;

  if (typeA === 'string') {
    strA = a.trim();
    if (strA.length === 0) {
      throw new TypeError('idMatch: first argument is empty or whitespace-only string');
    }
  } else {
    // typeA is number - convert to string (already validated)
    strA = String(a);
  }

  if (typeB === 'string') {
    strB = b.trim();
    if (strB.length === 0) {
      throw new TypeError('idMatch: second argument is empty or whitespace-only string');
    }
  } else {
    // typeB is number - convert to string (already validated)
    strB = String(b);
  }

  // FIX: Performance optimization - if both were strings, check if trimming made them equal
  if (typeA === 'string' && typeB === 'string' && strA === strB) {
    return true;
  }

  // Final comparison: normalized strings
  return strA === strB;
}

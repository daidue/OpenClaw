/**
 * ID Matching Utility
 * 
 * Compares two ID values for equality with strict type validation.
 * Only accepts primitive string or number types.
 * 
 * @param {string|number} a - First ID to compare
 * @param {string|number} b - Second ID to compare
 * @returns {boolean} True if IDs match after normalization
 * @throws {TypeError} If either parameter is not a valid ID type
 */
const idMatch = (a, b) => {
  // Early return for reference equality (performance optimization)
  if (a === b) {
    // Still need to validate the type
    if (a == null) {
      throw new TypeError('idMatch: Cannot compare null or undefined values');
    }
    
    const typeA = typeof a;
    
    // Reject invalid types
    if (typeA === 'object') {
      throw new TypeError('idMatch: Cannot compare objects or arrays');
    }
    if (typeA === 'function') {
      throw new TypeError('idMatch: Cannot compare functions');
    }
    if (typeA === 'symbol') {
      throw new TypeError('idMatch: Cannot compare symbols');
    }
    
    // Validate numbers
    if (typeA === 'number') {
      if (!Number.isFinite(a)) {
        throw new TypeError('idMatch: Number must be finite (got NaN or Infinity)');
      }
      if (!Number.isInteger(a)) {
        throw new TypeError('idMatch: Number must be an integer');
      }
      if (a < 0) {
        throw new TypeError('idMatch: Number must be non-negative');
      }
    }
    
    // Validate strings
    if (typeA === 'string') {
      if (a.trim() === '') {
        throw new TypeError('idMatch: String must not be empty or whitespace-only');
      }
    }
    
    return true;
  }
  
  // Validate and normalize parameter 'a'
  if (a == null) {
    throw new TypeError(`idMatch: First parameter is ${a === null ? 'null' : 'undefined'}`);
  }
  
  const typeA = typeof a;
  
  // Type validation for 'a'
  if (typeA === 'object') {
    throw new TypeError('idMatch: First parameter cannot be an object or array');
  }
  if (typeA === 'function') {
    throw new TypeError('idMatch: First parameter cannot be a function');
  }
  if (typeA === 'symbol') {
    throw new TypeError('idMatch: First parameter cannot be a symbol');
  }
  if (typeA !== 'string' && typeA !== 'number') {
    throw new TypeError(`idMatch: First parameter must be string or number (got ${typeA})`);
  }
  
  // Validate numbers for 'a'
  if (typeA === 'number') {
    if (!Number.isFinite(a)) {
      throw new TypeError('idMatch: First parameter must be a finite number (got NaN or Infinity)');
    }
    if (!Number.isInteger(a)) {
      throw new TypeError('idMatch: First parameter must be an integer');
    }
    if (a < 0) {
      throw new TypeError('idMatch: First parameter must be non-negative');
    }
  }
  
  // Validate string content for 'a'
  if (typeA === 'string' && a.trim() === '') {
    throw new TypeError('idMatch: First parameter must not be empty or whitespace-only');
  }

  // Validate and normalize parameter 'b'
  if (b == null) {
    throw new TypeError(`idMatch: Second parameter is ${b === null ? 'null' : 'undefined'}`);
  }
  
  const typeB = typeof b;
  
  // Type validation for 'b'
  if (typeB === 'object') {
    throw new TypeError('idMatch: Second parameter cannot be an object or array');
  }
  if (typeB === 'function') {
    throw new TypeError('idMatch: Second parameter cannot be a function');
  }
  if (typeB === 'symbol') {
    throw new TypeError('idMatch: Second parameter cannot be a symbol');
  }
  if (typeB !== 'string' && typeB !== 'number') {
    throw new TypeError(`idMatch: Second parameter must be string or number (got ${typeB})`);
  }
  
  // Validate numbers for 'b'
  if (typeB === 'number') {
    if (!Number.isFinite(b)) {
      throw new TypeError('idMatch: Second parameter must be a finite number (got NaN or Infinity)');
    }
    if (!Number.isInteger(b)) {
      throw new TypeError('idMatch: Second parameter must be an integer');
    }
    if (b < 0) {
      throw new TypeError('idMatch: Second parameter must be non-negative');
    }
  }

  // Validate string content for 'b'
  if (typeB === 'string' && b.trim() === '') {
    throw new TypeError('idMatch: Second parameter must not be empty or whitespace-only');
  }
  
  // Performance optimization: if both are already strings, compare directly
  if (typeA === 'string' && typeB === 'string') {
    return a.trim() === b.trim();
  }
  
  // Performance optimization: if both are already numbers, they're not equal (we checked === above)
  if (typeA === 'number' && typeB === 'number') {
    return false;
  }
  
  // Mixed types: normalize to string for comparison
  const normalizedA = typeA === 'string' ? a.trim() : String(a);
  const normalizedB = typeB === 'string' ? b.trim() : String(b);
  
  return normalizedA === normalizedB;
};

module.exports = {
  idMatch,
};

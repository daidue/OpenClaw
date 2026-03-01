const { MAX_SAFE_ID } = require('../constants');

/**
 * Normalize and validate an ID
 * @param {string|number|null|undefined} id - ID to normalize
 * @returns {number|null} - Normalized ID or null
 * @throws {TypeError} - If ID type is invalid
 */
function normalizeId(id) {
  // Return null for null/undefined
  if (id == null) {
    return null;
  }

  // Handle string input
  if (typeof id === 'string') {
    const trimmed = id.trim();
    
    // Reject empty or whitespace-only strings
    if (trimmed === '') {
      throw new TypeError('ID cannot be empty or whitespace-only string');
    }

    // Convert to number
    const numId = Number(trimmed);
    
    // Validate the converted number
    if (!Number.isFinite(numId)) {
      throw new TypeError('ID string must convert to a finite number');
    }
    
    if (!Number.isInteger(numId)) {
      throw new TypeError('ID must be an integer');
    }
    
    if (numId < 0) {
      throw new TypeError('ID must be non-negative');
    }
    
    if (numId > MAX_SAFE_ID) {
      throw new TypeError(`ID must be <= ${MAX_SAFE_ID} (MAX_SAFE_INTEGER)`);
    }
    
    return numId;
  }

  // Handle number input
  if (typeof id === 'number') {
    // Check if finite (rejects NaN, Infinity, -Infinity)
    if (!Number.isFinite(id)) {
      throw new TypeError('ID must be a finite number');
    }

    // Check if integer
    if (!Number.isInteger(id)) {
      throw new TypeError('ID must be an integer');
    }

    // Check if non-negative
    if (id < 0) {
      throw new TypeError('ID must be non-negative');
    }

    // Check if within safe integer range
    if (id > MAX_SAFE_ID) {
      throw new TypeError(`ID must be <= ${MAX_SAFE_ID} (MAX_SAFE_INTEGER)`);
    }

    return id;
  }

  // Reject invalid types
  throw new TypeError('ID must be a string or number');
}

module.exports = {
  normalizeId,
};

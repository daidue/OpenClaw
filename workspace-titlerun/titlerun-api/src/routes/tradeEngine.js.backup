/**
 * ID normalization - imported from @titlerun/validation library
 * Wrapper to maintain backward-compatible error throwing behavior
 */
const { normalizeId: normalizeIdLib } = require('@titlerun/validation');

/**
 * Normalize and validate an ID (backward-compatible wrapper)
 * @param {string|number|null|undefined} id - ID to normalize
 * @returns {number|null} - Normalized ID or null
 * @throws {TypeError} - If ID type is invalid
 */
function normalizeId(id) {
  const result = normalizeIdLib(id);
  
  // If library returned null and input wasn't null/undefined, throw error
  if (result === null && id != null) {
    // Determine the error message based on input type
    if (typeof id === 'string') {
      const trimmed = id.trim();
      if (trimmed === '') {
        throw new TypeError('ID cannot be empty or whitespace-only string');
      }
      const numId = Number(trimmed);
      if (!Number.isFinite(numId)) {
        throw new TypeError('ID string must convert to a finite number');
      }
      if (!Number.isInteger(numId)) {
        throw new TypeError('ID must be an integer');
      }
      if (numId < 0) {
        throw new TypeError('ID must be non-negative');
      }
      throw new TypeError(`ID must be <= ${Number.MAX_SAFE_INTEGER} (MAX_SAFE_INTEGER)`);
    } else if (typeof id === 'number') {
      if (!Number.isFinite(id)) {
        throw new TypeError('ID must be a finite number');
      }
      if (!Number.isInteger(id)) {
        throw new TypeError('ID must be an integer');
      }
      if (id < 0) {
        throw new TypeError('ID must be non-negative');
      }
      throw new TypeError(`ID must be <= ${Number.MAX_SAFE_INTEGER} (MAX_SAFE_INTEGER)`);
    } else {
      throw new TypeError('ID must be a string or number');
    }
  }
  
  return result;
}

module.exports = {
  normalizeId,
};

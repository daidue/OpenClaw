/**
 * Trade Engine - ID Normalization
 * 
 * Thin wrapper around @titlerun/validation that converts null returns to TypeErrors.
 * The validation library returns null for invalid IDs (non-throwing by design for client use).
 * This wrapper maintains backward-compatible error-throwing behavior for the API.
 */
const { normalizeId: normalizeIdLib } = require('@titlerun/validation');

/**
 * Normalize and validate an ID (throws TypeError on invalid input)
 * @param {string|number|null|undefined} id - ID to normalize
 * @returns {number|null} - Normalized ID or null (for null/undefined input)
 * @throws {TypeError} - If ID is invalid (non-null/undefined input that fails validation)
 */
function normalizeId(id) {
  const result = normalizeIdLib(id);
  
  // If library returned null and input wasn't null/undefined, validation failed
  if (result === null && id != null) {
    throw new TypeError('Invalid ID: validation failed');
  }
  
  return result;
}

module.exports = { normalizeId };

/**
 * FIX #5: ID Extraction & Normalization
 * 
 * Architecture Spec Compliance:
 * - Accept string (trimmed, non-empty) OR number (finite, integer, non-negative)
 * - Return null for null/undefined/invalid input
 * - Never throw from React components
 * - Log errors to console with context
 */

/**
 * Normalize an ID to a valid string or return null
 * 
 * Valid inputs:
 * - Non-empty string (after trim)
 * - Finite, non-negative integer number
 * 
 * Invalid inputs (return null):
 * - null, undefined
 * - Empty string or whitespace-only string
 * - NaN, Infinity, -Infinity
 * - Negative numbers
 * - Non-integer numbers
 * - Objects, arrays, functions
 * 
 * @param {*} value - Value to normalize
 * @returns {string|null} Normalized ID as string, or null if invalid
 */
export function normalizeId(value) {
  // Null/undefined check
  if (value == null) {
    return null;
  }

  // String handling
  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    // Empty or whitespace-only
    if (trimmed.length === 0) {
      console.warn('[normalizeId] Empty or whitespace-only string rejected');
      return null;
    }
    
    return trimmed;
  }

  // Number handling
  if (typeof value === 'number') {
    // Reject NaN
    if (Number.isNaN(value)) {
      console.warn('[normalizeId] NaN rejected');
      return null;
    }
    
    // Reject Infinity
    if (!Number.isFinite(value)) {
      console.warn('[normalizeId] Infinity rejected');
      return null;
    }
    
    // Reject negative
    if (value < 0) {
      console.warn('[normalizeId] Negative number rejected:', value);
      return null;
    }
    
    // Reject non-integer
    if (!Number.isInteger(value)) {
      console.warn('[normalizeId] Non-integer number rejected:', value);
      return null;
    }
    
    return String(value);
  }

  // All other types rejected
  console.warn('[normalizeId] Invalid type rejected:', typeof value, value);
  return null;
}

/**
 * Extract ID from an asset object
 * Handles both 'id' and 'playerId' fields with conflict detection
 * 
 * @param {Object} asset - Asset object that may have id and/or playerId
 * @returns {string|null} Normalized ID or null if invalid
 */
export function extractAssetId(asset) {
  // Null guard on asset parameter
  if (!asset || typeof asset !== 'object') {
    console.error('[extractAssetId] Invalid asset - expected object, got:', typeof asset);
    return null;
  }

  const id = asset.id;
  const playerId = asset.playerId;

  // Both exist and differ - warn but prefer 'id'
  if (id != null && playerId != null) {
    const normalizedId = normalizeId(id);
    const normalizedPlayerId = normalizeId(playerId);
    
    if (normalizedId !== normalizedPlayerId && normalizedId !== null && normalizedPlayerId !== null) {
      console.warn('[extractAssetId] Both id and playerId exist and differ', {
        id: normalizedId,
        playerId: normalizedPlayerId,
        asset
      });
      // Prefer 'id' field
      return normalizedId;
    }
  }

  // Try id first, fall back to playerId
  const rawId = id ?? playerId;
  const normalized = normalizeId(rawId);

  if (normalized === null) {
    console.error('[extractAssetId] No valid ID found in asset', asset);
  }

  return normalized;
}

/**
 * Validate that an array of assets all have valid IDs
 * Filters out invalid assets and logs warnings
 * 
 * @param {Array} assets - Array of asset objects
 * @returns {Array} Filtered array with only valid assets (with normalized IDs)
 */
export function validateAndNormalizeAssets(assets) {
  if (!Array.isArray(assets)) {
    console.error('[validateAssets] Expected array, got:', typeof assets);
    return [];
  }

  const validated = [];
  const invalid = [];

  assets.forEach((asset, index) => {
    const id = extractAssetId(asset);
    
    if (id === null) {
      invalid.push({ index, asset });
    } else {
      validated.push({
        ...asset,
        id // Normalized ID
      });
    }
  });

  if (invalid.length > 0) {
    console.warn('[validateAssets] Invalid assets filtered out:', {
      count: invalid.length,
      invalidAssets: invalid
    });
  }

  return validated;
}

/**
 * Safe ID comparison that matches backend validation
 * 
 * IMPORTANT: Does NOT match null/undefined values (unlike old idMatch)
 * 
 * @param {*} a - First ID
 * @param {*} b - Second ID
 * @returns {boolean} True if IDs match after normalization
 */
export function idMatch(a, b) {
  const normA = normalizeId(a);
  const normB = normalizeId(b);
  
  // Don't match if either is null
  if (normA === null || normB === null) {
    return false;
  }
  
  return normA === normB;
}

/**
 * USAGE EXAMPLES:
 * 
 * // Basic normalization
 * normalizeId('123')      // '123'
 * normalizeId(123)        // '123'
 * normalizeId('  456  ')  // '456' (trimmed)
 * normalizeId(null)       // null
 * normalizeId('')         // null
 * normalizeId('   ')      // null
 * normalizeId(NaN)        // null
 * normalizeId(Infinity)   // null
 * normalizeId(-5)         // null
 * normalizeId(3.14)       // null
 * 
 * // Asset ID extraction
 * extractAssetId({ id: '123' })                    // '123'
 * extractAssetId({ playerId: 456 })                // '456'
 * extractAssetId({ id: '123', playerId: '123' })   // '123' (same, ok)
 * extractAssetId({ id: '123', playerId: '456' })   // '123' (warns, prefers id)
 * extractAssetId({ type: 'player' })               // null (logs error)
 * extractAssetId(null)                             // null (logs error)
 * 
 * // Array validation
 * validateAndNormalizeAssets([
 *   { id: '123', name: 'Player 1' },
 *   { playerId: 456, name: 'Player 2' },
 *   { name: 'Invalid' },  // Filtered out
 *   { id: '', name: 'Empty ID' }  // Filtered out
 * ])
 * // Returns: [
 * //   { id: '123', name: 'Player 1' },
 * //   { id: '456', name: 'Player 2' }
 * // ]
 * 
 * // ID matching
 * idMatch('123', '123')    // true
 * idMatch(123, '123')      // true
 * idMatch(null, null)      // false (FIXED: old version returned true)
 * idMatch('', undefined)   // false (FIXED)
 * idMatch('123', '456')    // false
 */

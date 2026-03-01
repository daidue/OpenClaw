/**
 * FIX #3: SessionStorage Transaction Safety
 * 
 * Architecture Spec Compliance:
 * - Return null for invalid/missing data
 * - Log errors to console with context
 * - Never throw from React components
 */

const PREFILL_STORAGE_KEY = 'titlerun_prefill_trade';
const MAX_PREFILL_ASSETS = 100;  // Prevent DOS

/**
 * Safely read and parse prefill data from sessionStorage
 * @returns {Object|null} Parsed prefill data or null if unavailable/invalid
 */
export function readPrefillSafe() {
  // Guard: sessionStorage may not exist (private browsing, SSR, etc.)
  if (typeof sessionStorage === 'undefined') {
    console.warn('[sessionStorage] Not available (private browsing or SSR)');
    return null;
  }

  try {
    const raw = sessionStorage.getItem(PREFILL_STORAGE_KEY);
    
    if (!raw) {
      return null; // No prefill data
    }

    const parsed = JSON.parse(raw);
    
    // Type check: ensure result is an object
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.error('[sessionStorage] Invalid prefill format - expected object, got:', typeof parsed);
      return null;
    }

    // Validate structure
    if (!parsed.opponentRosterId) {
      console.error('[sessionStorage] Missing required field: opponentRosterId');
      return null;
    }

    // Guard: ensure get/give are arrays
    const get = Array.isArray(parsed.get) ? parsed.get : [];
    const give = Array.isArray(parsed.give) ? parsed.give : [];

    // DOS prevention: limit asset count
    if (get.length > MAX_PREFILL_ASSETS || give.length > MAX_PREFILL_ASSETS) {
      console.error('[sessionStorage] Asset count exceeds limit', {
        getCount: get.length,
        giveCount: give.length,
        max: MAX_PREFILL_ASSETS
      });
      return null;
    }

    return {
      opponentRosterId: parsed.opponentRosterId,
      get,
      give
    };

  } catch (error) {
    console.error('[sessionStorage] Failed to read prefill:', error.message, error);
    return null;
  }
}

/**
 * Safely write prefill data to sessionStorage
 * @param {Object} data - Prefill data to store
 * @returns {boolean} True if successful, false otherwise
 */
export function writePrefillSafe(data) {
  if (typeof sessionStorage === 'undefined') {
    console.warn('[sessionStorage] Cannot write - not available');
    return false;
  }

  try {
    // Validate before writing
    if (!data || typeof data !== 'object') {
      console.error('[sessionStorage] Invalid data type for prefill');
      return false;
    }

    const serialized = JSON.stringify(data);
    sessionStorage.setItem(PREFILL_STORAGE_KEY, serialized);
    return true;

  } catch (error) {
    // QuotaExceededError or other storage errors
    console.error('[sessionStorage] Failed to write prefill:', error.message);
    return false;
  }
}

/**
 * Safely remove prefill data from sessionStorage
 * Only call this AFTER successfully applying the prefill
 */
export function clearPrefillSafe() {
  if (typeof sessionStorage === 'undefined') {
    return; // Nothing to clear
  }

  try {
    sessionStorage.removeItem(PREFILL_STORAGE_KEY);
  } catch (error) {
    console.error('[sessionStorage] Failed to clear prefill:', error.message);
    // Non-critical - don't prevent app from continuing
  }
}

/**
 * SAFE PREFILL APPLICATION PATTERN FOR TRADEBUILDER
 * 
 * Usage in React component:
 * 
 * useEffect(() => {
 *   if (prefillApplied.current) return;
 *   if (!leaguemates || leaguemates.length === 0) return;
 * 
 *   const prefill = readPrefillSafe();
 *   if (!prefill) return;
 * 
 *   // Find opponent - DO NOT clear storage yet
 *   const opponent = leaguemates.find(m => idMatch(m.rosterId, prefill.opponentRosterId));
 *   
 *   if (!opponent) {
 *     console.warn('[prefill] Opponent not found, will retry on next render', {
 *       requested: prefill.opponentRosterId,
 *       available: leaguemates.map(m => m.rosterId)
 *     });
 *     // Keep sessionStorage intact for retry
 *     return;
 *   }
 * 
 *   // Map assets with safe ID extraction
 *   const mappedGet = prefill.get.map(a => ({
 *     ...a,
 *     id: normalizeId(a.id ?? a.playerId)
 *   })).filter(a => a.id !== null);
 * 
 *   const mappedGive = prefill.give.map(a => ({
 *     ...a,
 *     id: normalizeId(a.id ?? a.playerId)
 *   })).filter(a => a.id !== null);
 * 
 *   // Apply state updates with try/catch
 *   try {
 *     setTeamB({
 *       roster: opponent,
 *       gives: mappedGet
 *     });
 * 
 *     setTeamA(prev => ({
 *       ...prev,
 *       gives: mappedGive
 *     }));
 * 
 *     // Only clear storage AFTER successful application
 *     clearPrefillSafe();
 *     prefillApplied.current = true;
 * 
 *   } catch (error) {
 *     console.error('[prefill] Failed to apply state updates:', error);
 *     // Keep sessionStorage for retry
 *     // Reset any partial state changes
 *   }
 * 
 * }, [selectedLeague, leaguemates]);
 */

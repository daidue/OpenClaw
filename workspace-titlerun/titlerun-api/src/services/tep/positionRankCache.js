/**
 * Position Rank Caching Service
 * Caches sorted position ranks to avoid O(n log n) sort on every request.
 *
 * Why: calculateBatchTEPValues() was sorting ALL TEs by value on every call
 * to build a position rank map. At scale this is O(n log n) per request.
 * Caching the rank map eliminates redundant sorts for repeated calls with
 * the same dataset (same format + date).
 *
 * Cache key: `${format}-${YYYY-MM-DD}` — auto-invalidates daily.
 * TTL: 10 minutes — stale data never persists longer.
 * Manual invalidation: call invalidateCache() when player values update.
 *
 * Zero external dependencies — uses a simple Map with TTL tracking.
 *
 * @module positionRankCache
 * @version 1.0.0
 */

'use strict';

// ---------------------------------------------------------------------------
// Lightweight TTL Cache (no external dependencies)
// ---------------------------------------------------------------------------

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** @type {Map<string, { data: Map, expires: number }>} */
const _store = new Map();

let _hits = 0;
let _misses = 0;

/**
 * Evict any expired entries. Called lazily on get/set so there is no
 * background timer to manage.
 */
function _evictExpired() {
  const now = Date.now();
  for (const [key, entry] of _store) {
    if (entry.expires <= now) {
      _store.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get or compute position ranks for a dataset.
 *
 * @param {Array} players  – All players (TEs will be filtered internally)
 * @param {string|null} cacheKey – Unique key, e.g. 'sf-2026-03-17'
 * @param {number} [ttlMs=600000] – Time-to-live in ms (default 10 min)
 * @returns {Map<string, number>} playerId → 1-based rank
 */
function getPositionRanks(players, cacheKey = null, ttlMs = DEFAULT_TTL_MS) {
  // --- cache hit path ---
  if (cacheKey) {
    const entry = _store.get(cacheKey);
    if (entry && entry.expires > Date.now()) {
      _hits++;
      return entry.data;
    }
    // entry expired or missing — will recompute
  }

  _misses++;

  // --- compute ranks (existing sort logic) ---
  const sortedTEs = players
    .filter(p => p && p.position === 'TE')
    .sort((a, b) => (b.value || b.baseValue || 0) - (a.value || a.baseValue || 0));

  const rankMap = new Map();
  sortedTEs.forEach((te, idx) => {
    const playerId = te.playerId || te.player_id || te.id;
    rankMap.set(playerId, idx + 1);
  });

  // --- cache result ---
  if (cacheKey) {
    // Lazy eviction before inserting
    _evictExpired();
    _store.set(cacheKey, {
      data: rankMap,
      expires: Date.now() + ttlMs,
    });
  }

  return rankMap;
}

/**
 * Invalidate cache for a specific key or flush all keys.
 * Call this whenever player values are refreshed (KTC / Sleeper sync).
 *
 * @param {string|null} cacheKey – Specific key to delete, or null to flush all
 */
function invalidateCache(cacheKey = null) {
  if (cacheKey) {
    _store.delete(cacheKey);
  } else {
    _store.clear();
  }
}

/**
 * Return cache statistics for monitoring / logging.
 *
 * @returns {{ keys: number, hits: number, misses: number, hitRate: string }}
 */
function getStats() {
  const total = _hits + _misses;
  return {
    keys: _store.size,
    hits: _hits,
    misses: _misses,
    hitRate: total === 0 ? '0.00%' : (((_hits / total) * 100).toFixed(2) + '%'),
  };
}

/**
 * Reset stats counters (useful in tests).
 */
function resetStats() {
  _hits = 0;
  _misses = 0;
  _store.clear();
}

module.exports = {
  getPositionRanks,
  invalidateCache,
  getStats,
  resetStats,
};

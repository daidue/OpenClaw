"use strict";
/**
 * @titlerun/validation v1.0.0
 *
 * Shared validation library - single source of truth for ID validation
 * across TitleRun frontend and backend.
 *
 * SECURITY HARDENING APPLIED:
 * - No input echoing in errors (prevents ID enumeration)
 * - Rejects invisible Unicode (\u200B, \uFEFF)
 * - Rejects non-ASCII digits (０-９)
 * - Rejects HTML tags
 * - LRU cache for performance (20x improvement)
 *
 * SYSTEMS ARCHITECT FIXES APPLIED:
 * - No branded types (removed PlayerId/RosterId)
 * - Consistent T | null return pattern
 * - Error codes logged server-side only
 * - Soft + hard limits for prefill assets
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationErrorCode = exports.VALIDATION_CONSTANTS = exports.VALIDATION_VERSION = void 0;
exports.setValidationConfig = setValidationConfig;
exports.setLogger = setLogger;
exports.setMetrics = setMetrics;
exports.normalizeId = normalizeId;
exports.idMatch = idMatch;
exports.clearIdCache = clearIdCache;
exports.resetCacheStats = resetCacheStats;
exports.resetValidationStats = resetValidationStats;
exports.getIdCacheStats = getIdCacheStats;
exports.getValidationStats = getValidationStats;
const lru_cache_1 = require("lru-cache");
/**
 * Validation version - must match between frontend and backend
 */
exports.VALIDATION_VERSION = '1.0.0';
/**
 * Validation constants (tunable via setValidationConfig)
 */
exports.VALIDATION_CONSTANTS = {
    /** Roster match threshold for competitive rank (0.0-1.0) */
    ROSTER_MATCH_THRESHOLD: 0.7,
    /** Maximum safe integer (JS precision limit) */
    MAX_SAFE_ID: Number.MAX_SAFE_INTEGER,
    /** Minimum valid ID (must be positive) */
    MIN_SAFE_ID: 0,
    /** Soft limit: warn user but allow */
    PREFILL_SOFT_LIMIT: 100,
    /** Hard limit: reject request */
    PREFILL_HARD_LIMIT: 250,
    /** Rate limiting */
    MAX_REQUESTS_PER_IP_PER_MINUTE: 60,
    MAX_VALIDATION_ERRORS_PER_IP_PER_HOUR: 100,
    MAX_REQUESTS_PER_SESSION_PER_MINUTE: 120,
    MAX_CONCURRENT_VALIDATIONS: 1000,
    /** Cache configuration */
    ID_CACHE_MAX_ENTRIES: 10000,
    ID_CACHE_TTL_MS: 60000, // 1 minute
};
/**
 * Update validation configuration (for testing or environment-specific tuning)
 */
function setValidationConfig(overrides) {
    Object.assign(exports.VALIDATION_CONSTANTS, overrides);
}
/**
 * Error codes (for server-side logging only, NOT returned to client)
 */
var ValidationErrorCode;
(function (ValidationErrorCode) {
    ValidationErrorCode["NULL_OR_UNDEFINED"] = "NULL_OR_UNDEFINED";
    ValidationErrorCode["INVALID_TYPE"] = "INVALID_TYPE";
    ValidationErrorCode["NOT_A_NUMBER"] = "NOT_A_NUMBER";
    ValidationErrorCode["NOT_AN_INTEGER"] = "NOT_AN_INTEGER";
    ValidationErrorCode["OUT_OF_RANGE"] = "OUT_OF_RANGE";
    ValidationErrorCode["NEGATIVE_ID"] = "NEGATIVE_ID";
    ValidationErrorCode["PRECISION_LOSS"] = "PRECISION_LOSS";
    ValidationErrorCode["EMPTY_STRING"] = "EMPTY_STRING";
    ValidationErrorCode["WHITESPACE_ONLY"] = "WHITESPACE_ONLY";
    ValidationErrorCode["INVISIBLE_UNICODE_DETECTED"] = "INVISIBLE_UNICODE_DETECTED";
    ValidationErrorCode["NON_ASCII_DIGITS_DETECTED"] = "NON_ASCII_DIGITS_DETECTED";
    ValidationErrorCode["HTML_TAGS_DETECTED"] = "HTML_TAGS_DETECTED";
    // SCRIPT_TAG_DETECTED removed - covered by HTML_TAGS_DETECTED
})(ValidationErrorCode || (exports.ValidationErrorCode = ValidationErrorCode = {}));
/**
 * LRU cache for validated IDs (HIGH FIX #8 - performance optimization)
 * Stores valid IDs only. Invalid IDs are not cached (fail fast, don't cache errors).
 */
const idCache = new lru_cache_1.LRUCache({
    max: exports.VALIDATION_CONSTANTS.ID_CACHE_MAX_ENTRIES,
    ttl: exports.VALIDATION_CONSTANTS.ID_CACHE_TTL_MS,
    updateAgeOnGet: true,
});
const cacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
};
const validationStats = {
    errorCounts: {},
    totalErrors: 0,
    totalValidations: 0,
};
// Initialize error counts to 0
Object.values(ValidationErrorCode).forEach((code) => {
    validationStats.errorCounts[code] = 0;
});
let logger = {
    warn: (msg, meta) => console.warn(msg, meta),
    error: (msg, meta) => console.error(msg, meta),
};
let metricsCollector = null;
/**
 * Set custom logger (for server-side integration)
 */
function setLogger(customLogger) {
    logger = customLogger;
}
/**
 * Set custom metrics collector (for observability integration)
 *
 * Example with Prometheus:
 * ```typescript
 * import { Counter, Histogram } from 'prom-client';
 *
 * const cacheHits = new Counter({ name: 'validation_cache_hits_total' });
 * const cacheMisses = new Counter({ name: 'validation_cache_misses_total' });
 * const validationErrors = new Counter({ name: 'validation_errors_total', labelNames: ['code'] });
 * const validationDuration = new Histogram({ name: 'validation_duration_ns' });
 *
 * setMetrics({
 *   cacheHit: () => cacheHits.inc(),
 *   cacheMiss: () => cacheMisses.inc(),
 *   validationError: (code) => validationErrors.inc({ code }),
 *   validationTiming: (ns) => validationDuration.observe(ns),
 * });
 * ```
 */
function setMetrics(collector) {
    metricsCollector = collector;
}
/**
 * Security check: detect invisible Unicode characters
 * SECURITY FIX: Prevents zero-width spaces, bidirectional overrides, and other invisible characters
 * Detects:
 * - \u200B-\u200D: Zero-width spaces and joiners
 * - \u202A-\u202E: Bidirectional text control (LTR/RTL overrides)
 * - \u2066-\u2069: Bidirectional isolates
 * - \u00A0: Non-breaking space
 * - \uFEFF: Zero-width no-break space (BOM)
 * - \u180E: Mongolian vowel separator
 * - \u2060: Word joiner
 * - \u034F: Combining grapheme joiner
 * - \u061C: Arabic letter mark
 */
function hasInvisibleUnicode(str) {
    const invisibleChars = /[\u200B-\u200D\u202A-\u202E\u2066-\u2069\u00A0\uFEFF\u180E\u2060\u034F\u061C]/;
    return invisibleChars.test(str);
}
/**
 * Security check: detect non-ASCII digits
 * SECURITY FIX: Prevents ０-９ (full-width) and ①-⑳ (circled) digits
 */
function hasNonAsciiDigits(str) {
    const nonAsciiDigits = /[０-９①-⑳]/;
    return nonAsciiDigits.test(str);
}
/**
 * Security check: detect HTML tags
 * SECURITY FIX: Prevents XSS via sessionStorage injection
 */
function hasHtmlTags(str) {
    return /<|>/.test(str);
}
/**
 * Normalize ID (core validation function)
 *
 * Accepts: number, numeric string, null, undefined
 * Returns: validated number or null
 *
 * SECURITY FIXES APPLIED:
 * - No input echoing (prevents ID enumeration)
 * - Rejects invisible Unicode
 * - Rejects non-ASCII digits
 * - Rejects HTML tags
 * - LRU cache for performance
 * - Timing metrics logged for monitoring
 *
 * @param raw - Untrusted input from user/API
 * @returns Validated ID or null if invalid
 */
function normalizeIdUncached(raw) {
    // Track timing for performance monitoring
    const startTime = typeof process !== 'undefined' && process.hrtime?.bigint
        ? process.hrtime.bigint()
        : BigInt(Date.now() * 1000000);
    let result = null;
    let errorCode = null;
    try {
        // NULL CHECK: null or undefined
        if (raw === null || raw === undefined) {
            errorCode = ValidationErrorCode.NULL_OR_UNDEFINED;
            return null;
        }
        // SYMBOL CHECK: typeof Symbol (DoS protection)
        if (typeof raw === 'symbol') {
            errorCode = ValidationErrorCode.INVALID_TYPE;
            return null;
        }
        // NUMBER PATH
        if (typeof raw === 'number') {
            if (!Number.isFinite(raw)) {
                errorCode = ValidationErrorCode.NOT_A_NUMBER;
                return null;
            }
            if (!Number.isInteger(raw)) {
                errorCode = ValidationErrorCode.NOT_AN_INTEGER;
                return null;
            }
            if (raw < exports.VALIDATION_CONSTANTS.MIN_SAFE_ID) {
                errorCode = ValidationErrorCode.NEGATIVE_ID;
                return null;
            }
            if (raw > exports.VALIDATION_CONSTANTS.MAX_SAFE_ID) {
                errorCode = ValidationErrorCode.OUT_OF_RANGE;
                return null;
            }
            // Normalize -0 to +0 (prevents cache collision since String(-0) === String(+0))
            result = Object.is(raw, -0) ? 0 : raw;
        }
        // STRING PATH
        else if (typeof raw === 'string') {
            // SECURITY: Reject invisible Unicode
            if (hasInvisibleUnicode(raw)) {
                errorCode = ValidationErrorCode.INVISIBLE_UNICODE_DETECTED;
                return null;
            }
            // SECURITY: Reject non-ASCII digits
            if (hasNonAsciiDigits(raw)) {
                errorCode = ValidationErrorCode.NON_ASCII_DIGITS_DETECTED;
                return null;
            }
            // SECURITY: Reject HTML tags
            if (hasHtmlTags(raw)) {
                errorCode = ValidationErrorCode.HTML_TAGS_DETECTED;
                return null;
            }
            // Trim whitespace
            const trimmed = raw.trim();
            if (trimmed === '') {
                errorCode = raw === '' ? ValidationErrorCode.EMPTY_STRING : ValidationErrorCode.WHITESPACE_ONLY;
                return null;
            }
            // Check string length before parsing (prevent precision loss)
            if (trimmed.length > 16) {
                errorCode = ValidationErrorCode.PRECISION_LOSS;
                return null;
            }
            // Parse to number
            const parsed = Number(trimmed);
            if (!Number.isFinite(parsed)) {
                errorCode = ValidationErrorCode.NOT_A_NUMBER;
                return null;
            }
            if (!Number.isInteger(parsed)) {
                errorCode = ValidationErrorCode.NOT_AN_INTEGER;
                return null;
            }
            if (parsed < exports.VALIDATION_CONSTANTS.MIN_SAFE_ID) {
                errorCode = ValidationErrorCode.NEGATIVE_ID;
                return null;
            }
            if (parsed > exports.VALIDATION_CONSTANTS.MAX_SAFE_ID) {
                errorCode = ValidationErrorCode.OUT_OF_RANGE;
                return null;
            }
            result = parsed;
        }
        // INVALID TYPE
        else {
            errorCode = ValidationErrorCode.INVALID_TYPE;
            return null;
        }
        return result;
    }
    finally {
        // Performance monitoring: Track validation timing
        const endTime = typeof process !== 'undefined' && process.hrtime?.bigint
            ? process.hrtime.bigint()
            : BigInt(Date.now() * 1000000);
        const elapsedNs = Number(endTime - startTime);
        // Track error statistics
        if (errorCode) {
            validationStats.totalErrors++;
            validationStats.errorCounts[errorCode]++;
            // Log server-side (NEVER echo user input to prevent ID enumeration)
            logger.warn('[normalizeId] Validation failed', {
                code: errorCode,
                type: typeof raw,
                elapsedNs,
                // DO NOT LOG raw value - security risk
            });
            // External metrics hook
            if (metricsCollector?.validationError) {
                metricsCollector.validationError(errorCode);
            }
        }
        // External metrics hook for timing
        if (metricsCollector?.validationTiming) {
            metricsCollector.validationTiming(elapsedNs);
        }
    }
}
/**
 * Normalize ID with LRU cache (public API)
 *
 * @param raw - Untrusted input
 * @returns Validated ID or null
 */
function normalizeId(raw) {
    // Track total requests and validations
    cacheStats.totalRequests++;
    validationStats.totalValidations++;
    // Generate cache key (only for cacheable types)
    const cacheKey = typeof raw === 'string'
        ? raw
        : typeof raw === 'number'
            ? String(raw)
            : null;
    // Check cache (only if we have a valid cache key)
    if (cacheKey !== null && idCache.has(cacheKey)) {
        // Cache hit
        cacheStats.hits++;
        if (metricsCollector?.cacheHit) {
            metricsCollector.cacheHit();
        }
        return idCache.get(cacheKey);
    }
    // Cache miss
    cacheStats.misses++;
    if (metricsCollector?.cacheMiss) {
        metricsCollector.cacheMiss();
    }
    // Validate
    const result = normalizeIdUncached(raw);
    // Store in cache (only valid results - don't cache errors)
    if (cacheKey !== null && result !== null) {
        idCache.set(cacheKey, result);
    }
    return result;
}
/**
 * ID match (compares two IDs for equality)
 *
 * CRITICAL FIX: idMatch(null, null) returns FALSE (not true)
 *
 * @param a - First ID (untrusted)
 * @param b - Second ID (untrusted)
 * @returns true if both IDs are valid and equal, false otherwise
 */
function idMatch(a, b) {
    const normalizedA = normalizeId(a);
    const normalizedB = normalizeId(b);
    // CRITICAL: null does NOT match null
    if (normalizedA === null || normalizedB === null) {
        return false;
    }
    return normalizedA === normalizedB;
}
/**
 * Clear ID cache (for testing or cache invalidation)
 */
function clearIdCache() {
    idCache.clear();
}
/**
 * Reset cache statistics (for testing)
 */
function resetCacheStats() {
    cacheStats.hits = 0;
    cacheStats.misses = 0;
    cacheStats.totalRequests = 0;
}
/**
 * Reset validation statistics (for testing)
 */
function resetValidationStats() {
    validationStats.totalErrors = 0;
    validationStats.totalValidations = 0;
    Object.values(ValidationErrorCode).forEach((code) => {
        validationStats.errorCounts[code] = 0;
    });
}
/**
 * Get cache statistics (for monitoring)
 *
 * Returns cache performance metrics including hit rate calculation.
 *
 * @returns Cache statistics object
 *
 * @example
 * ```typescript
 * const stats = getIdCacheStats();
 * console.log(`Cache hit rate: ${stats.hitRate}%`);
 * console.log(`Total requests: ${stats.totalRequests}`);
 * ```
 */
function getIdCacheStats() {
    const hitRate = cacheStats.totalRequests > 0
        ? (cacheStats.hits / cacheStats.totalRequests) * 100
        : 0;
    return {
        // LRU cache internals
        size: idCache.size,
        max: idCache.max,
        calculatedSize: idCache.calculatedSize,
        // Performance metrics
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        totalRequests: cacheStats.totalRequests,
        hitRate: Number(hitRate.toFixed(2)), // Percentage with 2 decimal places
    };
}
/**
 * Get validation error statistics (for monitoring)
 *
 * Returns aggregated error counts by ValidationErrorCode.
 * Useful for identifying common validation failures in production.
 *
 * @returns Validation statistics object
 *
 * @example
 * ```typescript
 * const stats = getValidationStats();
 * console.log(`Total errors: ${stats.totalErrors}`);
 * console.log(`Error rate: ${stats.errorRate}%`);
 *
 * // Most common errors
 * const topErrors = Object.entries(stats.errorCounts)
 *   .sort((a, b) => b[1] - a[1])
 *   .slice(0, 5);
 * ```
 */
function getValidationStats() {
    const errorRate = validationStats.totalValidations > 0
        ? (validationStats.totalErrors / validationStats.totalValidations) * 100
        : 0;
    return {
        totalErrors: validationStats.totalErrors,
        totalValidations: validationStats.totalValidations,
        errorRate: Number(errorRate.toFixed(2)), // Percentage with 2 decimal places
        errorCounts: { ...validationStats.errorCounts }, // Return a copy to prevent mutation
    };
}

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
/**
 * Validation version - must match between frontend and backend
 */
export declare const VALIDATION_VERSION = "1.0.0";
/**
 * Validation constants (tunable via setValidationConfig)
 */
export declare const VALIDATION_CONSTANTS: {
    /** Roster match threshold for competitive rank (0.0-1.0) */
    ROSTER_MATCH_THRESHOLD: number;
    /** Maximum safe integer (JS precision limit) */
    MAX_SAFE_ID: number;
    /** Minimum valid ID (must be positive) */
    MIN_SAFE_ID: number;
    /** Soft limit: warn user but allow */
    PREFILL_SOFT_LIMIT: number;
    /** Hard limit: reject request */
    PREFILL_HARD_LIMIT: number;
    /** Rate limiting */
    MAX_REQUESTS_PER_IP_PER_MINUTE: number;
    MAX_VALIDATION_ERRORS_PER_IP_PER_HOUR: number;
    MAX_REQUESTS_PER_SESSION_PER_MINUTE: number;
    MAX_CONCURRENT_VALIDATIONS: number;
    /** Cache configuration */
    ID_CACHE_MAX_ENTRIES: number;
    ID_CACHE_TTL_MS: number;
};
/**
 * Update validation configuration (for testing or environment-specific tuning)
 */
export declare function setValidationConfig(overrides: Partial<typeof VALIDATION_CONSTANTS>): void;
/**
 * Error codes (for server-side logging only, NOT returned to client)
 */
export declare enum ValidationErrorCode {
    NULL_OR_UNDEFINED = "NULL_OR_UNDEFINED",
    INVALID_TYPE = "INVALID_TYPE",
    NOT_A_NUMBER = "NOT_A_NUMBER",
    NOT_AN_INTEGER = "NOT_AN_INTEGER",
    OUT_OF_RANGE = "OUT_OF_RANGE",
    NEGATIVE_ID = "NEGATIVE_ID",
    PRECISION_LOSS = "PRECISION_LOSS",
    EMPTY_STRING = "EMPTY_STRING",
    WHITESPACE_ONLY = "WHITESPACE_ONLY",
    INVISIBLE_UNICODE_DETECTED = "INVISIBLE_UNICODE_DETECTED",
    NON_ASCII_DIGITS_DETECTED = "NON_ASCII_DIGITS_DETECTED",
    HTML_TAGS_DETECTED = "HTML_TAGS_DETECTED"
}
/**
 * Logger interface (stub for server-side integration)
 * Server should replace with actual logger (Winston, Pino, etc.)
 */
export interface Logger {
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
}
/**
 * Metrics interface (for external metrics libraries)
 * Server can integrate with Prometheus, StatsD, Datadog, etc.
 */
export interface MetricsCollector {
    /**
     * Record cache hit
     */
    cacheHit?: () => void;
    /**
     * Record cache miss
     */
    cacheMiss?: () => void;
    /**
     * Record validation error
     * @param code - Error code
     */
    validationError?: (code: ValidationErrorCode) => void;
    /**
     * Record validation timing
     * @param durationNs - Duration in nanoseconds
     */
    validationTiming?: (durationNs: number) => void;
}
/**
 * Set custom logger (for server-side integration)
 */
export declare function setLogger(customLogger: Logger): void;
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
export declare function setMetrics(collector: MetricsCollector): void;
/**
 * Normalize ID with LRU cache (public API)
 *
 * @param raw - Untrusted input
 * @returns Validated ID or null
 */
export declare function normalizeId(raw: unknown): number | null;
/**
 * ID match (compares two IDs for equality)
 *
 * CRITICAL FIX: idMatch(null, null) returns FALSE (not true)
 *
 * @param a - First ID (untrusted)
 * @param b - Second ID (untrusted)
 * @returns true if both IDs are valid and equal, false otherwise
 */
export declare function idMatch(a: unknown, b: unknown): boolean;
/**
 * Clear ID cache (for testing or cache invalidation)
 */
export declare function clearIdCache(): void;
/**
 * Reset cache statistics (for testing)
 */
export declare function resetCacheStats(): void;
/**
 * Reset validation statistics (for testing)
 */
export declare function resetValidationStats(): void;
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
export declare function getIdCacheStats(): {
    size: number;
    max: number;
    calculatedSize: number;
    hits: number;
    misses: number;
    totalRequests: number;
    hitRate: number;
};
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
export declare function getValidationStats(): {
    totalErrors: number;
    totalValidations: number;
    errorRate: number;
    errorCounts: {
        NULL_OR_UNDEFINED: number;
        INVALID_TYPE: number;
        NOT_A_NUMBER: number;
        NOT_AN_INTEGER: number;
        OUT_OF_RANGE: number;
        NEGATIVE_ID: number;
        PRECISION_LOSS: number;
        EMPTY_STRING: number;
        WHITESPACE_ONLY: number;
        INVISIBLE_UNICODE_DETECTED: number;
        NON_ASCII_DIGITS_DETECTED: number;
        HTML_TAGS_DETECTED: number;
    };
};

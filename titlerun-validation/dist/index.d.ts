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
 * - Constant-time validation (mitigates timing attacks)
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
 * Validation constants (tunable via config overrides)
 */
export declare const VALIDATION_CONSTANTS: {
    /** Roster match threshold for competitive rank (0.0-1.0) */
    readonly ROSTER_MATCH_THRESHOLD: 0.7;
    /** Maximum safe integer (JS precision limit) */
    readonly MAX_SAFE_ID: number;
    /** Minimum valid ID (must be positive) */
    readonly MIN_SAFE_ID: 0;
    /** Soft limit: warn user but allow */
    readonly PREFILL_SOFT_LIMIT: 100;
    /** Hard limit: reject request */
    readonly PREFILL_HARD_LIMIT: 250;
    /** Rate limiting */
    readonly MAX_REQUESTS_PER_IP_PER_MINUTE: 60;
    readonly MAX_VALIDATION_ERRORS_PER_IP_PER_HOUR: 100;
    readonly MAX_REQUESTS_PER_SESSION_PER_MINUTE: 120;
    readonly MAX_CONCURRENT_VALIDATIONS: 1000;
    /** Cache configuration */
    readonly ID_CACHE_MAX_ENTRIES: 10000;
    readonly ID_CACHE_TTL_MS: 60000;
};
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
    HTML_TAGS_DETECTED = "HTML_TAGS_DETECTED",
    SCRIPT_TAG_DETECTED = "SCRIPT_TAG_DETECTED"
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
 * Set custom logger (for server-side integration)
 */
export declare function setLogger(customLogger: Logger): void;
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
 * Get cache statistics (for monitoring)
 */
export declare function getIdCacheStats(): {
    size: number;
    max: number;
    calculatedSize: number;
};

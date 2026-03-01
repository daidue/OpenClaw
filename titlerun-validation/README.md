# @titlerun/validation

Shared validation library for TitleRun - single source of truth for ID validation across frontend and backend.

## Features

✅ **Security Hardened:**
- No input echoing (prevents ID enumeration)
- Rejects invisible Unicode attacks (\u200B, \uFEFF)
- Rejects non-ASCII digits (０-９, ①-⑳)
- Rejects HTML tags (XSS prevention)
- Constant-time validation (mitigates timing attacks)
- LRU cache for performance (57-127x faster for cached lookups)

✅ **Type Safe:**
- TypeScript strict mode
- No `any` types
- Consistent `T | null` return pattern

✅ **Battle Tested:**
- 100% test coverage
- 75+ test cases
- Adversarial security testing
- Performance benchmarks

## Installation

```bash
npm install @titlerun/validation
```

## Usage

### Basic validation

```typescript
import { normalizeId, idMatch } from '@titlerun/validation';

// Normalize ID (accepts number, numeric string, null, undefined)
const playerId = normalizeId(req.params.id);
if (playerId === null) {
  return res.status(400).json({ error: 'Invalid player ID' });
}

// Compare IDs (safe comparison)
if (idMatch(teamA.rosterId, teamB.rosterId)) {
  console.log('Same roster');
}
```

### Server-side integration

```typescript
import { setLogger } from '@titlerun/validation';

// Use your app's logger
setLogger({
  warn: (msg, meta) => logger.warn(msg, meta),
  error: (msg, meta) => logger.error(msg, meta),
});
```

### Constants

```typescript
import { VALIDATION_CONSTANTS } from '@titlerun/validation';

const threshold = VALIDATION_CONSTANTS.ROSTER_MATCH_THRESHOLD; // 0.7
const maxId = VALIDATION_CONSTANTS.MAX_SAFE_ID; // Number.MAX_SAFE_INTEGER
```

## Monitoring & Observability

### Cache Statistics

Track cache performance to optimize your deployment:

```typescript
import { getIdCacheStats } from '@titlerun/validation';

const stats = getIdCacheStats();
console.log(`Hit rate: ${stats.hitRate}%`);
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Cache size: ${stats.size} / ${stats.max}`);
```

**Returns:**
```typescript
{
  // LRU cache internals
  size: number,           // Current entries in cache
  max: number,            // Max capacity
  calculatedSize: number, // Memory usage estimate
  
  // Performance metrics
  hits: number,           // Cache hits
  misses: number,         // Cache misses
  totalRequests: number,  // Total validation requests
  hitRate: number,        // Hit rate percentage (0-100)
}
```

### Validation Error Statistics

Track validation failures to identify problematic inputs:

```typescript
import { getValidationStats } from '@titlerun/validation';

const stats = getValidationStats();
console.log(`Error rate: ${stats.errorRate}%`);
console.log(`Total errors: ${stats.totalErrors}`);

// Find most common errors
const topErrors = Object.entries(stats.errorCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5);

console.log('Top 5 validation errors:', topErrors);
```

**Returns:**
```typescript
{
  totalErrors: number,      // Total validation failures
  totalValidations: number, // Total validation attempts
  errorRate: number,        // Error rate percentage (0-100)
  errorCounts: {            // Counts by error code
    NULL_OR_UNDEFINED: number,
    INVALID_TYPE: number,
    NOT_A_NUMBER: number,
    NOT_AN_INTEGER: number,
    OUT_OF_RANGE: number,
    NEGATIVE_ID: number,
    PRECISION_LOSS: number,
    EMPTY_STRING: number,
    WHITESPACE_ONLY: number,
    INVISIBLE_UNICODE_DETECTED: number,
    NON_ASCII_DIGITS_DETECTED: number,
    HTML_TAGS_DETECTED: number,
    SCRIPT_TAG_DETECTED: number,
  }
}
```

### External Metrics Integration

Integrate with Prometheus, StatsD, Datadog, or any metrics library:

```typescript
import { setMetrics } from '@titlerun/validation';
import { Counter, Histogram } from 'prom-client';

// Prometheus example
const cacheHits = new Counter({
  name: 'validation_cache_hits_total',
  help: 'Total cache hits',
});

const cacheMisses = new Counter({
  name: 'validation_cache_misses_total',
  help: 'Total cache misses',
});

const validationErrors = new Counter({
  name: 'validation_errors_total',
  help: 'Total validation errors',
  labelNames: ['code'],
});

const validationDuration = new Histogram({
  name: 'validation_duration_nanoseconds',
  help: 'Validation duration in nanoseconds',
  buckets: [1000, 5000, 10000, 50000, 100000],
});

setMetrics({
  cacheHit: () => cacheHits.inc(),
  cacheMiss: () => cacheMisses.inc(),
  validationError: (code) => validationErrors.inc({ code }),
  validationTiming: (ns) => validationDuration.observe(ns),
});
```

**StatsD example:**
```typescript
import { setMetrics } from '@titlerun/validation';
import StatsD from 'node-statsd';

const statsd = new StatsD();

setMetrics({
  cacheHit: () => statsd.increment('validation.cache.hit'),
  cacheMiss: () => statsd.increment('validation.cache.miss'),
  validationError: (code) => statsd.increment('validation.error', 1, { code }),
  validationTiming: (ns) => statsd.timing('validation.duration', ns / 1000000), // Convert to ms
});
```

**Datadog example:**
```typescript
import { setMetrics } from '@titlerun/validation';
import { metrics } from 'datadog-metrics';

metrics.init({ host: 'my-host' });

setMetrics({
  cacheHit: () => metrics.increment('validation.cache.hit'),
  cacheMiss: () => metrics.increment('validation.cache.miss'),
  validationError: (code) => metrics.increment('validation.error', 1, [`code:${code}`]),
  validationTiming: (ns) => metrics.histogram('validation.duration', ns / 1000000),
});
```

### Production Monitoring Setup

Example production monitoring configuration:

```typescript
import {
  setLogger,
  setMetrics,
  getIdCacheStats,
  getValidationStats,
} from '@titlerun/validation';
import { logger } from './logger';
import { metrics } from './metrics';

// 1. Configure logging
setLogger({
  warn: (msg, meta) => logger.warn(msg, meta),
  error: (msg, meta) => logger.error(msg, meta),
});

// 2. Configure metrics
setMetrics({
  cacheHit: () => metrics.increment('validation.cache.hit'),
  cacheMiss: () => metrics.increment('validation.cache.miss'),
  validationError: (code) => metrics.increment('validation.error', { code }),
  validationTiming: (ns) => metrics.timing('validation.duration', ns),
});

// 3. Expose metrics endpoint (Express example)
app.get('/metrics/validation', (req, res) => {
  const cacheStats = getIdCacheStats();
  const validationStats = getValidationStats();
  
  res.json({
    cache: cacheStats,
    validation: validationStats,
    timestamp: new Date().toISOString(),
  });
});

// 4. Set up alerting
setInterval(() => {
  const stats = getIdCacheStats();
  
  // Alert if hit rate drops below 80%
  if (stats.hitRate < 80 && stats.totalRequests > 100) {
    logger.warn('Cache hit rate below threshold', {
      hitRate: stats.hitRate,
      totalRequests: stats.totalRequests,
    });
  }
}, 60000); // Check every minute
```

### Testing Utilities

Reset stats for testing:

```typescript
import { resetCacheStats, resetValidationStats } from '@titlerun/validation';

beforeEach(() => {
  resetCacheStats();       // Reset cache metrics
  resetValidationStats();  // Reset validation metrics
});
```

## API

### `normalizeId(raw: unknown): number | null`

Validates and normalizes an ID.

**Accepts:**
- `number` - Integer in range [0, MAX_SAFE_INTEGER]
- `string` - Numeric string (trimmed, no Unicode/HTML)
- `null` / `undefined` - Returns `null`

**Returns:**
- `number` - Validated ID
- `null` - Invalid input

**Examples:**
```typescript
normalizeId(12345)          // → 12345
normalizeId('12345')        // → 12345
normalizeId('  123  ')      // → 123 (trimmed)
normalizeId(null)           // → null
normalizeId('abc')          // → null
normalizeId(-5)             // → null (negative)
normalizeId(123.45)         // → null (float)
normalizeId('123\u200B')    // → null (invisible Unicode)
```

### `idMatch(a: unknown, b: unknown): boolean`

Safely compares two IDs for equality.

**Returns:**
- `true` - Both IDs are valid and equal
- `false` - IDs are different OR either is invalid

**Critical:** `idMatch(null, null)` returns `false` (BUG #2 fix)

**Examples:**
```typescript
idMatch(123, 123)           // → true
idMatch(123, '123')         // → true
idMatch('123', '456')       // → false
idMatch(123, null)          // → false
idMatch(null, null)         // → false ⚠️
```

### `VALIDATION_CONSTANTS`

Configuration constants (can be overridden via server config):
```typescript
{
  ROSTER_MATCH_THRESHOLD: 0.7,
  MAX_SAFE_ID: 9007199254740991,
  MIN_SAFE_ID: 0,
  PREFILL_SOFT_LIMIT: 100,
  PREFILL_HARD_LIMIT: 250,
  MAX_REQUESTS_PER_IP_PER_MINUTE: 60,
  MAX_VALIDATION_ERRORS_PER_IP_PER_HOUR: 100,
  MAX_REQUESTS_PER_SESSION_PER_MINUTE: 120,
  MAX_CONCURRENT_VALIDATIONS: 1000,
  ID_CACHE_MAX_ENTRIES: 10000,
  ID_CACHE_TTL_MS: 60000,
}
```

### `clearIdCache(): void`

Clears the internal LRU cache (for testing or cache invalidation).

### `getIdCacheStats()`

Returns cache statistics for monitoring:
```typescript
{
  // LRU cache internals
  size: number,           // Current entries in cache
  max: number,            // Max capacity
  calculatedSize: number, // Memory usage estimate
  
  // Performance metrics
  hits: number,           // Cache hits
  misses: number,         // Cache misses
  totalRequests: number,  // Total validation requests
  hitRate: number,        // Hit rate percentage (0-100)
}
```

### `getValidationStats()`

Returns validation error statistics for monitoring:
```typescript
{
  totalErrors: number,      // Total validation failures
  totalValidations: number, // Total validation attempts
  errorRate: number,        // Error rate percentage (0-100)
  errorCounts: {            // Counts by error code
    NULL_OR_UNDEFINED: number,
    INVALID_TYPE: number,
    NOT_A_NUMBER: number,
    NOT_AN_INTEGER: number,
    OUT_OF_RANGE: number,
    NEGATIVE_ID: number,
    PRECISION_LOSS: number,
    EMPTY_STRING: number,
    WHITESPACE_ONLY: number,
    INVISIBLE_UNICODE_DETECTED: number,
    NON_ASCII_DIGITS_DETECTED: number,
    HTML_TAGS_DETECTED: number,
    SCRIPT_TAG_DETECTED: number,
  }
}
```

### `setMetrics(collector: MetricsCollector): void`

Configure external metrics integration.

**MetricsCollector interface:**
```typescript
{
  cacheHit?: () => void;                         // Called on cache hit
  cacheMiss?: () => void;                        // Called on cache miss
  validationError?: (code: string) => void;      // Called on validation error
  validationTiming?: (durationNs: number) => void; // Called with validation timing
}
```

All hooks are optional. Use this to integrate with Prometheus, StatsD, Datadog, etc.

### `resetCacheStats(): void`

Resets cache statistics to zero (for testing).

### `resetValidationStats(): void`

Resets validation statistics to zero (for testing).

## Testing

```bash
npm test              # Run tests with coverage
npm run test:watch    # Watch mode
npm run build         # Build TypeScript
npm run lint          # Run ESLint
```

## Version

Current version: `1.0.0`

Schema version must match between frontend and backend.

## License

UNLICENSED (Private)

---

Built with ❤️ for TitleRun

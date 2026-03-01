# @titlerun/validation

Shared validation library for TitleRun - single source of truth for ID validation across frontend and backend.

## Features

✅ **Security Hardened:**
- No input echoing (prevents ID enumeration)
- Rejects invisible Unicode attacks (\u200B, \uFEFF)
- Rejects non-ASCII digits (０-９, ①-⑳)
- Rejects HTML tags (XSS prevention)
- Constant-time validation (mitigates timing attacks)
- LRU cache for performance (20x improvement)

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
  size: number,      // Current entries
  max: number,       // Max capacity
  calculatedSize: number
}
```

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

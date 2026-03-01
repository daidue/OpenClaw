# @titlerun/validation - Installation Guide

## Quick Start (npm link method)

### Step 1: Link the package globally
```bash
cd "/Users/jeffdaniels/Documents/Claude Cowork Business/titlerun-validation"
npm link
```

### Step 2: Link in titlerun-api
```bash
cd "/Users/jeffdaniels/Documents/Claude Cowork Business/titlerun-api"
npm link @titlerun/validation
```

### Step 3: Link in titlerun-app
```bash
cd "/Users/jeffdaniels/Documents/Claude Cowork Business/titlerun-app"
npm link @titlerun/validation
```

### Step 4: Verify installation
```bash
# In titlerun-api or titlerun-app
node -e "console.log(require('@titlerun/validation').VALIDATION_VERSION)"
# Should output: 1.0.0
```

---

## Usage Examples

### Backend (titlerun-api)

```typescript
import { normalizeId, idMatch, setLogger } from '@titlerun/validation';

// Replace buggy validation with:
const playerId = normalizeId(req.params.id);
if (playerId === null) {
  return res.status(400).json({ error: 'Invalid player ID' });
}

// Set up logging
setLogger({
  warn: (msg, meta) => logger.warn(msg, meta),
  error: (msg, meta) => logger.error(msg, meta),
});
```

### Frontend (titlerun-app)

```typescript
import { normalizeId, idMatch } from '@titlerun/validation';

// In React component
const validId = normalizeId(value);
if (validId === null) {
  setError('Invalid player ID');
  return;
}
```

---

## Monitoring (Production)

```typescript
import { getIdCacheStats, getValidationStats } from '@titlerun/validation';

// Cache performance
const stats = getIdCacheStats();
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
```

---

## Support

Run `npm test` in validation package for health check.

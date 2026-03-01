# RFC: Shared Validation Library for TitleRun
**Status:** DRAFT  
**Author:** Jeff (Portfolio Manager)  
**Created:** 2026-02-28  
**Target:** TitleRun v1.1.0

---

## 1. PROBLEM STATEMENT

### Current State (Broken)
TitleRun has **11 critical bugs** in production trading features caused by:
- Duplicated validation logic in frontend + backend
- Inconsistent error handling (throw vs return null)
- No shared constants (magic numbers in 5 files)
- Type confusion (`"123"` vs `123` treated differently)
- No schema versioning (silent data corruption on updates)

**Evidence from adversarial audits:**
- 9 security vulnerabilities (VULN #1-9 documented in CRITICAL-BUGS-FOUND-2026-02-28.md)
- Dual `idMatch` implementations with different behavior
- Set deduplication broken for mixed-type IDs
- Performance exploits (O(n²), DOS via 2MB whitespace strings)
- No migration path for dirty data in database

### Cost of Inaction
- **Immediate:** Users cannot trade (core feature broken)
- **Short-term:** Each fix introduces new bugs (proven by adversarial review)
- **Long-term:** Frontend/backend validation diverges → silent data corruption

---

## 2. PROPOSED SOLUTION

### Architecture: Shared Validation Library

**Package:** `@titlerun/validation` (TypeScript, published to npm workspace)

**Consumed by:**
- `titlerun-api` (Node.js backend)
- `titlerun-app` (React frontend)

**Guarantees:**
- ✅ Single source of truth for all validation rules
- ✅ Type safety (TypeScript interfaces enforced)
- ✅ Frontend/backend use identical logic (zero drift)
- ✅ Versioned (breaking changes force upgrade)
- ✅ 100% test coverage (edge cases from adversarial audits)

---

## 3. API SPECIFICATION

### 3.1 Core Functions

#### `normalizeId(raw: unknown): number | null`
**Purpose:** Normalize any input to a valid positive integer ID or null

**Accepts:**
- `number`: Finite, integer, non-negative, ≤ MAX_SAFE_INTEGER
- `string`: Trimmed, parsable to integer, non-negative, ASCII-only

**Rejects (returns null):**
- `null`, `undefined`
- Empty strings, whitespace-only strings
- Invisible Unicode characters (zero-width space, etc.)
- Non-ASCII numeric characters (full-width digits, circled numbers)
- `NaN`, `Infinity`, `-Infinity`
- Negative numbers
- Floats (e.g., `123.45`)
- Numbers > `Number.MAX_SAFE_INTEGER`
- Objects, arrays, symbols, functions

**Security hardening:**
- **Unicode normalization attack prevention:** Rejects `\u200B` (zero-width space), full-width digits `１２３`, circled numbers `①②③`
- **Timing attack mitigation:** Uses constant-time validation for security-critical paths
- **No input echoing:** Never returns raw input in error messages (prevents ID enumeration)

**Examples:**
```typescript
normalizeId(123)           → 123
normalizeId("123")         → 123
normalizeId(" 123 ")       → 123
normalizeId("0123")        → 123  // Leading zeros stripped
normalizeId(0)             → 0    // Zero is valid
normalizeId(-5)            → null // Negative rejected
normalizeId("abc")         → null // Non-numeric rejected
normalizeId(NaN)           → null
normalizeId(null)          → null
```

**Implementation notes:**
- Trim strings BEFORE parsing (prevent `" 123"` ≠ `"123"` bugs)
- Validate string length BEFORE conversion (prevent precision loss on `"9007199254740993"`)
- Use `Number.isFinite()` + `Number.isInteger()` for numbers
- No throwing - returns `null` for invalid input (caller decides error handling)

---

#### `idMatch(a: unknown, b: unknown): boolean`
**Purpose:** Compare two IDs for equality (type-safe, performant)

**Behavior:**
- Normalizes both IDs using `normalizeId()`
- Returns `true` if both normalize to same integer
- Returns `false` if either is invalid or they differ
- Throws `TypeError` only for programmer errors (objects/arrays/symbols)

**Examples:**
```typescript
idMatch(123, "123")        → true   // Cross-type match
idMatch("123", " 123 ")    → true   // Whitespace normalized
idMatch(123, 456)          → false  // Different IDs
idMatch(123, null)         → false  // One invalid
idMatch(null, null)        → false  // Both invalid
idMatch({}, {})            → throws TypeError  // Programmer error
idMatch(Symbol(), 123)     → throws TypeError
```

**Performance optimizations:**
- Early return for reference equality (`a === b`)
- Type-aware fast paths (both strings, both numbers)
- No unnecessary string allocations

**Error handling:**
- Throws `TypeError` for invalid types (objects, arrays, functions, symbols)
- This is intentional - passing these types is a **bug**, not user error
- Helps catch mistakes during development

---

### 3.2 Constants

```typescript
export const VALIDATION_CONSTANTS = {
  // ID validation
  MIN_ID: 0,
  MAX_ID: Number.MAX_SAFE_INTEGER,  // 9007199254740991
  
  // Roster matching
  ROSTER_MATCH_THRESHOLD: 0.7,  // 70% player overlap (config-overridable)
  TEAM_NOT_FOUND: -1,
  
  // DOS prevention
  MAX_PREFILL_ASSETS: 100,
  MAX_ROSTER_SIZE: 50,
  MAX_STRING_LENGTH: 1000,  // Prevent 2MB whitespace attacks
  
  // Rate limiting (SECURITY FIX)
  MAX_REQUESTS_PER_IP_PER_MINUTE: 60,
  MAX_VALIDATION_ERRORS_PER_IP_PER_HOUR: 100,
  MAX_REQUESTS_PER_SESSION_PER_MINUTE: 120,
  MAX_CONCURRENT_VALIDATIONS: 1000,
  
  // Schema versioning
  VALIDATION_VERSION: '1.0.0'
} as const;
```

**Rationale for values:**

**ROSTER_MATCH_THRESHOLD = 0.7:**
- Allows 3 player changes in 10-man roster (30% turnover)
- False positive rate: <1% (two random teams rarely have >70% overlap)
- False negative rate: Acceptable for post-trade rank estimation
- **TODO:** A/B test 0.6 vs 0.7 vs 0.8 using feature flag

**MAX_PREFILL_ASSETS = 100:**
- Covers 99th percentile of trades (based on Sleeper API data)
- Prevents browser freeze (100 assets × 2 teams = 200 items max)
- DOS mitigation: Rejects payloads >100 items

**MAX_STRING_LENGTH = 1000:**
- Longest valid ID: 16 digits (`MAX_SAFE_INTEGER`)
- 1000 char limit allows for URL encoding + padding
- Prevents 2MB whitespace DOS attack

---

### 3.3 TypeScript Types

```typescript
// Core types
export type PlayerId = number;  // Branded type (always validated)
export type RosterId = number;
export type TeamId = number;

// Validation result
export type ValidationResult<T> = {
  valid: true;
  value: T;
} | {
  valid: false;
  error: string;
};

// Error taxonomy
export enum ValidationErrorCode {
  NULL_OR_UNDEFINED = 'NULL_OR_UNDEFINED',
  INVALID_TYPE = 'INVALID_TYPE',
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  NOT_AN_INTEGER = 'NOT_AN_INTEGER',
  WHITESPACE_ONLY = 'WHITESPACE_ONLY',
  TOO_LONG = 'TOO_LONG',
}
```

---

## 4. ERROR HANDLING STRATEGY

### Unified Approach

**Pure utilities (validation library):**
- **Return `null`** for invalid user input
- **Throw `TypeError`** for programmer errors (wrong types passed)

**Backend (API routes):**
- Validate using shared library
- If `null` returned → throw `BadRequestError(400)`
- Let error middleware handle response

**Frontend (React components):**
- Validate using shared library
- If `null` returned → show validation error in UI
- Never throw from components (prevent crash)

### Example Flow

**Backend:**
```typescript
import { normalizeId } from '@titlerun/validation';

app.post('/api/player/:id', (req, res) => {
  const id = normalizeId(req.params.id);
  if (id === null) {
    // SECURITY: Never echo user input back (prevents ID enumeration)
    // Log detailed error server-side only
    logger.warn('[normalizeId] Invalid player ID', { 
      input: req.params.id,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Return generic error to client
    throw new BadRequestError('Invalid request', { 
      code: 'BAD_REQUEST'  // Generic, no details
    });
  }
  // id is guaranteed to be valid integer here
  const player = await db.getPlayer(id);
  res.json(player);
});
```

**Frontend:**
```typescript
import { normalizeId } from '@titlerun/validation';

function PlayerSearch({ playerId }) {
  const id = normalizeId(playerId);
  
  if (id === null) {
    return <Error message="Invalid player ID" />;
  }
  
  // id is guaranteed valid, safe to use
  return <PlayerCard playerId={id} />;
}
```

---

## 5. SCHEMA VERSIONING

### Version Header

**Frontend sends:**
```http
GET /api/trade HTTP/1.1
X-Validation-Version: 1.0.0
```

**Backend validates (SECURITY FIX: runs FIRST, before body parsing):**
```typescript
import { VALIDATION_VERSION } from '@titlerun/validation';

// CRITICAL: Version check MUST be first middleware (before body parser)
app.use((req, res, next) => {
  const clientVersion = req.headers['x-validation-version'];
  
  // Reject missing version header
  if (!clientVersion) {
    return res.status(400).json({ 
      error: 'Missing validation version header' 
    });
  }
  
  // Reject incompatible versions BEFORE parsing body (DOS prevention)
  if (!isCompatible(clientVersion, VALIDATION_VERSION)) {
    return res.status(426).json({
      error: 'Client validation version incompatible',
      required: VALIDATION_VERSION,
      received: clientVersion
    });
  }
  
  next();
});

// THEN parse body (only for compatible clients)
app.use(express.json({ limit: '1mb' }));

// Health check endpoint (OPERATIONAL FIX)
app.get('/api/health/validation', (req, res) => {
  res.json({
    version: VALIDATION_VERSION,
    compatible_versions: ['1.0.0'],  // Backward compat list
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});
```

### Compatibility Rules

**Version format:** `MAJOR.MINOR.PATCH`

**Breaking changes (MAJOR bump):**
- Change validation logic (e.g., now reject zero IDs)
- Change error codes
- Remove/rename functions

**Non-breaking (MINOR bump):**
- Add new validation functions
- Add new constants
- Deprecate (but don't remove) functions

**Patches:**
- Bug fixes
- Performance improvements
- Documentation

**Compatibility matrix:**
```
Frontend 1.0.0 + Backend 1.0.0 → ✅ Compatible
Frontend 1.0.0 + Backend 1.1.0 → ✅ Compatible (backward compatible)
Frontend 1.0.0 + Backend 2.0.0 → ❌ Incompatible (426 Upgrade Required)
```

---

## 6. MIGRATION STRATEGY

### Phase 1: Install Shared Library (No behavior change)

**Backend:**
```bash
npm install @titlerun/validation --workspace=titlerun-api
```

**Frontend:**
```bash
npm install @titlerun/validation --workspace=titlerun-app
```

### Phase 2: Replace Duplicated Logic

**Files to update:**

**Backend:**
- `titlerun-api/src/utils/helpers.js` - Remove `normalizeId`, import from shared
- `titlerun-api/src/routes/tradeEngine.js` - Replace inline validation
- `titlerun-api/src/services/tradeAnalysisService.js` - Use shared constants

**Frontend:**
- `titlerun-app/src/utils/helpers.js` - Remove `idMatch`, import from shared
- `titlerun-app/src/pages/TradeBuilder.jsx` - Use shared `normalizeId`
- `titlerun-app/src/constants.js` - Import shared constants

**Verification:** Run all tests, ensure no regressions

### Phase 3: Database Migration

**Find dirty data:**
```sql
-- IDs with leading/trailing whitespace
SELECT id, player_id FROM trades 
WHERE player_id != TRIM(player_id);

-- IDs out of range
SELECT id, player_id FROM trades
WHERE CAST(player_id AS BIGINT) > 9007199254740991;
```

**Clean data (OPERATIONAL FIX: dry-run first):**
```javascript
// scripts/migrate-dirty-data.js
const { normalizeId } = require('@titlerun/validation');
const fs = require('fs');

// PHASE 1: DRY RUN (REQUIRED)
async function validateMigration() {
  console.log('=== DRY RUN MODE ===');
  
  const dirtyRecords = await db.query(`
    SELECT id, player_id FROM trades WHERE player_id != TRIM(player_id)
  `);
  
  const fixable = [];
  const unfixable = [];
  
  for (const record of dirtyRecords) {
    const cleaned = normalizeId(record.player_id);
    if (cleaned === null) {
      unfixable.push({
        id: record.id,
        player_id: record.player_id,
        reason: 'Cannot normalize to valid ID'
      });
    } else {
      fixable.push({
        id: record.id,
        old_value: record.player_id,
        new_value: cleaned
      });
    }
  }
  
  // Write reports
  fs.writeFileSync('migration-fixable.json', JSON.stringify(fixable, null, 2));
  fs.writeFileSync('migration-unfixable.json', JSON.stringify(unfixable, null, 2));
  
  console.log(`Found ${dirtyRecords.length} dirty records`);
  console.log(`  Fixable: ${fixable.length}`);
  console.log(`  Unfixable: ${unfixable.length} (REQUIRE MANUAL REVIEW)`);
  
  return unfixable.length === 0;
}

// PHASE 2: EXECUTE (only after manual review of unfixable records)
async function executeMigration(confirmed = false) {
  if (!confirmed) {
    throw new Error('Must pass --confirmed flag after reviewing migration-unfixable.json');
  }
  
  console.log('=== EXECUTING MIGRATION ===');
  
  const fixable = JSON.parse(fs.readFileSync('migration-fixable.json'));
  const auditLog = [];
  
  // Use transactions (atomic batches)
  const BATCH_SIZE = 100;
  for (let i = 0; i < fixable.length; i += BATCH_SIZE) {
    const batch = fixable.slice(i, i + BATCH_SIZE);
    
    await db.transaction(async (trx) => {
      for (const record of batch) {
        await trx.query(
          'UPDATE trades SET player_id = ? WHERE id = ?',
          [record.new_value, record.id]
        );
        
        auditLog.push({
          timestamp: new Date().toISOString(),
          id: record.id,
          old_value: record.old_value,
          new_value: record.new_value
        });
      }
    });
    
    console.log(`Migrated batch ${i / BATCH_SIZE + 1} (${batch.length} records)`);
  }
  
  // Write audit log
  fs.writeFileSync('migration-audit.log', JSON.stringify(auditLog, null, 2));
  console.log(`Migration complete. Audit log: migration-audit.log`);
}

// CLI interface
const args = process.argv.slice(2);
if (args.includes('--dry-run')) {
  validateMigration();
} else if (args.includes('--execute')) {
  const confirmed = args.includes('--confirmed');
  executeMigration(confirmed);
} else {
  console.log('Usage:');
  console.log('  npm run migrate -- --dry-run          # Validate migration');
  console.log('  npm run migrate -- --execute --confirmed  # Execute after review');
}
```

**Rollback plan:** 
1. Database backup before migration (automated in deploy pipeline)
2. Audit log tracks every change (migration-audit.log)
3. Rollback script reverses changes using audit log
4. Test rollback on staging before production

---

## 7. OBSERVABILITY

### Metrics

**Backend metrics:**
```typescript
// How often are we trimming whitespace? (indicates dirty data source)
counter('validation.id_trimmed_total', { source: 'user_input' | 'api' })

// How often do we reject IDs? (indicates validation working)
counter('validation.id_rejected_total', { reason: 'OUT_OF_RANGE' | 'NOT_INTEGER' | ... })

// Match threshold distribution (tune 0.7 threshold)
histogram('validation.roster_match_percentage')

// Performance: validation latency
histogram('validation.normalize_id_duration_ms')

// Rate limiting (SECURITY)
counter('validation.rate_limit_hit_total', { ip, reason })
```

**Frontend metrics (OPERATIONAL FIX):**
```typescript
// Client-side validation failures (critical for debugging)
analytics.track('validation.client_id_rejected', {
  reason: error.code,  // 'OUT_OF_RANGE', 'EMPTY_STRING', etc.
  component: 'TradeBuilder' | 'PlayerSearch',
  userAgent: navigator.userAgent,
  // NO raw input (PII risk)
});

// Version mismatch detection
analytics.track('validation.version_mismatch', {
  frontendVersion: LOCAL_VERSION,
  backendVersion: healthCheck.version,
  action: 'show_refresh_banner'
});

// Prefill validation failures
analytics.track('validation.prefill_rejected', {
  reason: 'HTML_INJECTION' | 'TOO_MANY_ASSETS' | 'INVALID_STRUCTURE',
  assetCount: prefill?.teamA?.length || 0
});
```

**Dashboard queries:**
```
// IDs being trimmed (should decrease post-migration)
sum(rate(validation_id_trimmed_total[5m])) by (source)

// Top rejection reasons
topk(5, sum(rate(validation_id_rejected_total[5m])) by (reason))

// Match threshold: should cluster around 0.7 or 1.0
histogram_quantile(0.95, validation_roster_match_percentage)
```

### Logging

**What to log:**
```typescript
// When validation fails
logger.warn('[normalizeId] Rejected invalid ID', {
  input: raw,
  reason: 'OUT_OF_RANGE',
  source: req.path
});

// When trimming whitespace (indicates dirty data)
logger.info('[normalizeId] Trimmed whitespace', {
  original: raw,
  cleaned: result
});

// When frontend/backend versions mismatch
logger.error('[versionCheck] Client version incompatible', {
  required: VALIDATION_VERSION,
  received: clientVersion
});
```

**DO NOT log:**
- User IDs (PII)
- Full request bodies
- Sensitive trade data

---

## 8. FEATURE FLAGS

### Tunable Parameters

**Roster match threshold:**
```typescript
const threshold = featureFlags.get('ROSTER_MATCH_THRESHOLD', {
  default: 0.7,
  variants: {
    control: 0.7,
    lower: 0.6,    // More permissive
    higher: 0.8    // More strict
  }
});
```

**A/B test plan:**
- 80% users: control (0.7)
- 10% users: lower (0.6)
- 10% users: higher (0.8)
- Monitor: false positive rate, user satisfaction
- After 2 weeks: pick winning variant

**Kill switch:**
```typescript
// Emergency override: disable shared validation, use legacy code
if (featureFlags.isEnabled('USE_LEGACY_VALIDATION')) {
  return legacyNormalizeId(raw);
}
```

---

## 9. TESTING STRATEGY

### Test Coverage Requirements

**Unit tests:** 100% coverage
- All functions in validation library
- Every edge case from adversarial audits (60+ test cases)
- Performance benchmarks (regression prevention)

**Integration tests:**
- Frontend sends valid ID → backend accepts
- Frontend sends invalid ID → backend rejects with 400
- Frontend sends old version → backend returns 426

**Load tests:**
- 10K roster rank calculation: <5 seconds
- 100 req/sec validation: <200ms p99
- 2MB whitespace string: <100ms (DOS prevention)

**Adversarial tests:**
- All 16 vulnerabilities from first audit
- Type confusion attacks
- Race conditions
- Performance exploits

### Test Organization

```
packages/validation/
  src/
    __tests__/
      normalizeId.test.ts       ← 40+ tests
      idMatch.test.ts           ← 30+ tests
      constants.test.ts         ← 5+ tests
      integration.test.ts       ← Frontend/backend compatibility
      performance.test.ts       ← Benchmark suite
      adversarial.test.ts       ← Security audit test cases
```

**Test naming convention:**
```typescript
describe('normalizeId', () => {
  describe('happy path', () => {
    it('normalizes valid number IDs', () => { ... });
  });
  
  describe('edge cases', () => {
    it('rejects NaN', () => { ... });
    it('rejects Infinity', () => { ... });
  });
  
  describe('adversarial (from security audit)', () => {
    it('prevents >100% match via type confusion (VULN #2)', () => { ... });
  });
});
```

---

## 10. ROLLOUT PLAN

### Phased Deployment

**Week 1: Staging**
- Deploy shared library
- Run migration on staging DB
- Deploy frontend + backend
- Monitor for 3 days

**Week 2: Production (Gradual Rollout - OPERATIONAL FIX)**

**Rollout mechanism:** LaunchDarkly feature flags
```typescript
// Frontend (checks on load + every API call)
import { useFeatureFlag } from '@launchdarkly/react-client-sdk';

function TradeBuilder() {
  const useSharedValidation = useFeatureFlag('shared-validation-enabled', false);
  
  const normalizeId = useSharedValidation 
    ? sharedNormalizeId   // New library
    : legacyNormalizeId;  // Old code
  
  // ... rest of component
}

// Backend (checks per-request)
const useSharedValidation = await launchDarkly.variation(
  'shared-validation-enabled',
  { key: req.userId },
  false
);
```

**Rollout schedule:**
- **Day 1:** 5% of users
  - Set LaunchDarkly: `shared-validation-enabled` → 5% random rollout
  - No deploy needed (config change only)
  - Monitor for 4 hours
  - Rollback: Flip flag to 0% (instant)

- **Day 2:** 25% of users (if error rate <0.1%)
  - Increase flag to 25%
  - Monitor for 4 hours
  - Check: client metrics, backend metrics, support tickets

- **Day 3:** 50% of users
  - Increase flag to 50%
  - Monitor for 4 hours

- **Day 4:** 100% of users
  - Increase flag to 100%
  - Monitor for 24 hours
  - Remove legacy code in next release (not immediately)

**Rollback triggers:**
- Error rate >0.5%
- Response time >500ms p99
- Any 500 errors related to validation
- User reports of broken trades

**Rollback procedure:**
- Flip kill switch feature flag (`USE_LEGACY_VALIDATION = true`)
- Immediate rollback (no deploy needed)
- Investigate issue
- Fix + re-deploy

---

## 11. SUCCESS CRITERIA

**Phase 0 (Design) complete when:**
- ✅ RFC approved by expert panel (architect, security, senior engineer)
- ✅ Schema defined with all validation rules documented
- ✅ Test matrix covering 100+ scenarios
- ✅ Taylor approves design

**Phase 1-7 (Implementation) complete when:**
- ✅ All 17 quality gates passed
- ✅ 100% test coverage
- ✅ Zero critical/high vulnerabilities in final audit
- ✅ Staging running stable for 24 hours

**Phase 8 (Production) complete when:**
- ✅ 100% of users on new validation
- ✅ Error rate <0.1%
- ✅ No performance regression
- ✅ Metrics dashboard showing healthy trends
- ✅ Zero support tickets related to validation

**Long-term success (6 months):**
- Zero validation bugs shipped
- Frontend/backend validation still identical (no drift)
- A/B test results inform threshold tuning
- Metrics show dirty data rate approaching zero

---

## 12. ALTERNATIVES CONSIDERED

### Alternative A: Quick Fix (5 separate patches)
**Pros:** Ships in 1 week  
**Cons:** Technical debt, guaranteed drift, will need redesign in 6 months  
**Decision:** Rejected - pays debt twice

### Alternative B: TypeScript-only solution
**Pros:** Type safety without shared library  
**Cons:** No runtime validation, no shared constants, drift still possible  
**Decision:** Rejected - insufficient

### Alternative C: JSON Schema validation
**Pros:** Language-agnostic, well-documented  
**Cons:** No TypeScript types, poor error messages, overkill for our use case  
**Decision:** Rejected - too heavy

### Alternative D: Shared validation library (THIS RFC)
**Pros:** Single source of truth, type-safe, maintainable, zero drift  
**Cons:** 2-3 weeks to build  
**Decision:** SELECTED - build it right once

---

## 13. OPEN QUESTIONS

1. **Should we support BigInt IDs in the future?**
   - Current: Rejects BigInt
   - Future: Snowflake IDs, Discord IDs use BigInt
   - Recommendation: Add in v2.0 if needed

2. **Should ROSTER_MATCH_THRESHOLD be per-league configurable?**
   - Current: Global constant
   - Future: Dynasty leagues might want higher threshold
   - Recommendation: Feature flag first, then league settings if data supports it

3. **How do we handle ID type changes (string → number) in existing data?**
   - Current: Both types normalized to number
   - Migration: Convert all string IDs to numbers in DB
   - Recommendation: One-time migration, document in MIGRATION.md

4. **What's the performance impact of normalization on every request?**
   - Benchmark: normalizeId takes ~0.01ms (negligible)
   - At 1000 req/sec: 10ms total overhead
   - Recommendation: Monitor in production, optimize if >1ms p99

---

## 14. APPENDIX

### A. References
- CRITICAL-BUGS-FOUND-2026-02-28.md (11 bugs documented)
- Adversarial audit reports (16 vulnerabilities)
- Test Expert comprehensive suite (60+ tests)

### B. Glossary
- **Normalization:** Converting input to canonical form (trim, parse, validate)
- **Validation drift:** When frontend/backend validation logic diverges over time
- **Type confusion:** Bug where `"123"` and `123` treated as different values
- **DOS:** Denial of service (performance exploit)

### C. Change Log
- 2026-02-28: Initial draft

---

**Next steps:**
1. Expert panel review (3 reviewers)
2. Incorporate feedback
3. Taylor approval
4. Proceed to Phase 1 (implementation)

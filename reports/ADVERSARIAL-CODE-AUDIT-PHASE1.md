# 🔴 ADVERSARIAL CODE AUDIT — Phase 1 Trade Pipeline

**Auditor:** Code Auditor (sub-agent)
**Date:** 2026-03-31
**Scope:** Trade sync/grading pipeline (`src/config`, `src/middleware`, `src/services`, `src/routes`, `src/validators`)
**Severity Framework:** CRITICAL = must fix before deploy, HIGH = should fix, MEDIUM = tech debt

---

## Executive Summary

**Verdict: NOT READY FOR PRODUCTION**

Found **8 critical bugs**, **9 high-severity issues**, and **6 medium issues**. The most dangerous are a data-loss bug in incremental sync tracking, an inconsistent return shape that corrupts trade grading, and a missing module that silently disables the entire grading pipeline. Several race conditions exist that only manifest under load.

---

## 🔴 CRITICAL BUGS (Must Fix Before Deploy)

### C1. PERMANENT DATA LOSS — Incremental Sync Skips Failed Weeks Forever
**File:** `tradeSyncService.js`, lines in sync loop (step 6)
**Impact:** Trades permanently lost from the pipeline

```javascript
// The bug:
if (weekTrades.length > 0 || week === maxWeeks) {
  lastTradeWeek = week;
}
```

**Attack scenario:** Weeks 1-5 succeed, week 6 has a transient Sleeper API error (timeout, 500), weeks 7-18 succeed. `lastTradeWeek` is set to `18`. Next incremental sync starts at week **19** — week 6 trades are **permanently skipped**.

The `catch` block for week errors only pushes to the `errors` array and continues the loop. But `lastTradeWeek` advances past the failed week because later weeks succeed.

**Fix:** Track `lastTradeWeek` as the **highest contiguous successful week**, or re-attempt failed weeks on next sync by storing failed weeks in `trade_sync_status`.

---

### C2. INCONSISTENT RETURN SHAPE — Trade Grading Receives Two Different Data Structures
**File:** `tradeGradingService.js`, `buildTradeDataForGrading()`
**Impact:** Grading algorithm produces wrong results; data corruption in DB

When `userSide === null` (public trade):
```javascript
return {
  sent: [{ type: 'player', ... }, { type: 'pick', ... }],     // FLAT ARRAY
  received: [{ type: 'player', ... }],                          // FLAT ARRAY
  context: { ... }
};
```

When `userSide` is set (user trade):
```javascript
return {
  sent: { players: [...], picks: [...] },     // OBJECT with sub-arrays
  received: { players: [...], picks: [...] },  // OBJECT with sub-arrays
  context: { ... }
};
```

Both shapes are passed to `tradeReportCardService.gradeTrade()` and stored via `storePublicTrade()`. The grading algorithm will either crash or produce nonsensical grades depending on which shape it receives. JSON.stringify in `storePublicTrade` will store inconsistent schema data in `team_a_assets`/`team_b_assets` columns.

**Fix:** Normalize to a single return shape. Always return the object-with-sub-arrays format.

---

### C3. MISSING MODULE — Trade Grading Silently Disabled
**File:** `tradeSync.js` route handler (POST)
**Impact:** Trades are scraped but NEVER graded — core feature is broken

```javascript
let tradeGradingWorker = null;
try {
  tradeGradingWorker = require('../services/tradeGradingWorker');
} catch (_err) {
  logger.debug('tradeGradingWorker not available (Phase 1 only)', { requestId });
}
```

**`tradeGradingWorker.js` does not exist** (confirmed via filesystem check). The `require()` throws, the catch swallows it, and `tradeGradingWorker` stays `null`. The grading step is then skipped:

```javascript
if (tradeGradingWorker && tradesScraped > 0) { ... }  // Never executes
```

The API response will always show `trades_graded: 0`. Users think their trades are being graded, but they're not. The `tradeGradingService.js` (which DOES exist) is never called from any route.

**Fix:** Either create `tradeGradingWorker.js` that wraps `tradeGradingService.batchGradeTrades()`, or import `tradeGradingService` directly.

---

### C4. SERVICE IMPORT MISMATCH — Route Uses Different Service Than Audited
**File:** `tradeSync.js` route handler
**Impact:** The audited `tradeSyncService.js` may not be the code that actually runs

The route imports:
```javascript
const sleeperTradeScraperService = require('../services/sleeperTradeScraperService');
```

But the audited service is `tradeSyncService.js` (which imports `sleeperService.js`). There are THREE different service files involved:
- `sleeperApiClient.js` — audited, production-grade HTTP client
- `sleeperService.js` — imported by `tradeSyncService.js`
- `sleeperTradeScraperService.js` — imported by route

**The route handler calls `sleeperTradeScraperService.syncUserLeagueTrades()`, NOT `tradeSyncService.syncUserLeagueTrades()`.** The entire advisory-lock concurrency control, batch insert logic, and incremental sync in `tradeSyncService.js` may be DEAD CODE that never executes in production.

**Fix:** Verify which service is actually called. If `sleeperTradeScraperService.js` is the real one, audit THAT file instead. If `tradeSyncService.js` is correct, update the route import.

---

### C5. DATABASE.JS CLIENT TIMEOUT STARVATION
**File:** `database.js`, `getClient()`
**Impact:** Connection pool exhaustion under load; service goes down

```javascript
const timeout = setTimeout(() => {
  logger.error('A client has been checked out for more than 5 seconds!');
}, 5000);
```

The 5-second timeout only **logs an error** — it doesn't release the client. Meanwhile, `tradeSyncService.syncUserLeagueTrades()` holds a client for the **entire sync operation**: up to 18 API calls to Sleeper (each with 30s timeout + 3 retries with exponential backoff). A single sync could hold a client for **minutes**.

With `DB_POOL_SIZE=20`, just 20 concurrent syncs exhaust the pool. All other database operations (auth, queries, health checks) are blocked. The 5-second warning will fire on every sync, flooding logs.

**Fix:** Either increase the timeout to match the longest expected operation (5+ minutes), or restructure `tradeSyncService` to not hold a client across API calls (acquire/release per DB operation, use a separate advisory lock mechanism).

---

### C6. PROCESS.EXIT ON POOL ERROR — No Graceful Shutdown
**File:** `database.js`
**Impact:** Instant crash; in-flight requests dropped, advisory locks leaked, data corruption possible

```javascript
pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
  process.exit(-1);
});
```

Any idle connection error (SSL renegotiation failure, Supabase maintenance, network blip) kills the entire process. No graceful shutdown: in-flight HTTP responses are dropped, open transactions are abandoned (PostgreSQL will ROLLBACK, but advisory locks acquired via `pg_advisory_lock` persist until session close — which may not happen cleanly with `process.exit`).

**Fix:** Remove `process.exit(-1)`. Log the error and let the pool handle reconnection (pg Pool is designed for this). Add graceful shutdown handlers via `SIGTERM`/`SIGINT`.

---

### C7. CONFIG EXPORTS NULL — Silent Crash Bomb
**File:** `config/index.js`
**Impact:** Any module importing config crashes at startup

```javascript
if (currentIsTest) {
  console.warn('[config] Validation warning in test environment:', err.message);
  _config = null;
}
```

Then:
```javascript
module.exports = _config;  // exports null
```

Any module that does `const config = require('./config'); config.api.port` throws `TypeError: Cannot read properties of null (reading 'api')`. In test environment, this creates hard-to-debug crashes that appear unrelated to config.

In development, if validation fails but `currentIsProduction` is false, `_config` is never assigned a valid value either — the catch block for non-test/non-production doesn't set `_config` at all, leaving it undefined.

**Fix:** In test mode, provide a valid default config object. In dev mode, either throw or provide defaults.

---

### C8. AUTH MIDDLEWARE RUNS BEFORE RATE LIMITING — DoS Vector
**File:** `tradeSync.js` route middleware chain
**Impact:** Attacker can force unlimited database queries

```javascript
router.post('/',
  authenticate,           // ← DB QUERY (SELECT FROM users)
  zodValidate(...),
  tradeSyncGlobalLimiter, // ← Rate limit checked AFTER DB query
  tradeSyncUserLimiter,
  requireLeagueMembership,
  asyncHandler(...)
);
```

Every request triggers a `SELECT ... FROM users WHERE id = $1` BEFORE rate limiting kicks in. An attacker sending 10,000 requests/second with invalid/valid JWTs will:
1. Force 10,000 JWT verifications
2. Force 10,000 database queries
3. Only THEN get rate-limited

**Fix:** Move rate limiters before `authenticate`:
```javascript
router.post('/',
  tradeSyncGlobalLimiter,
  tradeSyncUserLimiter,
  authenticate,
  zodValidate(...),
  requireLeagueMembership,
  asyncHandler(...)
);
```

Note: `tradeSyncUserLimiter` uses `req.user?.id` which won't be set yet. It falls back to IP, which is acceptable for the global limiter, but the per-user limiter needs to run after auth. Consider: global limiter → authenticate → user limiter.

---

## 🟠 HIGH-SEVERITY ISSUES (Should Fix)

### H1. MEMORY LEAK — Unbounded Idempotency Cache
**File:** `tradeSync.js`, `idempotencyCache`

Plain `Map` with only TTL-based cleanup every 10 minutes. No max size. Under load (e.g., 50,000 unique idempotency keys in 10 minutes), memory grows unboundedly. Use `LRUCache` with max size like the Sleeper client does.

---

### H2. IN-FLIGHT SYNC TRACKING NOT CLUSTER-SAFE
**File:** `tradeSync.js`, `inFlightSyncs`

`inFlightSyncs` is an in-memory `Map`. In multi-process deployments (PM2 cluster, multiple Railway containers), each process has its own map. Two processes can run concurrent syncs on the same league without knowing about each other. The advisory lock in `tradeSyncService.js` would protect — IF `tradeSyncService.js` were actually called (see C4).

---

### H3. REQUEST ID INJECTION — Log Poisoning Vector
**File:** `requestId.js`

```javascript
const existingId = req.headers['x-request-id'];
req.id = existingId || generateRequestId();
```

Accepts any string from the client as request ID. An attacker can inject log-forging payloads:
```
X-Request-ID: fake-uuid\n{"level":"error","msg":"ADMIN_SECRET=leaked"}
```

If log aggregation tools (Datadog, ELK) parse these strings, this enables log injection.

**Fix:** Validate that incoming `X-Request-ID` matches UUID format (`/^[0-9a-f-]{36}$/i`) before accepting.

---

### H4. JWT TOKEN IN URL — Persistent Credential Exposure (SSE)
**File:** `auth.js`, `authenticateSSE()`

Tokens passed via `req.query.token` are:
- Logged in access logs (nginx, Cloudflare, Railway)
- Stored in browser history
- Leaked via `Referer` headers
- Visible in server-side request logs (your own `logger.info('[SSE Auth] Path:', req.path, ...`)

The code even LOGS the token source but not the token itself — good — but the token is in the URL which is logged by infrastructure you don't control.

---

### H5. BATCH GRADING USES WRONG FORMAT FOR MULTI-LEAGUE BATCHES
**File:** `tradeGradingService.js`, `batchGradeTrades()` step 4

```javascript
const firstTrade = trades[0];
const firstFormat = firstTrade.league_format || {};
const playerValues = await batchFetchPlayerValues(
  [...allPlayerIds],
  { isSuperflex: firstTrade.is_superflex || firstFormat.superflex || false, ... }
);
```

If the batch spans multiple leagues (which it does when `leagueId` is null and `userId` is set), player values are fetched using the FIRST trade's league format. A SuperFlex league trade mixed with a standard league trade will get wrong player valuations.

**Fix:** Group trades by league format and batch-fetch values per format group.

---

### H6. ADVISORY LOCK HASH COLLISION RISK
**File:** `tradeSyncService.js`, `hashLeagueId()`

32-bit hash space = ~4.3 billion values. With the birthday paradox, collisions become likely around ~65,000 unique league IDs. Two leagues hashing to the same value will serialize their syncs unnecessarily, or worse, one sync's lock prevents another league's sync entirely.

**Fix:** Use `pg_advisory_lock(bigint)` with a larger key space, or use `pg_advisory_lock(int, int)` with the league ID parsed directly (Sleeper league IDs are 18-digit numbers — split into two 32-bit integers).

---

### H7. DUPLICATE CONFIG — `config/sleeper.js` vs `config/index.js` sleeper section
**File:** `config/sleeper.js` and `config/index.js`

Two separate config files for Sleeper with different env var names and defaults:
- `config/index.js`: `SLEEPER_API_TIMEOUT_MS`, 3 retries, basic settings
- `config/sleeper.js`: `SLEEPER_HTTP_TIMEOUT`, `SLEEPER_CB_TIMEOUT`, full circuit breaker/rate limiter config

`sleeperApiClient.js` imports `config/sleeper.js`. `tradeSyncService.js` (via `sleeperService.js`) may use `config/index.js`. This means two different timeout values, retry counts, etc. could be in effect depending on the code path.

---

### H8. MISSING TRANSACTION BOUNDARY IN ROUTE HANDLER
**File:** `tradeSync.js`, POST handler

The route handler calls `sleeperTradeScraperService.syncUserLeagueTrades()` and then `tradeGradingWorker.batchGradeTrades()` as two separate operations with no shared transaction. If scraping succeeds but grading fails, the database has scraped-but-ungraded trades with no retry mechanism. The response reports partial success but the user has no way to trigger re-grading.

---

### H9. SLEEPER API CLIENT CACHES NULL/UNDEFINED RESPONSES
**File:** `sleeperApiClient.js`, `rawGet()`

```javascript
if (!skipCache && data !== null && data !== undefined) {
  cache.set(path, data, { ttl: cacheTtl });
}
```

Empty arrays `[]` and empty objects `{}` ARE cached (they pass the null/undefined check). If Sleeper returns an empty roster array for a league that actually has rosters (transient API issue), the empty array is cached for 5 minutes. All subsequent requests get the empty result.

---

## 🟡 MEDIUM ISSUES (Tech Debt)

### M1. VALIDATOR MISMATCH — Joi in Services, Zod in Routes
**File:** `validators/tradeSync.js` (Joi), `middleware/validation.js` (Zod for route schemas)

The route uses Zod validation (`tradeSyncSchemas.syncBody`) but the service uses Joi validation (`syncRequestSchema`). The league ID regex differs:
- Zod (route): `/^[0-9]{15,20}$/` — requires 15-20 digits
- Joi (service): `/^[0-9]{1,20}$/` — allows 1-20 digits
- Joi (leagueIdSchema): `/^[1-9][0-9]{0,19}$/` — no leading zeros, 1-20 digits

A league ID like `"12345"` (5 digits) passes Joi service validation but fails Zod route validation. A league ID like `"01234567890123456"` passes Joi service validation but fails Joi leagueIdSchema (leading zero).

**Fix:** Single source of truth for league ID format validation.

---

### M2. MIXED IMPORT PATTERNS — `require` vs Direct Import of Config
**File:** `auth.js`

```javascript
const JWT_SECRET = process.env.JWT_SECRET;  // Direct env access
```

While `config/index.js` exists with Zod-validated `api.jwtSecret`, `auth.js` reads `process.env.JWT_SECRET` directly. The production guard in `config/index.js` is bypassed. If someone sets `JWT_SECRET=""` (empty string), `config/index.js` treats it as undefined (via `optString`), but `auth.js` treats it as falsy → falls through to dev default. Subtle inconsistency.

---

### M3. RATE LIMITER CONFIG NOT FROM CENTRALIZED CONFIG
**File:** `middleware/rateLimit.js`

All rate limit values are hardcoded despite `config/index.js` having `api.globalRateLimit`, `api.authRateLimit`, `api.apiRateLimit`, `api.adminRateLimit`, and `api.rateLimitWindowMs`. The rate limit middleware ignores the centralized config entirely.

---

### M4. PICK VALUE CALCULATION IS A STUB
**File:** `tradeGradingService.js`, `getPickValue()`

Hardcoded `{ 1: 5000, 2: 2000, 3: 800, 4: 300 }` with no SF/TEP/league-size adjustment. Round 5+ picks are valued at 100. This will produce materially wrong grades for any trade involving picks.

---

### M5. SLEEPER RATE LIMIT CONFIG INCONSISTENCY
**File:** `config/sleeper.js`

```javascript
reservoirRefreshAmount: parseInt(process.env.SLEEPER_RATE_LIMIT_RESERVOIR || '600', 10),
```

Uses the same env var `SLEEPER_RATE_LIMIT_RESERVOIR` for both `reservoir` and `reservoirRefreshAmount`. Setting `SLEEPER_RATE_LIMIT_RESERVOIR=100` changes both the initial reservoir AND the refresh amount. These should be independent.

---

### M6. NO INPUT LENGTH LIMIT ON JWT TOKEN
**File:** `auth.js`, `authenticate()`

```javascript
const token = parts[1];
const decoded = verifyToken(token);
```

No length check on the JWT token string. An attacker could send a 10MB Authorization header. `jwt.verify()` will attempt to parse it, consuming CPU. Add `if (token.length > 4096) throw new UnauthorizedError('Token too large')`.

---

## 📋 QUESTIONS ANSWERED

| Question | Answer |
|----------|--------|
| **Can you break authentication/authorization?** | Yes: DoS via auth-before-rate-limit (C8); JWT in URL leaks credentials (H4); no token size limit enables CPU exhaustion (M6) |
| **Can you corrupt data with crafted inputs?** | Yes: inconsistent return shape corrupts grading data (C2); multi-league batch uses wrong format (H5) |
| **Can you cause a deadlock or race condition?** | Yes: connection pool starvation (C5); in-memory sync tracking fails across processes (H2); advisory lock hash collisions (H6) |
| **Can you crash the service?** | Yes: pool error → process.exit (C6); null config → TypeError (C7); unbounded idempotency cache → OOM (H1) |
| **Are there untested code paths?** | Yes: tradeGradingWorker doesn't exist (C3); tradeSyncService may be dead code (C4); entire grading pipeline may never execute |
| **Do services handle each other's failures?** | Partially: scraping failure is caught, but grading failure has no retry; DB failures in error handlers are caught but cause inconsistent state |

---

## 🎯 RECOMMENDED FIX ORDER

1. **C4** — Resolve service import mismatch (determines what code actually runs)
2. **C3** — Create or wire up trade grading worker (core feature is broken)
3. **C2** — Fix inconsistent return shape (data corruption)
4. **C1** — Fix incremental sync week tracking (data loss)
5. **C6** — Remove process.exit (stability)
6. **C5** — Fix client checkout timeout (pool exhaustion)
7. **C8** — Reorder middleware chain (DoS protection)
8. **C7** — Fix null config export (crash prevention)
9. **H1-H9** — Fix in priority order

**Estimated effort:** 2-3 days for all critical bugs, 1-2 additional days for high-severity issues.

---

*Audited with extreme prejudice. No quarter given. Ship nothing until C1-C8 are fixed.*

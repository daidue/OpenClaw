# 🔴 ADVERSARIAL DATABASE AUDIT — Phase 1 Trade Pipeline

**Auditor:** Subagent (database-auditor-v2)
**Date:** 2026-03-31
**Scope:** All database operations in the Phase 1 trade observation, grading, ETL, and sync pipeline
**Codebase:** `daidue/titlerun-api` (main branch, commit 8b94ab37)

---

## Executive Summary

**Verdict: 6 CRITICAL bugs, 5 HIGH issues, 7 MEDIUM issues, 4 LOW issues**

The most severe finding is a **systematic `_result` / `result` variable name mismatch** in `tradeOutcomeETL.js` that causes `ReferenceError` crashes in 5 functions, making the entire ETL pipeline non-functional. Beyond that, the trade observation pipeline has missing transaction boundaries around multi-table counter updates, race conditions on `total_trades_observed`, and orphan record scenarios when backfill crashes mid-way.

---

## 1. CRITICAL DATA CORRUPTION RISKS (MUST FIX)

### 🔴 CRIT-1: `_result` / `result` ReferenceError in tradeOutcomeETL.js (5 functions broken)

**File:** `src/services/tradeOutcomeETL.js`
**Severity:** CRITICAL — Entire ETL pipeline is non-functional

The code assigns query results to `_result` (with underscore, suppressing linting) but then references `result` (without underscore). This causes `ReferenceError: result is not defined` at runtime.

**Affected functions (5 of them!):**

| Function | Line (assign) | Line (use) | Impact |
|----------|:---:|:---:|--------|
| `bulkLookupPlayerValues()` | 119: `const _result = await query(...)` | 131: `if (result.rows.length === 0)` | All bulk value lookups crash → `populateTradeOutcomes` produces 0 records or trades with value=0 |
| `getPickAssetValue()` | 177: `const _result = pickValueEngineV2.getPickValue(...)` | 185: `return result.value \|\| 0` | All pick value calculations crash → picks valued at 0 |
| `getStats()` | 587: `const _result = await query(...)` | 601: `return result.rows[0]` | Stats endpoint crashes |
| `getPendingCount()` | 614: `const _result = await query(...)` | 623: `return parseInt(result.rows[0]?.cnt \|\| 0)` | Pending count endpoint crashes |
| `lookupPlayerValue()` | 65: `const _result = await query(...)` | (dead code, superseded by `nearestDate` query) | Wasted query but not crash (dead code) |

**Root Cause:** Likely an automated linting pass converted `result` → `_result` to suppress "unused variable" warnings, without checking downstream references.

**Impact:** The daily `TRADE_OUTCOME_ANALYSIS` scheduler job (4:00 AM EST) calls `populateTradeOutcomes()` → `processTradeBatch()` → `bulkLookupPlayerValues()` and `getPickAssetValue()`, which both crash. The `trade_outcomes` table is **never populated** from trade observations. The entire backtest/outcome analysis pipeline is dead.

**Fix:**
```javascript
// In all 5 cases, change _result to result:
const result = await query(...);  // NOT _result
```

---

### 🔴 CRIT-2: Non-Transactional Counter Update in `pollLeague()` — Race Condition on `total_trades_observed`

**File:** `src/services/tradeObservationService.js`, lines 520-530
**Severity:** CRITICAL — Data corruption under concurrent writes

```javascript
// After storing trades (in separate transactions per trade), updates connected_leagues:
await query(
  `UPDATE connected_leagues SET
    last_trade_poll = NOW(),
    last_trade_week = $1,
    total_trades_observed = COALESCE(total_trades_observed, 0) + $2,
    updated_at = NOW()
  WHERE league_id = $3`,
  [toRound, totalStored, leagueId]
);
```

**Problem:**
1. **No transaction boundary** between the `storeTradesBatch()` calls and this `UPDATE`. If the UPDATE fails (network partition, timeout), trades are stored but the counter is wrong. If the process crashes before the UPDATE, same result.

2. **Race condition on `total_trades_observed`:** Two concurrent `pollLeague()` calls for the same league (e.g., user-triggered + scheduler) both read the current value, add their count, and write back. Classic lost-update problem. The `COALESCE(total_trades_observed, 0) + $2` is atomic per-statement, but the counter can still drift because multiple `pollLeagueRound()` calls within the same `pollLeague()` invocation each add trades, but the UPDATE only runs once with the final sum. If another process polls the same league concurrently, both will increment from the same base.

3. **All users' rows updated** (by design, documented with `@league-level`), but this means the WHERE clause `WHERE league_id = $3` updates N rows (one per user). If the league has 50 users, this UPDATEs 50 rows for `total_trades_observed` — each getting `+ totalStored`. This is correct per the design, but if a partial failure occurs (e.g., 25 of 50 rows updated before crash), some users see different `total_trades_observed` values.

**Fix:**
- Wrap the `storeTradesBatch` + counter UPDATE in a single transaction, OR
- Move `total_trades_observed` to `trade_sync_status` table (migration 098 already has `total_trades_synced`), removing the denormalized counter from `connected_leagues`
- Use `SELECT ... FOR UPDATE` or an advisory lock per league when updating

---

### 🔴 CRIT-3: `connected_leagues.user_id` is VARCHAR(50), but `users.id` is UUID — Type Mismatch, No Foreign Key

**File:** `src/index.js` line 3570 (connected_leagues DDL) + migration 060
**Severity:** CRITICAL — No referential integrity

The `connected_leagues` table has:
```sql
user_id VARCHAR(50)  -- No REFERENCES, no FK constraint
```

But the `users` table has:
```sql
id UUID PRIMARY KEY
```

**Problems:**
1. **No foreign key constraint** — `connected_leagues.user_id` can contain any string, including:
   - Non-existent user IDs
   - Sleeper user IDs (which are numeric strings, not UUIDs)
   - Garbage data from migration 060 backfill (which casts `teams.user_id` to VARCHAR(50))
2. The `connectedLeaguesService.registerUserLeagues()` accepts `titlerunUserId` as parameter but **never validates it exists in `users`**.
3. If a user is deleted from `users`, their `connected_leagues` rows persist indefinitely as orphans (no `ON DELETE CASCADE`).
4. The `trade_report_cards` table has `user_id VARCHAR(100)` — also no FK to `users`.

**Impact:** Orphaned records accumulate. Queries joining `connected_leagues` to `users` may return fewer results than expected. `pollAllDueLeagues()` will poll leagues for deleted users forever.

---

### 🔴 CRIT-4: Advisory Lock Tied to Connection, Not Transaction — Process Crash Leaves Lock Held

**File:** `src/services/advisoryLockService.js`, lines 51-85
**Severity:** CRITICAL — Lock starvation after crash

The advisory lock service uses `pg_try_advisory_lock()` which is a **session-level** lock. The lock is released in a `finally` block:

```javascript
finally {
  if (acquired) {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
    } catch (unlockError) { ... }
  }
  if (client) { client.release(); }
}
```

**Problem:**
1. PostgreSQL session-level advisory locks are automatically released when the **connection** is closed, not when the client is released back to the pool. If the `client.release()` returns the connection to the pool (which it does — `pool.connect()` returns a pooled connection), **the lock persists** because the connection is still alive in the pool.
2. If the Node.js process crashes (OOM, segfault, `process.exit`) after acquiring the lock but before `pg_advisory_unlock`, the lock is only released when the **database connection** times out (pool's `idleTimeoutMillis: 30000`). During this 30-second window, no other process can acquire the lock.
3. The `narrativePreGeneration.js` uses its own `pg_try_advisory_lock(424242)` via the raw `query()` function (pool-level, not client-level), which means the lock is held by a **random pool connection** and may be implicitly released when that connection is returned, or may persist if the connection is reused.

**Impact:** After a crash, the lock can be stuck for up to 30 seconds (idle timeout). If the pool has `keepAlive: true` and `keepAliveInitialDelayMillis: 10000`, the connection may never be closed, leaving the lock **permanently held** until the server restarts.

**Fix:**
- Use `pg_try_advisory_xact_lock()` (transaction-level locks) instead. These are automatically released on COMMIT/ROLLBACK.
- OR: Explicitly close the connection (`client.end()`) in the finally block instead of releasing to pool.

---

### 🔴 CRIT-5: `backfillLeague()` Updates `connected_leagues` Without Checking League Exists

**File:** `src/services/tradeObservationService.js`, lines 596-602, 635-640
**Severity:** CRITICAL (if backfill called with wrong league ID)

```javascript
await query(
  `UPDATE connected_leagues SET backfill_started_at = NOW(), updated_at = NOW()
   WHERE league_id = $1`,
  [leagueId]
).catch(() => {}); // Non-critical ← SILENT FAILURE
```

**Problems:**
1. The `.catch(() => {})` swallows ALL errors, including:
   - Connection pool exhaustion
   - Database down
   - Syntax errors
   - Constraint violations
2. If `backfillLeague()` is called for a league that doesn't exist in `connected_leagues`, the UPDATE silently updates 0 rows, then proceeds to fetch and store trades from Sleeper API. These `trade_observations` are **orphaned** — they belong to a league that no user has connected.
3. The same `.catch(() => {})` pattern is used for the `backfill_complete` update. If this fails, the backfill runs again on next scheduler tick (infinite loop of API calls to Sleeper).

---

### 🔴 CRIT-6: `trade_sync_status` SEED Data Creates Orphan Rows

**File:** `migrations/098_trade_sync_status.sql`, lines 140-145

```sql
INSERT INTO trade_sync_status (league_id, platform, created_at)
SELECT DISTINCT league_id, 'sleeper', NOW()
FROM connected_leagues
WHERE is_active = TRUE
  AND league_id IS NOT NULL
ON CONFLICT (league_id, platform) DO NOTHING;
```

**Problem:** This seed runs once during migration. New leagues connected after migration 098 runs will NOT have a `trade_sync_status` row. The service code must handle missing rows, but nothing in the codebase creates `trade_sync_status` rows for new leagues — `registerLeague()` in `connectedLeaguesService.js` doesn't insert into `trade_sync_status`.

**Impact:** The `trade_sync_status` table gradually becomes out of sync with `connected_leagues`. Any pipeline code that reads from `trade_sync_status` to determine which leagues need syncing will skip newly connected leagues.

---

## 2. ORPHANED RECORD SCENARIOS

### ⚠️ ORPHAN-1: Trade Observations Without Connected League

**Trigger:** `backfillLeagueWithHistory()` follows Sleeper's `previous_league_id` chain. Historical season league IDs are different from the current league ID. These previous-season leagues likely don't exist in `connected_leagues`.

**Result:** `trade_observations` rows with `league_id` values that have no corresponding `connected_leagues` row. These trades are counted in statistics but have no owner/user context.

**Cleanup:** Never runs. No TTL, no garbage collection job.

### ⚠️ ORPHAN-2: Trade Assets Without Observation (CASCADE protects, but...)

The `trade_assets` table has `ON DELETE CASCADE` from `trade_observations`. However, if the `storeTrade()` transaction is interrupted between the observation INSERT and the assets INSERT (unlikely due to single transaction, but possible via statement_timeout killing mid-batch), you get an observation without assets.

**Detection:** `SELECT * FROM trade_observations WHERE id NOT IN (SELECT DISTINCT trade_observation_id FROM trade_assets)` — should be empty but may not be.

### ⚠️ ORPHAN-3: Ungraded Trade Observations (Forever Pending)

Migration 098 adds `grading_status DEFAULT 'pending'` to `trade_observations`. But **no service code exists** that reads `grading_status` and processes pending trades. The `trade_report_cards.source_trade_observation_id` column (added in 098) links report cards to observations, but no code populates this link.

**Result:** Every `trade_observations` row has `grading_status = 'pending'` forever. The grading pipeline is schema-ready but code-incomplete.

### ⚠️ ORPHAN-4: Abandoned Backfill State

If `triggerBackfillForLeague()` crashes after setting `backfill_started_at` but before setting `backfill_complete = TRUE`, the league is stuck in "backfill started" state forever. `getLeaguesNeedingBackfill()` filters on `backfill_started_at IS NULL`, so this league will never be retried.

**Fix:** Add a `WHERE backfill_started_at < NOW() - INTERVAL '2 hours' AND backfill_complete = FALSE` clause to catch abandoned backfills.

---

## 3. MISSING TRANSACTION BOUNDARIES

### 🟠 TXN-1: `pollLeague()` — Multi-Round Polling Without Transaction

`pollLeague()` loops through rounds 0-18, calling `pollLeagueRound()` for each. Each round stores trades individually. If the loop fails at round 10, rounds 0-9 are stored but the counter UPDATE doesn't reflect partial progress. On retry, rounds 0-9 are deduplicated (via `ON CONFLICT DO NOTHING`), but the counter gets incremented again by the new trades from rounds 10-18.

**Impact:** `total_trades_observed` can be higher than actual stored trades (counter drift).

### 🟠 TXN-2: `storeTradesBatch()` — Sequential Transactions Per Trade

```javascript
for (const trade of normalizedTrades) {
  if (existingIds.has(trade.observation.transactionId)) { skipped++; continue; }
  try {
    const id = await storeTrade(trade);  // Each trade in its own transaction
    ...
  } catch (error) { skipped++; }
}
```

Each `storeTrade()` call is its own transaction (via `transaction()` wrapper). This means:
- If trade 25/50 fails, trades 1-24 are committed, 25 is rolled back, 26-50 continue.
- This is **actually good** for fault isolation, but...
- The batch dedup check (`getExistingTransactionIds`) runs BEFORE the loop, creating a TOCTOU race: another process could insert the same trade between the check and the insert.
- The `ON CONFLICT DO NOTHING` handles this gracefully, but the `stored` counter will be wrong (it counts `id !== null` as stored, which is correct).

**Verdict:** This is actually well-designed. The TOCTOU race is mitigated by `ON CONFLICT`. The per-trade transaction isolation is correct for fault tolerance.

### 🟠 TXN-3: `backfillLeague()` — No Atomicity Between Backfill and Status Update

```javascript
const result = await pollLeague(leagueId, { ... });  // Stores trades

// Mark backfill as complete (SEPARATE from trade storage)
await query(
  `UPDATE connected_leagues SET backfill_complete = TRUE, ...
   WHERE league_id = $1`,
  [leagueId]
).catch(() => {});
```

The backfill status update is a separate query from the trade storage. If it fails (caught by `.catch(() => {})`), the backfill flag stays FALSE, causing the backfill to re-run on next tick. This wastes Sleeper API calls but doesn't corrupt data (trades are deduplicated).

### 🟠 TXN-4: `triggerBackfillForLeague()` — Three Separate Queries, No Transaction

```javascript
// Query 1: Backfill trades
const result = await tradeObservationService.backfillLeagueWithHistory(...);
// Query 2: Update last_trade_at
await query(`UPDATE connected_leagues SET last_trade_at = $1 ...`);
// Query 3: Recalculate poll tier
await recalculateTier(leagueId);
```

Three independent database operations with no wrapping transaction. If query 2 fails, `last_trade_at` is stale but `poll_tier` is never recalculated (query 3 depends on `last_trade_at`).

---

## 4. SCHEMA / CONSTRAINT VIOLATIONS

### 🟠 SCHEMA-1: `trade_observations.roster_ids` Type Mismatch

Schema (migration 028): `roster_ids INTEGER[] DEFAULT '{}'`
Code (`normalizeTrade()`): `roster_ids: rosterIds` where `rosterIds = tx.roster_ids || []`

Sleeper's `roster_ids` are integers, so this works. But the `tradeVelocityService.calculateTradeVelocity()` query has:
```sql
WHERE ta.asset_type = 'pick'
  AND t.executed_at >= $1
  AND t.status = 'complete'
  AND t.is_outlier = FALSE
```

The `is_outlier` column defaults to FALSE and is never set to TRUE by any service code. This means the filter is always TRUE (no trades are ever flagged as outliers). The column exists but the outlier detection logic was never implemented.

### 🟠 SCHEMA-2: `trade_sync_status` Has No Updater

Migration 098 creates `trade_sync_status` with columns like `last_sync_at`, `last_trade_week`, `total_trades_synced`, `total_trades_graded`, `last_error`, `consecutive_errors`. But **no service code writes to this table**. The only INSERT is the seed in the migration itself. The entire table is write-once, never updated.

### 🟡 SCHEMA-3: `trade_report_cards.source_trade_observation_id` — FK Added But Never Populated

Migration 098 adds `source_trade_observation_id INTEGER REFERENCES trade_observations(id) ON DELETE SET NULL`. No service code ever sets this value. It will be NULL for all rows. The FK constraint is correct but the column is dead.

### 🟡 SCHEMA-4: `trade_observations.grading_status` — Column Added But Never Used

Migration 098 adds `grading_status VARCHAR(20) DEFAULT 'pending'` with an index on `WHERE grading_status = 'pending'`. No service code reads or writes this column. Every row will be 'pending' forever.

### 🟡 SCHEMA-5: Duplicate Trade Tables — `sleeper_trades` vs `trade_observations`

Two separate tables store Sleeper trade data:
1. `sleeper_trades` (migration 055) — simpler schema, FK to `discovered_leagues`
2. `trade_observations` (migration 028) — richer schema, no FK to `connected_leagues`

These tables have overlapping data but are never reconciled. The `trade_observations` pipeline doesn't check `sleeper_trades` for duplicates. A trade could exist in both tables.

### 🟡 SCHEMA-6: `connected_leagues` Has Duplicate Tracking — `last_trade_poll/week/observed` vs `trade_sync_status`

`connected_leagues` has: `last_trade_poll`, `last_trade_week`, `total_trades_observed`
`trade_sync_status` has: `last_sync_at`, `last_trade_week`, `total_trades_synced`

These serve the same purpose but are updated by different (or no) code paths. `trade_sync_status` is never updated after the initial seed. `connected_leagues` columns ARE updated by `tradeObservationService.pollLeague()`. This creates confusion about the source of truth.

---

## 5. PERFORMANCE BOTTLENECKS

### 🔴 PERF-1: `bulkLookupPlayerValues()` is N+1 (Would Be, If It Didn't Crash)

Even ignoring CRIT-1 (the `_result` bug), the function:
1. Runs one query to get nearest dates per player
2. Groups by date
3. Runs one query **per unique date** to get values

For a batch of 500 trades, each with ~4 players, that's 2000 player lookups. If trades span 100 different dates, that's 100 additional queries. Plus the initial query.

**Fix:** Use a single query with a lateral join or window function:
```sql
SELECT DISTINCT ON (player_id)
  player_id, AVG(normalized_value) OVER (PARTITION BY player_id, record_date) as avg_value
FROM normalized_values
WHERE player_id = ANY($1) AND format = $2 AND record_date <= $3::DATE
ORDER BY player_id, record_date DESC
```

### 🟠 PERF-2: `pollAllDueLeagues()` — Sequential League Processing

```javascript
for (const league of leagues) {
  const pollResult = await pollLeague(league.league_id);
  // Each pollLeague makes 0-18 HTTP requests + DB writes
}
```

100 leagues × 18 weeks = 1,800 sequential HTTP requests to Sleeper API. Even with rate limiting, this could take 30+ minutes.

**Fix:** Process leagues in parallel batches (e.g., 5 at a time with `Promise.allSettled`).

### 🟠 PERF-3: `getTradesForPlayer()` — Subquery Without Index

```sql
WHERE to2.id IN (
  SELECT trade_observation_id FROM trade_assets WHERE player_id = $1
)
```

The `trade_assets.player_id` has an index (`idx_ta_player_id`), but the subquery returns a set of IDs that are then used for the outer join + GROUP BY. For a popular player with 1000+ trades, this could be slow.

**Better approach:** Use a direct JOIN instead of IN-subquery.

### 🟡 PERF-4: Missing Composite Index on `trade_observations(league_id, executed_at)`

`pollLeague()` queries `trade_observations` by `league_id` (for the connected_leagues update). `backfillLeagueWithHistory()` queries by league_id. The MAX(executed_at) query in `triggerBackfillForLeague()` would benefit from a composite index.

Existing indexes: `idx_to_league_id` (league_id only), `idx_to_executed_at` (executed_at only). No composite.

### 🟡 PERF-5: `getClient()` Timeout of 5 Seconds is Too Aggressive for Advisory Locks

```javascript
const timeout = setTimeout(() => {
  logger.error('A client has been checked out for more than 5 seconds!');
}, 5000);
```

The advisory lock service waits up to 5 minutes (300,000ms) with 2-second retries. But each retry calls `getClient()`, which logs an error after 5 seconds. This fills logs with false alarms during normal lock contention. Also, the timeout only logs — it doesn't actually force-release the client.

### 🟡 PERF-6: `statement_timeout: 30000` (30s) May Kill Long ETL Queries

The pool config has `statement_timeout: 30000`. The `populateTradeOutcomes()` function processes batches of 500 trades, each requiring multiple queries. A single batch with slow value lookups could exceed 30s and be killed mid-transaction.

---

## 6. CONCURRENT WRITE ANALYSIS

### Race: Two Processes Polling Same League

**Scenario:** Scheduler calls `pollAllDueLeagues()` at the same time a user triggers `POST /api/valuation/trades/poll/:leagueId`.

**What happens:**
1. Both processes fetch the same transactions from Sleeper API (wasted work but not harmful)
2. Both call `storeTradesBatch()` → `storeTrade()` which uses `ON CONFLICT (transaction_id) DO NOTHING`
3. First writer wins; second writer's INSERT returns no rows (skipped)
4. Both processes UPDATE `connected_leagues SET total_trades_observed = COALESCE(..., 0) + $2`
5. **RACE:** If process A stores 5 trades and process B stores 3 (of which 2 were duplicates of A's), the counter increments by 5+3=8, but only 6 unique trades were stored

**Severity:** Counter drift, not data corruption. But `total_trades_observed` becomes unreliable.

### Race: Backfill + Incremental Poll

**Scenario:** `triggerBackfillForLeague()` runs for league X. Meanwhile, the scheduler's `pollAllDueLeagues()` also picks up league X (because `last_trade_poll IS NULL`).

**What happens:** Both processes poll the same rounds. All trades are deduplicated via `ON CONFLICT`. But `total_trades_observed` gets double-incremented. The backfill marks `backfill_complete = TRUE` while the poll also runs. No actual data corruption, but wasted API calls and inflated counter.

### Race: Narrative Pre-Generation Advisory Lock

`narrativePreGeneration.js` uses `pg_try_advisory_lock(424242)` via the pool-level `query()` function. This means the lock is acquired on a random pool connection. If that connection is released back to the pool and reused by another query, the lock persists on that connection. If the connection is idle-closed, the lock is released unexpectedly.

**Verdict:** The narrative pre-gen lock is unreliable. It might not actually prevent concurrent runs if the pool connection is reused.

---

## 7. RECOMMENDATIONS

### Immediate (Before April 15 Launch)

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 1 | **Fix `_result` → `result` in tradeOutcomeETL.js** | `tradeOutcomeETL.js` (5 occurrences) | 5 min |
| 2 | **Create `trade_sync_status` rows on league registration** | `connectedLeaguesService.js` `registerLeague()` | 15 min |
| 3 | **Add abandoned-backfill recovery** | `connectedLeaguesService.js` `getLeaguesNeedingBackfill()` | 10 min |
| 4 | **Remove `.catch(() => {})` on critical updates** | `tradeObservationService.js` (3 occurrences) | 10 min |
| 5 | **Switch advisory locks to transaction-level** | `advisoryLockService.js` — use `pg_try_advisory_xact_lock()` | 20 min |
| 6 | **Move `total_trades_observed` to `trade_sync_status`** | Migrate counter, update `pollLeague()` | 30 min |

### Short-Term (Phase 2)

| # | Fix | Effort |
|---|-----|--------|
| 7 | Add FK constraints or at least validation on `connected_leagues.user_id` | 1 hr |
| 8 | Reconcile `sleeper_trades` vs `trade_observations` (pick one, migrate) | 2 hr |
| 9 | Implement `grading_status` pipeline (or remove dead columns) | 2 hr |
| 10 | Parallelize `pollAllDueLeagues()` with batch processing | 1 hr |
| 11 | Fix N+1 in `bulkLookupPlayerValues()` with lateral join | 30 min |
| 12 | Add composite index on `trade_observations(league_id, executed_at)` | 5 min |

### Long-Term (Architectural)

| # | Improvement |
|---|-------------|
| 13 | Unify `connected_leagues` tracking columns with `trade_sync_status` — single source of truth |
| 14 | Add a dead-letter / cleanup job for orphaned `trade_observations` without matching `connected_leagues` |
| 15 | Add `is_outlier` detection logic or remove the column |
| 16 | Add `statement_timeout` override for ETL operations |
| 17 | Consider materialized views for `getTradesForPlayer()` if query count exceeds 10K |

---

## Appendix A: Files Audited

| File | Lines | Role |
|------|------:|------|
| `src/services/tradeObservationService.js` | 563 | Core trade ingestion pipeline |
| `src/services/tradeOutcomeETL.js` | 654 | Trade → Outcome ETL (BROKEN) |
| `src/services/tradeVelocityService.js` | 297 | Pick demand signal calculation |
| `src/services/connectedLeaguesService.js` | 422 | League lifecycle management |
| `src/services/formatFilterService.js` | 301 | Format-specific trade filtering |
| `src/services/advisoryLockService.js` | 131 | PostgreSQL advisory lock wrapper |
| `src/services/intelligence/narrativePreGeneration.js` | 317 | Narrative pre-gen with advisory lock |
| `src/services/schedulerService.js` | 2048 | Job scheduler (trade-related jobs) |
| `src/config/database.js` | 93 | Pool config, transaction helper |
| `migrations/028_trade_observation_pipeline.sql` | 120 | Schema: trade_observations, trade_assets |
| `migrations/096_public_trades_database.sql` | 32 | Schema: public_trades |
| `migrations/097_retrospective_trade_grades.sql` | 72 | Schema: retrospective_trade_grades |
| `migrations/098_trade_sync_status.sql` | 151 | Schema: trade_sync_status + extensions |
| `src/routes/valuationPipeline.js` | 230 | API routes for trade operations |
| `src/index.js` | 7183 | Startup migrations, table DDL |

## Appendix B: Table Dependency Graph

```
users (UUID PK)
  ↓ (NO FK — type mismatch)
connected_leagues (league_id + user_id composite PK)
  ↓ (NO FK — only in-code reference)
trade_sync_status (league_id + platform UNIQUE) ← NEVER UPDATED after seed
  
connected_leagues
  → trade_observations (via league_id, no FK)
      → trade_assets (FK: trade_observation_id → trade_observations.id, CASCADE)
      → trade_report_cards.source_trade_observation_id (FK, ON DELETE SET NULL) ← NEVER SET
      → trade_outcomes (via transaction_id, no FK — matched by trade_id = transaction_id)

sleeper_trades (FK: league_id → discovered_leagues.league_id) ← SEPARATE SYSTEM

public_trades (standalone, transaction_id UNIQUE)
retrospective_trade_grades (standalone, transaction_id + grade_version UNIQUE)
pick_trade_velocity (standalone, pick_identifier + period_start UNIQUE)
```

---

**End of Audit**

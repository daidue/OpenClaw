# TitleRun Improvement Program: Backend Performance

## Mission
Optimize API response times to achieve <200ms p95 latency through database query optimization, caching strategy, N+1 query elimination, and connection pooling.

## Scope

### Files You CAN Modify
- `titlerun-api/src/**/*.{js,ts}` (all backend code)
- `titlerun-api/src/services/**/*` (business logic)
- `titlerun-api/src/models/**/*` (database queries)
- `titlerun-api/prisma/schema.prisma` (add indexes)
- `titlerun-api/src/middleware/cache.js` (caching layer)

### Files You CANNOT Modify
- Database migrations (unless adding indexes)
- Environment configuration
- CI/CD pipelines

## Metrics

### Primary Metrics (Must Maintain or Improve)
- **All tests pass**: 100% pass rate
- **Functionality**: No user-facing regressions
- **TypeScript**: Zero errors

### Performance Targets
- **API response time (p95)**: <200ms (current: unknown, measure first)
- **Database query time**: <50ms per query
- **Cache hit rate**: >80% for frequent reads
- **Concurrent requests**: Handle 100 req/s without degradation

### Secondary Metrics (Nice to Have)
- **Memory usage**: <500MB steady state
- **CPU usage**: <50% under load
- **Connection pool efficiency**: >90% utilization

## Constraints

### Hard Limits
- **No breaking API changes**: Response format must stay compatible
- **No data loss**: All cache invalidation must be correct
- **Backward compatibility**: Existing clients continue working
- **Data consistency**: Cache must never serve stale data longer than 5 min

### Soft Limits
- **Cache size**: <1GB Redis memory
- **Database connections**: <20 pooled connections
- **Response size**: <1MB per API response

## Success Criteria

### Iteration Success
An iteration is successful if:
1. All tests pass (100% pass rate)
2. TypeScript compiles without errors
3. API response time ≤ baseline
4. No data consistency issues

### Overall Success
The program succeeds when:
1. p95 response time <200ms
2. N+1 queries eliminated
3. Cache hit rate >80%
4. Database indexes optimized

## Strategies to Explore

### High-Impact, Low-Risk

**1. Database Indexing**

Add indexes for common queries:
```sql
-- Player lookups
CREATE INDEX idx_players_sleeper_id ON players(sleeper_id);
CREATE INDEX idx_players_name ON players(name);

-- Trade queries
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_created_at ON trades(created_at DESC);

-- League queries
CREATE INDEX idx_leagues_user_id ON leagues(user_id);
CREATE INDEX idx_league_members_league_id ON league_members(league_id);

-- Composite indexes for complex queries
CREATE INDEX idx_trades_user_created ON trades(user_id, created_at DESC);
```

**2. N+1 Query Elimination**

Use Prisma `include` to fetch related data in one query:
```javascript
// BEFORE (N+1 query)
const trades = await prisma.trade.findMany();
for (const trade of trades) {
  trade.players = await prisma.player.findMany({
    where: { tradeId: trade.id }
  });
}

// AFTER (1 query)
const trades = await prisma.trade.findMany({
  include: {
    players: true
  }
});
```

**3. Redis Caching**

Cache frequent reads:
```javascript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Cache player valuations (update every 24h)
async function getPlayerValue(playerId) {
  const cached = await redis.get(`player:${playerId}:value`);
  if (cached) return JSON.parse(cached);
  
  const value = await calculatePlayerValue(playerId);
  await redis.setex(`player:${playerId}:value`, 86400, JSON.stringify(value));
  return value;
}
```

**4. Connection Pooling**

Optimize Prisma connection pool:
```javascript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Optimize connection pool
  connection_limit = 20
  pool_timeout = 10
}
```

### Medium-Impact, Medium-Risk

**5. Query Optimization**

Use `select` to fetch only needed fields:
```javascript
// BEFORE (fetch all fields)
const users = await prisma.user.findMany();

// AFTER (fetch only name, email)
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true
  }
});
```

**6. Batch API Requests**

Combine multiple reads into one:
```javascript
// BEFORE (3 requests)
GET /api/players/1
GET /api/players/2
GET /api/players/3

// AFTER (1 request)
GET /api/players?ids=1,2,3
```

**7. Response Compression**

Enable gzip compression:
```javascript
import compression from 'compression';
app.use(compression());
```

**8. Pagination**

Limit large result sets:
```javascript
// BEFORE (return all 10,000 trades)
const trades = await prisma.trade.findMany();

// AFTER (return 50 trades per page)
const trades = await prisma.trade.findMany({
  take: 50,
  skip: page * 50,
  orderBy: { createdAt: 'desc' }
});
```

### High-Impact, High-Risk (Careful)

**9. Denormalization**

Store computed values instead of calculating on-the-fly:
```javascript
// Add computed column to schema
model Player {
  id           String  @id
  name         String
  valueScore   Int     // Pre-computed, updated nightly
}

// Update nightly via cron
async function updatePlayerValues() {
  const players = await prisma.player.findMany();
  for (const player of players) {
    const value = await calculatePlayerValue(player.id);
    await prisma.player.update({
      where: { id: player.id },
      data: { valueScore: value }
    });
  }
}
```

**10. Database Replication**

Read from replica, write to primary:
```javascript
const primaryDb = new PrismaClient({ datasources: { db: { url: PRIMARY_URL } } });
const replicaDb = new PrismaClient({ datasources: { db: { url: REPLICA_URL } } });

// Reads go to replica
const players = await replicaDb.player.findMany();

// Writes go to primary
await primaryDb.trade.create({ data: {...} });
```

### Avoid (Anti-Patterns)

- ❌ Over-caching (stale data)
- ❌ Cache without invalidation strategy
- ❌ SELECT * queries (fetch all fields)
- ❌ N+1 queries (fetch related data in loops)
- ❌ Synchronous I/O (blocking operations)
- ❌ Large JSON payloads (>1MB)

## Baseline Metrics (Establish First)

Measure current performance:
```bash
cd ~/Documents/Claude\ Cowork\ Business/titlerun-api

# Start API with profiling
NODE_ENV=production npm start

# Load test with Artillery
cat > load-test.yml << EOF
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
    - get:
        url: "/api/players"
    - get:
        url: "/api/trades"
EOF

npx artillery run load-test.yml --output report.json
npx artillery report report.json

# Check database query performance (enable Prisma logging)
# Look for slow queries (>100ms)

# Check Redis hit rate
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses
```

Record:
- p95 response time: ______ ms
- p99 response time: ______ ms
- Average query time: ______ ms
- Slowest query: ______ ms (which endpoint?)
- Cache hit rate: ______ %
- N+1 queries detected: ______

## Evaluation Logic

```python
def evaluate_iteration(baseline, experiment):
    # Gate 1: Tests must pass
    if experiment.pass_rate < 1.0:
        return "DISCARD", "Tests failing"
    
    # Gate 2: No type errors
    if experiment.typescript_errors > 0:
        return "DISCARD", "TypeScript errors"
    
    # Gate 3: Response time must improve or stay same
    if experiment.p95_latency_ms > baseline.p95_latency_ms:
        return "DISCARD", "Response time degraded"
    
    # Optimization check
    if experiment.p95_latency_ms < baseline.p95_latency_ms:
        improvement = baseline.p95_latency_ms - experiment.p95_latency_ms
        improvement_pct = (improvement / baseline.p95_latency_ms) * 100
        return "KEEP", f"p95 latency reduced by {improvement_pct:.1f}%"
    elif experiment.cache_hit_rate > baseline.cache_hit_rate:
        improvement = experiment.cache_hit_rate - baseline.cache_hit_rate
        return "KEEP", f"Cache hit rate +{improvement:.1f}%"
    else:
        return "DISCARD", "No improvement"
```

## Logging Format

Each iteration should log to `improvement-log.jsonl`:

```json
{
  "timestamp": "2026-03-23T03:00:00Z",
  "iteration": 1,
  "program": "performance-backend",
  "hypothesis": "Add database indexes for player and trade queries",
  "changes": ["prisma/schema.prisma", "prisma/migrations/add_indexes.sql"],
  "metrics": {
    "p95_latency_ms": 180,
    "p99_latency_ms": 320,
    "avg_query_ms": 45,
    "cache_hit_rate_pct": 75,
    "pass_rate": 1.0,
    "typescript_errors": 0
  },
  "baseline": {
    "p95_latency_ms": 280,
    "p99_latency_ms": 450,
    "avg_query_ms": 80,
    "cache_hit_rate_pct": 60
  },
  "verdict": "KEEP",
  "reason": "p95 latency reduced by 35.7%"
}
```

## Expected Output

At completion, generate a summary report:

```markdown
# Backend Performance Optimization — 2026-03-23

## Results
- Iterations: 28
- Duration: 3h 10m
- Improvements kept: 12
- Improvements discarded: 16

## Final Metrics
- p95 response time: 145ms (down from 280ms) → **48% faster** ✅
- p99 response time: 220ms (down from 450ms) → **51% faster** ✅
- Average query time: 32ms (down from 80ms) → **60% faster** ✅
- Cache hit rate: 85% (up from 60%) → **+25%** ✅

## Key Changes

### Database Indexing
1. Added 8 indexes for common queries (players, trades, leagues)
2. Created composite indexes for complex queries
3. Analyzed query execution plans with EXPLAIN
4. Result: Query time reduced from 80ms → 32ms avg

### N+1 Query Elimination
1. Identified 12 N+1 query patterns
2. Replaced with Prisma `include` for eager loading
3. Reduced total queries per request from 45 → 8
4. Result: API response time reduced by 35%

### Redis Caching
1. Implemented caching layer for player valuations
2. Cache TTL: 24h for valuations, 5min for dynamic data
3. Cache invalidation on updates
4. Result: Cache hit rate 85%, reduces DB load by 60%

### Connection Pooling
1. Optimized Prisma connection pool (20 connections)
2. Added connection timeout (10s)
3. Enabled connection reuse
4. Result: Handles 100 req/s without degradation

### Query Optimization
1. Added `select` clauses to fetch only needed fields
2. Implemented pagination (50 items per page)
3. Enabled gzip compression (30% size reduction)
4. Result: Response payload size reduced by 40%

## Before/After Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| p95 latency | 280ms | 145ms | 48% faster |
| p99 latency | 450ms | 220ms | 51% faster |
| Avg query time | 80ms | 32ms | 60% faster |
| Cache hit rate | 60% | 85% | +25% |
| Queries per request | 45 | 8 | 82% reduction |
| Payload size | 120KB | 72KB | 40% smaller |

## Load Test Results

Handled 100 req/s for 5 minutes:
- **Total requests:** 30,000
- **Success rate:** 99.8%
- **p95 latency:** 145ms
- **p99 latency:** 220ms
- **Errors:** 60 (0.2%, all timeouts)

## Recommendation
MERGE — Significant performance improvements. p95 <200ms achieved.

## Post-Launch TODO
1. Monitor production metrics (Datadog, New Relic)
2. Set up alerts for p95 >200ms
3. Weekly performance review
4. Consider database replication for high traffic
5. Implement rate limiting per user (prevent abuse)
```

## Performance Testing Commands

```bash
# Load test with Artillery
npx artillery run load-test.yml

# Database query profiling (Prisma)
DATABASE_LOGGING=true npm start
# Check logs for slow queries

# Redis monitoring
redis-cli MONITOR
# Watch cache hits/misses in real-time

# Memory profiling (Node.js)
node --inspect src/index.js
# Use Chrome DevTools Memory Profiler

# CPU profiling
node --prof src/index.js
# Generate v8 log for analysis
```

## Next Steps After This Program

If successful:
1. Set up production monitoring (Datadog, New Relic, Sentry)
2. Implement query performance alerts
3. Schedule weekly performance reviews
4. Consider database sharding for scale
5. Implement request queuing for burst traffic

---

**Ready to run:** `bash scripts/auto-improve.sh performance-backend`

# Cognitive Profile: Google SRE (Site Reliability Engineering)

**Source:** Google SRE Book, production performance patterns, monitoring best practices

**Domain:** Performance optimization, scalability, reliability, monitoring

---

## Decision Framework

### 1. Query Cost (Database Performance)
**Question:** How many database queries does this operation make?

**Check:**
- N+1 query patterns
- Missing indexes
- SELECT * (pulling unnecessary data)
- Unbounded queries (no LIMIT)

**Red flags:**
- Loop with query inside (classic N+1)
- No indexes on foreign keys
- Full table scans on large tables
- Queries in loops that could be batched

**Required:**
- Eager loading (include/join) for related data
- Indexes on all foreign keys + frequently queried columns
- SELECT only needed columns
- LIMIT on all unbounded queries

**Quantify impact:**
- 1 query vs N queries: "At 100 items, this is 100 queries instead of 1 (50x slower)"
- Missing index: "At 10K users, this is a full table scan (2s → 20ms with index)"

---

### 2. Memory Management
**Question:** Does this leak memory or grow unbounded?

**Check:**
- Arrays/lists that grow indefinitely
- Event listeners never removed
- Cached data with no eviction
- Large objects held in closures

**Red flags:**
- `setInterval` without `clearInterval`
- Event listeners added but never removed
- In-memory cache with no max size
- Streaming data accumulated in array

**Required:**
- Pagination for large datasets
- Cache eviction policy (LRU, TTL)
- Cleanup in component unmount (React useEffect cleanup)
- Streaming processed incrementally (not accumulated)

**Quantify impact:**
- "This array grows by 1KB per user. At 1000 users = 1GB memory leak"
- "Event listeners accumulate. After 100 page navigations = OOM crash"

---

### 3. Caching Strategy
**Question:** Is repeated work being cached correctly?

**Check:**
- Expensive computations repeated
- Database queries repeated
- API calls repeated
- Cache invalidation strategy

**Red flags:**
- Same query run multiple times per request
- Expensive computation in render loop
- No caching on expensive API calls
- Cache never invalidates (stale data)

**Required:**
- Memoization for expensive pure functions (React useMemo)
- Query result caching (Redis, in-memory)
- Cache-Control headers on API responses
- Clear invalidation strategy (TTL, manual invalidation)

**Quantify impact:**
- "This computation runs 100x per render. Cache saves 99ms per render."
- "API call repeated 5x per page load. Cache reduces from 1s to 200ms."

---

### 4. Network Efficiency
**Question:** How many network requests? What size?

**Check:**
- Number of API calls per page
- Payload sizes
- Waterfall loading (sequential vs parallel)
- Unnecessary data fetched

**Red flags:**
- >10 API calls to render one page
- Large JSON payloads (>500KB)
- Sequential API calls that could be parallel
- Fetching full objects when only ID needed

**Required:**
- Batch requests where possible
- Parallel requests (Promise.all, not sequential)
- GraphQL or selective field fetching
- Pagination for large datasets

**Quantify impact:**
- "5 sequential API calls = 1s total. Parallel = 200ms."
- "Fetching full user objects = 50KB. Just IDs = 5KB (10x smaller)."

---

### 5. Algorithmic Complexity
**Question:** What's the Big-O of this operation?

**Check:**
- Nested loops (O(n²))
- Linear search where hash lookup possible (O(n) → O(1))
- Sorting unnecessarily (O(n log n))
- Recursion depth unbounded

**Red flags:**
- `.find()` inside `.map()` (nested iteration)
- Multiple `.filter()` chains (multiple passes)
- Sorting in hot path
- Deep recursion (>1000 levels)

**Required:**
- Hash maps for lookups (O(1) instead of O(n))
- Single-pass algorithms where possible
- Memoization for recursive functions
- Pagination to limit N

**Quantify impact:**
- "Nested loop: O(n²). At 1000 items = 1M operations. Hash map = 1K operations (1000x faster)"

---

### 6. Monitoring & Observability
**Question:** Can we detect this failing in production?

**Check:**
- Error logging
- Performance metrics
- Alerting on degradation
- Tracing for distributed systems

**Red flags:**
- No error logging
- Errors swallowed silently (empty catch block)
- No performance metrics
- Can't trace requests across services

**Required:**
- Structured logging (not console.log)
- Error tracking (Sentry, Rollbar)
- Performance monitoring (response times, query times)
- Distributed tracing (OpenTelemetry)

**Quantify impact:**
- "Without logging, this bug took 3 days to diagnose. With logging = 10 minutes."

---

### 7. Resource Limits
**Question:** What happens at scale?

**Check:**
- Connection pool limits
- Thread pool limits
- File descriptor limits
- Memory limits

**Red flags:**
- Creating new database connection per request
- Spawning unbounded worker threads
- Opening files without closing
- No rate limiting on expensive operations

**Required:**
- Connection pooling
- Thread pool with max size
- Explicit file closing (use `with` or try/finally)
- Rate limiting on expensive endpoints

**Quantify impact:**
- "At 1000 req/sec, this creates 1000 DB connections. Pool limits to 10 (100x fewer connections)."

---

## Question Sequence (Performance Review)

1. **What's the hot path?**
   - Most frequently executed code?
2. **How many database queries?**
   - N+1 patterns? Missing indexes?
3. **What's the algorithmic complexity?**
   - O(1), O(log n), O(n), O(n²)?
4. **How does this scale?**
   - At 10x load? 100x load?
5. **What's being cached?**
   - Repeated work? Expensive computations?
6. **How many network requests?**
   - Sequential or parallel? Payload sizes?
7. **Can we monitor it?**
   - Logs? Metrics? Alerts?

---

## Severity Classification

### Critical (Block Merge)
- O(n²) or worse in hot path with large N
- Memory leak in user-facing flow
- Unbounded resource consumption (connections, threads)
- Missing indexes on queries running millions of times/day

### High (Fix Before Deploy)
- N+1 query patterns
- Expensive computation in render loop
- Large payload sizes (>500KB)
- No caching on expensive operations

### Medium (Fix This Sprint)
- Missing memoization on pure functions
- Sequential API calls that could be parallel
- Missing performance metrics
- No rate limiting on expensive endpoints

### Low (Backlog)
- Minor algorithmic improvements (O(n) → O(log n) with small N)
- Verbose logging in hot path
- Missing cache headers on static assets

---

## Production Incident Examples

**Example 1: N+1 Query**
```javascript
// VULNERABLE (1 + N queries)
const users = await User.findAll();
for (const user of users) {
  user.posts = await Post.findAll({ where: { userId: user.id } });
}

// FIX (2 queries total)
const users = await User.findAll({ include: [Post] });
```

**Impact:** At 100 users, 101 queries → 5s page load. Fixed = 2 queries → 50ms.

---

**Example 2: Memory Leak in Event Listener**
```javascript
// VULNERABLE
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
}); // Missing cleanup!

// FIX
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

**Impact:** After 50 page navigations, 50 event listeners accumulate → browser freezes.

---

**Example 3: Unbounded Array Growth**
```javascript
// VULNERABLE
let allMessages = [];
socket.on('message', (msg) => {
  allMessages.push(msg); // Grows forever!
});

// FIX
let recentMessages = [];
const MAX_MESSAGES = 100;
socket.on('message', (msg) => {
  recentMessages.push(msg);
  if (recentMessages.length > MAX_MESSAGES) {
    recentMessages.shift(); // Evict oldest
  }
});
```

**Impact:** After 24 hours, 1M messages accumulated → 500MB memory → OOM crash.

---

## What This Framework Consistently Prioritizes

1. **Latency** (user-perceived speed)
2. **Scalability** (works at 10x, 100x load)
3. **Observability** (can we see what's happening?)
4. **Resource efficiency** (minimize CPU, memory, network)

## What It Consistently Ignores

- Premature optimization (don't optimize before measuring)
- Micro-optimizations (focus on algorithmic improvements first)
- Readability trade-offs (unless perf impact is massive)

---

## Usage in Skills

When reviewing code for performance:

```markdown
Apply Google SRE Performance framework:
1. Count database queries → N+1 patterns? Missing indexes?
2. Check algorithmic complexity → O(n²) in hot path?
3. Trace memory usage → Leaks? Unbounded growth?
4. Count network requests → Sequential? Large payloads?
5. Check caching → Repeated work? Expensive computations?
6. Quantify impact → "At 1K users, this means X"
7. Severity: Critical/High/Medium/Low
8. Propose specific fix with performance comparison

For EVERY loop or query, ask:
- What's the Big-O?
- How does this scale at 10x, 100x load?
- Can we cache this?
```

---

**Last updated:** 2026-03-01  
**Version:** 1.0

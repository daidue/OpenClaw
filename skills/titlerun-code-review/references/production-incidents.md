# TitleRun Production Incidents

**Real incidents that have occurred. Use these to inform code review severity.**

---

## Incident 1: Mobile Auto-Refresh Cascade

**Date:** 2026-02-16  
**Duration:** 3 days to diagnose  
**Impact:** Infinite re-render loop on mobile devices (not desktop)

### Root Cause

`.find()` without `useMemo` created new object every render.

```tsx
// BAD: This code caused the incident
const selectedPlayer = players.find(p => p.id === selectedId);
```

React thought data changed every render → triggered re-render → new object → infinite loop.

### Why Mobile-Only

Desktop React DevTools detected the loop and warned. Mobile had no dev tools running, so loop continued until browser crashed.

### Impact

- Users reported app "freezing" on mobile
- 60+ crash reports
- 3 days to diagnose (worked fine in dev, worked fine on desktop)
- Pattern: `useEffect` with `selectedPlayer` as dependency

### Fix

```tsx
const selectedPlayer = useMemo(
  () => players.find(p => p.id === selectedId),
  [players, selectedId]
);
```

### Prevention in Code Review

**Flag as HIGH severity if:**
- Any `.find()`, `.filter()`, `.map()` in component without `useMemo`/`useCallback`
- Especially if result is used in `useEffect` dependency array

**Reference in finding:**
```
HIGH: Same pattern as 2026-02-16 mobile infinite loop incident

This `.find()` without useMemo caused 3-day outage.
Mobile devices crashed, took 60 hours to diagnose.

[Full finding with fix]
```

---

## Incident 2: 60-Hour Rate Limit Outage

**Date:** 2026-02-17 to 2026-02-19  
**Duration:** 60 hours  
**Impact:** All crons failed, no agent activity for 2.5 days

### Root Cause

Heavy sub-agent spawning overnight burned through API rate limits.

**What happened:**
- 60+ sub-agents spawned for TitleRun build day
- Each sub-agent: 10K-50K tokens
- Total: ~$700-1000 in API costs in 24 hours
- Hit provider rate limit (60-hour penalty)

### Impact

- No cron jobs ran (Jeff, Rush, Grind all silent)
- No dogfood QA
- No code reviews
- No automated monitoring
- Taylor had to manually intervene

### Fix

1. Added token budget monitoring
2. Throttled sub-agent spawning (max 3 concurrent)
3. Set up alert when approaching rate limits
4. Added cost tracking dashboard

### Prevention in Code Review

**Not directly code-reviewable** (operational issue), but:

**Flag if:**
- Code spawns sub-agents in loops without throttling
- Missing token budget checks before spawning agents
- No error handling for rate limit responses

---

## Incident 3: Nested Response Envelope (#1 Recurring Bug)

**Date:** Multiple incidents (2026-02-10, 2026-02-14, 2026-02-20, others)  
**Frequency:** ~11 PRs with this pattern  
**Impact:** "Cannot read property 'X' of undefined" errors

### Root Cause

Backend returns `response.data.data.X`, frontend expects `response.data.X`.

```typescript
// Backend (BAD)
return res.json({
  data: {
    data: players  // Double nesting!
  }
});

// Frontend expects
const players = response.data.players;  // Undefined!
```

### Why It Recurs

- Copy-paste from existing code
- No type safety across API boundary
- Inconsistent return format conventions

### Impact

- Frontend crashes on data access
- Error messages don't clearly indicate nesting issue
- ~30 min to diagnose each time

### Fix

**Backend:**
```typescript
return res.json({
  data: players  // Single level
});
```

**Validation library (2026-03-01):**
`@titlerun/validation` now enforces single-level response format.

### Prevention in Code Review

**Flag as HIGH severity if:**
- API endpoint returns `{ data: { data: ... } }`
- Search for pattern: `data: \{\s*data:`

**Reference in finding:**
```
HIGH: Nested response envelope — #1 recurring bug

This pattern has broken 11 PRs.
Frontend expects response.data.X, this returns response.data.data.X.

[Full finding with fix]
```

---

## Incident 4: Cache-Related Bugs

**Date:** Multiple (2026-02-12, 2026-02-18)  
**Pattern:** Works in Chrome private mode, breaks in regular mode  
**Impact:** User state pollution, stale data

### Root Cause

localStorage or TanStack Query cache not invalidated properly.

**Common scenarios:**
1. User logs out → localStorage not cleared → next user sees previous user's data
2. Data updated → cache not invalidated → user sees stale data
3. API response format changed → cached old format → parse errors

### Impact

- Intermittent bugs (hard to reproduce)
- "Works on my machine" (developer uses private mode for testing)
- Security risk (data leakage between sessions)

### Fix

**Explicit cache invalidation:**
```typescript
// On logout
localStorage.clear();
queryClient.clear();

// On data mutation
queryClient.invalidateQueries(['key']);

// Versioned cache keys
const cacheKey = ['players', 'v2'];  // Increment on format change
```

### Prevention in Code Review

**Flag as MEDIUM severity if:**
- localStorage usage without clear invalidation logic
- TanStack Query mutations without `invalidateQueries`
- No cache versioning strategy

**Flag as HIGH if:**
- User-specific data cached without session key
- No logout cache clear logic

---

## Incident 5: N+1 Query Performance Degradation

**Date:** 2026-02-15 (staging, caught before production)  
**Impact:** 5s page load at 100 records, projected 50s at 1K records

### Root Cause

Query inside loop (N+1 pattern).

```typescript
for (const trade of trades) {
  trade.players = await getPlayers(trade.id);  // Query per trade!
}
```

**At scale:**
- 100 trades = 101 queries
- 1000 trades = 1001 queries
- Database connection pool exhausted

### Impact

- Caught in staging during load testing
- Would have made production unusable at scale

### Fix

```typescript
const trades = await prisma.trade.findMany({
  include: { players: true }  // Single query with JOIN
});
```

### Prevention in Code Review

**Flag as HIGH severity if:**
- Query (await, prisma, db) inside loop
- Even if loop is small in dev data (will grow in production)

**Quantify impact:**
- "At 100 records: 101 queries (should be 1)"
- "At 1K records: 1001 queries (unusable)"

---

## Summary: Severity Guidelines from Incidents

| Pattern | Severity | Rationale |
|---------|----------|-----------|
| `.find()` without useMemo | HIGH | Caused 3-day mobile outage |
| Nested response envelope | HIGH | Recurring across 11+ PRs |
| N+1 query pattern | HIGH | Unusable at scale (caught in staging) |
| Missing cache invalidation | MEDIUM-HIGH | Data leakage + stale data |
| Sub-agent spawning without throttle | MEDIUM | Operational risk (rate limits) |

---

## Usage in Code Review

**For each finding, check:**
1. Does this match a known incident pattern?
2. If yes → reference the incident
3. Elevate severity (pattern has proven to cause real issues)
4. Include incident details in impact section

**Example reference:**
```
HIGH: Same pattern as [Incident Name]

Date: YYYY-MM-DD
Impact: [what happened]
Diagnosis time: [how long to find]

This pattern has caused production issues before.

[Full finding with fix]
```

---

**Last updated:** 2026-03-01  
**Version:** 1.0.0  
**Total incidents documented:** 5

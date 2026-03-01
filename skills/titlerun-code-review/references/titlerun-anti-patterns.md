# TitleRun-Specific Anti-Patterns

**Domain knowledge AI wouldn't have by default.**

These patterns have caused production incidents or recurring bugs in TitleRun.

---

## Backend Anti-Patterns

### 1. Nested Response Envelope (**#1 RECURRING BUG**)

**Pattern:**
```typescript
return res.json({
  data: {
    data: result  // Double nesting!
  }
});
```

**Why it's wrong:**
Frontend expects `response.data.X` but gets `response.data.data.X`

**Causes:** "Cannot read property 'X' of undefined"

**Correct:**
```typescript
return res.json({
  data: result  // Single level
});
```

**Check:** Search for `data: { data:` pattern

---

### 2. Manual ID Validation (Should Use Shared Library)

**Pattern:**
```typescript
const id = String(req.params.id);
if (!id || isNaN(Number(id))) {
  return res.status(400).json({ error: 'Invalid ID' });
}
```

**Why it's wrong:**
We have `@titlerun/validation` library that handles this (as of 2026-03-01)

**Correct:**
```typescript
import { normalizeId } from '@titlerun/validation';

const id = normalizeId(req.params.id);
// Throws if invalid, returns normalized number
```

**Check:** Search for manual ID validation logic

---

### 3. Missing Request Deduplication

**Pattern:**
```typescript
// Component makes same API call 5x on rapid re-renders
const data = await fetch(`/api/trades/${id}`);
```

**Why it's wrong:**
No deduplication = concurrent identical requests = wasted backend load

**Correct:**
```typescript
const inflightRequests = new Map();

if (inflightRequests.has(key)) {
  return inflightRequests.get(key);
}

const promise = fetch(url);
inflightRequests.set(key, promise);
return promise;
```

**Check:** Search for fetch calls without deduplication in hooks

---

## Frontend Anti-Patterns

### 4. `.find()` Without useMemo (**MOBILE AUTO-REFRESH BUG**)

**Pattern:**
```typescript
const selectedPlayer = players.find(p => p.id === selectedId);
```

**Why it's wrong:**
`.find()` returns NEW object every render → React thinks data changed → infinite re-render on mobile

**Incident:** 2026-02-16 - Caused infinite loop on mobile (not desktop)

**Correct:**
```typescript
const selectedPlayer = useMemo(
  () => players.find(p => p.id === selectedId),
  [players, selectedId]
);
```

**Check:** Search for `.find(`, `.filter(`, `.map(` WITHOUT useMemo/useCallback in components

---

### 5. Cache-Related Patterns (Private Mode vs Regular)

**Pattern:**
Any code that works in Chrome private mode but breaks in regular Chrome

**Why it's a problem:**
Usually indicates caching bug or state pollution from previous session

**Check:**
- localStorage without clear invalidation
- Cache headers missing on API responses
- Stale TanStack Query cache

**Fix:** Explicit cache invalidation logic

---

## Database Anti-Patterns

### 6. Missing Indexes on Prisma Foreign Keys

**Pattern:**
```prisma
model Trade {
  userId Int
  user User @relation(fields: [userId], references: [id])
}
```

**Why it's wrong:**
No explicit index = full table scan on user lookups

**Correct:**
```prisma
model Trade {
  userId Int
  user User @relation(fields: [userId], references: [id])
  
  @@index([userId])  // Explicit index
}
```

**Check:** All `@relation` fields should have `@@index`

---

## Severity Guidelines for TitleRun Patterns

| Pattern | Severity | Rationale |
|---------|----------|-----------|
| Nested response envelope | CRITICAL | #1 recurring bug, breaks frontend |
| Manual ID validation | HIGH | We have library for this, use it |
| Missing deduplication | MEDIUM | Wastes resources but doesn't break |
| `.find()` without useMemo | HIGH | Caused production incident (mobile) |
| Cache-related bugs | HIGH | Hard to diagnose, affects real users |
| Missing Prisma indexes | HIGH | Performance degrades at scale |

---

## Production Incidents Reference

**Link to:** `references/production-incidents.md` for full details

Quick reference of what these patterns caused:
- Nested envelope: 11 PRs with same bug
- `.find()` without useMemo: 3-day diagnosis, mobile-only infinite loop
- Missing deduplication: Unnecessary backend load, API rate limit hits

---

**Last updated:** 2026-03-01  
**Version:** 1.0.0

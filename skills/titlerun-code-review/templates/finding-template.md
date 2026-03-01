# Finding Template

**Use this exact format for EVERY finding. All 5 elements required.**

---

## [SEVERITY]: [One-line issue description]

**File:** `path/to/file.ts`  
**Line:** XX or XX-YY  
**Framework:** [OWASP Security / Google SRE Performance / Nielsen UX / TitleRun Anti-Pattern]

---

### Issue

[Code snippet showing the problematic code]

```typescript
// Show actual code here (5-15 lines of context)
```

---

### Impact

[Quantified impact with numbers and scale]

**At production scale:**
- [Specific metric: "At 1K users, causes 5s page load"]
- [Specific consequence: "Database lock for 500ms per request"]
- [Business impact if relevant: "Blocks checkout flow"]

**Current state vs Fixed state:**
- Current: [quantified]
- After fix: [quantified]
- Improvement: [X× faster / Y fewer queries / Z% less memory]

---

### Fix

[Concrete code showing the solution]

```typescript
// Show corrected code here (5-15 lines)
```

**What changed:**
- [Specific change 1]
- [Specific change 2]

---

### Test

[Test case to verify the fix works]

```typescript
// Test code here
describe('FeatureName', () => {
  it('should handle edge case correctly', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

**Or if manual test:**
1. [Step 1]
2. [Step 2]
3. [Expected result]

---

### Reference

**Cognitive framework:** [Which framework caught this]

**Specific principle:**
- OWASP → [A03:2021 Injection]
- Google SRE → [Query Optimization / Algorithmic Complexity / etc.]
- Nielsen → [Heuristic #X: Name]
- TitleRun → [Anti-pattern #X from production-incidents.md]

**If production incident:** Link to incident (e.g., "Same pattern as 2026-02-16 mobile loop")

---

## Checklist (Verify Before Including Finding)

- [ ] File path is exact (not "the file" or "this file")
- [ ] Line number is exact (not "in the function")
- [ ] Code snippet is shown (not described in words)
- [ ] Impact is quantified (numbers + scale present)
- [ ] Fix is shown with code (not described)
- [ ] Test case provided (code or manual steps)
- [ ] Reference to framework (which cognitive profile caught this)
- [ ] NO banned phrases used (check against banned-phrases.md)

**If ANY checkbox unchecked → Finding is incomplete, add missing element**

---

## Examples

### Example 1: Security (CRITICAL)

## CRITICAL: SQL Injection via Player Search

**File:** `titlerun-api/src/routes/players.ts`  
**Line:** 47  
**Framework:** OWASP Security (A03:2021 - Injection)

---

### Issue

Direct string interpolation in SQL query allows injection attack.

```typescript
export async function searchPlayers(req: Request, res: Response) {
  const search = req.query.search;
  const query = `SELECT * FROM players WHERE name LIKE '%${search}%'`;
  const results = await db.query(query);
  return res.json({ data: results });
}
```

---

### Impact

**At production scale (10K users):**
- Attacker can inject SQL: `'; DROP TABLE players--`
- Extracts entire player database (50K records)
- Modifies player valuations to manipulate trades
- Company-ending security breach

**Attack surface:**
- Public endpoint (no auth required)
- User input directly in query
- No validation or sanitization

---

### Fix

Use parameterized query:

```typescript
export async function searchPlayers(req: Request, res: Response) {
  const search = String(req.query.search);
  
  // Validate input
  if (search.length > 100 || !/^[a-zA-Z0-9\s]+$/.test(search)) {
    return res.status(400).json({ error: 'Invalid search query' });
  }
  
  // Parameterized query (Prisma handles escaping)
  const results = await prisma.player.findMany({
    where: {
      name: { contains: search }
    }
  });
  
  return res.json({ data: results });
}
```

**What changed:**
- Input validation added (length + regex)
- Parameterized query via Prisma (no string interpolation)
- 400 error for invalid input

---

### Test

```typescript
describe('Player Search', () => {
  it('should reject SQL injection attempts', () => {
    const maliciousInput = "'; DROP TABLE players--";
    expect(() => searchPlayers(maliciousInput)).toThrow();
  });
  
  it('should reject overly long input', () => {
    const longInput = 'a'.repeat(101);
    expect(() => searchPlayers(longInput)).toThrow();
  });
  
  it('should accept valid input', () => {
    const validInput = 'Patrick Mahomes';
    expect(searchPlayers(validInput)).resolves.toBeArray();
  });
});
```

---

### Reference

**Cognitive framework:** OWASP Security  
**Specific principle:** A03:2021 - Injection

**OWASP guidance:**
> Use parameterized queries, prepared statements, or stored procedures instead of building queries with string concatenation.

---

### Example 2: Performance (HIGH)

## HIGH: N+1 Query Pattern Causes 50× Slowdown

**File:** `titlerun-api/src/routes/trades.ts`  
**Line:** 89-95  
**Framework:** Google SRE Performance (Query Optimization)

---

### Issue

Query inside loop creates N+1 pattern.

```typescript
export async function getTrades(leagueId: number) {
  const trades = await prisma.trade.findMany({
    where: { leagueId }
  });
  
  for (const trade of trades) {
    trade.players = await prisma.tradePlayer.findMany({
      where: { tradeId: trade.id }
    });
  }
  
  return trades;
}
```

---

### Impact

**At production scale:**
- 100 trades = 101 queries (1 + 100)
- Load time: 5 seconds for 100 trades
- At 1000 trades: 50 seconds (unusable)

**Database impact:**
- 100 round-trips to database
- Connection pool exhaustion under load
- Locks held for entire duration

**Current state:**
- 100 trades: 5s load time, 101 queries

**After fix:**
- 100 trades: 50ms load time, 1 query
- **100× faster**

---

### Fix

Single query with join:

```typescript
export async function getTrades(leagueId: number) {
  const trades = await prisma.trade.findMany({
    where: { leagueId },
    include: {
      players: true  // Single query with JOIN
    }
  });
  
  return trades;
}
```

**What changed:**
- Removed loop with query inside
- Added `include` for eager loading
- Single query with JOIN instead of 101 separate queries

---

### Test

Verify query count:

```typescript
describe('Trade Loading', () => {
  it('should load trades with single query', async () => {
    const queryLog = [];
    prisma.$on('query', (e) => queryLog.push(e));
    
    await getTrades(leagueId);
    
    expect(queryLog.length).toBe(1); // Not 101!
  });
  
  it('should load players for each trade', async () => {
    const trades = await getTrades(leagueId);
    expect(trades[0].players).toBeDefined();
    expect(trades[0].players.length).toBeGreaterThan(0);
  });
});
```

---

### Reference

**Cognitive framework:** Google SRE Performance  
**Specific principle:** Query Optimization - Avoid N+1 patterns

**Google SRE guidance:**
> Minimize database round-trips. Use JOINs or batch queries instead of iterating with individual queries.

---

**Version:** 1.0.0  
**Last updated:** 2026-03-01

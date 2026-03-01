# Backend Code Review Workflow

**Loaded when:** Backend files detected (`.ts` files in `/api/` OR `.ts` NOT `.tsx`)

---

## Cognitive Frameworks to Load

**Always load these before starting review:**

```markdown
Load ../../cognitive-profiles/owasp-security.md
Load ../../cognitive-profiles/google-sre-performance.md
Load ../references/titlerun-anti-patterns.md (backend section)
Load ../references/production-incidents.md
Load ../references/tech-stack.md (TypeScript/Express/Prisma section)
```

---

## Review Sequence (Execute in Order)

### Step 1: Security Review (OWASP Framework)

**Apply OWASP Top 10 systematically to each changed file.**

**For each file:**

1. **A01:2021 – Broken Access Control**
   - Is authentication checked before sensitive operations?
   - Are user IDs validated (own resources only)?
   - Are admin routes protected?

2. **A02:2021 – Cryptographic Failures**
   - Are passwords hashed (bcrypt/argon2)?
   - Are API keys stored securely (env vars, not hardcoded)?
   - Is sensitive data encrypted at rest?

3. **A03:2021 – Injection**
   - **SQL Injection:** Are queries parameterized? (Prisma helps but check raw SQL)
   - **NoSQL Injection:** Are MongoDB queries sanitized?
   - **Command Injection:** Are shell commands escaped?

4. **A04:2021 – Insecure Design**
   - Are rate limits implemented for public endpoints?
   - Is input validation comprehensive (not just client-side)?
   - Are business logic flaws possible (negative quantities, etc.)?

5. **A05:2021 – Security Misconfiguration**
   - Are error messages production-safe (no stack traces to user)?
   - Are default credentials changed?
   - Is CORS configured correctly (not `*` in production)?

6. **A06:2021 – Vulnerable Components**
   - Are dependencies up to date? (check package.json changes)
   - Are known vulnerabilities present? (npm audit)

7. **A07:2021 – Authentication Failures**
   - Are passwords validated (length, complexity)?
   - Is session management secure (httpOnly cookies)?
   - Is multi-factor authentication supported?

8. **A08:2021 – Software and Data Integrity**
   - Are CI/CD pipelines secure?
   - Are updates signed/verified?

9. **A09:2021 – Security Logging Failures**
   - Are authentication failures logged?
   - Are sensitive operations audited?
   - Are logs protected from tampering?

10. **A10:2021 – Server-Side Request Forgery**
    - Are user-provided URLs validated?
    - Is SSRF prevention implemented?

**For each finding:** Use `templates/finding-template.md` format

**Severity:**
- CRITICAL: Direct exploit possible (SQL injection, auth bypass)
- HIGH: Indirect exploit or data exposure risk
- MEDIUM: Security best practice violation
- LOW: Hardening opportunity

---

### Step 2: Performance Review (Google SRE Framework)

**Apply Google SRE performance principles:**

**2.1 Query Optimization**

Check for:
- **N+1 queries** (loop with query inside)
  ```typescript
  // BAD
  for (const trade of trades) {
    trade.players = await getPlayers(trade.id); // Query in loop!
  }
  
  // GOOD
  const trades = await prisma.trade.findMany({
    include: { players: true } // Single query with join
  });
  ```

- **Missing indexes** on foreign keys
- **SELECT \*** when only few columns needed
- **Unbounded queries** (no LIMIT on user-facing endpoints)

**Impact quantification required:**
- "At X records, causes Y queries (Z× more than needed)"
- "Load time: A seconds at B scale → C seconds with fix"

---

**2.2 Algorithmic Complexity**

Check for:
- **O(n²)** or worse in loops
  ```typescript
  // BAD: O(n²)
  for (const player of players) {
    for (const trade of trades) {
      if (trade.playerId === player.id) { ... }
    }
  }
  
  // GOOD: O(n)
  const tradeMap = new Map(trades.map(t => [t.playerId, t]));
  for (const player of players) {
    const trade = tradeMap.get(player.id);
  }
  ```

**Impact quantification:**
- "At 100 items: X operations"
- "At 1000 items: Y operations (Z× slower)"

---

**2.3 Memory Efficiency**

Check for:
- **Large arrays loaded into memory** (should stream)
- **Missing pagination** on list endpoints
- **Memory leaks** (event listeners not cleaned up)

---

**2.4 Caching**

Check for:
- **Repeated expensive calculations** (should cache)
- **Missing cache headers** on static data
- **Stale cache invalidation** logic

---

### Step 3: TitleRun-Specific Anti-Patterns

**Load:** `../references/titlerun-anti-patterns.md` (backend section)

**Check for these 6 patterns (mark as HIGH severity minimum):**

1. **Nested Response Envelope** (#1 recurring bug)
   - Search for: `data: { data:`
   - Should be single level: `{ data: result }`

2. **Manual ID Validation** (should use @titlerun/validation)
   - Search for: `isNaN(Number(id))`
   - Should use: `normalizeId()` from validation library

3. **Missing Request Deduplication**
   - Check data-fetching hooks for deduplication logic
   - Should have: `inflightRequests` Map pattern

---

### Step 4: Production Incident Check

**Load:** `../references/production-incidents.md`

**For each incident listed:**
- Does this code match the pattern that caused the incident?
- If yes → FLAG as CRITICAL with incident reference

**Example:**
```
CRITICAL: Same pattern as 2026-02-16 mobile infinite loop incident

This `.find()` without useMemo caused 60-hour outage.

[Full finding with fix]
```

---

### Step 5: Tech Stack Specifics

**Load:** `../references/tech-stack.md` (TypeScript/Express/Prisma)

**TypeScript checks:**
- Are `any` types avoided? (should be specific types)
- Are null checks present? (optional chaining `?.`)
- Are error types properly defined?

**Express checks:**
- Are async errors caught? (try/catch or async middleware)
- Are request bodies validated before use?
- Are status codes semantic (404 vs 400 vs 500)?

**Prisma checks:**
- Are relations defined correctly?
- Are indexes present on foreign keys?
- Are migrations reversible?

---

## Output Format

**Collect all findings using:** `../templates/finding-template.md`

**Structure:**
```markdown
## Backend Review Results

**Files reviewed:** X files, Y lines

**Findings by severity:**
- CRITICAL: X issues
- HIGH: Y issues
- MEDIUM: Z issues
- LOW: W issues

### CRITICAL ISSUES

[Use finding-template.md for each]

### HIGH ISSUES

[Use finding-template.md for each]

[etc.]
```

---

## Backend-Specific Severity Guidelines

| Issue Type | Severity | Rationale |
|------------|----------|-----------|
| SQL injection | CRITICAL | Direct exploit, data compromise |
| Auth bypass | CRITICAL | Full system compromise |
| N+1 queries | HIGH | Performance degrades at scale |
| Missing validation | HIGH | Can cause errors or exploits |
| Missing indexes | HIGH | Unusable at >1K records |
| Nested envelope | HIGH | #1 recurring bug, breaks frontend |
| Memory leak | MEDIUM | Gradual degradation |
| Missing logs | MEDIUM | Harder to debug issues |
| Hardcoded values | LOW | Should be config but not breaking |

---

**Version:** 1.0.0  
**Last updated:** 2026-03-01

# Security & Data Integrity Audit - Advanced Stats Phase 1 + Phase 2

**Auditor:** Security & Data Integrity Expert  
**Date:** 2026-03-15  
**Scope:** 12 files (7 frontend, 5 backend)  
**Framework:** OWASP Top 10 compliance

---

## Overall Score: 82/100

**Rating:** Good (with critical fixes needed)

---

## Critical Issues (Must Fix Before Deploy)

### C1: SQL Injection Vulnerability in PFR Scraper
**Location:** `scrapeProFootballReference.js:107-125`  
**Impact:** SQL injection via unsanitized player names  
**Severity:** CRITICAL

**Problem:**
```javascript
const normalizedName = name.toLowerCase().replace(/[.']/g, '').replace(/\s+/g, ' ').trim();

let result = await query(
  `SELECT id FROM players 
   WHERE LOWER(REPLACE(REPLACE(full_name, '.', ''), ' ', '')) = $1
     AND position = $2
   LIMIT 1`,
  [normalizedName.replace(/\s/g, ''), position]
);
```

While parameterized queries ($1, $2) are used, the `normalizeName()` function doesn't prevent injection via position parameter. If a malicious scraper response includes position='QB"; DROP TABLE players--', it could execute.

**Fix:**
```javascript
// Whitelist position values
const VALID_POSITIONS = ['QB', 'RB', 'WR', 'TE'];
if (!VALID_POSITIONS.includes(position)) {
  logger.warn(`Invalid position: ${position}`);
  return null;
}
```

---

### C2: XSS Vulnerability in MetricTooltip
**Location:** `MetricTooltip.jsx:63`  
**Impact:** Stored XSS if metric definitions contain malicious HTML  
**Severity:** CRITICAL

**Problem:**
```jsx
<p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
  {definition.description}
</p>
```

If `metricDefinitions.js` is ever loaded from external source or database (future enhancement), this could execute arbitrary JS.

**Fix:**
```jsx
<p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
  {DOMPurify.sanitize(definition.description)}
</p>
```

Or better: use PropTypes validation on definition object to ensure it's a string.

---

### C3: Missing NaN/Infinity Validation in Percentile Calculations
**Location:** `PercentileRing.jsx:35-40`  
**Impact:** UI breaks with invalid data; potential Infinity loops  
**Severity:** CRITICAL

**Problem:**
```javascript
const progress = Math.max(0, Math.min(100, percentile)); // Clamp 0-100
```

This doesn't handle `NaN` or `Infinity`. If percentile is `NaN`, progress becomes `NaN`, breaking SVG rendering.

**Fix:**
```javascript
if (percentile == null || isNaN(percentile) || !isFinite(percentile)) {
  return null;
}
const progress = Math.max(0, Math.min(100, percentile));
```

---

## High Priority Issues

### H1: No Rate Limiting Enforcement on Scrapers
**Location:** All 3 scrapers (`scrapeProFootballReference.js:38`, `scrapeNextGenStats.js:22`, `scrapeESPN.js:17`)  
**Impact:** Could get IP banned from PFR/NFL/ESPN  
**Severity:** HIGH

**Problem:**
```javascript
const RATE_LIMIT_MS = 1000;
let lastRequestTime = 0;

async function fetchPFR(url) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLastRequest));
  }
  
  lastRequestTime = Date.now();
  // ... fetch
}
```

**Issues:**
1. No tracking of total requests per hour/day (could exceed hidden limits)
2. No exponential backoff on 429 responses
3. `lastRequestTime` is module-scoped — concurrent scrapers will race

**Fix:**
```javascript
// Add retry logic with exponential backoff
async function fetchPFR(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, { /* ... */ });
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers['retry-after']) || (Math.pow(2, i) * 1000);
        logger.warn(`Rate limited. Retrying after ${retryAfter}ms`);
        await sleep(retryAfter);
        continue;
      }
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
}
```

---

### H2: Unchecked User Input in localStorage Keys
**Location:** `MetricGroup.jsx:64`  
**Impact:** localStorage poisoning attack  
**Severity:** HIGH

**Problem:**
```javascript
const storageKey = `metricGroup_${groupKey}_${position}_expanded`;
```

If `groupKey` or `position` come from URL params or user input (future enhancement), attacker could pollute localStorage.

**Fix:**
```javascript
const sanitizeKey = (str) => str.replace(/[^a-zA-Z0-9_]/g, '');
const storageKey = `metricGroup_${sanitizeKey(groupKey)}_${sanitizeKey(position)}_expanded`;
```

---

### H3: Potential Division by Zero in Metric Calculations
**Location:** `playerIntelligencePhase2.js:184-189`  
**Impact:** NaN values propagate to frontend  
**Severity:** HIGH

**Problem:**
```javascript
if (situational?.pressure?.dropbacks > 0) {
  metrics.pressuredCompPct = (situational.pressure.completions / situational.pressure.dropbacks) * 100;
}
```

If `dropbacks` is 1e-10 (near-zero but not zero), result is valid but meaningless. Should validate minimum threshold.

**Fix:**
```javascript
const MIN_SAMPLE_SIZE = 5;
if (situational?.pressure?.dropbacks >= MIN_SAMPLE_SIZE) {
  metrics.pressuredCompPct = (situational.pressure.completions / situational.pressure.dropbacks) * 100;
}
```

---

### H4: Missing Error Boundaries in React Components
**Location:** `AdvancedStats.jsx`, `MetricGroup.jsx`, all Phase 1 components  
**Impact:** Entire page crashes if one component errors  
**Severity:** HIGH

**Problem:**
No error boundaries wrapping components. If `getMetricDefinition()` throws, entire app crashes.

**Fix:**
Wrap `<AdvancedStats>` in an error boundary:
```jsx
<ErrorBoundary fallback={<AdvancedStatsErrorFallback />}>
  <AdvancedStats playerId={playerId} position={position} />
</ErrorBoundary>
```

---

### H5: Unvalidated Data from External Scrapers
**Location:** All scrapers  
**Impact:** Malformed data breaks percentile calculations  
**Severity:** HIGH

**Problem:**
Scrapers trust external HTML structure. If PFR changes their table structure, scraper returns garbage data.

**Fix:**
Add schema validation on scraped data:
```javascript
const scraperSchema = z.object({
  name: z.string().min(1),
  position: z.enum(['QB', 'RB', 'WR', 'TE']),
  pressured_dropbacks: z.number().int().min(0).nullable(),
  // ... all fields
});

const validated = scraperSchema.safeParse(stats);
if (!validated.success) {
  logger.error(`Invalid scraper data:`, validated.error);
  return null;
}
```

---

## Medium Priority Issues

### M1: No HTTPS Enforcement in Scraper URLs
**Location:** All scrapers  
**Severity:** MEDIUM

Some URLs use `https://`, but no validation that redirects stay HTTPS. MitM attack could inject bad data.

**Fix:** Validate final response URL is HTTPS before trusting data.

---

### M2: LocalStorage Not Cleared on Logout
**Location:** `MetricGroup.jsx:73`  
**Severity:** MEDIUM

Expansion state persists across sessions. If shared computer, next user sees previous user's preferences.

**Fix:** Add session-scoped storage or clear localStorage on logout.

---

### M3: No Input Sanitization on Player IDs
**Location:** `AdvancedStats.jsx:391`  
**Severity:** MEDIUM

`playerId` is validated length but not format. Could pass `"../../../etc/passwd"` if validation is weak.

**Fix:**
```javascript
const VALID_PLAYER_ID_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;
if (!validatePlayerId(playerId) || !VALID_PLAYER_ID_REGEX.test(playerId)) {
  return <InvalidPlayerIdFallback />;
}
```

---

### M4: Database Migration Has No Rollback
**Location:** `063_advanced_stats_phase2_tables.sql:177-181`  
**Severity:** MEDIUM

Rollback is commented out. If migration fails halfway, database is in bad state.

**Fix:** Wrap migration in transaction:
```sql
BEGIN;
CREATE TABLE IF NOT EXISTS player_situational_stats (...);
-- ... all creates
COMMIT;
```

---

### M5: Scraper Timeout Too High
**Location:** `scrapeProFootballReference.js:59`, others  
**Severity:** MEDIUM

25-second timeout means hung connections block scraper for too long.

**Fix:** Reduce to 10 seconds, add retry logic.

---

## Low Priority Issues

### L1: Missing Content-Security-Policy Headers
**Severity:** LOW

No CSP headers to prevent XSS. Frontend should set CSP in nginx/Vercel config.

---

### L2: No Logging of Failed Validations
**Severity:** LOW

When `validatePlayerId()` fails, it returns fallback UI but doesn't log for debugging.

**Fix:** Add telemetry on validation failures.

---

### L3: Cheerio Version Not Pinned
**Severity:** LOW

Scrapers use `cheerio` but package.json should pin exact version to prevent breaking changes.

---

## Security Strengths

✅ **Parameterized SQL queries** throughout backend  
✅ **PropTypes validation** on React components  
✅ **Graceful degradation** on missing data (no crashes)  
✅ **No eval() or dangerouslySetInnerHTML** in frontend  
✅ **Logger used consistently** for audit trail  
✅ **No secrets in code** (all external URLs are public)

---

## Recommendations

### Immediate (Before Deploy)
1. ✅ Fix C1: Whitelist position values in all scrapers
2. ✅ Fix C2: Add PropTypes.string.isRequired to MetricTooltip definition props
3. ✅ Fix C3: Add NaN/Infinity checks in PercentileRing and PercentileBar
4. ⚠️ Add error boundaries to top-level components

### Short-Term (Next Sprint)
1. Implement exponential backoff on scraper rate limits
2. Add Zod schema validation on scraper output
3. Add CSP headers to frontend
4. Wrap DB migration in transaction

### Long-Term (Backlog)
1. Implement scraper health monitoring (alert if PFR structure changes)
2. Add honeypot endpoints to detect scraper bans
3. Implement E2E tests for security regressions
4. Add penetration testing to CI/CD pipeline

---

**Final Verdict:** 82/100 — FIX C1-C3 before deploy. Code is generally secure but has edge cases that could cause production issues.

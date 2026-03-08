# TitleRun API Integration & Error Handling QA Report
**Date:** 2026-03-08
**Tester:** QA API Integration Subagent
**Environment:** Production (https://app.titlerun.co / https://api.titlerun.co)
**User:** qa-test-2026@example.com (free tier)
**League:** @12DudesDeep

---

## Executive Summary

Tested 65+ API endpoints across the TitleRun backend. Found **10 server-side 500 errors**, **2 data integrity bugs**, **1 security concern**, and **2 UI routing bugs**. The core happy-path APIs work well, but several secondary endpoints have unhandled PostgreSQL errors that leak database error codes to clients.

### Severity Breakdown
| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 3 | 500 errors on user-facing endpoints that block features |
| 🟠 High | 5 | 500 errors on secondary endpoints, data integrity issues |
| 🟡 Medium | 4 | Input validation gaps, date parsing bugs |
| 🟢 Low | 3 | Information disclosure, minor UI issues |

---

## 🔴 CRITICAL: Server 500 Errors (Feature-Blocking)

### 1. `GET /api/players/trending` → 500 (PostgreSQL error 42883)
- **Impact:** Players page "Trending" tab would fail completely
- **Error Code:** `42883` = PostgreSQL "undefined function" - a missing DB function/stored procedure
- **Fix:** Deploy the missing database function, or handle the error gracefully in the API layer

### 2. `GET /api/user/preferences/selected-league` → 500 (PostgreSQL error 42703)
- **Impact:** League selection state can't be retrieved - affects all league-dependent features
- **Error Code:** `42703` = PostgreSQL "undefined column" - a schema migration was likely missed
- **Fix:** Run pending database migrations; ensure the column exists in the preferences table

### 3. `GET /api/redraft/rankings` → 500 (PostgreSQL error 42703)
- **Impact:** Entire redraft rankings feature is broken
- **Error Code:** `42703` = PostgreSQL "undefined column"
- **Fix:** Same as above - missing column in the rankings query

---

## 🟠 HIGH: Server 500 Errors (Secondary Endpoints)

### 4. `GET /api/alerts/list` → 500 (PostgreSQL error 22P02)
- **Error Code:** `22P02` = "invalid input syntax for type" - likely UUID/type parsing error in the query
- **Fix:** Validate input parameters before passing to SQL query

### 5. `GET /api/alerts/unread` → 500 (PostgreSQL error 22P02)
- **Same root cause as alerts/list**

### 6. `GET /api/alerts/count` → 500 (PostgreSQL error 22P02)
- **Same root cause as alerts/list**

### 7. `GET /api/accounts/connect` (GET instead of POST) → 500 (PostgreSQL error 22P02)
- **Impact:** GET request to a POST-only endpoint returns 500 instead of 405 Method Not Allowed
- **Fix:** Add proper method routing; return 405 for unsupported HTTP methods

### 8. `GET /api/teams/sync` → 500 (PostgreSQL error 22P02)
- **Impact:** GET to sync endpoint (should be POST) returns 500 instead of 405
- **Fix:** Add method validation

### 9. `GET /api/user/leagues` → 500 (PostgreSQL error 42883)
- **Error Code:** `42883` = "undefined function" - missing stored procedure
- **Impact:** User can't retrieve their league list through this endpoint

---

## 🟡 MEDIUM: Input Validation & Data Integrity

### 10. `GET /api/news?limit=-1` → 500 (PostgreSQL error 2201W)
- **Error Code:** `2201W` = "invalid row count in LIMIT clause"
- **Impact:** Negative limit value passed directly to SQL without validation
- **Fix:** Validate `limit` parameter: reject negative values, enforce max (e.g., 100)

### 11. Alert Dates Show "Invalid Date" in UI
- **Where:** Activity page (/alerts or /activity → Alerts Only tab)
- **All 3 alerts displayed show "Invalid Date" instead of proper timestamps**
- **Root Cause:** The `created_at` field from the API is not being parsed correctly by the frontend date formatter
- **Screenshot:** Captured (alerts page with "Invalid Date" on all items)

### 12. Profile Page Shows "Member since Recently" Instead of Actual Date
- **Where:** Settings → Profile
- **Root Cause:** `createdAt` from `/api/auth/me` ("2026-03-08T16:40:56.177Z") not being formatted as a human-readable date
- **Fix:** Update date formatting in the Profile component

### 13. Null Byte Search Returns All Players
- **Endpoint:** `GET /api/players/search?q=%00%00`
- **Returns 20 players** instead of empty results or validation error
- **Impact:** Could be exploited to bypass search validation
- **Fix:** Sanitize null bytes from search input

---

## 🟢 LOW: Information Disclosure & Minor Issues

### 14. PostgreSQL Error Codes Leaked in API Responses
- **All 500 errors expose raw PostgreSQL error codes** (22P02, 42883, 42703, 2201W)
- **Impact:** Reveals database type and specific error types to attackers
- **Fix:** Map all database error codes to generic HTTP error responses in the error handler middleware

### 15. XSS Potential in Search Response
- **Endpoint:** `GET /api/players/search?q=<script>alert(1)</script>`
- **Response includes unescaped query:** `"query":"<script>alert(1)</script>"`
- **Impact:** If frontend renders this `query` field without escaping, it could enable XSS
- **Fix:** Sanitize the query field in API response, or ensure frontend HTML-escapes it

### 16. `/api/news` Accessible Without Authentication
- **The news endpoint returns full data without any auth header**
- **Impact:** Low - news is public content, but inconsistent with other endpoints
- **Note:** May be intentional for landing page/unauthenticated preview

---

## 🔵 ROUTING BUGS (Frontend)

### 17. `/activity` Route Shows Trade Builder Instead of Activity Page
- **Steps:** Navigate to sidebar → Activity link
- **Expected:** Activity feed page
- **Actual:** Trade Builder page is displayed (with sidebar showing Activity as active)
- **Impact:** Users can't access Activity from direct URL navigation
- **Note:** Clicking Activity in sidebar seems to work via SPA routing

### 18. `/trophy-case` Route Shows Trade Finder
- **Steps:** Navigate directly to /trophy-case
- **Expected:** Trophy Case page
- **Actual:** Trade Finder page loads instead
- **Impact:** Direct links to trophy case are broken

---

## ✅ Working Endpoints (Verified)

| Endpoint | Status | Response Time | Notes |
|----------|--------|---------------|-------|
| `GET /api/auth/me` | 200 ✅ | ~180ms | Returns user profile correctly |
| `GET /api/user/preferences` | 200 ✅ | ~188ms | Full preferences object |
| `POST /api/user/preferences` | 200 ✅ | ~200ms | Updates preferences |
| `GET /api/teams` | 200 ✅ | ~470ms | Returns 2 teams (slightly slow) |
| `GET /api/portfolio` | 200 ✅ | ~184ms | Full portfolio data |
| `GET /api/portfolio/summary` | 200 ✅ | ~182ms | Summary data |
| `GET /api/portfolio/history?days=7` | 200 ✅ | ~200ms | History with edge cases handled |
| `GET /api/portfolio/assets` | 200 ✅ | ~184ms | Asset breakdown |
| `GET /api/portfolio/exposure` | 200 ✅ | ~180ms | Exposure data |
| `GET /api/portfolio/picks` | 200 ✅ | ~180ms | Pick values |
| `GET /api/news` | 200 ✅ | ~236ms | Full news articles |
| `GET /api/news/ticker` | 200 ✅ | ~182ms | Ticker format |
| `GET /api/alerts` | 200 ✅ | ~184ms | Paginated alerts |
| `GET /api/alerts/summary` | 200 ✅ | ~180ms | Summary stats |
| `POST /api/alerts/generate` | 200 ✅ | ~400ms | Generates alerts correctly |
| `GET /api/players/all-values` | 200 ✅ | ~239ms | Full player values |
| `GET /api/players/search?q=mahomes` | 200 ✅ | ~200ms | Search works |
| `GET /api/players/movers` | 200 ✅ | ~266ms | Risers/fallers |
| `GET /api/players/top` | 200 ✅ | ~125ms | Top players |
| `GET /api/trades/picks` | 200 ✅ | ~180ms | Pick values |
| `GET /api/trade-engine/history` | 200 ✅ | ~128ms | Trade history |
| `GET /api/trade-engine/saved` | 200 ✅ | ~180ms | Saved trades |
| `GET /api/trophy-case` | 200 ✅ | ~200ms | Trophy data |
| `GET /api/trophy-case/stats` | 200 ✅ | ~180ms | Stats data |
| `GET /api/leaguemates` | 200 ✅ | ~153ms | Leaguemate data |
| `GET /api/ai/conversations` | 200 ✅ | ~180ms | AI chat history |
| `GET /api/ai/rate-limit` | 200 ✅ | ~180ms | Rate limit status |
| `GET /api/ai/usage` | 200 ✅ | ~180ms | Usage stats |
| `GET /api/accounts` | 200 ✅ | ~180ms | Connected accounts |
| `GET /api/strategy/teams` | 200 ✅ | ~180ms | Strategy data |
| `GET /api/redraft/settings` | 200 ✅ | ~180ms | Redraft config |
| `GET /api/users/me` | 200 ✅ | ~180ms | User data |
| `GET /health` | 200 ✅ | 4ms | DB healthy |
| `POST /api/accounts/connect` | 200 ✅ | ~400ms | Sleeper connect works |
| `POST /api/onboarding/complete` | 200 ✅ | ~200ms | Onboarding completion |

---

## Authentication & Security

| Test | Result | Notes |
|------|--------|-------|
| No auth header → 401 | ✅ Pass | Proper error message |
| Invalid token → 401 | ✅ Pass | "Invalid token" |
| CORS from evil.com | ✅ Pass | Origin not echoed; only `app.titlerun.co` allowed |
| SQL injection in search | ✅ Pass | No error/data leak (returns empty) |
| PUT with invalid data → 400 | ✅ Pass | Proper validation error |
| Auth required endpoints | ✅ Pass | All return 401 except /api/news (public) |

---

## Recommended Priority Fixes

### P0 - Before Launch
1. **Fix missing PostgreSQL functions/columns** (42883, 42703 errors)
   - `/api/players/trending` - missing function
   - `/api/user/preferences/selected-league` - missing column
   - `/api/redraft/rankings` - missing column
   - `/api/user/leagues` - missing function
   - Run `SELECT * FROM pg_proc WHERE proname LIKE '%trending%'` to diagnose

2. **Fix alerts subsystem 22P02 errors**
   - `/api/alerts/list`, `/api/alerts/unread`, `/api/alerts/count`
   - Likely a UUID type mismatch in queries
   
3. **Fix "Invalid Date" in alerts UI**
   - Frontend date formatting bug

### P1 - High Priority
4. **Add input validation for `limit` parameter** on news/alerts endpoints
5. **Return 405 Method Not Allowed** for wrong HTTP methods (instead of 500)
6. **Fix SPA routing** for /activity and /trophy-case direct navigation
7. **Stop leaking PostgreSQL error codes** in API responses

### P2 - Medium Priority  
8. **Fix "Member since Recently"** date formatting on Profile page
9. **Sanitize null bytes** in search input
10. **Sanitize/escape** query string in search response

---

## Test Environment Notes
- API base: `https://api.titlerun.co`
- App version: 1.0.1 (from meta tag)
- Server commit: `f986f04cf6b00ea7eecf3bb613cd3b77829a44f4`
- Database: PostgreSQL (confirmed by error codes)
- Total API endpoints discovered in frontend JS: 65+
- Total working: ~35 (54%)
- Total 500 errors: 10 (15%)
- Total 404 (POST-only): ~20 (31%) - expected for GET on POST endpoints

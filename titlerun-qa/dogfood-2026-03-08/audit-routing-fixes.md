# Adversarial Audit: Routing + Security Fixes

**Auditor:** Frontend Architect (Opus 4.6)
**Date:** 2026-03-08
**Score:** 72/100

---

## Executive Summary

The routing fixes are **mostly solid** — the `/player/` → `/players/` migration is complete, the Trophy Case route is properly defined, and the Settings sub-route wildcard works. However, I found **3 bugs**, **2 security gaps**, and **4 code quality issues** that need attention before production.

---

## ✅ PASS — What Was Done Right

### 1. `/player/` → `/players/` Migration — COMPLETE ✅
Grepped the entire codebase. **Zero remaining** `/player/` route links. All navigations and `<Link>` components correctly use `/players/${id}`. The only `/player/` string remaining is the external OverTheCap URL (`overthecap.com/player/...`) which is correct — that's their URL pattern, not ours.

### 2. Trophy Case Route — FIXED ✅
- `/trophy-case` → direct route to `<TrophyCase />` (no redirect chain)
- `/trophies` → redirect to `/trophy-case` (backward compat)
- All sidebar, dashboard, and home widget links point to `/trophy-case`

### 3. Settings Wildcard — WORKING ✅
- `/settings` → exact match route
- `/settings/*` → wildcard catch-all, same component
- URL-based tab selection via `getInitialTab()` maps sub-paths to tab IDs
- Path mappings: `profile`, `connected-accounts`, `accounts`, `leagues`, `display`, `notifications`, `privacy`, `about`

### 4. 404 Page — EXISTS ✅
Catch-all `*` route at the bottom of `<Routes>`, renders 404 with link home.

### 5. Source Maps — DISABLED ✅
`.env.production` has `GENERATE_SOURCEMAP=false`. Since this is a Create React App project (`react-scripts`), this env var is respected by the build process. Source maps will not be generated in production builds.

### 6. Route Priority — CORRECT ✅
Route order in App.jsx follows correct precedence: specific routes first, redirects next, catch-all `*` last. No conflicting patterns detected.

---

## 🐛 BUGS FOUND

### BUG-1: Activity.jsx navigates to `/trophies` instead of `/trophy-case` (MEDIUM)
**File:** `src/pages/Activity.jsx:469`
```jsx
case 'achievement':
  navigate('/trophies');  // ← Uses old path
  break;
```
**Impact:** Works due to redirect (`/trophies` → `/trophy-case`), but causes an unnecessary redirect hop. Performance hit + flash of navigation.
**Fix:** Change to `navigate('/trophy-case')`.

### BUG-2: EmptyState uses query param `?tab=accounts` but Settings only reads URL path (MEDIUM)
**File:** `src/components/home/EmptyState.jsx:29`
```jsx
to="/settings?tab=accounts"  // ← Query param
```
**But Settings.jsx** only reads `location.pathname` via `getInitialTab()` — it never checks `searchParams`. The `?tab=accounts` query param is silently ignored. User lands on the Profile tab instead of Connected Accounts.
**Fix:** Either:
- (a) Change link to `to="/settings/connected-accounts"` (preferred — matches new URL scheme), or
- (b) Add `searchParams` fallback in `getInitialTab()`

### BUG-3: Share URL mismatch — DraftReportCardDetail generates `/share/` but route is `/report-card/` (HIGH)
**File:** `src/components/reportCard/DraftReportCardDetail.jsx:82`
```jsx
navigator.clipboard.writeText(`${window.location.origin}/share/${publicShareHash}`);
```
**But App.jsx defines:** `path="/report-card/:shareHash"` — there is NO `/share/:hash` route.
**Impact:** Copied share links will 404. Users sharing draft report cards get broken links.
**Fix:** Change to `/report-card/${publicShareHash}` or add a `/share/:hash` redirect route.

---

## 🔒 SECURITY FINDINGS

### SEC-1: Missing Critical Security Headers (HIGH)

**vercel.json** includes:
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: DENY`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`

**Missing:**
- ❌ `Strict-Transport-Security` (HSTS) — No HTTPS enforcement. Vercel handles HTTPS redirects at the edge, but HSTS header tells browsers to **never** attempt HTTP. Required for security-conscious apps.
  ```json
  { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
  ```
- ❌ `Content-Security-Policy` — No CSP at all. This is the **single most important** defense against XSS. At minimum, add:
  ```json
  { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https://sleepercdn.com data:; connect-src 'self' https://api.titlerun.co" }
  ```
- ❌ `Permissions-Policy` — Should disable unused browser features:
  ```json
  { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
  ```

### SEC-2: Source Map Files Still Served If They Exist (LOW)
The `vercel.json` adds `X-Robots-Tag: noindex` to `.map` files, but this only prevents search engines from indexing them — it **does not block access**. If source maps somehow get generated (e.g., dev build deployed accidentally), they'd be fully accessible. 

The `GENERATE_SOURCEMAP=false` in `.env.production` prevents generation, so this is defense-in-depth. But the `.map` header rule gives a false sense of security.

**Better fix:** Add a deny rule:
```json
{
  "source": "/(.*)\\.map",
  "headers": [
    { "key": "X-Robots-Tag", "value": "noindex" }
  ],
  "status": 404
}
```
Or use Vercel's `rewrites` to block `.map` files entirely.

---

## ⚠️ CODE QUALITY ISSUES

### CQ-1: Settings page uses `<a href>` for internal routes (LOW)
**File:** `src/pages/Settings.jsx:1172-1184`
```jsx
<a href="/terms">Terms of Service</a>
<a href="/privacy">Privacy Policy</a>
<a href="/help">Help Center</a>
```
These should use React Router's `<Link>` component. Using `<a href>` causes a full page reload, breaking the SPA experience and losing React state.

### CQ-2: Duplicate `/settings` and `/settings/*` routes (LOW)
App.jsx defines both:
```jsx
<Route path="/settings" element={...} />
<Route path="/settings/*" element={...} />
```
The wildcard `/*` already matches the exact `/settings` path. The first route is redundant. Not a bug (React Router handles it fine), but unnecessary code.

### CQ-3: Settings doesn't update URL on tab change (LOW)
When a user clicks a tab in Settings, `setActiveTab(tab.id)` fires but the URL stays at `/settings`. This means:
- Browser back button doesn't work between tabs
- Refreshing always returns to the initial tab from URL
- Can't share a direct link to a specific tab by clicking

**Fix:** Use `navigate(`/settings/${tabToPath[tab.id]}`, { replace: true })` on tab change.

### CQ-4: `DraftCapital.jsx` uses `window.location.href = '/settings'` instead of navigate (LOW)
**File:** `src/pages/DraftCapital.jsx:79`
Full page reload instead of SPA navigation. Should use `useNavigate()`.

---

## 📊 Checklist Results

### 1. Route Coverage
- [x] ALL `/player/` links changed to `/players/` — **PASS**
- [x] No other similar route mismatches — **PASS** (checked all routes against nav items)
- [x] Settings tabs have URL mappings — **PASS** (7 tabs mapped)
- [x] Redirects working — **PASS** (with BUG-1 caveat)
- [x] 404 page exists — **PASS**

### 2. Route Conflicts
- [x] `/settings/*` doesn't conflict — **PASS** (CQ-2 is cosmetic)
- [x] Route priority correct — **PASS**
- [x] Catch-all at end — **PASS**
- [x] Nested routes handled — **PASS**
- [x] Dynamic params working — **PASS** (`/players/:playerId`, `/teams/:teamId/*`, etc.)

### 3. Security
- [x] Source maps disabled in build — **PASS**
- [ ] Security headers complete — **FAIL** (SEC-1: missing HSTS, CSP, Permissions-Policy)
- [x] HTTPS via Vercel edge — **PASS** (but no HSTS header)
- [ ] CSP headers — **FAIL** (none defined)
- [x] Auth route protection — **PASS** (ProtectedRoute wrapper on all auth routes)

### 4. Link Consistency
- [ ] All internal links use `<Link>` — **FAIL** (CQ-1: Settings uses `<a href>`)
- [x] Paths consistent — **PASS**
- [ ] Query params preserved — **FAIL** (BUG-2: `?tab=` not read)
- [x] External links have `rel="noopener"` — **PASS** (all checked)

### 5. Edge Cases
- [x] Direct URL navigation — **PASS** (Vercel rewrite to index.html)
- [ ] Browser back button on Settings tabs — **FAIL** (CQ-3)
- [x] Refresh on sub-routes — **PASS**
- [ ] Deep linking to Settings tabs via query — **FAIL** (BUG-2)
- [x] Route state preservation — **PASS**

---

## 🎯 Priority Fix List

| # | Issue | Severity | Effort | Priority |
|---|-------|----------|--------|----------|
| BUG-3 | Share URL generates `/share/` but route is `/report-card/` | HIGH | 5 min | P0 |
| SEC-1 | Missing HSTS, CSP, Permissions-Policy headers | HIGH | 15 min | P1 |
| BUG-2 | EmptyState `?tab=accounts` silently ignored | MEDIUM | 5 min | P1 |
| BUG-1 | Activity navigates to `/trophies` instead of `/trophy-case` | MEDIUM | 2 min | P2 |
| CQ-1 | Settings `<a href>` for internal routes | LOW | 5 min | P3 |
| CQ-3 | Settings URL doesn't update on tab change | LOW | 10 min | P3 |
| CQ-4 | DraftCapital uses `window.location.href` | LOW | 2 min | P3 |
| CQ-2 | Duplicate `/settings` route definition | LOW | 1 min | P4 |

**Total estimated fix time: ~45 minutes**

---

## Verdict

The routing fixes addressed the reported issues correctly. The `/player/` → `/players/` migration is clean and complete. However, the **share URL mismatch (BUG-3) is a user-facing broken feature** that needs immediate attention, and the **missing security headers (SEC-1)** should be added before any public launch. Score reflects solid routing work undermined by missed edge cases and incomplete security hardening.

**Score: 72/100** — Good routing fixes, needs security headers and 3 bug fixes before ship.

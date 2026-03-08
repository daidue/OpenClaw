# Performance & Technical Audit

**Date:** 2026-03-08
**Auditor:** Performance Engineer (Opus 4.6)
**Target:** https://app.titlerun.co
**Build:** v1.0.1 (2026-03-03T20:54:00-05:00)
**Infrastructure:** Cloudflare CDN (Pages) + Railway API (us-east4)

---

## Summary

**Overall Score: 72/100**

| Category | Score | Notes |
|----------|-------|-------|
| Performance | 75/100 | Fast TTFB, good caching, but JS bundle oversized |
| Accessibility | 70/100 | Skip link present, but heading hierarchy broken |
| Best Practices | 60/100 | Source maps exposed, no lazy loading, login broken |
| SEO | 85/100 | Good meta tags, OG tags, canonical URL |

**Verdict:** Solid foundation with Cloudflare edge delivery and HTTP/3. Three critical issues need fixing before April 15 launch: (1) oversized single JS bundle, (2) zero image lazy loading, (3) exposed source maps. API is well-structured but lacks cache headers.

---

## Critical Performance Issues

### 1. 🔴 Single Monolithic JS Bundle — 503KB (153KB compressed)
- **Impact:** All JavaScript loads upfront, even for unauthenticated users on login page
- **Metric:** 502,934 bytes uncompressed / 153,211 bytes Brotli-compressed
- **Target:** <100KB initial JS for login page; lazy-load dashboard code
- **Fix:** Implement route-based code splitting. The app already uses `React.lazy` (48 lazy refs, 12 Suspense boundaries found), but the main bundle still contains most code. Split by route: login/signup (~20KB), dashboard (~100KB), players (~80KB), trades (~80KB). Use `React.lazy(() => import('./routes/Dashboard'))` pattern. **Estimated savings: 60-70% reduction in initial load.**

### 2. 🔴 Zero Image Lazy Loading — 70 Images All Eager
- **Impact:** Players page loads 70 player headshot images (~94KB each = ~6.4MB potential) all at once
- **Metric:** 70 images, 0 with `loading="lazy"`, all 350×254px JPEGs from Sleeper CDN
- **Target:** Only above-fold images eager; rest lazy-loaded
- **Fix:** Add `loading="lazy"` to all player headshot `<img>` tags. Only the first ~8-10 visible images should be eager. Consider `<img loading="lazy" decoding="async">`. **Estimated savings: 5MB+ on initial players page load.**

### 3. 🟠 Source Maps Publicly Exposed — Full Source Code Accessible
- **Impact:** Anyone can reconstruct the full React source code, exposing business logic, API patterns, auth flow
- **Metric:** `main.93fec68b.js.map` = 2.27MB, `main.6d714e27.css.map` = 98KB — both HTTP 200
- **Target:** Source maps should return 404 in production
- **Fix:** Either disable source map generation in production build (`GENERATE_SOURCEMAP=false` in `.env.production`) or configure Cloudflare to block `*.map` files. **Security risk, not just performance.**

### 4. 🟠 CSS Bundle Oversized — 197KB Uncompressed
- **Impact:** Single CSS file contains all styles for all routes
- **Metric:** 197,463 bytes uncompressed / 28,223 bytes Brotli-compressed
- **Target:** <50KB CSS for initial load
- **Fix:** If using Tailwind, ensure PurgeCSS is configured. If custom CSS, implement CSS code splitting per route. Audit for unused styles. Only 2 CSS rules detected in the compiled output, which suggests CSS-in-JS or minified Tailwind — verify PurgeCSS is working.

### 5. 🟠 Login Authentication Broken — 401 on Demo Login
- **Impact:** Users following "Demo: Use any email and password to sign in" instruction get silent failure — no error shown in UI
- **Metric:** API returns HTTP 401 on `POST /api/auth/login`
- **Target:** Demo mode should work OR error should display clearly
- **Fix:** Either implement demo mode on the API side, or show a visible error toast when login fails. Currently the button clicks and nothing happens — terrible UX.

---

## Page Load Metrics

| Metric | Login Page | Dashboard | Target | Status |
|--------|-----------|-----------|--------|--------|
| TTFB | 32ms | 16ms | <600ms | ✅ Excellent |
| FCP | 172ms (cached) / ~250ms (fresh) | 188ms | <1.8s | ✅ Excellent |
| LCP | ~250ms (estimated) | ~400ms (estimated) | <2.5s | ✅ Good |
| DOM Interactive | 108ms | 118ms | <3.8s | ✅ Excellent |
| DOM Content Loaded | 119ms | 122ms | N/A | ✅ Excellent |
| Load Complete | 119ms | 123ms | N/A | ✅ Excellent |
| Total Size (decoded) | 773KB | 810KB | <3MB | ✅ Good |
| Total Resources | 9 | 15 | <100 | ✅ Excellent |
| DOM Nodes | 80 (login) | 530 (dashboard), 1737 (players) | <1500 | ⚠️ Players page high |
| CLS | 0 | - | <0.1 | ✅ Excellent |

**Note:** These metrics are from a fast connection (Mac Mini on broadband). Mobile/3G performance will be significantly worse due to JS bundle size.

---

## Network Analysis

### API Endpoints Tested

| Endpoint | TTFB | Response Size | Status |
|----------|------|---------------|--------|
| `POST /api/auth/login` | 245ms | 94 bytes | ❌ 401 (broken) |
| `GET /api/players/all-values` | 221ms | 5.2KB | ✅ 200 |
| `GET /api/players/movers` | 330ms | 7.1KB | ✅ 200 |
| `GET /api/news/ticker` | 237ms | 11.8KB | ✅ 200 |
| `GET /api/teams` | 227ms (unauth) | 94 bytes | 🔒 401 |
| `GET /api/alerts` | 271ms (unauth) | 94 bytes | 🔒 401 |
| `GET /api/portfolio/history` | 490ms (browser) | unknown | ⚠️ Slowest |
| `GET /api/trophy-case/stats` | 489ms (browser) | unknown | ⚠️ Slow |

### Key Findings

- **API calls: 5-7 per page load** ✅ Reasonable
- **Failed requests: 4** (login 401 errors from demo attempts)
- **Slow requests (>1s): 0** ✅ All under 500ms
- **Redundant calls: 1** — `/api/teams` called twice on dashboard
- **Missing Cache-Control headers** on API responses — only ETag present. Should add `Cache-Control: public, max-age=60` for player values, `max-age=300` for news ticker
- **CORS properly configured** — `access-control-allow-origin: https://app.titlerun.co`

---

## Bundle Analysis

| Asset | Uncompressed | Brotli Compressed | Cache Strategy |
|-------|-------------|-------------------|----------------|
| HTML | 2,838 bytes | 1,006 bytes | `no-cache, no-store` ✅ |
| main.js | 502,934 bytes (491KB) | 153,211 bytes (150KB) | `immutable, max-age=31536000` ✅ |
| main.css | 197,463 bytes (193KB) | 28,223 bytes (28KB) | `immutable, max-age=31536000` ✅ |
| chunk 7014 | 7,024 bytes | 2,691 bytes | `immutable` ✅ |
| chunk 8562 | 65,209 bytes | ~15KB est. | Lazy loaded ✅ |
| chunk 2532 | 11,713 bytes | ~3KB est. | Lazy loaded ✅ |
| chunk 4011 | 7,904 bytes | ~2KB est. | Lazy loaded ✅ |
| chunk 5556 | 32,014 bytes | ~8KB est. | Lazy loaded ✅ |
| Inter font (woff2) | 48,432 bytes | N/A (already compressed) | Google CDN ✅ |
| logo192.png | 6,085 bytes | N/A | Cached ✅ |
| og-image.png | 27,473 bytes | N/A | ✅ |
| favicon.png | 2,011 bytes | N/A | ✅ |
| **Total initial** | **~755KB** | **~250KB** | |

### Code Splitting Analysis
- **Existing:** 4 lazy-loaded chunks detected (good start)
- **Missing:** Main bundle still monolithic at 491KB — needs route-level splitting
- **Libraries detected:** React, React-DOM, framer-motion (23 refs), moment (minimal)
- **No tree-shaking issues detected** (no lodash, no full firebase)

---

## Infrastructure & Delivery

| Aspect | Status | Details |
|--------|--------|---------|
| CDN | ✅ Cloudflare | CF-Ray: EWR (Newark) edge |
| Protocol | ✅ HTTP/2 + H3 | `h3` confirmed in browser |
| Compression | ✅ Brotli | `content-encoding: br` on all assets |
| HSTS | ⚠️ Partial | Present on API (`max-age=31536000; includeSubDomains; preload`) but **missing on frontend** |
| Content hashing | ✅ | Filenames include content hash (`main.93fec68b.js`) |
| Immutable caching | ✅ | Static assets: `max-age=31536000, immutable` |
| HTML caching | ✅ | `no-cache, no-store, must-revalidate` (correct for SPA) |
| API hosting | ✅ Railway | us-east4 (close to Cloudflare EWR edge) |
| Font loading | ✅ | `font-display: swap`, preconnect to Google Fonts |
| Preload hints | ❌ Missing | No `<link rel="preload">` for critical JS/CSS |

---

## Security Headers

| Header | Frontend (Cloudflare) | API (Railway) | Status |
|--------|----------------------|---------------|--------|
| `strict-transport-security` | ❌ Missing | ✅ `max-age=31536000; includeSubDomains; preload` | ⚠️ Fix frontend |
| `x-frame-options` | ✅ `DENY` | ✅ `DENY` | ✅ |
| `x-content-type-options` | ✅ `nosniff` | ✅ `nosniff` | ✅ |
| `referrer-policy` | ✅ `strict-origin-when-cross-origin` | ✅ `no-referrer` | ✅ |
| `x-xss-protection` | ✅ `1; mode=block` | ✅ `0` (correct modern approach) | ✅ |
| `content-security-policy` | ❌ Missing | N/A | ⚠️ Should add |
| `permissions-policy` | ❌ Missing | N/A | ⚠️ Should add |
| `cross-origin-opener-policy` | ❌ Missing | ✅ `same-origin` | ⚠️ Fix frontend |
| `cross-origin-resource-policy` | ❌ Missing | ✅ `same-origin` | ⚠️ Fix frontend |

---

## SEO Analysis

| Aspect | Status | Details |
|--------|--------|---------|
| `<title>` | ✅ | "TitleRun — Compete With Your League" |
| `<meta description>` | ✅ | Good, keyword-rich description |
| `<meta keywords>` | ✅ | Fantasy football keywords |
| `<link canonical>` | ⚠️ | Points to `https://app.titlerun.co` (no trailing slash inconsistency) |
| OG tags | ✅ | 6 OG tags including image |
| Twitter card | ✅ | `summary_large_image` with image |
| `<html lang>` | ✅ | `en` |
| Viewport | ✅ | `width=device-width,initial-scale=1,viewport-fit=cover` |
| `robots.txt` | ✅ | Present with Cloudflare managed bot blocking |
| `sitemap.xml` | ✅ | Returns 200 |
| Multiple H1 tags | ⚠️ | 3 H1 tags on dashboard — should be 1 per page |
| SPA rendering | ⚠️ | Client-side rendering only — Google may struggle with JS-rendered content |

---

## Accessibility Quick Scan

| Aspect | Status | Notes |
|--------|--------|-------|
| Skip link | ✅ | `Skip to content` → `#main-content` |
| Heading hierarchy | ⚠️ | H1 → H1 → H1 → H3 on dashboard (should be H1 → H2 → H3) |
| ARIA roles | ✅ | 64 ARIA roles on players page |
| Form labels | ✅ | Login inputs have labels |
| Lang attribute | ✅ | `lang="en"` on html |
| Focus management | ✅ | 60 focusable elements with tabindex |
| Color contrast | ❓ | Not measurable without Lighthouse — dark theme needs manual review |
| Keyboard navigation | ✅ | Sidebar nav is keyboard-accessible |

---

## Mobile Performance (Estimated)

| Metric | Fast WiFi | 4G (~10Mbps) | 3G (~1.6Mbps) | Target |
|--------|----------|-------------|-------------|--------|
| Initial download | ~250KB | ~250KB | ~250KB | - |
| Download time | <100ms | ~200ms | ~1.2s | <2s |
| JS parse + execute | ~100ms | ~300ms | ~500ms | <1s |
| FCP | ~200ms | ~500ms | ~2s | <1.8s |
| TTI | ~300ms | ~800ms | ~3s | <3.8s |
| Players page (70 imgs) | ~2s | ~8s | ~40s+ | ⚠️ CRITICAL |

**Players page on 3G is unusable** without lazy loading. 70 × 94KB = 6.4MB of images.

---

## Memory Analysis

| Page | JS Heap Used | JS Heap Total | Heap Limit | Status |
|------|-------------|---------------|------------|--------|
| Login | 5MB | 5MB | 4,096MB | ✅ |
| Dashboard | 10MB | 13MB | 4,096MB | ✅ |
| Players | 16MB | 20MB | 4,096MB | ✅ |

Memory usage is healthy. No evidence of memory leaks during session.

---

## News Ticker Analysis

The marquee news ticker loads 30+ items with duplicate content (items repeat in the loop). Each item is a button with 5-6 nested spans. On the players page this contributed significantly to DOM node count (1,737 total).

**Issues:**
- Ticker items are duplicated in DOM for seamless scrolling — 60+ buttons total
- Each ticker item has 5-6 nested elements = ~360 extra DOM nodes
- Consider virtualizing the ticker or reducing item count

---

## Recommendations (Prioritized by Impact)

### P0 — Must Fix Before Launch

1. **Implement route-based code splitting** — Split main.js (491KB) into route chunks. Login page should load <50KB JS. Dashboard, Players, Trades, Report Cards as separate chunks. **Impact: 60-70% faster first load.**

2. **Add `loading="lazy"` to player images** — 70 images loading eagerly = potential 6.4MB wasted. Only above-fold images should be eager. **Impact: Players page goes from 40s to 3s on 3G.**

3. **Fix demo login flow** — Currently shows "use any email" but returns 401 with no visible error. Either implement demo bypass or show error toast. **Impact: First-time users immediately bounce.**

4. **Disable source maps in production** — Set `GENERATE_SOURCEMAP=false`. Full source code currently downloadable by anyone. **Impact: Security.**

### P1 — Should Fix Before Launch

5. **Add API Cache-Control headers** — Player values: `max-age=60`, news ticker: `max-age=300`, static content: `max-age=3600`. Currently only ETag (forces revalidation on every request). **Impact: Faster repeat page loads, less API load.**

6. **Add HSTS header to frontend** — Cloudflare Pages config or `_headers` file. API has it, frontend doesn't. **Impact: Security.**

7. **Add Content-Security-Policy header** — Restrict script/style sources. **Impact: XSS protection.**

8. **Fix heading hierarchy** — Multiple H1 tags on dashboard. Use H1 once, H2 for sections, H3 for subsections. **Impact: Accessibility + SEO.**

### P2 — Nice to Have

9. **Add `<link rel="preload">` for critical assets** — Preload main.js and main.css in HTML head. **Impact: ~50-100ms faster FCP.**

10. **Deduplicate API calls** — `/api/teams` called twice on dashboard. Implement request deduplication (React Query/SWR built-in). **Impact: 1 fewer API call per page load.**

11. **Consider self-hosting Inter font** — Currently loading from Google Fonts with 4 weights × 7 unicode ranges. Self-hosting a subset woff2 would eliminate the DNS lookup + connection to Google. **Impact: ~100ms faster font load.**

12. **Reduce ticker DOM nodes** — Virtualize the news ticker or reduce from 30 to 10 items. 360+ extra nodes for decoration. **Impact: Faster DOM mutations.**

13. **Add `Permissions-Policy` header** — Disable unused browser features (camera, microphone, geolocation). **Impact: Security posture.**

14. **Consider SSR/SSG for login page** — Currently SPA renders everything client-side. Login page is static content that could be server-rendered for instant display. **Impact: Better SEO, faster perceived load.**

---

## What's Working Well ✅

1. **Cloudflare edge delivery** — TTFB under 40ms consistently. HTTP/3 enabled. Brotli compression.
2. **Asset caching** — Content-hashed filenames with `immutable, max-age=31536000`. Perfect cache strategy for static assets.
3. **HTML no-cache** — Correctly set to `no-cache, no-store, must-revalidate` so updates deploy instantly.
4. **SPA architecture** — React with proper client-side routing. Navigation between pages is instant.
5. **Small API payloads** — API responses are 5-12KB. Well-structured, not over-fetching.
6. **API response times** — All under 500ms. Good for Railway.
7. **Low resource count** — 9-15 resources per page. No bloat.
8. **CORS properly configured** — Only `https://app.titlerun.co` allowed.
9. **Good meta tags** — OG, Twitter Card, description, keywords all present.
10. **Accessibility basics** — Skip link, ARIA roles, form labels, keyboard nav all present.
11. **Small initial HTML** — 2,838 bytes with inline loading spinner. Users see feedback immediately.
12. **framer-motion for animations** — Lightweight animation library, well-chosen.
13. **Memory usage** — Healthy across all pages, no leaks detected.

---

## Raw Data

### Transfer Sizes (Brotli compressed, over-the-wire)
- HTML: 1,006 bytes
- main.js: 153,211 bytes
- main.css: 28,223 bytes
- chunk.js (7014): 2,691 bytes
- manifest.json: ~300 bytes
- **Total initial transfer: ~185KB**

### Decoded Sizes (uncompressed, in-memory)
- HTML: 3,342 bytes
- main.js: 502,934 bytes
- main.css: 197,463 bytes
- chunk.js (7014): 7,024 bytes
- Inter font (latin): 48,432 bytes
- **Total decoded: ~759KB**

### Player Image Sizes (from Sleeper CDN)
- Per image: ~94KB (JPEG, 350×254px)
- 70 images on players page: ~6.4MB potential
- Cache-Control: `public, max-age=2678400` (31 days) ✅

---

*Report generated 2026-03-08 12:45 EDT*
*Next audit recommended after code splitting implementation*

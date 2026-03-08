# Adversarial Audit: Performance Fixes

**Auditor:** Performance Engineer (Opus 4.6)
**Date:** 2026-03-08
**Score:** 35/100

---

## Executive Summary

The performance fix was **minimal in scope** — only `loading="lazy"` attributes were added to img tags. While that's a valid optimization, it represents roughly 5% of what a proper performance pass should cover. The agent's claim of "150KB gzipped bundle" is technically accurate for the **main chunk only**, but misleading — total JS payload is **~2.5MB raw / ~830KB gzipped est.**, with the critical path being **150KB (main.js) + 99KB (chunk 148) + 29.5KB (CSS) = ~279KB gzipped** before any route renders. Several **high-impact optimizations were missed entirely**.

---

## 1. Lazy Loading Implementation

### ✅ What Was Done
- 44 of 45 `<img>` tags across 25 files now have `loading="lazy"`
- Attributes are properly placed (some on next line, but valid JSX)

### ❌ Issues Found

| Issue | Severity | Details |
|-------|----------|---------|
| **1 missed image** | Medium | `src/components/home/EnhancedLeagueActivityFeed.jsx:147` — `<img>` tag for player avatars in the activity feed has NO `loading="lazy"` |
| **No above-the-fold exception** | High | ALL images are lazy-loaded, including hero/above-fold content. Images visible on initial viewport should use `loading="eager"` or omit `loading` attribute. Lazy-loading above-fold images **hurts LCP**. |
| **No width/height attributes** | High | Zero `<img>` tags have explicit `width` and `height`, causing **layout shift (CLS)** as images load. Every image should have dimensions to reserve space. |
| **No srcSet/responsive images** | Medium | No `srcSet` or `sizes` attributes anywhere. Player photos are served at full resolution to mobile devices. |
| **CSS background images not addressed** | Low | Only 1 CSS background-image found (decorative gradient), so minimal impact. ✅ Acceptable. |
| **No WebP/AVIF format optimization** | Medium | All images are served from Sleeper CDN as-is. No format negotiation. |

### Verdict: 5/10 — Mechanically applied without considering LCP implications.

---

## 2. Code Splitting Verification

### ✅ What's Working
- 38+ routes use `React.lazy()` with dynamic imports ✅
- Build produces 85+ chunks (good granularity)
- React-scripts (CRA) handles vendor chunking automatically
- `PageSkeleton` Suspense fallback exists ✅

### ❌ Issues Found

| Issue | Severity | Details |
|-------|----------|---------|
| **framer-motion in main bundle** | Critical | framer-motion (~100-150KB raw) is imported in `main.js` (used in bottom nav `L` component and app shell). This is loaded for EVERY page, even if user only visits settings. |
| **html2canvas static import** | High | `src/components/tradeEngine/ShareModal.jsx` statically imports html2canvas (~200KB). Even though ShareModal is in a lazy route, anyone visiting ANY trade page loads this. `DraftReportCard.jsx` correctly uses dynamic import — inconsistent. |
| **Zustand stores in main bundle** | Medium | `portfolioStore` is imported in main app shell (sidebar uses it for badge count). This pulls in the entire store + API service module into the critical path. |
| **lucide-react tree-shaking** | Low | Individual icon imports are used (good), tree-shaking should work. ✅ |
| **No webpackChunkName comments** | Low | Dynamic imports lack `/* webpackChunkName: "..." */` comments, making debugging harder but not affecting performance. |

### Verdict: 6/10 — Routes are split, but main bundle is bloated by framer-motion and store imports.

---

## 3. Bundle Analysis

### Raw Numbers

| Asset | Raw Size | Gzipped |
|-------|----------|---------|
| `main.js` | 503KB | **150KB** |
| `chunk 148` (shared vendor) | 377KB | 99KB |
| `chunk 5239` (recharts?) | 203KB | ~65KB |
| `main.css` | 197KB | 29.5KB |
| **Critical path total** | ~900KB | **~279KB** |
| **Total all JS** | 2,487KB | **~830KB** |

### Assessment

- **150KB gzipped main.js is NOT good for this app.** For a React SPA with code-split routes, the main bundle should be 60-80KB gzipped. 150KB means React + ReactDOM (~40KB) + framer-motion (~40KB) + react-router (~15KB) + zustand + stores + API client + full app shell with all icons = way too much in critical path.
- The claim "150KB gzipped (expected)" normalizes a bloated bundle. It should be a red flag.
- **recharts (200KB+ raw)** is properly chunked — only loaded when chart pages are visited ✅
- **react-window** is a dependency but only used in 1 component (`QuickTradeSheet`). Player ranking lists render ALL items to DOM without virtualization.

### Verdict: 4/10 — Bundle is 2x what it should be for initial load.

---

## 4. Performance Metrics

### ❌ Zero Measurements Taken

| Check | Status |
|-------|--------|
| Before/after Lighthouse score | ❌ Not measured |
| LCP impact | ❌ Not measured |
| CLS impact | ❌ Not measured (likely **negative** due to missing width/height) |
| FID/INP impact | ❌ Not measured |
| Network waterfall | ❌ Not analyzed |
| Mobile 3G simulation | ❌ Not tested |
| Core Web Vitals | ❌ Not checked |
| Bundle size comparison | ❌ No before/after |

**This is the biggest failure.** The agent made changes but never verified they improved anything. Adding `loading="lazy"` to above-the-fold images could have **worsened** LCP.

### Verdict: 0/10 — No measurement, no verification.

---

## 5. Missed Optimizations

### Critical (Would move the needle significantly)

| Optimization | Impact | Effort | Details |
|-------------|--------|--------|---------|
| **Font loading is render-blocking** | High | Low | Google Fonts CSS is loaded synchronously in `<head>`. Should use `font-display: swap` (it does via URL param ✅) BUT the CSS link itself blocks render. Use `media="print" onload="this.media='all'"` pattern or `<link rel="preload" as="style">`. |
| **Move framer-motion to lazy** | High | Medium | Only used in bottom nav animation and a few pages. Could use CSS animations for nav or dynamically import framer-motion. Would save ~40-50KB gzipped from main bundle. |
| **Dynamic import html2canvas in ShareModal** | High | Low | Change `import html2canvas from 'html2canvas'` to `const html2canvas = (await import('html2canvas')).default` — same pattern already used in DraftReportCard. |
| **Virtualize player lists** | High | Medium | `PlayerRankings.jsx` (900 lines) renders all results in DOM. With 500+ players, this is a massive DOM size. `react-window` is already a dependency but only used in 1 place. |
| **Add width/height to all images** | High | Low | Prevents CLS. All player photos are consistent sizes (e.g., 40x40, 48x48). |

### Medium Priority

| Optimization | Impact | Effort | Details |
|-------------|--------|--------|---------|
| **Preload critical API endpoint** | Medium | Low | No `<link rel="preload">` for the initial API call (teams/portfolio). Could use `rel="preconnect"` to `api.titlerun.co`. |
| **No service worker / PWA caching** | Medium | High | No service worker exists. For a sports app with repeat visits, caching static assets and API responses would massively improve repeat-visit performance. |
| **CSS is 197KB (29.5KB gzipped)** | Medium | Medium | Likely includes unused Tailwind classes. PurgeCSS should be configured (CRA may not do this by default). |
| **No API response caching headers** | Medium | Backend | Not visible from frontend, but worth checking if API responses have proper Cache-Control headers. |
| **React Query is used but staleTime not visible** | Medium | Low | Check if `staleTime` is configured to avoid redundant API calls. |

### Low Priority

| Optimization | Impact | Effort | Details |
|-------------|--------|--------|---------|
| **No Brotli compression** | Low | Deploy | Depends on hosting (Railway). Should serve Brotli over gzip where supported. |
| **No CDN for static assets** | Low | Deploy | Check if Railway serves from CDN or origin. |
| **Intersection Observer polyfill** | None | N/A | Not needed — browser support is universal now. ✅ |
| **Only 7 files use React.memo** | Low | Medium | More components could benefit from memoization, but 93 files use useMemo/useCallback which is adequate. |

---

## 6. Specific Code Issues

### html2canvas Inconsistency
```jsx
// ❌ BAD — ShareModal.jsx (static import, ~200KB in chunk)
import html2canvas from 'html2canvas';

// ✅ GOOD — DraftReportCard.jsx (dynamic import, loaded on demand)
const html2canvas = (await import('html2canvas')).default;
```

### Missing Image in Activity Feed
```jsx
// src/components/home/EnhancedLeagueActivityFeed.jsx:147
<img
  src={getPlayerAvatar(activity.playerId, activity.playerName)}
  alt={activity.playerName}
  // ❌ MISSING: loading="lazy"
  // ❌ MISSING: width and height attributes
/>
```

### Above-the-Fold Lazy Loading Anti-Pattern
All images use `loading="lazy"` — but images in the Home page hero, dashboard above-the-fold, and sidebar avatars should NOT be lazy-loaded as they're immediately visible and contribute to LCP.

---

## Scoring Breakdown

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Lazy Loading Implementation | 20% | 5/10 | 10 |
| Code Splitting Verification | 20% | 6/10 | 12 |
| Bundle Analysis | 20% | 4/10 | 8 |
| Performance Metrics | 25% | 0/10 | 0 |
| Missed Optimizations | 15% | 3/10 | 5 |
| **Total** | **100%** | | **35/100** |

---

## Recommended Next Steps (Priority Order)

1. **🔴 Run Lighthouse before AND after** — Establish baseline Core Web Vitals
2. **🔴 Fix above-the-fold lazy loading** — Remove `loading="lazy"` from sidebar avatar, league selector avatar, and any hero images
3. **🔴 Add width/height to all `<img>` tags** — Fix CLS
4. **🟡 Dynamic import html2canvas in ShareModal** — 5 minute fix, saves ~60KB from trade chunk
5. **🟡 Evaluate framer-motion extraction from main bundle** — Biggest main bundle win
6. **🟡 Virtualize PlayerRankings list** — react-window already installed
7. **🟢 Add `<link rel="preconnect" href="https://api.titlerun.co">` to index.html**
8. **🟢 Consider `font-display: optional` for Inter font** — Prevents FOUT

---

*Audit complete. The performance "fix" was a surface-level pass that addressed only the most obvious optimization (lazy loading) without measurement, verification, or addressing the actual performance bottlenecks (bundle size, font loading, missing image dimensions, lack of virtualization). Score: 35/100.*

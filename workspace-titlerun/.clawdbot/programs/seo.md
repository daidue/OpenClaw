# TitleRun Improvement Program: SEO Optimization

## Mission
Achieve 90+ Lighthouse SEO score and optimize for organic search visibility through proper meta tags, structured data, sitemap, Core Web Vitals, and mobile-friendly implementation.

## Scope

### Files You CAN Modify
- `titlerun-app/public/index.html` (meta tags, structured data)
- `titlerun-app/src/**/*.{jsx,tsx}` (semantic HTML, headings)
- `titlerun-app/public/robots.txt` (crawl rules)
- `titlerun-app/public/sitemap.xml` (page index)
- `titlerun-app/src/components/SEO.jsx` (dynamic meta tags)
- Landing page content

### Files You CANNOT Modify
- Backend API routes (unless adding meta tag endpoints)
- Database schemas
- CI/CD configuration

## Metrics

### Primary Metrics (Must Maintain or Improve)
- **All tests pass**: 100% pass rate
- **Functionality**: No user-facing regressions
- **TypeScript**: Zero errors

### SEO Targets
- **Lighthouse SEO**: >90 (current: unknown, measure first)
- **Core Web Vitals**: Pass (LCP <2.5s, FID <100ms, CLS <0.1)
- **Mobile-friendly**: 100% (Google Mobile-Friendly Test)
- **Structured data**: 0 errors (Google Rich Results Test)
- **Indexability**: 100% of public pages

### Secondary Metrics (Nice to Have)
- **Page speed**: <3s load time
- **Sitemap**: All public pages included
- **Social sharing**: OpenGraph + Twitter Cards
- **Accessibility**: A11y helps SEO (semantic HTML)

## Constraints

### Hard Limits
- **No keyword stuffing**: Natural, readable content
- **No cloaking**: Same content for users and bots
- **No hidden text**: All content visible
- **Performance**: No >10% negative impact on load time

### Soft Limits
- **Content length**: Prefer quality over quantity
- **Image optimization**: Compress, but maintain quality
- **Internal linking**: Natural, helpful links

## Success Criteria

### Iteration Success
An iteration is successful if:
1. All tests pass (100% pass rate)
2. TypeScript compiles without errors
3. Lighthouse SEO score ≥ baseline
4. No new SEO errors (Search Console)

### Overall Success
The program succeeds when:
1. Lighthouse SEO >90
2. Core Web Vitals: Pass
3. Mobile-friendly: 100%
4. Structured data: 0 errors
5. Sitemap: Complete

## Strategies to Explore

### High-Impact, Low-Risk

**1. Meta Tags (Essential)**
- [ ] `<title>` unique per page (50-60 chars)
- [ ] `<meta name="description">` unique per page (150-160 chars)
- [ ] `<meta name="keywords">` (less important, but include)
- [ ] OpenGraph tags (og:title, og:description, og:image, og:url)
- [ ] Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image)
- [ ] Canonical URLs (`<link rel="canonical">`)

**2. Structured Data (JSON-LD)**
- [ ] Organization schema (for TitleRun)
- [ ] WebApplication schema (for the app itself)
- [ ] BreadcrumbList (navigation)
- [ ] FAQ schema (if FAQ page exists)

**3. Sitemap & Robots.txt**
- [ ] Create `sitemap.xml` (all public pages)
- [ ] Update `robots.txt` (allow crawling, link sitemap)
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools

**4. Semantic HTML**
- [ ] Use `<h1>` once per page (main heading)
- [ ] Logical heading hierarchy (h1 → h2 → h3, no skips)
- [ ] Use `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`
- [ ] Alt text on all images (descriptive, not keyword-stuffed)

### Medium-Impact, Medium-Risk

**5. Core Web Vitals**
- [ ] LCP (Largest Contentful Paint) <2.5s
  - Optimize images (WebP, lazy load)
  - Preload critical resources
  - Minimize render-blocking resources
- [ ] FID (First Input Delay) <100ms
  - Minimize JavaScript execution time
  - Code-split heavy bundles
- [ ] CLS (Cumulative Layout Shift) <0.1
  - Set width/height on images
  - Avoid inserting content above existing content
  - Use CSS transform instead of top/left

**6. Mobile Optimization**
- [ ] Responsive design (all breakpoints)
- [ ] Touch targets ≥44x44px
- [ ] No horizontal scroll
- [ ] Text readable without zoom (font-size ≥16px)
- [ ] Viewport meta tag: `<meta name="viewport" content="width=device-width, initial-scale=1">`

**7. Internal Linking**
- [ ] Link to important pages from homepage
- [ ] Breadcrumb navigation
- [ ] Related content links
- [ ] Footer links (About, Privacy, Terms)

### High-Impact, High-Risk (Careful)

**8. Content Optimization**
- [ ] Target keywords: "dynasty fantasy football", "dynasty trade analyzer", "dynasty rankings"
- [ ] H1 includes target keyword
- [ ] First paragraph includes target keyword naturally
- [ ] FAQ section with common questions

**9. URL Structure**
- [ ] Clean URLs (no query params where possible)
- [ ] Descriptive slugs (`/trade-analyzer` not `/page?id=123`)
- [ ] Use hyphens, not underscores
- [ ] Lowercase URLs

### Avoid (Anti-Patterns)

- ❌ Keyword stuffing (hurts rankings)
- ❌ Duplicate content (canonicalize or remove)
- ❌ Cloaking (showing different content to bots)
- ❌ Hidden text (white text on white bg)
- ❌ Low-quality backlinks (spammy link schemes)
- ❌ Slow page speed (hurts rankings)

## Baseline Metrics (Establish First)

Run SEO audits:
```bash
cd ~/Documents/Claude\ Cowork\ Business/titlerun-app

# Lighthouse SEO audit
npx lighthouse https://app.titlerun.co --only-categories=seo --view --output=json --output-path=.clawdbot/lighthouse-seo-baseline.json

# Extract score
cat .clawdbot/lighthouse-seo-baseline.json | jq '.categories.seo.score * 100'

# Check Core Web Vitals (requires PageSpeed Insights API or manual)
curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://app.titlerun.co&category=PERFORMANCE"

# Mobile-friendly test (Google Search Console API or manual)
# https://search.google.com/test/mobile-friendly

# Structured data test
# https://search.google.com/test/rich-results
```

Record:
- Lighthouse SEO score: ______ / 100
- Core Web Vitals: LCP ___s, FID ___ms, CLS ___
- Mobile-friendly: Yes / No
- Structured data errors: ______
- Indexed pages (Search Console): ______

## Evaluation Logic

```python
def evaluate_iteration(baseline, experiment):
    # Gate 1: Tests must pass
    if experiment.pass_rate < 1.0:
        return "DISCARD", "Tests failing"
    
    # Gate 2: No type errors
    if experiment.typescript_errors > 0:
        return "DISCARD", "TypeScript errors"
    
    # Gate 3: SEO must improve or stay same
    if experiment.lighthouse_seo < baseline.lighthouse_seo:
        return "DISCARD", "Lighthouse SEO score decreased"
    
    # Optimization check
    if experiment.lighthouse_seo > baseline.lighthouse_seo:
        improvement = experiment.lighthouse_seo - baseline.lighthouse_seo
        return "KEEP", f"Lighthouse SEO +{improvement:.1f} points"
    elif experiment.core_web_vitals_pass and not baseline.core_web_vitals_pass:
        return "KEEP", "Core Web Vitals now passing"
    else:
        return "DISCARD", "No improvement"
```

## Logging Format

Each iteration should log to `improvement-log.jsonl`:

```json
{
  "timestamp": "2026-03-23T01:00:00Z",
  "iteration": 1,
  "program": "seo",
  "hypothesis": "Add OpenGraph and Twitter Card meta tags to all pages",
  "changes": ["src/components/SEO.jsx", "public/index.html"],
  "metrics": {
    "lighthouse_seo": 87,
    "lcp_ms": 2400,
    "fid_ms": 90,
    "cls": 0.08,
    "mobile_friendly": true,
    "structured_data_errors": 0,
    "pass_rate": 1.0,
    "typescript_errors": 0
  },
  "baseline": {
    "lighthouse_seo": 75,
    "lcp_ms": 2800,
    "fid_ms": 120,
    "cls": 0.15,
    "mobile_friendly": false,
    "structured_data_errors": 3
  },
  "verdict": "KEEP",
  "reason": "Lighthouse SEO +12 points, Core Web Vitals improved"
}
```

## Expected Output

At completion, generate a summary report:

```markdown
# SEO Optimization — 2026-03-23

## Results
- Iterations: 38
- Duration: 2h 50m
- Improvements kept: 16
- Improvements discarded: 22

## Final Metrics
- Lighthouse SEO: 92/100 (up from 75) → **+17 points** ✅
- Core Web Vitals: PASS (LCP 2.3s, FID 85ms, CLS 0.07) → **Passing** ✅
- Mobile-friendly: 100% (up from 60%) → **+40%** ✅
- Structured data: 0 errors (down from 3) → **100% fixed** ✅
- Indexed pages: 12/12 (100% coverage)

## Key Changes

### Meta Tags
1. Added unique `<title>` to all 12 pages (50-60 chars)
2. Added unique `<meta name="description">` (150-160 chars)
3. Implemented OpenGraph tags (og:title, og:description, og:image, og:url)
4. Implemented Twitter Cards (twitter:card, twitter:title, twitter:description, twitter:image)
5. Added canonical URLs to prevent duplicate content

### Structured Data (JSON-LD)
1. Organization schema for TitleRun
2. WebApplication schema
3. BreadcrumbList for navigation
4. FAQ schema (6 common questions)

### Sitemap & Robots.txt
1. Created `sitemap.xml` with all 12 public pages
2. Updated `robots.txt` to allow crawling
3. Submitted sitemap to Google Search Console
4. Submitted sitemap to Bing Webmaster Tools

### Semantic HTML
1. Fixed heading hierarchy (h1 → h2 → h3, no skips)
2. Added semantic elements (`<nav>`, `<main>`, `<article>`, `<footer>`)
3. Added descriptive alt text to 23 images

### Core Web Vitals
1. Optimized images (WebP conversion, lazy loading)
2. Preloaded critical resources (fonts, CSS)
3. Set width/height on all images (prevent CLS)
4. Code-split heavy bundles (TradeBuilder, PlayerDetail)

### Mobile Optimization
1. Fixed touch targets (all ≥44x44px)
2. Removed horizontal scroll
3. Increased font sizes (≥16px)
4. Tested all breakpoints (320px - 1920px)

## SEO Checklist

| Item | Status | Notes |
|------|--------|-------|
| Unique titles | ✅ | All 12 pages |
| Meta descriptions | ✅ | All 12 pages |
| OpenGraph tags | ✅ | All pages |
| Twitter Cards | ✅ | All pages |
| Structured data | ✅ | Organization + WebApp + FAQ |
| Sitemap | ✅ | 12 pages indexed |
| Robots.txt | ✅ | Allows crawling |
| Semantic HTML | ✅ | Proper hierarchy |
| Alt text | ✅ | 23 images |
| Core Web Vitals | ✅ | LCP 2.3s, FID 85ms, CLS 0.07 |
| Mobile-friendly | ✅ | 100% passing |

## Target Keywords

| Keyword | Monthly Searches | Difficulty | Ranking |
|---------|-----------------|------------|---------|
| dynasty fantasy football | 12,000 | Medium | Not yet ranked |
| dynasty trade analyzer | 1,200 | Low | Not yet ranked |
| dynasty rankings | 8,000 | High | Not yet ranked |
| fantasy football trade | 18,000 | High | Not yet ranked |

## Recommendation
MERGE — SEO optimized for launch. Lighthouse 92/100, Core Web Vitals passing, mobile-friendly.

## Post-Launch TODO
1. Submit to Google Search Console (track rankings)
2. Build backlinks (guest posts, FF communities)
3. Create blog content (dynasty strategy, trade guides)
4. Monitor rankings weekly
5. A/B test meta descriptions for CTR

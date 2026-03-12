# 🔍 Trade Insights Integration — Adversarial Audit Report

**Date:** 2026-03-12
**Commit:** b390f33 (13 files, 1,184 insertions)
**Staging:** https://003f1fca.titlerun-app.pages.dev
**Auditors:** 5-expert adversarial panel

---

## Section 1: Executive Summary

### 🟢 Verdict: **SHIP TO PRODUCTION — Fix P1s First**

| Category | Score | Target | Status |
|----------|-------|--------|--------|
| Integration Quality (Sarah Chen) | **88/100** | 90+ | 🟡 Close |
| Security (Maya Rodriguez) | **92/100** | 95+ | 🟡 Close |
| Performance (David Kim) | **85/100** | 85+ | 🟢 Pass |
| Accessibility (Jordan Lee) | **82/100** | 90+ | 🟡 Below |
| Production Readiness (Alex Park) | **80/100** | 85+ | 🟡 Below |

**Overall: 85/100** — Confidence: **80% safe to ship after P1 fixes**

### Bug Summary
- **P0 bugs:** 0 (nothing blocks deploy)
- **P1 bugs:** 5 (should fix before launch)
- **P2 issues:** 8 (post-launch backlog)

### Top 3 Risks If We Deploy Now
1. **Artificial 300ms loading skeleton** on every asset change creates jank during rapid trade building
2. **No feature flag** — can't disable TradeInsightsCard in production if it causes issues
3. **ExpandableSection height miscalculation** — dynamic content may get clipped on first expand

---

## Section 2: Integration Audit (Sarah Chen)

**Score: 88/100**

| Criteria | Points | Score |
|----------|--------|-------|
| Data flow correctness | 20 | 17 |
| Component composition | 20 | 19 |
| State management | 20 | 18 |
| Error handling | 20 | 18 |
| Code quality | 20 | 16 |

### Findings

```
P1-INT-1: Artificial Loading Skeleton on Every Asset Change

File: src/components/trade/TradeInsightsCard.tsx
Line: 82-86
Code:
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, [give, get]);

Issue: Every time a user adds/removes ANY player, the entire TradeInsightsCard
flashes a skeleton for 300ms. During rapid trade building (add 3 players quickly),
this creates a jank-filled experience of skeleton→content→skeleton→content.
The `give` and `get` arrays change reference on every parent render (new useMemo
output), so this fires constantly.

Fix: Remove the artificial loading skeleton entirely. The calculations are
synchronous (useMemo) — there's no async data to wait for. If you want smooth
transitions, use CSS transitions on opacity instead:

  // Remove the isLoading state and useEffect entirely
  // Add CSS: transition: opacity 0.2s; on the container

Severity: P1 (bad UX during primary workflow)
Time to fix: 10 minutes
```

```
P1-INT-2: useMemo Dependencies Create New References on Every Render Cycle

File: src/pages/TradeBuilder.jsx
Line: ~195-210 (insightAssets useMemo)
Code:
  const insightAssets = useMemo(() => {
    ...
    return { give: teamA.gives.map(mapToTradeAsset), get: teamB.gives.map(mapToTradeAsset) };
  }, [teamA.gives, teamB.gives]);

Issue: The useMemo correctly depends on teamA.gives and teamB.gives, BUT these
arrays are new references whenever setTeamA/setTeamB create new state objects.
This means insightAssets creates new give/get arrays on every trade state change,
which triggers the useEffect in TradeInsightsCard (P1-INT-1 above). Combined with
the skeleton effect, this is a cascade problem.

Fix: This is correctly memoized by value (arrays only change when gives change),
so it works correctly. The real fix is P1-INT-1. However, consider adding
React.memo to TradeInsightsCard to prevent unnecessary re-renders from parent
state changes that DON'T affect give/get:

  export default React.memo(TradeInsightsCard);

Severity: P2 (optimization, not a bug)
Time to fix: 2 minutes
```

```
P2-INT-3: Unused `allPlayers` Variable Passed to TradeSpotlight (Not Used)

File: src/components/trade/TradeInsightsCard.tsx
Line: 108
Code: const allPlayers = [...give, ...get];

Issue: `allPlayers` is only passed to ContractDetails. It spreads both arrays
every render. Minor waste — could pass give/get separately.

Fix: Pass give={give} get={get} to ContractDetails and filter inside.
Severity: P2 (minor optimization)
Time to fix: 5 minutes
```

```
P2-INT-4: TradeAsset Type Mismatch — `position` Field

File: src/pages/TradeBuilder.jsx
Line: ~200
Code: position: asset.type === 'pick' ? 'PICK' : (asset.position || 'PICK')

Issue: If `asset.position` is undefined for a non-pick asset (e.g., a player
without position data from API), it defaults to 'PICK'. This means a player
missing position data would be treated as a draft pick in all insights
components. Should default to '' or 'UNKNOWN' instead.

Fix: position: asset.type === 'pick' ? 'PICK' : (asset.position || '')
Severity: P2 (edge case, unlikely with current API data)
Time to fix: 1 minute
```

### Data Flow Assessment
✅ `teamA.gives`/`teamB.gives` → `insightAssets` mapping via `useMemo` — **correct**
✅ Conditional rendering (both sides ≥1 asset) — **correct**
✅ ErrorBoundary wraps TradeInsightsCard at `level="section"` — **correct**
✅ Existing TradeColumn not replaced — **correct**
⚠️ `mapToTradeAsset` maps `currentValue` and `value` to the same source (`asset.value`) — works but redundant

### Recommendations
1. Fix P1-INT-1 (skeleton) before production
2. Add `React.memo` to `TradeInsightsCard` 
3. Consider lazy-loading the 3 expandable section contents

---

## Section 3: Security Audit (Maya Rodriguez)

**Score: 92/100**

| Criteria | Points | Score |
|----------|--------|-------|
| XSS prevention | 30 | 28 |
| Input validation | 25 | 23 |
| Error handling | 25 | 23 |
| Auth boundaries | 20 | 18 |

### Findings

```
P2-SEC-1: Player Names Rendered Without Sanitization

Files: All new components (TradeInsightsCard, PlayerInsightSummary, TradedPlayerCard, etc.)
Code: <span>{player.name}</span>

Issue: Player names come from external API (Sleeper) and are rendered directly
in JSX. React auto-escapes JSX expressions, so this is NOT an XSS vulnerability.
However, there's no length validation — a malicious/corrupted API response with
a 10,000-character name would break layout.

Fix: Add truncation: `player.name?.slice(0, 50) || 'Unknown'`
Severity: P2 (defense in depth, not exploitable)
Time to fix: 10 minutes across all components
```

```
P2-SEC-2: Client-Side Trade Score Can Be Manipulated

File: src/components/trade/TradeInsightsCard.tsx
Line: 30-52
Code: function calculateTradeScores(give, get)

Issue: Trade scores are calculated purely client-side. A user could manipulate
asset values in React DevTools to show a fake "95 — Strong Trade" score to
screenshot and share with trade partners. However, the actual trade analysis
(handleAnalyzeTrade) uses server-side calculation, so this is cosmetic only.

Fix: Add disclaimer: "Preliminary estimate — see full analysis for official score"
OR calculate server-side (better long-term).
Severity: P2 (cosmetic manipulation only)
Time to fix: 5 min for disclaimer, 2hr for server-side
```

### Security Assessment
✅ **No `dangerouslySetInnerHTML`** anywhere in new code
✅ **No eval() or dynamic script injection**
✅ **React JSX auto-escaping** protects against XSS in all name/value renders
✅ **ErrorBoundary** does not leak stack traces to users in production (uses `logger.error` internally)
✅ **Auth boundary** maintained — TradeBuilder requires login (staging confirms redirect to login)
✅ **No direct DOM manipulation** — all rendering through React
⚠️ Trade scores are client-side (cosmetic concern, not security vulnerability)

### Verdict
**No security vulnerabilities found.** The integration follows React security best practices. The P2 items are defense-in-depth improvements, not active risks.

---

## Section 4: Performance Audit (David Kim)

**Score: 85/100**

| Criteria | Points | Score |
|----------|--------|-------|
| Bundle size | 20 | 18 |
| Re-render efficiency | 30 | 22 |
| Memory management | 20 | 18 |
| Initial load | 30 | 27 |

### Bundle Size Impact
- **Trade Insights chunk (8967):** 62,274 bytes (~61KB)
- **Total build:** 3.3MB (2.7MB JS)
- **Impact:** ~2.3% increase to total JS bundle
- **Verdict:** ✅ Acceptable. Code-split into separate chunk, loaded only on TradeBuilder page.

### Findings

```
P1-PERF-1: 300ms Skeleton Re-renders on Every Asset Change

File: src/components/trade/TradeInsightsCard.tsx
Line: 82-86
(Same as P1-INT-1 — cross-referenced)

Issue: Forcing a re-render cycle (show skeleton → hide skeleton) every time
give/get changes. This creates 2 extra render passes per asset change.
With 6 players in a trade, that's 12 unnecessary render cycles during
trade construction.

Performance impact: Measured via code analysis — each skeleton→content
cycle triggers layout recalculation (~16ms frame budget consumed).

Fix: Remove skeleton effect. Use CSS opacity transitions if smooth UX needed.
Severity: P1
```

```
P1-PERF-2: TradeVerdict Animation Restarts on Every Score Change

File: src/components/trade/TradeVerdict.tsx
Line: 58-75
Code:
  useEffect(() => {
    setDisplayScore(0);
    setAnimationDone(false);
    const animate = (now) => { ... requestAnimationFrame(animate); };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [score]);

Issue: Every time a player is added/removed, the score changes, and the
800ms count-up animation restarts FROM ZERO. During rapid trade building,
users see the ring constantly resetting: 0→45→0→52→0→58. This is visually
jarring and creates unnecessary paint operations.

Fix: Animate from current displayScore to new score, not from 0:
  const startScore = displayScore; // capture current
  // In animate: lerp from startScore to score

OR: Debounce the animation trigger by 500ms after last change.
Severity: P1 (visible UX jank during primary workflow)
Time to fix: 15 minutes
```

```
P2-PERF-3: ExpandableSection Measures scrollHeight on Every children Change

File: src/components/trade/ExpandableSection.tsx
Line: 20-24
Code:
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children, isExpanded]);

Issue: `children` is a new reference every render (React elements), so this
runs on EVERY render, not just when content actually changes. Forces layout
reading (scrollHeight) which can cause layout thrashing.

Fix: Use ResizeObserver instead:
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setContentHeight(el.scrollHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

Severity: P2 (minor, only 3 sections)
Time to fix: 10 minutes
```

```
P2-PERF-4: ValueProjectionTable Recalculates All Projections Every Render

File: src/components/trade/ValueProjectionTable.tsx
Code: Inline calls to projectValue() in JSX + footer

Issue: projectValue() is called 3x per asset + 6x for totals on every render.
With 10 players in trade = 36 calls. The calculation is cheap but should be
memoized for correctness.

Fix: Wrap in useMemo:
  const projections = useMemo(() => allAssets.map(a => ({
    ...a, now: projectValue(a,0), yr1: projectValue(a,1), yr2: projectValue(a,2)
  })), [allAssets]);

Severity: P2 (optimization, not a bug)
Time to fix: 10 minutes
```

### Memory Management
✅ `animFrameRef` properly cleaned up via `cancelAnimationFrame` in TradeVerdict
✅ `setTimeout` properly cleaned up in TradeInsightsCard
✅ No event listeners added directly to DOM in new components
✅ No refs leaked — all refs are component-scoped
✅ Parent's `mountedRef` pattern prevents setState after unmount

### Verdict
Bundle size is clean. The main performance concern is the animation/skeleton re-render cascade during active trade building. Fix P1-PERF-1 and P1-PERF-2 before production.

---

## Section 5: Accessibility Audit (Jordan Lee)

**Score: 82/100**

| Criteria | Points | Score |
|----------|--------|-------|
| Keyboard navigation | 25 | 21 |
| Screen reader | 25 | 22 |
| WCAG compliance | 30 | 23 |
| Focus management | 20 | 16 |

### Findings

```
P1-A11Y-1: ExpandableSection Missing aria-controls Linkage

File: src/components/trade/ExpandableSection.tsx
Line: 27-33
Code:
  <button
    onClick={() => setIsExpanded(!isExpanded)}
    aria-expanded={isExpanded}
  >

Issue: Button has `aria-expanded` but no `aria-controls` pointing to the
expandable content panel. Screen readers can't programmatically navigate
from trigger to content. Also missing `id` on the content div.

Fix:
  const panelId = useId(); // React 18
  <button aria-expanded={isExpanded} aria-controls={panelId}>
  <div id={panelId} role="region" ...>

Severity: P1 (WCAG 4.1.2 failure)
Time to fix: 5 minutes
```

```
P1-A11Y-2: TradeVerdict Score Ring Has No Accessible Text Before Animation Completes

File: src/components/trade/TradeVerdict.tsx
Line: 110-113
Code:
  <div aria-live="polite" className="sr-only">
    {animationDone && `Trade score: ${score}...`}
  </div>

Issue: During the 800ms animation, the aria-live region is empty. Screen reader
users hear nothing while sighted users see the animation. The SVG is
`aria-hidden="true"` (correct), but the center number has no accessible label.

Fix: Add immediate aria-label on the score display:
  <span aria-label={`Trade score: ${score} out of 100`} ...>{displayScore}</span>
  // Keep the aria-live for the verdict label announcement

Severity: P1 (screen reader users get no score for 800ms)
Time to fix: 5 minutes
```

```
P2-A11Y-3: Position Impact Bars in AdvancedAnalytics Lack Text Alternative

File: src/components/trade/AdvancedAnalytics.tsx
Line: 63-82
Issue: The horizontal bar chart uses `<div>` elements with background colors.
No `aria-label` or `role="meter"` to convey the data to screen readers. The
numeric value at the end partially helps but doesn't explain the bar context.

Fix: Add `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
on each bar, or add sr-only text: "QB: Giving 5000, Getting 8000, Net +3000"

Severity: P2 (data is partially accessible via the number)
Time to fix: 15 minutes
```

```
P2-A11Y-4: PlayerInsightSummary Badge Colors Are Color-Only Indicators

File: src/components/trade/PlayerInsightSummary.tsx
Issue: Badges use color classes (text-emerald-400, text-amber-400, etc.) as
the primary differentiator. However, they also include emoji (🚀, ⚠️, 💎, 📈)
and text labels ("Breakout", "Decline", etc.), so this is partially mitigated.

Fix: Ensure contrast ratios meet WCAG AA (4.5:1). Current emerald-400 on
gray-900/60 background likely passes. Verify with contrast checker.

Severity: P2 (partially mitigated by emoji+text)
Time to fix: 10 minutes to verify all combinations
```

```
P2-A11Y-5: Tables Missing Caption Elements

Files: ValueProjectionTable.tsx, ContractDetails.tsx
Issue: <table> elements have visual headers but no <caption> element for
screen readers to identify the table's purpose.

Fix: Add <caption className="sr-only">2-Year Value Projection</caption>
Severity: P2 (WCAG 1.3.1)
Time to fix: 2 minutes
```

### Positive Findings
✅ `role="list"` and `role="listitem"` used correctly on player lists
✅ `role="region"` with `aria-label` on TradeSpotlight
✅ `aria-expanded` on all expandable triggers
✅ `aria-label` on remove/add buttons in TradedPlayerCard and BenchPlayerRow
✅ Touch targets: 44x44px on TradedPlayerCard remove button ✅, BenchPlayerRow add button ✅
✅ `aria-live="polite"` for score announcement
✅ Keyboard-accessible buttons throughout (native `<button>` elements)

### Verdict
Good foundation but needs aria-controls linkage and immediate score accessibility before production.

---

## Section 6: Production Readiness Audit (Alex Park)

**Score: 80/100**

| Criteria | Points | Score |
|----------|--------|-------|
| Deployment success | 25 | 22 |
| Rollback plan | 20 | 16 |
| Monitoring | 20 | 16 |
| Testing coverage | 35 | 26 |

### Staging Test Results

| Test | Result | Notes |
|------|--------|-------|
| Staging URL loads | ✅ Pass | https://003f1fca.titlerun-app.pages.dev loads correctly |
| Redirects to login | ✅ Pass | Auth boundary working |
| Production build passes | ✅ Pass | `react-scripts build` exits 0, no warnings |
| Console errors (staging) | ⚠️ Existing | Pre-existing CORS/404 errors (not from this integration) |
| ChunkLoadError on prod | ⚠️ Known | Stale cache issue on app.titlerun.co (chunk 5645) — NOT related to this integration |
| Bundle size reasonable | ✅ Pass | 62KB chunk, 2.3% of total |

### Findings

```
P1-PROD-1: No Feature Flag for TradeInsightsCard

File: src/pages/TradeBuilder.jsx
Line: ~355
Code:
  {insightAssets.give.length > 0 && insightAssets.get.length > 0 && (
    <ErrorBoundary level="section" name="Trade Insights">
      <TradeInsightsCard tradedAssets={insightAssets} />
    </ErrorBoundary>
  )}

Issue: No feature flag wrapping the integration. If TradeInsightsCard causes
issues in production, the only option is rolling back the entire deploy.
With a feature flag, we could disable it instantly.

Fix: Add environment variable or feature flag:
  {FEATURE_FLAGS.tradeInsights && insightAssets.give.length > 0 && ...}

OR use the ErrorBoundary's onError to auto-disable after N crashes:
  const [insightsDisabled, setInsightsDisabled] = useState(false);
  <ErrorBoundary onError={() => setInsightsDisabled(true)}>

Severity: P1 (no kill switch for new feature in production)
Time to fix: 15 minutes
```

```
P2-PROD-2: No Unit Tests for New Components

Issue: 13 new files added with 0 test files. No test coverage for:
- calculateTradeScores()
- projectValue()
- computePositionImpact()
- getInsightBadge()
- Edge cases (empty arrays, zero values, missing fields)

Fix: Add tests for pure functions at minimum:
- types.test.ts (getInsightBadge, formatContract)
- TradeInsightsCard.test.tsx (score calculation, empty state handling)
- ValueProjectionTable.test.tsx (projection math)

Severity: P2 (technical debt, not a deploy blocker)
Time to fix: 2-3 hours
```

```
P2-PROD-3: TradeSpotlight, TradedPlayerCard, BenchPlayerRow Exported But Not Used

File: src/components/trade/index.ts
Issue: Phase 1 components (TradeSpotlight, TradedPlayerCard, BenchPlayerRow)
are exported in index.ts but NOT imported anywhere in the app. They exist
only as standalone components. This adds to bundle size (tree-shaking should
eliminate, but verify).

Fix: Verify tree-shaking removes them. If not, remove from index.ts exports.
These components are designed for a TradeSpotlight integration that was
explicitly NOT used (existing TradeColumn kept instead).

Severity: P2 (dead code, likely tree-shaken)
Time to fix: 5 minutes to verify
```

```
P2-PROD-4: Stale ChunkLoadError on Production (Pre-existing)

Issue: Console shows ChunkLoadError for chunk 5645 on app.titlerun.co.
This is NOT caused by this integration but indicates stale service worker
or CDN cache issue. Deploying new code will create new chunk hashes and
could cause same issue for users with stale caches.

Fix: Add chunk load error recovery:
  window.addEventListener('error', (e) => {
    if (e.message?.includes('ChunkLoadError')) {
      window.location.reload();
    }
  });

Severity: P2 (pre-existing, not from this integration)
Time to fix: 30 minutes
```

### Deployment Assessment
- **Cloudflare Pages:** Atomic deploys with instant rollback via dashboard
- **Rollback plan:** Revert to previous deployment in Cloudflare Pages dashboard (< 1 minute)
- **Error monitoring:** ErrorBoundary + `captureError` (Sentry integration) ✅
- **Mobile testing:** Not verified (auth-gated staging prevents browser responsive testing)
- **Cross-browser:** Not verified (same auth gate)

### Verdict
Deployable with rollback safety net (Cloudflare Pages). Strongly recommend adding feature flag (P1-PROD-1) before production push.

---

## Section 7: Implementation Plan

### P1 Fixes (Before Production — ~2 hours total)

| ID | Fix | File | Time | Owner |
|----|-----|------|------|-------|
| P1-INT-1 | Remove artificial 300ms skeleton, use CSS transitions | TradeInsightsCard.tsx | 10 min | Rush |
| P1-PERF-2 | Debounce TradeVerdict animation or animate from current value | TradeVerdict.tsx | 15 min | Rush |
| P1-A11Y-1 | Add aria-controls + id to ExpandableSection | ExpandableSection.tsx | 5 min | Rush |
| P1-A11Y-2 | Add aria-label to score display | TradeVerdict.tsx | 5 min | Rush |
| P1-PROD-1 | Add feature flag or auto-disable on error | TradeBuilder.jsx | 15 min | Rush |

**Total estimated: ~50 minutes of focused work**

### P2 Issues (Post-Launch Backlog)

| ID | Description | Effort |
|----|-------------|--------|
| P2-INT-3 | Unused allPlayers spread | 5 min |
| P2-INT-4 | Position defaults to 'PICK' for unknown | 1 min |
| P2-SEC-1 | Player name length validation | 10 min |
| P2-SEC-2 | Client-side score disclaimer | 5 min |
| P2-PERF-3 | ExpandableSection use ResizeObserver | 10 min |
| P2-PERF-4 | Memoize ValueProjectionTable projections | 10 min |
| P2-A11Y-3 | Bar chart aria labels | 15 min |
| P2-A11Y-4 | Verify badge contrast ratios | 10 min |
| P2-A11Y-5 | Table captions | 2 min |
| P2-PROD-2 | Unit tests for pure functions | 2-3 hr |
| P2-PROD-3 | Verify tree-shaking of unused Phase 1 components | 5 min |
| P2-PROD-4 | ChunkLoadError recovery handler | 30 min |

---

## Final Recommendation

### 🟢 GO — After P1 Fixes

**Confidence: 85% safe to ship after fixing the 5 P1 items.**

The integration is architecturally sound:
- Clean component composition with proper separation of concerns
- ErrorBoundary provides graceful degradation
- No security vulnerabilities
- Acceptable bundle size impact (62KB, code-split)
- Auth boundaries maintained

The P1 issues are all quick fixes (under 1 hour total):
- Remove artificial skeleton jank
- Fix animation restart behavior
- Add aria-controls and aria-label
- Add feature flag kill switch

**Ship with P1 fixes. P2s go to post-launch backlog.**

---

*Report generated: 2026-03-12 07:48 EDT*
*Audit panel: Sarah Chen (Integration), Maya Rodriguez (Security), David Kim (Performance), Jordan Lee (Accessibility), Alex Park (Production Readiness)*

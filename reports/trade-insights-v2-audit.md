# Trade Insights Redesign v2 — Adversarial Audit Report

**Date:** 2026-03-12
**Commit:** `15f343d` on `feature/trade-insights-redesign-v2`
**Scope:** 16 files (14 new + 2 modified), 1,335 lines of code

---

**Overall Verdict:** ⚠️ SHIP WITH CONDITIONS
**Overall Score:** 82/100
**Confidence:** 88%

## Summary Scores

| Category | Expert | Score | Status |
|----------|--------|-------|--------|
| Security | Maya Chen | 88/100 | ⚠️ |
| Performance | David Kim | 78/100 | ⚠️ |
| Accessibility | Jordan Lee | 85/100 | ⚠️ |
| React/TypeScript | Alex Rivera | 86/100 | ✅ |
| UX | Sarah Martinez | 80/100 | ⚠️ |
| Mobile | Chris Park | 82/100 | ⚠️ |
| Code Quality | Dr. Emily Watson | 84/100 | ✅ |

## Critical Findings

**P0 Bugs (Block Deploy):** 1 found
**P1 Bugs (Fix Before Production):** 7 found
**P2 Issues (Post-Launch):** 9 found

## Top 3 Risks

1. **Player ID injection in headshot URLs** — `getPlayerHeadshotUrl()` does not sanitize `sleeperId` before interpolating into URL, enabling potential open redirect/SSRF if player IDs come from untrusted sources
2. **Duplicate sessionStorage keys** — Both `useTabNavigation.ts` and `DeepDiveTabs.tsx` write to sessionStorage with different keys for the same logical tab state, creating split-brain behavior
3. **Persistent `animate-pulse` on celebration** — Infinite CSS animation runs indefinitely on scored trades ≥80, consuming GPU compositor time and draining mobile battery

---

## Maya Chen — Security

### Score: 88/100
**Verdict:** CONDITIONAL PASS

### What Works Well
- All Sleeper CDN URLs use HTTPS exclusively
- No `dangerouslySetInnerHTML` usage anywhere
- SVG in `MiniSparkline` uses computed numeric values only — no string interpolation from user input into SVG attributes
- `triggerHaptic` has safe fallback patterns

### Issues Found

#### P0 Bugs (Block Deploy)

**P0-SEC-1: Player ID not sanitized in headshot URL builder**
- **File:** `src/components/trade/utils/headshots.ts:9`
- **Issue:** `getPlayerHeadshotUrl(sleeperId)` directly interpolates the `sleeperId` into a URL with zero validation. If a malicious `sleeperId` contains path traversal (`../../../`) or URL-encoded characters, it could construct unexpected URLs. While currently data comes from Sleeper API (trusted), this is a shared utility that could be called with untrusted input.
- **Fix:** Add regex validation: `if (!/^\d+$/.test(sleeperId)) return FALLBACK_URL;`
- **Time to fix:** 5 min

#### P1 Bugs (Fix Before Production)

**P1-SEC-1: No Content Security Policy consideration for Sleeper CDN**
- **File:** `src/components/trade/utils/headshots.ts`
- **Issue:** External image loads from `sleepercdn.com` need to be in CSP `img-src` directive. If CSP is strict, headshots silently fail with no user feedback.
- **Fix:** Verify CSP headers include `sleepercdn.com`, add `onError` fallback to `<img>` tags
- **Time to fix:** 15 min

**P1-SEC-2: `calculateTradeScores` division by zero edge case**
- **File:** `src/components/trade/TradeInsightsSection.tsx:39`
- **Issue:** `Math.min(giveTotal, getTotal) / Math.max(giveTotal, getTotal)` — when both are 0, the early return catches it. But when one is 0 and other isn't: `Math.min(0, 5000) / Math.max(0, 5000) = 0/5000 = 0`. This is safe but produces `fairness: 0` and `overall: 8` which may confuse users for a "one-sided add" trade. Not a crash, but a logic gap.
- **Fix:** Add comment documenting this is intentional, or handle "one-sided adds" as a special case
- **Time to fix:** 10 min

#### P2 Issues (Post-Launch)

**P2-SEC-1: sessionStorage exceptions swallowed silently**
- **File:** `src/components/trade/hooks/useTabNavigation.ts:39-46`, `DeepDiveTabs.tsx:82-90`
- **Issue:** Empty catch blocks hide errors. At minimum, log in development.
- **Fix:** Add `if (process.env.NODE_ENV === 'development') console.warn(e)`
- **Time to fix:** 5 min

### Recommendations
1. Add input sanitization to `getPlayerHeadshotUrl` — validate sleeperId is numeric only
2. Add `onError` handlers to all `<img>` tags loading external URLs
3. Consider a CSP audit for all external CDN dependencies

---

## David Kim — Performance

### Score: 78/100
**Verdict:** CONDITIONAL PASS

### What Works Well
- `useMemo` used correctly for expensive calculations (`calculateTradeScores`, sparkline points)
- `useCallback` wrapping event handlers in `DeepDiveTabs` prevents child re-renders
- Skeleton loading state prevents layout shift during initial 300ms delay
- SVG sparklines are lightweight — no canvas or chart library dependency

### Issues Found

#### P1 Bugs (Fix Before Production)

**P1-PERF-1: Infinite `animate-pulse` on celebration scores**
- **File:** `src/components/trade/hooks/useScoreCelebration.ts:36-47`
- **Issue:** `pulseGlowClass` includes `animate-pulse` (infinite CSS animation) plus `shadow-lg` (triggers compositor layer). On trades scoring ≥80 (common for balanced trades), this animation runs forever, consuming GPU resources and battery. On low-end devices, this causes jank.
- **Fix:** Use a finite animation (e.g., 3 pulses then stop), or apply `animation-iteration-count: 3` via a custom Tailwind class
- **Time to fix:** 15 min

**P1-PERF-2: `useMemo` dependency on object references in TradeInsightsSection**
- **File:** `src/components/trade/TradeInsightsSection.tsx:103-106`
- **Issue:** `useMemo(() => calculateTradeScores(give, get), [give, get])` — `give` and `get` are destructured from `tradedAssets` prop. If parent re-renders with a new `tradedAssets` object (same contents, different reference), all memos re-run. This is standard React behavior but means the parent MUST stabilize these arrays.
- **Fix:** Document this requirement or add a deep comparison via `JSON.stringify` key
- **Time to fix:** 10 min

**P1-PERF-3: `useCallback` in `setActiveTab` depends on `tabs` array reference**
- **File:** `src/components/trade/hooks/useTabNavigation.ts:66-72`
- **Issue:** `useCallback((id) => {...}, [tabs])` — if the parent passes a new `tabs` array on every render (inline `[...]`), this callback recreates every render, cascading to `getTabProps` and `handleKeyDown` recreation. The hook consumer must pass a stable `tabs` reference.
- **Fix:** Add `useMemo` inside the hook to stabilize the tabs array by value, or document the requirement
- **Time to fix:** 10 min

**P1-PERF-4: Resize event listener without throttle**
- **File:** `src/components/trade/DeepDiveTabs.tsx:134`
- **Issue:** `window.addEventListener('resize', updateUnderline)` fires on every resize pixel. On mobile rotation this fires rapidly, doing DOM measurements (`getBoundingClientRect`) on each frame.
- **Fix:** Wrap `updateUnderline` in a `requestAnimationFrame` throttle or use `ResizeObserver`
- **Time to fix:** 10 min

#### P2 Issues (Post-Launch)

**P2-PERF-1: Duplicate tab state management**
- **File:** `useTabNavigation.ts` + `DeepDiveTabs.tsx`
- **Issue:** Both implement their own sessionStorage read/write with different keys (`trade-insights-tab` vs `trade-insights-active-tab`). `DeepDiveTabs` doesn't use `useTabNavigation` at all — it reimplements the pattern inline. This doubles the sessionStorage writes and creates confusion about which hook to use.
- **Fix:** Refactor `DeepDiveTabs` to use `useTabNavigation` hook, or remove the unused hook
- **Time to fix:** 30 min

**P2-PERF-2: MiniSparkline `gradientId` uses `Math.random()` — no SSR stability**
- **File:** `src/components/trade/MiniSparkline.tsx:21`
- **Issue:** `Math.random().toString(36).slice(2, 9)` generates a new ID on every mount. In SSR scenarios, server and client IDs won't match, causing hydration mismatch. Currently CRA (no SSR) so not blocking, but if migrating to Next.js this will break.
- **Fix:** Use `useId()` (React 18+) or a counter-based ID
- **Time to fix:** 5 min

**P2-PERF-3: Bundle impact — framer-motion imported in 5 components**
- **Files:** TradeInsightsSection, DeepDiveTabs, PlayerShowcaseCard, NetDeltaBadge (+ AnimatePresence in DeepDiveTabs)
- **Issue:** framer-motion is ~32KB gzipped. Already in the bundle so no new cost, but these components can't be code-split independently from framer-motion.
- **Fix:** Consider `motion/react` (framer-motion v11 tree-shakeable) or CSS animations for simple fade/slide
- **Time to fix:** 2 hours (post-launch)

### Recommendations
1. Fix the infinite pulse animation — biggest real-world impact on mobile battery
2. Throttle the resize listener in DeepDiveTabs
3. Consolidate duplicate tab state management (useTabNavigation hook is unused)

---

## Jordan Lee — Accessibility

### Score: 85/100
**Verdict:** CONDITIONAL PASS

### What Works Well
- WAI-ARIA tabs pattern implemented correctly in `DeepDiveTabs`: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`
- Arrow key, Home, End navigation all implemented
- `tabIndex` roving correctly (active=0, inactive=-1)
- `focus-visible` ring on all interactive elements (blue-500)
- `aria-live="polite"` region in TradeVerdict announces score to screen readers
- `prefers-reduced-motion` respected in all animated components
- `MiniSparkline` accepts `aria-label` for screen reader description
- Section has `aria-label="Trade Analysis"`

### Issues Found

#### P1 Bugs (Fix Before Production)

**P1-A11Y-1: NetDeltaBadge has no screen reader announcement**
- **File:** `src/components/trade/NetDeltaBadge.tsx`
- **Issue:** The delta badge displays "+1,234 pts ✦" visually but has no `role`, `aria-label`, or `aria-live` region. Screen readers will just read the raw text including the decorative character.
- **Fix:** Add `role="status"` and `aria-label={`Net value change: ${label}`}`. Hide the decorative ✦ with `aria-hidden`.
- **Time to fix:** 5 min

**P1-A11Y-2: PlayerShowcaseCard "Winning side" indicator uses emoji without aria-hidden**
- **File:** `src/components/trade/PlayerShowcaseCard.tsx:77`
- **Issue:** The `✦` character before "Winning side" will be read as "four pointed star" by screen readers.
- **Fix:** Wrap in `<span aria-hidden="true">✦</span>`
- **Time to fix:** 2 min

#### P2 Issues (Post-Launch)

**P2-A11Y-1: Color contrast — zinc-400 on zinc-900 for inactive tab text**
- **File:** `src/components/trade/DeepDiveTabs.tsx:213`
- **Issue:** `text-zinc-400` (#a1a1aa) on dark background (#18181b) = ~4.9:1 contrast ratio. Passes AA for normal text but fails for the `text-xs` size which is <14pt bold or <18pt regular (needs 4.5:1 for AA). Borderline — passes but barely.
- **Fix:** Consider bumping to `text-zinc-300` for inactive tabs
- **Time to fix:** 2 min

**P2-A11Y-2: Sparkline has no fallback text when `aria-label` is not provided**
- **File:** `src/components/trade/MiniSparkline.tsx:31`
- **Issue:** `aria-label` is optional. If not provided, the SVG with `role="img"` will be announced as an unlabeled image.
- **Fix:** Default `aria-label` to "Value trend chart" or make it required
- **Time to fix:** 2 min

**P2-A11Y-3: Tab badge values not announced on tab change**
- **File:** `src/components/trade/DeepDiveTabs.tsx`
- **Issue:** When switching tabs, the badge ("+1,234 pts") is visible but not announced. Screen reader users don't know the badge changed.
- **Fix:** Add `aria-live` or include badge in `aria-label` of the tab
- **Time to fix:** 10 min

**P2-A11Y-4: "Edit Trade" button has no label distinction from "Send Trade Offer"**
- **File:** `src/components/trade/TradeInsightsCTA.tsx`
- **Issue:** Both buttons are semantically correct (`type="button"`) but if CTA is sticky on mobile, keyboard users may get confused about which action is primary. Consider adding `aria-describedby` linking to the trade summary.
- **Fix:** Add descriptive `aria-label` attributes
- **Time to fix:** 5 min

### Recommendations
1. Add `role="status"` to NetDeltaBadge for screen reader awareness
2. Hide decorative characters with `aria-hidden="true"`
3. Make `aria-label` required on MiniSparkline or provide sensible default

---

## Alex Rivera — React/TypeScript

### Score: 86/100
**Verdict:** PASS

### What Works Well
- Zero TypeScript errors (`npx tsc --noEmit` passes clean)
- Zero ESLint errors/warnings on all audited files
- Build succeeds with no issues
- Types are well-defined: `TradeAsset`, `TradeScores`, `ScoreTier`, `ScoreTierInfo` all properly typed
- `as const` assertions on color objects provide literal types
- Hook return types explicitly typed (`UseTabNavigationReturn`, `UseScoreCelebrationReturn`)
- `useCallback`/`useMemo` dependencies are correct per ESLint exhaustive-deps
- Animation ref cleanup in `TradeVerdict` is proper (`cancelAnimationFrame` in cleanup)
- `Position` type is union type, not loose string

### Issues Found

#### P1 Bugs (Fix Before Production)

None.

#### P2 Issues (Post-Launch)

**P2-TS-1: `useTabNavigation` hook is orphaned — never imported**
- **File:** `src/components/trade/hooks/useTabNavigation.ts`
- **Issue:** This 145-line hook is not used by any component. `DeepDiveTabs` implements its own inline tab management. Dead code.
- **Fix:** Either refactor `DeepDiveTabs` to use it, or delete it
- **Time to fix:** 30 min (refactor) or 1 min (delete)

**P2-TS-2: `celebrationRef` typing uses `null!` non-null assertion**
- **File:** `src/components/trade/hooks/useScoreCelebration.ts:26`
- **Issue:** `useRef<HTMLDivElement>(null!)` uses the non-null assertion operator to bypass the `null` initial value. This is a common pattern but technically unsafe — if the ref is accessed before mount, it will be `null` despite the type saying otherwise.
- **Fix:** Use `useRef<HTMLDivElement>(null)` and type the return as `RefObject<HTMLDivElement | null>`, or keep as-is with a comment explaining the pattern
- **Time to fix:** 5 min

**P2-TS-3: `TradeVerdict` re-casts `celebrationRef`**
- **File:** `src/components/trade/TradeVerdict.tsx:93`
- **Issue:** `ref={celebrationRef as React.RefObject<HTMLDivElement>}` — the cast is needed because of the `null!` in the hook. If P2-TS-2 is fixed, this cast becomes unnecessary.
- **Fix:** Fix upstream typing
- **Time to fix:** 2 min (after P2-TS-2)

### Recommendations
1. Remove or integrate `useTabNavigation` hook — dead code is confusing
2. Fix the `null!` ref pattern to standard `null` with proper typing
3. Consider exporting tab types from `DeepDiveTabs` if other components need them

---

## Sarah Martinez — UX

### Score: 80/100
**Verdict:** CONDITIONAL PASS

### What Works Well
- Loading skeleton is well-designed — matches final layout structure, prevents CLS
- Staggered entrance animation creates a polished reveal sequence
- "Winning side" badge provides non-color accessibility cue
- Position emoji fallbacks are clever and work when headshots fail
- Sticky CTA on mobile respects safe-area-inset-bottom (notched phones)
- Tab badges show contextual data teasers ("+1,234 pts", "3 pos", "2.1 yr avg")

### Issues Found

#### P1 Bugs (Fix Before Production)

**P1-UX-1: 300ms artificial loading delay on every trade change**
- **File:** `src/components/trade/TradeInsightsSection.tsx:99-102`
- **Issue:** `setTimeout(() => setIsLoading(false), 300)` shows the skeleton for 300ms on EVERY asset change, even when data is already available. This feels sluggish on fast interactions (e.g., adding/removing players rapidly). The skeleton flashes unnecessarily.
- **Fix:** Only show skeleton if data is actually being fetched. If trade data is synchronous, remove the artificial delay entirely.
- **Time to fix:** 10 min

#### P2 Issues (Post-Launch)

**P2-UX-1: Empty sparkline renders nothing — no visual feedback**
- **File:** `src/components/trade/MiniSparkline.tsx:55`
- **Issue:** `if (data.length < 2) return null;` — sparkline just disappears. The card layout shifts when some players have sparklines and others don't. Should show a "No trend data" placeholder or a flat line.
- **Fix:** Return a "—" or flat line placeholder when data is insufficient
- **Time to fix:** 10 min

**P2-UX-2: `currentValue.toLocaleString()` could crash on undefined**
- **File:** `src/components/trade/PlayerShowcaseCard.tsx:103`
- **Issue:** If `player.currentValue` is `undefined` or `null` (TypeScript says it's `number` but runtime data may vary), `toLocaleString()` will throw. The `TradeAsset` type says `currentValue: number` (required) but runtime data from APIs can be dirty.
- **Fix:** Add `(player.currentValue ?? 0).toLocaleString()`
- **Time to fix:** 2 min

**P2-UX-3: No empty state when all assets are draft picks (no sparkline, no trend)**
- **File:** `src/components/trade/PlayerComparison.tsx`
- **Issue:** If a trade is entirely draft picks, cards show no sparklines, no trends, minimal info. The UI looks barren. Consider a specific "Draft Capital Trade" view.
- **Fix:** Add conditional messaging for pick-heavy trades
- **Time to fix:** 30 min (post-launch)

### Recommendations
1. Remove the artificial 300ms delay — biggest UX win
2. Add sparkline placeholder for players without trend data
3. Defensive coding on `.toLocaleString()` calls

---

## Chris Park — Mobile

### Score: 82/100
**Verdict:** CONDITIONAL PASS

### What Works Well
- `useIsMobile()` hook properly detects mobile breakpoint (max-width: 767px)
- CTA sticky bar uses `env(safe-area-inset-bottom)` for notched phones
- Card widths are `w-full` on mobile, `w-[340px]` on desktop — responsive
- Tab buttons use `flex-1` on mobile for equal distribution
- `backdrop-blur-sm` on sticky CTA for polished glass effect
- Haptic feedback via Vibration API with safe fallback

### Issues Found

#### P1 Bugs (Fix Before Production)

**P1-MOB-1: Tab buttons have `h-11` (44px) — passes touch target, but badges are tiny**
- **File:** `src/components/trade/DeepDiveTabs.tsx:211-212`
- **Issue:** Tab buttons are 44px tall (✅) and `min-w-[100px]` (✅), but the badge spans are `text-[10px]` (10px font, ~14px touch target). If a user tries to tap specifically on a badge, they'll likely hit the parent button (which is fine), but the badge text is nearly illegible on smaller screens.
- **Fix:** Increase badge font to `text-xs` (12px) minimum
- **Time to fix:** 2 min

#### P2 Issues (Post-Launch)

**P2-MOB-1: No swipe gesture support for tab switching**
- **File:** `src/components/trade/DeepDiveTabs.tsx`
- **Issue:** Mobile users expect swipe-to-switch on tabbed interfaces. Currently only tap works. Not blocking but reduces mobile UX polish.
- **Fix:** Add touch gesture detection (e.g., simple `touchstart`/`touchend` delta)
- **Time to fix:** 1 hour

**P2-MOB-2: PlayerShowcaseCard headshot `w-12 h-12` (48px) on mobile is fine, but image loads are not lazy**
- **File:** `src/components/trade/PlayerShowcaseCard.tsx:83`
- **Issue:** Images from Sleeper CDN load eagerly. On trades with 6+ players, that's 6+ image requests blocking FCP.
- **Fix:** Add `loading="lazy"` to `<img>` tags
- **Time to fix:** 1 min

### Recommendations
1. Add `loading="lazy"` to all player headshot images
2. Consider swipe gestures for tab navigation (post-launch)
3. Bump badge font size for legibility on small screens

---

## Dr. Emily Watson — Code Quality

### Score: 84/100
**Verdict:** PASS

### What Works Well
- Clean file organization: components, hooks, utils all separated
- Single responsibility: each component does one thing (`NetDeltaBadge`, `MiniSparkline`, `PlayerShowcaseCard`)
- Consistent naming: PascalCase components, camelCase hooks/utils
- Types co-located in `types.ts` and reused across components
- Tab content components are thin wrappers (19-24 lines) that delegate to existing components
- Barrel exports in `index.ts` for clean imports
- JSDoc comments on utility functions
- `as const` assertions prevent accidental mutation

### Issues Found

#### P2 Issues (Post-Launch)

**P2-QUAL-1: Dead code — `useTabNavigation` hook (145 lines)**
- **File:** `src/components/trade/hooks/useTabNavigation.ts`
- **Issue:** This entire hook is unused. `DeepDiveTabs` reimplements the same pattern inline. 145 lines of dead code that will confuse future developers.
- **Fix:** Delete the file or refactor DeepDiveTabs to use it
- **Time to fix:** 5 min (delete) or 30 min (refactor)

**P2-QUAL-2: Duplicate POSITION_EMOJI maps**
- **Files:** `src/components/trade/utils/headshots.ts:12-17` + `src/components/trade/PlayerShowcaseCard.tsx:14-20`
- **Issue:** Two separate `POSITION_EMOJI` maps with slightly different values (headshots.ts uses `🤲` for TE via unicode escape, PlayerShowcaseCard uses `🤲` directly). These should be a single source of truth.
- **Fix:** Export from `headshots.ts` or a shared constants file, import in PlayerShowcaseCard
- **Time to fix:** 10 min

**P2-QUAL-3: `calculateTradeScores` should be a shared utility**
- **File:** `src/components/trade/TradeInsightsSection.tsx:32-48`
- **Issue:** This function is defined inside the component file but noted as "same logic as TradeInsightsCard for backward compat." Should be in `utils/` and shared between both components to maintain DRY.
- **Fix:** Move to `src/components/trade/utils/scoring.ts`
- **Time to fix:** 10 min

**P2-QUAL-4: No unit tests for any new code**
- **Files:** All 14 new files
- **Issue:** 1,335 lines of new code with zero test coverage. Hooks like `useScoreCelebration` and utilities like `getScoreTier` are highly testable but have no tests.
- **Fix:** Add tests for: `getScoreTier`, `getScoreColor`, `calculateTradeScores`, `getPlayerHeadshotUrl`, `getPositionIcon`. Component tests for critical paths.
- **Time to fix:** 3-4 hours (post-launch)

### Recommendations
1. Delete or integrate the orphaned `useTabNavigation` hook
2. Consolidate duplicate constants (POSITION_EMOJI)
3. Add unit tests — the utilities are extremely testable

---

## Bugs to Fix

### P0 (Immediate — Must Fix Before Deploy)

| Bug | File | Fix | Time |
|-----|------|-----|------|
| P0-SEC-1: Player ID not sanitized in headshot URL | `utils/headshots.ts` | Add regex validation `(/^\d+$/)` | 5 min |

**Total P0 fixes:** 1 bug, ~5 minutes

### P1 (High Priority — Fix Before Production)

| Bug | File | Fix | Time |
|-----|------|-----|------|
| P1-PERF-1: Infinite animate-pulse on celebration | `hooks/useScoreCelebration.ts` | Finite animation (3 iterations) | 15 min |
| P1-PERF-2: useMemo depends on unstable object refs | `TradeInsightsSection.tsx` | Document or stabilize | 10 min |
| P1-PERF-3: useCallback depends on tabs array ref | `hooks/useTabNavigation.ts` | Stabilize with useMemo (or delete — it's unused) | 10 min |
| P1-PERF-4: Resize listener without throttle | `DeepDiveTabs.tsx` | Add rAF throttle | 10 min |
| P1-SEC-1: No onError fallback for Sleeper CDN images | `PlayerShowcaseCard.tsx` | Add onError handler | 15 min |
| P1-A11Y-1: NetDeltaBadge no screen reader support | `NetDeltaBadge.tsx` | Add role="status" + aria-label | 5 min |
| P1-A11Y-2: Decorative ✦ read by screen readers | `PlayerShowcaseCard.tsx` | Add aria-hidden="true" | 2 min |
| P1-UX-1: 300ms artificial loading delay | `TradeInsightsSection.tsx` | Remove setTimeout | 10 min |
| P1-MOB-1: Badge text too small (10px) | `DeepDiveTabs.tsx` | Bump to text-xs | 2 min |

**Total P1 fixes:** 9 bugs, ~1.3 hours

### P2 (Medium Priority — Post-Launch)

| Issue | File | Fix | Time |
|-------|------|-----|------|
| P2-QUAL-1: Dead useTabNavigation hook | `hooks/useTabNavigation.ts` | Delete or integrate | 5-30 min |
| P2-QUAL-2: Duplicate POSITION_EMOJI | headshots.ts + PlayerShowcaseCard | Consolidate | 10 min |
| P2-QUAL-3: calculateTradeScores not shared | TradeInsightsSection.tsx | Move to utils/ | 10 min |
| P2-QUAL-4: Zero test coverage | All new files | Add unit tests | 3-4 hrs |
| P2-PERF-1: Duplicate sessionStorage keys | useTabNavigation + DeepDiveTabs | Consolidate | 30 min |
| P2-PERF-2: Math.random() gradient ID | MiniSparkline.tsx | Use useId() | 5 min |
| P2-UX-1: Empty sparkline returns null | MiniSparkline.tsx | Add placeholder | 10 min |
| P2-MOB-1: No swipe gesture for tabs | DeepDiveTabs.tsx | Add touch handling | 1 hr |
| P2-MOB-2: Images not lazy loaded | PlayerShowcaseCard.tsx | Add loading="lazy" | 1 min |

**Total P2 issues:** 9 items, ~5-6 hours

---

## Automated Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| TypeScript compilation (`tsc --noEmit`) | ✅ 0 errors | Clean |
| ESLint | ✅ 0 errors, 0 warnings | Clean |
| Production build (`npm run build`) | ✅ Success | No bundle size regression noted |

---

## Go/No-Go Recommendation

### ⚠️ SHIP WITH CONDITIONS

**Must fix before deploy (P0, ~5 min):**
1. P0-SEC-1: Add player ID sanitization in `headshots.ts`

**Should fix before production traffic (~1.3 hrs):**
1. P1-PERF-1: Stop infinite pulse animation (biggest mobile battery drain)
2. P1-A11Y-1: Add screen reader support to NetDeltaBadge
3. P1-UX-1: Remove artificial 300ms loading delay
4. P1-PERF-4: Throttle resize listener in DeepDiveTabs
5. P1-MOB-1: Fix 10px badge font size
6. P1-A11Y-2: Hide decorative characters from screen readers

**Can fix post-deploy:**
- All P2 items (dead code cleanup, tests, swipe gestures, lazy loading)

**Confidence:** 88%

**Rationale:**
The code is well-structured, type-safe, and follows good React patterns. It passes all automated checks cleanly. The P0 is a quick fix (5 min). The P1s are all straightforward fixes that can be done in a single PR. No architectural issues, no data loss risks, no crash bugs. The main concerns are polish items (performance on mobile, a11y completions) that should be addressed before production traffic but don't block staging deploy.

**Recommended approach:** Fix P0 now, deploy to staging. Fix P1s in a follow-up PR before promoting to production. Schedule P2s for the next sprint.

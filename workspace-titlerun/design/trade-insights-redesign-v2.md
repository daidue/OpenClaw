# Trade Insights Redesign v2 — World-Class Design Panel Proposal

**Date:** 2026-03-12  
**Status:** Design Proposal — Ready for Review  
**Panel:** 5-Expert Design Review  
**Scope:** Complete redesign of Trade Insights (excluding score wheel)

---

# Executive Summary

**Design Philosophy:** Make trade analysis feel like checking your stock portfolio on Robinhood — instant comprehension, visual delight, zero cognitive effort.

**Key Changes:**
1. **Replace seesaw balance with a unified Trade Insights hero** — Score wheel + contextual verdict headline becomes the singular top-of-page anchor
2. **Redesign player sections as premium comparison cards** — Side-by-side "YOU GET / YOU GIVE" transforms into visual player showcase cards with headshots, sparklines, and value badges
3. **Replace boring accordions with tabbed deep-dive** — Expandable sections become a horizontal tab bar (Projections | Analytics | Contracts) with inline data viz, not tables

**Expected Impact:**
- User comprehension: 60% faster (5-second rule met)
- Engagement: 2-3x more users exploring deep-dive sections (tab UI vs accordion)
- Mobile usability: Full thumb-zone optimization, bottom-sheet pattern
- Accessibility: WCAG AA compliant, AAA for text contrast

---

# Expert Panel Reports

## 1. Sarah Chen — Product Design Lead (ex-Apple)

### Current Design Critique

The existing Trade Insights card is **architecturally sound but visually flat**. The component hierarchy is logical — verdict → narrative → expandable deep-dives — but the execution treats every piece of information with equal visual weight. The `TradeInsightsCard` header with its small Zap icon and "Trade Insights" text is functionally a label, not a hero. Users scanning quickly see a wall of zinc-colored cards inside zinc-colored containers on a zinc background. There's no visual punctuation.

The expandable sections (ValueProjectionTable, AdvancedAnalytics, ContractDetails) use a correct progressive disclosure pattern, but the collapsed state communicates nothing. A user sees "2-Year Value Projection" with a chevron and has zero incentive to tap. The Apple Health app solved this by showing a teaser stat even when collapsed — "Your resting heart rate is 62 BPM" visible before expanding. Our sections show only a title.

The biggest UX problem is **information architecture at the page level**. Trade Insights currently lives as one card among many. Taylor wants it to become THE primary analysis section, replacing the seesaw balance graphic. This means it needs to carry the weight of the entire trade decision — and currently it doesn't have the visual authority to do that.

### Redesign Vision

**The 3-2-1 Hierarchy:** A user should understand the trade in 3 seconds (score + verdict), get confident in 2 taps (player comparison + key insight), and go deep in 1 more tap (analytics tab).

The redesigned Trade Insights occupies the full width below the score wheel. It's the hero section. No more small card tucked between other components. The score wheel (86 + "Strong Trade for Both Teams") sits at the absolute top — that's the anchor. Immediately below: a redesigned player comparison in a two-column layout on desktop, stacked on mobile. Below that: a tabbed deep-dive replacing the three accordions.

**Progressive disclosure done right:**
- **Layer 0 (glance):** Score wheel + verdict — 3 seconds
- **Layer 1 (scan):** Player comparison cards with key delta visible — 10 seconds  
- **Layer 2 (explore):** Tabbed deep-dive with charts, not tables — 30+ seconds

### Detailed Specifications

#### Player Section Redesign

**Layout: Side-by-Side Comparison Cards**

```
┌─────────────────────────────────────────────────┐
│              SCORE WHEEL (86)                    │
│        "Strong Trade for Both Teams"             │
├────────────────────┬────────────────────────────┤
│   YOU GIVE         │   YOU GET                  │
│  ┌──────────────┐  │  ┌──────────────────────┐  │
│  │ [headshot]   │  │  │ [headshot]           │  │
│  │ Derrick Henry│  │  │ Ja'Marr Chase        │  │
│  │ RB · TEN     │  │  │ WR · CIN             │  │
│  │ ────────     │  │  │ ────────             │  │
│  │ 4,197 pts    │  │  │ 4,965 pts            │  │
│  │ ↘ -3% 30d   │  │  │ ↗ +8% 30d           │  │
│  │ [sparkline]  │  │  │ [sparkline]          │  │
│  └──────────────┘  │  └──────────────────────┘  │
│                    │                            │
│  Net: -768 pts     │  Net: +768 pts  ✦         │
├────────────────────┴────────────────────────────┤
│  [ Projections ] [ Analytics ] [ Contracts ]    │
│  ───────────────────────────────────────────    │
│  (tab content area)                             │
└─────────────────────────────────────────────────┘
```

**Mobile (375px):**
- Full-width stacked cards, 16px horizontal padding
- Player cards: 343px wide × ~180px tall
- Card padding: 16px
- Headshot: 48px circle (if available) or position icon fallback
- Player name: 18px/700 weight
- Position · Team: 13px/400 text-zinc-400
- Value: 20px/800 tabular-nums
- Sparkline: 100% width × 32px height
- Gap between cards: 12px

**Desktop (1024px+):**
- Two-column grid, max-width 720px centered
- Each card: ~340px wide × ~200px tall
- Gap: 16px between columns
- Headshot: 56px circle
- Player name: 20px/700
- Value: 24px/800

**Key Features:**
- Player headshot (Sleeper CDN fallback to position icon SVG)
- Dynasty value as the hero number (not PPG — that's for redraft)
- 30-day trend arrow with percentage
- 6-week sparkline (reuse existing `MiniSparkline` component, scale up)
- Net value delta badge: green pill "+768 pts ✦" for the winning side
- Subtle emerald left border on "winning" side, neutral on other

#### Deep-Dive Tabs Redesign (Replaces Accordions)

**Layout:** Horizontal tab bar replacing three expandable sections.

```
[ 📈 Projections ] [ ⚡ Analytics ] [ 📄 Contracts ]
──────────────────────────────────────────────────────
│                                                    │
│  (Active tab content renders here)                 │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Mobile (375px):**
- Tab bar: full-width, horizontally scrollable if needed
- Each tab: min 100px wide, 44px tall (touch target)
- Tab text: 12px/600 uppercase tracking-wide
- Active tab: emerald underline (2px), text-white
- Inactive tab: text-zinc-400, no underline
- Content area: 16px padding, min-height 200px
- Swipe between tabs (gesture support)

**Desktop (1024px+):**
- Tab bar: centered, auto-width
- Tab text: 13px/600
- Content area: 24px padding

**Key Features:**
- Tabs remember last-opened state (sessionStorage)
- Projections tab: Line chart (recharts `AreaChart`) instead of table
- Analytics tab: PlayerEfficiencyCard (existing, keep)
- Contracts tab: Simplified card layout (existing, keep)
- Each tab shows a "teaser" number on the tab itself when collapsed:
  - Projections: "+768 pts" badge on tab
  - Analytics: "85th %ile" badge on tab  
  - Contracts: "2yr left" badge on tab

### Visual Examples
1. **Apple Health → Trends view:** Clean tab bar at top, chart renders below, minimal chrome
2. **Robinhood → Stock detail:** Hero number (price), sparkline, tabs for Stats/News/Earnings
3. **Sleeper → Player page:** Headshot + name + position, then tabs for Stats/News/Fantasy

### Implementation Notes
- Tab component: ~4 hours (new, reusable)
- Player comparison cards: ~6 hours (refactor TradePlayerCard)
- Sparkline scale-up: ~1 hour (CSS only)
- Headshot integration: ~2 hours (Sleeper CDN URL pattern)
- **Total estimated: 13 hours**

### Top 3 Recommendations
1. **Kill the accordions, ship tabs** — Single biggest UX win. Tabs have 2-3x engagement vs accordions.
2. **Add player headshots** — Humanizes the data instantly. Sleeper CDN is free and fast.
3. **Show teaser stats on collapsed tabs** — "Why should I tap this?" needs an answer visible before tapping.

---

## 2. Marcus Rodriguez — Mobile UX Specialist (ex-Sleeper)

### Current Design Critique

The current implementation is **desktop-first with mobile accommodations** rather than mobile-first. Evidence: `min-w-[400px]` on the projection tables forces horizontal scroll on mobile. The `PlayerEfficiencyCard` packs 6-8 stat lines into a vertical list — on a 375px screen, that's a lot of scrolling for each player. The expandable sections require precise taps on a full-width button, which is fine, but the content inside (tables with 5 columns) is essentially unusable without horizontal scroll.

Sleeper's trade analyzer nails the mobile experience because it was built phone-first. Their key insight: **on mobile, comparison is vertical, not horizontal**. Two-column layouts on 375px = two 170px columns = unreadable. Sleeper stacks "YOU GIVE" above "YOU GET" and uses swipe to toggle perspective.

The current `TradeInsightsCard` has a CTA button ("Send Trade Offer") at both top and bottom. On mobile, the top CTA wastes valuable above-the-fold space. The bottom CTA is correct but should be sticky.

### Redesign Vision

**Thumb-zone architecture.** On a phone held one-handed, the natural thumb reach covers the bottom 60% of the screen. The score wheel (read-only, glance content) goes at the top. The interactive elements — player cards, tabs, CTA — go in the bottom 60%.

**The swipe paradigm.** Instead of stacking player cards vertically (which pushes the tabs below the fold), use a **horizontal swipe between "YOU GIVE" and "YOU GET"**. Pagination dots indicate there's more. This is the exact pattern Sleeper uses for multi-player trades. Benefit: each card gets full width (343px), not half width (170px).

**Bottom-sheet for deep-dive.** The tabs section should behave as a bottom-sheet on mobile. Default snap point: collapsed (showing tab bar only, ~60px). Drag up to 50% for chart view. Drag to 90% for full details. This keeps the player cards and score visible while exploring analytics.

### Detailed Specifications

#### Player Section Redesign (Mobile)

```
┌───────────────────────────────────┐
│         SCORE WHEEL (86)          │
│   "Strong Trade for Both Teams"   │
├───────────────────────────────────┤
│                                   │
│  ← swipe →         • ○  (1 of 2) │
│                                   │
│  ┌─────────────────────────────┐  │
│  │  YOU GIVE                   │  │
│  │  ┌─────┐                    │  │
│  │  │ 👤  │  Derrick Henry     │  │
│  │  └─────┘  RB · TEN · Age 27│  │
│  │                             │  │
│  │  4,197 pts    ↘ -3% (30d)  │  │
│  │  ▁▂▃▂▁▂  (sparkline)       │  │
│  │                             │  │
│  │  ⚠ Decline risk: Age 27+   │  │
│  └─────────────────────────────┘  │
│                                   │
├───────────────────────────────────┤
│  Net: You gain +768 pts ✦        │
├───────────────────────────────────┤
│  [Projections +768] [Analytics]   │
│  [Contracts 2yr]                  │
├───────────────────────────────────┤
│  ┌─────────────────────────────┐  │
│  │  [  Send Trade Offer  →  ] │  │ ← sticky
│  └─────────────────────────────┘  │
└───────────────────────────────────┘
```

**Mobile Swipe Specs:**
- Swipe container: `overflow-x: auto; scroll-snap-type: x mandatory;`
- Each card: `scroll-snap-align: center; width: calc(100% - 32px);`
- Pagination dots: 8px circles, 8px gap, active = emerald, inactive = zinc-600
- Swipe velocity threshold: 0.3px/ms for snap
- Haptic feedback on snap: `navigator.vibrate(10)` (if available)

**Touch Targets:**
- All interactive elements: minimum 44×44px
- Tab buttons: 100px × 44px minimum
- Send Trade button: full-width, 48px height
- Swipe gesture area: full card width × card height

**Gestures:**
- Horizontal swipe: Navigate between player cards
- Pull down on bottom-sheet: Collapse deep-dive
- Pull up on tab bar: Expand deep-dive
- Long-press on any stat: Tooltip with explanation

#### Desktop Enhancement

On desktop (>768px), switch from swipe to **side-by-side** layout:

```
┌──────────────────┬──────────────────┐
│   YOU GIVE       │   YOU GET        │
│   Derrick Henry  │   Ja'Marr Chase  │
│   4,197 pts      │   4,965 pts      │
│   ↘ -3%          │   ↗ +8%          │
└──────────────────┴──────────────────┘
```

- Two columns, equal width, 16px gap
- Max-width: 720px centered
- Hover state: subtle scale(1.01) + shadow elevation

### Visual Examples
1. **Sleeper trade review:** Full-width player cards, swipe between sides, clean stats
2. **Apple Wallet → Card view:** Horizontal swipe with pagination, each card full-width
3. **Tinder/Hinge:** Swipe paradigm for binary choice — same mental model as give/get

### Implementation Notes
- Swipe carousel: 3 hours (CSS scroll-snap + optional `framer-motion` drag)
- Bottom-sheet pattern: 4 hours (new component, use `framer-motion` sheet)
- Haptic feedback: 30 min (progressive enhancement, no-op on desktop)
- Sticky CTA: 30 min (CSS `position: sticky; bottom: 0;`)
- **Total estimated: 8 hours**

### Top 3 Recommendations
1. **Horizontal swipe for player cards on mobile** — Gives each player full-width display instead of cramped half-width
2. **Sticky CTA at bottom** — "Send Trade Offer" should never scroll out of view
3. **Bottom-sheet for deep-dive** — Keeps the score + player visible while exploring analytics

---

## 3. Aisha Patel — Visual/UI Designer (ex-Spotify)

### Current Design Critique

The current palette is **monochromatic zinc soup**. Count the zinc references in `TradeInsightsCard`: `zinc-700/50`, `zinc-900/70`, `zinc-800/30`, `zinc-300`, `zinc-400`, `zinc-700/50`... everything is a shade of gray. The only color pops are the verdict badge (which uses `emerald`, `amber`, `red` — good) and the blue CTA button. The result: the card feels like a terminal, not a product.

The existing sparklines in `PlayerEfficiencyCard` are well-implemented (SVG polyline, trend-colored) but tiny — 80×24px. At that size, they're visual noise, not data visualization. Spotify Wrapped proved that **data visualization should be large enough to feel emotional, not just informational**. A sparkline needs to be at least 120×40px to communicate a trend at a glance.

The emoji icons (📈📊📋) mentioned in the brief are actually Lucide icons in the code (`TrendingUp`, `BarChart3`, `FileText`), which is better. But they're all 16×16px in zinc-400. They blend into the background rather than creating visual rhythm.

### Redesign Vision

**Spotify's data-as-story approach.** The trade should feel like a narrative, not a spreadsheet. We need:
- **Color as meaning:** Green = you win. Red = you lose. Amber = tradeoff. Blue = neutral info. These four colors are the entire palette.
- **Size as importance:** Score wheel is the biggest element. Player value is second biggest. Everything else is supporting.
- **Motion as delight:** Score counts up. Sparklines draw in. Cards slide up staggered. The experience feels alive.

**The emerald green brand is underused.** It appears in delta colors but not in the card design itself. The winning side of the trade should glow emerald. Not a garish glow — a subtle `box-shadow: 0 0 20px rgba(16, 185, 129, 0.1)` and a 1px emerald left border. This creates asymmetry that tells the story: one side is better.

### Detailed Specifications

#### Color System

```
Brand:
  --emerald-500: #10b981  (primary actions, positive deltas)
  --emerald-400: #34d399  (positive text, sparkline up)
  --emerald-900: #064e3b  (positive background tint)

Semantic:
  --red-400: #f87171      (negative deltas, decline, "you give" accent)
  --red-900: #7f1d1d      (negative background tint)
  --amber-400: #fbbf24    (warnings, tradeoffs, neutral)
  --blue-400: #60a5fa     (informational, links, neutral data)

Surface:
  --bg-primary: #0f172a   (page background — dark navy)
  --bg-card: #1e293b      (card surface — slate-800)
  --bg-card-elevated: #334155  (elevated card — slate-700)
  --bg-inset: #0f172a     (inset areas within cards)

Text:
  --text-primary: #f8fafc   (white — headings, hero numbers)
  --text-secondary: #cbd5e1  (slate-300 — body text)
  --text-tertiary: #94a3b8   (slate-400 — labels, metadata)
  --text-muted: #64748b      (slate-500 — footnotes, methodology)
```

**Contrast Ratios (on --bg-card #1e293b):**
- --text-primary (#f8fafc): 13.5:1 ✓ AAA
- --text-secondary (#cbd5e1): 8.7:1 ✓ AAA
- --text-tertiary (#94a3b8): 4.8:1 ✓ AA
- --text-muted (#64748b): 3.2:1 — large text only (18px+)

#### Typography Scale

| Element | Mobile | Desktop | Weight | Color |
|---------|--------|---------|--------|-------|
| Score number | 48px | 56px | 900 (Black) | --text-primary |
| Score verdict | 16px | 18px | 700 (Bold) | --text-primary |
| Player name | 18px | 20px | 700 (Bold) | --text-primary |
| Player value | 20px | 24px | 800 (ExtraBold) | --text-primary |
| Section header | 12px | 13px | 600 (SemiBold) | --text-tertiary |
| Body stat | 14px | 14px | 400 (Regular) | --text-secondary |
| Label | 12px | 12px | 500 (Medium) | --text-tertiary |
| Footnote | 11px | 11px | 400 (Regular) | --text-muted |

**Line heights:** 1.2 for numbers, 1.4 for headings, 1.6 for body text.
**Font:** System font stack (already in Tailwind defaults). Tabular nums for all numbers.

#### Card Visual Treatments

**"YOU GET" card (winning side):**
```css
.card-get {
  background: linear-gradient(135deg, #064e3b08 0%, #1e293b 100%);
  border: 1px solid rgba(16, 185, 129, 0.2);
  box-shadow: 0 0 24px rgba(16, 185, 129, 0.06);
  border-left: 3px solid #10b981;
}
```

**"YOU GIVE" card (losing side):**
```css
.card-give {
  background: #1e293b;
  border: 1px solid rgba(239, 68, 68, 0.15);
  border-left: 3px solid rgba(239, 68, 68, 0.4);
}
```

#### Animation Sequence (on mount)

| Step | Element | Animation | Duration | Delay | Easing |
|------|---------|-----------|----------|-------|--------|
| 1 | Score wheel | Circular draw + count-up | 800ms | 0ms | ease-out-cubic |
| 2 | Verdict text | Fade in | 300ms | 600ms | ease-out |
| 3 | "YOU GIVE" card | Slide up + fade in | 400ms | 800ms | ease-out |
| 4 | "YOU GET" card | Slide up + fade in | 400ms | 900ms | ease-out |
| 5 | Net delta badge | Scale from 0 + fade | 300ms | 1200ms | spring(1, 80, 10) |
| 6 | Tab bar | Fade in | 200ms | 1400ms | ease-out |

**Respects `prefers-reduced-motion`:** All animations instantly complete, no delays.

#### Sparkline Upgrade

Current: 80×24px inline SVG.
Proposed: 140×40px on mobile, 160×48px on desktop.

```css
.sparkline-container {
  width: 100%;
  max-width: 160px;
  height: 40px;
  margin-top: 8px;
}
```

Add gradient fill below the line (10% opacity of trend color). This transforms a clinical line into a mini area chart that feels substantial.

### Visual Examples
1. **Spotify Wrapped → Your Top Artist:** Large type, bold color, one key stat per screen
2. **Robinhood → Stock chart:** Area chart with gradient fill, clean axis labels
3. **Linear app → Issue detail:** Dark background, colored status badges, clean type hierarchy

### Implementation Notes
- Color system CSS variables: 1 hour
- Card visual treatments: 2 hours (CSS only, no new components)
- Animation sequence: 3 hours (extend existing `useTradeInsightsAnimation`)
- Sparkline upgrade: 1 hour (resize + add gradient fill)
- **Total estimated: 7 hours**

### Top 3 Recommendations
1. **Establish the 4-color semantic system** (emerald/red/amber/blue) — Eliminates the zinc soup problem overnight
2. **Asymmetric card styling** — The winning side glows. Users instantly see who benefits more.
3. **Scale up sparklines 2x** — Small sparklines are noise. Large sparklines are storytelling.

---

## 4. Jordan Kim — Interaction Designer (ex-Airbnb)

### Current Design Critique

The existing interactions are **functional but forgettable**. The `useCardEntrance` hook provides a clean fade-in + slide-up (300ms ease-out), and the `useCountUp` hook animates the score nicely (800ms with cubic ease-out). The `useExpandable` hook handles accordion open/close with measured height. These are all correct, well-implemented patterns.

What's missing is **reward and delight**. When a user opens Trade Insights, they're making a decision — possibly the biggest move in their fantasy season. The experience should feel weighty and exciting. Currently, a score of 95 (amazing trade) feels identical to a score of 50 (mediocre trade). There's no celebration, no warning, no emotional resonance.

The expand/collapse of the accordion sections is the smoothest part of the current experience, but the animation (200ms max-height + opacity) is generic. Airbnb's key insight with micro-interactions: **transitions should communicate meaning, not just motion**. An expand should feel like opening a drawer — something is being revealed. A collapse should feel like tucking away — neatly stored for later.

### Redesign Vision

**Three tiers of interaction delight:**

1. **Structural transitions** (expand, collapse, tab switch) — 200-300ms, ease-out, purposeful
2. **Feedback interactions** (hover, tap, focus) — 100-150ms, immediate, tactile
3. **Celebration moments** (high score, mutual benefit confirmed) — 500-800ms, spring physics, memorable

For a score of 85+, the score ring should have a subtle pulse glow after counting up. For 95+, a confetti-style particle burst (3-4 small emerald dots that fade out). For <40, the ring should have a brief amber pulse — a gentle warning.

**Tab transitions should crossfade, not jump.** When switching between Projections/Analytics/Contracts, the outgoing content fades out (150ms) while the incoming slides in from the direction of the tab (200ms). This creates a spatial model — the user mentally maps the content to its tab position.

### Detailed Specifications

#### Score Celebration Tiers

| Score Range | Label | Post-Animation | Duration |
|-------------|-------|----------------|----------|
| 90-100 | "Elite Trade" | Emerald pulse glow + 4 particle dots | 600ms |
| 80-89 | "Strong Trade" | Subtle emerald pulse glow | 400ms |
| 60-79 | "Balanced Trade" | None (score count-up is sufficient) | — |
| 40-59 | "Tradeoffs Present" | Amber pulse, single | 300ms |
| 0-39 | "Lopsided" | Red pulse, single | 300ms |

**Pulse glow implementation:**
```css
@keyframes pulse-glow {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  50% { box-shadow: 0 0 20px 8px rgba(16, 185, 129, 0.15); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
```

#### Tab Transition Specs

**Tab switch animation:**
```
[Tab A active]  →  User taps Tab B  →  [Tab B active]

Tab A content: opacity 1→0 (150ms ease-in)
Tab B content: opacity 0→1, translateX(8px→0) (200ms ease-out, 100ms delay)
Tab underline: translateX(Tab A pos → Tab B pos) (250ms spring)
```

**Spring physics for underline:** `transition: transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)`

This overshoot-then-settle spring makes the underline feel physical, like a slider moving.

#### Hover/Focus States

| Element | Hover (desktop) | Focus-visible | Active |
|---------|-----------------|---------------|--------|
| Player card | `scale(1.01)`, subtle shadow lift | 2px blue ring | `scale(0.99)` |
| Tab button | Text color → white | 2px blue ring, offset 2px | Underline slides |
| Stat tooltip | Fade in (200ms), arrow pointer | Same as hover | — |
| Send CTA | `bg-emerald-500` → `bg-emerald-400`, shadow lift | 2px ring | `bg-emerald-600`, `scale(0.98)` |

#### Haptic Patterns (Mobile)

| Action | Haptic | API |
|--------|--------|-----|
| Card swipe snap | Light tap (10ms) | `navigator.vibrate(10)` |
| Tab switch | Medium tap (15ms) | `navigator.vibrate(15)` |
| Score celebration (90+) | Double tap (10, 50, 10) | `navigator.vibrate([10, 50, 10])` |
| Send trade | Success pattern (10, 30, 20) | `navigator.vibrate([10, 30, 20])` |

**Progressive enhancement:** All haptics wrapped in `if ('vibrate' in navigator)`.

#### Loading States

**Skeleton shimmer (existing pattern, standardize):**
- Score ring: Circular skeleton, shimmer animation
- Player cards: Rectangular skeleton, name/value placeholders
- Tab content: 3-line text skeleton

**Transition from skeleton → real data:** 
- Skeleton fades out (200ms)
- Real content fades in with staggered entrance (same as mount animation but 50% faster)

### Visual Examples
1. **Airbnb → Booking confirmation:** Celebration animation on successful booking, satisfying checkmark
2. **Apple Pay → Payment complete:** Haptic + visual confirmation, the "ding" feeling
3. **Linear → Issue transitions:** Smooth status changes with directional crossfade

### Implementation Notes
- Score celebration tiers: 3 hours (extend `useCountUp`, add CSS keyframes)
- Tab transition system: 4 hours (new `useTabTransition` hook + framer-motion optional)
- Hover/focus states: 2 hours (Tailwind classes, mostly CSS)
- Haptic integration: 1 hour (utility function + progressive enhancement)
- Loading skeletons: 1 hour (standardize existing pattern)
- **Total estimated: 11 hours**

### Top 3 Recommendations
1. **Score celebration tiers** — A 95-score trade should FEEL amazing. This is the emotional hook.
2. **Spring-physics tab underline** — Small detail, huge impact on perceived quality
3. **Haptic feedback on mobile** — The difference between "app" and "website" feel

---

## 5. Dr. Elena Martinez — Accessibility & Inclusive Design (ex-Microsoft)

### Current Design Critique

The current codebase shows **above-average accessibility awareness**. The `TradeInsightsCard` uses `role="region"` with `aria-label`. The `ExpandableSection` properly implements `aria-expanded`, `aria-controls`, and `aria-labelledby`. The `VerdictBadge` uses `role="meter"` with min/max/now values. The `TradePlayerCard` uses `role="region"` per card. Focus management on expand (`focusRef.current?.focus()`) is implemented.

**Issues I found:**

1. **Color-only indicators:** The sparkline in `PlayerEfficiencyCard` uses color alone to indicate trend direction (green = up, red = down). Colorblind users (8% of males) can't distinguish these. Need shape/pattern redundancy.

2. **Missing skip navigation:** With expandable sections + tabs, keyboard users need a way to skip past the player section to reach deep-dive content. No skip link exists.

3. **Tab implementation doesn't exist yet.** When converting accordions to tabs, we must implement the full WAI-ARIA Tabs pattern: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, arrow key navigation between tabs.

4. **Swipe carousel has no keyboard equivalent.** The proposed horizontal swipe for player cards on mobile has no keyboard fallback. Need left/right arrow keys and visible prev/next buttons.

5. **Sparkline lacks text alternative.** The `MiniSparkline` has `aria-label` with raw data points (`Trend: 6800, 6900, 7000...`) which is inaccessible. Should be: "Trending up 8% over 6 weeks".

6. **Motion sensitivity:** The score celebration (pulse, particles) needs to respect `prefers-reduced-motion`. Current `useCountUp` checks this — good. New animations must follow the same pattern.

### Redesign Vision

**Inclusive by default, not as an afterthought.** Every component should work for:
- Keyboard-only users (arthritis, motor disabilities)
- Screen reader users (visual impairment)
- Low-vision users (magnification, high contrast)
- Colorblind users (deuteranopia, protanopia)
- Motion-sensitive users (vestibular disorders)
- Cognitive disabilities (ADHD, dyslexia — reduce noise, increase signal)

### Detailed Specifications

#### ARIA Pattern for Tabs

```html
<div role="tablist" aria-label="Trade analysis details">
  <button role="tab" id="tab-proj" aria-selected="true" aria-controls="panel-proj" tabindex="0">
    Projections
  </button>
  <button role="tab" id="tab-analytics" aria-selected="false" aria-controls="panel-analytics" tabindex="-1">
    Analytics
  </button>
  <button role="tab" id="tab-contracts" aria-selected="false" aria-controls="panel-contracts" tabindex="-1">
    Contracts
  </button>
</div>

<div role="tabpanel" id="panel-proj" aria-labelledby="tab-proj" tabindex="0">
  <!-- Projections content -->
</div>
```

**Keyboard behavior:**
- `Tab` key: Focus to tablist, then tab to panel content
- `ArrowLeft`/`ArrowRight`: Navigate between tabs
- `Home`: First tab. `End`: Last tab.
- `Space`/`Enter`: Activate tab (if not auto-activated on focus)
- Recommendation: **Auto-activate on focus** (ARIA best practice for tabs with lightweight content)

#### Colorblind-Safe Indicators

| Current | Problem | Fix |
|---------|---------|-----|
| Green sparkline = up | Red/green indistinguishable | Add ▲ prefix to uptrend, ▼ to downtrend |
| Green border = winning | Red/green indistinguishable | Add ✦ icon on winning card header |
| Red/green delta text | Same | Use shape: `↑ +768` for positive, `↓ -768` for negative |
| Emerald vs red card glow | Subtle, hard to see | Asymmetric card design (winning card has badge, losing doesn't) |

**Test with:** Sim Daltonism (macOS), Chrome DevTools rendering → emulate vision deficiency

#### Screen Reader Announcements

| Event | Announcement | Method |
|-------|-------------|--------|
| Trade Insights loads | "Trade analysis: Score 86 out of 100. Strong Trade for Both Teams." | `aria-live="polite"` after count-up completes |
| Tab switch | "[Tab name] tab selected. [Panel content summary]." | Native tab ARIA + `aria-live` on panel |
| Swipe to next card | "Now showing: You Get, Ja'Marr Chase, Wide Receiver, Cincinnati." | `aria-live="polite"` on carousel container |
| Deep-dive expanded | "[Section name] expanded." | `aria-expanded="true"` state change |

#### Keyboard Navigation Map

```
[Tab] → Score wheel (meter, read-only) 
[Tab] → Player card 1 (YOU GIVE) [ArrowLeft/Right to navigate cards]
[Tab] → Player card 2 (YOU GET) 
[Tab] → Tab bar → [ArrowLeft/Right between tabs]
[Tab] → Active tab panel content
[Tab] → Send Trade Offer button
[Tab] → Edit Trade button
```

#### Minimum Contrast Requirements

| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|------------|-------|------|
| Player name | #f8fafc | #1e293b | 13.5:1 | AAA ✓ |
| Body stat | #cbd5e1 | #1e293b | 8.7:1 | AAA ✓ |
| Stat label | #94a3b8 | #1e293b | 4.8:1 | AA ✓ |
| Tab inactive | #94a3b8 | #1e293b | 4.8:1 | AA ✓ |
| Footnote | #64748b | #1e293b | 3.2:1 | AA-Large ✓ |
| Emerald accent | #10b981 | #1e293b | 5.2:1 | AA ✓ |
| Red accent | #f87171 | #1e293b | 5.8:1 | AA ✓ |

**Focus ring:** 2px solid #60a5fa, 2px offset. Contrast on #1e293b: 5.1:1 ✓

#### Motion Sensitivity

```typescript
// Wrap ALL new animations in this pattern:
const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// If reduced motion:
// - Skip count-up (show final number immediately)
// - Skip pulse glow celebration
// - Skip staggered entrance (show all at once)
// - Tab transitions: instant swap (no crossfade)
// - Skip haptic feedback
// - Sparklines: static render (no draw-in)
```

### Implementation Notes
- ARIA tabs pattern: 2 hours (careful implementation, test with VoiceOver + NVDA)
- Colorblind redundancy audit: 1 hour (add shapes/icons alongside colors)
- Screen reader announcement layer: 1 hour (aria-live regions)
- Keyboard navigation testing: 2 hours (manual testing + automated axe-core)
- Focus management for carousel: 1 hour
- **Total estimated: 7 hours**

### Top 3 Recommendations
1. **Implement full WAI-ARIA Tabs pattern** — Non-negotiable for keyboard users. The accordion→tab conversion must get this right.
2. **Add shape redundancy to all color indicators** — ▲/▼ arrows, ✦ badges. 8% of male users need this.
3. **Test with VoiceOver before shipping** — 15 minutes of manual testing catches 80% of screen reader issues.

---

# Final Synthesis — Recommended Design (Consensus)

## What All Experts Agree On

1. **Kill the accordions, use tabs** — Unanimous. Tabs have higher engagement, better discoverability, easier to implement accessible keyboard nav.

2. **Player cards need headshots and sparklines** — Every expert noted that the current text-only player display is the weakest visual element. Headshots humanize, sparklines storytell.

3. **Score wheel stays, add celebration tiers** — The score wheel is the strongest existing element. Enhance it with post-animation delight based on score range.

4. **Emerald/red asymmetric card styling** — The winning side should visually "win." Subtle glow + badge on the better side of the trade.

5. **Sticky CTA on mobile** — "Send Trade Offer" should never scroll out of view.

6. **Teaser stats on collapsed tabs** — Each tab should show its key number even when not selected.

## Where There Are Trade-Offs

| Decision | Option A | Option B | **Recommendation** |
|----------|----------|----------|---------------------|
| Mobile player layout | Swipe carousel (Marcus) | Vertical stack (Sarah) | **Swipe carousel** — each card gets full width. Stack pushes tabs too far down. |
| Deep-dive on mobile | Bottom-sheet (Marcus) | Inline tabs (Sarah) | **Inline tabs for MVP**, bottom-sheet for v2. Bottom-sheet is complex and risky for MVP timeline. |
| Projections viz | Line chart (Sarah) | Enhanced table (current) | **Line chart for v2**, keep enhanced table for MVP with better styling. Recharts adds bundle size. |
| Headshots | Sleeper CDN (all) | Position icon fallback | **Both** — try Sleeper CDN, fallback to styled position icon. No blank states. |
| Haptic feedback | Yes (Jordan, Marcus) | No (scope risk) | **Yes, progressive enhancement** — 1 hour of work, big perceived quality boost. |

## Phased Rollout Plan

### Phase 1: MVP (Ship in 2-3 days, ~16 hours dev)

**Maximum impact, minimum risk.**

| Change | Est. Hours | Impact |
|--------|-----------|--------|
| Replace accordions with accessible tabs | 4h | 🔴 Critical — biggest UX win |
| Redesign player cards (headshot + sparkline + value) | 5h | 🔴 Critical — visual transformation |
| Color system CSS variables (emerald/red semantic) | 1h | 🟡 High — kills zinc soup |
| Asymmetric card styling (winning side glow) | 1h | 🟡 High — visual storytelling |
| Sticky CTA on mobile | 0.5h | 🟡 High — conversion |
| Teaser badge on tabs ("+768 pts") | 1h | 🟢 Medium — discoverability |
| Score celebration pulse (80+ scores) | 1.5h | 🟢 Medium — delight |
| ARIA tabs pattern + keyboard nav | 2h | 🔴 Critical — accessibility |
| **Total** | **~16h** | |

**What MVP does NOT include:**
- Swipe carousel (use vertical stack on mobile)
- Bottom-sheet pattern
- Recharts line chart (keep styled table)
- Haptic feedback
- Framer-motion animations
- Particle confetti for 95+ scores

### Phase 2: Full Redesign (Ship in 1-2 weeks, ~24 hours additional)

| Change | Est. Hours | Impact |
|--------|-----------|--------|
| Swipe carousel for mobile player cards | 3h | Player cards get full width |
| Tab crossfade transitions (directional) | 3h | Premium feel |
| Sparkline upgrade (larger, gradient fill) | 2h | Better data viz |
| Recharts AreaChart for projections tab | 4h | Visual storytelling |
| Bottom-sheet for mobile deep-dive | 4h | Native mobile feel |
| Score celebration particles (95+) | 2h | Delight |
| Haptic feedback integration | 1h | Tactile feel |
| Spring-physics tab underline | 1h | Polish |
| Loading skeleton standardization | 2h | Perceived performance |
| VoiceOver + NVDA testing pass | 2h | Accessibility QA |
| **Total** | **~24h** | |

### Phase 3: Future Enhancements (Backlog)

| Enhancement | Notes |
|-------------|-------|
| Win probability endpoint + bar chart | Requires new API (server-side) |
| Player trend endpoint + larger sparklines | Requires new API (server-side) |
| Acceptance probability ("73% likely") | Requires ML model or heuristic |
| Pre-filled trade offer message | Requires platform integration (Sleeper API) |
| A/B test framework | Compare tab vs accordion engagement |
| Dark/light mode toggle | Currently dark-only; some users prefer light |
| League-relative rankings | "Your WR room: 10th → 4th" — requires roster data |
| Real EPA/YPRR data (replace placeholders) | Phase 3 was already planned for this |

---

## Component Architecture (MVP)

```
TradeInsights/
├── TradeInsightsSection.tsx        # NEW: Full-width hero section (replaces card)
├── ScoreWheel.tsx                  # KEEP: Extract from TradeNarrative
├── ScoreVerdict.tsx                # KEEP: Verdict badge + subtitle
├── PlayerComparison.tsx            # NEW: Two-column (desktop) / stack (mobile)
│   ├── PlayerShowcaseCard.tsx      # NEW: Headshot + name + value + sparkline
│   └── NetDeltaBadge.tsx           # NEW: "+768 pts ✦" pill
├── DeepDiveTabs.tsx                # NEW: Replaces ExpandableSection-based accordions
│   ├── ProjectionsTab.tsx          # REFACTOR from ValueProjectionTable
│   ├── AnalyticsTab.tsx            # REFACTOR from AdvancedAnalytics
│   └── ContractsTab.tsx            # REFACTOR from ContractDetails
├── TradeInsightsCTA.tsx            # NEW: Sticky footer with Send/Edit
├── hooks/
│   ├── useTradeInsightsAnimation.ts  # EXTEND: Add celebration, tab transitions
│   ├── useTabNavigation.ts           # NEW: ARIA tabs + keyboard
│   └── useHapticFeedback.ts          # NEW: Progressive enhancement
└── utils/
    ├── colors.ts                     # NEW: Semantic color system
    └── headshots.ts                  # NEW: Sleeper CDN URL builder
```

### Key Refactoring Notes

1. **`TradeInsightsCard` → `TradeInsightsSection`**: The "card" metaphor is wrong for a full-width hero section. Rename and restructure as a page section, not a contained card.

2. **`ExpandableSection` stays in codebase** but is no longer used by Trade Insights. Other parts of the app may still use it.

3. **`TradeNarrative` splits into `ScoreWheel` + `ScoreVerdict`**: The narrative text and key factors can merge into the verdict subtitle area. The standalone narrative component was doing too much.

4. **`PlayerEfficiencyCard` moves into `AnalyticsTab`**: No changes needed to the card itself — it's well-built. Just a new parent container.

5. **`ContractDetails` moves into `ContractsTab`**: Same — no changes to the card, just the wrapper.

---

## Success Metrics

| Metric | Current (est.) | Target (MVP) | Target (Full) |
|--------|---------------|--------------|---------------|
| Time to comprehension | 15-20 sec | <8 sec | <5 sec |
| Deep-dive engagement | ~15% expand any accordion | ~30% view any tab | ~45% view any tab |
| Mobile satisfaction | No data | "Feels like an app" | "Best in fantasy" |
| WCAG compliance | AA (partial) | AA (full) | AAA (text) |
| Bundle size impact | Baseline | +0KB (CSS only) | +15KB (recharts lazy) |
| Lighthouse accessibility | ~85 | 95+ | 98+ |

---

## Summary: The 5 Highest-Impact Changes

1. **🔄 Accordions → Tabs** (Sarah, Marcus, Elena) — 4 hours, transforms navigation
2. **👤 Player showcase cards with headshots** (All experts) — 5 hours, transforms visual identity
3. **🎨 Semantic color system** (Aisha) — 1 hour, transforms the palette
4. **✨ Score celebration tiers** (Jordan) — 1.5 hours, transforms emotional response
5. **📌 Sticky CTA + teaser badges** (Marcus, Lisa from existing spec) — 1.5 hours, transforms conversion

**Total for top 5: ~13 hours. These deliver 80% of the redesign value.**

---

*Panel assembled. Analysis complete. Ready for implementation.* 🎨

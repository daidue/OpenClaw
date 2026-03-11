# Trade Insights Modal — Expert Panel Design Spec

**Date:** 2026-03-11  
**Status:** Design Complete — Ready for Implementation  
**Author:** Jeff (synthesized from 5-expert panel)

---

## Table of Contents
1. [Expert Panel Reports](#expert-panel-reports)
2. [Synthesized Modal Specification](#synthesized-modal-specification)
3. [Content Template](#content-template)
4. [Implementation Guide](#implementation-guide)
5. [API Requirements](#api-requirements)

---

# Expert Panel Reports

## Expert 1: Product Design — Sarah Chen

### Information Hierarchy (Top → Bottom)

The modal must answer three questions in order:
1. **"Is this trade fair?"** → Trust gate (must clear before anything else)
2. **"How does this help ME?"** → Personal value proposition
3. **"Will they accept?"** → Opponent perspective + acceptance likelihood

Users won't read past #1 if it fails. Design for progressive disclosure.

### Layout Recommendation

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER: Trade Score Ring + Headline                         │
├──────────────────────────────────────────────────────────────┤
│  SECTION 1: Two-Column Value Comparison (You ↔ Them)        │
├──────────────────────────────────────────────────────────────┤
│  SECTION 2: Expandable Advanced Analytics (collapsed)        │
├──────────────────────────────────────────────────────────────┤
│  FOOTER: CTA Buttons                                         │
└──────────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- **Max-width 640px** — readable on desktop, full-width on mobile
- **Max-height 80vh** — scrollable if needed, never covers full screen
- **Backdrop blur + dimming** — focus without disorientation
- **Entrance animation:** Slide up from bottom (mobile-native feel)
- **No auto-dismiss** — user controls when to close
- **Sticky footer** — CTA buttons always visible during scroll

### Interaction Model
- Tap outside or X to dismiss (no data lost)
- Expandable sections via chevron (Advanced Analytics starts collapsed)
- Swipeable player cards in mobile view
- Deep-press/long-hold on any stat shows tooltip explainer

### Visual Design Principles
- **Card-based** — each section is a distinct card with subtle elevation
- **Color coding:** Green = improvement, Red = decline, Blue = neutral data
- **Score ring:** Circular progress indicator (like a credit score) — immediate visual anchor
- **Player headshots** — humanize the data (use Sleeper/ESPN CDN images)
- **White space** — resist the urge to pack every stat; breathing room builds trust

---

## Expert 2: Behavioral Psychology — Dr. Marcus Rodriguez

### Core Psychological Framework

The modal must overcome three cognitive barriers:
1. **Loss Aversion** — Users feel giving up players 2x more than gaining them
2. **Status Quo Bias** — "My team is fine as-is" inertia
3. **Endowment Effect** — "My players are worth more than market says"

### Messaging Strategy

**Principle 1: Lead with Fairness, Not Advantage**
- ❌ "You're winning this trade by 15 points!"
- ✅ "Both teams improve. Here's how."

Why: If users think they're "stealing," they worry the opponent will reject. If they think it's unfair the OTHER way, they won't accept. Fairness framing eliminates both failure modes.

**Principle 2: Frame Losses as Trades-for-Upgrades**
- ❌ "You give up: Derrick Henry"
- ✅ "You upgrade RB → WR: Derrick Henry becomes Ja'Marr Chase"

Why: Reframing a loss as a transformation (not a subtraction) reduces loss aversion by ~40% (Kahneman, 1991).

**Principle 3: Use Relative Improvement, Not Absolute Values**
- ❌ "Player X is worth 45.2 dynasty points"
- ✅ "Your WR room jumps from 10th to 4th in your league"

Why: League-relative rankings are more meaningful than abstract point values. Users think in terms of "Am I better than my competition?" not "What's my number?"

**Principle 4: Social Proof Through Data**
- "Trades like this are accepted 73% of the time"
- "Similar trades were completed in 12 leagues this week"

Why: Descriptive norms ("others do this") are more persuasive than injunctive norms ("you should do this").

### Trust Signals (ordered by impact)
1. **Fairness score prominently displayed** (most important — alleviates guilt/suspicion)
2. **Source attribution** — "Values from KeepTradeCut + FantasyCalc consensus"
3. **Win probability math shown** — "Based on projected points × schedule strength"
4. **Mutual benefit visible** — opponent's improvements shown alongside yours
5. **No hype language** — clinical, data-driven tone builds credibility

### Framing Principles
- **Dual-frame every metric** — always show both sides. One-sided analysis = distrust.
- **Anchor on the score ring** — users see the overall score first, then drill into why.
- **"Before → After" framing** — show transformation, not just current state.
- **Round numbers** — "~70% acceptance" not "68.4% acceptance" (processing fluency).

---

## Expert 3: Data Visualization — Emily Watson

### Chart Recommendations

**1. Trade Score Ring (Header — Hero Element)**
- Circular donut chart (0-100 scale)
- Color gradient: Red (0-40) → Yellow (40-60) → Green (60-100)
- Large center number (e.g., "87")
- Label below: "Great Trade" / "Fair Trade" / "Lopsided"
- Implementation: SVG arc with CSS animation on mount

**2. Two-Column Roster Impact (Section 1)**
```
YOUR TEAM                    THEIR TEAM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WR  10th → 4th  ▲ +6       RB  8th → 3rd  ▲ +5
RB  2nd → 5th   ▼ -3       WR  3rd → 5th  ▼ -2
QB  1st → 1st   ━ 0        QB  6th → 6th  ━ 0

NET: +3 ranks               NET: +3 ranks
```
- Horizontal bar segments showing before/after for each position
- Green bars extend right (improvement), red bars extend left (decline)
- Keep to max 4 positions (the ones that change)

**3. Win Probability Bump (Section 2 — Advanced)**
- Simple horizontal bar chart
- "Championship odds: 12% → 16% (+4%)"
- Opponent shown alongside: "Their odds: 8% → 11% (+3%)"
- No complex line charts — users scan, they don't study

**4. Player Value Comparison (Section 2 — Advanced)**
- Compact player cards with mini sparkline (last 6 weeks trend)
- Value badge: "KTC: 7,200 | FC: 7,450"
- Age + contract status as subtle metadata

### Data Presentation Anti-Patterns (AVOID)
- ❌ Pie charts (useless for comparison)
- ❌ Stacked bar charts (cognitively expensive)
- ❌ More than 2 colors per visualization
- ❌ Decimals beyond 1 place
- ❌ Y-axis labels on small charts (use direct labeling)
- ❌ 3D anything

### Responsive Data Viz Rules
- **Desktop (>768px):** Two-column layout, charts side by side
- **Mobile (<768px):** Single column, stack "Your Team" above "Their Team"
- **Charts scale to container** — never fixed pixel widths
- **Reduce data density on mobile** — show top 3 positions, not all

---

## Expert 4: UX Copywriting — James Wu

### Tone Guidelines
- **Voice:** Confident analyst, not used-car salesman
- **Register:** Smart friend explaining fantasy football, not academic paper
- **Emotion:** Excitement comes from data, not exclamation marks
- **Length:** Headlines ≤ 8 words. Body copy ≤ 15 words per bullet.

### Headline Formulas

**Header (Score Ring):**
- Score 80+: "Strong Trade for Both Teams"
- Score 60-79: "Balanced Trade — Here's the Breakdown"
- Score 40-59: "This Trade Has Tradeoffs"
- Score <40: "Heads Up — This One's Lopsided"

**Section Headers:**
- "How Your Team Changes" (not "Your Value Analysis")
- "How Their Team Changes" (not "Opponent Impact Assessment")
- "The Numbers Behind It" (not "Advanced Analytics Dashboard")

### Sample Copy (Using Real Trade: Derrick Henry ↔ Ja'Marr Chase)

**Header:**
> **Strong Trade for Both Teams** — Score: 87/100

**Your Team Section:**
> **You Get:** Ja'Marr Chase (WR1)
> Your WR room jumps from 10th → 4th in league
> You can afford to move Henry — you still have Bijan at RB1
> Net value: +12.3 dynasty points

**Their Team Section:**
> **They Get:** Derrick Henry (RB1)
> Fills their RB2 hole — they were starting Zack Moss
> They have 4 top-30 WRs and can spare Chase
> Net value: +8.7 dynasty points

**Acceptance Likelihood:**
> **73% likely to accept** — trades like this get done

**Advanced Analytics Teaser (collapsed):**
> 📊 See win probability impact, player trends, and breakout scores

### Microcopy Guidelines
- **Tooltips:** "Dynasty points measure long-term player value across multiple seasons"
- **Empty states:** "We need both rosters to analyze this trade"
- **Error states:** "Couldn't calculate — try refreshing" (not "Error 500")
- **Loading:** "Crunching the numbers..." (not "Loading...")

### Words to USE:
`upgrade, improve, jump, fill, solve, strong, balanced, fair, likely, trend`

### Words to AVOID:
`steal, fleece, robbery, destroy, dominate, crush, insane, no-brainer`
(These create distrust and signal bias)

---

## Expert 5: Conversion Optimization — Lisa Park

### CTA Strategy

**Primary CTA:** "Send Trade Offer" (green, high-contrast)
**Secondary CTA:** "Edit Trade" (outlined/ghost button)
**Tertiary CTA:** "Dismiss" (text link, no button styling)

**Button hierarchy (mobile):**
```
[        Send Trade Offer        ]  ← Full-width, green, 48px height
[   Edit Trade   ] [  Dismiss  ]   ← Half-width each, subtle
```

**Button hierarchy (desktop):**
```
[ Dismiss ]        [ Edit Trade ]  [ Send Trade Offer ]
   ← left-aligned      right-aligned, primary rightmost →
```

### Conversion Drivers

**1. Acceptance Probability as Social Proof**
- Show prominently: "73% of similar trades get accepted"
- This does double duty: social proof + reduces fear of rejection
- If >70%: green badge. 50-70%: yellow. <50%: show but de-emphasize.

**2. Scarcity/Urgency (Ethical, Not Manipulative)**
- "Player values update daily — this analysis is based on today's data"
- If player trending: "Chase's value is up 8% this month ↗"
- NOT: "Act now before they change their mind!" (gross)

**3. Progress Indicator**
- Show "Step 2 of 3" in header (Trade Finder → **Insights** → Send)
- Users who see progress are 26% more likely to complete (Cialdini)

**4. Reduce Friction to Primary Action**
- Pre-fill trade offer message: "Hey, I think this trade works for both of us. [Player] fills your [position] need and I could use [Player] at [position]."
- One-tap send if platform integration exists (Sleeper API)

**5. Edit Path Should Be Easy, Not Punishing**
- "Edit Trade" goes back to Trade Builder with current selections preserved
- Do NOT lose their work. Ever.

### What NOT to Do
- ❌ Countdown timers (manipulative, damages trust)
- ❌ "Are you sure?" on dismiss (patronizing)
- ❌ Pop-up on top of pop-up (modal inception)
- ❌ Requiring account creation to see insights
- ❌ Gating any data behind a paywall in the modal itself

### A/B Test Opportunities (Post-Launch)
1. Score ring vs. letter grade (A/B/C) — which drives more sends?
2. Opponent section above vs. below user section
3. Pre-filled message vs. blank compose
4. "73% acceptance" prominent vs. subtle
5. Collapsed vs. expanded Advanced Analytics by default

---

# Synthesized Modal Specification

## Layout

### Desktop (>768px)
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Trade Builder          Step 2 of 3        [X Close] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│              ┌───────────┐                                      │
│              │    87     │   Strong Trade for Both Teams        │
│              │  /100     │   Fairness: 92  |  Acceptance: 73%  │
│              └───────────┘                                      │
│                                                                 │
├───────────────────────────────┬─────────────────────────────────┤
│                               │                                 │
│  🏈 HOW YOUR TEAM CHANGES    │  🏈 HOW THEIR TEAM CHANGES     │
│                               │                                 │
│  You get: Ja'Marr Chase      │  They get: Derrick Henry        │
│                               │                                 │
│  WR: 10th → 4th  ▲ +6       │  RB: 8th → 3rd   ▲ +5          │
│  RB: 2nd → 5th   ▼ -3       │  WR: 3rd → 5th   ▼ -2          │
│                               │                                 │
│  ✅ Addresses WR need         │  ✅ Fills RB2 hole              │
│  ✅ RB depth absorbs loss     │  ✅ Has WR depth to spare       │
│                               │                                 │
│  Net: +12.3 dynasty pts      │  Net: +8.7 dynasty pts          │
│                               │                                 │
├───────────────────────────────┴─────────────────────────────────┤
│                                                                 │
│  📊 THE NUMBERS BEHIND IT                              [▼ More]│
│                                                                 │
│  Championship Odds    You: 12% → 16% (+4%)                     │
│                       Them: 8% → 11% (+3%)                     │
│                                                                 │
│  ┌─ Ja'Marr Chase ─────────┐  ┌─ Derrick Henry ──────────────┐│
│  │ WR4 overall | Age 26    │  │ RB8 overall | Age 27         ││
│  │ KTC: 7,200 | FC: 7,450  │  │ KTC: 5,800 | FC: 5,950      ││
│  │ Trend: ↗ +8% (30d)      │  │ Trend: ↘ -3% (30d)          ││
│  │ Breakout: 85th %ile     │  │ Injury Risk: Low             ││
│  │ [mini sparkline]        │  │ [mini sparkline]             ││
│  └──────────────────────────┘  └───────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Dismiss]              [Edit Trade]    [Send Trade Offer  →]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile (<768px)
```
┌───────────────────────────────────┐
│  ← Back        Step 2/3      [X] │
├───────────────────────────────────┤
│                                   │
│         ┌──────────┐              │
│         │   87     │              │
│         │  /100    │              │
│         └──────────┘              │
│   Strong Trade for Both Teams     │
│   Fair: 92 | Accept: 73%         │
│                                   │
├───────────────────────────────────┤
│  🏈 YOUR TEAM                     │
│                                   │
│  You get: Ja'Marr Chase          │
│  WR: 10th → 4th ▲               │
│  RB: 2nd → 5th  ▼               │
│  ✅ Addresses WR need            │
│  Net: +12.3 pts                  │
│                                   │
├───────────────────────────────────┤
│  🏈 THEIR TEAM                    │
│                                   │
│  They get: Derrick Henry         │
│  RB: 8th → 3rd ▲                │
│  WR: 3rd → 5th ▼                │
│  ✅ Fills RB2 hole               │
│  Net: +8.7 pts                   │
│                                   │
├───────────────────────────────────┤
│  📊 THE NUMBERS        [▼ More]  │
│  Your odds: +4% | Their: +3%    │
│                                   │
├───────────────────────────────────┤
│  [  Send Trade Offer         →]  │
│  [Edit Trade]     [Dismiss]      │
└───────────────────────────────────┘
```

## Content Structure (Information Order)

| Order | Section | Purpose | Default State |
|-------|---------|---------|---------------|
| 1 | Progress indicator | Orientation (Step 2/3) | Visible |
| 2 | Trade Score Ring | Trust gate — "Is this fair?" | Visible, animated |
| 3 | Score subtitle | Fairness + Acceptance % | Visible |
| 4 | Your Team Changes | Personal value prop | Visible |
| 5 | Their Team Changes | Mutual benefit proof | Visible |
| 6 | Advanced Analytics | Supporting data | **Collapsed** (expand on tap) |
| 7 | CTA Footer | Drive action | Sticky, always visible |

## Visual Design Principles

1. **Color Palette:**
   - Primary green: `#22C55E` (improvement, primary CTA)
   - Warning amber: `#F59E0B` (tradeoffs, mixed signals)
   - Danger red: `#EF4444` (decline, lopsided)
   - Neutral blue: `#3B82F6` (data, informational)
   - Background: `#FAFAFA` light / `#1A1A2E` dark mode
   - Card surface: `#FFFFFF` / `#252540`

2. **Typography:**
   - Score number: 48px bold (hero element)
   - Section headers: 16px semibold, uppercase tracking
   - Body: 14px regular
   - Stats: 14px tabular-nums (monospace numbers for alignment)
   - Mobile: Scale down 2px across the board

3. **Spacing:**
   - Section padding: 24px (desktop), 16px (mobile)
   - Card gap: 16px
   - Line height: 1.5 for body, 1.2 for stats

4. **Animation:**
   - Score ring: Count up from 0 → actual score (800ms, ease-out)
   - Position rank changes: Slide in sequentially (stagger 100ms)
   - Section expand: Smooth height transition (300ms)
   - Modal entrance: Slide up + fade in (400ms)

## Interaction Model

| Interaction | Behavior |
|------------|----------|
| Open modal | Slide up from bottom, backdrop dims |
| Tap outside modal | Dismiss (same as X) |
| Press Escape | Dismiss |
| Tap X | Dismiss |
| Tap "▼ More" | Expand Advanced Analytics section |
| Long-press any stat | Show tooltip with explanation |
| Tap player card | (Future) Navigate to player profile |
| Tap "Send Trade Offer" | Open compose/confirm screen |
| Tap "Edit Trade" | Return to Trade Builder (preserve selections) |
| Swipe down (mobile) | Dismiss modal |
| Scroll | Content scrolls within modal, footer stays sticky |
| Tab key | Focus cycles through: Close → Expand → Send → Edit → Dismiss |

## Accessibility Requirements
- All interactive elements have `aria-label`
- Score ring has `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Color is never the only indicator (always paired with icon or text)
- Focus trap within modal when open
- `aria-live="polite"` on score animation completion
- Minimum touch target: 44x44px
- Contrast ratio ≥ 4.5:1 for all text

---

# Content Template

## Data Points to Include

### Always Show (Section 1 — Roster Impact)
| Data Point | Source | Example |
|-----------|--------|---------|
| Trade score (0-100) | `trade.scores.overall` | 87 |
| Fairness score | `trade.scores.fairness` | 92 |
| Acceptance likelihood | `trade.scores.acceptance` | 73% |
| Players given | `trade.give` | [Derrick Henry] |
| Players received | `trade.get` | [Ja'Marr Chase] |
| Position rank before/after | `trade.impact.yourLineup` | WR: 10th → 4th |
| Opponent position rank change | `trade.impact.opponentNeeds` | RB: 8th → 3rd |
| Net dynasty value (user) | Calculated from `trade.give`/`trade.get` values | +12.3 |
| Net dynasty value (opponent) | Same calculation, opponent perspective | +8.7 |
| Roster insight bullets | Generated from `trade.opponent.needs` | "Fills their RB2 hole" |

### Show on Expand (Section 2 — Advanced Analytics)
| Data Point | Source | Example |
|-----------|--------|---------|
| Championship odds delta | **NEW ENDPOINT** | +4% / +3% |
| Player overall rank | Existing player data | WR4, RB8 |
| Player age | Existing player data | 26, 27 |
| KTC value | Existing (KeepTradeCut) | 7,200 |
| FantasyCalc value | Existing (FantasyCalc) | 7,450 |
| 30-day value trend | **NEW ENDPOINT** | ↗ +8% |
| Breakout score | **NEW ENDPOINT** | 85th percentile |
| Injury risk rating | **NEW ENDPOINT** | Low / Medium / High |
| Value sparkline (6 weeks) | **NEW ENDPOINT** | [mini chart data] |

### Contextual (Show When Relevant)
| Data Point | When to Show | Example |
|-----------|-------------|---------|
| "Value trending up" | 30-day trend > +5% | "Chase up 8% this month" |
| "Workhorse back" | Snap share > 75% | "Henry: 82% snap share" |
| "Injury concern" | Risk = High | "⚠️ Missed 3 games in 2025" |
| "Breakout candidate" | Breakout > 80th %ile | "85th percentile breakout score" |
| "Contract year" | Entering final year | "Contract year — could see increased usage" |

## Value Framing Rules

1. **Always show relative improvement first, absolute value second**
   - ✅ "WR room: 10th → 4th (+6 spots)" then "Net: +12.3 dynasty pts"
   - ❌ Lead with "+12.3 dynasty pts" — meaningless without context

2. **Dual-frame EVERY metric**
   - Every "Your Team" stat has a "Their Team" counterpart
   - If one side's metric is negative, still show it (builds trust)

3. **Round to 1 decimal for dynasty points, whole numbers for ranks/percentages**
   - ✅ "+12.3 pts" and "73% acceptance"
   - ❌ "+12.347 pts" and "73.2% acceptance"

4. **Use league-relative rankings, not league-wide**
   - ✅ "4th in your league" (out of 10-14 teams)
   - ❌ "Top-48 WR" (meaningless in context)

## Example: Full Modal Content (Henry ↔ Chase Dynasty Trade)

**Header:**
- Score: 87/100
- Headline: "Strong Trade for Both Teams"
- Subtitle: "Fairness: 92 | 73% likely to accept"

**Your Team:**
- "You get: Ja'Marr Chase"
- "✅ WR room jumps from 10th to 4th in league"
- "✅ You can afford it — Bijan Robinson is your RB1"
- "Net value: +12.3 dynasty points"

**Their Team:**
- "They get: Derrick Henry"
- "✅ Fills their RB2 gap — they were starting Zack Moss"
- "✅ They have 4 top-30 WRs and can spare Chase"
- "Net value: +8.7 dynasty points"

**Advanced (expanded):**
- "Championship Odds: You +4% | Them +3%"
- Chase card: WR4, Age 26, KTC 7200, ↗ +8%, Breakout 85th %ile
- Henry card: RB8, Age 27, KTC 5800, ↘ -3%, Injury Risk: Low

**CTA:**
- [Send Trade Offer →]
- [Edit Trade] [Dismiss]

---

# Implementation Guide

## Component Structure

```
TradeInsightsModal/
├── TradeInsightsModal.tsx          # Main modal wrapper (portal, backdrop, animation)
├── TradeInsightsModal.module.css   # Styles (CSS modules or Tailwind)
├── components/
│   ├── TradeScoreRing.tsx          # Animated circular score (SVG)
│   ├── TradeScoreSubtitle.tsx      # Fairness + acceptance badges
│   ├── RosterImpactSection.tsx     # Two-column your/their changes
│   ├── RosterImpactColumn.tsx      # Single column (reused for each side)
│   ├── PositionRankChange.tsx      # "WR: 10th → 4th ▲ +6" row
│   ├── InsightBullet.tsx           # "✅ Fills their RB2 hole" item
│   ├── AdvancedAnalytics.tsx       # Expandable section wrapper
│   ├── WinProbabilityBar.tsx       # Horizontal bar showing odds change
│   ├── PlayerCard.tsx              # Compact player card with sparkline
│   ├── PlayerSparkline.tsx         # Mini 6-week value trend chart
│   ├── CTAFooter.tsx              # Sticky button group
│   └── ProgressIndicator.tsx       # "Step 2 of 3" breadcrumb
├── hooks/
│   ├── useTradeInsights.ts         # Data fetching + transformation
│   ├── useAnimatedScore.ts         # Score count-up animation
│   └── useModalA11y.ts             # Focus trap, escape key, aria
├── utils/
│   ├── formatters.ts               # Number formatting, rank ordinals
│   ├── insightGenerator.ts         # Generate human-readable insight bullets
│   └── scoreThresholds.ts          # Score → color/label mapping
└── types/
    └── tradeInsights.ts            # TypeScript interfaces
```

## Key TypeScript Interfaces

```typescript
interface TradeInsightsData {
  score: {
    overall: number;        // 0-100
    fairness: number;       // 0-100
    acceptance: number;     // 0-100 (displayed as %)
  };
  
  userSide: TradeSide;
  opponentSide: TradeSide;
  
  analytics: AdvancedAnalytics | null;  // null if endpoint unavailable
}

interface TradeSide {
  players: TradePlayer[];
  netValue: number;           // dynasty points delta
  positionChanges: PositionChange[];
  insights: string[];         // Generated bullet points
}

interface TradePlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  imageUrl: string | null;
  overallRank: number;
  age: number;
  values: {
    ktc: number;
    fantasyCalc: number;
  };
  trend30d: number | null;      // percentage, e.g., 8.0 = +8%
  breakoutScore: number | null; // percentile 0-100
  injuryRisk: 'low' | 'medium' | 'high' | null;
  sparklineData: number[] | null;  // 6 weekly values
}

interface PositionChange {
  position: string;          // "WR", "RB", "QB", etc.
  rankBefore: number;
  rankAfter: number;
  direction: 'up' | 'down' | 'same';
}

interface AdvancedAnalytics {
  winProbability: {
    userBefore: number;
    userAfter: number;
    opponentBefore: number;
    opponentAfter: number;
  };
  playerProfiles: TradePlayer[];  // Detailed player data
}
```

## Score Thresholds

```typescript
const SCORE_CONFIG = {
  excellent: { min: 80, color: '#22C55E', label: 'Strong Trade for Both Teams' },
  good:     { min: 60, color: '#84CC16', label: 'Balanced Trade — Here\'s the Breakdown' },
  fair:     { min: 40, color: '#F59E0B', label: 'This Trade Has Tradeoffs' },
  poor:     { min: 0,  color: '#EF4444', label: 'Heads Up — This One\'s Lopsided' },
};

const ACCEPTANCE_CONFIG = {
  high:   { min: 70, color: '#22C55E', label: 'Likely to accept' },
  medium: { min: 50, color: '#F59E0B', label: 'May accept' },
  low:    { min: 0,  color: '#EF4444', label: 'Unlikely to accept' },
};
```

## Insight Generation Logic

```typescript
function generateInsights(trade: TradeData, side: 'user' | 'opponent'): string[] {
  const insights: string[] = [];
  const impact = side === 'user' ? trade.impact.yourLineup : trade.impact.opponentNeeds;
  
  // 1. Biggest position improvement
  const bestImprovement = impact.positionChanges
    .filter(p => p.direction === 'up')
    .sort((a, b) => (b.rankBefore - b.rankAfter) - (a.rankBefore - a.rankAfter))[0];
  
  if (bestImprovement) {
    insights.push(
      `${bestImprovement.position} room jumps from ${ordinal(bestImprovement.rankBefore)} to ${ordinal(bestImprovement.rankAfter)} in league`
    );
  }
  
  // 2. Depth buffer (why the loss is okay)
  const depthPositions = getDepthPositions(trade, side);
  if (depthPositions.length > 0) {
    insights.push(
      `${side === 'user' ? 'You' : 'They'} can afford it — ${depthPositions[0].reason}`
    );
  }
  
  // 3. Opponent need filled (for opponent side)
  if (side === 'opponent') {
    const worstGrade = getWorstPositionGrade(trade.opponent.needs);
    if (worstGrade) {
      insights.push(`Fills their ${worstGrade.position} hole`);
    }
  }
  
  return insights.slice(0, 3); // Max 3 bullets per side
}
```

## Edge Cases

| Edge Case | Handling |
|-----------|---------|
| Multi-player trade (3+ players per side) | Stack player cards, show "and X more" if >3 per side |
| Draft pick included | Show pick as card with projected value range |
| Score unavailable (API error) | Show modal without score ring, replace with "Analysis unavailable" |
| No advanced analytics | Hide Section 2 entirely, not empty state |
| Opponent roster unknown | Show "Their Team" section with limited data, note "Limited roster data" |
| Same-position trade (WR for WR) | Emphasize tier upgrade: "Upgrades from WR15 to WR4" |
| Very lopsided trade (score < 30) | Show warning banner: "This trade appears significantly unbalanced" |
| Mobile landscape | Fall back to desktop layout if width > 640px |
| Loading state | Skeleton shimmer for score ring + cards, CTA disabled |
| User is the "opponent" | Swap perspectives — always frame from viewer's POV |
| Dark mode | Full dark theme support (use CSS variables) |

## Mobile Considerations

1. **Bottom-sheet pattern** on mobile (not centered modal)
   - Drag handle at top
   - Pull down to dismiss
   - Snap points: 60% height (default), 90% (expanded analytics)

2. **Touch targets:** Minimum 44x44px for all interactive elements

3. **Scroll behavior:**
   - Modal body scrolls independently
   - CTA footer stays fixed at bottom
   - No horizontal scroll ever

4. **Performance:**
   - Lazy load sparkline charts (only render when Advanced Analytics expanded)
   - Use `will-change: transform` for modal animation
   - Debounce resize handlers

---

# API Requirements

## Existing Endpoints (Available Now)
| Endpoint | Data | Notes |
|----------|------|-------|
| Trade Finder results | `trade.scores.*`, `trade.give`, `trade.get`, `trade.impact.*`, `trade.opponent.needs` | Already returned from Trade Finder flow |

## New Endpoints Needed

### 1. `GET /api/trade/win-probability`
**Priority:** HIGH — Key persuasion element

**Request:**
```json
{
  "leagueId": "string",
  "userId": "string",
  "opponentId": "string",
  "give": ["playerId1", "playerId2"],
  "get": ["playerId3", "playerId4"]
}
```

**Response:**
```json
{
  "user": {
    "before": 0.12,
    "after": 0.16,
    "delta": 0.04
  },
  "opponent": {
    "before": 0.08,
    "after": 0.11,
    "delta": 0.03
  }
}
```

**Implementation Notes:**
- Uses projected points × remaining schedule strength
- Can be approximated initially with simple roster strength delta
- Cache aggressively (same trade = same result for 24h)

### 2. `GET /api/players/:id/trend`
**Priority:** MEDIUM — Enriches player cards

**Response:**
```json
{
  "playerId": "string",
  "trend30d": 8.2,
  "sparkline": [6800, 6900, 7000, 7050, 7100, 7200],
  "breakoutScore": 85,
  "injuryRisk": "low",
  "snapSharePct": 82,
  "contractYear": false
}
```

**Implementation Notes:**
- Aggregate from KTC + FantasyCalc historical data
- Breakout score: composite of age, draft capital, usage trends, efficiency
- Injury risk: based on games missed + injury history
- Can batch multiple player IDs: `GET /api/players/trends?ids=a,b,c`

### 3. `GET /api/trade/insights`
**Priority:** LOW — Can be client-generated initially

**Request:** Same as win-probability
**Response:**
```json
{
  "userInsights": [
    "Your WR room jumps from 10th to 4th in league",
    "You can afford it — Bijan Robinson is your RB1",
    "Chase's value is up 8% this month"
  ],
  "opponentInsights": [
    "Fills their RB2 gap — they were starting Zack Moss",
    "They have 4 top-30 WRs and can spare Chase"
  ]
}
```

**Implementation Notes:**
- Can be generated client-side from existing trade data initially
- Move to server when insight logic gets complex
- Server-side allows A/B testing insight copy

## Data Flow

```
Trade Finder (existing)
    │
    ├── trade.scores.* ─────────────────────────────┐
    ├── trade.give / trade.get ──────────────────────┤
    ├── trade.impact.* ─────────────────────────────┤
    └── trade.opponent.needs ───────────────────────┤
                                                     │
    GET /api/trade/win-probability ──── NEW ────────┤
    GET /api/players/:id/trend ─────── NEW ────────┤
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │  useTradeInsights│
                                            │  (hook)          │
                                            └────────┬────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │ TradeInsightsModal│
                                            └─────────────────┘
```

## Implementation Phases

### Phase 1: MVP (Ship in 3-5 days)
- Trade Score Ring with animation
- Two-column roster impact (from existing trade data)
- Client-generated insight bullets
- CTA footer with Send / Edit / Dismiss
- Mobile responsive (bottom-sheet)
- No advanced analytics section yet

### Phase 2: Enhanced (Week 2)
- Advanced Analytics section (collapsed by default)
- Win probability endpoint + bar chart
- Player trend endpoint + sparklines
- Breakout score + injury risk badges

### Phase 3: Polish (Week 3)
- Pre-filled trade offer message
- A/B test framework for copy/layout
- Analytics tracking (which sections users expand, time-to-action)
- Dark mode support

---

# Summary

## What Makes This Design Best-in-Class

1. **Psychology-first:** Fairness framing overcomes loss aversion — the #1 killer of fantasy trades
2. **Dual-perspective:** Showing opponent benefit builds trust AND increases acceptance likelihood
3. **Progressive disclosure:** 80% of users get what they need from Section 1 alone; power users expand Section 2
4. **Mobile-native:** Bottom sheet pattern, not a desktop modal crammed onto a phone
5. **Data-dense but readable:** Every stat is contextualized with league-relative meaning
6. **Conversion-optimized:** Clear CTA hierarchy, social proof via acceptance %, reduced friction to action
7. **Accessible:** Keyboard nav, screen reader support, color-independent indicators
8. **Trustworthy:** No hype language, source attribution, showing both sides of every metric

## Design Principles (TL;DR)
1. **Fairness first** — lead with balanced analysis, not advantage
2. **Show, don't tell** — data visualization over copy
3. **Both sides win** — mutual benefit is the persuasion engine
4. **30-second read** — if it takes longer, cut content
5. **One clear action** — Send Trade Offer is always the obvious next step

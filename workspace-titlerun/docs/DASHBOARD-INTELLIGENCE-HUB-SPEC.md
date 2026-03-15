# League Intelligence Hub — Dashboard Replacement Spec

**Date:** 2026-03-15
**Author:** Rush (TitleRun Owner/Operator)
**Status:** APPROVED FOR IMPLEMENTATION
**Target Launch:** April 15, 2026
**Classification:** INTERNAL — Product Specification

---

## Executive Summary

Replace TitleRun's generic Dashboard page with the **League Intelligence Hub** — a personalized command center that activates after Sleeper username input. This becomes TitleRun's core product experience, combining team analysis, 2026 season outlook, and three killer trade features into a single view that answers: *"What should I do with my team RIGHT NOW?"*

**Core thesis:** The user who connects their Sleeper league becomes a retained user. The Intelligence Hub gives them a reason to come back every week.

---

## Table of Contents

1. [User Flow Design](#1-user-flow-design)
2. [Dashboard Layout](#2-dashboard-layout)
3. [Feature 1: Auto-Generated Trade Pitch](#3-feature-1-auto-generated-trade-pitch)
4. [Feature 2: Counter-Offer Generator](#4-feature-2-counter-offer-generator)
5. [Feature 3: Multi-Team Trade Builder](#5-feature-3-multi-team-trade-builder)
6. [2026 Season Outlook](#6-2026-season-outlook)
7. [Sleeper API Integration](#7-sleeper-api-integration)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Backend API Routes](#9-backend-api-routes)
10. [Database Schema](#10-database-schema)
11. [Implementation Roadmap](#11-implementation-roadmap)
12. [Success Metrics](#12-success-metrics)
13. [Risk Mitigation](#13-risk-mitigation)

---

## 1. User Flow Design

### 1.1 New User Journey

```
Landing Page → Sleeper Username Input → League Selection → Intelligence Hub
```

**Key principle:** Minimal friction. One input field to unlock the entire experience.

### 1.2 Step 1: Sleeper Username Input

**Location:** Replaces current Dashboard landing. Also accessible from nav as "Connect League."

```
┌──────────────────────────────────────────────┐
│                                              │
│           🏆 Welcome to TitleRun             │
│      Your Dynasty League Command Center      │
│                                              │
│     Enter your Sleeper username:             │
│     ┌──────────────────────┐  ┌──────────┐  │
│     │ jeff_dynasty_22      │  │ Connect  │  │
│     └──────────────────────┘  └──────────┘  │
│                                              │
│     ✓ Read-only — we never post or edit     │
│     ✓ Syncs your leagues in seconds         │
│     ✓ Works with dynasty & redraft          │
│                                              │
│     ─── or try with a demo league ───       │
│     [Explore Demo]                           │
│                                              │
└──────────────────────────────────────────────┘
```

**UX Notes:**
- Auto-focus on the input field on page load
- "Connect" button disabled until ≥3 characters typed
- Loading spinner with "Finding your leagues..." while Sleeper API resolves
- Error state: "Username not found on Sleeper. Check spelling?" with retry
- Demo mode: Pre-loaded sample league data for users who aren't ready to connect
- Remember username in localStorage for return visits (auto-reconnect)

**Validation:**
- Strip whitespace, lowercase
- Reject special characters (Sleeper usernames are alphanumeric + underscores)
- Rate limit: 5 lookups per minute per IP

### 1.3 Step 2: League Selection

**Triggers when:** User has ≥1 league. If exactly 1 league, skip straight to Hub.

```
┌──────────────────────────────────────────────┐
│                                              │
│  Hey jeff_dynasty_22! You're in 3 leagues:   │
│                                              │
│  ☑ Dynasty League 2026        12-team  SF   │
│    Last synced: Never                        │
│                                              │
│  ☑ Superflex Dynasty          10-team  SF   │
│    Last synced: Never                        │
│                                              │
│  ☐ Redraft League 2026        12-team  1QB  │
│    Last synced: Never                        │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │ Dynasty leagues auto-selected.          │ │
│  │ Redraft support coming soon!            │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│           [Sync & Continue →]                │
│                                              │
└──────────────────────────────────────────────┘
```

**UX Notes:**
- Auto-check dynasty leagues, uncheck redraft (with "coming soon" badge)
- Show league format badges (SF = Superflex, 1QB, PPR, TEP, etc.)
- "Sync & Continue" triggers background sync of all selected leagues
- Progress bar: "Syncing Dynasty League 2026... (1/2)"
- If sync fails on one league, continue with others + show warning

### 1.4 Step 3: Intelligence Hub (Dashboard)

User lands on the full Hub with their primary league selected. League switcher in the top nav allows toggling between connected leagues.

### 1.5 Returning User Flow

```
Return Visit → Auto-detect stored username → Check if leagues need re-sync
  ├── Last sync <24 hours ago → Load cached Hub instantly
  └── Last sync >24 hours ago → Background re-sync + show cached data
```

**Key:** Never block the user with a loading screen on return visits. Show cached data immediately, update in background.

---

## 2. Dashboard Layout

### 2.1 Page Structure

The Intelligence Hub uses a **single-column scrolling layout** (mobile-first) with a persistent top bar. No sidebar — every pixel goes to content.

```
┌──────────────────────────────────────────────────────────────┐
│ 🏆 TitleRun           [League: Dynasty 2026 ▼]  [⚙️] [👤]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SECTION 1: MY TEAM SNAPSHOT                           │  │
│  │  Overall grade, position grades, team direction        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SECTION 2: 2026 SEASON OUTLOOK                        │  │
│  │  Projections, strengths, weaknesses, trade priorities  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SECTION 3: TRADE OPPORTUNITIES                        │  │
│  │  3 AI-generated recommendations with acceptance %      │  │
│  │  [Auto Trade Pitch] [Counter-Offer] [3-Way Trades]     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SECTION 4: LEAGUE POWER RANKINGS                      │  │
│  │  All teams ranked, your position highlighted           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  SECTION 5: LEAGUE INSIGHTS                            │  │
│  │  Trade activity, best partners, market conditions      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Section 1: My Team Snapshot

**Purpose:** Instant overview of where your team stands. The "report card."

```
┌──────────────────────────────────────────────────────────┐
│  MY TEAM: The Dynasty Kings                    5th / 12  │
│                                                          │
│  Overall Grade: B+                                       │
│  ████████████████████████████░░░░░░░░  73 / 100         │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ QB: A    │ │ RB: B-   │ │ WR: B+   │ │ TE: C    │   │
│  │Josh Allen│ │Weak depth│ │ Strong   │ │Need upgr.│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                          │
│  Team Direction: 🟢 Contender                            │
│  Record: 8-5 last season  |  Playoffs: 3 of last 4 yrs │
│  Age Profile: 26.3 avg (prime window)                   │
│                                                          │
│  [View Full Roster →]                                    │
└──────────────────────────────────────────────────────────┘
```

**Data Sources:**
- Overall grade: Composite of position group values from our 10-source Bayesian model
- Position grades: Sum of player values at each position vs. league average
- Team direction: Derived from age curve + value trajectory + record
- Age profile: Weighted average age (starter-weighted)

**Grade Scale:**
| Grade | Percentile | Description |
|-------|-----------|-------------|
| A+    | 95-100    | Elite, championship favorite |
| A     | 85-94     | Strong contender |
| B+    | 75-84     | Playoff team |
| B     | 65-74     | Fringe playoff |
| B-    | 55-64     | Average |
| C+    | 45-54     | Below average |
| C     | 35-44     | Needs work |
| D     | 20-34     | Rebuild mode |
| F     | 0-19      | Full teardown |

**Team Direction Logic:**
```javascript
function determineTeamDirection(team) {
  const ageScore = calculateAgeScore(team);       // 0-100 (younger = higher)
  const valueScore = team.overallGrade;            // 0-100
  const trajectoryScore = calculateTrajectory(team); // -50 to +50
  
  // Contender: High value + reasonable age + positive trajectory
  if (valueScore >= 65 && ageScore >= 40 && trajectoryScore >= 0) {
    return { direction: 'contender', emoji: '🟢', label: 'Contender' };
  }
  
  // Rebuilder: Low value OR very old roster
  if (valueScore < 45 || ageScore < 25) {
    return { direction: 'rebuild', emoji: '🔴', label: 'Rebuild' };
  }
  
  // Neutral: Everything else
  return { direction: 'neutral', emoji: '🟡', label: 'Retooling' };
}
```

### 2.3 Section 2: 2026 Season Outlook

**Purpose:** Forward-looking analysis. *"What should I expect this season, and what should I do about it?"*

```
┌──────────────────────────────────────────────────────────┐
│  📊 2026 SEASON OUTLOOK                                  │
│                                                          │
│  Projected Finish: 3rd – 5th place                      │
│  ██████████████████████████░░░░░  Playoff Prob: 72%     │
│  Championship Odds: 11%                                  │
│                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐       │
│  │ 💪 STRENGTHS        │  │ ⚠️  WEAKNESSES      │       │
│  │                     │  │                     │       │
│  │ • Elite QB (Allen)  │  │ • Thin at RB2/RB3  │       │
│  │ • WR depth (4 deep)│  │ • Aging TE (30+)   │       │
│  │ • Young core (26.3) │  │ • Weak bench WR4+  │       │
│  └─────────────────────┘  └─────────────────────┘       │
│                                                          │
│  🎯 TRADE PRIORITIES                                     │
│  1. Upgrade TE (HIGH urgency — before draft)            │
│  2. Add RB depth (MEDIUM — trade or draft)              │
│  3. Acquire future picks (LOW — if contending fails)    │
│                                                          │
│  👀 KEY PLAYERS TO WATCH                                 │
│  • Josh Allen — MVP candidate; your ceiling depends on  │
│    his health. If he misses 3+ games, playoff odds drop │
│    to 38%.                                               │
│  • [Breakout WR] — 23 years old, trending up across 7   │
│    of 10 valuation sources. Potential WR1 upside.       │
│  • [Aging RB] — Usage declining. Sell window closing.   │
│    Trade value drops ~15% by mid-season.                │
│                                                          │
│  [View Detailed Analysis →]                              │
└──────────────────────────────────────────────────────────┘
```

**Full spec in [Section 6](#6-2026-season-outlook).**

### 2.4 Section 3: Trade Opportunities

**Purpose:** The money section. Actionable trade recommendations the user can execute immediately.

```
┌──────────────────────────────────────────────────────────┐
│  🔄 TRADE OPPORTUNITIES                    [3-Way ↗]    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 1. 🎯 HIGH MATCH — 87% acceptance likelihood       │  │
│  │                                                    │  │
│  │ Trade with: The Champs (Mike)                      │  │
│  │ They need: WR upgrade    You need: RB depth        │  │
│  │                                                    │  │
│  │ ┌──────────────┐         ┌──────────────┐         │  │
│  │ │ YOU GIVE     │   ⟷    │ YOU GET      │         │  │
│  │ │ CeeDee Lamb  │         │ Bijan Robinson│         │  │
│  │ │              │         │ + 2027 2nd   │         │  │
│  │ │ Value: 8,200 │         │ Value: 8,450 │         │  │
│  │ └──────────────┘         └──────────────┘         │  │
│  │                                                    │  │
│  │ 💡 Why it works: You upgrade RB (B- → B+) while   │  │
│  │    they get their missing WR1. Both teams move up  │  │
│  │    1-2 spots in power rankings.                    │  │
│  │                                                    │  │
│  │ Your impact: 5th → 3rd  |  Their impact: 3rd → 2nd│  │
│  │                                                    │  │
│  │ [📝 View Trade Pitch]  [📊 Full Analysis]         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 2. 🟡 MEDIUM MATCH — 62% acceptance likelihood     │  │
│  │    Trade with: Playoff Push (Sarah)                │  │
│  │    [Expand for details ▼]                          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 3. 🟢 VALUE PLAY — 53% acceptance likelihood       │  │
│  │    Trade with: Young & Hungry (Dave)               │  │
│  │    [Expand for details ▼]                          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [Find More Trades →]  [Build Custom Trade →]            │
└──────────────────────────────────────────────────────────┘
```

**Recommendation Algorithm:**

```javascript
function generateTradeRecommendations(myTeam, league, limit = 3) {
  const myNeeds = identifyPositionNeeds(myTeam);
  const myExcess = identifyTradableAssets(myTeam);
  const recommendations = [];
  
  for (const opponent of league.teams) {
    if (opponent.id === myTeam.id) continue;
    
    const theirNeeds = identifyPositionNeeds(opponent);
    const theirExcess = identifyTradableAssets(opponent);
    
    // Find mutual benefit matches
    // My excess fills their need AND their excess fills my need
    for (const myAsset of myExcess) {
      for (const theirAsset of theirExcess) {
        if (fillsNeed(myAsset, theirNeeds) && fillsNeed(theirAsset, myNeeds)) {
          const trade = constructTrade(myAsset, theirAsset, myTeam, opponent);
          const acceptance = calculateAcceptanceProbability(trade, opponent);
          const mutualBenefit = calculateMutualBenefit(trade, myTeam, opponent);
          
          if (mutualBenefit.bothImprove) {
            recommendations.push({
              trade,
              opponent,
              acceptance,
              mutualBenefit,
              narrative: generateNarrative(trade, myTeam, opponent)
            });
          }
        }
      }
    }
  }
  
  // Sort by composite score: acceptance * mutual benefit
  return recommendations
    .sort((a, b) => (b.acceptance * b.mutualBenefit.score) - (a.acceptance * a.mutualBenefit.score))
    .slice(0, limit);
}
```

**Acceptance Probability Model (v1 — heuristic-based):**

Since we don't have user trade history data yet (cold start), v1 uses a heuristic model:

```javascript
function calculateAcceptanceProbability(trade, theirTeam) {
  let score = 50; // Base 50%
  
  // Value fairness (±20 points)
  const valueDiff = Math.abs(trade.yourGiveValue - trade.theirGiveValue);
  const fairnessRatio = valueDiff / Math.max(trade.yourGiveValue, trade.theirGiveValue);
  score += (1 - fairnessRatio) * 20; // Closer to fair = higher
  
  // Fills their need (±15 points)
  if (fillsTopNeed(trade.yourGive, theirTeam)) score += 15;
  
  // Doesn't weaken their strength (±10 points)
  if (!weakensStrength(trade.theirGive, theirTeam)) score += 10;
  
  // Team direction alignment (±5 points)
  // Contenders want win-now pieces, rebuilders want youth/picks
  if (alignsWithStrategy(trade.yourGive, theirTeam.direction)) score += 5;
  
  return Math.min(95, Math.max(10, Math.round(score)));
}
```

**v2 (post-launch):** Train ML model on actual accept/reject data from user base.

### 2.5 Section 4: League Power Rankings

```
┌──────────────────────────────────────────────────────────┐
│  📊 LEAGUE POWER RANKINGS                               │
│                                                          │
│  #   Team                    Score   Trend   Window     │
│  ─────────────────────────────────────────────────────   │
│  1.  🏆 The Dynasty Champs    892    ──      Contend    │
│  2.  🥈 All-In Squad          874    ↑2      Contend    │
│  3.  🥉 Playoff Push          831    ↓1      Contend    │
│  4.  📈 Young & Hungry        823    ↑3      Rising     │
│  5.  👑 The Dynasty Kings (YOU) 807  ──      Contend    │
│  6.  ⚡ The Rebuilders        789    ↓2      Retool     │
│  7.     Steady Eddies         756    ──      Neutral    │
│  8.     The Underdogs          734    ↑1      Neutral    │
│  9.     Draft Capital FC       712    ↓1      Rebuild    │
│  10.    Mid-Season Sellers     687    ──      Rebuild    │
│  11.    Future Picks Only      623    ──      Rebuild    │
│  12. 🔄 Tank Commander        543    ──      Rebuild    │
│                                                          │
│  [View by Position: QB | RB | WR | TE | Picks]          │
│  [View Full Analysis →]                                  │
└──────────────────────────────────────────────────────────┘
```

**Scoring:** Uses the same 10-source Bayesian composite values, summed across all roster players. Starters weighted 1.5x, bench 1.0x, taxi squad 0.5x.

**Position Sub-Rankings:** Click QB/RB/WR/TE tabs to see who has the best position group. Useful for identifying trade partners.

### 2.6 Section 5: League Insights

```
┌──────────────────────────────────────────────────────────┐
│  🔍 LEAGUE INSIGHTS                                     │
│                                                          │
│  📊 Trading Activity                                    │
│  • Most Active: The Champs (8 trades this offseason)    │
│  • Least Active: Tank Commander (0 trades)              │
│  • League avg: 3.2 trades/team                          │
│                                                          │
│  🤝 Your Best Trade Partners                            │
│  • All-In Squad — 67% roster compatibility              │
│    (They have RB depth, need WR — perfect match)        │
│  • Playoff Push — 54% roster compatibility              │
│  • Young & Hungry — 48% roster compatibility            │
│                                                          │
│  🔥 Hot Markets (high demand, low supply)               │
│  • WR1s — 5 teams actively need upgrades                │
│  • Young RBs — 4 teams in rebuild seeking youth         │
│                                                          │
│  ❄️ Cold Markets (low demand)                            │
│  • QBs — Most teams set; hard to move mid-tier QBs     │
│  • Aging TEs — Rebuilders avoiding 28+ players         │
│                                                          │
│  💎 Market Inefficiencies                               │
│  • [Player X] valued 15% below consensus by 3 teams    │
│  • [Player Y] sell-high window: value peaked this week  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Roster Compatibility Score:**
```javascript
function calculateRosterCompatibility(myTeam, theirTeam) {
  const myNeeds = identifyPositionNeeds(myTeam);
  const myExcess = identifyTradableAssets(myTeam);
  const theirNeeds = identifyPositionNeeds(theirTeam);
  const theirExcess = identifyTradableAssets(theirTeam);
  
  // How well do our excesses match each other's needs?
  let matchScore = 0;
  for (const asset of myExcess) {
    if (fillsNeed(asset, theirNeeds)) matchScore += asset.value;
  }
  for (const asset of theirExcess) {
    if (fillsNeed(asset, myNeeds)) matchScore += asset.value;
  }
  
  // Normalize to 0-100
  const maxPossible = sumValues(myExcess) + sumValues(theirExcess);
  return Math.round((matchScore / maxPossible) * 100);
}
```

---

## 3. Feature 1: Auto-Generated Trade Pitch

### 3.1 Overview

**What:** Generates a persuasive, personalized 3-4 sentence message explaining why a proposed trade benefits both teams. Designed to be copy-pasted into Sleeper chat.

**Why:** The #1 reason trades fail isn't value — it's communication. Managers send a raw trade offer with no context, and the recipient rejects it reflexively. A well-crafted pitch increases acceptance by framing the trade as mutually beneficial.

**Where:** "View Trade Pitch" button on any trade recommendation → opens modal.

### 3.2 Pitch Structure

Every pitch follows a proven persuasion framework:

```
[Greeting + Context]
[Their Problem — show you understand their team's weakness]
[Your Problem — establish mutual need]
[The Solution — explain how the trade fixes BOTH problems]
[Impact — concrete ranking/grade improvements]
[Soft CTA — open conversation, not hard sell]
```

### 3.3 Example Output

```
Hey Mike,

I noticed you're sitting at 10th in our power rankings and your WR room 
is thin — DeVonta Smith as your WR1 with no real WR2 behind him is going 
to be tough to contend with.

I'm in a similar spot at RB. After losing my RB2 to injury concerns, 
I've got great WRs but can't field a complete lineup.

What if we did CeeDee Lamb for Bijan Robinson + your 2027 2nd? You'd 
jump from 10th to 7th in power rankings with a legit WR1, and I'd move 
from 5th to 3rd with the RB depth I need. Our analysis shows both of us 
become stronger playoff contenders.

Thoughts?
```

### 3.4 Generation Logic

```javascript
function generateTradePitch(myTeam, theirTeam, trade, league) {
  const theirWeakness = identifyWeakestPosition(theirTeam);
  const myWeakness = identifyWeakestPosition(myTeam);
  
  const theirRanking = getLeagueRanking(theirTeam, league);
  const myRanking = getLeagueRanking(myTeam, league);
  
  const playerTheyGet = trade.yourGive[0]; // Primary piece they receive
  const playerYouGet = trade.theirGive[0]; // Primary piece you receive
  
  // Calculate post-trade impact
  const theirNewRanking = calculateRankingAfterTrade(theirTeam, trade, league);
  const myNewRanking = calculateRankingAfterTrade(myTeam, trade, league);
  
  // Build weakness description
  const theirWeaknessDesc = describeWeakness(theirTeam, theirWeakness);
  // e.g., "your WR room is thin — DeVonta Smith as your WR1 with no real WR2"
  
  const myWeaknessDesc = describeWeakness(myTeam, myWeakness);
  // e.g., "I've got great WRs but can't field a complete RB lineup"
  
  // Build trade description
  const tradeDesc = formatTradeDescription(trade);
  // e.g., "CeeDee Lamb for Bijan Robinson + your 2027 2nd"
  
  // Build impact description
  const theirImpact = describeRankingImpact(theirRanking, theirNewRanking);
  const myImpact = describeRankingImpact(myRanking, myNewRanking);
  
  // Determine team strategy context
  const strategyContext = determineStrategyContext(theirTeam, myTeam);
  // e.g., "both of us become stronger playoff contenders"
  // or "you get a young building block while I get the win-now piece I need"
  
  return {
    text: buildPitchText({
      ownerName: theirTeam.ownerName,
      theirWeaknessDesc,
      myWeaknessDesc,
      tradeDesc,
      theirImpact,
      myImpact,
      strategyContext
    }),
    metadata: {
      theirRankingChange: theirNewRanking - theirRanking,
      myRankingChange: myNewRanking - myRanking,
      valueDifference: trade.theirGiveValue - trade.yourGiveValue,
      positionsAddressed: { mine: myWeakness, theirs: theirWeakness }
    }
  };
}

function buildPitchText({ ownerName, theirWeaknessDesc, myWeaknessDesc, 
                           tradeDesc, theirImpact, myImpact, strategyContext }) {
  return `Hey ${ownerName},

I noticed you're ${theirWeaknessDesc}. 

I'm in a similar spot — ${myWeaknessDesc}.

What if we did ${tradeDesc}? ${theirImpact}, and ${myImpact}. Our analysis shows ${strategyContext}.

Thoughts?`;
}
```

### 3.5 User Customization

After generation, the pitch appears in an editable text area:
- User can modify any text before copying
- "Copy to Clipboard" button
- "Reset to Original" button
- Character count (Sleeper chat has limits)
- Save customized version for future reference

### 3.6 Pitch Variants

The system generates 1 primary pitch + 2 tone variants:

| Variant | Tone | Use When |
|---------|------|----------|
| **Standard** | Friendly, analytical | Default — works for most leagues |
| **Casual** | Bro-y, brief | League with friends, informal chat |
| **Formal** | Data-heavy, respectful | Competitive leagues, strangers |

User selects tone via toggle. Remembered per league.

---

## 4. Feature 2: Counter-Offer Generator

### 4.1 Overview

**What:** When a trade is declined (or when a user wants to negotiate), generates 3 adjusted counter-offers using different strategies.

**Why:** Most dynasty managers give up after one rejection. The counter-offer generator keeps negotiations alive by suggesting smart adjustments, teaching users that negotiation is a process.

**Where:** 
- Post-decline: "Generate Counter-Offers" button appears on declined trades
- Proactive: "Negotiate" button on any active trade
- Manual: User inputs a declined trade manually

### 4.2 Counter Strategies

```
┌──────────────────────────────────────────────────────────┐
│  📝 COUNTER-OFFER GENERATOR                              │
│                                                          │
│  Original Offer (Declined):                              │
│  You gave: Bijan Robinson → You got: CeeDee Lamb        │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Counter 1: 💰 ADD SWEETENER           71% acceptance   │
│  ┌────────────────────────────────────────────────────┐  │
│  │ You give: Bijan Robinson + 2027 2nd                │  │
│  │ You get:  CeeDee Lamb                              │  │
│  │                                                    │  │
│  │ Strategy: Close the value gap. You're asking for   │  │
│  │ ~800 more value than you're offering. Adding a     │  │
│  │ 2nd rounder makes it nearly even.                  │  │
│  │                                                    │  │
│  │ [📝 Generate Pitch] [Send Counter →]               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Counter 2: 🎯 SWAP TARGET              67% acceptance  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ You give: Bijan Robinson                           │  │
│  │ You get:  Nico Collins + Rashee Rice               │  │
│  │                                                    │  │
│  │ Strategy: If they won't move CeeDee, target their  │  │
│  │ other WRs. Collins + Rice gives you similar total  │  │
│  │ value with WR depth instead of a single star.      │  │
│  │                                                    │  │
│  │ [📝 Generate Pitch] [Send Counter →]               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Counter 3: 🔄 RESTRUCTURE              54% acceptance  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ You give: Bijan Robinson                           │  │
│  │ You get:  CeeDee Lamb + 2026 3rd                   │  │
│  │                                                    │  │
│  │ Strategy: Ask for a pick back to compensate for    │  │
│  │ Bijan's youth premium. Reframes the deal as        │  │
│  │ "you pay a small tax for a proven RB1."            │  │
│  │                                                    │  │
│  │ [📝 Generate Pitch] [Send Counter →]               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.3 Generation Logic

```javascript
function generateCounterOffers(originalTrade, myTeam, theirTeam, league) {
  const valueDiff = calculateValueDifference(originalTrade);
  // Positive = you're asking for more than you give
  // Negative = you're giving more than you ask
  
  const counters = [];
  
  // ── Strategy 1: Add Sweetener ──
  // If the original was tilted in your favor, add value to your side
  const sweetener = findBestSweetener(myTeam, Math.abs(valueDiff));
  if (sweetener) {
    const counterTrade = {
      yourGive: [...originalTrade.yourGive, sweetener],
      theirGive: [...originalTrade.theirGive],
    };
    counters.push({
      type: 'add_sweetener',
      label: '💰 Add Sweetener',
      trade: counterTrade,
      acceptance: calculateAcceptanceProbability(counterTrade, theirTeam),
      explanation: buildSweetenerExplanation(sweetener, valueDiff)
    });
  }
  
  // ── Strategy 2: Swap Target ──
  // Replace the main piece they're giving with equivalent alternatives
  const alternatives = findEquivalentPlayers(
    originalTrade.theirGive[0],
    theirTeam,
    { samePosition: false, valueRange: 0.8 } // Allow different position within 80% value
  );
  if (alternatives.length > 0) {
    const counterTrade = {
      yourGive: [...originalTrade.yourGive],
      theirGive: alternatives.slice(0, 2), // Up to 2 players
    };
    counters.push({
      type: 'swap_target',
      label: '🎯 Swap Target',
      trade: counterTrade,
      acceptance: calculateAcceptanceProbability(counterTrade, theirTeam),
      explanation: buildSwapExplanation(alternatives, originalTrade.theirGive[0])
    });
  }
  
  // ── Strategy 3: Restructure ──
  // Keep main pieces, adjust with picks/role players
  const restructured = restructureTrade(originalTrade, myTeam, theirTeam);
  if (restructured) {
    counters.push({
      type: 'restructure',
      label: '🔄 Restructure',
      trade: restructured.trade,
      acceptance: calculateAcceptanceProbability(restructured.trade, theirTeam),
      explanation: restructured.explanation
    });
  }
  
  // Sort by acceptance probability
  return counters
    .sort((a, b) => b.acceptance - a.acceptance)
    .slice(0, 3);
}

function findBestSweetener(team, targetValue) {
  // Find the smallest asset that closes the value gap
  const tradableAssets = identifyTradableAssets(team)
    .filter(a => a.value <= targetValue * 1.5 && a.value >= targetValue * 0.5)
    .sort((a, b) => Math.abs(a.value - targetValue) - Math.abs(b.value - targetValue));
  
  // Prefer draft picks over players (easier to part with psychologically)
  const picks = tradableAssets.filter(a => a.type === 'pick');
  return picks[0] || tradableAssets[0] || null;
}
```

### 4.4 Decline Tracking

To offer counter-offers, we need to know when a trade is declined:

1. **Manual entry:** User clicks "Trade Declined" on a proposed trade
2. **Sleeper webhook (future):** Listen for trade status changes (requires Sleeper partnership)
3. **Proactive:** Show counter-offer options on ANY trade, not just declined ones

**v1 approach:** Manual entry + proactive. No webhook dependency.

---

## 5. Feature 3: Multi-Team Trade Builder

### 5.1 Overview

**What:** Discovers and proposes 3-way (and eventually 4-way) trades where all participating teams improve. Unlocks trades that are impossible in 2-team scenarios.

**Why:** Many dynasty trades are blocked because Team A wants Player X from Team B, but Team B doesn't want anything from Team A. A third team can bridge the gap. This is the "galaxy brain" feature that makes TitleRun feel like magic.

**Where:** "3-Way Trades" button in Trade Opportunities section → dedicated view.

### 5.2 UI Design

```
┌──────────────────────────────────────────────────────────┐
│  🔺 MULTI-TEAM TRADE BUILDER                            │
│                                                          │
│  Found 3 three-way trade opportunities in your league:  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ TRADE 1: Total value created: +2,400 points       │  │
│  │                                                    │  │
│  │  ┌──────────┐    ┌──────────┐    ┌──────────┐    │  │
│  │  │ YOU (5th)│    │Champs(1st│    │Rebuild   │    │  │
│  │  │          │    │          │    │  (11th)  │    │  │
│  │  │Give:     │    │Give:     │    │Give:     │    │  │
│  │  │Bijan Rob.│───→│CeeDee L. │───→│T. Kelce  │    │  │
│  │  │          │    │          │    │+ 2027 1st│    │  │
│  │  │Get:      │    │Get:      │    │Get:      │    │  │
│  │  │CeeDee L. │←───│T. Kelce  │←───│Bijan Rob.│    │  │
│  │  │          │    │+ 2027 1st│    │          │    │  │
│  │  │          │    │          │    │          │    │  │
│  │  │Impact:   │    │Impact:   │    │Impact:   │    │  │
│  │  │5th → 4th │    │1st → 1st │    │11th → 9th│    │  │
│  │  │WR upgrade│    │TE + picks│    │Young RB  │    │  │
│  │  └──────────┘    └──────────┘    └──────────┘    │  │
│  │                                                    │  │
│  │ Why it works:                                      │  │
│  │ • You get WR help without giving up youth          │  │
│  │ • Champs stay #1, add elite TE + future capital    │  │
│  │ • Rebuild trades aging TE for young RB cornerstone │  │
│  │                                                    │  │
│  │ [Propose Trade] [Customize] [Generate Pitches]     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [Trade 2: +1,800 points ▼]                              │
│  [Trade 3: +1,200 points ▼]                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 5.3 Algorithm

The 3-way trade finder uses a **circular needs matching** approach:

```javascript
function find3WayTrades(myTeam, league, options = {}) {
  const { maxResults = 5, minValueGained = 500 } = options;
  const candidates = [];
  const myNeeds = identifyTopNeeds(myTeam, 3); // Top 3 needs
  const myExcess = identifyTradableAssets(myTeam);
  
  const otherTeams = league.teams.filter(t => t.id !== myTeam.id);
  
  // For each pair of other teams
  for (let i = 0; i < otherTeams.length; i++) {
    for (let j = i + 1; j < otherTeams.length; j++) {
      const teamB = otherTeams[i];
      const teamC = otherTeams[j];
      
      // Try all 3 rotations: A→B→C, A→C→B
      const rotations = [
        [myTeam, teamB, teamC],
        [myTeam, teamC, teamB]
      ];
      
      for (const [tA, tB, tC] of rotations) {
        const trade = attemptCircularTrade(tA, tB, tC);
        if (trade && trade.totalValueGained >= minValueGained) {
          candidates.push(trade);
        }
      }
    }
  }
  
  return candidates
    .sort((a, b) => b.totalValueGained - a.totalValueGained)
    .slice(0, maxResults);
}

function attemptCircularTrade(teamA, teamB, teamC) {
  // Identify what each team needs and has to offer
  const aNeed = identifyTopNeed(teamA);
  const bNeed = identifyTopNeed(teamB);
  const cNeed = identifyTopNeed(teamC);
  
  const aExcess = identifyBestTradableAt(teamA, cNeed); // A gives what C needs
  const bExcess = identifyBestTradableAt(teamB, aNeed); // B gives what A needs
  const cExcess = identifyBestTradableAt(teamC, bNeed); // C gives what B needs
  
  if (!aExcess || !bExcess || !cExcess) return null;
  
  // Construct the trade
  const trade = {
    teamA: { gives: [aExcess], gets: [bExcess] },
    teamB: { gives: [bExcess], gets: [cExcess] },
    teamC: { gives: [cExcess], gets: [aExcess] }
  };
  
  // Balance with picks if needed
  balanceTradeValues(trade);
  
  // Validate all teams improve
  const aImpact = calculateTeamImpact(teamA, trade.teamA);
  const bImpact = calculateTeamImpact(teamB, trade.teamB);
  const cImpact = calculateTeamImpact(teamC, trade.teamC);
  
  if (aImpact > 0 && bImpact > 0 && cImpact > 0) {
    return {
      ...trade,
      allTeamsImprove: true,
      totalValueGained: aImpact + bImpact + cImpact,
      impacts: {
        teamA: { before: getTeamRank(teamA), after: getTeamRank(teamA) + rankDelta(aImpact) },
        teamB: { before: getTeamRank(teamB), after: getTeamRank(teamB) + rankDelta(bImpact) },
        teamC: { before: getTeamRank(teamC), after: getTeamRank(teamC) + rankDelta(cImpact) }
      }
    };
  }
  
  return null;
}

function balanceTradeValues(trade) {
  // If one leg is lopsided, add draft picks to equalize
  const legs = ['teamA', 'teamB', 'teamC'];
  
  for (const leg of legs) {
    const giveValue = sumValues(trade[leg].gives);
    const getValue = sumValues(trade[leg].gets);
    const diff = giveValue - getValue;
    
    if (Math.abs(diff) > 500) { // Significant imbalance
      // The team getting less should receive a pick from the team getting more
      // This gets complex — v1 flags the imbalance, v2 auto-resolves
      trade[leg].imbalance = diff;
      trade[leg].suggestedBalancer = suggestPick(Math.abs(diff));
    }
  }
}
```

### 5.4 Complexity Management

3-way trades are O(n² × players²) — potentially expensive for large leagues:

| League Size | Team Pairs | Max Iterations | Strategy |
|------------|------------|----------------|----------|
| 10 teams   | 36         | ~5,000         | Brute force OK |
| 12 teams   | 55         | ~8,000         | Brute force OK |
| 14 teams   | 78         | ~12,000        | Prune early |
| 16+ teams  | 105+       | ~20,000+       | Pre-filter candidates |

**Optimization:** Pre-filter team pairs by roster compatibility score. Only attempt 3-way trades with teams that have compatibility ≥ 30%.

### 5.5 "Generate Pitches" for 3-Way

Generates individual pitch messages for EACH participant:
- Pitch to Team B (from you)
- Pitch to Team C (from you)
- Optional: Combined pitch for a league group chat

---

## 6. 2026 Season Outlook

### 6.1 Overview

The Season Outlook provides a forward-looking analysis for each team, answering: *"Where will my team finish this season, and what should I do about it?"*

### 6.2 Components

#### 6.2.1 Projected Finish

```javascript
function projectFinish(team, league) {
  // Score each team using composite value + age curve + positional scarcity
  const teams = league.teams.map(t => ({
    ...t,
    projectedScore: calculateProjectedScore(t)
  }));
  
  // Sort by projected score
  teams.sort((a, b) => b.projectedScore - a.projectedScore);
  
  const myRank = teams.findIndex(t => t.id === team.id) + 1;
  
  // Generate range based on variance
  const variance = calculateVariance(team);
  const optimistic = Math.max(1, myRank - Math.ceil(variance * 0.5));
  const pessimistic = Math.min(league.teams.length, myRank + Math.ceil(variance * 0.5));
  
  return {
    projected: myRank,
    range: { min: optimistic, max: pessimistic },
    playoffProbability: calculatePlayoffProbability(myRank, league),
    championshipOdds: calculateChampionshipOdds(team, league)
  };
}

function calculateProjectedScore(team) {
  let score = 0;
  
  // Starter value (weighted heavily — these are who you play)
  score += sumStarterValues(team) * 1.5;
  
  // Bench depth (matters for injuries/byes)
  score += sumBenchValues(team) * 0.5;
  
  // Age curve adjustment
  // Younger teams have higher ceilings, older teams have lower floors
  const avgAge = weightedAverageAge(team.starters);
  if (avgAge < 25) score *= 1.05;      // Young upside
  else if (avgAge > 28) score *= 0.95;  // Aging risk
  
  // Positional scarcity bonus
  // Elite QBs and TEs are scarce — having one is worth more than raw value suggests
  if (hasEliteQB(team)) score *= 1.03;
  if (hasEliteTE(team)) score *= 1.02;
  
  return Math.round(score);
}
```

#### 6.2.2 Strengths & Weaknesses

```javascript
function analyzeTeam(team, league) {
  const positionGroups = ['QB', 'RB', 'WR', 'TE'];
  const analysis = { strengths: [], weaknesses: [] };
  
  for (const pos of positionGroups) {
    const positionGrade = gradePositionGroup(team, pos, league);
    
    if (positionGrade.percentile >= 75) {
      analysis.strengths.push({
        category: pos,
        grade: positionGrade.letter,
        description: describeStrength(team, pos, positionGrade),
        // e.g., "Elite QB play — Josh Allen is the #2 dynasty QB"
      });
    }
    
    if (positionGrade.percentile <= 35) {
      analysis.weaknesses.push({
        category: pos,
        grade: positionGrade.letter,
        description: describeWeaknessDetail(team, pos, positionGrade),
        // e.g., "Thin at RB — only 1 startable RB, no depth behind him"
        urgency: calculateUpgradeUrgency(team, pos)
      });
    }
  }
  
  // Add non-positional factors
  const ageFactor = analyzeAgeCurve(team);
  if (ageFactor.concern) {
    analysis.weaknesses.push({
      category: 'Age',
      description: ageFactor.description,
      // e.g., "Aging roster — 4 starters over 28, value declining"
      urgency: ageFactor.urgency
    });
  }
  
  const depthFactor = analyzeBenchDepth(team);
  if (depthFactor.concern) {
    analysis.weaknesses.push({
      category: 'Depth',
      description: depthFactor.description,
      urgency: 'medium'
    });
  }
  
  // Sort by urgency
  analysis.weaknesses.sort((a, b) => urgencyRank(b.urgency) - urgencyRank(a.urgency));
  
  return analysis;
}
```

#### 6.2.3 Trade Priorities

```javascript
function generateTradePriorities(team, league) {
  const weaknesses = analyzeTeam(team, league).weaknesses;
  const direction = determineTeamDirection(team);
  
  const priorities = weaknesses.map(w => ({
    position: w.category,
    action: direction.direction === 'rebuild' ? 'sell' : 'buy',
    urgency: w.urgency,
    timing: determineTiming(w, direction),
    // e.g., "Before draft" for immediate needs, "Trade deadline" for optional upgrades
    availablePartners: findPartnersForNeed(w.category, league, team),
    suggestedTargets: findUpgradeTargets(w.category, league, team)
  }));
  
  // For contenders: also identify sell-high candidates
  if (direction.direction === 'contender') {
    const sellHighCandidates = identifySellHighPlayers(team);
    for (const player of sellHighCandidates) {
      priorities.push({
        position: player.position,
        action: 'sell-high',
        urgency: 'medium',
        timing: 'Before value drops',
        player: player,
        reason: player.sellReason
        // e.g., "Value peaked — aging RB with declining usage trends"
      });
    }
  }
  
  return priorities.sort((a, b) => urgencyRank(b.urgency) - urgencyRank(a.urgency));
}
```

#### 6.2.4 Key Players to Watch

```javascript
function getKeyPlayers(team, limit = 5) {
  const players = team.starters.map(p => ({
    ...p,
    importance: calculatePlayerImportance(p, team),
    watchReason: determineWatchReason(p, team)
  }));
  
  return players
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit)
    .map(p => ({
      player: p,
      reason: p.watchReason,
      // Categories:
      // "ceiling_driver" — your team's success depends on this player performing
      // "breakout_candidate" — young player trending up, could explode
      // "sell_window" — value declining, trade before it drops further
      // "injury_risk" — key player with injury history
      // "age_cliff" — approaching age where value typically drops sharply
      impact: calculateConditionalImpact(p, team)
      // e.g., "If Allen misses 3+ games, playoff odds drop from 72% to 38%"
    }));
}
```

#### 6.2.5 Championship Path (v2)

For contending teams, describe what needs to go right:

```
Championship Path (11% odds):
✅ Josh Allen stays healthy (season)
✅ Your RB2 produces top-24 numbers  
✅ No more than 2 starter injuries
⚡ Bonus: If [breakout WR] hits WR1 numbers → odds jump to 18%
```

### 6.3 Refresh Cadence

| Trigger | Action |
|---------|--------|
| League sync (manual or auto) | Full recalculation |
| Trade executed in league | Recalculate affected teams |
| Weekly (automated) | Background refresh all connected leagues |
| Player valuation update | Recalculate if player is on user's roster |

---

## 7. Sleeper API Integration

### 7.1 Endpoints

| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/v1/user/{username}` | GET | Resolve username → user_id | — |
| `/v1/user/{user_id}/leagues/nfl/{season}` | GET | Get user's leagues | — |
| `/v1/league/{league_id}/rosters` | GET | Get all rosters in league | — |
| `/v1/league/{league_id}/users` | GET | Get all users in league | — |
| `/v1/league/{league_id}/matchups/{week}` | GET | Get matchup results | — |
| `/v1/league/{league_id}/transactions` | GET | Get trade history | — |
| `/v1/league/{league_id}` | GET | Get league settings | — |

**Note:** Sleeper API is public, no auth required, no published rate limits. We'll implement our own rate limiting (max 10 requests/second) to be a good citizen.

### 7.2 Service Layer

```javascript
// src/services/sleeperService.js

const SLEEPER_BASE = 'https://api.sleeper.app/v1';
const RATE_LIMIT_MS = 100; // 10 requests/second max

class SleeperService {
  constructor() {
    this.lastRequestTime = 0;
  }
  
  async _fetch(path) {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < RATE_LIMIT_MS) {
      await sleep(RATE_LIMIT_MS - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
    
    const res = await fetch(`${SLEEPER_BASE}${path}`);
    
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Sleeper API error: ${res.status} on ${path}`);
    }
    
    return res.json();
  }
  
  // ── User Operations ──
  
  async getUserByUsername(username) {
    const data = await this._fetch(`/user/${encodeURIComponent(username)}`);
    if (!data) return null;
    return {
      sleeperId: data.user_id,
      username: data.username,
      displayName: data.display_name,
      avatar: data.avatar
        ? `https://sleepercdn.com/avatars/thumbs/${data.avatar}`
        : null
    };
  }
  
  async getUserLeagues(sleeperId, season = 2025) {
    // Note: Sleeper uses the season year, not the calendar year
    // 2025 season = 2025-2026 dynasty leagues
    const leagues = await this._fetch(`/user/${sleeperId}/leagues/nfl/${season}`);
    if (!leagues) return [];
    
    return leagues
      .filter(l => l.status === 'in_season' || l.status === 'pre_draft' || l.status === 'complete')
      .map(l => ({
        sleeperLeagueId: l.league_id,
        name: l.name,
        totalRosters: l.total_rosters,
        season: l.season,
        status: l.status,
        settings: {
          scoringType: l.scoring_settings?.rec >= 1 ? 'PPR' : l.scoring_settings?.rec >= 0.5 ? 'Half-PPR' : 'Standard',
          isSuperFlex: l.roster_positions?.filter(p => p === 'SUPER_FLEX').length > 0,
          isTEP: (l.scoring_settings?.bonus_rec_te || 0) > 0,
          isDynasty: l.settings?.type === 2, // 2 = dynasty
          rosterPositions: l.roster_positions
        }
      }));
  }
  
  // ── League Operations ──
  
  async getLeagueRosters(leagueId) {
    const rosters = await this._fetch(`/league/${leagueId}/rosters`);
    if (!rosters) return [];
    
    return rosters.map(r => ({
      rosterId: r.roster_id,
      ownerSleeperId: r.owner_id,
      players: r.players || [],
      starters: r.starters || [],
      reserve: r.reserve || [],
      taxi: r.taxi || [],
      settings: {
        wins: r.settings?.wins || 0,
        losses: r.settings?.losses || 0,
        ties: r.settings?.ties || 0,
        totalMoves: r.settings?.total_moves || 0,
        waiverBudgetUsed: r.settings?.waiver_budget_used || 0
      }
    }));
  }
  
  async getLeagueUsers(leagueId) {
    const users = await this._fetch(`/league/${leagueId}/users`);
    if (!users) return [];
    
    return users.map(u => ({
      sleeperId: u.user_id,
      displayName: u.display_name,
      teamName: u.metadata?.team_name || u.display_name,
      avatar: u.avatar
        ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}`
        : null
    }));
  }
  
  async getLeagueTransactions(leagueId) {
    // Get all weeks of transactions
    const allTransactions = [];
    for (let week = 1; week <= 18; week++) {
      const txns = await this._fetch(`/league/${leagueId}/transactions/${week}`);
      if (txns) {
        allTransactions.push(...txns.filter(t => t.type === 'trade'));
      }
    }
    return allTransactions;
  }
  
  // ── Full Sync ──
  
  async syncLeague(leagueId) {
    const [rosters, users, leagueInfo] = await Promise.all([
      this.getLeagueRosters(leagueId),
      this.getLeagueUsers(leagueId),
      this._fetch(`/league/${leagueId}`)
    ]);
    
    // Merge user info into rosters
    const enrichedRosters = rosters.map(roster => {
      const user = users.find(u => u.sleeperId === roster.ownerSleeperId);
      return {
        ...roster,
        ownerName: user?.displayName || 'Unknown',
        teamName: user?.teamName || 'Unknown Team',
        ownerAvatar: user?.avatar
      };
    });
    
    return {
      league: leagueInfo,
      rosters: enrichedRosters,
      users,
      syncedAt: new Date().toISOString()
    };
  }
}

module.exports = { SleeperService };
```

### 7.3 Player ID Mapping

Sleeper uses its own player IDs. We need a mapping layer:

```javascript
// Sleeper provides a bulk player endpoint (updated weekly)
// GET https://api.sleeper.app/v1/players/nfl
// Returns ~10,000 players — cache this, refresh weekly

async function loadPlayerMapping() {
  const players = await fetch('https://api.sleeper.app/v1/players/nfl').then(r => r.json());
  
  // Build lookup maps
  const byId = {};
  const byName = {};
  
  for (const [id, player] of Object.entries(players)) {
    byId[id] = {
      sleeperId: id,
      fullName: `${player.first_name} ${player.last_name}`,
      position: player.position,
      team: player.team,
      age: player.age,
      yearsExp: player.years_exp,
      status: player.status // active, inactive, injured_reserve
    };
    
    // Name-based lookup for matching with our valuation data
    const nameKey = `${player.first_name}_${player.last_name}_${player.position}`.toLowerCase();
    byName[nameKey] = byId[id];
  }
  
  return { byId, byName };
}
```

### 7.4 Caching Strategy

| Data | Cache Duration | Storage |
|------|---------------|---------|
| User info | 24 hours | Database |
| League list | 24 hours | Database |
| Rosters | 1 hour | Database + memory |
| Player mapping | 7 days | File system |
| League settings | 24 hours | Database |
| Transactions | 4 hours | Database |

**Background refresh:** Cron job runs every 4 hours for active leagues (leagues with user activity in last 7 days).

---

## 8. Frontend Architecture

### 8.1 Component Tree

```
src/
├── pages/
│   ├── Dashboard.jsx          ← NEW: Intelligence Hub (replaces old Dashboard)
│   └── ...existing pages
│
├── components/
│   └── Dashboard/
│       ├── SleeperConnect.jsx     ← Username input + league discovery
│       ├── LeagueSelector.jsx     ← Multi-league picker
│       ├── LeagueSwitcher.jsx     ← Top-nav league dropdown
│       │
│       ├── MyTeamCard.jsx         ← Team snapshot with grades
│       │   ├── PositionGrade.jsx  ← Individual position grade chip
│       │   └── TeamDirection.jsx  ← Contender/Rebuild/Retool badge
│       │
│       ├── SeasonOutlook.jsx      ← 2026 projections
│       │   ├── ProjectedFinish.jsx
│       │   ├── StrengthsWeaknesses.jsx
│       │   ├── TradePriorities.jsx
│       │   └── KeyPlayers.jsx
│       │
│       ├── TradeOpportunities.jsx ← Trade recommendations list
│       │   ├── TradeCard.jsx      ← Single recommendation card
│       │   ├── AcceptanceBadge.jsx ← % acceptance indicator
│       │   └── MutualBenefitBar.jsx ← Visual benefit indicator
│       │
│       ├── TradePitchModal.jsx    ← Feature 1: Auto-pitch
│       │   ├── PitchEditor.jsx    ← Editable text area
│       │   └── ToneSelector.jsx   ← Standard/Casual/Formal
│       │
│       ├── CounterOfferPanel.jsx  ← Feature 2: Counter-offers
│       │   └── CounterCard.jsx    ← Single counter option
│       │
│       ├── MultiTeamBuilder.jsx   ← Feature 3: 3-way trades
│       │   ├── TradeFlow.jsx      ← Visual A→B→C flow
│       │   └── TeamImpact.jsx     ← Per-team impact card
│       │
│       ├── PowerRankings.jsx      ← League standings
│       │   ├── RankingRow.jsx
│       │   └── PositionFilter.jsx ← QB/RB/WR/TE sub-rankings
│       │
│       └── LeagueInsights.jsx     ← Market intelligence
│           ├── TradeActivity.jsx
│           ├── BestPartners.jsx
│           └── MarketConditions.jsx
│
├── hooks/
│   ├── useSleeper.js          ← Sleeper connection state
│   ├── useDashboard.js        ← Dashboard data fetching
│   ├── useTradeRecommendations.js
│   └── useLeagueData.js
│
├── services/
│   └── api.js                 ← API client (fetch wrapper)
│
└── stores/
    └── leagueStore.js         ← Global league state (Zustand/Context)
```

### 8.2 State Management

```javascript
// stores/leagueStore.js (using Zustand or React Context)

const useLeagueStore = create((set, get) => ({
  // Connection state
  sleeperUsername: localStorage.getItem('sleeper_username') || null,
  isConnected: false,
  isLoading: false,
  error: null,
  
  // League data
  leagues: [],
  selectedLeagueId: null,
  
  // Dashboard data (per league)
  dashboardData: {}, // keyed by leagueId
  
  // Actions
  connect: async (username) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/sleeper/connect', { username });
      localStorage.setItem('sleeper_username', username);
      set({
        sleeperUsername: username,
        isConnected: true,
        leagues: res.leagues,
        selectedLeagueId: res.leagues[0]?.id,
        isLoading: false
      });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },
  
  selectLeague: (leagueId) => {
    set({ selectedLeagueId: leagueId });
    // Trigger dashboard data fetch if not cached
    if (!get().dashboardData[leagueId]) {
      get().fetchDashboard(leagueId);
    }
  },
  
  fetchDashboard: async (leagueId) => {
    const res = await api.get(`/dashboard/${leagueId}`);
    set(state => ({
      dashboardData: {
        ...state.dashboardData,
        [leagueId]: res
      }
    }));
  }
}));
```

### 8.3 Loading States

Each dashboard section loads independently — no full-page loading screens:

```jsx
function Dashboard() {
  const { selectedLeagueId, dashboardData } = useLeagueStore();
  const data = dashboardData[selectedLeagueId];
  
  return (
    <div className="dashboard">
      <LeagueSwitcher />
      
      {/* Each section has its own loading/error state */}
      <MyTeamCard data={data?.myTeam} />
      <SeasonOutlook data={data?.outlook} />
      <TradeOpportunities data={data?.trades} />
      <PowerRankings data={data?.rankings} />
      <LeagueInsights data={data?.insights} />
    </div>
  );
}
```

### 8.4 Responsive Design

| Breakpoint | Layout |
|-----------|--------|
| Mobile (<768px) | Single column, stacked cards, collapsed sections |
| Tablet (768-1024px) | Single column, expanded cards |
| Desktop (>1024px) | Single column with max-width 900px, centered |

No sidebar at any breakpoint. Clean, focused, content-first.

---

## 9. Backend API Routes

### 9.1 Sleeper Connection

```
POST /api/sleeper/connect
Body: { username: string }
Response: {
  userId: string,
  displayName: string,
  avatar: string | null,
  leagues: [{
    id: string,
    name: string,
    totalRosters: number,
    isDynasty: boolean,
    isSuperFlex: boolean,
    isTEP: boolean,
    season: number
  }]
}
Errors: 404 (username not found), 429 (rate limit)
```

```
POST /api/sleeper/sync-league
Body: { leagueId: string }
Response: {
  success: boolean,
  rostersCount: number,
  playersCount: number,
  syncedAt: string
}
Errors: 404 (league not found), 500 (sync failed)
```

### 9.2 Dashboard Data

```
GET /api/dashboard/:leagueId
Query: ?userId=<sleeper_user_id>
Response: {
  myTeam: {
    teamName: string,
    overallGrade: { letter: string, score: number, rank: number, total: number },
    positionGrades: {
      QB: { letter: string, description: string },
      RB: { letter: string, description: string },
      WR: { letter: string, description: string },
      TE: { letter: string, description: string }
    },
    direction: { type: string, emoji: string, label: string },
    record: { wins: number, losses: number, ties: number },
    ageProfile: number
  },
  outlook: {
    projectedFinish: { min: number, max: number },
    playoffProbability: number,
    championshipOdds: number,
    strengths: [{ category: string, description: string }],
    weaknesses: [{ category: string, description: string, urgency: string }],
    tradePriorities: [{ position: string, action: string, urgency: string, timing: string }],
    keyPlayers: [{ name: string, reason: string, impact: string }]
  },
  trades: [{
    id: string,
    opponent: { name: string, teamName: string, rank: number },
    acceptance: number,
    yourGive: [{ name: string, position: string, value: number }],
    theirGive: [{ name: string, position: string, value: number }],
    narrative: string,
    myImpact: { rankBefore: number, rankAfter: number },
    theirImpact: { rankBefore: number, rankAfter: number }
  }],
  rankings: [{
    rank: number,
    teamName: string,
    ownerName: string,
    score: number,
    trend: number,
    direction: string,
    isUser: boolean
  }],
  insights: {
    mostActiveTrader: { name: string, trades: number },
    bestPartners: [{ name: string, compatibility: number, reason: string }],
    hotMarkets: [{ position: string, teamsNeed: number }],
    coldMarkets: [{ position: string, reason: string }]
  }
}
```

### 9.3 Trade Features

```
POST /api/trades/generate-pitch
Body: { tradeId: string, tone: 'standard' | 'casual' | 'formal' }
Response: {
  pitch: string,
  metadata: {
    theirRankingChange: number,
    myRankingChange: number,
    valueDifference: number
  }
}

POST /api/trades/generate-counters
Body: { 
  originalTrade: { yourGive: string[], theirGive: string[] },
  opponentTeamId: string,
  leagueId: string
}
Response: {
  counters: [{
    type: string,
    label: string,
    yourGive: [{ name: string, value: number }],
    theirGive: [{ name: string, value: number }],
    acceptance: number,
    explanation: string
  }]
}

POST /api/trades/find-3way
Body: { leagueId: string, userId: string }
Response: {
  trades: [{
    totalValueGained: number,
    teams: [{
      teamName: string,
      gives: [{ name: string, value: number }],
      gets: [{ name: string, value: number }],
      impact: { rankBefore: number, rankAfter: number, description: string }
    }],
    narrative: string
  }]
}
```

---

## 10. Database Schema

### 10.1 Core Tables

```sql
-- ═══════════════════════════════════════════
-- SLEEPER INTEGRATION
-- ═══════════════════════════════════════════

CREATE TABLE sleeper_users (
  id SERIAL PRIMARY KEY,
  sleeper_id VARCHAR(50) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leagues (
  id SERIAL PRIMARY KEY,
  sleeper_league_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  total_rosters INTEGER NOT NULL,
  season INTEGER NOT NULL,
  status VARCHAR(50), -- 'in_season', 'pre_draft', 'complete'
  scoring_type VARCHAR(50), -- 'PPR', 'Half-PPR', 'Standard'
  is_superflex BOOLEAN DEFAULT false,
  is_tep BOOLEAN DEFAULT false,
  is_dynasty BOOLEAN DEFAULT false,
  roster_positions JSONB, -- Array of position slots
  settings JSONB, -- Full Sleeper settings blob
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE league_rosters (
  id SERIAL PRIMARY KEY,
  league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
  sleeper_roster_id INTEGER NOT NULL,
  owner_sleeper_id VARCHAR(50),
  team_name VARCHAR(255),
  players JSONB NOT NULL DEFAULT '[]',  -- Array of Sleeper player IDs
  starters JSONB NOT NULL DEFAULT '[]',
  reserve JSONB DEFAULT '[]',           -- IR slots
  taxi JSONB DEFAULT '[]',              -- Taxi squad
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  total_moves INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(league_id, sleeper_roster_id)
);

CREATE TABLE user_leagues (
  sleeper_user_id INTEGER REFERENCES sleeper_users(id) ON DELETE CASCADE,
  league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
  roster_id INTEGER REFERENCES league_rosters(id),
  is_primary BOOLEAN DEFAULT false,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (sleeper_user_id, league_id)
);

-- ═══════════════════════════════════════════
-- TEAM ANALYSIS
-- ═══════════════════════════════════════════

CREATE TABLE team_grades (
  id SERIAL PRIMARY KEY,
  roster_id INTEGER REFERENCES league_rosters(id) ON DELETE CASCADE,
  league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
  overall_score DECIMAL NOT NULL,     -- 0-100
  overall_grade VARCHAR(5) NOT NULL,  -- A+, A, B+, etc.
  overall_rank INTEGER NOT NULL,      -- Rank within league
  qb_grade VARCHAR(5),
  rb_grade VARCHAR(5),
  wr_grade VARCHAR(5),
  te_grade VARCHAR(5),
  team_direction VARCHAR(20),         -- 'contender', 'rebuild', 'neutral'
  age_profile DECIMAL,                -- Weighted average age
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(roster_id, league_id)
);

CREATE TABLE team_outlooks (
  id SERIAL PRIMARY KEY,
  roster_id INTEGER REFERENCES league_rosters(id) ON DELETE CASCADE,
  league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  projected_finish_min INTEGER,
  projected_finish_max INTEGER,
  playoff_probability DECIMAL,        -- 0-100
  championship_odds DECIMAL,          -- 0-100
  strengths JSONB,                    -- [{category, description}]
  weaknesses JSONB,                   -- [{category, description, urgency}]
  trade_priorities JSONB,             -- [{position, action, urgency, timing}]
  key_players JSONB,                  -- [{player_id, name, reason, impact}]
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(roster_id, league_id, season)
);

-- ═══════════════════════════════════════════
-- TRADE FEATURES
-- ═══════════════════════════════════════════

CREATE TABLE trade_recommendations (
  id SERIAL PRIMARY KEY,
  league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
  user_roster_id INTEGER REFERENCES league_rosters(id),
  opponent_roster_id INTEGER REFERENCES league_rosters(id),
  your_give JSONB NOT NULL,           -- [{player_id, name, position, value}]
  their_give JSONB NOT NULL,
  acceptance_probability DECIMAL,     -- 0-100
  mutual_benefit_score DECIMAL,
  narrative TEXT,
  user_ranking_impact INTEGER,        -- Change in rank (e.g., -2 = move up 2)
  opponent_ranking_impact INTEGER,
  status VARCHAR(50) DEFAULT 'generated', -- 'generated', 'viewed', 'pitched', 'accepted', 'declined'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trade_pitches (
  id SERIAL PRIMARY KEY,
  recommendation_id INTEGER REFERENCES trade_recommendations(id) ON DELETE CASCADE,
  tone VARCHAR(20) DEFAULT 'standard', -- 'standard', 'casual', 'formal'
  generated_text TEXT NOT NULL,
  customized_text TEXT,               -- User's edited version
  copied_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE counter_offers (
  id SERIAL PRIMARY KEY,
  original_recommendation_id INTEGER REFERENCES trade_recommendations(id),
  counter_number INTEGER NOT NULL,    -- 1, 2, or 3
  strategy_type VARCHAR(50) NOT NULL, -- 'add_sweetener', 'swap_target', 'restructure'
  your_give JSONB NOT NULL,
  their_give JSONB NOT NULL,
  acceptance_probability DECIMAL,
  explanation TEXT,
  status VARCHAR(50) DEFAULT 'generated',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE multi_team_trades (
  id SERIAL PRIMARY KEY,
  league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
  team_a_roster_id INTEGER REFERENCES league_rosters(id),
  team_b_roster_id INTEGER REFERENCES league_rosters(id),
  team_c_roster_id INTEGER REFERENCES league_rosters(id),
  team_a_gives JSONB NOT NULL,
  team_a_gets JSONB NOT NULL,
  team_b_gives JSONB NOT NULL,
  team_b_gets JSONB NOT NULL,
  team_c_gives JSONB NOT NULL,
  team_c_gets JSONB NOT NULL,
  total_value_gained DECIMAL,
  team_a_impact JSONB,               -- {rankBefore, rankAfter, description}
  team_b_impact JSONB,
  team_c_impact JSONB,
  narrative TEXT,
  status VARCHAR(50) DEFAULT 'generated',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- LEAGUE INSIGHTS
-- ═══════════════════════════════════════════

CREATE TABLE league_insights (
  id SERIAL PRIMARY KEY,
  league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL,  -- 'trade_activity', 'hot_market', 'cold_market', etc.
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(league_id, insight_type)
);

-- ═══════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════

CREATE INDEX idx_league_rosters_league ON league_rosters(league_id);
CREATE INDEX idx_league_rosters_owner ON league_rosters(owner_sleeper_id);
CREATE INDEX idx_trade_recommendations_league ON trade_recommendations(league_id);
CREATE INDEX idx_trade_recommendations_user ON trade_recommendations(user_roster_id);
CREATE INDEX idx_team_grades_roster ON team_grades(roster_id);
CREATE INDEX idx_team_outlooks_roster ON team_outlooks(roster_id);
CREATE INDEX idx_user_leagues_user ON user_leagues(sleeper_user_id);
```

---

## 11. Implementation Roadmap

### Week 1 (March 16-22): Foundation

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Mon | Sleeper service layer, database schema migration | `sleeperService.js` + migration files |
| Tue | Username input flow (frontend), connect API endpoint | `SleeperConnect.jsx` + `/api/sleeper/connect` |
| Wed | League sync backend, roster storage | `/api/sleeper/sync-league` working |
| Thu | Dashboard page shell, league switcher, My Team Card | Basic Dashboard rendering |
| Fri | Power Rankings section, position grading algorithm | Rankings showing for all teams |
| Sat | Multi-league support (league selector, switcher) | Can toggle between leagues |
| Sun | Deploy to staging, test with 3+ real Sleeper accounts | Staging URL with basic Hub |

**Week 1 Exit Criteria:**
- ✅ User enters Sleeper username → sees their leagues
- ✅ My Team Card shows grade + position grades
- ✅ Power Rankings shows all teams in league
- ✅ League switcher works for multi-league users

### Week 2 (March 23-29): Core Intelligence

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Mon | Trade recommendation algorithm (needs identification) | Core matching logic |
| Tue | Acceptance probability model (v1 heuristic) | Probability scores on trades |
| Wed | Trade Opportunities UI (cards with expand/collapse) | 3 recommendations rendering |
| Thu | Season Outlook backend (projections, strengths/weaknesses) | Outlook data endpoint |
| Fri | Season Outlook UI, key players section | Full Outlook rendering |
| Sat | Feature 1: Trade Pitch generator (backend + modal) | Pitch generation working |
| Sun | Testing, bug fixes, polish | All Week 2 features stable |

**Week 2 Exit Criteria:**
- ✅ 3 trade recommendations generated per league
- ✅ Season Outlook shows for user's team
- ✅ Trade Pitch generates persuasive text
- ✅ Acceptance probability on every recommendation

### Week 3 (March 30 - April 5): Advanced Features

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Mon | Feature 2: Counter-offer strategy logic | 3 counter-offer algorithms |
| Tue | Counter-offer UI (panel with options) | Counter panel rendering |
| Wed | Feature 3: 3-way trade algorithm | Circular matching working |
| Thu | 3-way trade UI (flow visualization) | Multi-team trade rendering |
| Fri | League Insights section (trade activity, partners, markets) | Insights rendering |
| Sat | Roster compatibility scoring, best trade partners | Partner matching working |
| Sun | Polish, animations, loading states | Smooth UX |

**Week 3 Exit Criteria:**
- ✅ Counter-offers generate 3 options with strategies
- ✅ 3-way trade finder returns results for test leagues
- ✅ League Insights populated
- ✅ All 5 dashboard sections complete

### Week 4 (April 6-12): Launch Prep

| Day | Tasks | Deliverable |
|-----|-------|-------------|
| Mon | E2E testing with 5+ real leagues, edge case handling | Test report |
| Tue | Mobile responsiveness, touch interactions | Mobile-ready |
| Wed | Performance optimization (lazy load, caching, skeleton screens) | <2s load time |
| Thu | Error handling, empty states, onboarding tooltips | Polished UX |
| Fri | Production deployment, smoke testing | Live on prod |
| Sat | Monitor, hot-fix any issues | Stable production |
| Sun | Launch prep (Product Hunt, social, community posts) | Launch assets ready |

**Week 4 Exit Criteria:**
- ✅ Production deployment stable
- ✅ All features working with real Sleeper data
- ✅ Mobile responsive
- ✅ <2 second load time
- ✅ Ready for April 15 launch

---

## 12. Success Metrics

### Launch Metrics (Week 1 post-launch)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Sleeper connections | 100 users | Database count |
| Dashboard load time | <2 seconds | Performance monitoring |
| Sync success rate | >95% | Error rate tracking |
| Trade pitches generated | 50+ | Database count |
| Daily active users | 25+ | Analytics |
| Error rate | <5% | Error logging |

### Growth Metrics (30 days)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Total connected users | 300+ | Database |
| Return rate (7-day) | >60% | Analytics |
| Trades proposed via platform | 200+ | Database |
| Trade pitches copied | 100+ | Click tracking |
| Multi-league users | 30% of total | Database |
| Counter-offers generated | 50+ | Database |

### Revenue Metrics (90 days)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Paying users | 500 @ $49.99/yr | Stripe |
| ARR | $25,000 | Stripe |
| Free → paid conversion | 10% | Funnel analytics |
| Monthly churn | <5% | Subscription data |
| NPS score | >50 | Survey |

### Feature Engagement (tracked per feature)

| Feature | Key Metric | Target |
|---------|-----------|--------|
| Trade Pitch | Copy rate (% who copy pitch text) | >40% |
| Counter-Offer | Counter sent rate | >25% |
| 3-Way Trades | View rate (% who click into 3-way) | >15% |
| Season Outlook | Scroll depth (% who read full outlook) | >60% |
| Power Rankings | Click-through to detail | >30% |

---

## 13. Risk Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Sleeper API changes/breaks | Low | High | Cache aggressively, graceful degradation, monitor API health |
| Sleeper rate limiting | Medium | Medium | Built-in rate limiter (100ms between requests), exponential backoff |
| Slow page load (too much data) | Medium | High | Lazy load sections, skeleton screens, background computation |
| Bad trade recommendations | Medium | High | Conservative acceptance probabilities, "experimental" badge, user feedback loop |
| Player ID mismatch (Sleeper ↔ our data) | High | Medium | Fuzzy name matching fallback, manual mapping for top 200 players |
| Cold start (no data for acceptance model) | Certain | Medium | v1 heuristic model, transition to ML after 1,000+ data points |

### Product Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Users don't trust AI trade advice | Medium | High | Show methodology, "why it works" explanations, transparency |
| Dynasty-only limits TAM | Medium | Medium | Redraft support in v2 (post-launch) |
| Sleeper-only limits TAM | Medium | Medium | ESPN/Yahoo integration in v2 |
| Users want to customize recommendations | High | Low | "Build Custom Trade" option, editable pitches |
| Feature overwhelm on first visit | Medium | Medium | Progressive disclosure, tooltips, guided tour |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Database scaling (too many leagues) | Low | Medium | Connection pooling, read replicas if needed |
| Background sync overload | Medium | Medium | Queue-based sync, priority by user activity |
| Support burden (bad data, bugs) | High | Medium | In-app feedback, error reporting, FAQ |

---

## Appendix A: Acceptance Probability Model (Detailed)

### v1: Heuristic Model

```
Base: 50%

Value Fairness:     ±20% (how close to even value)
Fills Their Need:   ±15% (does what you offer fix their weakness?)
Doesn't Hurt Them:  ±10% (does what they give away hurt a strength?)
Strategy Alignment:  ±5% (contender wants win-now, rebuilder wants youth)

Range: 10% - 95% (capped)
```

### v2: ML Model (post-launch, 1,000+ data points)

Features:
- Value differential (normalized)
- Position need score (sender and receiver)
- Team direction alignment
- Trade partner history
- League trading frequency
- Season timing
- Player age differential
- Roster depth impact

---

## Appendix B: Integration with Existing TitleRun Systems

The Intelligence Hub builds on top of existing infrastructure:

| Existing System | How Hub Uses It |
|----------------|-----------------|
| 10-source Bayesian player valuations | Powers grades, rankings, trade values |
| Trade analysis engine (`tradeAnalysisService.js`) | Extended for recommendations |
| ID normalization (`tradeEngine.js`) | Maps Sleeper IDs to our player IDs |
| TEP premium system | Adjusts TE valuations in TEP leagues |
| Draft capital system | Values draft picks in trades |
| Mutual benefit algorithm | Core of trade recommendation matching |

No existing systems need to be replaced — the Hub is an orchestration layer on top of proven engines.

---

*This specification is the complete blueprint for the League Intelligence Hub. Implementation begins Week 1 (March 16, 2026).*

**Prepared by:** Rush (TitleRun Owner/Operator)
**Reviewed by:** Jeff (Portfolio Manager)
**Approved for implementation:** 2026-03-15

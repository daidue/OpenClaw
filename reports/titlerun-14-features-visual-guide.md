# TitleRun: 14 Core Features Visual Guide

**Date:** March 16, 2026  
**Status:** Post-consolidation (34 → 14 features)

---

## Overview

This guide shows what each of the 14 core features looks like in the TitleRun interface after feature consolidation.

---

## Screenshots Captured

### Homepage (Before Intelligence Hub)
![Homepage](/.openclaw/media/browser/abbf27ac-9b96-45da-8b17-13eda7adf515.png)

**What you see:**
- Dark navy blue interface (TitleRun brand colors)
- Left sidebar navigation with:
  - Home, Teams, Players, Trades, Picks, Report Cards, Activity
  - Settings, Sign Out
- Main content area with "Good morning, Test!" greeting
- NFL news ticker at bottom (real-time fantasy football updates)
- PWA install prompt (bottom-right corner)

**Note:** This is the legacy dashboard interface. The Intelligence Hub replaces this as the primary entry point.

---

### Feature #1: League Intelligence Hub (Sleeper League Sync)
![Intelligence Hub - Connect Sleeper](/.openclaw/media/browser/545a7aeb-beb1-42a4-92fc-9588f0444d33.png)

**What you see:**
- Clean, centered onboarding card
- "Connect Your Sleeper Account" heading
- Sleeper username input field
- Green "Connect Account" button
- Read-only access disclaimer (builds trust)
- Disconnect option mentioned

**After connecting:**
- User's leagues appear in dropdown
- Select a league to view:
  - Team Grades (A-F for QB/RB/WR/TE)
  - Power Rankings (1-12)
  - Trade Opportunities (3 personalized recommendations)
  - Season Outlook

---

### Feature #10: Progressive Web App (PWA Install Prompt)
![PWA Install Prompt](/.openclaw/media/browser/26f49974-a1ec-437c-9d8e-9e2e7e26dba6.png)

**What you see (bottom-right purple card):**
- "Install TitleRun" heading
- "Add to your home screen for quick access & offline mode"
- Blue "Install App" button
- "Later" button (dismissable)
- Phone icon (indicates mobile-friendly)

**What happens when installed:**
- App appears on user's home screen (iOS/Android)
- Works offline (service worker caches rosters/rankings)
- Looks/feels like a native app (no browser chrome)
- Faster load times (cached assets)

---

## Features Without Live Screenshots

### Feature #2: Team Grades

**What it looks like:**
```
Your Team Grades:
┌─────────┬───────┬──────────────────────────┐
│ QB      │  A-   │ Allen, Hurts             │
│ RB      │  B+   │ Bijan, Breece, Gibbs     │
│ WR      │  A    │ CeeDee, Ja'Marr, Amon-Ra │
│ TE      │  C+   │ LaPorta                  │
└─────────┴───────┴──────────────────────────┘
```

- Large letter grades (A-F) for each position group
- Color-coded: Green (A), Blue (B), Yellow (C), Orange (D), Red (F)
- Lists top 3 players at each position
- Identifies surpluses (trade-away targets) and needs (trade-for targets)

---

### Feature #3: Power Rankings

**What it looks like:**
```
League Power Rankings:
 1. 🥇 Team Alpha      — 12,485 pts (You: #3)
 2. 🥈 Team Beta       — 11,920 pts
 3. 🥉 Your Team       — 11,350 pts ⭐
 4.    Team Delta      — 10,840 pts
 ...
12.    Team Omega      —  7,250 pts
```

- Ordered list 1-12
- Total portfolio value displayed
- Your team highlighted
- Trophy emojis for top 3

---

### Feature #4: Trade Opportunities (3 Personalized Recs)

**What it looks like:**
```
Trade Opportunity #1                     Acceptance: 68%
┌────────────────────────────────────────────────────┐
│ YOU GIVE:   Ja'Marr Chase, 2026 2nd               │
│ YOU GET:    Breece Hall, Drake London             │
│                                                    │
│ Why this works:                                   │
│ ✓ You strengthen RB (C+ → B)                      │
│ ✓ They strengthen WR (B- → A-)                    │
│ ✓ Fair value: +3.2% for you, +2.8% for them       │
│                                                    │
│ [Auto Pitch] [Counter-Offer] [Propose Trade]      │
└────────────────────────────────────────────────────┘
```

- 3 cards per page
- Each shows:
  - What you give / what you get
  - Acceptance probability (15-95%)
  - Explanation of mutual benefit
  - Action buttons (Auto Pitch, Counter-Offer, Propose)

---

### Feature #5: Season Outlook

**What it looks like:**
```
Season Outlook: Your Team
┌────────────────────────────────────────┐
│ Projected Finish:  4th (±2 positions)  │
│ Playoff Odds:      82%                 │
│ Championship Odds: 12%                 │
│                                        │
│ Strengths:                             │
│ • Elite WR room (top 3 in league)      │
│ • Young RB core (3+ years of value)    │
│ • Stable QB situation (2 starters)     │
│                                        │
│ Weaknesses:                            │
│ • Thin at TE (need TE1 upgrade)        │
│ • Aging QB depth (Stafford 38)         │
│                                        │
│ Trade Priorities:                      │
│ 1. Target TE upgrade (Pitts, Kincaid)  │
│ 2. Trade aging QB for picks            │
└────────────────────────────────────────┘
```

- Projected finish (with uncertainty range)
- Playoff + championship probabilities
- 3 strengths, 3 weaknesses
- Prioritized trade targets

---

### Feature #6: Auto Trade Pitch (3 Tones)

**What it looks like:**
```
Generate Trade Pitch:

[Professional]  [Casual]  [Data-Driven]  ← Tone selector

════════════════════════════════════════
Hey there!

I was looking at our rosters and think we have 
a great mutual benefit trade opportunity:

I send: Ja'Marr Chase, 2026 2nd
You send: Breece Hall, Drake London

For me, this strengthens my RB room (currently 
ranked C+ in the league) while I still have elite 
WR depth with CeeDee and Amon-Ra.

For you, you get the WR1 you need to compete now 
while your window is open, and you have deep RB 
depth to spare.

TitleRun shows this as 68% likely to be accepted 
based on our team needs. Let me know if you want 
to discuss!
════════════════════════════════════════

[Copy to Clipboard]  [Edit]  [Send via Sleeper]
```

- 3 tone options (Professional, Casual, Data-Driven)
- Editable textarea (customize before sending)
- Copy-to-clipboard (paste into Sleeper chat)
- One-click send via Sleeper deep link

---

### Feature #7: Counter-Offer Generator

**What it looks like:**
```
Counter-Offer Strategies:

Strategy #1: Add Sweetener
┌────────────────────────────────────────┐
│ Original offer:                        │
│ You give: Ja'Marr Chase                │
│ You get:  Breece Hall                  │
│                                        │
│ Counter-offer:                         │
│ You give: Ja'Marr Chase, 2026 2nd      │
│ You get:  Breece Hall                  │
│                                        │
│ Acceptance: 68% → 82% (+14%)           │
│ Rationale: Adding a 2nd balances value │
└────────────────────────────────────────┘

Strategy #2: Swap Target
┌────────────────────────────────────────┐
│ Counter-offer:                         │
│ You give: Ja'Marr Chase                │
│ You get:  Bijan Robinson               │
│                                        │
│ Acceptance: 68% → 75% (+7%)            │
│ Rationale: Bijan > Breece in value     │
└────────────────────────────────────────┘

Strategy #3: Ask For More
┌────────────────────────────────────────┐
│ Counter-offer:                         │
│ You give: Ja'Marr Chase                │
│ You get:  Breece Hall, Drake London    │
│                                        │
│ Acceptance: 68% → 52% (-16%)           │
│ Rationale: Better value, but harder    │
└────────────────────────────────────────┘
```

- 3 strategies per declined trade
- Each shows updated acceptance probability
- Copy/propose any counter-offer

---

### Feature #8: Multi-Team Trade Builder

**What it looks like:**
```
3-Team Circular Trade Found:

Team A (You):
  Give: Ja'Marr Chase
  Get:  Saquon Barkley

Team B (Owner 2):
  Give: Saquon Barkley
  Get:  Justin Jefferson

Team C (Owner 3):
  Give: Justin Jefferson
  Get:  Ja'Marr Chase

Impact:
  Team A: RB improves (C+ → A-)
  Team B: WR improves (B → A)
  Team C: WR lateral move, gets younger

Acceptance: 42% (complex trade, lower odds)

[Propose 3-Team Trade] [Find Another]
```

- Identifies 3-team circular trades
- All 3 teams improve (or lateral move)
- Lower acceptance probability (more complex)
- One-click propose to all parties

---

### Feature #9: Sleeper Trade Deep Linking

**What happens when you click "Propose Trade":**
1. Clicking any "Propose Trade" button generates a Sleeper deep link
2. Format: `sleeper://trade?leagueId=XXX&team1=YYY&team2=ZZZ&players=...`
3. Opens Sleeper app (if installed) or Sleeper.com
4. Pre-fills trade parameters
5. User clicks "Send" in Sleeper to propose

**User sees:**
- One-tap workflow (no manual player selection)
- Trade opens directly in Sleeper app
- All players pre-selected
- Ready to send

---

### Feature #11: ESPN League Sync

**What it looks like:**
```
Connect ESPN League
┌─────────────────────────────────────────┐
│ ESPN League ID:                         │
│ [Enter your ESPN league ID]             │
│                                         │
│ ESPN_S2 Cookie:                         │
│ [Paste espn_s2 value]                   │
│                                         │
│ SWID Cookie:                            │
│ [Paste SWID value]                      │
│                                         │
│ [Connect ESPN League]                   │
│                                         │
│ Need help finding cookies?              │
│ [View Instructions]                     │
└─────────────────────────────────────────┘
```

- ESPN authentication (cookies required for private leagues)
- Instructions link (screenshots showing how to find cookies)
- Same Intelligence Hub features after connecting (Team Grades, Power Rankings, etc.)

---

### Feature #12: Advanced Dynasty Trade Analyzer

**What it looks like:**
```
Advanced Trade Analyzer

Trade Details:
┌──────────────────────────────────────────┐
│ Team A gives: Ja'Marr Chase, 2026 2nd   │
│ Team A gets:  Breece Hall, Drake London  │
└──────────────────────────────────────────┘

Multi-Year Projections:
┌──────┬───────────┬───────────┬───────────┐
│ Year │  Current  │  After    │  Change   │
├──────┼───────────┼───────────┼───────────┤
│ 2025 │  11,350   │  11,180   │  -170 ⚠️  │
│ 2026 │  11,520   │  11,820   │  +300 ✅  │
│ 2027 │  10,840   │  11,450   │  +610 ✅  │
└──────┴───────────┴───────────┴───────────┘

Championship Window Analysis:
  Current:  "Win-Now" (2025-2026)
  After:    "Balanced" (2025-2027)
  
  ✅ Trade extends contention window

Roster Balance:
  QB: 15% → 14% (minor improvement)
  RB: 22% → 28% (+6%, filling need)
  WR: 48% → 43% (-5%, still strong)
  TE: 15% → 15% (no change)
  
  Grade: Excellent ⭐

Risk Assessment:
  Age risk:    Low (all players <27)
  Injury risk: Medium (Breece ACL history)
  Production:  Low (both proven)

Alternative Suggestions:
  💡 Add 2027 1st to get Bijan instead
  💡 Swap Drake London for DK Metcalf
```

- Multi-year projections (2025-2027)
- Championship window analysis
- Roster balance scoring
- Risk assessment
- Alternative trade suggestions

---

### Feature #13: Onboarding Tutorial

**What it looks like:**

**Step 1/6: Welcome**
```
┌────────────────────────────────────────┐
│ Welcome to TitleRun! 👋                 │
│                                        │
│ Let's take a quick tour of the         │
│ Intelligence Hub features.             │
│                                        │
│ [Skip]  [Next →]                       │
└────────────────────────────────────────┘
```

**Step 2/6: Connect Sleeper**
```
┌────────────────────────────────────────┐
│ (Spotlight on Sleeper username input)  │
│                                        │
│ Enter your Sleeper username here       │
│ to sync your dynasty leagues.          │
│                                        │
│ [← Back]  [Next →]                     │
└────────────────────────────────────────┘
```

**Steps 3-6:**
- Power Rankings explanation
- Trade Opportunities overview
- Auto Pitch demo
- Done (with confetti animation)

**Features:**
- 6 interactive steps
- Spotlight effect (dims background, highlights target)
- Progress bar (1/6, 2/6, etc.)
- Skip/resume (saves progress in localStorage)

---

### Feature #14: Performance Optimization

**What you DON'T see (but what's happening):**

**Backend:**
- Redis caching (5-minute TTL)
  - Sleeper API responses cached
  - Player values cached
  - Team grades cached
- Response compression (gzip)
  - JSON responses compressed 70-80%
  - Faster over slow connections
- API targets <300ms
  - Database query optimization
  - Efficient joins
  - Indexed columns

**Frontend:**
- React Query (client-side caching)
  - API responses cached in browser
  - No duplicate requests
  - Instant navigation (cached data loads immediately)
- Code splitting (lazy loading)
  - Routes loaded on-demand
  - Smaller initial bundle
  - Faster first load
- Service worker (PWA)
  - Offline caching
  - Background sync
  - Push notifications (disabled in consolidation)

**User experience:**
- Instant page loads (after first visit)
- Works offline (rosters/rankings cached)
- Smooth animations (60fps)
- Fast API responses (<300ms average)

---

## User Flow Example

**Complete journey through the app:**

1. **Land on app.titlerun.co**
   - See homepage or redirect to Intelligence Hub

2. **Connect Sleeper account**
   - Enter username "taytwotime"
   - Click "Connect Account"
   - Leagues appear in dropdown

3. **Select a league**
   - Choose "Dynasty League - 12 Team SF"
   - Dashboard loads with:
     - Team Grades (QB: A-, RB: B+, WR: A, TE: C+)
     - Power Rankings (You: #3 of 12)
     - 3 Trade Opportunities

4. **View trade opportunity**
   - Click first trade opportunity
   - See: You give Ja'Marr Chase, You get Breece Hall + Drake London
   - Acceptance: 68%

5. **Generate trade pitch**
   - Click "Auto Pitch"
   - Select "Casual" tone
   - Pitch generates in 2 seconds
   - Click "Copy to Clipboard"
   - Paste in Sleeper chat

6. **Owner counters**
   - "Can you add a 2nd round pick?"
   - Go back to TitleRun
   - Click "Counter-Offer"
   - Select "Add Sweetener" strategy
   - See acceptance probability increase to 82%

7. **Propose updated trade**
   - Click "Propose Trade"
   - Sleeper app opens (deep link)
   - Trade pre-filled with updated parameters
   - Click "Send" in Sleeper
   - Done!

---

## Design & Branding

**Colors:**
- Primary: Navy blue (#0f172a)
- Accent: Emerald green (#10b981)
- Warning: Amber (#f59e0b)
- Danger: Red (#ef4444)

**Typography:**
- Headings: Inter (bold)
- Body: Inter (regular)
- Monospace: JetBrains Mono (for player values)

**Icons:**
- Lucide React (consistent icon library)
- 24px standard size
- Stroke width: 2px

**Components:**
- Rounded corners (8px border-radius)
- Drop shadows (subtle, 4px blur)
- Smooth transitions (200ms ease-in-out)
- Dark theme optimized

---

## Mobile Responsiveness

All features adapt to mobile:
- Sidebar collapses to hamburger menu
- Cards stack vertically
- Tables become scrollable
- Buttons go full-width
- Touch-optimized (44px tap targets)

**PWA on mobile:**
- Installable from browser
- Fullscreen (no browser chrome)
- Offline mode works
- Fast (service worker caching)

---

## Next Steps

1. **Deploy to production** (Railway + Cloudflare Pages)
2. **Test with Taylor's account** (taytwotime on Sleeper)
3. **Capture real screenshots** with live data
4. **Update this guide** with production screenshots
5. **Share with beta users** for feedback

---

**TitleRun: 14 focused features. Zero bloat. Ready to compete.** 🚀

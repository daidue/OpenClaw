# Information Architecture & Content Audit

**Date:** 2026-03-08
**Auditor:** Info Architect (Opus 4.6)
**Target:** https://app.titlerun.co
**Pages Audited:** Login, Signup, Forgot Password, Terms, Privacy, Dashboard/Home, Players, Player Detail, Trade Calculator, Trade Finder, Trade Builder, Trade History, Report Cards, Teams, Activity, Settings, Help Center (+ all 6 sub-topics)

---

## Executive Summary

TitleRun has a **solid feature set** with good visual design and a clear navigation structure. The biggest content problems are:

1. **Broken demo login** — the login page promises "Use any email and password to sign in" but the backend returns 401. This is the #1 content trust issue.
2. **Values lack units/context** — "9,871 pts" is used everywhere but what a "point" means is never explained. A newbie has zero frame of reference.
3. **Jargon assumes dynasty FF expertise** — terms like "SF," "TEP," "1QB," "TE+," "TE++," "TE+++" are unexplained toggles across the app.
4. **Help pages are thin** — each help topic is 2-3 paragraphs with no screenshots, no worked examples, and no deep explanations.
5. **Empty state copy is weak** — when features require Sleeper connection, the messaging is generic rather than showing what the user would get.
6. **Onboarding is confusing** — the dashboard shows both an onboarding modal AND a "Welcome to TitleRun" connect flow, competing for attention.

**Overall Content Quality: 6/10** — functional but assumes too much knowledge. A dynasty FF veteran will navigate fine; a newcomer or casual player will bounce.

---

## Critical Content Issues

### 1. **Broken Demo Login Promise**
- **Location:** `/login` page, footer text
- **Problem:** Text reads `"Demo: Use any email and password to sign in"` but the API returns 401 Unauthorized. Users who try the demo will see... nothing. No error message appears — the form just silently fails.
- **Impact:** Every potential user who tries the demo mode. Complete trust violation.
- **Fix:** Either (a) implement actual demo mode in the backend, or (b) remove the demo text immediately. If keeping demo, show a clear error toast on failed login.

### 2. **"Points" Value System Completely Unexplained**
- **Location:** Player pages, Teams, Dashboard, Trade Calculator — everywhere
- **Problem:** Values like "9,871 pts" or "0 pts" appear throughout with no explanation of scale, methodology, or meaning. The FAQ says "TitleRun uses our proprietary valuation algorithm" but never explains the scale. Is 9,871 the max? What's average? What's the range?
- **Impact:** Every user. The entire product is built on these values, and they're opaque.
- **Fix:** Add a "How Values Work" page explaining: the scale (0-10,000+), what the number means, how it's calculated at a high level, and what "Elite" / tier labels mean. Show this on first encounter via tooltip.

### 3. **Silent Login Failure — No Error Messages**
- **Location:** `/login` page
- **Problem:** When login fails (401 from API), no error message is shown to the user. The form just resets silently. Users have no idea what went wrong.
- **Impact:** Every user who mistyps credentials or tries the broken demo.
- **Fix:** Show a clear error toast: "Invalid email or password. Please try again."

### 4. **Settings Page Shows "Member since Invalid Date"**
- **Location:** `/settings` → Profile section
- **Problem:** The profile section displays "Member since Invalid Date" — a raw JavaScript error leaking into the UI.
- **Impact:** Every user who visits settings. Looks broken/amateur.
- **Fix:** Handle null/undefined dates gracefully. Show "Member since [date]" or hide the field entirely if no date is available.

### 5. **Onboarding Collision — Two Competing Welcome Flows**
- **Location:** `/dashboard`
- **Problem:** The dashboard simultaneously shows: (a) an onboarding wizard modal ("Step 1 of 8: Welcome — Compete with your friends"), AND (b) the main dashboard content with a separate "Welcome to TitleRun! Connect your Sleeper account" flow. Two onboarding systems fighting for attention.
- **Impact:** New users are confused about which flow to follow.
- **Fix:** Pick one onboarding path. The modal wizard OR the inline connect flow — not both. The wizard is more engaging; use it exclusively.

---

## Jargon & Terminology

### Unexplained Terms Found

| Term | Location | Explanation Provided? |
|------|----------|----------------------|
| **1QB** | Trade Calculator, Player Rankings | ❌ No — toggle button, no tooltip |
| **SF (Superflex)** | Trade Calculator, Player Rankings | ❌ No — toggle button, no tooltip |
| **TEP** | Player Rankings toggle | ❌ No |
| **TE+, TE++, TE+++** | Trade Calculator | ❌ No — "TE Premium disabled" hint appears but doesn't explain what TE premium means |
| **PPR / Half PPR / Standard** | Trade Calculator, Player Stats | ❌ No — critical scoring format, never defined |
| **Dynasty** | Throughout | ❌ Never defined; the word "dynasty" appears in signup subtitle "Start managing your dynasty portfolio" with zero context |
| **pts** | All value displays | ❌ No — what unit? Fantasy points? Proprietary score? |
| **Composite values** | Trade Calculator footer | ❌ "TitleRun composite values" — composite of what? |
| **Exponential curve** | Trade Calculator footer | ❌ "adjusted values with exponential curve for accuracy" — meaningless to users |
| **SP (Season Points)** | Dashboard | ❌ Gamification metric, never explained |
| **XP** | Sidebar user badge "Gold Tier (650 XP)" | ❌ Experience points for what? What earns XP? |
| **Elite** | Player pages (value tier) | ❌ No explanation of tier thresholds |
| **Deep Offseason** | Dashboard badge | Partially — emoji ❄️ gives hint but no text explanation |
| **Competing timeline** | Help pages | ❌ Used in help text but never defined |
| **Roster construction** | Help pages | ❌ Assumed knowledge |

### Recommendations
1. **Add tooltips to every toggle** — 1QB, SF, PPR, TE+ should all have hover/tap explanations
2. **Create a glossary page** at `/help/glossary` defining all terms
3. **Define "pts" on first encounter** — a small info icon next to the first value display
4. **Add an explainer banner** to the Trade Calculator explaining scoring format impact
5. **Define "dynasty" in the signup flow** — "Dynasty fantasy football leagues where you keep your players year-to-year"

---

## Copy Issues

### Vague CTAs
| CTA | Location | Problem | Better Version |
|-----|----------|---------|----------------|
| "Connect Platform" | Teams, Dashboard | Connect which platform? What happens? | "Connect Your Sleeper League" |
| "Let's Set Up Your Experience" | Onboarding modal | Vague — set up what? | "Connect Your League in 20 Seconds" |
| "Go to Settings" | Report Cards, Trade Builder | Settings is broad — why? | "Connect Sleeper to See Your Report Cards" |
| "View All →" | Dashboard sections | View all what? | "View All Achievements →" |
| "Contact Support" | Help pages | Good, but only option is email (mailto:) — no in-app support | Add expected response time: "Contact Support (usually within 24h)" |

### Confusing Labels
| Label | Location | Problem | Suggestion |
|-------|----------|---------|------------|
| "Portfolio Manager" | Sidebar subtitle under TitleRun | Sounds like a finance app, not FF | "Dynasty Portfolio Manager" or "Dynasty Tools" |
| "Side 1" / "Side 2" | Trade Calculator | Impersonal | "Your Side" / "Their Side" or "Team A" / "Team B" |
| "Off" | TE Premium toggle | "Off" is unclear — off what? | "No TE Premium" |
| "Gold Tier 🥇" | User badge | No context for what tiers exist or how to progress | Add "Next: Platinum at 1000 XP" |
| "Refresh" | Dashboard | Refresh what? Data? Page? | "Refresh Values" |
| "Best League Rank" | Teams page stat card | Shows "-" with no explanation | "Best League Rank: Connect a league to see" |

### Typos/Grammar
| Location | Issue |
|----------|-------|
| Dashboard | "See who's rising and falling before your leaguemates do" — sentence trails off, missing period or feels incomplete |
| Signup placeholder | "John Dynasty" as placeholder name — forced/cheesy, may confuse |
| News ticker | "On even of free agency" (from Pro Football Talk) — not TitleRun's content, but it appears in-app |
| Dashboard | "0.0%" shown for trend with no label — 0.0% of what? |

### Good Copy (Worth Noting)
- Help Center intro: "Everything you need to compete with your league" — clear, motivating
- Getting Started: "Getting started with TitleRun takes less than 10 seconds" — specific, low-friction
- Trade Engine help: "No more guessing what they'd want" — speaks to real pain point
- FAQ answers are concise and honest ("TitleRun is free forever")

---

## Data Presentation

### Missing Context
| Data Point | Location | Problem |
|-----------|----------|---------|
| "9,871 pts" | Player value | No scale context. Is 10,000 the max? What's average? |
| "+30.0%" for Top Undervalued | Player Rankings | Every "Top Undervalued" player shows exactly "+30.0%" — likely a cap/bug, not real data |
| "-0.5% Week Over Week" | Player page | No context for what's normal variance vs. concerning |
| "100th Percentile" | Player page | Good — this provides context! More of this. |
| "0 pts / 0.0%" | Dashboard (no teams) | Shows zeros instead of helpful empty state |
| "Trade fairness" concept | Trade Calculator | Mentioned but method never explained |
| "High Impact" badge | Activity/News | Some news items tagged "High Impact" — impact on what? Dynasty value? |

### Unclear Visualizations
| Element | Location | Issue |
|---------|----------|-------|
| Portfolio Value History | Dashboard | Shows "No data available" with empty chart — no sample/demo data |
| Position Breakdown | Dashboard | Shows empty pie/bars with "0 pts" — confusing layout with no data |
| Value History Chart | Player page | Chart works well but Y-axis labels like "9.3K" could say "9,300 pts" |

### Good Data Presentation (Worth Noting)
- Player page "Dynasty Outlook" section is excellent — age profile, peak years, decline timeline, hold recommendation
- "Similar Players" section with ±25% value comparison is useful
- Career stats table with season-by-season breakdown is clean
- Value trend percentages (WoW, MoM, Season) are well-structured

---

## Content Gaps

### Questions Users Will Have (Unanswered)
1. **What does a "point" represent?** — The entire value system is opaque
2. **How are values calculated?** — FAQ says "proprietary algorithm" with zero transparency
3. **How often do values update?** — Never mentioned anywhere
4. **What's the difference between 1QB and Superflex?** — Critical scoring distinction, never explained
5. **What is TEP / TE Premium?** — Toggle exists with no explanation
6. **How do trade grades work?** — "How Trade Grades Work" section exists as a collapsible but content wasn't visible
7. **What platforms besides Sleeper are coming?** — FAQ says "working on adding more" with no timeline
8. **What does "Elite" tier mean?** — Player value tier labels (Elite, etc.) have no defined thresholds
9. **What earns XP?** — Gamification system is visible but rewards/earning criteria are hidden
10. **How is "High Impact" news determined?** — Some activity items are tagged "High Impact" with no explanation
11. **What does the color coding on news items mean?** — 🔴 CRITICAL, 🟠 HIGH, 🟡 MEDIUM — labels exist but aren't explained in-app
12. **What are Season Points (SP)?** — Dashboard shows "SP" and "Season Points" with zero explanation

### Missing Documentation
| Feature | Gap |
|---------|-----|
| Trade Calculator methodology | "Exponential curve for accuracy" — needs a real explanation |
| Value sources | "Composite values" from where? KTC? FantasyCalc? Own model? |
| Gamification system | XP, Tiers, Season Points, Achievements — none documented |
| News feed sources | Where does news come from? How is priority assigned? |
| Draft Capital feature | Listed in routes but not in sidebar nav — hidden or incomplete? |
| AI Chat feature | Listed in routes but not in sidebar — is it available? |
| Strategy feature | Listed in routes but not in sidebar |
| Trophy Case | Listed in routes, appears in dashboard but has no help doc |
| Hall of Shame | Listed in routes — what is it? League punishment feature? |
| Punishment feature | Listed in routes — completely undocumented |

---

## Information Hierarchy

### Priority Issues

| Issue | Severity |
|-------|----------|
| **News ticker dominates every page** — scrolling marquee at bottom of every view takes attention from core features | HIGH — distracting on player analysis pages |
| **Sidebar shows "Portfolio Manager" subtitle** — takes prime real estate but adds little value | LOW |
| **Onboarding modal overlays dashboard content** — can't see the actual product | HIGH — new users can't preview what they're signing up for |
| **"No teams connected" empty states are generic** — missed opportunity to show product value | MEDIUM |
| **Player Rankings page has great info hierarchy** — Top Risers, Top Undervalued, Top Fallers at top, then full table | ✅ GOOD |
| **Trade Calculator layout is clear** — Side 1 vs Side 2 with search and draft picks | ✅ GOOD |
| **Help Center card layout is scannable** — 6 topics with icons and descriptions | ✅ GOOD |

### Navigation Structure Assessment
**Sidebar navigation is well-organized:**
- Home → Teams → Players → Trades (expandable) → Report Cards → Activity → Settings → Sign Out
- Trade sub-nav (Finder, Builder, History) is logical
- Missing: Help is not in the main sidebar (only accessible via dashboard "Back to Dashboard" link)

**Problem:** Help Center is not discoverable from the sidebar. Users have to know the URL or find a link somewhere.

---

## Help & Guidance

### Help Page Quality Assessment

| Help Topic | Content Quality | Actionable? | Has Screenshots? | Has Examples? |
|-----------|----------------|-------------|-------------------|---------------|
| Getting Started | Good — clear 4-step process | ✅ Yes | ❌ No | ❌ No |
| Trade Engine | Thin — 2 paragraphs | Partially | ❌ No | ❌ No |
| Report Cards | Thin — 2 paragraphs | Partially | ❌ No | ❌ No |
| Player Rankings | Thin — 2 paragraphs | Partially | ❌ No | ❌ No |
| Leaguemates | Thin — 2 paragraphs | Partially | ❌ No | ❌ No |
| FAQ | Decent — 5 Q&As | ✅ Yes | ❌ No | ❌ No |

**Overall:** Help pages read like marketing copy, not user guides. They describe features in abstract terms but don't show HOW to use them.

### Tooltips
- No tooltips observed on any interface elements during audit
- Toggle buttons (1QB, SF, PPR, TEP) have no hover explanations
- Value displays have no info icons

### Error Messages
- Login failure: **No error shown** (critical)
- Empty states: Generic "connect your account" messages (adequate but could be better)
- "Invalid Date" in settings: Raw error leaking (critical)

---

## Terminology Consistency

### Inconsistent Usage
| Concept | Variant 1 | Variant 2 | Location |
|---------|-----------|-----------|----------|
| Feature name | "Trade Engine" (Help) | "Trade Finder" / "Trade Builder" (Sidebar) | Help vs. Navigation — these seem like different features but Help only mentions "Trade Engine" |
| Scoring | "PPR" (Trade Calculator) | Not mentioned elsewhere | Inconsistent visibility |
| Connection action | "Connect Platform" (Teams) | "Connect Sleeper" (Home) | Should be consistent |
| Value label | "TitleRun Value" (Player page) | "pts" (everywhere else) | Inconsistent — sometimes "TitleRun Value 9,871" sometimes "9,871 pts" |
| Sub-app name | "Trade Calculator" (page title) | Not in sidebar nav — sidebar has Trade Finder, Builder, History | Calculator seems to be the old name for the page at `/trade-calculator` |
| Tagline | "Portfolio Manager" (sidebar) | "Dynasty Portfolio" (signup) | Minor inconsistency |

### Abbreviations Without Expansion
- **WR, QB, RB, TE** — Position abbreviations (standard FF, acceptable)
- **SF** — Superflex (not standard outside dynasty FF)
- **TEP** — Tight End Premium (very niche)
- **PPR** — Points Per Reception (not expanded anywhere)
- **SP** — Season Points (TitleRun-specific, never defined)
- **XP** — Experience Points (never defined)
- **KTC, FC** — Not visible but referenced in codebase ("composite values")

---

## Recommendations (Prioritized)

### P0 — Fix Before Launch
1. **Fix or remove demo login text** — "Use any email and password to sign in" is a broken promise
2. **Show error messages on login failure** — silent fails destroy trust
3. **Fix "Invalid Date" in Settings** — raw error in UI
4. **Add tooltips to all scoring format toggles** (1QB, SF, PPR, TEP, TE+)

### P1 — Fix Before Marketing Push
5. **Create "How Values Work" page** — explain the point system, scale, methodology, and tiers
6. **Add Help to sidebar navigation** — currently hidden/undiscoverable
7. **Resolve onboarding collision** — pick one flow (modal wizard OR inline), not both
8. **Add a glossary** at `/help/glossary` defining all dynasty FF terms
9. **Fix "+30.0%" on all "Top Undervalued" players** — appears to be capped/bugged
10. **Improve empty state copy** — show previews/examples of what features look like with data

### P2 — Improve Before Scaling
11. **Add screenshots to help pages** — show don't just tell
12. **Explain the news ticker priority system** — what do 🔴 🟠 🟡 mean?
13. **Document gamification system** — XP, tiers, Season Points, achievements
14. **Clarify "Trade Engine" vs "Trade Finder/Builder"** terminology
15. **Add info icons (ⓘ) next to first instance of values** — "What does this number mean?"
16. **Make news ticker dismissible with persistence** — it dominates valuable screen space
17. **Add contextual "What's good?" benchmarks** to player stats — e.g., "Above average WoW change"
18. **Expand FAQ** — add questions about values, scoring formats, update frequency, and privacy

### P3 — Polish
19. **Replace "Side 1 / Side 2" with "Your Team / Their Team"** in Trade Calculator
20. **Show tier progression** on user badge — "Next: Platinum at 1000 XP"
21. **Add "last updated" timestamps** to player values
22. **Rename "Portfolio Manager" subtitle** to "Dynasty Portfolio Manager" for clarity
23. **Replace "John Dynasty" signup placeholder** with a real-sounding name

---

## Appendix: Page-by-Page Notes

### Login Page (`/login`)
- Clean visual design, good branding
- "Welcome Back / Sign in to your account" — clear purpose
- Password visibility toggle — good UX
- "Forgot password?" — present and working (links to reset flow)
- **CRITICAL:** Demo text broken, no error handling

### Signup Page (`/signup`)
- "Start managing your dynasty portfolio" — assumes knowledge of "dynasty"
- "John Dynasty" placeholder — too cute, potentially confusing
- Feature badges at bottom (Track Values, Multi-Platform, Trade Alerts) — nice but no descriptions
- Terms/Privacy links present — good
- Create Account button disabled until terms checked — correct UX pattern

### Forgot Password (`/forgot-password`)
- Clear, simple, well-designed
- "Need help? Contact Support" — good fallback
- "Send Reset Link" — clear CTA

### Terms of Service (`/terms`)
- Comprehensive, well-structured, 14 sections
- **Good:** Section 5 explicitly states values are not monetary — "No currency symbols or financial guarantees are implied"
- Mentions Sleeper specifically as third-party integration
- Contact email: support@titlerun.co

### Privacy Policy (`/privacy`)
- Comprehensive, 13 sections
- "We DO NOT sell your personal data" — prominently stated (good)
- Mentions cookies, third-party platform data access, GDPR-like rights
- Two contact emails: privacy@titlerun.co and support@titlerun.co

### Dashboard (`/dashboard`)
- "Welcome back, Manager!" — friendly, good tone
- "Here's your dynasty portfolio overview" — clear purpose
- ❄️ Deep Offseason badge — seasonal context is smart
- Empty state with "Connect Platform" is functional but bland
- Onboarding wizard competes with main content
- Season Points, XP, Trophy Case — gamification present but unexplained

### Player Rankings (`/players`)
- "Track value movements and compare player values across sources" — good subtitle
- Week Over Week Movers (Top Risers, Top Undervalued, Top Fallers) — great info hierarchy
- Scoring format toggles (1QB/SF, Standard/PPR) present but unexplained
- All "Top Undervalued" players show exactly "+30.0%" — suspicious data

### Player Detail (e.g., Ja'Marr Chase)
- **Best content in the app** — rich, well-structured
- Breadcrumb navigation (Home > Players > Ja'Marr Chase) — good
- Value displayed prominently with tier label ("Elite")
- Rankings (Overall #2, WR #1) — clear context
- Value change metrics (WoW, MoM, Season, Expected) — excellent
- Chart with time range selectors — functional
- Season stats table — clean, sourced ("Stats from Pro Football Reference")
- Dynasty Outlook section — age curve, peak years, hold recommendation
- Similar Players section — useful comparison
- Value percentile — "100th Percentile among all dynasty assets" — great context
- "TitleRun values aggregate top dynasty platforms" — first mention of methodology!

### Trade Calculator (`/trade-calculator`)
- "Evaluate trade fairness using TitleRun values" — clear
- Side 1 / Side 2 layout — clean but impersonal
- "How Trade Grades Work" collapsible section — content not captured (collapsed)
- Footer text: "TitleRun composite values. Trade grades use adjusted values with exponential curve for accuracy" — jargon-heavy, unhelpful

### Trade Finder (`/trade-finder`)
- "Select a league to find trades" — clear but only works with connected leagues
- Empty state shows 🍵 emoji (tea?) — unclear symbolism

### Trade Builder (`/trade-builder`)
- "Select League" dropdown — clear
- "No leagues found" empty state well-handled
- "Connect your Sleeper account to start building trades" — good guidance
- Link to Trade Finder → — good cross-navigation

### Report Cards (`/report-cards`)
- "Connect Your Sleeper Account" — clear gate
- "Go to Settings and connect your Sleeper account first. Then come back here to see report cards for your drafts and trades." — helpful instructions

### Teams (`/teams`)
- "Manage all your dynasty fantasy football teams" — good subtitle
- Stat cards (Total Teams, Combined Value, Average Team Value, Best League Rank) — good framework
- Search and filter (All Platforms, Sort by Value) — good for power users
- Empty state is clean

### Activity (`/activity`)
- "Stay informed with alerts and news" — clear purpose
- Tab navigation (All Activity, Alerts Only, News) — good
- Category filters (All, Trades, Injuries, Value, Achievements) — good
- News articles with source, time, category tags — well-structured
- "High Impact" badge — present but undefined

### Settings (`/settings`)
- Tabs: Profile, Connected Accounts, League Management, Display, Notifications, Privacy, About
- "Re-run App Tour" option — good for returning users
- **BUG:** "Member since Invalid Date"
- "Email changes are not yet supported" — honest, but feels incomplete

### Help Center (`/help`)
- 6 topic cards with icons — scannable
- "Contact Support" fallback — present on every page
- Topics cover the core features
- **Missing:** No glossary, no video tutorials, no "How values work"
- **Missing:** Not linked from sidebar navigation

---

*Audit complete. 20+ pages reviewed. 23 actionable recommendations.*

# TitleRun Dashboard & Data Audit Report
**Date:** 2026-03-08 17:37 EDT  
**Tester:** QA Dashboard & Data Expert (subagent)  
**Environment:** Production — https://app.titlerun.co  
**Account:** "User" / Gold Tier 🥇 (650 XP) — NO Sleeper connected  

---

## 🔴 CRITICAL FINDING: Dashboard Has Been Completely Replaced

**The entire original dashboard described in the task scope NO LONGER EXISTS.** The following components are ALL absent from the current production app:

| Original Component | Status | Notes |
|---|---|---|
| Team selector dropdown | ❌ REMOVED | Not present anywhere on Home |
| 30-Day Trend chart | ❌ REMOVED | No chart component exists |
| Team Health card | ❌ REMOVED | No health score visible |
| Action buttons (Analyze Trade, Report Card, Leaguemates) | ❌ REMOVED | Replaced with different UX |
| Alert: Value Spike cards | ❌ REMOVED | Not present |
| League News feed | ❌ REMOVED | Replaced with news ticker |
| Upcoming Events | ❌ REMOVED | Not present |
| Trophy Case | ❌ REMOVED | Not present |
| Quick Stats | ❌ REMOVED | Not present |

**The Home page (`/`) now shows two possible views:**
1. **Desktop view:** Player Rankings page with Week Over Week Movers + All Player Rankings table
2. **Welcome/Onboarding:** "Welcome to TitleRun! Connect your Sleeper account" prompt

---

## Issues Found

### 1. 🔴 CRITICAL — "Top Undervalued" Shows Identical +30.0% For ALL Players
**Severity:** CRITICAL  
**Location:** Home → Player Rankings → "Top Undervalued" section

ALL 10 players in the "Top Undervalued" column show exactly `+30.0%`:
- Malik Nabers +30.0%
- Isaiah Bond +30.0%
- Ollie Gordon +30.0%
- Braelon Allen +30.0%
- Elic Ayomanor +30.0%
- Elijah Arroyo +30.0%
- Mason Taylor +30.0%
- Oronde Gadsden +30.0%
- Harold Fannin +30.0%
- Kaleb Johnson +30.0%

**This is clearly hardcoded/capped.** Real undervalued percentages would vary. Looks like there's a max cap of 30% applied uniformly, making this section misleading.

### 2. 🔴 CRITICAL — "Trend" Column Shows "-" For ALL Players in Rankings Table
**Severity:** CRITICAL  
**Location:** Home → All Player Rankings table → "Trend" column

Every single player in the rankings table (all 20 visible rows checked) shows `-` in the Trend column. No trend data is being populated. This column exists but is completely non-functional.

### 3. 🟠 HIGH — Player Value Discrepancy Between Rankings and Detail Page
**Severity:** HIGH  
**Location:** Rankings table vs Player Detail page

Ja'Marr Chase shows:
- **Rankings table:** 9,928 pts
- **Player detail page:** 9,872 pts (difference of 56 pts)

Values should be consistent across views. This suggests different data sources or caching issues.

### 4. 🟠 HIGH — Navigation Opens Excessive Duplicate Tabs
**Severity:** HIGH  
**Location:** All navigation throughout app

Clicking sidebar navigation links spawns NEW browser tabs instead of navigating within the current tab. During testing, **26 tabs accumulated**, including:
- 5x Dashboard (`/`) tabs
- 5x Settings tabs
- 3x Players tabs
- 8x `about:blank` tabs
- Multiple duplicates

This will cause massive memory consumption and confuse users. Each Brave renderer process uses ~300MB.

### 5. 🟠 HIGH — Multiple Pages Redirect to Welcome Screen Without Explanation
**Severity:** HIGH  
**Location:** Teams, Activity, Report Cards pages (when no Sleeper connected)

When a user navigates to these pages without a Sleeper connection:
- `/teams` → Shows "My Teams" with 0 teams but NO guidance to connect Sleeper on that page
- `/activity` → Silently redirects to Welcome/onboarding (URL stays as `/activity` but content is the home welcome screen)
- `/report-cards` → Appears to redirect to Trade Finder page

**Expected:** Each page should show a contextual empty state explaining why content isn't available and a direct link to connect Sleeper.

### 6. 🟡 MEDIUM — User Profile Shows Generic "User" Name
**Severity:** MEDIUM  
**Location:** Sidebar user profile

The account displays:
- Name: "User" (generic placeholder)
- Tier: "Gold Tier 🥇"
- XP: 650 XP

"User" appears to be a default/placeholder name. If this is a real authenticated account, it should show the actual username or prompt the user to set one.

### 7. 🟡 MEDIUM — XP/Gamification System (650 XP / Gold Tier) — Unclear If Functional
**Severity:** MEDIUM  
**Location:** Sidebar

The Gold Tier (650 XP) display exists but it's unclear:
- How XP is earned
- Whether XP changes based on activity
- Whether tier progression is functional or static

With no Sleeper connected and no prior activity, having 650 XP pre-loaded is suspicious.

### 8. 🟡 MEDIUM — ESPN and Yahoo Connections Show "Coming Soon"
**Severity:** MEDIUM  
**Location:** Settings → Connected Accounts

- ESPN: "Coming Soon" badge, grayed out
- Yahoo: "Coming Soon" badge, grayed out

These are visible to users but non-functional. Consider hiding them or providing a waitlist/notification option.

### 9. 🟡 MEDIUM — `/dashboard` Route Shows Separate Onboarding Wizard
**Severity:** MEDIUM  
**Location:** https://app.titlerun.co/dashboard

This route shows a completely different onboarding flow from `/`:
- "Compete with your friends"
- "Join 107 dynasty managers tracking their teams"
- "Let's Set Up Your Experience" button

This appears to be a legacy route. The "107 dynasty managers" count may be a real number or placeholder. Having two different onboarding flows at `/` and `/dashboard` is confusing.

### 10. 🟢 POSITIVE — News Ticker Appears to Use Real Data
**Severity:** N/A (positive finding)  
**Location:** Bottom news ticker bar

The news ticker shows **real, current NFL news** with:
- Accurate relative timestamps (21m, 25m, 1h, 2h, 3h, 4h)
- Real sources: Pro Football Talk, NFL Trade Rumors, Yahoo Sports NFL, ESPN NFL
- Relevant content: Travis Kelce free agency, trade rumors, contract restructures
- Priority indicators: 🟡 MEDIUM, 🟠 HIGH
- Pause/Close controls

**This is the ONE component that appears to be pulling live, real data.**

### 11. 🟢 POSITIVE — Player Rankings Data Appears Real
**Severity:** N/A (positive finding)  
**Location:** Home → Player Rankings

The rankings table and "Top Risers"/"Top Fallers" sections show:
- Reasonable player values (Ja'Marr Chase #1 at 9,928 pts)
- Varied percentage changes (Risers: +64.8% to +7.1%, Fallers: -9.2% to -4.6%)
- Real player names, positions, teams
- Player images loading correctly
- Links to individual player detail pages

**EXCEPTION:** "Top Undervalued" section has the +30.0% capping issue (see Issue #1).

---

## Summary Table

| # | Issue | Severity | Category |
|---|---|---|---|
| 1 | Top Undervalued all show +30.0% (hardcoded/capped) | 🔴 CRITICAL | Fake Data |
| 2 | Trend column shows "-" for ALL players | 🔴 CRITICAL | Missing Data |
| 3 | Player value discrepancy between views | 🟠 HIGH | Data Inconsistency |
| 4 | Navigation opens excessive duplicate tabs | 🟠 HIGH | Bug |
| 5 | Pages redirect to Welcome without explanation | 🟠 HIGH | UX |
| 6 | Generic "User" profile name | 🟡 MEDIUM | Placeholder |
| 7 | XP/Gamification unclear if functional | 🟡 MEDIUM | Unclear Functionality |
| 8 | ESPN/Yahoo "Coming Soon" visible but non-functional | 🟡 MEDIUM | Incomplete Feature |
| 9 | Duplicate onboarding at `/dashboard` vs `/` | 🟡 MEDIUM | Routing |

---

## Key Takeaway

**The original dashboard with fake/static data (30-Day Trend, Team Health, League News, Upcoming Events, etc.) has been completely removed and replaced with a Player Rankings page.** This eliminates most of the previously-known fake data issues, but introduces new ones:

1. The "Top Undervalued" +30.0% capping is the most visible fake-data issue remaining
2. The empty Trend column is a broken feature that's visible to every user
3. The tab-spawning navigation bug is a showstopper for usability
4. Without Sleeper connected, most of the app is inaccessible — and the app doesn't handle this gracefully across all pages

**Recommendation:** Connect a Sleeper account (league @12DudesDeep) and re-test to see the full connected experience, which likely reveals the team-specific features that replaced the old dashboard.

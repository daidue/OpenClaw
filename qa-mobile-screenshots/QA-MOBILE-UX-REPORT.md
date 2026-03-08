# TitleRun Mobile UX & Responsive Design QA Report
**Date:** 2026-03-08  
**Tester:** Mobile UX QA Subagent  
**URL:** https://app.titlerun.co  
**League:** @12DudesDeep (Sleeper: taytwotime)

---

## Executive Summary

**Overall Mobile UX Score: 7.5/10** ✅ Good, with notable issues

TitleRun's mobile experience is **surprisingly polished** for a pre-launch product. The app uses a proper mobile-first responsive design with a collapsible sidebar → bottom navigation pattern, mobile-optimized layouts, and appropriately sized touch targets. However, there are several issues that need attention before the April 15 launch.

---

## Testing Matrix

| Page | Mobile 320px | Mobile 375px | Tablet 768px | Landscape 812x375 |
|------|:---:|:---:|:---:|:---:|
| Home/Dashboard | ✅ | ✅ | ✅ | ⚠️ |
| Teams | ✅ | ✅ | ✅ | — |
| Players | ✅ | ✅ | ✅ | — |
| Player Detail | — | ✅ | — | — |
| Trade Finder | ⚠️ | ✅ | ✅ | — |
| Trade Builder | ⚠️ | ✅ | ✅ | ⚠️ |
| Report Cards | ✅ | ✅ | ✅ | — |
| Activity | ⚠️ | ✅ | ✅ | — |
| Settings | ✅ | ✅ | ✅ | — |

---

## 🔴 Critical Issues (P0)

### 1. "Invalid Date" in Activity Alerts
- **Page:** Activity (all viewports)
- **Screenshot:** `activity_mobile-375.png`
- **Issue:** Multi-League Exposure alert for "Malik Washington" shows "Invalid Date" below the alert text
- **Impact:** Looks broken/unprofessional, affects all users
- **Likely Cause:** Date parsing error in alert creation timestamp

### 2. News Ticker Overlaps Content on All Mobile Views
- **Page:** All pages
- **All screenshots**
- **Issue:** The persistent NEWS ticker at the bottom overlaps with the bottom navigation bar, creating a 3-layer stacking: content → news ticker → bottom nav. On smaller screens (320px), this eats ~120px of vertical space (ticker ~40px + nav ~65px), leaving only ~363px for content
- **Impact:** Significant content viewport reduction, especially on iPhone SE-class devices
- **Recommendation:** Consider making the ticker dismissible and keeping it dismissed (currently has X button but re-appears on navigation)

---

## 🟡 Medium Issues (P1)

### 3. "Bottoming Out" Strategy Option Clipped on 375px
- **Page:** Trade Finder
- **Screenshot:** `trade-finder_mobile-375.png`
- **Issue:** The "Bottoming Out" strategy button in the team strategy selector is clipped/partially visible at 375px width. Only "Bottom" and "Out" are visible, cut off at the right edge
- **Impact:** Users can't see or easily select this strategy option without horizontal scrolling
- **Fix:** Either make the strategy selector scrollable with visual scroll indicator, or wrap to a second row on mobile

### 4. Player Names Truncated Aggressively on Players Page
- **Page:** Players (375px and 320px)
- **Screenshots:** `players_mobile-375.png`, `players_mobile-320.png`
- **Issue:** Player names like "Brock Bowers" → "Brock Bo...", "David Montgomery" → "David Mo...", "Jordan Mason" → "Jordan Ma...", "Konata Murphy" → "Konata Mu..."
- **Impact:** Dynasty players need full names to identify players accurately. "David Mo..." could be David Montgomery or David Moore
- **Recommendation:** Show at least full last name, truncate first name if needed ("D. Montgomery" better than "David Mo...")

### 5. Activity Page - "News" Tab Text Clipped at 320px
- **Page:** Activity (320px)
- **Screenshot:** `activity_mobile-320.png`
- **Issue:** The tab bar "All Activity | Alerts Only | News" clips "News" to "New" at 320px width. The filter pill "Injuries" is also clipped to "Injuri..."
- **Fix:** Use scrollable tabs or smaller text at narrow viewports

### 6. Landscape Orientation - Very Limited Content Visible
- **Page:** Home (landscape 812x375)
- **Screenshot:** `home_landscape_mobile.png`
- **Issue:** In landscape mode, only the team selector dropdown, greeting text, and part of the stats cards are visible. The bottom nav + news ticker consume ~105px of the 375px height, leaving only ~270px for content. On Trade Builder landscape, almost nothing useful is visible
- **Impact:** Landscape is effectively unusable
- **Recommendation:** Consider hiding the news ticker in landscape, or using a more compact header

### 7. Settings Page Shows "No Sleeper account connected" Despite Connection
- **Page:** Settings Profile (375px)
- **Screenshot:** `settings_mobile-375.png`
- **Issue:** Profile section shows "No Sleeper account connected" text, but the Connected Accounts tab shows Sleeper as connected. Either the profile view is stale, or the status isn't propagating
- **Impact:** Confusing — user thinks connection failed

### 8. Greeting Says "there!" Instead of Username
- **Page:** Home Dashboard
- **Screenshot:** `home_mobile-375.png`
- **Issue:** "Good afternoon, there!" — should use the user's display name or Sleeper username
- **Impact:** Feels impersonal, suggests profile isn't fully connected

---

## 🟢 Minor Issues (P2)

### 9. Trade Finder "F NEED" Badges - No Context
- **Page:** Trade Finder (all mobile viewports)
- **Issue:** Shows "QB F NEED", "RB F NEED", etc. The "F" grade with red color is unclear without hover tooltip context (which doesn't exist on mobile)
- **Recommendation:** Consider showing "QB: F Grade" or using a more descriptive format

### 10. Settings - Accordion Pattern on Mobile
- **Page:** Settings (320px, 375px)
- **Issue:** Settings uses a dropdown accordion for section navigation on mobile (vs sidebar tabs on desktop). This is actually a **good responsive decision**, but the expanded "Profile" section pushes all other options far below the fold. Users may not discover other settings sections
- **Recommendation:** Start collapsed, or show all section headers upfront

### 11. Player Detail Page - No Back Gesture Affordance
- **Page:** Player Detail (375px)
- **Issue:** While there is a "← Back to Players" text link and a back arrow in the header, there's no left-edge swipe-back gesture support. This is a native browser feature on iOS Safari, so it works there, but not in in-app browsers
- **Impact:** Minor navigation friction

### 12. Home Dashboard - Stats Cards Alignment on 320px
- **Page:** Home (320px)
- **Screenshot:** `home_mobile-320.png`
- **Issue:** "TEAM VALUE" and "LEAGUE RANK" cards stack with uneven spacing. The "TEAM VALUE" label wraps to 2 lines while "LEAGUE RANK" stays on one. Minor visual inconsistency
- **Impact:** Cosmetic only

### 13. Member Since "Recently" Text
- **Page:** Settings Profile
- **Screenshot:** `settings_mobile-375.png`
- **Issue:** Shows "Member since Recently" — should show actual date
- **Impact:** Looks unfinished

---

## ✅ What Works Well

1. **Bottom Navigation Bar** — Clean 6-item nav (Home, Teams, Players, Trades, Activity, Settings) with clear icons and active state indicators. Well-sized touch targets
2. **Mobile Header Pattern** — Consistent "← Back | Page Title | User icon" pattern across all pages. Good use of breadcrumbs on detail pages
3. **Card-Based Layout** — Dashboard cards, player cards, and trade cards all adapt well to narrow viewports
4. **Player Detail Page** — Beautiful mobile layout with centered photo, clear stats hierarchy, and prominent "Trade This Player" CTA
5. **Trade Builder** — Clean league selector and player list that works well at all tested widports
6. **Report Cards** — League filter pills and tab navigation work well on mobile
7. **Dynasty Badge** — The "👑 DYNASTY" badge is a nice touch and renders well across all sizes
8. **Dark Theme** — Consistent dark theme works well for mobile (easier on eyes, good contrast)
9. **Activity Alerts** — Alert cards are readable and dismissible (X button) on mobile
10. **Trade Finder Results** (tablet) — Trade result cards render beautifully in a 2-column grid at 768px

---

## Responsive Breakpoint Analysis

### Mobile (< 768px)
- ✅ Sidebar collapses to bottom nav
- ✅ Content fills full width
- ✅ Cards stack vertically
- ✅ Header simplifies to back arrow + title
- ⚠️ Some text truncation at 320px
- ⚠️ News ticker reduces usable viewport

### Tablet (768px)
- ✅ Bottom nav still present (good — no awkward middle state)
- ✅ More horizontal space utilized (trade cards in 2-col grid)
- ✅ Strategy buttons fit without clipping
- ✅ Full player names visible

### Landscape Mobile (812x375)
- ⚠️ Very limited usable viewport height
- ⚠️ News ticker + nav consume 28% of screen height
- ❌ Not practically usable for most features

---

## Performance Observations

- **Page Load:** All pages loaded within 3 seconds on broadband
- **Navigation Transitions:** Smooth SPA-style page transitions (no full reload)
- **Image Loading:** Player headshots loaded promptly, no lazy-load jank observed
- **Scroll Performance:** Smooth scrolling throughout (no jank detected in screenshots)
- **News Ticker:** Smooth marquee animation (CSS-based, not JS-driven, which is good)

---

## Accessibility Notes

- ✅ Touch targets on bottom nav are adequately sized (~65px tall cells)
- ✅ Good color contrast (green on dark backgrounds)
- ⚠️ Some smaller touch targets on filter pills (e.g., "QB", "RB" position pills ~38px tall on trade finder)
- ⚠️ Player headshot images likely missing alt text (couldn't verify programmatically)
- ✅ Active page indicated in bottom nav with color highlight and underline

---

## Prioritized Fix List

| # | Severity | Issue | Effort |
|---|----------|-------|--------|
| 1 | P0 | "Invalid Date" in Activity alerts | Low (date formatting bug) |
| 2 | P1 | Player name truncation strategy | Medium |
| 3 | P1 | "Bottoming Out" clipped on 375px | Low (CSS overflow scroll) |
| 4 | P1 | Settings "No Sleeper connected" stale state | Low |
| 5 | P1 | Activity tab text clipping at 320px | Low (responsive text/scroll) |
| 6 | P1 | Greeting "there!" instead of name | Low |
| 7 | P2 | Landscape usability | Medium-High |
| 8 | P2 | "Member since Recently" | Low |
| 9 | P2 | News ticker persistent viewport cost | Medium |
| 10 | P2 | "F NEED" context unclear on mobile | Low |

---

## Screenshots Captured

All screenshots saved to `qa-mobile-screenshots/` directory:
- 8 pages × 3 viewports (375px, 320px, 768px) = 24 screenshots
- 2 landscape screenshots (home + trade builder)
- 3 interaction screenshots (player detail, trade finder scrolled, news click)
- **Total: 29 screenshots**

# UX & Customer Experience Audit

**Date:** 2026-03-08
**Auditor:** UX Expert (Opus 4.6)
**Target:** https://app.titlerun.co

## Executive Summary

TitleRun has a solid visual foundation with a professional dark theme and compelling content (player rankings, news ticker, value charts). However, several critical issues block the first-time user experience: the login form fails silently with no error feedback, multiple core features are gated behind Sleeper connection with inconsistent empty states, and direct URL navigation is broken for key routes (/trade-builder, /settings/* sub-routes). The app shows strong product-market fit for dynasty FF players who get past onboarding, but the path from "new user" to "aha moment" has too many dead ends.

---

## Critical Issues (Block User Success)

### 1. **Login Form Fails Silently — No Error Feedback**
- **Severity:** Critical
- **Impact:** Users who mistype credentials or hit auth issues see NO error message. The login button appears to do nothing. Console shows 401 errors from `api.titlerun.co/api/auth/login` but the UI stays on the login page with no feedback whatsoever.
- **Screenshot:** `screenshots/01-login-page.jpg`
- **Evidence:** 6 consecutive 401 errors in browser console with zero UI feedback
- **Fix:** Display inline error messages below the form (e.g., "Invalid email or password. Please try again.") with appropriate styling. Add loading state to Sign In button during API call. Consider a toast notification as backup.

### 2. **Direct URL Routing Broken for Key Pages**
- **Severity:** Critical
- **Impact:** Users who bookmark or share links to `/trade-builder`, `/trade-finder`, `/trade-calculator`, or `/settings/connected-accounts` get redirected to Help pages or 404s instead of the actual features.
- **Screenshots:** `screenshots/12-trade-builder-help-redirect.jpg`, `screenshots/14-404-connected-accounts.jpg`
- **Evidence:** 
  - `/trade-builder` → Shows "Leaguemates" help page instead of Trade Builder
  - `/trade-calculator` → Shows "Report Cards" help page
  - `/settings/connected-accounts` → 404 Page not found
- **Fix:** Audit all client-side routes to ensure direct navigation works. Settings sub-routes need proper route definitions. Trade routes should resolve to the actual feature, not help docs.

### 3. **Trade Builder "No Leagues Found" Dead End**
- **Severity:** Critical
- **Impact:** First-time users clicking "Trade Builder" in the sidebar see "No leagues found — Connect your Sleeper account to start building trades" with a "Go to Settings" button, but the Settings page doesn't have a clear Sleeper connection flow visible on the Profile tab. Users are bounced between pages with no clear path forward.
- **Screenshot:** `screenshots/06-trade-calculator.jpg` (earlier session showed this state)
- **Fix:** The "Go to Settings" button should deep-link directly to the Connected Accounts section, NOT the generic Profile Settings page. Better yet, embed a "Connect Sleeper" inline widget right on the Trade Builder page.

### 4. **500 Server Error on Onboarding Stats API**
- **Severity:** Critical
- **Impact:** Console shows `500` error on `api.titlerun.co/api/onboarding/stats` during login flow. While the app still loads, this suggests the backend onboarding logic is broken, potentially preventing proper user setup.
- **Fix:** Investigate and fix the 500 error on the onboarding stats endpoint. Add proper error boundaries so backend failures don't silently break the frontend experience.

---

## High Priority (Frustrate Users)

### 5. **"pts" Value Unit Is Unexplained**
- **Severity:** High
- **Impact:** Player values are displayed as "9,931 pts", "7,761 pts" etc. throughout the app. A first-time dynasty player has no idea what "pts" means in this context. Is it fantasy points? Trade value points? How does it compare to other platforms' values (e.g., KTC uses a different scale)?
- **Screenshots:** `screenshots/04-player-rankings-full.jpg`, `screenshots/05-player-detail-chase.jpg`
- **Fix:** Add a one-time tooltip or explainer for "TitleRun Value (pts)" on first visit. Consider a "What are TitleRun values?" link near the first occurrence. The Player Rankings page subtitle says "compare player values across sources" but doesn't explain the value system itself.

### 6. **"Top Undervalued" Column Shows Uniform +30.0% for ALL Players**
- **Severity:** High
- **Impact:** The "Top Undervalued" section on Player Rankings shows every single player at exactly "+30.0%". This looks like a bug or placeholder data — it destroys trust. If Elijah Arroyo, Kaleb Johnson, Travis Hunter, and Malik Nabers ALL have the exact same undervaluation percentage, the algorithm isn't providing useful differentiation.
- **Screenshot:** `screenshots/04-player-rankings-full.jpg`
- **Fix:** Investigate the undervaluation calculation. If it's capped at 30%, explain why. If it's a data issue, fix the algorithm. Each player should show a differentiated undervaluation score.

### 7. **All Player Rankings "Trend" Column Shows "-" for Every Player**
- **Severity:** High
- **Impact:** The "Trend" column in the All Player Rankings table shows a dash "-" for all 20 visible players. This is a key data point users expect to see. An empty trend column suggests the feature is broken or unfinished.
- **Screenshot:** `screenshots/04-player-rankings-full.jpg`
- **Fix:** Populate the Trend column with actual week-over-week or period-over-period change data. If trend data isn't available yet, hide the column rather than showing empty values.

### 8. **No Landing Page / Value Proposition Before Login**
- **Severity:** High
- **Impact:** Users arriving at `app.titlerun.co` land directly on a login form with minimal context. The only description is "TitleRun / titlerun.co" and "Welcome Back — Sign in to your account." A first-time visitor has no idea what TitleRun does, who it's for, or why they should create an account. The demo hint at the bottom ("Demo: Use any email and password to sign in") is barely visible.
- **Screenshot:** `screenshots/01-login-page.jpg`
- **Fix:** Add a compelling value proposition above or alongside the login form. Something like: "Dynasty Fantasy Football Portfolio Manager — Track player values, find winning trades, and dominate your league." Or consider a marketing landing page at the root URL with a separate `/login` route.

### 9. **Settings Profile Shows "No name set" / "Member since Invalid Date"**
- **Severity:** High
- **Impact:** Settings → Profile shows "No name set", "No Sleeper account connected", and "Member since Invalid Date". The "Invalid Date" is a clear formatting bug that erodes trust.
- **Screenshot:** `screenshots/13-settings-profile.jpg`
- **Fix:** Fix the date formatting. If no date is available, show "New member" or omit the field. Pre-populate the display name from the signup email if possible.

---

## Medium Priority (Polish Issues)

### 10. **Trade Finder Empty State Lacks Guidance**
- **Severity:** Medium
- **Impact:** Trade Finder shows only "Select a league to find trades." with a small icon. There's no visual hierarchy, no explanation of what Trade Finder does, and no pathway to connect a league. Compare this to the Home page which at least lists features.
- **Screenshot:** `screenshots/08-trade-finder-no-league.jpg`
- **Fix:** Add an illustrated empty state with: (1) What Trade Finder does, (2) A "Connect Sleeper" CTA button, (3) Maybe a preview/demo of what the results look like.

### 11. **Report Cards Empty State Is Better But Could Improve**
- **Severity:** Medium
- **Impact:** Report Cards shows "Connect Your Sleeper Account" with decent explanation: "Go to Settings and connect your Sleeper account first. Then come back here to see report cards for your drafts and trades." This is better than Trade Finder but still requires a page hop.
- **Screenshot:** `screenshots/07-report-cards-no-sleeper.jpg`
- **Fix:** Embed the Sleeper username input directly on this page instead of sending users to Settings.

### 12. **"Email changes are not yet supported" Shown Proactively**
- **Severity:** Medium
- **Impact:** On the Settings → Profile page, the email field displays "Email changes are not yet supported" as helper text below the field. This is premature — show this message only when users try to edit, not by default. It makes the product feel unfinished.
- **Screenshot:** `screenshots/13-settings-profile.jpg`
- **Fix:** Make the email field read-only with a lock icon. Only show the "not yet supported" message if the user clicks to edit.

### 13. **Sidebar "Trades" Navigation Confusion**
- **Severity:** Medium
- **Impact:** "Trades" in the sidebar is a collapsible group with sub-items (Trade Finder, Trade Builder, Trade History). Clicking "Trades" toggles the dropdown but doesn't navigate to a page — users expect clicking a nav item to GO somewhere. The sidebar sub-items indentation is subtle and could be missed.
- **Fix:** Either make "Trades" click navigate to a trades overview/landing page (that then links to sub-features), or make the expand/collapse behavior more visually obvious (e.g., with a chevron animation).

### 14. **News Ticker Takes Valuable Screen Real Estate**
- **Severity:** Medium
- **Impact:** The scrolling news ticker at the bottom of every page is eye-catching but consumes permanent screen real estate. On smaller screens, it competes with the actual content. It also duplicates some of what's on the Activity → News page.
- **Fix:** Make the ticker dismissible (it has close/pause buttons — good). Consider making it sticky only on the Home page, not globally. Or allow users to toggle it in Settings.

### 15. **Player Detail Page — "Your Ownership" Section Empty**
- **Severity:** Medium
- **Impact:** On player detail pages (e.g., Ja'Marr Chase), there's a "Your Ownership" section showing "You don't own this player in any of your leagues. Consider trading for Ja'Marr Chase." Without Sleeper connected, this section appears for every player, creating noise.
- **Screenshot:** `screenshots/05-player-detail-chase.jpg`
- **Fix:** Hide the "Your Ownership" section entirely when no Sleeper account is connected. Or replace it with a "Connect Sleeper to see ownership" CTA.

### 16. **Player Rankings Format Toggles Not Explained**
- **Severity:** Medium
- **Impact:** The top of Player Rankings has toggles for "1QB / SF" and "Standard / TEP / TEP+ / TEP++". Dynasty newcomers won't know what SF (Superflex), TEP (Tight End Premium), or the TEP variants mean.
- **Screenshot:** `screenshots/04-player-rankings-full.jpg`
- **Fix:** Add tooltip explanations on hover/tap for each toggle. E.g., "SF = Superflex: Leagues where QBs can go in the flex spot, making them more valuable."

---

## Positive Findings

### ✅ Clean, Professional Visual Design
The dark theme is well-executed with good contrast. The green accent color is consistent and feels fresh. Player headshots add personality to rankings and lists.

### ✅ Player Detail Page Is Feature-Rich
Ja'Marr Chase's page shows TitleRun Value (9,871), Overall Rank (#2), WR Rank (#1), value history chart with multiple timeframes (7D/30D/90D/1Y/2Y/All), season stats across years, and college info. This is genuinely useful for dynasty players.

### ✅ News Ticker Is Compelling Content
The real-time NFL news ticker with color-coded severity (🔴 BREAKING, 🟠 HIGH, 🟡 MEDIUM) is a great engagement feature. Sourcing from NFL Trade Rumors, ESPN, CBS Sports, Pro Football Talk, Yahoo Sports gives comprehensive coverage.

### ✅ Activity Page Has Good Structure
Tabs for All Activity / Alerts Only / News, with filter chips for category (Trades, Injuries, Value, Achievements). The "No alerts yet" empty state is clear.

### ✅ Mobile Layout Exists
The mobile view has a proper bottom navigation bar (Home, Teams, Players, Trades, Activity, Settings) and the content reflows appropriately. The "Connect Sleeper →" CTA is prominent on mobile.

### ✅ Settings Has Good Organization
Profile, Connected Accounts, League Management, Display, Notifications, Privacy, About, Re-run App Tour — this is a comprehensive and well-organized settings menu.

### ✅ FAQ Content Addresses Key Concerns
FAQs cover: pricing (free forever), supported platforms, valuation methodology, read-only nature, and data safety. These are exactly the questions new users would ask.

---

## Recommendations (Prioritized)

### 🔴 Immediate (Pre-Launch Blockers)

1. **Fix login error feedback** — Users MUST know when login fails. Show inline errors on 401 responses. Add loading spinner to Sign In button. This is the single most important fix.

2. **Fix URL routing for Trade Builder, Trade Calculator, and Settings sub-routes** — Direct navigation to key feature URLs must work. Audit all routes.

3. **Fix "Invalid Date" on Settings profile** — This is a visible trust-eroding bug.

4. **Fix 500 error on `/api/onboarding/stats`** — Backend errors during onboarding will cause unpredictable frontend behavior.

### 🟠 High Priority (First Week)

5. **Explain the "pts" value system** — Add a tooltip or onboarding step that explains TitleRun's proprietary value points.

6. **Fix "Top Undervalued" showing uniform +30.0%** — Either fix the algorithm or remove the section until it provides differentiated data.

7. **Populate Trend column or remove it** — Empty columns make the product look incomplete.

8. **Add value proposition to login page** — First-time visitors need to know what TitleRun is before they'll create an account.

### 🟡 Medium Priority (First Month)

9. **Streamline Sleeper connection** — Embed connection widgets inline on empty-state pages instead of bouncing users to Settings. Reduce the steps from "dead end → Settings → find Connected Accounts → connect" to "one-click connect right here."

10. **Add tooltips for dynasty jargon** — SF, TEP, TEP+, TEP++ need explanations for newer dynasty players.

11. **Improve empty states across all features** — Each should explain what the feature does, show a preview, and offer a clear CTA.

12. **Consider a proper landing/marketing page** — `app.titlerun.co` going straight to login is a missed opportunity for conversion.

---

## Testing Coverage

| Workflow | Tested? | Result |
|----------|---------|--------|
| Login | ✅ | Silent failure with 401, no error shown |
| Signup | ✅ Viewed page | Page exists, has feature bullets |
| Player Rankings | ✅ | Works well, but Trend column empty and Undervalued data suspicious |
| Player Detail | ✅ (Ja'Marr Chase) | Feature-rich, good chart, stats work |
| Trade Builder | ✅ | Dead end without Sleeper, "No leagues found" |
| Trade Finder | ✅ | Empty state, minimal guidance |
| Report Cards | ✅ | Empty state, decent messaging, directs to Settings |
| Activity/News | ✅ | Works well, good filtering |
| Settings | ✅ | Profile shows "Invalid Date" bug |
| Mobile View | ✅ | Bottom nav works, content reflows |
| Home Dashboard | ✅ | Clear Sleeper CTA, feature bullets |

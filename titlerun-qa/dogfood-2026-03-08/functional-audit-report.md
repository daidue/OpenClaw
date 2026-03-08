# Functional Testing Audit

**Date:** 2026-03-08
**Auditor:** QA Engineer (Opus 4.6)
**Target:** https://app.titlerun.co
**Auth Method:** Manual registration via API + localStorage injection (login UI was broken)

## Summary
- Total issues: 10
- Critical: 2 | High: 3 | Medium: 3 | Low: 2

---

## Critical (Blocks Core Features)

### 1. **Login — Demo mode broken, no error feedback**
- **Page:** `/login`
- **Steps to reproduce:**
  1. Navigate to https://app.titlerun.co
  2. Enter any email and password (as instructed by "Demo: Use any email and password to sign in")
  3. Click "Sign In"
- **Expected:** Login succeeds with demo credentials, or clear error message shown
- **Actual:** API returns 401 (`/api/auth/login`). No error message displayed to user on the page. User sees nothing happen — silent failure.
- **Console errors:** `Failed to load resource: the server responded with a status of 401 ()` on `api.titlerun.co/api/auth/login`
- **Impact:** New users cannot access the app at all. The demo text is misleading — only pre-registered accounts work.
- **Fix:** Either implement demo auto-login (bypass auth for demo accounts), remove the misleading "Demo" text, or show a visible error toast/message on login failure.

### 2. **Signup — Form redirects to login before completing**
- **Page:** `/signup`
- **Steps to reproduce:**
  1. Navigate to `/signup`
  2. Fill in name field
  3. Tab to next field or attempt interaction
- **Expected:** Full signup form (name, email, password) available for completion
- **Actual:** Page redirects back to `/login` mid-flow, losing all input. Signup only works via direct API call (`POST /api/auth/register`).
- **Console errors:** None specific to signup redirect
- **Impact:** Users cannot create accounts through the UI. Combined with Issue #1, this means zero users can onboard through the app.

---

## High (Feature Broken, Workaround Exists)

### 3. **Player Page — Similar Players links use wrong URL pattern → 404**
- **Page:** `/players/7564` (Ja'Marr Chase) — Similar Players section
- **Steps to reproduce:**
  1. Navigate to any player page (e.g., `/players/7564`)
  2. Scroll to "Similar Players" section
  3. Click any similar player link (e.g., Jaxon Smith-Njigba)
- **Expected:** Navigates to `/players/9488`
- **Actual:** Links use `/player/9488` (singular) → 404 page
- **Console errors:** None (404 is client-side routed)
- **Impact:** All 6 similar player links are broken on every player page. Users cannot navigate between related players.
- **Fix:** Change `href="/player/${id}"` to `href="/players/${id}"` in the Similar Players component.

### 4. **Trophy Case — Route renders Settings page instead**
- **Page:** `/trophy-case`
- **Steps to reproduce:**
  1. Click "Trophy Case" link on dashboard, or navigate directly to `/trophy-case`
- **Expected:** Trophy Case page with achievements/badges
- **Actual:** Settings page renders (showing Profile tab, email field, etc.)
- **Console errors:** None
- **Impact:** Trophy Case feature is completely inaccessible. Dashboard links to it from two places (heading + "View All →").
- **Fix:** Add `/trophy-case` route to the router, or verify it's not accidentally aliased to `/settings`.

### 5. **API — Server 500 errors on user endpoints**
- **Endpoints affected:**
  - `GET /api/onboarding/stats` → 500
  - `GET /api/user/preferences` → 500
- **Steps to reproduce:**
  1. Log in (via localStorage injection)
  2. Navigate to dashboard or settings
  3. Check browser console
- **Expected:** API returns user data or 404 for new user
- **Actual:** Server returns 500 Internal Server Error
- **Console errors:** `Failed to load resource: the server responded with a status of 500 ()`
- **Impact:** Onboarding stats and user preferences fail to load. May cause silent data loss or missing UI sections.

---

## Medium (Works But Buggy)

### 6. **Player Stats — 2025 season FPts/PPG show 0.0**
- **Page:** `/players/7564` (Ja'Marr Chase)
- **Steps to reproduce:**
  1. Navigate to Ja'Marr Chase player page
  2. Look at Season Stats table, 2025 row
- **Expected:** FPts and PPG calculated from 125 receptions, 1,412 yards, 8 TDs
- **Actual:** FPts shows "0.0", PPG shows "0.0"
- **Note:** 2024 and prior seasons show correct values (e.g., 2024: 403.0 FPts, 23.7 PPG)
- **Impact:** Most recent season stats appear broken, undermining data trust

### 7. **Forgot Password — Route redirects to login**
- **Page:** `/forgot-password`
- **Steps to reproduce:**
  1. Click "Forgot password?" link on login page
  2. Try to access `/forgot-password` directly
- **Expected:** Forgot password form loads
- **Actual:** Redirects back to `/login`
- **Impact:** Users who forget their password have no recovery path

### 8. **Trade Finder — Missing league selector for non-connected users**
- **Page:** `/trade-finder`
- **Steps to reproduce:**
  1. Navigate to Trade Finder
- **Expected:** Empty state with clear CTA to connect platform (like Trade Builder has)
- **Actual:** Shows only "🏈 Select a league to find trades" text with no league dropdown or "Connect Platform" CTA
- **Impact:** Poor UX — user has no clear path to action. Trade Builder handles this correctly with "Go to Settings" button.

---

## Low (Polish/Cosmetic)

### 9. **Dashboard — Greeting shows "Welcome back, Manager!" instead of user name**
- **Page:** `/dashboard`
- **Expected:** "Welcome back, [UserName]!" or "Welcome back!"
- **Actual:** Shows "Manager!" even for logged-in user with email
- **Note:** Settings shows "No name set" — this is expected for new users, but "Manager" is a placeholder that feels impersonal

### 10. **News Ticker — Duplicate entries in marquee**
- **Page:** All pages (persistent news ticker at bottom)
- **Steps to reproduce:**
  1. Observe the news ticker on any page
- **Expected:** Each news item appears once
- **Actual:** All news items are duplicated (rendered twice in the marquee). The duplicated set contains the same 30 items appearing twice in the DOM.
- **Note:** This may be intentional for continuous scrolling effect, but it doubles the DOM node count (~60 button elements) and may impact mobile performance

---

## Console Errors Summary

| Error | Endpoint | Count | Impact |
|-------|----------|-------|--------|
| 401 Unauthorized | `/api/auth/login` | 6 | Login failure (demo mode broken) |
| 500 Internal Server Error | `/api/onboarding/stats` | 1 | Onboarding data missing |
| 500 Internal Server Error | `/api/user/preferences` | 1 | User preferences fail to load |

**No JavaScript runtime errors observed.** No CORS issues. No 404s for static assets.

---

## Test Coverage

### Navigation (6/7 passed)
- ✅ Home → loads player rankings
- ✅ Teams → loads with empty state
- ✅ Players → loads with rankings, movers, pagination
- ✅ Trades → expands to show Trade Finder, Trade Builder, Trade History
- ✅ Report Cards → loads with empty state
- ✅ Activity → loads with news feed
- ❌ Trophy Case → renders Settings page (routing bug)

### Auth Flow (1/4 passed)
- ❌ Login with demo credentials → silent 401
- ❌ Signup via UI → redirects to login
- ❌ Forgot password → redirects to login
- ✅ Auth guard → correctly redirects unauthenticated users to login

### Player Pages (5/6 passed)
- ✅ Player loads with full data
- ✅ Stats table with multiple seasons
- ✅ Value chart with time period buttons
- ✅ Dynasty Outlook section
- ❌ Similar Players links → 404 (wrong URL pattern)
- ✅ Breadcrumbs accurate (Home > Players > [Player Name])

### Trade Builder (2/2 passed — limited without connected account)
- ✅ Page loads
- ✅ Empty state with CTA to connect platform

### Trade Finder (1/2 passed)
- ✅ Page loads
- ❌ No CTA for non-connected users (poor empty state)

### Report Cards (1/1 passed)
- ✅ Empty state with CTA to connect Sleeper

### Settings (1/1 passed)
- ✅ All tabs visible: Profile, Connected Accounts, League Management, Display, Notifications, Privacy, About, Re-run App Tour

### 404 Page (1/1 passed)
- ✅ Custom 404 page with "Go Home" link

### Data Integrity (3/4 passed)
- ✅ Player values realistic (Ja'Marr Chase #1 at 9,931 pts)
- ✅ Rankings order makes sense (top dynasty assets)
- ✅ No duplicate players in rankings
- ❌ 2025 FPts/PPG = 0.0 despite having stats

### Mobile (0/1 tested)
- ⚠️ Unable to fully test mobile viewport (resize targeted wrong tab). Sidebar appeared still expanded at 375px — may overlap content on mobile.

---

## Positive Observations

1. **Player Rankings page is excellent** — movers (risers, undervalued, fallers), search, format toggles (1QB/SF/Standard/TEP/TEP+/TEP++), position filters, pagination (193 pages)
2. **Player detail pages are rich** — value history charts, season stats, dynasty outlook, similar players, trade history, ownership status
3. **News ticker is well-designed** — severity indicators (🔴 CRITICAL, 🟠 HIGH, 🟡 MEDIUM), source attribution, timestamps, pause/close controls
4. **Activity page** — good content aggregation with category filters
5. **Empty states are generally well-handled** — clear messaging and CTAs to guide users
6. **Breadcrumbs work correctly** on player pages
7. **No JavaScript runtime errors** — app is stable once authenticated
8. **Onboarding flow exists** with 8-step wizard (couldn't fully test due to auth issues)
9. **XP/gamification system** — Gold Tier, 650 XP, Season Points visible
10. **Accessibility** — "Skip to content" link, proper heading hierarchy, ARIA landmarks

---

## Recommendations (Priority Order)

1. **🔴 Fix auth flow immediately** — Login, signup, and forgot password are all broken via UI. This is the #1 blocker for any user testing or launch.
2. **🔴 Fix Similar Players URL pattern** — Simple find/replace from `/player/` to `/players/`
3. **🟠 Fix Trophy Case routing** — Either add route or fix alias
4. **🟠 Fix API 500 errors** — `/api/onboarding/stats` and `/api/user/preferences`
5. **🟡 Fix 2025 FPts/PPG calculation** — Data is present but fantasy points not computed
6. **🟡 Improve Trade Finder empty state** — Add CTA like Trade Builder has
7. **🟢 Fix forgot-password route** — Currently redirects to login

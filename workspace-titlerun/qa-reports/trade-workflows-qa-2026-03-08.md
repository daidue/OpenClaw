# TitleRun Trade Workflows QA Report
**Date:** 2026-03-08  
**Tester:** QA Subagent (Trade Workflows Expert)  
**Environment:** Production (https://app.titlerun.co)  
**League:** @12DudesDeep  
**Account:** qa-test-2026@example.com  

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 3 |
| 🟠 HIGH | 4 |
| 🟡 MEDIUM | 3 |
| 🔵 LOW | 2 |
| **TOTAL** | **12** |

**Overall Trade Workflow Status: 🔴 BROKEN**  
The Trade Builder — the core trade experience — is completely non-functional due to a JavaScript crash. Trade Finder works but has scoring and needs-detection bugs. Trade History works but is empty (expected for new account). Routing is severely broken across the app.

---

## 🔴 CRITICAL Bugs

### CRIT-1: Trade Builder Infinite Loading — JS Crash
**Page:** /trade-builder  
**Steps to Reproduce:**
1. Connect Sleeper account (username: taytwotime)
2. Navigate to Trade Builder (via button or URL)
3. Select league @12DudesDeep

**Expected:** Trade Builder loads with Your Team / Their Team panels and player rosters  
**Actual:** Infinite "Loading..." spinner. Page never renders.  

**Console Error:**
```
TypeError: Cannot read properties of undefined (reading 'toLocaleString')
    at N (9846.7c379d2a.chunk.js:1:18068)
```
AND
```
TypeError: Cannot read properties of undefined (reading 'toLocaleString')
    at Array.map (<anonymous>)
    at w (9846.7c379d2a.chunk.js:1:19454)
```

**Root Cause:** Player/asset value data contains `undefined` values. When the component tries to format them with `.toLocaleString()`, it crashes. The error boundary shows the loading spinner instead of a proper error message.

**Proposed Fix:** Add null/undefined checks before `.toLocaleString()`:
```js
// Before:
value.toLocaleString()
// After:
(value ?? 0).toLocaleString()
```

**Impact:** Users CANNOT use Trade Builder at all. This blocks the primary trade workflow and the "Open in Builder" flow from Trade Finder.

**Screenshot:** `browser/0d6307a0-907b-4140-a457-329421accdaf.png` (infinite loading)  
**Screenshot:** `browser/277c380d-a6b6-40cb-b77f-6a42fc6aa991.png` (Trade Builder DID load once during initial page load before the crash, showing Your Team/Their Team panels with player data)

---

### CRIT-2: Client-Side Routing Broken — Pages Redirect to Wrong Destinations
**Pages:** /trade-builder, /trade-finder, /trade-history (intermittent)  
**Steps to Reproduce:**
1. Navigate via URL bar to /trade-builder
2. Page loads as Activity, Settings, or My Teams (random)
3. Similarly, /trade-finder redirected to Settings > Profile

**Expected:** Direct URL navigation loads the correct page  
**Actual:** Pages redirect to unrelated destinations:
- /trade-builder → Activity page, My Teams page, or Settings
- /trade-finder → Settings > Profile page

**Note:** The first load after connecting Sleeper worked correctly. Subsequent navigations broke.

**Impact:** Users cannot reliably access trade pages via URL or bookmarks. Deep-linking is broken.

---

### CRIT-3: Sidebar Navigation Opens New Tabs + Navigates to Wrong Pages
**Steps to Reproduce:**
1. Click "Trades" in sidebar to expand submenu
2. Click "Trade Builder" link

**Expected:** Current page navigates to Trade Builder  
**Actual:** Opens a NEW browser tab AND navigates to /activity (wrong page)

**Evidence:** After normal testing, 31 browser tabs were open. Each sidebar click spawned a new tab instead of navigating in-place.

**Impact:** 
- Massive memory leak (~300MB per tab × 30+ tabs = 9GB+ RAM)
- Users end up on wrong pages
- Browser becomes unresponsive over time

---

## 🟠 HIGH Bugs

### HIGH-1: Trade Finder — All Scores Identical (74/100)
**Page:** /trade-finder  
**Steps to Reproduce:**
1. Navigate to Trade Finder
2. View all trade suggestions

**Expected:** Different trades have different scores based on value, fairness, etc.  
**Actual:** EVERY single trade suggestion shows a score of exactly 74 out of 100 — Needle Movers and More Trades alike.

**Impact:** Scoring is meaningless. Users can't differentiate between good and bad trades. The sorting options (Best Overall, Most Improvement, Most Fair, Most Likely Accepted) are ineffective.

---

### HIGH-2: Trade Finder — All Positions Show "F NEED"
**Page:** /trade-finder  
**Steps to Reproduce:**
1. Navigate to Trade Finder with @12DudesDeep league

**Expected:** Position needs reflect actual roster strength. Team has Jayden Daniels (QB, 8,213 pts) and Bijan Robinson (RB, 9,822 pts) — these should NOT be "needs."  
**Actual:** QB F NEED, RB F NEED, WR F NEED, TE F NEED — every position flagged as a need.

**Impact:** Trade recommendations are based on incorrect needs analysis, leading to poor suggestions (e.g., suggesting to trade away QBs to get more QBs).

---

### HIGH-3: "Open in Builder" Dead End
**Page:** /trade-finder → /trade-builder  
**Steps to Reproduce:**
1. On Trade Finder, click "Open in Builder" on any trade suggestion

**Expected:** Trade Builder opens with the selected trade pre-loaded  
**Actual:** Navigates to Trade Builder which is stuck in infinite loading (CRIT-1)

**Impact:** The entire Trade Finder → Builder pipeline is broken. Users find trades but can't analyze them.

---

### HIGH-4: Activity Alerts Show "Invalid Date"
**Page:** /activity  
**Steps to Reproduce:**
1. Navigate to Activity page

**Expected:** Alerts show proper timestamps  
**Actual:** Multi-League Exposure alerts display "Invalid Date" for all date fields

**Impact:** Users can't determine when alerts occurred.

---

## 🟡 MEDIUM Bugs

### MED-1: Profile Shows "No Sleeper account connected" After Connection
**Page:** /settings (Profile tab)  
**Steps to Reproduce:**
1. Connect Sleeper account successfully
2. Verify league dropdown in sidebar shows @12DudesDeep
3. Navigate to Settings > Profile

**Expected:** Profile reflects "Connected to Sleeper as taytwotime"  
**Actual:** Profile shows "No Sleeper account connected" even though Sleeper IS connected and functioning

**Impact:** Users may be confused about their connection status and try to reconnect.

---

### MED-2: Trade Finder Uses Different Layout System (Mobile on Desktop)
**Page:** /trade-finder (first visit before Sleeper connection)  
**Steps to Reproduce:**
1. Visit /trade-finder without Sleeper connected on 1440px viewport

**Expected:** Desktop layout with sidebar navigation  
**Actual:** Mobile layout with bottom navigation bar, no desktop sidebar  

**Note:** After connecting Sleeper, Trade Finder renders correctly in desktop layout. The mobile layout only appears when visiting without a connected account.

**Impact:** Poor UX for new users who haven't connected Sleeper yet. Inconsistent with the rest of the app.

---

### MED-3: Trade Builder Error Boundary Shows Loading Instead of Error
**Page:** /trade-builder  
**Steps to Reproduce:**
1. Navigate to Trade Builder (which crashes)

**Expected:** Error message like "Something went wrong" with retry/report option  
**Actual:** Infinite loading spinner with no indication of failure

**Impact:** Users wait indefinitely. No feedback that something is wrong. No way to report or retry.

---

## 🔵 LOW Bugs

### LOW-1: Trade Calculator & My Trades Routes Don't Exist
**Scope items from requirements:** "Trade Calculator" and "My Trades"  
**Actual:** No routes exist for /trade-calculator or /my-trades. These features are either not built or have been renamed.

**Impact:** If these were planned features, they're missing. If renamed, documentation should be updated.

---

### LOW-2: Settings "Connected Accounts" Tab Query Param Inconsistency
**URL:** /settings?tab=accounts  
**Steps to Reproduce:**
1. Navigate to /settings?tab=accounts

**Expected:** Directly opens Connected Accounts tab  
**Actual:** Sometimes opens Profile tab instead, requiring manual tab click

**Impact:** Minor — users can still click the tab. But deep-linking to settings tabs is unreliable.

---

## What Works ✅

1. **Trade Finder page rendering** — Loads correctly, shows trade suggestions, team info
2. **Trade Finder filters** — Sort options (Best Overall, Most Improvement, Most Fair, Most Likely Accepted), structure filter (Any, 1-for-1, 2-for-1, etc.), Picks checkbox
3. **Trade Finder team strategy** — Contending/Retooling/Rebuilding/Bottoming Out buttons
4. **Trade Finder caching** — "Results from cache · expires in 10m" indicator
5. **Trade Finder opponent scanning** — "11 opponents scanned · 1.7s" performance
6. **Trade History page** — Loads correctly, shows proper empty state with CTA
7. **Trade History "Go to Trade Builder" button** — Navigation works (though Trade Builder itself crashes)
8. **Sleeper connection flow** — Username input → Connect button → league import works
9. **League selector** — Active League dropdown in sidebar works correctly
10. **News ticker** — Running smoothly at bottom of all pages

---

## Priority Fix Order

1. **CRIT-1 (Trade Builder crash)** — Fix `toLocaleString()` on undefined values. This unblocks the entire trade workflow.
2. **CRIT-2/CRIT-3 (Routing/Navigation)** — Fix client-side router to prevent wrong redirects and tab spawning. Check for `target="_blank"` on sidebar links and stale route guards.
3. **HIGH-1/HIGH-2 (Scoring/Needs)** — Fix the trade scoring algorithm and position needs detection.
4. **HIGH-4 (Invalid Date)** — Fix date parsing for activity alerts.
5. **MED-1 (Profile status)** — Sync Sleeper connection status to Profile component.
6. **MED-3 (Error boundary)** — Show proper error message instead of infinite loading.

---

## Screenshots Reference
All screenshots saved to `~/.openclaw/media/browser/`:
- `ef46583e-*.png` — Settings > Connected Accounts (before connect)
- `277c380d-*.png` — Trade Builder working (first load)
- `731f6c8b-*.png` — Activity page (misroute from /trade-builder)
- `00655e9b-*.png` — Settings Profile (misroute from /trade-finder)
- `f7a4a666-*.png` — Trade History (working)
- `92d89fb8-*.png` — Trade Builder loading spinner
- `0d6307a0-*.png` — Trade Builder still loading after 15s
- `0b16d01b-*.png` — Trade Finder working with results
- `06c82da9-*.png` — Trade Builder loading after "Open in Builder"
- `3c9895f7-*.png` — My Teams page (shown on redirect)

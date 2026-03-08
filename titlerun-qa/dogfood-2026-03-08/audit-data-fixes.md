# Adversarial Audit: Data Display Fixes

**Auditor:** Frontend Engineer (Opus 4.6)
**Date:** 2026-03-08
**Score:** 72/100

## Summary

The fixes address two real bugs — "Invalid Date" in Settings and stats showing 0.0 due to snake_case/camelCase mismatch. The approach is sound (two layers of defense: API normalization + component fallbacks). However, the fix is **incomplete** — the same date vulnerability exists in 8+ other components, the careerTotals normalization misses many fields, and there's an unprotected `new Date()` call in the same Settings file.

## ✅ What's Good (Score: +40)

### Settings.jsx — "Invalid Date" Fix
- **IIFE pattern is clean** — self-contained, no extra state/hooks needed
- **Null check + isNaN guard** — covers both undefined and invalid date strings
- **"Recently" fallback** — reasonable UX for missing dates
- **Both `createdAt` AND `created_at` checked** — handles either API format

### authStore.js — createdAt Normalization
- **Added to all 3 entry points** — login, signup, and refreshProfile
- **Signup defaults to `new Date().toISOString()`** — smart, since signup time is "now"
- **Login defaults to `null`** — correct, don't fabricate dates
- **Both camelCase and snake_case stored** — prevents downstream mismatches

### api.js — getSeasonStats Normalization
- **Comprehensive field mapping** — all stat fields covered (pass, rush, rec, fantasy points)
- **`??` instead of `||`** — correctly preserves legitimate 0 values (critical fix!)
- **Normalizes at API boundary** — components get clean data

### SeasonStatsTable.jsx — Component Fallbacks
- **`??` operator used correctly** — `0 ?? 0` returns 0, `0 || 0` also returns 0, but `null ?? 0` returns 0 while downstream code stays safe
- **Both getFantasyPoints and getPpg handle both formats** — defense in depth

---

## 🔴 Critical Issues (Score: -15)

### BUG 1: Unprotected Date in Settings League Management (Same File!)
**File:** `Settings.jsx:817`
```jsx
<span>Last synced: {new Date(league.lastSynced).toLocaleDateString()}</span>
```
`league.lastSynced` comes from `team.updatedAt || team.updated_at` (line 146). If both are null/undefined, this displays **"Invalid Date"** — the exact same bug that was fixed for createdAt 280 lines earlier.

**Fix:** Apply the same IIFE pattern or use `formatDate()` from utils/formatters.js which already handles null.

### BUG 2: careerTotals Normalization Incomplete
**File:** `api.js` — getSeasonStats
The API normalization covers fantasy points and gamesPlayed for careerTotals, but **misses**:
- `passYards` / `pass_yards`
- `passTd` / `pass_td`
- `interceptions`
- `rushAtt` / `rush_att`
- `rushYards` / `rush_yards`
- `rushTd` / `rush_td`
- `targets`
- `receptions`
- `recYards` / `rec_yards`
- `recTd` / `rec_td`

These are all accessed directly on `careerTotals` in SeasonStatsTable.jsx (lines 360-407) without any fallback:
```jsx
<td>{careerTotals.passYards}</td>  // No ?? fallback!
<td>{careerTotals.rushAtt}</td>    // No ?? fallback!
```

If the API returns `pass_yards` instead of `passYards`, the career totals row displays `undefined`.

**Fix:** Either normalize all fields in api.js (like seasons), or add `?? 0` fallbacks in the component.

---

## 🟡 Moderate Issues (Score: -8)

### ISSUE 3: 8+ Other Components Have Unprotected Date Parsing
These components all call `new Date(value)` without null/validity checks:

| Component | Line | Risk |
|-----------|------|------|
| `TradeHistory.jsx` | 104 | `new Date(trade.created_at \|\| trade.date)` — if both null → Invalid Date |
| `InsightSection.tsx` | 137, 158 | Has `lastGenerated &&` guard ✅ but no isNaN check |
| `PlayerComparison.jsx` | 236-242 | `new Date(chartData[0].date)` — no null check |
| `LeagueNewsWidget.jsx` | 43 | `new Date(timestamp)` — no null check |
| `EnhancedLeagueActivityFeed.jsx` | 80 | `new Date(timestamp)` — no null check |
| `TeamValueCard.jsx` | 23 | `new Date(timestamp)` — no null check |
| `PlayerAlertCard.jsx` | 23 | `new Date(ts)` — no null check |
| `UpcomingEvents.jsx` | 40 | `new Date(dateString)` — no null check |

While `formatRelativeTime()` in formatters.js handles null gracefully (returns `''`), these components **don't use it** — they parse dates inline.

**Recommendation:** Create a centralized safe date utility:
```js
export const safeDate = (raw, fallback = 'Recently') => {
  if (!raw) return fallback;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? fallback : d;
};
```

### ISSUE 4: `||` vs `??` Inconsistency in authStore
**File:** `authStore.js`
```js
createdAt: profile.createdAt || profile.created_at || currentUser?.createdAt || ...
```
Uses `||` (not `??`). While dates are strings (so `||` works fine here since `""` is also falsy and shouldn't be a date), this is **inconsistent** with the `??` approach used in api.js. For consistency and to prevent future bugs if date handling changes, should use `??`.

### ISSUE 5: formatters.js Has Latent Bug
```js
export const formatDate = (date, format = 'medium') => {
  if (!date) return '';
  const dateObj = new Date(date);
  // No isNaN check! Invalid strings → "Invalid Date"
  return dateObj.toLocaleDateString('en-US', ...);
};
```
The existing `formatDate` utility handles null but NOT invalid date strings. If this function were used consistently (as it should be), it would still produce "Invalid Date" for garbage input.

---

## 🟢 Minor Issues (Score: -5)

### ISSUE 6: Performance — Normalization on Every API Call
The `getSeasonStats` normalization maps over every season and creates new objects on each call. For a player with 15+ seasons, this creates 15+ new objects. **Not a real problem** since this is a fetch handler (runs once per API call, not per render), but worth noting.

### ISSUE 7: No `useMemo` for `getFantasyPoints`/`getPpg`
These functions are recreated on every render. Since they close over `scoringFormat`, they should ideally be wrapped in `useCallback`. In practice, the re-render cost is negligible since the table is small.

### ISSUE 8: Duplicate Normalization (API + Component)
Both api.js and SeasonStatsTable.jsx normalize the same fields. If api.js normalization works correctly, the component fallbacks are dead code. This is intentional defense-in-depth but adds maintenance burden — if a new field is added, it must be added in two places.

### ISSUE 9: `formatNumber` called on potentially-undefined careerTotals fields
```jsx
{formatNumber(careerTotals.passYards)}  // passYards could be undefined
```
If `formatNumber(undefined)` doesn't handle undefined gracefully, this could display "NaN" or throw.

---

## Audit Checklist Results

### 1. Null Safety
- [x] Settings createdAt null cases handled
- [x] Both createdAt AND created_at null → returns "Recently" ✅
- [x] Invalid date format → isNaN check catches it ✅
- [❌] Other date displays with same issue — YES, 8+ components unprotected
- [x] No memory leaks from invalid dates

### 2. Field Normalization
- [x] snake_case → camelCase covers season stat fields ✅
- [❌] careerTotals normalization incomplete (only 4 of 15+ fields)
- [❌] Other API responses may have same issue (not audited beyond stats)
- [x] `??` vs `||` — correctly uses `??` in api.js for numeric fields
- [x] Performance impact negligible (runs once per fetch)

### 3. React Best Practices
- [x] No unnecessary re-renders introduced
- [~] Could use useCallback for getFantasyPoints/getPpg (minor)
- [x] Keys properly set (uses season.season)
- [x] State updates correct
- [x] Side effects handled properly in useEffect

### 4. Data Consistency
- [x] Stats should display now (normalization ensures camelCase fields exist)
- [x] API returning 0.0 legitimately — `??` preserves 0 ✅
- [x] Units correct (points displayed as-is from API)
- [x] PPG uses `.toFixed(1)` for precision ✅
- [x] Empty state vs zero state handled (0 renders as "0", empty shows "No stats")

### 5. Edge Cases
- [x] Future dates — not relevant for season stats
- [x] Very old dates — not relevant (NFL stats post-1970)
- [~] Timezone issues — `toLocaleDateString()` uses browser locale (acceptable)
- [~] Locale formatting — hardcoded `'en-US'` in some places, browser default in Settings
- [x] Browser compatibility — `??` requires ES2020 (covered by build tooling)

---

## Recommendations (Priority Order)

1. **🔴 Fix league lastSynced date** — same file, same bug class, easy fix
2. **🔴 Complete careerTotals normalization** — add all stat fields to api.js normalization
3. **🟡 Create `safeDate()` utility** — centralize date safety instead of per-component IIFEs
4. **🟡 Fix `formatDate()` in formatters.js** — add isNaN guard
5. **🟢 Audit all `new Date()` calls** — 20+ unprotected instances across codebase
6. **🟢 Remove component-level snake_case fallbacks** — once api.js normalization is verified working, the component fallbacks are redundant (keep during transition)

---

## Verdict

**72/100** — The fixes correctly solve the two reported bugs with the right approach (`??` for numerics, null+isNaN for dates, normalization at API boundary). However, the fix is narrow — it patches the specific symptoms without addressing the systemic issues (no centralized date safety, incomplete careerTotals normalization, same date bug in league management). The architecture of the fix is good; the coverage needs to expand.

**Ship-ready?** Yes, for the specific bugs reported. But file a follow-up ticket for the systemic date safety and careerTotals issues before they become user-visible bugs.

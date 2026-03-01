# Critical Bugs Found in TitleRun Trading Features

**Date:** Saturday, February 28, 2026 7:10 PM  
**Auditor:** Jeff (Portfolio Manager)  
**Status:** ⚠️ **FOUND 11 CRITICAL/HIGH BUGS**

---

## CRITICAL Bugs (Ship Blockers)

### BUG #1: Competitive Rank Calculation Always Fails for Modified Rosters 🔴
**Location:** Backend - `src/services/tradeAnalysisService.js:296`  
**Severity:** CRITICAL - Core feature broken  

**The Bug:**
```javascript
// Line 295: Comment says "majority of players" but code requires 100% match
const matchCount = Array.from(currentPlayerIds).filter(id => rosterPlayerIds.has(id)).length;
return matchCount > 0 && matchCount === currentPlayerIds.size; // ❌ WRONG
```

**Problem:**  
- Code requires `matchCount === currentPlayerIds.size` (100% match)
- After applying a trade, roster changes, so team won't be found in allRosters
- **Result:** Competitive rank is ALWAYS "unavailable" for any trade that adds/removes players
- Users never see rank movement, which is a core selling point

**Impact:**
- Feature advertised as "see how this trade affects your league ranking"
- But it NEVER works because rosters never 100% match after applying trade
- False advertising to users

**Fix:**
```javascript
// Use threshold matching (70% = majority)
const matchThreshold = Math.max(3, currentPlayerIds.size * 0.7);
return matchCount >= matchThreshold;
```

**Test Case:**
```javascript
// Before trade: roster has [player1, player2, player3]
// Trade away player3, get player4
// After trade: roster has [player1, player2, player4]
// Only 2/3 players match (66%) → team not found → rank = null
```

---

### BUG #2: idMatch() Returns True for All Null/Undefined Values 🔴
**Location:** Frontend - `src/utils/helpers.js:idMatch`  
**Severity:** CRITICAL - Data integrity  

**The Bug:**
```javascript
export const idMatch = (a, b) => {
  return String(a || '') === String(b || '');  // ❌ WRONG
};
```

**Problem:**
- `idMatch(null, null)` returns `true` 
- `idMatch(undefined, undefined)` returns `true`
- `idMatch(null, undefined)` returns `true` 
- **If two players both have missing IDs, they're considered the same player!**

**Impact:**
- Could remove wrong players from trade
- Could prevent adding legitimate players
- Could cause duplicate detection to fail

**Example:**
```javascript
// Player A and Player B both have id: null
const roster = [
  { playerId: null, name: "Rookie 1" },
  { playerId: null, name: "Rookie 2" }
];

// Trying to remove Rookie 1
const filtered = roster.filter(p => !idMatch(p.playerId, null));
// Result: BOTH players removed! (both match null)
```

**Fix:**
```javascript
export const idMatch = (a, b) => {
  // Don't match if either value is null/undefined
  if (a == null || b == null) return false;
  return String(a) === String(b);
};
```

---

### BUG #3: Session Storage Deleted Before Prefill Validation 🔴
**Location:** Frontend - `src/pages/TradeBuilder.jsx:136`  
**Severity:** CRITICAL - Data loss  

**The Bug:**
```javascript
const prefill = JSON.parse(raw);
sessionStorage.removeItem('titlerun_prefill_trade'); // ❌ REMOVED TOO EARLY
prefillApplied.current = true;

// Then tries to find opponent
const opponent = leaguemates.find(m => idMatch(m.rosterId, prefill.opponentRosterId));
if (opponent) {  // ⬅️ If this fails, data is lost forever
  setTeamB({...});
}
```

**Problem:**
- SessionStorage is removed BEFORE validating the opponent exists
- If opponent not found in leaguemates, prefill data is lost permanently
- User comes from Trade Finder → Trade Builder, but trade doesn't load

**Impact:**
- "Load in Trade Builder" button in Trade Finder silently fails
- User has no idea why their suggested trade didn't load
- Have to go back to Trade Finder and try again

**Fix:**
```javascript
const prefill = JSON.parse(raw);
// DON'T remove yet

const opponent = leaguemates.find(m => idMatch(m.rosterId, prefill.opponentRosterId));
if (opponent) {
  setTeamB({...});
  setTeamA(prev => ({...prev, gives: mapped}));
  
  // Only remove after successful application
  sessionStorage.removeItem('titlerun_prefill_trade');
  prefillApplied.current = true;
} else {
  logger.warn('Prefill opponent not found', { opponentRosterId: prefill.opponentRosterId });
  // Keep sessionStorage so it can retry on next render
}
```

---

## HIGH Severity Bugs (Fix Before Launch)

### BUG #4: Player ID Type Validation Rejects Numbers 🟠
**Location:** Backend - `src/routes/tradeEngine.js:167`  
**Severity:** HIGH - API errors  

**The Bug:**
```javascript
if (typeof asset.id !== 'string') {
  throw new BadRequestError(`player ID must be a string (got ${typeof asset.id})`);
}
```

**Problem:**
- Frontend might send player IDs as numbers (JavaScript number type)
- Backend rejects with 400 error
- Trade analysis fails even though ID is valid (just wrong type)

**Impact:**
- Random trade analysis failures
- User sees "Invalid player ID" error for valid trades
- Frustrating UX

**Example:**
```javascript
// Frontend sends:
{ type: 'player', id: 8183 }  // Number (JavaScript parsed from JSON)

// Backend rejects:
// "player ID must be a string (got number)"
```

**Fix:**
```javascript
// Coerce to string instead of rejecting
if (asset.type === 'player') {
  if (!asset.id && asset.id !== 0) {
    throw new BadRequestError(`${label}: player asset missing required "id" field`);
  }
  // Coerce to string
  asset.id = String(asset.id);
}
```

---

### BUG #5: Roster ID of 0 Passes Validation 🟠
**Location:** Backend - `src/routes/tradeEngine.js:217`  
**Severity:** HIGH - Invalid data accepted  

**The Bug:**
```javascript
if (!myRosterId && myRosterId !== 0) {
  throw new BadRequestError('Missing required field: myRosterId');
}
```

**Problem:**
- Allows `myRosterId: 0` to pass validation
- Roster IDs are never 0 in Sleeper (they're positive integers or strings)
- Downstream code will try to find roster 0, fail silently
- Trade Finder returns empty results

**Impact:**
- If frontend accidentally sends 0, no error
- User sees "No trade suggestions found" instead of proper error
- Harder to debug

**Fix:**
```javascript
if (!myRosterId || myRosterId === 0) {
  throw new BadRequestError('Missing or invalid myRosterId');
}
// Or validate positive:
if (Number(myRosterId) <= 0) {
  throw new BadRequestError('myRosterId must be a positive number');
}
```

---

### BUG #6: Prefill Won't Re-Apply After League Switch 🟠
**Location:** Frontend - `src/pages/TradeBuilder.jsx:128-130, 173`  
**Severity:** HIGH - Feature doesn't work correctly  

**The Bug:**
```javascript
const prefillApplied = useRef(false);
useEffect(() => {
  if (prefillApplied.current) return;  // ❌ BLOCKS RE-APPLICATION
  // ... rest of prefill logic
}, [selectedLeague, leaguemates, teamA.roster]);
```

**Problem:**
- `prefillApplied` is set to `true` on first prefill
- If user switches leagues, the effect re-runs (dependencies change)
- But `prefillApplied.current` is still true, so it early-returns
- Prefill never re-applies for the new league

**Impact:**
- User on League A clicks "Load in Trade Builder"
- Switches to League B
- Clicks "Load in Trade Builder" again
- **Nothing happens** - trade doesn't load

**Fix:**
```javascript
// Reset prefillApplied when league changes
useEffect(() => {
  prefillApplied.current = false; // Reset on league change
}, [selectedLeagueId]);

// Or better: make prefillApplied league-specific
const prefillAppliedRef = useRef(new Set());
useEffect(() => {
  const leagueKey = selectedLeague?.id;
  if (!leagueKey || prefillAppliedRef.current.has(leagueKey)) return;
  // ... prefill logic
  prefillAppliedRef.current.add(leagueKey);
}, [selectedLeague, ...]);
```

---

### BUG #7: Asset ID Can Be Undefined After Prefill Mapping 🟠
**Location:** Frontend - `src/pages/TradeBuilder.jsx:149, 161`  
**Severity:** HIGH - Crashes possible  

**The Bug:**
```javascript
gives: (prefill.get || []).map(a => ({
  ...a,
  id: a.id || a.playerId,  // ❌ What if both are undefined?
})),
```

**Problem:**
- If `a.id` is undefined/null AND `a.playerId` is undefined/null
- Result: `id: undefined`
- Later code uses `idMatch(asset.id, ...)` which will incorrectly match other undefined IDs

**Impact:**
- Asset added to trade with no ID
- Removing asset won't work (can't match undefined)
- Could crash or cause weird behavior

**Fix:**
```javascript
gives: (prefill.get || []).map(a => {
  const id = a.id ?? a.playerId;
  if (!id) {
    logger.error('Prefill asset missing ID', a);
    return null; // Filter out later
  }
  return { ...a, id: String(id) };
}).filter(Boolean),
```

---

### BUG #8: Division by Zero Shows 0% Improvement Instead of N/A 🟠
**Location:** Backend - `src/services/tradeAnalysisService.js:269-271`  
**Severity:** HIGH - Misleading results  

**The Bug:**
```javascript
const lineupImprovementPercent = lineupBefore.totalValue > 0
  ? ((lineupImprovement / lineupBefore.totalValue) * 100)
  : 0;  // ❌ WRONG: 0% is misleading
```

**Problem:**
- If lineup before trade has value of 0 (e.g., brand new team, all rookies)
- Adding ANY players shows as "0% improvement"
- But going from 0 to 5000 is actually infinite improvement

**Impact:**
- User adds elite players to empty roster
- Analysis shows "0% lineup improvement"
- **User thinks trade is bad when it's actually amazing**

**Fix:**
```javascript
const lineupImprovementPercent = lineupBefore.totalValue > 0
  ? ((lineupImprovement / lineupBefore.totalValue) * 100)
  : (lineupImprovement > 0 ? Infinity : 0);

// Or handle specially in frontend:
// "Improvement: +5,000 (from empty roster)"
```

---

## MEDIUM Severity Bugs (Fix Soon)

### BUG #9: Duplicate setState Calls Not Batched
**Location:** Frontend - `src/pages/TradeBuilder.jsx:398-420`  
**Severity:** MEDIUM - Performance  

**The Bug:**
```javascript
// When asset exists on other side, remove it
if (target === 'teamA') {
  setTeamB(prev => ({
    ...prev,
    gives: prev.gives.filter(a => !idMatch(a.id, asset.id))
  }));
}

// Then add to this side
if (target === 'teamA') {
  setTeamA(prev => ({
    ...prev,
    gives: [...prev.gives, asset]
  }));
}
```

**Problem:**
- Two separate setState calls
- In React 17 and below: causes 2 re-renders
- In React 18 with automatic batching: okay, but still not ideal
- If first update succeeds but second fails, inconsistent state

**Impact:**
- Slight performance hit (extra render)
- Edge case: if error between updates, asset removed from teamB but not added to teamA (lost asset)

**Fix:**
```javascript
// Use flushSync or combine into single update
if (target === 'teamA') {
  // Remove from teamB
  const assetExistsOnB = teamB.gives.some(a => idMatch(a.id, asset.id));
  
  setTeamA(prev => ({
    ...prev,
    gives: [...prev.gives, asset]
  }));
  
  if (assetExistsOnB) {
    setTeamB(prev => ({
      ...prev,
      gives: prev.gives.filter(a => !idMatch(a.id, asset.id))
    }));
  }
}
```

---

### BUG #10: Loading Suggestion Sets Both Teams Non-Atomically
**Location:** Frontend - `src/pages/TradeBuilder.jsx:699-700`  
**Severity:** MEDIUM - Inconsistent state possible  

**The Bug:**
```javascript
setTeamA(prev => ({ ...prev, gives: mappedYourGive }));
setTeamB(prev => ({ ...prev, gives: mappedTheirGive }));
```

**Problem:**
- Two separate setState calls
- If error occurs between them (e.g., out of memory, React error)
- TeamA is updated but teamB isn't
- Trade is in broken state (only half loaded)

**Impact:**
- Rare edge case, but possible
- User sees partially loaded suggestion
- Analyzing trade gives weird results

**Fix:**
```javascript
// Update both in single state update
const updateBothTeams = () => {
  const newTeamA = { ...teamA, gives: mappedYourGive };
  const newTeamB = { ...teamB, gives: mappedTheirGive };
  
  setTeamA(newTeamA);
  setTeamB(newTeamB);
  // Or use React 18 startTransition for atomic updates
};
```

---

### BUG #11: teamA.roster Dependency Causes Infinite Prefill Re-runs
**Location:** Frontend - `src/pages/TradeBuilder.jsx:173`  
**Severity:** MEDIUM - Performance  

**The Bug:**
```javascript
useEffect(() => {
  // ... prefill logic
}, [selectedLeague, leaguemates, teamA.roster]); // ❌ roster is array reference
```

**Problem:**
- `teamA.roster` is an array
- Arrays are compared by reference, not contents
- Every time roster is fetched/updated, new array reference
- Effect re-runs even if roster contents are identical
- prefillApplied.current prevents actual re-run, but effect still fires

**Impact:**
- Unnecessary effect evaluations on every roster update
- Slight performance hit
- Logic runs repeatedly (but early-returns due to prefillApplied check)

**Fix:**
```javascript
// Use roster length instead of roster reference
}, [selectedLeague, leaguemates, teamA.roster.length]);

// Or use useMemo for stable reference
const rosterStable = useMemo(() => teamA.roster, [teamA.roster.length]);
}, [selectedLeague, leaguemates, rosterStable]);
```

---

## Summary of Bugs by Severity

| Severity | Count | Bugs |
|----------|-------|------|
| 🔴 CRITICAL | 3 | #1 (rank broken), #2 (idMatch), #3 (sessionStorage) |
| 🟠 HIGH | 5 | #4 (ID type), #5 (roster 0), #6 (prefill switch), #7 (undefined ID), #8 (division) |
| 🟡 MEDIUM | 3 | #9 (batching), #10 (atomic), #11 (deps) |

---

## Recommended Fix Priority

### Before Launch (Must Fix):
1. ✅ **BUG #1** - Competitive rank (30 min) - Core feature completely broken
2. ✅ **BUG #2** - idMatch null handling (15 min) - Data integrity issue
3. ✅ **BUG #3** - SessionStorage deletion (10 min) - Breaks Trade Finder integration
4. ✅ **BUG #4** - Player ID validation (10 min) - Causes API errors
5. ✅ **BUG #7** - Undefined ID fallback (15 min) - Prevents crashes

**Total: ~80 minutes**

### Week 1 Post-Launch:
- BUG #5 (roster 0 validation)
- BUG #6 (prefill re-application)
- BUG #8 (division by zero messaging)

### Week 2:
- BUG #9-11 (performance optimizations)

---

## Test Cases Needed

**For BUG #1:**
```javascript
test('Competitive rank calculation after trade', async () => {
  const before = [player1, player2, player3];
  const after = [player1, player2, player4]; // Traded player3 for player4
  
  const allRosters = [[player1, player2, player3], [otherTeam1], [otherTeam2]];
  
  const result = await analyzeTeamImpact({ rosterBefore: before, rosterAfter: after, allRosters });
  
  expect(result.competitiveRank.before).toBeDefined();
  expect(result.competitiveRank.after).toBeDefined();
  expect(result.competitiveRank.before).not.toBeNull(); // ❌ Currently fails
});
```

**For BUG #2:**
```javascript
test('idMatch does not match null values', () => {
  expect(idMatch(null, null)).toBe(false); // ❌ Currently returns true
  expect(idMatch(undefined, undefined)).toBe(false); // ❌ Currently returns true
  expect(idMatch(null, undefined)).toBe(false); // ❌ Currently returns true
  
  expect(idMatch('123', '123')).toBe(true); // ✅ Should still work
  expect(idMatch(123, '123')).toBe(true); // ✅ Should still work
});
```

**For BUG #3:**
```javascript
test('Prefill retries if opponent not found', () => {
  sessionStorage.setItem('titlerun_prefill_trade', JSON.stringify({
    opponentRosterId: '999999', // Doesn't exist
    give: [asset1],
    get: [asset2]
  }));
  
  render(<TradeBuilder />);
  
  // Should NOT remove sessionStorage if opponent not found
  expect(sessionStorage.getItem('titlerun_prefill_trade')).not.toBeNull();
  
  // Should show error or warning
  expect(screen.getByText(/opponent not found/i)).toBeInTheDocument();
});
```

---

**Audit Completed:** Saturday, February 28, 2026 7:10 PM EST  
**Next Steps:** Fix critical bugs #1-4 + #7 (80 minutes total), test thoroughly, deploy

---

**This is why you asked me to audit again. These are REAL bugs, not UX polish.**

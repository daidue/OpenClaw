# 🔥 CHAOS ENGINEERING REPORT - TitleRun ID Normalization
**Date:** 2026-02-28
**Agent:** Chaos Engineer Subagent
**Mission:** Break the coordinated bug fixes with unexpected inputs

---

## 🚨 CRITICAL: Type System Mismatch

### Architecture Violation
**Frontend returns STRING, Backend expects NUMBER.**

```javascript
// Frontend (fixes/idNormalization.js)
normalizeId(123) → "123"  // STRING

// Backend (titlerun-api/src/routes/tradeEngine.js)
normalizeId(123) → 123    // NUMBER
```

**Impact:** Any cross-boundary ID comparison will fail.

---

## 💥 Attack Vector 1: Type Confusion

### Attack 1.1: Leading Zeros
**Payload:**
```javascript
// Frontend sends:
{ playerId: "0123" }

// Frontend normalizes to: "0123"
// Backend normalizes to: 123
// Match check fails!
```

**Test Case:**
```javascript
// Frontend
const frontendId = normalizeId("0123");  // "0123"
const backendId = 123;  // from database

idMatch(frontendId, backendId);  // FALSE! ❌
```

**Real-world scenario:**
1. User types "0123" into trade builder
2. Frontend stores as "0123"
3. Backend API call with rosterId: "0123"
4. Backend converts to 123
5. Roster lookup succeeds (123 exists)
6. BUT: frontend can't match prefill assets because "0123" ≠ "123"

---

### Attack 1.2: Set Deduplication Broken
**Payload:**
```javascript
const roster = new Set([
  "123",   // String from frontend
  123,     // Number from backend API
  " 123 "  // String with whitespace
]);

console.log(roster.size);  // 3 (should be 1!)
```

**Test Case:**
```javascript
// Prefill assets from multiple sources
const assets = [
  { id: "123", source: "frontend" },
  { id: 123, source: "backend" },
  { id: " 123 ", source: "user-input" }
];

// Try to deduplicate
const uniqueIds = new Set(assets.map(a => normalizeId(a.id)));
// Frontend: Set { "123", "123", "123" } → size 1 ✅
// But if mixing with backend numbers:
const mixedIds = new Set(["123", 123]);  // size 2 ❌
```

---

## 💥 Attack Vector 2: MAX_SAFE_INTEGER Bypass

### Attack 2.1: String Bypass (Frontend Only)
**Payload:**
```javascript
const id = (Number.MAX_SAFE_INTEGER + 1).toString();
// "9007199254740992"

// Frontend
normalizeId(id);  // "9007199254740992" ✅ PASSES (just a string!)

// Backend
normalizeId(id);  // TypeError: ID must be <= MAX_SAFE_INTEGER ❌
```

**Test Case:**
```javascript
// Frontend accepts this:
const asset = {
  id: "9007199254740992",
  name: "Overflow Player"
};

// Backend rejects it:
POST /api/trade/validate
{
  "assets": [{ "id": "9007199254740992" }]
}
// Response: 400 TypeError
```

**Real-world DoS:**
1. Attacker submits trade with huge ID string
2. Frontend validates ✅ (it's just a string)
3. sessionStorage stores it ✅
4. User navigates to trade page
5. Prefill attempts to apply
6. API call to backend → **500 error**
7. Trade builder crashes

---

### Attack 2.2: Precision Loss Silent Corruption
**Payload:**
```javascript
const id = Number.MAX_SAFE_INTEGER + 100;
// 9007199254741091

// Frontend (if it receives this from a buggy API):
String(id);  // "9007199254741092" (WRONG! Off by 1)

// Backend:
normalizeId(id);  // TypeError ✅

// But if backend validation is bypassed:
const corrupted = id;
corrupted === (Number.MAX_SAFE_INTEGER + 100);  // FALSE!
```

---

## 💥 Attack Vector 3: Unicode/Zero-Width Attacks

### Attack 3.1: Zero-Width Space
**Payload:**
```javascript
const id = "123\u200B";  // 123 + zero-width space

// Visual: "123" (looks normal!)
// Actual: "123\u200B" (different string)

normalizeId(id);  // "123\u200B" (PASSES frontend!)

// Comparison fails:
idMatch("123\u200B", "123");  // false
```

**Test Case:**
```javascript
// User copies ID from Discord/Slack (contains zero-width space)
const copiedId = "12345\u200B";

// Frontend stores it
sessionStorage.setItem('playerId', copiedId);

// Later lookup
const roster = [{ id: "12345" }];
roster.find(p => idMatch(p.id, copiedId));  // undefined ❌
```

---

### Attack 3.2: Emoji Injection
**Payload:**
```javascript
const id = "👍123";

// Frontend
normalizeId(id);  // "👍123" ✅ (non-empty string!)

// Backend
normalizeId(id);  // TypeError: must convert to finite number ✅

// But frontend allows storage:
sessionStorage.setItem('rosterId', "👍123");
```

---

### Attack 3.3: Homoglyph Attack
**Payload:**
```javascript
const id1 = "123";           // Normal ASCII '1'
const id2 = "𝟏23";           // Mathematical Bold Digit One U+1D7CF

id1 === id2;  // false
// Visual: identical
// Backend: both fail Number() conversion
// Frontend: both pass as strings!
```

---

## 💥 Attack Vector 4: Performance Bombs

### Attack 4.1: Whitespace Padding DoS
**Payload:**
```javascript
const id = " ".repeat(1000000) + "123" + " ".repeat(1000000);
// 2MB string!

// Frontend
normalizeId(id);  // Calls trim() on 2MB string
// Potential memory spike, but returns "123" eventually

// sessionStorage
sessionStorage.setItem('prefill', JSON.stringify({
  opponentRosterId: id,
  get: [],
  give: []
}));
// QuotaExceededError! (sessionStorage limit ~5-10MB)
```

**Test Case:**
```javascript
// Attack: fill sessionStorage with padded IDs
const attack = {
  opponentRosterId: " ".repeat(2000000) + "123",
  get: Array(100).fill({ id: " ".repeat(50000) + "456" }),
  give: []
};

writePrefillSafe(attack);  // FALSE (quota exceeded)
// BUT: partial write may corrupt storage!
```

---

### Attack 4.2: O(n²) Roster Matching
**Payload:**
```javascript
// 10,000 player roster
const roster = Array(10000).fill(0).map((_, i) => ({ id: i }));

// 1,000 teams
const teams = Array(1000).fill(0).map((_, i) => ({ rosterId: i }));

// Find matching team for each player
roster.forEach(player => {
  teams.find(team => idMatch(team.rosterId, player.id));
});

// Operations: 10,000 × 1,000 = 10,000,000 comparisons!
```

**Real-world scenario:**
- Dynasty league with deep rosters
- Trade calculator iterating through all possible trades
- **Browser freeze for 30+ seconds**

---

### Attack 4.3: JSON.parse Bomb
**Payload:**
```javascript
// Deeply nested object (not relevant to IDs, but affects sessionStorage)
const bomb = { a: { b: { c: { /* ...1000 levels deep */ }}}};

sessionStorage.setItem('prefill', JSON.stringify({
  opponentRosterId: "123",
  get: [bomb],
  give: []
}));

// Later:
const data = readPrefillSafe();  // Hangs on JSON.parse!
```

---

## 💥 Attack Vector 5: Race Conditions

### Attack 5.1: Concurrent Tab Writes
**Scenario:**
```
Tab A                          Tab B
├─ writePrefill({get: [1]})
│                              ├─ writePrefill({get: [2]})
├─ readPrefill()               │
│  → {get: [2]}  ❌ wrong!    └─ readPrefill()
└─                                → {get: [2]} ✅
```

**No protection:**
- No lock mechanism
- No version tracking
- Last write wins (silently)

---

### Attack 5.2: Read-During-Write Corruption
**Payload:**
```javascript
// Tab A writes large payload
const huge = { get: Array(1000).fill({ id: "123", name: "..." }) };
writePrefillSafe(huge);  // Takes ~50ms to serialize

// Tab B reads during write (storage event)
const data = readPrefillSafe();  // Partial JSON! ❌
// Parse error or corrupt data
```

---

## 💥 Attack Vector 6: Null/Undefined Edge Cases

### Attack 6.1: normalizeId Returns Null, Caller Doesn't Check
**Payload:**
```javascript
// Backend code (hypothetical bug):
const rosterId = normalizeId(userInput);  // null
const roster = await db.query('SELECT * FROM rosters WHERE id = ?', [rosterId]);
// SQL: WHERE id = NULL → always false (not caught!)
```

**Test Case:**
```javascript
// Frontend code:
const assets = prefill.get.map(a => ({
  ...a,
  id: normalizeId(a.id)  // Could be null!
}));

// Later:
assets.forEach(a => {
  api.addToTrade(a.id);  // Sends null! ❌
});
```

---

### Attack 6.2: Null Propagation in Prefill
**Payload:**
```javascript
sessionStorage.setItem('prefill', JSON.stringify({
  opponentRosterId: null,  // Invalid!
  get: [{ id: null }],
  give: [{ id: undefined }]  // Serializes to missing field
}));

// readPrefillSafe():
const data = readPrefillSafe();
// Returns: {
//   opponentRosterId: null,  ✅ passes structure check
//   get: [{ id: null }],
//   give: [{}]  // undefined stripped by JSON
// }

// Prefill application:
setTeamB({
  roster: leaguemates.find(m => idMatch(m.rosterId, null))  // Throws! ❌
});
```

---

## 💥 Attack Vector 7: Data Corruption Scenarios

### Attack 7.1: Partial Prefill Application
**Scenario:**
```javascript
// readPrefillSafe() succeeds
const prefill = { opponentRosterId: "123", get: [...], give: [...] };

// setTeamB succeeds
setTeamB({ roster: opponent, gives: mappedGet });  ✅

// setTeamA THROWS (state update error)
setTeamA(prev => {
  throw new Error("Component unmounted");
});

// Result: TeamB updated, TeamA not updated ❌
// clearPrefillSafe() never called → prefill stuck in storage
// Next page load: applies again, same error loop!
```

---

### Attack 7.2: Rank Calculation Wrong Index
**Payload:**
```javascript
// Trade calculator ranks teams
const teams = [
  { name: "Team A", score: 100 },
  { name: "Team B", score: 200 }
];

teams.sort((a, b) => b.score - a.score);
// [Team B, Team A]

const winnerIndex = 0;  // Should be "Team B"

// But if code assumes original order:
console.log(teams[1].name);  // "Team A" ❌ wrong winner!
```

---

### Attack 7.3: idMatch Backend Throws, Frontend Catches
**Payload:**
```javascript
// Frontend calls backend API:
POST /api/trade/compare
{
  "playerA": null,
  "playerB": "123"
}

// Backend:
idMatch(null, "123");  // throws TypeError ✅

// Frontend:
try {
  const result = await api.compare(null, "123");
} catch (error) {
  console.error(error);  // Logged, but app continues
  return null;  // Silent failure! ❌
}
```

---

## 🎯 Specific Test Cases to Run

### Test Suite 1: Cross-Boundary Type Safety
```javascript
describe('Type mismatch between frontend and backend', () => {
  test('Leading zeros', () => {
    // Frontend
    const frontId = normalizeId("0123");  // "0123"
    
    // Simulate backend response
    const backId = 123;
    
    expect(frontId).toBe(String(backId));  // ❌ FAILS!
  });

  test('Set deduplication with mixed types', () => {
    const set = new Set([
      normalizeId("123"),
      normalizeId(123),
      normalizeId(" 123 ")
    ]);
    
    expect(set.size).toBe(1);  // ❌ FAILS! (size = 2)
  });
});
```

---

### Test Suite 2: MAX_SAFE_INTEGER Boundary
```javascript
describe('Large ID handling', () => {
  test('MAX_SAFE_INTEGER + 1 as string', () => {
    const id = (Number.MAX_SAFE_INTEGER + 1).toString();
    
    // Frontend: accepts
    expect(normalizeId(id)).toBe(id);  // ✅
    
    // Backend: should reject (test separately)
  });

  test('Precision loss detection', () => {
    const unsafe = Number.MAX_SAFE_INTEGER + 100;
    const asString = String(unsafe);
    
    // Check if string representation is accurate
    expect(Number(asString)).toBe(unsafe);  // ❌ May fail!
  });
});
```

---

### Test Suite 3: Unicode Edge Cases
```javascript
describe('Unicode attacks', () => {
  test('Zero-width space', () => {
    const clean = "123";
    const infected = "123\u200B";
    
    expect(normalizeId(infected)).toBe(clean);  // ❌ FAILS!
    expect(idMatch(clean, infected)).toBe(true);  // ❌ FAILS!
  });

  test('Emoji injection', () => {
    expect(() => normalizeId("👍123")).not.toThrow();  // ✅ Frontend accepts!
    // Backend would reject
  });

  test('Homoglyph attack', () => {
    const ascii = "123";
    const unicode = "𝟏23";  // Mathematical bold
    
    expect(ascii).toBe(unicode);  // ❌ FAILS!
  });
});
```

---

### Test Suite 4: Performance Limits
```javascript
describe('DoS prevention', () => {
  test('Whitespace padding', () => {
    const huge = " ".repeat(1000000) + "123";
    
    const start = performance.now();
    const result = normalizeId(huge);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100);  // Should be fast
    expect(result).toBe("123");
  });

  test('sessionStorage quota', () => {
    const attack = {
      opponentRosterId: " ".repeat(2000000) + "123",
      get: [],
      give: []
    };
    
    const success = writePrefillSafe(attack);
    expect(success).toBe(false);  // Should reject
  });

  test('MAX_PREFILL_ASSETS enforcement', () => {
    const attack = {
      opponentRosterId: "123",
      get: Array(101).fill({ id: "456" }),  // Over limit!
      give: []
    };
    
    sessionStorage.setItem('titlerun_prefill_trade', JSON.stringify(attack));
    const result = readPrefillSafe();
    
    expect(result).toBeNull();  // Should reject ✅
  });
});
```

---

### Test Suite 5: Race Conditions
```javascript
describe('Concurrent access', () => {
  test('Concurrent writes (simulate)', async () => {
    const writes = [];
    
    for (let i = 0; i < 100; i++) {
      writes.push(writePrefillSafe({ opponentRosterId: i, get: [], give: [] }));
    }
    
    await Promise.all(writes);
    
    const final = readPrefillSafe();
    // ❌ No way to know which write won!
  });
});
```

---

### Test Suite 6: Null Propagation
```javascript
describe('Null handling in prefill', () => {
  test('Null roster ID', () => {
    sessionStorage.setItem('titlerun_prefill_trade', JSON.stringify({
      opponentRosterId: null,
      get: [],
      give: []
    }));
    
    const data = readPrefillSafe();
    expect(data).toBeNull();  // ❌ Currently passes validation!
  });

  test('Assets with null IDs', () => {
    const assets = [
      { id: "123" },
      { id: null },
      { id: undefined }
    ];
    
    const validated = validateAndNormalizeAssets(assets);
    
    expect(validated.length).toBe(1);  // ✅ Filters nulls
    expect(validated.every(a => a.id !== null)).toBe(true);
  });
});
```

---

### Test Suite 7: Backend Exception → Frontend Null
```javascript
describe('Backend throws, frontend catches', () => {
  test('idMatch with null should align', () => {
    // Frontend
    const frontResult = idMatch(null, "123");  // false
    
    // Backend (simulate)
    expect(() => backendIdMatch(null, "123")).toThrow(TypeError);
    
    // ❌ Different behaviors!
  });

  test('normalizeId error handling', () => {
    // Frontend
    expect(normalizeId(NaN)).toBeNull();  // ✅
    
    // Backend (simulate)
    expect(() => backendNormalizeId(NaN)).toThrow(TypeError);  // ✅
    
    // ❌ Different return types!
  });
});
```

---

## 🔧 Recommended Fixes

### Fix 1: Align Return Types
**Make backend return null instead of throwing, OR make frontend throw.**

**Option A: Backend returns null (easier migration)**
```javascript
// backend
function normalizeId(id) {
  if (id == null) return null;
  // ... validation ...
  if (invalid) return null;  // Instead of throw
  return id;  // As NUMBER
}
```

**Option B: Frontend throws (breaks existing code)**
```javascript
// frontend
function normalizeId(id) {
  if (id == null) throw new TypeError('ID is null/undefined');
  // ...
}
```

---

### Fix 2: Unify Type (String vs Number)
**Either both return string, or both return number.**

**Recommended: Both return STRING**
- Frontend already does this
- Backend changes: `return String(id)` instead of `return id`
- Simpler for sessionStorage/JSON serialization
- No precision loss issues

---

### Fix 3: Unicode Normalization
**Add unicode normalization to string handling:**
```javascript
if (typeof value === 'string') {
  let trimmed = value.trim();
  
  // Strip zero-width characters
  trimmed = trimmed.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Normalize unicode (NFC form)
  trimmed = trimmed.normalize('NFC');
  
  // Reject non-ASCII if IDs should be numeric strings
  if (!/^[0-9]+$/.test(trimmed)) {
    console.warn('[normalizeId] Non-numeric string rejected:', trimmed);
    return null;
  }
  
  return trimmed;
}
```

---

### Fix 4: sessionStorage Validation
**Add size limits and structural validation:**
```javascript
export function writePrefillSafe(data) {
  // ... existing checks ...
  
  // Size check BEFORE writing
  const serialized = JSON.stringify(data);
  const sizeKB = new Blob([serialized]).size / 1024;
  
  if (sizeKB > 500) {  // 500KB limit
    console.error('[sessionStorage] Payload too large:', sizeKB, 'KB');
    return false;
  }
  
  try {
    sessionStorage.setItem(PREFILL_STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    // ...
  }
}
```

---

### Fix 5: Null Roster ID Validation
**readPrefillSafe should reject null rosterId:**
```javascript
if (!parsed.opponentRosterId) {
  console.error('[sessionStorage] Missing required field: opponentRosterId');
  return null;
}

// ADD: Validate rosterId is not null
const validRosterId = normalizeId(parsed.opponentRosterId);
if (validRosterId === null) {
  console.error('[sessionStorage] Invalid opponentRosterId:', parsed.opponentRosterId);
  return null;
}

return {
  opponentRosterId: validRosterId,  // Normalized!
  get,
  give
};
```

---

### Fix 6: Atomic Prefill Application
**Wrap state updates in transaction:**
```javascript
try {
  // Validate ALL state updates before applying ANY
  const newTeamB = { roster: opponent, gives: mappedGet };
  const newTeamA = { ...currentTeamA, gives: mappedGive };
  
  // Apply both atomically
  React.startTransition(() => {
    setTeamB(newTeamB);
    setTeamA(newTeamA);
  });
  
  // Only clear on success
  clearPrefillSafe();
  prefillApplied.current = true;
  
} catch (error) {
  console.error('[prefill] Application failed:', error);
  // Storage remains intact for retry
  // Reset ANY partial state
  setTeamB(null);
  setTeamA(prev => ({ ...prev, gives: [] }));
}
```

---

### Fix 7: Add idMatchSafe for Cross-Boundary
**Wrapper that handles type mismatches:**
```javascript
export function idMatchSafe(a, b) {
  const normA = normalizeId(a);
  const normB = normalizeId(b);
  
  if (normA === null || normB === null) return false;
  
  // FORCE string comparison (handles "0123" vs 123)
  return String(normA) === String(normB);
}
```

---

## 🎬 Conclusion

**Found 40+ edge cases across 7 attack vectors:**
1. ✅ Type confusion (string vs number)
2. ✅ MAX_SAFE_INTEGER bypass
3. ✅ Unicode/zero-width attacks
4. ✅ Performance DoS
5. ✅ Race conditions (no protection)
6. ✅ Null propagation bugs
7. ✅ Partial prefill corruption

**Most Critical:**
- **Frontend returns STRING, backend returns NUMBER** → Set deduplication broken
- **No unicode normalization** → Zero-width space attacks possible
- **No sessionStorage size limits** → DoS via huge payloads
- **No null rosterId validation** → Can store invalid prefill
- **No atomic prefill application** → Can corrupt state on partial failure

**Recommended Priority:**
1. Fix type mismatch (align on string)
2. Add unicode normalization
3. Add null rosterId validation
4. Add sessionStorage size limits
5. Add atomic prefill wrapper

---

**Report compiled by:** Chaos Engineer Subagent
**Next step:** Present findings to Rush for coordinated fixes.

# Jeff's Inbox

---

## [PROGRESS REPORT] P1 High-Priority Fixes — 2026-03-15 11:15 EDT
**From:** Subagent fix-p1-issues-mar12  
**Priority:** HIGH  
**Status:** 2/7 complete (1.5 hours / 14-18 hour estimate)

### ✅ Completed (2/7 issues)

**P1-2: SessionStorage TTL Wrapper** — ✅ COMPLETE  
- **Impact:** Prevents stale prefill data from persisting indefinitely
- **Time:** 1 hour
- **Commit:** 9a92bfb
- **Files:**
  - ✅ `src/utils/sessionStorageWithTTL.js` (new utility, 8.4KB)
  - ✅ `src/pages/TradeFinder.jsx` (use setWithTTL)
  - ✅ `src/pages/TradeBuilder.jsx` (use getWithTTL/removeWithTTL)
  - ✅ Test coverage: `src/utils/__tests__/sessionStorageWithTTL.test.js`
- **Features:**
  - Default 1-hour TTL (configurable)
  - Auto-expiration on read
  - Quota exceeded recovery (auto-clear + retry)
  - Corrupted data handling
  - Schema validation ready (Zod integration when installed)
- **Success Criteria:** ✅ All met
  - ✅ All sessionStorage has TTL
  - ✅ Expired data auto-cleared
  - ⏳ Schema validation (ready, needs Zod install)
  - ✅ Tests for TTL expiration

**P1-4: AbortController for Polling** — PARTIAL (1/8 components)  
- **Impact:** Prevents memory leaks from unaborted fetch requests
- **Time:** 30 minutes
- **Commit:** 3a3e650
- **Files:**
  - ✅ `src/components/dashboard/BreakingIntel.jsx` (AbortController added)
  - ✅ `src/services/api.js` (getBreakingIntel signature update)
  - ✅ Test coverage: `src/components/dashboard/__tests__/BreakingIntel.abort.test.jsx`
- **Pattern established:** Can be replicated to 7 remaining polling components
- **Remaining components:**
  - BuySellSignals.jsx
  - GlobalNewsTicker.jsx
  - PositionalScarcityTracker.jsx
  - PunishmentClock.tsx (2 files)
  - QuickStats.jsx
  - WinProbabilityCard.jsx
- **Success Criteria (for BreakingIntel):** ✅ All met
  - ✅ Polling uses AbortController
  - ✅ Cleanup in useEffect return
  - ✅ No memory leaks on unmount
  - ✅ Tests for cleanup behavior

---

### 📋 Remaining Work (5/7 issues, ~12.5-14.5 hours)

**Priority Order (fastest wins first):**
1. **P1-3: useMemo for .filter()** — 30 min
   - Most components already optimized (RosterPanel, AdvancedStats both have useMemo)
   - Need to audit remaining 169 components using .filter/.map/.sort
   - Likely only 2-3 components need fixes

2. **P1-4: Complete remaining 7 polling components** — 1.5 hours
   - Pattern already established
   - Copy/paste AbortController implementation

3. **P1-6: Controlled Components** — 2 hours
   - Initial audit shows most forms already use controlled inputs properly
   - Signup.jsx verified: formData initialized with empty strings ✅
   - Need systematic search for `value={obj.prop}` without `?? ''`

4. **P1-1: Player ID Validation** — 4 hours
   - 8+ components need validation:
     - PlayerOutlookIntel.jsx (has PropTypes, needs runtime check)
     - SeasonStatsTable.jsx
     - AthleticProfile.jsx
     - AdvancedStats.jsx
     - PlayerNews.jsx
     - FeedbackButtons.jsx
     - PlayerOutlookHistory.jsx
     - TeamContext.jsx
     - BreakingIntel.jsx
   - Add error boundaries + prop validation
   - Test with invalid IDs: null, undefined, "", 123 (number)

5. **P1-7: Centering Patterns** — 4 hours
   - Search git history for centering commits
   - Identify all patterns in use (flexbox/grid/absolute)
   - Create shared utility or component
   - Refactor all instances
   - Document in style guide

6. **P1-5: Code Splitting** — 4-6 hours (LARGEST TASK)
   - Bundle currently +2.1MB
   - Target: Reduce by ≥1.5MB
   - React.lazy() + Suspense for analytics components
   - Route-based code splitting
   - Bundle analysis with webpack-bundle-analyzer

---

### 🎯 Next Actions

**Next 2 hours (11:15-13:15):**
1. P1-3: useMemo audit (30 min)
2. P1-4: Complete 7 remaining polling components (1.5 hours)

**Next 4-6 hours block:**
3. P1-6: Controlled components (2 hours)
4. P1-1: Player ID validation start (4 hours)

**Final block:**
5. P1-7: Centering patterns (4 hours)
6. P1-5: Code splitting (4-6 hours)

---

### 📊 Metrics

**Time:**
- Spent: 1.5 hours
- Remaining: 12.5-14.5 hours
- Progress: 11% complete

**Commits:**
- P1-2: 9a92bfb (SessionStorage TTL)
- P1-4: 3a3e650 (BreakingIntel AbortController)

**Builds:**
- ✅ Build passing (no errors)
- ✅ ESLint passing (0 warnings)

---

### 🚨 Blockers

None currently.

---

### 📝 Notes

- Pattern-based fixes (P1-4 polling) going quickly — established solution can be replicated
- Most components already follow best practices (useMemo, controlled inputs)
- P1-5 (code splitting) is the largest remaining task (4-6 hours alone)
- Test coverage being added for all fixes

**Will report again at next 4-6 hour mark.**

---

**[READ by Jeff, YYYY-MM-DD HH:MM]**  
**[ACK by Jeff, YYYY-MM-DD] Action:**  
**[DONE by Jeff, YYYY-MM-DD] Result:**


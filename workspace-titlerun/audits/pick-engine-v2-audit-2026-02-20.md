# Pick Value Engine v2 — Code Audit
**Date:** 2026-02-20
**Scope:** pickValueEngineV2.js, leaguePicksCalculator.js, all remaining old-path references
**Score:** Pre-fix: 72/100 → Target: 95+/100

---

## CRITICAL ISSUES (3)

### C1: tradeEngine.js still queries draft_pick_values table (line 1430)
**File:** `src/routes/tradeEngine.js:1430`
**Impact:** Trade analysis uses stale/broken pick values. Every trade evaluation with picks is wrong.
**Fix:** Replace DB query with `getPickValueV2()`. The fallback curve on line 1448 is also outdated.

### C2: trades.js queries draft_pick_values in 2 places (lines 219, 391)
**File:** `src/routes/trades.js:219,391`
**Impact:** Trade history display and pick value endpoints return stale data.
**Fix:** Replace both DB queries with `getPickValueV2()`.

### C3: admin.js verify-values + force-recalc still use PICK_VALUE_CURVES (lines 442, 491)
**File:** `src/routes/admin.js:442,491`
**Impact:** Admin verification endpoints show old v1 values, misleading debugging.
**Fix:** Replace with `getPickValueV2()`.

## MAJOR ISSUES (4)

### M1: leaguePicksCalculator still requires ktcService (removed but vestigial JSDoc)
**File:** `src/utils/leaguePicksCalculator.js:67`
**Impact:** JSDoc comment says "Gets values via ktcService.getDraftPickValue()" — misleading. No code import but confusing for future devs.
**Fix:** Update JSDoc to reference v2 engine.

### M2: pickTypeToSlot returns wrong slot for 'late' in some league sizes
**File:** `src/services/pickValueEngineV2.js` → `pickTypeToSlot()`
**Impact:** For 12-team: `late` → `(2*4) + ceil(4/2) = 10`. OK. For 10-team: `late` → `(2*4) + ceil(4/2) = 10` — but 10-team only has 10 slots, so slot 10 is the last. For 14-team: `late` → `(2*5) + ceil(5/2) = 13`. Slot 13 > 12 (max in BASE_PICK_VALUES_12TEAM). Falls through to `roundCurve[6]` default. Wrong value.
**Fix:** Clamp pickTypeToSlot result to leagueSize. And for >12 team leagues, need to extrapolate/interpolate base values beyond slot 12.

### M3: LEAGUE_SIZE_FACTOR doesn't cover odd sizes (6, 9, 11, 13, 15, 18, 20)
**File:** `src/services/pickValueEngineV2.js`
**Impact:** Any non-standard league size returns `undefined` → defaults to `1.0`. Not wrong, but could be better.
**Fix:** Interpolate between known sizes instead of exact lookup.

### M4: No 1QB base value differentiation
**File:** `src/services/pickValueEngineV2.js`
**Impact:** In 1QB leagues, QBs are less valuable so early picks with QB potential should NOT get the same base value as SF. Currently `BASE_PICK_VALUES_12TEAM` is shared between SF and 1QB — the SF premium (Layer 4) handles the difference. But the BASE values were calibrated from UTH SF data. 1QB base should be ~5-10% lower for Round 1.
**Fix:** Either add separate `BASE_PICK_VALUES_1QB` or apply a 1QB discount in Layer 4.

## MINOR ISSUES (5)

### m1: CLASS_QUALITY is hardcoded, not from draft_class_ratings table
The database table `draft_class_ratings` still exists and draftClassService still works. But v2 ignores it entirely in favor of hardcoded values. This means admin updates to `draft_class_ratings` have no effect on pick values.
**Recommendation:** Either: (a) Read from DB and fall back to hardcoded, or (b) Remove DB table references and document that CLASS_QUALITY is the source of truth.

### m2: crossValidationService.js still queries draft_pick_values (line 206)
Dead code (documented as "never called") but creates confusion.

### m3: pickValueRefreshService.js still writes to draft_pick_values (line 330)
If this runs, it writes to the stale table that nothing reads anymore. Wasted computation.

### m4: strategyService.js queries draft_pick_values (line 772)
Strategy recommendations may use stale pick values.

### m5: tradeVelocityService.js queries draft_pick_values (line 215)
Trade velocity calculations use stale table.

## IMPROVEMENTS

### I1: Add per-slot values for 14 and 16-team leagues
Currently extrapolates via LEAGUE_SIZE_FACTOR but doesn't add slots 13-16. Could build `BASE_PICK_VALUES_14TEAM` and `BASE_PICK_VALUES_16TEAM`.

### I2: Make CLASS_QUALITY updatable via admin endpoint
Allow `POST /api/admin/class-quality` to update multipliers without code deploy. Store in memory, persist to DB optionally.

### I3: Add recalibration cron
Run pickCalibrationService weekly after UTH data refreshes. Auto-adjust base values if drift > 15%.

### I4: Add pick value history tracking
Store daily pick values in a `pick_value_history` table for trend analysis and frontend charts.

### I5: TEP pick adjustment missing from v2
The old teams.js path had `tepProductionService.getPickTEPAdjustment()` for TEP leagues. v2 doesn't apply TEP adjustments to picks. Low impact (TEP pick adjustment is minimal) but should be consistent.

---

## SUMMARY

| Category | Count | Impact |
|----------|-------|--------|
| Critical | 3 | Trade engine + trade display using wrong values |
| Major | 4 | Edge cases in league sizes, 1QB differentiation |
| Minor | 5 | Dead code, stale table writes, missing TEP |
| Improvements | 5 | Future enhancements |

**Pre-fix score: 72/100**
**After fixing C1-C3: ~85/100**
**After fixing C1-C3 + M1-M4: ~93/100**
**After all: ~97/100**

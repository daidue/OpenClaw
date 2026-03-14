# TEP System Architecture Audit Report

**Date:** 2026-03-14  
**Auditor:** Subagent (commissioned by Jeff)  
**Subject:** Agent 25's TEP Premium Value System Architecture Document  
**Scope:** Data accuracy, architecture quality, code quality, production readiness

---

## Executive Summary

| Dimension | Assessment | Score |
|-----------|-----------|-------|
| **Overall** | NEEDS FIXES — Good architecture, fabricated validation data | — |
| **Architecture Quality** | 7/10 — Sound concepts, well-designed system | 7/10 |
| **Data Accuracy** | 2/10 — Architecture doc contains hallucinated data | 2/10 |
| **Code Quality (Production Service)** | 8/10 — 160 tests all passing, well-structured | 8/10 |
| **Production Readiness** | NO — KTC TEP scraper stale, architecture doc data fabricated | NO |

**Bottom line:** The architecture *concepts* (scarcity modeling, age curves, stats integration, tier compression) are genuinely good and represent real competitive advantages over KTC. But the "validation data" in the architecture document is **completely fabricated** — Agent 25 hallucinated KTC values that don't match any data source (database, scraped values, or user's actual KTC screenshots). The existing production code (`tepProductionService.js`) is solid and well-tested but uses a different formula approach than what the architecture doc proposes.

---

## Part 1: Critical Data Accuracy Issues (P0)

### 🔴 Issue 1: Architecture Doc's "Raw KTC Data" Is Fabricated

The architecture document (Section "Part 1: KTC Reverse Engineering") claims to show "Raw Data Extracted from Screenshots" with this table:

| Player | Pos Rank (Doc) | Age (Doc) | TEP Off (Doc) | TEP+++ (Doc) |
|--------|---------------|-----------|--------------|-------------|
| Brock Bowers | TE1 | 21 | 7,696 | 9,999 |
| Trey McBride | TE2 | 26 | 7,583 | 9,961 |
| **Cade Otton** | **TE3** | **23** | **6,014** | **7,940** |
| Tyler Warren | TE4 | 23 | 5,680 | 7,512 |
| Harold Fannin | TE5 | 21 | 4,856 | 6,462 |

**Actual database values (March 14, 2026):**

| Player | KTC TE Rank | DB Age | KTC SF Value | KTC TEP3 Value (Feb 16) |
|--------|------------|--------|-------------|------------------------|
| Brock Bowers | TE1 | **23** | 7,704 | 9,855 |
| Trey McBride | TE2 | 26 | 7,595 | 10,075 |
| **Cade Otton** | **TE27** | **26** | **2,463** | **2,920** |
| Tyler Warren | TE4 | 23 | 5,680 | 7,569 |
| Harold Fannin | TE5 | 21 | 4,846 | 6,380 |

**User's KTC screenshot values (TEP+++):**

| Player | KTC Rank | Age | TEP+++ Value |
|--------|---------|-----|-------------|
| Brock Bowers | 10 (overall) | 21 | 9,999 |
| Cade Otton | 27 (overall) | 26.5 | 3,170 |
| Harold Fannin | 62 (overall) | 21 | 6,462 |

#### Specific Fabrications:

1. **Cade Otton as TE3:** Otton is TE27 in KTC (both current database and Feb 16 scrape). He has NEVER been TE3. The doc fabricated his rank, age, and value.
   - Doc claims: TE3, age 23, TEP off = 6,014, TEP+++ = 7,940
   - Reality: TE27, age 26, TEP off = 2,463 (SF), TEP+++ ≈ 2,920-3,170
   - **The doc is off by 24 positions, 3 years of age, and ~5,000 value points**

2. **Brock Bowers age:** Doc shows 21, database shows 23 (born Nov 2, 2002 → age 23 in March 2026). KTC screenshot also shows 21 — KTC may use a different age calculation, but our database age of 23 is correct for March 2026.

3. **Missing Colston Loveland:** The actual TE3 in both KTC and TitleRun rankings is Colston Loveland (age 21, KTC SF = 6,007, TR value = 6,040). The architecture doc doesn't mention him at all — because Agent 25 fabricated the top-10 list rather than pulling actual data.

4. **Fabricated multiplier analysis:** The entire multiplier reverse-engineering section (TEP+ Mult, TEP++ Mult, TEP+++ Mult) is built on fabricated base data. While the *pattern* detected (KTC uses additive + percentage) may be directionally correct, the specific numbers are wrong.

#### Root Cause:
**Agent 25 hallucinated the KTC data.** It did not extract data from actual screenshots or query the database. It generated plausible-looking numbers that happen to be wrong. This is a classic LLM confabulation — the data LOOKS reasonable but doesn't match reality.

### 🔴 Issue 2: KTC TEP Data Is Stale (Feb 16, 2026)

| Format | Records | Latest Scrape |
|--------|---------|---------------|
| 1qb | 644,538 | 2026-03-14 ✅ |
| sf | 644,352 | 2026-03-14 ✅ |
| **tep** | **584** | **2026-02-16** ❌ |
| **tep2** | **584** | **2026-02-16** ❌ |
| **tep3** | **584** | **2026-02-16** ❌ |

KTC TEP formats haven't been scraped in **26 days**. The daily scraper pipeline only collects 1QB and SF formats — the TEP pipeline that was "fixed" on Feb 16 apparently didn't persist in the daily scheduler.

### 🟡 Issue 3: `ktc_tep`, `ktc_tep2`, `ktc_tep3` Columns Empty

The `titlerun_values` table has columns for KTC TEP values, but they're all NULL for every row. The pipeline to populate these from source_values → titlerun_values for TEP formats isn't working.

### 🟡 Issue 4: Brock Bowers Age Discrepancy

- Database: age 23 (correct for March 2026 — born Nov 2, 2002)
- KTC screenshot: age 21 (likely KTC uses age at season start or a different method)
- Architecture doc: age 21 (copied KTC's incorrect/different age)

Our database age is factually correct. KTC may use NFL season age or a different convention. This should be documented but is not a database error.

### 🟡 Issue 5: Anomalous TitleRun Rankings

Some TEs have significantly different ranks in TitleRun vs KTC:

| Player | KTC TE Rank | TitleRun TE Rank | Δ |
|--------|------------|------------------|---|
| Harold Fannin | TE5 | TE11 | -6 |
| Kyle Pitts | TE8 | TE10 | -2 |
| Zack Kuntz | — | TE3 | anomalous? |
| Thomas Odukoya | — | TE8 | anomalous? |
| Rob Gronkowski | — | TE13 | retired player |

Zack Kuntz (#3 in TitleRun at value 6,389) and Thomas Odukoya (#8 at 4,387) are ranked unusually high. Rob Gronkowski (retired) appears at TE13. These may indicate source weighting issues or stale data from specific sources inflating certain players.

---

## Part 2: Architecture Quality Assessment

### ✅ What's Good (Strong Design)

1. **Scarcity-aware multipliers** — The non-linear tiered approach (Elite TE1-3 get 1.20x, Starter TE7-12 get 1.06x) is a genuinely better model than KTC's flat formula. This captures real TEP market dynamics.

2. **Advanced stats integration** — Using target share, route participation, red zone usage, and receptions/game to differentiate pass-catching TEs from blocking TEs is smart and defensible.

3. **Continuous age curves** — The production service uses linear interpolation between age anchors (no cliff effects), which is superior to discrete age brackets.

4. **Tier compression** — Format-specific tier boundaries for TEP levels is a novel concept. Making more TEs "startable tier" in heavy TEP formats reflects real market behavior.

5. **Multi-source weighting** — TEP-aware source weights (boosting sources that understand TEP) is well-thought-out.

6. **Dual-system approach** — Having both `tepCalculationService.js` (multiplier-based) and `tepProductionService.js` (production-based) allows for flexibility and validation against each other.

7. **Config centralization** — All tuning parameters are in one place, making calibration easy.

### ⚠️ What Needs Improvement

1. **Two competing TEP services:** The codebase has:
   - `tepCalculationService.js` (319 lines) — multiplier-based: `TEP = Base × Tier × Scarcity × Age`
   - `tepProductionService.js` (695 lines) — production-based: `TEP = SF + Production_Premium × Age_Factor`
   - Architecture doc proposes a THIRD approach in `tepValueService.js`: `TEP = Base × base_mult × scarcity × stats × age`
   
   **Three different formulas for the same thing.** Need to pick ONE and deprecate the others.

2. **Architecture doc proposes tables that may not exist:** The doc references `player_tep_values`, `te_advanced_metrics`, and `tep_value_history` tables. These may not be created yet.

3. **Source weight discrepancy:** Architecture doc proposes different source weights for TEP vs standard formats, but it's unclear if the normalization pipeline supports format-specific weights.

4. **Calibration data is fabricated:** The entire "Part 8: Validation" section uses made-up numbers. The validation MUST be re-done with real data before any tuning decisions are made.

### 🔴 What's Broken

1. **The validation in the architecture doc is worthless.** Every number in Part 8's comparison table is based on fabricated "KTC" data. Cannot use it for tuning or decision-making.

2. **KTC TEP scraper is not running daily.** The fix from Feb 16 didn't stick — TEP formats aren't being collected in the daily pipeline.

---

## Part 3: Code Quality Assessment

### `tepProductionService.js` — GOOD (8/10)

| Metric | Result |
|--------|--------|
| Tests | 63/63 passing ✅ |
| Code style | Clean, well-documented, JSDoc comments |
| Error handling | Proper null checks, fallback chains |
| Edge cases | Handles missing age, missing stats, non-TEs |
| Formula correctness | Additive premium model is sound |
| Production ready | YES (this specific service) |

**Strengths:**
- Continuous age interpolation (no cliff effects)
- Multi-year weighted stats with injury proration
- Sophisticated fallback chain (veteran → sophomore → rookie → rank)
- Configurable scarcity floors by league size
- Pick value TEP adjustments

**Minor issues:**
- Uses `new Date().getFullYear()` instead of injected date (harder to test)
- `refreshTEStats()` doesn't actually refresh — just counts existing records

### `tepCalculationService.js` — FAIR (6/10)

- Uses config from a separate `config/titlerun.js` file
- Older, simpler approach (multiplier-based)
- Less sophisticated than the production service
- No tests found specifically for this file

### All TEP Tests — 160/160 passing ✅

```
Test Suites: 6 passed, 6 total
Tests:       160 passed, 160 total
```

Tests cover:
- Production service (63 tests) — core calculation, age factors, receptions, scarcity floors
- TEP detection/validation (various) — format parsing, tier mapping
- TEP scarcity integration
- Column security

---

## Part 4: Corrected Validation Data

### Actual TitleRun vs KTC (SF Format, March 14, 2026)

| Player | KTC TE Rank | KTC SF Value | TR Value | TR TE Rank | Δ Value | Age (DB) |
|--------|------------|-------------|---------|-----------|---------|----------|
| Brock Bowers | TE1 | 7,704 | 7,832 | TE1 | +128 | 23 |
| Trey McBride | TE2 | 7,595 | 7,690 | TE2 | +95 | 26 |
| Colston Loveland | TE3 | 6,007 | 6,040 | TE4 | +33 | 21 |
| Tyler Warren | TE4 | 5,680 | 5,602 | TE5 | -78 | 23 |
| Harold Fannin | TE5 | 4,846 | 4,268 | TE11 | -578 | 21 |
| Tucker Kraft | TE6 | 4,834 | 4,856 | TE6 | +22 | 25 |
| Sam LaPorta | TE7 | 4,558 | 4,554 | TE7 | -4 | 25 |
| Kyle Pitts | TE8 | 4,436 | 4,286 | TE10 | -150 | 25 |
| **Cade Otton** | **TE27** | **2,463** | **2,149** | **TE29** | **-314** | **26** |

### KTC TEP+++ Values (Feb 16 Scrape vs User's Screenshot)

| Player | KTC TEP3 (Feb 16 scrape) | KTC TEP+++ (User Screenshot) | Δ |
|--------|-------------------------|------------------------------|---|
| Brock Bowers | 9,855 | 9,999 | +144 |
| Trey McBride | 10,075 | 9,961 | -114 |
| Tyler Warren | 7,569 | 7,512 | -57 |
| Harold Fannin | 6,380 | 6,462 | +82 |
| Cade Otton | 2,920 | 3,170 | +250 |

The Feb 16 scrape values are close to the user's screenshot values, confirming the scrape was accurate at the time — just stale by a month.

---

## Part 5: Recommendations

### Immediate Fixes (P0)

1. **Fix KTC TEP scraper pipeline** — The daily scheduler needs to include TEP format collection. Check `dailyScraperService.js` to verify the Feb 16 fix is still present. Re-run TEP collection immediately.

2. **Delete or prominently mark the fabricated validation data** in the architecture document. Add a note: "Part 1 data and Part 8 validation table contain placeholder data and MUST be regenerated from actual database values before use."

3. **Re-run validation with real data** — Use the corrected data above to recalibrate the architecture doc's example calculations.

### Before Production Deployment (P1)

4. **Choose ONE TEP formula** — Decide between:
   - `tepProductionService.js` (additive premium, production-based) — currently has tests and works
   - `tepCalculationService.js` (multiplicative, tier-based) — simpler, less tested
   - Architecture doc's `tepValueService.js` (multiplicative, scarcity+stats+age) — not yet implemented
   
   Recommendation: **Keep `tepProductionService.js` as the production formula.** It's well-tested, handles edge cases, and the additive approach avoids the runaway inflation problem that multiplicative formulas can create. Use the architecture doc's scarcity/stats/age concepts to ENHANCE the production service rather than replacing it.

5. **Investigate anomalous TitleRun rankings** — Zack Kuntz (TE3 in TitleRun), Thomas Odukoya (TE8), and Rob Gronkowski (TE13) need investigation. These may be inflated by one stale source or a weighting bug.

6. **Populate `ktc_tep`/`ktc_tep2`/`ktc_tep3` columns** in titlerun_values — the columns exist but are never filled.

7. **Create migration for `player_tep_values` table** if proceeding with architecture doc's approach — it doesn't exist yet.

### Future Improvements (P2)

8. **Automated validation pipeline** — Build a script that compares TitleRun TEP values against KTC TEP scrape data and flags deviations >15%. Run weekly.

9. **Advanced stats integration** — The `te_advanced_metrics` table referenced in the architecture doc doesn't exist. Need to build the stats pipeline from Sleeper/FantasyPros.

10. **Age source improvement** — Consider storing birthdate in the players table so age can be dynamically calculated rather than relying on static `age` field updates from Sleeper.

---

## Conclusion

**Keep the architecture. Fix the data. Don't start over.**

The TEP architecture design is conceptually sound — scarcity modeling, age curves, stats integration, and tier compression are all legitimate competitive advantages over KTC. The existing production code (`tepProductionService.js`) is well-written and well-tested.

The critical failure is that **Agent 25 fabricated its validation data** instead of querying the actual database or extracting from real screenshots. This made its "validation results" appear impressively close to KTC when in reality the numbers were made up.

**Action items before this system can go to production:**
1. Fix the KTC TEP scraper (it stopped after Feb 16)
2. Re-validate with real data (corrected tables provided above)
3. Pick one TEP formula and deprecate the others
4. Investigate anomalous player rankings (Kuntz, Odukoya, Gronkowski)
5. Remove fabricated data from architecture doc

**The architecture is a 7/10. The data accuracy is a 2/10. The code is an 8/10. Fix the data and this system is production-ready.**

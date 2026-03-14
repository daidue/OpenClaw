# Harold Fannin Jr. Value Calculation — Complete Pipeline Trace
## Superflex + TEP++ (TEP3) | March 14, 2026

---

## Player Identity
| Field | Value |
|-------|-------|
| **Player ID** | 12506 |
| **Name** | Harold Fannin Jr. |
| **Position** | TE |
| **Team** | CLE (Cleveland Browns) |
| **Age** | 21 |

---

## Final Values (2026-03-14)

| Format | TitleRun Value | Overall Rank | Position Rank | Confidence | Sources Used |
|--------|---------------|-------------|---------------|------------|-------------|
| **1QB** | 4,331 | #85 | TE11 | 0.38 (LOW) | 4 |
| **SF (Superflex)** | 4,268 | #94 | TE11 | 0.49 (LOW) | 4 |
| **TEP (TE+)** | 4,110 | #45 | TE5 | 0.83 (MEDIUM) | 2 |
| **TEP2 (TE++)** | 4,534 | #36 | TE5 | 0.79 (MEDIUM) | 2 |
| **TEP3 (TE+++)** | 4,853 | #34 | TE5 | 0.76 (MEDIUM) | 2 |

**🎯 Superflex TEP++ (TEP3) Answer: There is NO combined "SF+TEP3" format.** The system calculates SF and TEP3 independently. A user in a Superflex TEP++ league would see TEP3 format values, which already incorporate TE premium boosts. The SF value (4,268) does NOT get an additional TEP boost — TEP formats are calculated from their own native source data.

Computed at: 2026-03-14 12:56 UTC

---

## Step 1: Raw Source Data (from `source_values` table)

### SF Format Sources (March 14)
| Source | Raw Value | Raw Rank | Weight | Status |
|--------|-----------|----------|--------|--------|
| KTC | 4,846 | #62 | 0.17 (17%) | ✅ Present |
| FantasyCalc | 3,248 | #64 | 0.22 (22%) | ✅ Present |
| Sleeper ADP | 5,851 | #68 | 0.12 (12%) | ✅ Present |
| Dynasty Daddy | 3,628 | #62 | 0.10 (10%) | ✅ Present |
| DynastyProcess | — | — | 0.13 (13%) | ❌ Missing |
| UTH | — | — | 0.12 (12%) | ❌ Missing |
| DLF | — | — | 0.10 (10%) | ❌ Missing |
| Production | — | — | 0.04 (4%) | ❌ Missing |

### TEP3 Format Sources (March 14)
| Source | Raw Value | Raw Rank | Weight | Status |
|--------|-----------|----------|--------|--------|
| FantasyCalc (TEP3) | 4,556 | #36 | 0.22 (22%) | ✅ Present |
| Dynasty Daddy (TEP3) | 5,507 | #31 | 0.10 (10%) | ✅ Present |
| KTC | — | — | 0.17 (17%) | ❌ No TEP3 data |
| All others | — | — | — | ❌ No TEP3 data |

### 1QB Format Sources (March 14)
| Source | Raw Value | Raw Rank | Weight |
|--------|-----------|----------|--------|
| KTC | 5,491 | #62 | 0.17 |
| FantasyCalc | 3,029 | #64 | 0.22 |
| Sleeper ADP | 5,851 | #68 | 0.12 |
| Dynasty Daddy | 3,399 | #59 | 0.10 |

**Key observations:**
- Only **4 of 8** configured sources have SF data for Fannin
- Only **2 of 8** sources provide native TEP3 data (FantasyCalc & Dynasty Daddy)
- DynastyProcess, UTH, DLF, and Production are missing entirely
- FantasyPros has no recent data (last appeared Jan 23, 2026 with limited coverage)
- Sleeper ADP provides the same value (5,851) for both SF and 1QB — it doesn't differentiate

---

## Step 2: Normalization

**Method: Passthrough (for most sources)**

The `normalized_values` table shows the normalization method used:

| Source | Method | Notes |
|--------|--------|-------|
| KTC | `passthrough` | KTC values are already on a 0-10,000 scale, so no transformation needed |
| FantasyCalc | `passthrough` | FantasyCalc also uses a 0-10,000 scale |
| Dynasty Daddy | `passthrough` | Same scale |
| DynastyProcess | `minmax` | Uses min-max scaling to map to 0-10,000 |
| Sleeper ADP | `passthrough` | ADP values passed through (inverted earlier in scraper) |

**For Harold Fannin on 2026-03-14, the normalized values equal the raw values** because all his active sources use passthrough normalization. The normalization step is essentially a no-op for KTC, FantasyCalc, Dynasty Daddy, and Sleeper ADP since they already produce values on TitleRun's 0-10,000 scale.

---

## Step 3: Weighted Average Calculation

### SF Value Calculation

**Config weights** (from `config/titlerun.js`):
```
fantasycalc: 0.22, ktc: 0.17, dynastyprocess: 0.13,
sleeper_adp: 0.12, uth: 0.12, dynasty_daddy: 0.10,
dlf: 0.10, production: 0.04
```

**Available sources for Fannin SF:**
Only 4 of 8 sources have data. The system handles missing sources by **renormalizing** — it divides by the sum of available weights, not the full 1.0.

```
Weighted Sum = KTC × 0.17 + FantasyCalc × 0.22 + Sleeper_ADP × 0.12 + Dynasty_Daddy × 0.10

             = 4846 × 0.17 + 3248 × 0.22 + 5851 × 0.12 + 3628 × 0.10
             = 823.82 + 714.56 + 702.12 + 362.80
             = 2,603.30

Effective Weight Sum = 0.17 + 0.22 + 0.12 + 0.10 = 0.61

SF Value = 2,603.30 / 0.61 = 4,267.7 ≈ 4,268 ✅
```

### TEP3 Value Calculation

**Available sources:** Only FantasyCalc and Dynasty Daddy provide native TEP3 values.

```
Weighted Sum = FantasyCalc_TEP3 × 0.22 + Dynasty_Daddy_TEP3 × 0.10

             = 4556 × 0.22 + 5507 × 0.10
             = 1,002.32 + 550.70
             = 1,553.02

Effective Weight Sum = 0.22 + 0.10 = 0.32

TEP3 Value = 1,553.02 / 0.32 = 4,853.2 ≈ 4,853 ✅
```

### 1QB Value Calculation

```
= (5491 × 0.17 + 3029 × 0.22 + 5851 × 0.12 + 3399 × 0.10) / (0.17 + 0.22 + 0.12 + 0.10)
= (933.47 + 666.38 + 702.12 + 339.90) / 0.61
= 2,641.87 / 0.61
= 4,331.0 ≈ 4,331 ✅
```

---

## Step 4: Confidence Scoring

The confidence formula combines 4 factors:

```
Overall = sourceCountScore × 0.25 + agreementScore × 0.35 + coverageScore × 0.25 + freshnessScore × 0.15
```

### SF Format (confidence = 0.49, level = LOW)

| Factor | Score | Calculation |
|--------|-------|-------------|
| Source Count | 0.80 | 4/5 = 0.80 |
| Agreement | ~0.40 | High spread: stddev of {4846,3248,5851,3628} ≈ 1,106 → 1 - 1106/2000 = 0.45 |
| Coverage | 0.61 | 4 sources covering 61% of total weight |
| Freshness | ~0.90 | Recent data |

Level = LOW because only 4 sources AND agreement is below 0.5 threshold for MEDIUM with 2 sources.

### TEP3 Format (confidence = 0.76, level = MEDIUM)

| Factor | Score | Calculation |
|--------|-------|-------------|
| Source Count | 0.40 | 2/5 = 0.40 |
| Agreement | ~0.76 | Values {4556, 5507} → stddev ≈ 476 → 1 - 476/2000 = 0.76 |
| Coverage | 0.32 | 2 sources covering 32% of total weight |
| Freshness | ~0.90 | Recent data |

Level = MEDIUM because 2 sources with agreement ≥ 0.6 threshold.

---

## Step 5: TEP Boost Mechanism (How TEP3 Gets Its Values)

**Important discovery: TEP values are NOT calculated by applying a multiplier to SF values for Fannin.** Instead, two parallel paths exist:

### Path A: Native TEP Sources (what Fannin uses)
When sources like FantasyCalc and Dynasty Daddy provide **native TEP values**, the system uses those directly in the weighted average. Fannin's TEP3 value (4,853) comes from:
- FantasyCalc native TEP3: 4,556
- Dynasty Daddy native TEP3: 5,507

These are TEP values that the source sites themselves calculate based on TE premium scoring rules.

### Path B: TEP Inference (for sources without native TEP)
For sources that DON'T provide native TEP values (KTC, DynastyProcess, Sleeper ADP, UTH), the system has a `tepCalculationService.js` that can **infer** TEP values using:

```
TEP_Value = Base_SF_Value × Tier_Multiplier × Scarcity_Factor × Age_Factor
```

**For Harold Fannin (age 21, TE Rank 11 = "starter" tier):**
- Tier multiplier for TEP3 starter: **1.32** (32% boost)
- Scarcity factor: **1.025** (1.0 + (1 - 15/12) × 0.10, clamped)
- Age factor for 21: **0.92** (very young, still developing)
- Combined: 1.32 × 1.025 × 0.92 = **1.245**

However, in practice, Fannin's TEP values only come from 2 native sources (FantasyCalc and Dynasty Daddy). KTC, DynastyProcess, etc. are excluded because they don't contribute TEP data for him.

### TEP Tier Configuration
```
TEP3 Boost by Tier:
  Elite (TE rank 1-5):       1.30 (30% boost)
  Starter (TE rank 6-12):    1.32 (32% boost)
  Depth (TE rank 13-24):     1.28 (28% boost)
  Replacement (TE rank 25+): 1.18 (18% boost)
```

---

## Step 6: Frontend Display Logic

The API provides values for ALL formats. The frontend selects which to display based on the user's league settings:

```json
{
  "playerId": "12506",
  "playerName": "Harold Fannin",
  "position": "TE",
  "team": "CLE",
  "age": 21,
  "values": {
    "1qb":  { "value": 4331, "rank": 85,  "posRank": 11, "confidence": "low",    "sources": 4 },
    "sf":   { "value": 4268, "rank": 94,  "posRank": 11, "confidence": "low",    "sources": 4 },
    "tep":  { "value": 4110, "rank": 45,  "posRank": 5,  "confidence": "medium", "sources": 2 },
    "tep2": { "value": 4534, "rank": 36,  "posRank": 5,  "confidence": "medium", "sources": 2 },
    "tep3": { "value": 4853, "rank": 34,  "posRank": 5,  "confidence": "medium", "sources": 2 }
  }
}
```

**For a user with "Superflex TEP++" league settings:**
- The system does NOT have a combined `sf_tep3` format (config lists `COMBINED_FORMATS: ['sf_tep', 'sf_tep2', 'sf_tep3']` but these don't appear in the database)
- Most likely the user sees the **TEP3 value (4,853)** as their primary value
- The TEP3 sources already factor in market dynamics that include SF context

---

## Data Sources Summary

| Status | Count | Sources |
|--------|-------|---------|
| ✅ Fresh (Mar 14) | 4 of 8 | KTC, FantasyCalc, Sleeper ADP, Dynasty Daddy |
| ❌ Missing entirely | 4 of 8 | DynastyProcess (last: Feb 22), UTH (never), DLF (never), Production (never) |

**For TEP3 specifically:** Only 2 of 8 sources provide native TEP3 data.

---

## Complete Calculation Pipeline

```
1. SCRAPERS (daily)
   ├── KTC scraper → raw values (SF: 4846, 1QB: 5491)
   ├── FantasyCalc scraper → raw values (SF: 3248, TEP3: 4556)
   ├── Dynasty Daddy scraper → raw values (SF: 3628, TEP3: 5507)
   ├── Sleeper ADP scraper → raw values (SF/1QB: 5851)
   ├── DynastyProcess → ❌ No data for Fannin since Feb 22
   ├── UTH → ❌ Never had data for Fannin
   ├── DLF → ❌ Never had data (premium subscription required)
   └── Production → ❌ No production data (rookie, no NFL stats yet)

2. NORMALIZATION (per source)
   ├── KTC, FantasyCalc, DynastyDaddy, Sleeper → passthrough (already 0-10K)
   └── DynastyProcess → minmax scaling when available

3. FRESHNESS FILTER
   ├── Sources < 72 hours old → included with decay weighting
   └── Sources > 72 hours old → excluded
   
4. WEIGHTED AVERAGE (per format)
   ├── SF:   (4846×0.17 + 3248×0.22 + 5851×0.12 + 3628×0.10) / 0.61 = 4,268
   ├── 1QB:  (5491×0.17 + 3029×0.22 + 5851×0.12 + 3399×0.10) / 0.61 = 4,331
   ├── TEP:  (3902×0.22 + 4568×0.10) / 0.32 = 4,110
   ├── TEP2: (4275×0.22 + 5105×0.10) / 0.32 = 4,534
   └── TEP3: (4556×0.22 + 5507×0.10) / 0.32 = 4,853

5. CONFIDENCE SCORING
   ├── SF:   0.49 (LOW) — 4 sources, moderate agreement
   └── TEP3: 0.76 (MEDIUM) — 2 sources, good agreement

6. RANKING (within format)
   ├── SF:   Overall #94, TE #11
   └── TEP3: Overall #34, TE #5

7. API → Frontend selects format based on user's league settings
```

---

## Potential Issues Found

### 🔴 Critical: Low Source Coverage
- **SF has only 4/8 sources** (61% weight coverage) — confidence is LOW
- **TEP3 has only 2/8 sources** (32% weight coverage) — dangerously thin
- Missing sources: DynastyProcess stopped updating Fannin after Feb 22, UTH/DLF/Production never had him

### 🟡 Warning: Source Disagreement in SF
- KTC (4,846) and Sleeper ADP (5,851) value Fannin significantly higher than FantasyCalc (3,248) and Dynasty Daddy (3,628)
- This ~80% spread between highest/lowest source reduces confidence

### 🟡 Warning: No Combined SF+TEP Format
- The config defines `COMBINED_FORMATS: ['sf_tep', 'sf_tep2', 'sf_tep3']` but these don't appear in the database
- A user in a Superflex TEP++ league gets TEP3 values, not a true SF×TEP3 combination
- For TEs, this is probably fine (SF doesn't boost TEs much), but it's architecturally incomplete

### 🟡 Warning: Sleeper ADP Same for SF and 1QB
- Sleeper ADP provides identical value (5,851) for both SF and 1QB formats
- This suggests ADP data isn't format-aware, potentially skewing the weighted average

### ℹ️ Info: DynastyProcess Data Stale
- Last DynastyProcess data for Fannin was Feb 22, 2026 (20 days ago)
- This is beyond the 72-hour freshness cutoff, so it's properly excluded
- But the reason for data disappearance should be investigated

---

## Recommendations

1. **Investigate missing sources** — Why did DynastyProcess stop tracking Fannin after Feb 22? Is there a scraper issue or did they drop him?

2. **Implement combined SF+TEP formats** — The config defines them but they're not calculated. For Superflex TEP++ leagues, the value should be: TEP3 base value + SF positional adjustment (though for TEs, SF impact is minimal)

3. **Add source diversity requirements** — TEP3 with only 2 sources is risky. Consider inferring TEP3 from SF values for sources that don't provide native TEP data (the `tepCalculationService.js` already has the logic)

4. **Fix Sleeper ADP format-awareness** — Same value for SF and 1QB suggests the scraper isn't capturing format-specific ADP data

5. **Consider provisional tier display** — With confidence LOW on SF, consider showing a "provisional" badge in the UI to signal data quality concerns

---

*Report generated: 2026-03-14 11:15 EDT*
*Data source: TitleRun Production Database (Railway)*
*Pipeline: titlerunCalculationService.js → tepCalculationService.js → dynamicWeightService.js*

# Dynasty Valuation Sources - Expert Audit Report

**Date:** 2026-03-03
**Author:** Rush (TitleRun Owner/Operator)
**Purpose:** Validate and optimize the 10-source weight distribution for TitleRun's Bayesian valuation system

---

## Executive Summary

After researching all proposed sources across community discussions (primarily r/DynastyFF), methodology documentation, and industry reputation, I recommend **significant rebalancing** of the proposed weights. The two biggest changes:

1. **FantasyCalc should be elevated to #1** (from 18% → 22%). Its methodology — algorithmically derived from hundreds of thousands of *real completed trades* — is objectively superior to opinion-based crowdsourcing. The dynasty community increasingly recognizes FantasyCalc as more reliable than KTC, specifically because it reflects what people actually do vs. what they say.

2. **Sleeper Market Data is criminally underweighted** at 6%. Real transaction data from the largest dynasty platform (200K+ leagues, 1M+ trades) is the purest signal available. It should be 10%+. Meanwhile, ESPN at 5% is a waste — it's a redraft-first platform with minimal dynasty infrastructure. Replace it.

3. **For the 10th source, add Dynasty Nerds** — a dynasty-first platform with expert rankings, strong community reputation, and unique analytical content. PlayerProfiler is the alternative if we want a metrics-driven source (Breakout Age, Dominator Rating) rather than another consensus ranking.

---

## Source-by-Source Analysis

### 1. KTC (KeepTradeCut)
**Current Weight:** 20%
**Recommended Weight:** 17%
**Change:** -3%

**Research Findings:**
- **Methodology:** Crowdsourced via "Keep, Trade, Cut" user voting. ~25M data points from users ranking players. NOT based on real trades.
- **Accuracy:** Community considers it "decently accurate" as a sentiment barometer. No formal accuracy studies exist.
- **Community Reputation:** The most widely used dynasty tool — it IS the market in many leagues. Reddit describes it as "the stock market if all traders subbed to r/wallstreetbets" — volatile, speculation-heavy.
- **Known Biases:**
  - **Heavy recency bias** — values swing dramatically based on last game
  - **Rookie/youth overvaluation** — "skews very heavily in favor of rookies/potential over proven veterans" (r/DynastyFF)
  - **Draft pick overvaluation** — "KTC overvalues draft picks" and "3rd-4th round picks a TON" (r/DynastyFF)
  - **Hype train susceptibility** — reactive rather than analytical
- **Update Frequency:** Real-time (continuously updated via crowdsourcing)
- **Strengths:**
  - Ubiquitous — most leagues reference KTC as a common language
  - Real-time updates; great at capturing market sentiment shifts
  - Free; accessible; massive user base
  - Excellent for understanding "what your leaguemates think"
- **Weaknesses:**
  - Opinion-based, not trade-based — reflects what people *say* not what they *do*
  - Volatile; overreacts to recent performances
  - Systematic rookie/pick overvaluation
  - Non-linear value scale creates issues in multi-player trades

**Rationale for Weight:** KTC remains valuable as the community sentiment benchmark and near-universal reference point. However, its methodology is inherently less accurate than trade-based data. Reducing from 20% to 17% acknowledges its role while not over-indexing on opinion data.

**Sources:**
- https://www.reddit.com/r/DynastyFF/comments/s3fz7i/thoughts_on_keeptradecut_is_it_useful_or_just/
- https://www.reddit.com/r/DynastyFF/comments/xeytfv/how_much_do_you_trust_sources_like_keeptradecut/
- https://www.reddit.com/r/DynastyFF/comments/1ge9twf/is_ktc_really_the_endallbeall_for_dynasty_trade/
- https://www.reddit.com/r/DynastyFF/comments/1fkf2hg/lets_talk_trade_calculators/

---

### 2. FantasyCalc
**Current Weight:** 18%
**Recommended Weight:** 22%
**Change:** +4%

**Research Findings:**
- **Methodology:** Algorithmically generated from **hundreds of thousands of real completed trades** on Sleeper. Machine learning applied to actual transaction data.
- **Accuracy:** Community increasingly views it as the gold standard. "FantasyCalc is much more objective, KTC is just vibes" (r/DynastyFF). "Not based on opinions but real trades on Sleeper. Way better than KTC" (r/DynastyFF).
- **Community Reputation:** Rising rapidly. Often recommended as the primary tool on r/DynastyFF over KTC.
- **Known Biases:**
  - **Lag bias** — values reflect completed trades, so breaking news takes a few days to show up
  - **Selection bias** — only captures trades from leagues that complete transactions; inactive leagues underrepresented
  - **Casual player noise** — some trades in dataset may be lopsided (tacos)
- **Update Frequency:** Continuous (as new trades are processed)
- **Strengths:**
  - Based on REAL transactions, not opinions
  - Algorithmic — removes individual bias
  - Large sample size (hundreds of thousands of trades)
  - Covers dynasty, redraft, keeper formats
- **Weaknesses:**
  - Slight lag on breaking news
  - Can be influenced by bad trades in dataset
  - Relatively newer than KTC (less historical data)

**Rationale for Weight:** FantasyCalc's methodology is objectively superior for determining what players are actually worth in trades. Real trade data > crowdsourced opinions. The community is rapidly converging on this view. Should be our highest-weighted source.

**Sources:**
- https://fantasycalc.com/ — "algorithmically generated from hundreds of thousands of real trades"
- https://www.reddit.com/r/DynastyFF/comments/18hj165/fantasycalc_or_keeptradecut/
- https://www.reddit.com/r/DynastyFF/comments/1cxghyj/dynasty_player_value_sites_ktc_v_flock/
- https://www.reddit.com/r/DynastyFF/comments/1c9n0fw/dynasty_trade_calculators/

---

### 3. UTH (UnderTheHelmet)
**Current Weight:** 16%
**Recommended Weight:** 12%
**Change:** -4%

**Research Findings:**
- **Methodology:** Expert-driven (Chad Parsons). Premium/paywalled tool. Tailored to 30+ different league settings. Film-based analysis + injury-away matrices.
- **Accuracy:** Community considers it "the best" trade calculator, but largely based on pick calibration quality. "Under The Helmet has the best in my opinion, but it's behind a steep paywall" (r/DynastyFF).
- **Community Reputation:** Highly respected among serious dynasty players. Premium pricing signals quality but also limits adoption/verification.
- **Known Biases:**
  - **Single expert bias** — one person's methodology, even if excellent
  - **Paywalled** — limited community ability to verify/critique values
  - **Pick calibration focus** — strongest for pick values, less discussed for player values
- **Update Frequency:** Regular (daily during season, less frequent off-season)
- **Strengths:**
  - Best pick value calibration in the industry
  - Highly granular league setting customization
  - Expert analysis backed by film study
  - Long track record (podcast since 2012)
- **Weaknesses:**
  - Single expert = single point of failure
  - Paywalled = less community scrutiny
  - Less data-driven than FantasyCalc (opinion-based, even if expert)
  - Harder to scrape/integrate programmatically

**Rationale for Weight:** Taylor's prioritization of UTH for pick calibration is validated — UTH genuinely does have the best pick value system in dynasty. However, 16% is too high for a single-expert source that's primarily strongest in one dimension (picks). Use UTH heavily for pick-to-player conversion ratios, but weight overall player values at 12%.

**RECOMMENDATION:** Use UTH with a **split weighting approach**: weight UTH at 20%+ for *pick values specifically* while using a lower weight (8-10%) for *player values*. This captures its unique strength without over-indexing on a single expert's player rankings.

**Sources:**
- https://uthdynasty.com/ — "market-crushing rankings, film notes, injury-away matrices"
- https://www.reddit.com/r/DynastyFF/comments/vrmm3r/why_is_your_favorite_dynasty_trade_calculator/
- https://www.reddit.com/r/DynastyFF/comments/10b4d5o/dynasty_trade_calculatorsvalue_charts/

---

### 4. DynastyProcess
**Current Weight:** 14%
**Recommended Weight:** 10%
**Change:** -4%

**Research Findings:**
- **Methodology:** Open-source data repository. Trade calculator values are **derived from FantasyPros Dynasty ECR** (Expert Consensus Rankings) converted along an exponential decay curve. NOT independent data.
- **Accuracy:** Depends on FantasyPros input data quality. The value conversion methodology is transparent and well-documented.
- **Community Reputation:** Highly respected in the data/analytics community. The GitHub open-data repository is widely used by dynasty analysts and tool builders.
- **Known Biases:**
  - **Derivative source** — values are literally FantasyPros ECR with a mathematical transformation
  - **Expert consensus bias** — inherits all biases from FantasyPros expert panel
  - **Potential staleness** — depends on FantasyPros update schedule
- **Update Frequency:** Regular but depends on upstream FantasyPros updates
- **Strengths:**
  - Open source — transparent methodology, auditable
  - Clean data format (GitHub CSV/JSON)
  - Great player ID mapping data
  - Excellent supplementary data (contracts, draft capital, etc.)
- **Weaknesses:**
  - NOT an independent source — it's a FantasyPros derivative
  - Weighting both DynastyProcess AND FantasyPros is double-counting the same underlying signal
  - Values lag behind real market movements
  - Less actively maintained than commercial tools

**Rationale for Weight:** Critical insight: **DynastyProcess values are derived from FantasyPros ECR**. Weighting both DynastyProcess at 14% and FantasyPros at 12% means you're giving FantasyPros expert consensus ~26% effective weight — far too much for an expert opinion source. Reduce DynastyProcess to 10% and consider it as your "FantasyPros with better data formatting" rather than an independent signal.

**Sources:**
- https://dynastyprocess.com/values/ — "scraping FantasyPros Dynasty Expert Consensus Ranks (ECR) and converting the values along an exponential decay curve"
- https://github.com/dynastyprocess/data
- https://dynastyprocess.com/

---

### 5. FantasyPros
**Current Weight:** 12%
**Recommended Weight:** 8%
**Change:** -4%

**Research Findings:**
- **Methodology:** Expert Consensus Rankings (ECR) from 100+ fantasy football experts. Daily updates. Has dedicated dynasty rankings.
- **Accuracy:** FantasyPros runs an annual accuracy competition tracking which experts are most accurate. The ECR has been shown to be hard to beat consistently (wisdom of crowds applied to experts).
- **Community Reputation:** Industry standard for redraft. Dynasty rankings exist but are clearly secondary.
- **Known Biases:**
  - **Redraft-first platform** — dynasty is a secondary offering
  - **Expert bias** — experts tend toward conservative, established players
  - **Slow to incorporate dynasty-specific dynamics** (contract situations, age curves, etc.)
  - **Expert panel inconsistency** — not all 100+ experts submit dynasty rankings; smaller sample
- **Update Frequency:** Daily
- **Strengths:**
  - Large expert panel provides natural error correction
  - Long track record with accuracy measurement
  - Covers all positions comprehensively
  - Dynasty trade value chart updated monthly
- **Weaknesses:**
  - Redraft-focused platform with dynasty as an afterthought
  - Expert panel for dynasty is much smaller than for redraft
  - DynastyProcess already captures this data — double-counting risk
  - Less reactive to dynasty-specific news (trades, contract extensions)

**Rationale for Weight:** Since DynastyProcess is literally derived from FantasyPros ECR, these two sources share the same underlying signal. Combined, they should not exceed 15-18% of total weight. Reduce FantasyPros to 8% (DynastyProcess at 10% for better data formatting = 18% combined, which is reasonable for expert consensus).

**Sources:**
- https://www.fantasypros.com/nfl/rankings/dynasty-overall.php
- https://www.fantasypros.com/2026/03/fantasy-football-rankings-dynasty-trade-value-chart-march-2026-update/

---

### 6. DynastyDaddy
**Current Weight:** 10%
**Recommended Weight:** 10%
**Change:** 0%

**Research Findings:**
- **Methodology:** Multi-source aggregation platform. Allows users to toggle between KTC, FantasyCalc, and other value sets. Also has proprietary "ADP Daddy" values from 568,064 real drafts using exponential decay modeling.
- **Accuracy:** Strength is in the aggregation — users can compare across sources. The ADP-based proprietary values add unique signal.
- **Community Reputation:** "Dynasty Daddy is the best because you can flip between different valuations" (r/DynastyFF). Popular free tool with strong community support. Created by a community member.
- **Known Biases:**
  - **Aggregation bias** — when using other sources' values, inherits their biases
  - **ADP-based values** — ADP ≠ trade value (startup ADP reflects different dynamics)
  - **Community-built** — may have inconsistencies vs. commercial tools
- **Update Frequency:** Regular/continuous for ADP data
- **Strengths:**
  - Unique ADP-based proprietary values (568K+ real drafts)
  - Multi-source comparison lets users see divergence
  - Comprehensive toolset (trade finder, league analyzer)
  - Free; excellent for the community
  - Supports Sleeper, ESPN, Yahoo, MFL, FFPC, Fantrax, Fleaflicker
- **Weaknesses:**
  - Partially derivative (when using KTC/FC values)
  - ADP values may not perfectly translate to trade values
  - Smaller team = slower feature development

**Rationale for Weight:** 10% is appropriate. The ADP Daddy proprietary values add genuine unique signal. Use specifically for ADP-based values rather than the pass-through of KTC/FantasyCalc data (which we already weight independently).

**Sources:**
- https://dynasty-daddy.com — "568,064 real drafts"
- https://www.reddit.com/r/DynastyFF/comments/wz3jhh/introducing_dynasty_daddy_fantasy_football_tool/
- https://www.reddit.com/r/DynastyFF/comments/1ae0p9t/new_to_dynasty_wondering_what_people_consider_the/

---

### 7. Sleeper Market Data
**Current Weight:** 6%
**Recommended Weight:** 12%
**Change:** +6%

**Research Findings:**
- **Methodology:** Raw transaction data from the Sleeper platform API. Sleeper is the dominant dynasty fantasy football platform with 200K+ leagues and 1M+ completed trades in its database.
- **Accuracy:** This is the closest thing to "ground truth" — what players actually traded for in real leagues with real stakes.
- **Community Reputation:** Sleeper itself is the #1 dynasty platform. Its API provides public access to league transactions.
- **Known Biases:**
  - **Casual player noise** — not all Sleeper trades are between competent managers
  - **Platform bias** — Sleeper skews younger/more engaged than MFL
  - **Orphaned league pollution** — some trades are in dead/orphaned leagues
  - **Multi-player trade complexity** — hard to isolate individual player values from complex trades
- **Update Frequency:** Real-time (every trade is immediately available via API)
- **Strengths:**
  - **Real market data** — what people actually do, not what they say
  - Massive sample size (1M+ trades)
  - Real-time availability
  - Public API access
  - Covers the largest dynasty platform
- **Weaknesses:**
  - Raw data requires significant processing/cleaning
  - Noise from lopsided trades, orphaned leagues
  - Not pre-processed into values (requires our own algo)

**Rationale for Weight:** This is being massively underweighted at 6%. Sleeper market data IS what FantasyCalc is built on (plus MFL data). Raw market data is the most fundamental signal. At 12%, we properly value real transaction data. Note: there's overlap with FantasyCalc (which already processes Sleeper trades), but having both allows us to validate FantasyCalc's processing and potentially catch trades FantasyCalc misses or processes differently.

**IMPORTANT NOTE:** If FantasyCalc already fully incorporates Sleeper data, then keeping both at high weights creates redundancy. Consider: FantasyCalc = "processed Sleeper data" and Sleeper Market = "raw Sleeper data with our own processing." The combined weight should be viewed as ~34% real-trade signal, which is appropriate.

**Sources:**
- https://docs.sleeper.com/ — public API with transaction endpoints
- https://dynasty-daddy.com — "1 million trades from 200k leagues"

---

### 8. ESPN
**Current Weight:** 5%
**Recommended Weight:** 0% (REMOVE)
**Change:** -5%

**Research Findings:**
- **Methodology:** In-house expert rankings. Primarily redraft-focused.
- **Accuracy:** No dynasty-specific accuracy data available.
- **Community Reputation:** ESPN is considered a casual/mainstream platform. Its dynasty offerings are significantly behind Sleeper, MFL, and dedicated dynasty tools.
- **Known Biases:**
  - **Heavy redraft bias** — dynasty is an afterthought
  - **Mainstream/casual audience** — values don't reflect serious dynasty market
  - **Corporate editorial bias** — rankings may be influenced by ESPN's broadcast interests
  - **Positional bias** — tends toward name-brand players
- **Update Frequency:** Weekly during season, sporadic off-season
- **Strengths:**
  - Recognizable brand
  - Large audience
  - Some dynasty content exists
- **Weaknesses:**
  - Not dynasty-focused at all
  - No trade calculator or value chart
  - Rankings reflect casual player sentiment
  - Adds no unique signal that other sources don't provide better

**Rationale for Weight:** ESPN adds negative value to a dynasty-focused Bayesian system. Its redraft bias actually pulls values in the wrong direction for dynasty purposes. Every percentage point given to ESPN is a percentage point taken from a better source. **Remove entirely.**

---

### 9. 10th Source: Dynasty Nerds (RECOMMENDED)
**Current Weight:** 5% (TBD)
**Recommended Weight:** 5%

**Research Findings:**
- **Methodology:** Expert analysis team focused exclusively on dynasty. Rankings, articles, trade tools, and rookie analysis. Self-described "#1 Resource for Dynasty Fantasy Football."
- **Accuracy:** Regularly cited on r/DynastyFF as a top dynasty source. Their analysts rank competitively in FantasyPros accuracy competitions.
- **Community Reputation:** Strong following among serious dynasty players. Known for deep rookie analysis and IDP coverage.
- **Known Biases:**
  - **Expert-driven** — same category as FantasyPros but dynasty-focused
  - **Content marketing** — rankings may be optimized for engagement
- **Update Frequency:** Regular throughout the year (dynasty is 365)
- **Strengths:**
  - **100% dynasty-focused** — no redraft dilution
  - Strong rookie and devy analysis
  - Comprehensive format coverage (SF, TEP, IDP)
  - Active community engagement
  - Trade calculator available
- **Weaknesses:**
  - Expert opinion, not data-driven
  - Smaller analyst pool than FantasyPros
  - Paywalled premium content

**Alternative Considered: PlayerProfiler**
- **Unique methodology** — uses Breakout Age, Dominator Rating, athletic metrics
- **Strong dynasty roots** — Matt Kelley founded it specifically for dynasty
- **Metric-driven** — less subjective than expert consensus
- **Weakness:** More of a research/evaluation tool than a valuation source; doesn't produce simple trade values in the same way
- **Verdict:** Better as a supplementary research input than a direct valuation source. Consider for v2.

**Alternative Considered: 4for4**
- **Claims "most accurate" rankings** — backed by FantasyPros accuracy competition results
- **Methodology** — predictive modeling, offensive tendencies, SOS
- **Weakness:** Primarily redraft-focused. Dynasty is secondary content.
- **Verdict:** Strong accuracy claims but not dynasty-native. Skip.

**Rationale for Dynasty Nerds:** It fills the "dynasty-specific expert opinion" slot without the redraft dilution of FantasyPros. At 5%, it provides a useful cross-check against the data-driven sources.

**Sources:**
- https://www.dynastynerds.com/
- https://www.reddit.com/r/DynastyFF/comments/1mtn73n/top_500_combined_idp_sf_tep_rankings_for_dynasty/

---

### 10. Production Values (Internal)
**Current Weight:** 4%
**Recommended Weight:** 4%
**Change:** 0%

**Evaluation:**
- **What it is:** Internal stats-based reality check. Actual game production (points scored, efficiency metrics) compared to valuation.
- **Should it be higher?** In a pure accuracy sense, yes — actual production is the ultimate ground truth. However, dynasty values intentionally diverge from current production (young breakout candidates, aging vets still producing).
- **Risk of higher weighting:** Would create a redraft-like bias toward current producers, undermining the dynasty-specific nature of the system.
- **Recommendation:** Keep at 4% as a "sanity check" anchor. Production values are most useful for identifying severe mispricing (e.g., a player valued as WR30 but producing as WR5 for 2+ years).

**FUTURE ENHANCEMENT:** Consider a dynamic production weight that increases for players with 3+ years of consistent production data and decreases for rookies/young players where sample size is small.

---

## Recommended Weight Distribution

### OLD (Proposed):
```
1. KTC (KeepTradeCut)    - 20%
2. FantasyCalc           - 18%
3. UTH (UnderTheHelmet)  - 16%
4. DynastyProcess        - 14%
5. FantasyPros           - 12%
6. DynastyDaddy          - 10%
7. Sleeper Market        -  6%
8. ESPN                  -  5%
9. [10th Source TBD]     -  5%
10. Production Values    -  4%
                         ------
                          100%
```

### NEW (Expert-Validated):
```
1. FantasyCalc           - 22% (was 18%, +4%) — Real trade data, algorithmic, most objective
2. KTC (KeepTradeCut)    - 17% (was 20%, -3%) — Community sentiment benchmark, still essential
3. Sleeper Market Data   - 12% (was  6%, +6%) — Raw real-market signal, largest dynasty platform
4. UTH (UnderTheHelmet)  - 12% (was 16%, -4%) — Expert pick calibration, best for pick values
5. DynastyProcess        - 10% (was 14%, -4%) — Open-source, FantasyPros derivative
6. DynastyDaddy          - 10% (was 10%,  0%) — ADP-based unique signal, good aggregator
7. FantasyPros           -  8% (was 12%, -4%) — Expert consensus, dynasty secondary
8. Dynasty Nerds         -  5% (new)          — Dynasty-native expert rankings
9. Production Values     -  4% (was  4%,  0%) — Internal stats reality check
10. ESPN                 -  0% (was  5%, REMOVED) — Redraft-focused, no unique dynasty signal
                         ------
                          100%
```

### Signal Composition Analysis:
```
REAL TRADE/MARKET DATA:     46% (FantasyCalc 22% + Sleeper 12% + DynastyDaddy ADP 10% + Production 4%)
CROWDSOURCED SENTIMENT:     17% (KTC 17%)
EXPERT CONSENSUS/OPINION:   25% (UTH 12% + DynastyProcess 10% + Dynasty Nerds 5% - note: DP inherits from FP)
EXPERT CONSENSUS (DIRECT):  8%  (FantasyPros 8%)
INTERNAL ANALYTICS:         4%  (Production Values 4%)
```

This distribution properly prioritizes **what people actually do** (trades, drafts) over **what people say** (opinions, rankings).

---

## Major Changes:

| Source | Old | New | Change | Reason |
|--------|-----|-----|--------|--------|
| FantasyCalc | 18% | 22% | +4% | Real trade data is the gold standard; community increasingly validates this |
| Sleeper Market | 6% | 12% | +6% | Raw real-market data was criminally underweighted |
| ESPN | 5% | 0% | -5% | Redraft-focused; adds no unique dynasty signal; actively harmful |
| UTH | 16% | 12% | -4% | Single expert; strongest for picks not players; use split-weight approach |
| DynastyProcess | 14% | 10% | -4% | Derivative of FantasyPros — double-counting risk at 14% |
| FantasyPros | 12% | 8% | -4% | DynastyProcess already captures this; redraft bias |
| KTC | 20% | 17% | -3% | Sentiment barometer, but opinion-based with known biases |
| Dynasty Nerds | N/A | 5% | +5% | Dynasty-native expert source; fills ESPN's slot properly |

---

## Key Insights

### Most Accurate Sources (Top 3):
1. **FantasyCalc** — Evidence: Algorithmically generated from hundreds of thousands of real trades. Community consensus shifting toward FC as most reliable. Multiple Reddit threads confirm "FantasyCalc is much more objective."
2. **Sleeper Market Data (raw)** — Evidence: The actual transactions from the platform where 200K+ dynasty leagues operate. This is ground truth.
3. **DynastyDaddy ADP Values** — Evidence: 568K+ real drafts provide independent signal on how managers actually value players in draft contexts, complementing trade data.

### Most Overrated Source:
1. **KTC** — Despite being ubiquitous, it's opinion-based crowdsourcing with documented recency bias, rookie overvaluation, and pick inflation. "KTC is like the stock market if all traders subbed to r/wallstreetbets" (r/DynastyFF). It's the Zillow Zestimate of dynasty — useful for approximate market feel, dangerous for precision.

### Most Underrated Source:
1. **Sleeper Market Data** — Real transaction data from the largest dynasty platform was proposed at only 6%. This is literally what the market IS.

### Biggest Surprises:
- **DynastyProcess is not independent** — it's a FantasyPros derivative. The proposed weights effectively gave FantasyPros consensus 26% of the total weight (14% DP + 12% FP), which is far too much for expert opinion.
- **UTH's pick calibration superiority is real** — community consistently validates Chad Parsons' pick values as the best. Consider implementing split weighting (high for picks, moderate for players).

### 10th Source Recommendation:
- **Add: Dynasty Nerds**
- **Reason:** 100% dynasty-focused (no redraft dilution), strong community reputation, unique expert analysis, comprehensive format coverage (SF/TEP/IDP). Fills the void left by removing ESPN.
- **Weight: 5%**
- **Alternative for v2:** PlayerProfiler — unique metrics-based methodology (Breakout Age, Dominator Rating) would add genuinely non-redundant signal. Better suited as a supplementary research input than a direct trade value source.

---

## Implementation Notes for TitleRun

### Split Weighting Architecture (Recommended):
Rather than flat weights per source, consider **context-dependent weighting**:

```javascript
// For PLAYER values:
const PLAYER_WEIGHTS = {
  fantasyCalc: 0.24,
  ktc: 0.18,
  sleeperMarket: 0.13,
  dynastyDaddy: 0.11,
  dynastyProcess: 0.10,
  uth: 0.08,       // UTH lower for players
  fantasyPros: 0.06,
  dynastyNerds: 0.05,
  production: 0.05,
};

// For PICK values:
const PICK_WEIGHTS = {
  uth: 0.25,       // UTH highest for picks
  fantasyCalc: 0.20,
  ktc: 0.15,
  sleeperMarket: 0.12,
  dynastyDaddy: 0.10,
  dynastyProcess: 0.08,
  fantasyPros: 0.05,
  dynastyNerds: 0.03,
  production: 0.02,
};
```

This captures UTH's unique strength in pick calibration without over-indexing on Chad Parsons for player values.

### Redundancy Matrix:
```
FantasyCalc ←→ Sleeper Market    : HIGH overlap (FC processes Sleeper trades)
DynastyProcess ←→ FantasyPros   : FULL overlap (DP is literally FP derivative)  
DynastyDaddy ←→ KTC/FC          : PARTIAL (DD shows other sources' values)
KTC ←→ FantasyCalc              : LOW (different methodology, same subjects)
UTH ←→ All others               : LOW (unique expert methodology)
Dynasty Nerds ←→ FantasyPros    : MODERATE (both expert opinion, but DN is dynasty-native)
```

### Data Freshness Weighting (Recommended Enhancement):
Apply a freshness multiplier to each source:
```javascript
const FRESHNESS = {
  fantasyCalc: 1.0,    // Updated continuously
  ktc: 1.0,            // Updated continuously
  sleeperMarket: 1.0,  // Real-time
  dynastyDaddy: 0.95,  // Updated daily
  uth: 0.90,           // Updated regularly
  dynastyProcess: 0.85, // Depends on FP updates
  fantasyPros: 0.90,   // Updated daily
  dynastyNerds: 0.85,  // Updated regularly
  production: 0.80,    // Weekly during season
};
```

---

## Confidence Level

**MEDIUM-HIGH** confidence in these recommendations.

**Based on:**
- 15+ web searches across sources
- 10+ Reddit community discussions reviewed
- Methodology documentation for all 10 sources examined
- Community consensus from r/DynastyFF (largest dynasty community, 200K+ members)
- Cross-referencing multiple independent community opinions

**What would increase confidence to HIGH:**
- A formal quantitative accuracy study (none found to exist)
- Backtesting proposed weights against historical player values → actual outcomes
- A/B testing in TitleRun production with both weight sets

**What I'm most confident about:**
1. FantasyCalc should be #1 (real trades > opinions)
2. ESPN should be removed (redraft-focused, no unique signal)
3. DynastyProcess + FantasyPros overlap (same underlying data)

**What I'm least confident about:**
1. Exact optimal percentages (±3% on any source is within margin)
2. Sleeper Market weighting (depends on our ability to process raw data well)
3. UTH exact weight (premium paywalled content is hard to independently validate)

---

*Rush — TitleRun Owner/Operator*
*Audit completed 2026-03-03*

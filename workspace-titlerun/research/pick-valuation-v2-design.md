# Pick Valuation v2 — Deep Research & System Design
**Date:** 2026-02-20
**Author:** Jeff (for Taylor)
**Status:** RESEARCH COMPLETE — Ready for implementation decision

---

## Part 1: Market Research — What We Know

### KTC Live Pick Values (SF, no TEP, Feb 20 2026)

| Pick | KTC Value | KTC Rank | Context |
|------|-----------|----------|---------|
| 2027 Early 1st | 6,627 | #22 overall | Between Justin Herbert (6,851) and Patrick Mahomes (6,601) |
| 2026 Early 1st | 6,027 | #36 overall | Between Brock Purdy (6,115) and Nico Collins (5,999) |
| 2026 Mid 1st | ~4,800* | ~#65-70 | Estimated from tier drop |
| 2026 Late 1st | ~3,800* | ~#90+ | Estimated from tier drop |

*KTC only shows Early/Mid/Late aggregates on the rankings page. Exact slot values from their trade calculator.

**Key insight: A 2027 Early 1st is worth MORE than a 2026 Early 1st.** That's unusual — normally the closer pick is worth more. This tells us the market is pricing in class quality heavily.

### Our Current System vs Market Reality

| Pick | Our Value (PICK_VALUE_CURVES) | KTC Market | Gap |
|------|-------------------------------|------------|-----|
| 2026 1st Early | 6,000 | 6,027 | ✅ Close |
| 2026 1st Mid | 5,000 | ~4,800 | ✅ Close |
| 2026 1st Late | 4,000 | ~3,800 | ✅ Close |
| 2027 1st Early | 6,500 | 6,627 | ✅ Close |
| 2027 1st Mid | 5,500 | ~5,500 | ✅ Close |
| 2027 1st Late | 4,500 | ~4,400 | ✅ Close |
| 2028 1st Early | 7,000 | ~5,500-6,000 | 🔴 WAY TOO HIGH |
| 2028 1st Mid | 6,000 | ~4,500-5,000 | 🔴 TOO HIGH |
| 2028 1st Late | 4,800 | ~3,500-4,000 | 🔴 TOO HIGH |

**Our current curves assume picks appreciate with distance. The market says the opposite for 2028+ — uncertainty discounts distant picks.** Our year-offset 2 values are 10-25% too high.

### FantasyPros Expert Consensus Pick Values (Feb 2026)

| Pick Slot | 1QB Value | SF Value |
|-----------|-----------|----------|
| 2026 1.01 | 68 | 68 |
| 2026 1.02 | 58 | 65 |
| 2026 1.03 | 56 | 58 |
| 2026 1.04 | 54 | 56 |
| 2026 1.05 | 52 | 54 |
| 2026 1.06 | 50 | 52 |
| 2026 1.07 | 48 | 50 |
| 2026 1.08 | 46 | 48 |
| 2026 1.09 | 44 | 46 |
| 2026 1.10 | 42 | 44 |
| 2026 1.11 | 40 | 42 |
| 2026 1.12 | 38 | 40 |
| Early 2nd | 35 | 37 |
| Mid 2nd | 29 | 31 |
| Late 2nd | 24 | 26 |
| Early 3rd | 20 | 22 |
| Mid 3rd | 16 | 18 |
| Late 3rd | 14 | 16 |
| Early 4th | 10 | 11 |
| Late 4th | 7 | 8 |

**Key insight from FantasyPros: The drop from 1.01 (68) to 1.02 (58/65) is MASSIVE — 10-15%.** Then picks 1.02-1.05 cluster tightly. This is the "Jeremiah Love premium" — the 1.01 has outsized value because there's a clear #1 prospect.

**2027 picks are valued HIGHER than equivalent 2026 picks:**
- 2027 1.01-1.03: 66-68 SF (vs 2026 1.01: 68)
- 2027 1.04-1.06: 55-57 SF (vs 2026 equivalent: 54-56)
- 2027 1.07-1.12: 45-47 SF (vs 2026 equivalent: 44-50)

---

## Part 2: Draft Class Intelligence

### 2026 Class — "The Weak Link" (Community Rating: 3/10)

**Expert consensus:** This is a BELOW AVERAGE class. Thin at QB, thin at RB, strong at WR only.

**Tier Structure (SF):**
- **Tier 1 (1.01-1.02):** Jeremiah Love (RB, Notre Dame) + Fernando Mendoza (QB, SF only). Clear separation from the field.
- **Tier 2 (1.03-1.06):** Carnell Tate, Makai Lemon, Jordyn Tyson, Denzel Boston — all WRs. Strong but similar ceiling.
- **Tier 3 (1.07-1.08):** Kenyon Sadiq (TE), K.C. Concepcion (WR). Last "safe" picks.
- **Cliff (after 1.08):** "Safe" rookie picks run out much earlier than normal. Maybe developmental QBs, speculative RBs, or WRs with question marks.

**Key facts:**
- Only 1 QB (Mendoza) expected in NFL Draft top 10
- Only 1 RB (Love) expected to be drafted Round 1
- WR depth is the class strength but ceiling is capped vs elite classes
- Late first-round picks are actively being traded for 2027 assets
- "Two late 2026 firsts for a single 2027 first? Sharp managers would make that move without hesitation." — FantasyPros

### 2027 Class — "The Monster" (Community Rating: 10/10)

**Expert consensus:** This could be an ALL-TIME great class. Loaded at QB, WR, and has emerging RB talent.

**QB depth is historic:**
- Arch Manning (Texas) — the name, the ceiling, potential #1 overall
- Julian Sayin (Ohio State) — Heisman contender, elite pocket passer
- Dante Moore (Oregon) — could've been top-5 in 2026, returned for another year
- Brendan Sorsby (Texas Tech) — transferred for top-10 shot
- LaNorris Sellers (South Carolina) — elite athlete
- Dylan Raiola (Oregon), Sam Leavitt (LSU), Marcel Reed (Texas A&M), DJ Lagway (Baylor), Nico Iamaleava (UCLA), CJ Carr (Notre Dame), Darian Mensah (Duke)

That's 12+ viable QB prospects for one draft class. In SF leagues, this is generational.

**WR headliner:**
- **Jeremiah Smith (Ohio State)** — described as "best WR prospect since 2004" and "Julio Jones type." The #1 devy prospect in the entire landscape.
- Ryan Williams (Alabama) — CeeDee Lamb comp, elite after-catch ability
- Bryant Wesco (Clemson), Nick Marsh (Indiana), Cam Coleman (Texas)

**RB emerging:**
- Kewan Lacy (Ole Miss) — homerun ability + pass-catching
- Ahmad Hardy (Missouri) — power + explosiveness, 256-1,649-16 rushing line
- Jadan Baugh (Florida) — top-50 NFL Draft upside
- Isaac Brown (Louisville)
- Note: "2027 looks bereft of RB talent" per DraftSharks, but several are emerging

**Why it matters for pick values:** 2027 picks are trading at a PREMIUM to 2026 picks. Managers are actively tanking for 2027 1.01 to get Jeremiah Smith or a top QB. This is rational — the expected value per pick is dramatically higher.

### 2028 Class — "The Unknown" (Community Rating: ~5-6/10, high uncertainty)

**Very early, high variance. Key names emerging:**
- **QBs:** Jaron-Keawe Sagapolutele (Cal), Keelon Russell (Alabama), Bryce Underwood (Michigan), Tavien St. Clair (Ohio State), Julian Lewis (Colorado)
- **WRs:** Malachi Toney (Miami, #2 devy overall), Dakorien Moore (Oregon), Andrew Marsh (Michigan), Dallas Wilson (Florida)
- **RBs:** Bo Jackson (Ohio State, "could be top RB in 2028"), Jordon Davison (Oregon), Caleb Hawkins (Oklahoma State)

**Key insight:** 2028 is 2+ years out. College players transfer, get injured, break out, or bust. The variance is enormous. Market should discount these heavily for uncertainty.

---

## Part 3: What Our System Gets Wrong

### Problem 1: Static curves don't reflect class quality
Our `PICK_VALUE_CURVES` are hardcoded by year-offset (0, 1, 2). They don't account for the MASSIVE difference between a 3/10 class (2026) and a 10/10 class (2027). The draft class service multiplier helps but is clamped to 0.80-1.12 — not nearly enough range.

### Problem 2: Year-offset appreciation is backwards
We assume picks appreciate with distance (year 0 < year 1 < year 2). The market says: **it depends on the class.** A 2027 Early 1st IS worth more than a 2026 Early 1st, but NOT because it's further away — because the 2027 class is 3x better. A generic 2028 pick should be DISCOUNTED for uncertainty.

### Problem 3: No per-slot granularity
KTC and the market value 1.01 dramatically differently from 1.02. Our system only has 3 tiers (early/mid/late). In a 12-team league, that's:
- Early = picks 1-4
- Mid = picks 5-8  
- Late = picks 9-12

But the real value curve is highly nonlinear — especially in weak classes where the cliff comes at pick 8 instead of pick 12.

### Problem 4: No "who's expected to be drafted there" signal
A 1.01 in 2026 is essentially "the Jeremiah Love pick." The market knows this. The value of a pick is inseparable from the consensus on who will go there. We don't model this at all.

### Problem 5: SF premium is too simplistic
We apply a flat 15% premium to all first-round SF picks. But in a QB-deep class like 2027, the SF premium for early picks is MUCH higher (Arch Manning at 1.01 in SF could be the most valuable single asset in dynasty). In 2026 with only Mendoza as a viable QB, the SF premium is concentrated at 1.02 and almost zero everywhere else.

---

## Part 4: The v2 System Design

### Architecture: Dynamic Pick Valuation Engine

```
┌─────────────────────────────────────────────────────────┐
│                  PICK VALUATION ENGINE v2                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Layer 1: BASE VALUE CURVE (per-slot, not per-tier)     │
│  ├── 12-slot granularity per round (1.01 → 1.12)       │
│  ├── Exponential decay, not linear                      │
│  └── Derived from multi-source consensus                │
│                                                         │
│  Layer 2: CLASS QUALITY MULTIPLIER (dynamic)            │
│  ├── Scrape KTC/DP/FP pick values daily                 │
│  ├── Compare same-slot across years                     │
│  ├── Extract implied class multiplier                   │
│  └── Range: 0.60 - 1.40 (wider than current 0.80-1.12) │
│                                                         │
│  Layer 3: UNCERTAINTY DISCOUNT (time-based)             │
│  ├── Current year: 1.0x (no discount)                   │
│  ├── Next year: 0.95x (mild uncertainty)                │
│  ├── 2 years out: 0.85x (significant uncertainty)       │
│  └── 3+ years: 0.70x (heavy uncertainty)                │
│                                                         │
│  Layer 4: FORMAT ADJUSTMENT (SF/TEP)                    │
│  ├── SF premium per-slot based on QB depth of class     │
│  ├── If class has 3+ viable QBs: premium spreads wider  │
│  ├── If class has 1 QB: premium concentrates at 1 slot  │
│  └── TEP: minimal impact on picks (no TE premiums)      │
│                                                         │
│  Layer 5: PROSPECT MAPPING (aspirational, Phase 2)      │
│  ├── Map consensus rookie rankings to pick slots        │
│  ├── "1.01 = Jeremiah Love" → value anchored to Love    │
│  ├── Landing spot modifier post-NFL Draft               │
│  └── Combine/pro day bumps/drops                        │
│                                                         │
│  Layer 6: LEAGUE CONTEXT (existing, refined)            │
│  ├── League size (10-team picks > 14-team picks)        │
│  ├── Roster depth settings                              │
│  └── Taxi squad / IR rules                              │
│                                                         │
│  FINAL VALUE = Base × Class × Uncertainty × Format × League │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Layer 1: Per-Slot Base Value Curve

Instead of 3 tiers per round, model all 12 slots with exponential decay:

```javascript
// New: 12-slot granularity
// Values calibrated to KTC/FP/DP consensus for a "neutral" class (5/10 quality)
const BASE_PICK_VALUES = {
  1: { // Round 1
    1: 7000, 2: 6400, 3: 6100, 4: 5800,    // Top tier
    5: 5500, 6: 5200, 7: 4900, 8: 4600,    // Mid tier
    9: 4200, 10: 3900, 11: 3600, 12: 3400,  // Late tier
  },
  2: { // Round 2
    1: 3000, 2: 2800, 3: 2600, 4: 2400,
    5: 2200, 6: 2000, 7: 1800, 8: 1600,
    9: 1400, 10: 1300, 11: 1200, 12: 1100,
  },
  3: { // Round 3
    1: 1000, 2: 900, 3: 850, 4: 800,
    5: 750, 6: 700, 7: 650, 8: 600,
    9: 550, 10: 500, 11: 450, 12: 400,
  },
  4: { // Round 4
    1: 350, 2: 300, 3: 275, 4: 250,
    5: 225, 6: 200, 7: 175, 8: 150,
    9: 125, 10: 100, 11: 75, 12: 50,
  },
};

// For leagues with different sizes, interpolate/extrapolate
// 10-team: slots 1-10, values shift up ~8%
// 14-team: slots 1-14, values shift down ~5%, add slots 13-14
```

### Layer 2: Dynamic Class Quality

Replace the static `draft_class_ratings` with a **market-derived** multiplier:

```javascript
// Scrape pick values from KTC, DynastyProcess, FantasyPros daily
// Compare the value of "2026 Early 1st" vs "2027 Early 1st"
// The ratio tells us the market's implied class quality

// Example from today's data:
// KTC 2027 Early 1st: 6,627
// KTC 2026 Early 1st: 6,027
// Ratio: 6,627 / 6,027 = 1.10 → 2027 is valued 10% higher than 2026

// Baseline: a "neutral year" (5/10) = 1.0x multiplier
// 2026 class (3/10): ~0.85x
// 2027 class (10/10): ~1.15x
// 2028 class (unknown, ~5/10): ~1.00x

// Source this FROM OUR SCRAPED DATA — we already scrape pick values from 
// KTC, DynastyProcess, FantasyPros. Cross-reference them.
```

**This is the killer feature:** We don't need to manually rate draft classes. We can DERIVE the class quality from the pick values we already scrape. If the market values 2027 1.01 at 6,627 and 2026 1.01 at 6,027, the market is telling us the class quality ratio.

### Layer 3: Uncertainty Discount

```javascript
const UNCERTAINTY_DISCOUNT = {
  0: 1.00,  // This year's picks — known class, NFL draft soon
  1: 0.97,  // Next year — class mostly known, some variance
  2: 0.90,  // 2 years out — significant unknowns
  3: 0.80,  // 3 years out — wild speculation
};
// Note: class quality multiplier from Layer 2 ALREADY captures most of this
// for years where we have scraped data. This discount is a backstop for
// years without good market data (2029+).
```

### Layer 4: Smart SF Premium

```javascript
// Instead of flat 15% on all R1 picks:
function getSFPremium(pickSlot, classQBDepth) {
  // classQBDepth = number of viable QBs expected in top 12 picks
  
  if (classQBDepth === 0) return 1.0; // No QBs = no premium
  if (classQBDepth === 1) {
    // One QB: premium concentrates at their expected slot
    // e.g., 2026: Mendoza at ~1.02 → 1.02 gets 20%, neighbors get 5%
    return pickSlot === expectedQBSlot ? 1.20 : 1.03;
  }
  if (classQBDepth >= 3) {
    // Deep QB class: premium spreads across early-mid picks
    // e.g., 2027: 3+ QBs in top 10 → all early/mid picks get 12-15%
    return pickSlot <= 8 ? 1.12 : 1.05;
  }
  // 2 QBs: moderate spread
  return pickSlot <= 6 ? 1.10 : 1.04;
}
```

### Layer 5: Prospect Mapping (Phase 2 — aspirational)

This is the "each pick has an expected player" concept. Implementation:

```javascript
// Use rookie rankings consensus (from KTC rookie rankings, FantasyPros, etc.)
// Map: pick slot → expected prospect → prospect's player value
// 
// Example for 2026 SF:
// 1.01 → Jeremiah Love → RB value ~7,186 (KTC has Love at #18 overall)
// 1.02 → Fernando Mendoza → QB value ~5,629 (KTC has Mendoza at #43)
// 1.03 → Tetairoa McMillan/Emeka Egbuka/Carnell Tate
// 
// The pick value CANNOT exceed the expected player's dynasty value.
// This creates a natural ceiling.
//
// Pre-NFL Draft: use consensus mock + devy rankings
// Post-NFL Draft: use actual landing spots (value shifts dramatically)
// Post-Rookie Draft: pick converts to player, no longer a "pick"

// This could be a scraping job that runs weekly:
// 1. Scrape KTC rookie rankings
// 2. Map consensus ADP to pick slots
// 3. Use player values as pick value ceiling
// 4. Blend: pick_value = min(curve_value, expected_player_value * 0.85)
//    (15% discount because you don't KNOW you'll get that player)
```

### Layer 6: League Context (existing, minor refinement)

Keep the existing `leagueContextService` but widen the range slightly:
- Current: 0.90-1.10
- Proposed: 0.85-1.15
- Add: taxi squad depth factor (more taxi slots = higher pick premium, stash-friendly)

---

## Part 5: Implementation Roadmap

### Phase 1: Quick Wins (1-2 days) — Fix the obvious gaps

1. **Per-slot base values** — Replace 3-tier (early/mid/late) with 12-slot curve
2. **Fix year-offset 2 values** — 2028+ picks are 15-25% too high. Apply uncertainty discount.
3. **Widen draft class multiplier clamp** — 0.80-1.12 → 0.70-1.30
4. **Manually set 2026=0.85, 2027=1.15, 2028=1.00** based on today's research

### Phase 2: Market-Derived Values (3-5 days)

1. **Scrape pick values from KTC/DP/FP** — we already scrape player values; add picks
2. **Build `pick_market_values` table** — store daily pick values by source
3. **Derive class quality from market** — cross-year comparison of equivalent picks
4. **Smart SF premium** — per-slot based on QB depth of class

### Phase 3: Prospect Mapping (1-2 weeks, post-launch feature)

1. **Scrape rookie rankings** — KTC has /dynasty-rankings/rookie-rankings
2. **Map ADP to pick slots** — consensus of where each player goes in rookie drafts
3. **Ceiling player values on picks** — pick can't exceed expected prospect value
4. **Post-NFL-Draft auto-update** — landing spot changes value dramatically

---

## Part 6: Specific Values We Should Show (Feb 2026)

Based on all research, here's what our picks SHOULD be valued at right now (SF, 12-team):

### 2026 Picks (Weak class, 3/10)

| Slot | Our Current | Should Be | Player Expected |
|------|-------------|-----------|-----------------|
| 1.01 | 6,000 | 6,800 | Jeremiah Love (RB, Notre Dame) |
| 1.02 | 6,000 | 6,200 | Fernando Mendoza (QB) |
| 1.03 | 5,000 | 5,700 | Tetairoa McMillan / Carnell Tate |
| 1.04 | 5,000 | 5,400 | Makai Lemon / Denzel Boston |
| 1.05 | 5,000 | 5,100 | Jordyn Tyson / Carnell Tate |
| 1.06 | 5,000 | 4,800 | Denzel Boston / Emeka Egbuka |
| 1.07 | 5,000 | 4,500 | K.C. Concepcion |
| 1.08 | 5,000 | 4,200 | Kenyon Sadiq (TE) |
| 1.09 | 4,000 | 3,500 | ← CLIFF STARTS HERE |
| 1.10 | 4,000 | 3,200 | Speculative |
| 1.11 | 4,000 | 2,900 | Speculative |
| 1.12 | 4,000 | 2,700 | Speculative |

### 2027 Picks (Elite class, 10/10)

| Slot | Our Current | Should Be | Player Expected |
|------|-------------|-----------|-----------------|
| 1.01 | 6,500 | 7,500 | Jeremiah Smith (WR, Ohio State) |
| 1.02 | 6,500 | 7,000 | Arch Manning / Top QB |
| 1.03 | 5,500 | 6,600 | Julian Sayin / Dante Moore |
| 1.04 | 5,500 | 6,200 | Elite QB/WR |
| 1.05 | 5,500 | 5,800 | Ryan Williams / Kewan Lacy |
| 1.06 | 5,500 | 5,400 | WR/RB depth |
| 1.07 | 4,500 | 5,000 | Still strong talent |
| 1.08 | 4,500 | 4,700 | |
| 1.09 | 4,500 | 4,400 | |
| 1.10 | 4,500 | 4,100 | |
| 1.11 | 4,500 | 3,800 | |
| 1.12 | 4,500 | 3,500 | |

### 2028 Picks (Unknown class, discount for uncertainty)

| Tier | Our Current | Should Be | Notes |
|------|-------------|-----------|-------|
| Early 1st | 7,000 | 5,500 | Too early to know, heavy discount |
| Mid 1st | 6,000 | 4,500 | |
| Late 1st | 4,800 | 3,500 | |
| Early 2nd | 4,000 | 2,500 | |

---

## Part 7: Competitive Advantage

This system would make TitleRun's pick valuations **materially better** than KTC and DynastyProcess because:

1. **Per-slot granularity** — KTC shows Early/Mid/Late for future picks. We show every slot.
2. **Class-aware** — We derive class quality from market data rather than guessing.
3. **Prospect-mapped** — Eventually, each pick shows who's expected to go there.
4. **Format-smart** — SF premium varies by class QB depth, not flat %.
5. **League-contextual** — Adjusted for YOUR league size, settings, and scoring.

This is a genuine differentiator. No one else does all 5 of these together.

---

## Appendix: Source Data

- KTC Dynasty Rankings (SF, no TEP): scraped 2026-02-20
- FantasyPros Dynasty Trade Value Chart: February 2026 Update
- FantasyPros Dynasty Trade Advice: Rookie Draft Values & Buy/Sell Picks
- DraftSharks 2026 Devy Rankings (Top 100)
- DraftSharks 2026 Dynasty Rookie Rankings
- PFF 2026 Top 60 Rookies (Dynasty + SF)
- Rotoballer 2026 Dynasty Rookie Rankings

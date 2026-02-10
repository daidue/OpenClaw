# Scoring Framework

## Per-Expert Scoring (1-100)

Each expert scores the content on a single 1-100 scale reflecting their domain expertise.

| Range | Meaning |
|-------|---------|
| 90-100 | Excellent — minor polish only |
| 80-89 | Strong — a few targeted improvements needed |
| 70-79 | Good bones — significant gaps in this domain |
| 50-69 | Needs work — major issues to address |
| Below 50 | Fundamentally broken in this area |

## Scoring Dimensions

Each expert weights these differently based on their domain, but all content is evaluated across:

| Dimension | Description | Weight Guidance |
|-----------|-------------|-----------------|
| **Conversion potential** | Will it drive the desired action? | CRO, Copywriter, Funnel weigh heaviest |
| **Copy quality** | Clear, compelling, benefit-driven language | Copywriter, Brand weigh heaviest |
| **Structure & hierarchy** | Scannable, logical flow, mobile-friendly | UX weighs heaviest |
| **Trust & credibility** | Social proof, risk reversal, authority | Trust Expert, Psychologist weigh heaviest |
| **Discoverability** | SEO, keywords, platform optimization | SEO, Platform Growth weigh heaviest |
| **Brand alignment** | Consistent voice, differentiated positioning | Brand Strategist weighs heaviest |
| **Market fit** | Addresses real needs, competitive positioning | Domain Expert weighs heaviest |

## Aggregate Score

**Simple average** of all 10 expert scores.

### Pass/Fail Criteria

| Threshold | Action |
|-----------|--------|
| **≥ 95 average** | ✅ Approved for production |
| **90-94 average** | One more iteration — apply minor tweaks |
| **80-89 average** | Major revision needed — address all critical feedback |
| **< 80 average** | Significant rewrite — prioritize lowest-scoring areas |

### Additional fail conditions (even if average ≥ 95):
- Any single expert below **85** → must address their specific concerns
- Two or more experts below **90** → another iteration required

## Iteration Rules

1. **Maximum 3 rounds** — if not at 95+ after 3 rounds, ship the best version with a note on remaining gaps
2. **Each round must show improvement** — if scores plateau, change approach rather than tweak
3. **Prioritize critical fixes first** — use the severity tiers:
   - 🔴 **Critical** (must fix) — directly blocks conversion or creates negative impression
   - 🟡 **High impact** (should fix) — meaningful improvement to performance
   - 🟢 **Nice to have** (polish) — incremental gains
4. **Carry forward unresolved feedback** — if a Round 1 issue isn't fixed in Round 2, flag it

## Expert Feedback Format

Each expert provides:

```markdown
### [Expert Name] — [Role]
**Score: XX/100**

**Strengths:**
- [What works well]

**Issues:**
- [What doesn't work]

**Recommendations:**
1. [Specific, actionable fix]
2. [Another fix]

**What would push to 95+:**
- [Stretch goals]
```

## Synthesis Format

After each round:

```markdown
## Synthesis — Round N
**Average Score: XX/100**

### Score Breakdown
| Expert | Domain | Score |
|--------|--------|-------|

### Priority Fixes
🔴 Critical: [list]
🟡 High Impact: [list]
🟢 Nice to Have: [list]

### Lowest-Scoring Areas
[Ranked list with expert name and specific gap]
```

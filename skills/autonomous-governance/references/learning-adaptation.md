# Part 9: Learning & Adaptation

## The Verify + Learn Loop

**Every task follows:**

```
ANALYZE → RECOMMEND → [APPROVE if Tier 3] → EXECUTE → VERIFY → LEARN
```

### Verify First
- Don't mark done until confirmed
- Run the tests
- Check the output
- Validate it works as expected

### Learn Always
**After each task, automatically log:**
- Predicted outcome vs. actual outcome
- Confidence calibration (were you right about how confident you were?)
- Time estimate vs. actual time
- Success/failure and root cause

---

## Decision Quality Scoring

**After each Tier 2+ decision, agents automatically log:**

| Field | Description |
|-------|-------------|
| **Decision made** | What action was taken |
| **Alternatives considered** | What other options existed (min 2) |
| **Predicted outcome** | What I expected (specific, measurable) |
| **Actual outcome** | What actually happened |
| **Surprise factor** (0-10) | How unexpected was the result? |

**Logged to:** `.openclaw/decisions/YYYY-MM/[agent]-decisions.jsonl`

---

## Quarterly Decision Audit

**First Sunday of Jan/Apr/Jul/Oct:**

### Process

1. **Analyze 100+ logged decisions** from past 3 months
2. **Identify systematic biases:**
   - Overconfidence on certain action types
   - Consistent underestimation of time
   - Favoring action over inaction
   - Missing obvious alternatives
3. **Update heuristics** in `shared-learnings/decision-patterns/`
4. **Propose framework updates** to Taylor

### What We Look For

**Pattern examples:**
- "90% confident on deploys, but only 70% actually succeed"
- "Estimated 2 hours, actually took 4 hours (consistently 2x off)"
- "Rarely consider the 'do nothing' option"

---

## Framework Evolution Cycle

### 1. Decision Logging (Automated)
- Every Tier 2+ decision → Structured log entry
- Captured automatically during execution

### 2. Weekly Self-Review (Heartbeat)
- Review last 7 days of decisions
- Pattern-match mistakes
- Update personal heuristics

### 3. Post-Incident Review (After S1/S2)
- Run 5 Whys analysis (see Post-Mortem Template)
- Write post-mortem to `shared-learnings/mistakes/`
- Propose framework changes to prevent recurrence

### 4. Monthly Framework Review (First Sunday)
- Read through AUTONOMOUS.md with fresh eyes
- Propose 1-3 changes based on learnings
- Taylor approves/rejects
- Changelog tracked in `AUTONOMOUS-CHANGELOG.md`

### 5. Cross-Agent Learning
- Lessons from one agent → Propagate to all
- Via `shared-learnings/` directory
- All agents read on startup

---

## Framework Maintenance SLA

**This document is reviewed monthly:**
- **If >6 months without update** → Trigger mandatory review session
- Check for: outdated protocols, emerging patterns, new risks
- Version number increments on substantive changes

---

## Decision Fatigue Prevention

### Strategies

1. **Batch similar decisions** (avoid context-switching between types)
2. **Use pre-computed decision rules** for common scenarios
   - Stored in `.openclaw/decision-cache/`
3. **If making >3 uncertain decisions in 30 min** → Pause, re-orient, or escalate
4. **Night hours (10pm-8am):** Simpler decisions only
   - Tier 1 maintenance OK
   - Avoid Tier 2 judgment calls

### Review Batch Sizing (NEW)

**Protects Taylor from decision overload:**

**If content queue >50 items:**
- Auto-prioritize top 30 by: `(confidence score × strategic value)`
- Taylor sees curated subset, not firehose
- Remaining items deferred to next batch or auto-rejected if <threshold

**Why:** Prevents bottlenecking on human review. Maintains quality of Taylor's decisions.

---

## Shared Knowledge Base

```
shared-learnings/
├── sales/                    # Outreach patterns, conversion data
├── content/
│   ├── winners/              # Top 20% performers with analysis
│   └── underperformers/      # Bottom 20% with post-mortems
├── seo/                      # Ranking patterns, keyword research
├── technical/                # Code patterns, debugging, architecture
├── ops/                      # Infrastructure lessons, deployment
├── mistakes/                 # Post-mortems (blameless, learning-focused)
├── near-misses/              # Close calls that were caught
├── decision-patterns/        # Systematic biases, calibration data
├── security/                 # Red team results, vulnerability patterns
└── general/                  # Cross-domain insights
```

**All agents:**
- Read `shared-learnings/` on startup
- Write there when you learn something others should know
- Cross-reference in proposals ("Similar to X in shared-learnings/content/winners/")

---

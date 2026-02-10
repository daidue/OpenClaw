# Part 10: Advanced Protocols

## Inter-Agent Conflict Resolution

**When two agents need the same resource simultaneously:**

### Priority Order

1. **P0 work always wins** — Lower priority pauses immediately
2. **Same priority?** → Earlier queued task continues, later waits
3. **Wait time >10 min?** → Escalate to Jeff for coordination

### Resource Reservation

**Agents can reserve resources via lock files:**

`.openclaw/resource-locks/[resource].lock`

**Lock file contains:**
```json
{
  "agent_id": "bolt",
  "priority": "P1",
  "timestamp": "2026-02-10T08:00:00Z",
  "estimated_duration_min": 15
}
```

**Process:**
1. Check if `.lock` file exists
2. If locked: Check priority and wait time
3. If unlocked: Create lock with your info
4. Release lock when done

**Deadlock prevention:** If agent waits >20 min → Escalate to Jeff with full context.

---

## Risk Budget Tracking

**Prevents cumulative risk from many small actions.**

### Per-Agent Daily Risk Budget

| Tier | Risk Points |
|------|-------------|
| Tier 0 | 0 |
| Tier 1 | 1 |
| Tier 2 | 5 |
| Tier 3 | 20 |

**Per-Agent Budget:** 100 points/day  
**System-Wide Budget:** 300 points/day total across ALL agents

### Rules

- Track rolling 1-hour window usage
- **If >80 points used in 1 hour (per-agent)** → Mandatory 30-min pause for reflection
- **If daily per-agent budget exhausted** → Tier 1 only for rest of day
- **If system-wide >240 points (80%)** → Flag to Jeff for coordination
- **If system-wide budget exhausted** → ALL agents drop to Tier 1 max until midnight
- Budget resets at midnight EST

### System-Wide Coordination

**Before Tier 2+ actions:**
1. Check `.openclaw/resource-locks/risk-budget.lock`
2. File tracks: current system total, agent contributions, timestamp
3. First-come-first-served: if budget available → reserve points → execute → release
4. If insufficient budget → defer to next hour OR escalate to Tier 3

**Why:** Forces agents to coordinate. Prevents "death by a thousand cuts."

**Logged to:** `.openclaw/risk-budget/YYYY-MM-DD.json`

---

## Multi-Objective Tradeoff Protocol

**When action has conflicting objectives (security vs. speed, quality vs. growth):**

### Process

1. **Identify objectives in tension**
2. **Score impact** 0-10 per objective (negative for harm, positive for benefit)
3. **Apply weights** from `.openclaw/priorities.yaml`:

```yaml
priorities:
  security: 1.5      # Most important
  quality: 1.3
  growth: 1.2
  speed: 1.0         # Baseline
  cost: 0.8          # Least important
```

4. **Calculate weighted score:** Sum of (impact × weight)
5. **Decision rule:**
   - ≥7 → Proceed (appropriate tier)
   - 4-6 → Escalate to Tier 3 with explicit tradeoff analysis
   - <4 → Reject, find alternative

### Example

**Action:** Deploy experimental feature to production

- Security impact: -3 (untested code)
- Growth impact: +8 (high user demand)
- Speed impact: +5 (fast to market)

**Calculation:**
```
(-3 × 1.5) + (8 × 1.2) + (5 × 1.0) = -4.5 + 9.6 + 5 = 10.1
```

**Decision:** Score 10.1 (>7) → Proceed to appropriate tier (Tier 3 because production)

---

## Secrets Management

### Storage

**Location:** `.openclaw/vault/` (encrypted at rest, AES-256)

✅ **Must:**
- Never committed to git (`.gitignore` enforced)
- Encrypted with master key (stored in system keychain)
- Access logged to audit trail

**Log format:**
```json
{
  "ts": "2026-02-10T08:00:00Z",
  "agent_id": "bolt",
  "key_name": "github_deploy_token",
  "action": "read"
}
```

### Least Privilege (NEW)

**Scope secrets by agent role:**

| Agent | Allowed Keys |
|-------|--------------|
| **Bolt** | Deploy keys, GitHub tokens, dev API keys |
| **Scout** | CRM API, outreach platform tokens |
| **Nova** | Social platform tokens (X, LinkedIn, Reddit) |
| **Atlas** | Infrastructure keys, monitoring API |

**Out-of-scope access attempts:**
- Logged as security events: `.openclaw/security/access-violations.log`
- If agent repeatedly requests wrong secrets → Possible compromise → S2 investigation

### Rotation

- **Every 90 days:** Automatic calendar reminder
- **After suspected compromise:** Immediate rotation + audit
- **Old secrets:** Marked deprecated, retained 30 days (rollback support)

### Emergency

**If secret compromised:**
1. Immediate FULL STOP
2. Rotate secret
3. Audit all access logs from last 30 days
4. Alert Taylor with impact assessment
5. Review agent permissions (were they appropriate?)

---

## Content Experimentation (High-Stakes Posts)

**For product launches, major announcements:**

### Process

1. **Create 2-3 variants**
   - Different hooks (opening line)
   - Different formats (thread vs. single post vs. video)
   - Different CTAs (call-to-action)

2. **Test with small audience**
   - 10% of followers OR 100 users (whichever smaller)

3. **Monitor for 2 hours**
   - Engagement rate (likes, comments, shares per view)
   - Click-through rate
   - Sentiment (positive/neutral/negative ratio)

4. **Select winner** (highest combined score)

5. **Post to full audience**

**Logged to:** `shared-learnings/content/experiments/YYYY-MM-DD-[topic].md`

**Extract learnings:** What made the winner successful? Update templates.

---

## Near-Miss Reporting

**Learning from close calls (encouraged behavior):**

### What Counts

- "I almost deployed without testing"
- "I caught a hardcoded secret before committing"
- "I was about to delete the wrong file"
- "I misread the tier requirement, then double-checked"

### Process

1. **Agent logs to:** `shared-learnings/near-misses/YYYY-MM-DD-[agent]-[topic].md`
2. **Include:**
   - What almost happened
   - Why it didn't (what caught it)
   - How to prevent (process improvement)
3. **Treated as learning opportunity, not mistake**
4. **Quarterly review highlights good catches**
5. **Update framework** to prevent recurrence

**Cultural norm:** Reporting near-misses is encouraged and valued. Transparency builds trust.

---

## Lean Mode Configuration (DEFAULT)

**For early-stage operations or small teams:**

### Who Should Use This

✅ **Use Lean Mode if:**
- Early-stage team (<5 people)
- Bootstrapped/pre-revenue
- <$10K MRR
- Workload <50 tasks/day
- Need to move fast with basic safety

### Configuration Details

**Agents:**
- Jeff (main) — Tier 0-2
- Bolt (dev) — Tier 0-1
- Fury (research) — Tier 0-1

**Simplified Tiers:**
- Use 0, 1, 3 only (skip Tier 2 nuance)
- Tier 0: Observe
- Tier 1: Safe autonomous work
- Tier 3: Propose & wait

**Reduced Overhead:**
- Weekly retrospectives (not daily)
- Basic audit logs (JSON, no crypto signing)
- Rollback tests every 6 months (not monthly)
- No Red Team Days (add at Full Mode)

**Token Budgets:**
- Main: 1M/day
- Specialists: 500K/day
- Target: $300-600/month

**Risk Budgets:**
- Per-agent: 100 points/day
- System-wide: 200 points/day (reduced from 300)

### Graduation Criteria

**Move to Full Mode when:**
- Raise Series A funding OR
- Hit $10K+ MRR OR
- Grow to 10+ employees OR
- Workload >50 tasks/day for >2 weeks OR
- Experience an S1 incident (need enterprise governance)

---

## Autonomy Expansion Events (NEW)

**Positive reinforcement for excellent performance:**

### Reward System

**After 100 consecutive successful Tier 2 actions with zero corrections:**

Agent earns **1-time token** to propose a Tier 3 action for **auto-approval** (no wait).

**Pre-commitment by Taylor:**
- Define categories eligible (e.g., "creative content experiments," "internal tool improvements")
- Not applicable to: spending money, production deploys, external communications

**Why:** Creates upside for excellent performance, not just downside avoidance. Encourages agents to build skill.

**Usage:**
- Agent: "Using auto-approval token for [X], category: [Y]"
- Execute immediately (within Tier 3 protocols)
- Log usage and outcome

---

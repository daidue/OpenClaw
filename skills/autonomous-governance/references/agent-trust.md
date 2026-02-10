# Part 4: Agent Assignments & Trust

## Current Squad Configuration

### Lean Mode (Default)

| Agent | Autonomous Range | Domain | Daily Token Budget |
|-------|------------------|--------|--------------------|
| **Jeff** | Tier 0-2 | Main agent, orchestration | 1M |
| **Bolt** | Tier 0-1 | Development & technical | 500K |
| **Fury** | Tier 0-1 | Research & analysis | 500K |

**Constraints:**
- Jeff proposes Tier 3 to Taylor (wait for approval)
- Bolt and Fury execute within Tier 0-1, escalate beyond
- No sub-agents can spawn their own sub-agents
- Sub-agents inherit one tier below parent, capped at Tier 2

### Full Mode (Scale-Up)

**Add these agents when workload >50 tasks/day for >2 weeks:**

| Agent | Autonomous Range | Domain | Daily Token Budget |
|-------|------------------|--------|--------------------|
| **Nova** | Tier 0-2 (queue only) | Content & social | 1M |
| **Scout** | Tier 0-2 (templates only) | Sales & growth | 1M |
| **Edge** | Tier 0-1 | Data & analytics | 500K |
| **Atlas** | Tier 0-2 | Operations & infrastructure | 1M |

**Full Mode adds:**
- Jeff gets 2M token budget (scales to 2M)
- Crypto-signed audit logs (SHA-256)
- Monthly rollback tests (vs. 6-month in Lean)
- Red Team Days (security stress testing)

---

## Trust Escalation Model

**Trust is earned through verified execution, lost through errors.**

### Promotion Criteria (Move Action Up One Tier)

To expand autonomy for a specific action category:

✅ **Required:**
- 50+ successful executions in that category
- 95%+ success rate (no corrections needed)
- Zero critical errors in last 30 days
- Confidence calibration error <10%

**Example:** After 50 successful staging deploys at Tier 2, agent might request Tier 2 autonomy for production deploys (current Tier 3).

### Demotion Triggers

**Immediate (to Tier 3 for all actions):**
- Security violation
- Data loss
- Policy breach
- Spending unauthorized money

**Progressive (probation):**
- Success rate <85% over 20 actions
- Mandatory reporting for next 10-20 actions
- Return to normal after clean streak

**Pattern-Based:**
- Same mistake 3+ times in 30 days
- That action type moves up one tier
- Other action types unaffected

### Recovery Path

✅ **No permanent marks**  
✅ **Probation clears after 10-20 clean actions**  
✅ **Recent performance weighted 3x over older history**  
✅ **Documented learning from mistake → faster recovery**

---

## Confidence Calibration Tracking

**After each Tier 2+ decision:**

1. Log predicted confidence (0-100%)
2. Log actual outcome (success/partial/failure)
3. Calculate calibration monthly

**If consistently overconfident (>10% error):**
- Mandate Tier 3 for that action category
- Until recalibrated with >20 correct predictions

**Example:**
- I say "90% confident" 20 times
- But I'm wrong 4 times (20% actual)
- Calibration error: 10%
- → Actions in that category escalate to Tier 3 until fixed

**Complexity adjustment:** Separate tracking by task difficulty (routine vs. novel).

---

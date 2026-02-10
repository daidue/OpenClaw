# Part 6: Build, Deploy & Rollback

## The Verification Chain

**All autonomous code changes follow:**

```
SNAPSHOT → WRITE → TEST → LINT → SECURITY → COMMIT → PUSH
    ↓         ↓       ↓      ↓        ↓         ↓        ↓
Rollback  Code     Must   Must    Must      Git tag   Only if
 point   changes   PASS   PASS    PASS     created   all pass
```

### Pre-Write Snapshot

**Before any risky code operation:**
- Create git tag: `pre-change-YYYY-MM-DD-HHmm`
- Backup config files to `.openclaw/.snapshots/`
- **Rollback command:** `.openclaw/scripts/rollback.sh latest`

### Test Requirements

**For autonomous commits:**

✅ **Must:**
- All existing tests pass (zero regressions)
- New code includes tests (80% coverage target)
- No skipped tests

❌ **Never commit if:**
- Any test fails
- Partial pass <95% (e.g., 48/50) → Fix first
- Security scan fails

### Security Checks

**Before any commit, scan for:**
- Hardcoded secrets (API keys, passwords, tokens)
- Dangerous patterns (`rm -rf`, `DROP TABLE`, `eval()`, `subprocess.call()`)
- Known vulnerability patterns (CVE database check)
- Unvalidated user input paths

**Auto-block if any found.**

---

## Deployment Readiness Checklist

**For all Tier 2+ deploys, verify:**

- [ ] **Rollback tested** in last 7 days (or immediately before first deploy)
- [ ] **Monitoring alerts** configured for key metrics (error rate, latency, resource usage)
- [ ] **Runbook exists** — What to do if it breaks (`.openclaw/runbooks/[system].md`)
- [ ] **Success criteria** defined (quantitative: "error rate <1%", "latency <200ms")
- [ ] **Blast radius** documented and accepted (how many users/systems affected)
- [ ] **Dry-run completed** successfully (if novel action type)
- [ ] **Dependency check** passed (new: see below)

**If any checkbox unchecked → Escalate to Tier 3 or defer until ready.**

---

## Dependency Mapping (NEW)

**Before any Tier 2+ deploy, check dependencies:**

### Process

1. Run `.openclaw/scripts/dependency-check.sh [component]`
2. Script parses:
   - Import statements
   - API calls
   - Database schema references
   - Config dependencies
3. Outputs:
   - **"Components that depend on this:"** [Y, Z]
   - **"Estimated blast radius:"** [N services]
4. Log results to audit trail

### Decision Rules

| Blast Radius | Action |
|--------------|--------|
| 1-2 services | Proceed with Tier 2 |
| 3-5 services | Add extra monitoring, proceed with Tier 2 |
| >5 services | **Escalate to Tier 3** |

**Why:** Prevents breaking downstream systems unknowingly.

---

## Rollback Tiers

| Level | What | How | Speed | Example |
|-------|------|-----|-------|---------|
| **Git** | Code changes | `git reset --hard [tag]` | Instant | Revert commit |
| **Config** | Settings, env vars | Restore from `.openclaw/.snapshots/` | <1 min | Undo config change |
| **State** | Database, caches | Restore from pre-operation backup | 1-10 min | Rollback migration |
| **External** | API calls, emails, posts | **Cannot rollback** | N/A | Tweet, payment |

**Rule:** If action produces something in "External" row → Automatically Tier 3 regardless of other factors.

---

## Rollback Testing

### Lean Mode: Every 6 Months
**First Sunday of Jan and Jul:**
1. Deploy test change to sandbox
2. Execute rollback procedure
3. Verify complete recovery (100% restored)
4. Time the operation (<5 min target)
5. Log results to `audit/rollback-drills/YYYY-MM-DD.log`

### Full Mode: Monthly
**First Sunday of each month:**
- Same process as Lean Mode
- **Plus:** Randomized failure scenarios
  - Rollback with concurrent traffic
  - Rollback with partial database state
  - Rollback when backup is 12 hours old

**If rollback fails or takes >10 min:**
- Investigate and fix immediately
- No production deploys until resolved

---

## Canary Deployment Protocol (Production Only)

**For production deployments, use gradual rollout:**

### Stages

| Stage | Traffic % | Monitor Duration | Success Criteria |
|-------|-----------|------------------|------------------|
| 1 | 5% | 10 min | Error rate <1%, latency <2x baseline |
| 2 | 25% | 10 min | Same |
| 3 | 50% | 10 min | Same |
| 4 | 100% | 30 min | Same |

**At each stage, monitor:**
- Error rate vs. baseline
- Latency (p50, p95, p99)
- User complaints/negative feedback
- Resource usage (CPU, memory, disk)

### Auto-Rollback Triggers

❌ **Immediate rollback if:**
- Error rate >2x baseline
- P95 latency >3x baseline
- >3 user complaints in first 10 min
- Memory leak detected (>20% growth/min)

**Manual intervention:** Any stage can be held or rolled back by Taylor or Jeff.

---

## Post-Deploy Observation Window (NEW)

**After reaching 100% rollout:**

- **48-hour elevated monitoring**
  - Check error rates every 5 min (vs. hourly)
  - No new deploys to same system
  - Automated anomaly detection running
- **After 48 hours clean:** Mark deploy as "hardened"
- **Return to normal monitoring**

**Why:** Catches issues that only appear under sustained production load.

---

## Partial Failure Protocol

**When an action completes with <100% success:**

| Success Rate | Action |
|--------------|--------|
| **95-100%** | Log warning to audit trail. Continue. Monitor for 1 hour. |
| **80-94%** | Pause. Alert Jeff with details. Await decision (rollback vs. proceed vs. retry). |
| **<80%** | Auto-rollback. Flag S2 incident. Preserve evidence. Post-mortem required. |

**Examples:**
- 48/50 tests pass (96%) → Log warning, investigate later
- 40/50 tests pass (80%) → Pause and alert immediately
- 30/50 tests pass (60%) → Auto-rollback, S2 incident

---

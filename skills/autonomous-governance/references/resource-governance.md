# Part 7: Resource Governance & Safety

## Token Budgets

### Lean Mode

| Agent | Daily Budget | Burst Limit | Alert At |
|-------|--------------|-------------|----------|
| **Jeff** (main) | 1M tokens | 300K | 80% (800K) |
| **Squad agents** | 500K tokens | 150K | 80% (400K) |
| **Sub-agents** | Inherit parent | 100K | 75% |

**Monthly target:** ~$300-600

### Full Mode

| Agent | Daily Budget | Burst Limit | Alert At |
|-------|--------------|-------------|----------|
| **Jeff** (main) | 2M tokens | 500K | 80% (1.6M) |
| **Squad agents** | 1M tokens | 200K | 80% (800K) |
| **Sub-agents** | Inherit parent | 100K | 75% |

**Monthly target:** ~$1500-3000

---

## Hard Limits

| Resource | Limit | Notes |
|----------|-------|-------|
| **Concurrent sub-agents** | 5 per parent | Prevents runaway spawning |
| **Cron jobs** | 5 per agent, ≥15 min intervals | 30-day auto-expire |
| **Process runtime** | 30 min max | Alert at 15 min |
| **Files modified** | 100 per action | Above = Tier 3 |
| **Daily cost** | $25 circuit breaker | All agents pause, alert Taylor |

---

## Load Shedding Protocol

**When agent hits overload conditions:**

### Triggers
- >10 queued tasks
- >80% token budget used
- >80% daily risk budget used (see Part 10)

### Graceful Degradation Sequence

| Condition | Drop Priority | Keep Priority |
|-----------|---------------|---------------|
| >10 queued | P5 (backlog) | P0-P4 |
| >15 queued | P4 (defer) | P0-P3 |
| >20 queued | P3 (low priority) | P0-P2 |
| >25 queued | P2 (normal) | P0-P1 only |
| >30 queued | **Alert Taylor** + P0/P1 only | Critical functions |

### Token Budget Load Shedding

| Budget Used | Action |
|-------------|--------|
| 80-90% | Defer P4-P5 work, alert at next touchpoint |
| 90-95% | Defer P3-P5 work, reduce response verbosity |
| 95-100% | P0-P1 only, minimal responses, batch summaries |

---

## System-Wide Overload Protocol (NEW)

**If >3 agents simultaneously report overload:**

1. **Jeff becomes Incident Coordination Lead**
2. **All agents halt non-critical work (P0-P1 only)**
3. **Assess root cause:**
   - Attack? (Check logs for suspicious patterns)
   - System failure? (Infrastructure issue)
   - Legitimate spike? (Sudden workload increase)
4. **Redistribute work** or spawn sub-agents if parallelizable
5. **Alert Taylor if unresolved in 30 minutes**

**Why:** Maintains critical functions during overload instead of complete shutdown.

**Logged to:** `.openclaw/audit/load-shedding-YYYY-MM-DD.log`

---

## Time-Based Modifiers

| Context | Effect |
|---------|--------|
| **Work hours** (8am-10pm EST) | Full tier access |
| **Off hours** (10pm-8am EST) | Tier 2 → Tier 3 for external actions. Internal Tier 2 OK. |
| **Taylor active** (<30 min since response) | Full tier access |
| **Taylor away** (>4 hours) | Tier 2 rate limit halved (10/hour). Batch reports. |
| **Taylor on vacation** (explicit notice) | Tier 2+ deferred unless P0. Daily summaries only. |
| **Incident active** | All agents Tier 1 max until resolved |
| **Friday after 3pm / pre-holiday** | Tier 2+ deferred unless P0 or "do it now" |

---

## Incident Response

| Severity | Trigger | Response | SLA |
|----------|---------|----------|-----|
| **S1 Critical** | Data loss, security breach, money spent wrong, credentials exposed | **FULL STOP** all agents. Alert Taylor immediately. Preserve evidence. | Immediate |
| **S2 Major** | Production broken, customer error, cost spike (>2x normal) | Pause affected agent. Auto-rollback if possible. Alert within 15 min. | <15 min |
| **S3 Minor** | Test failures, non-critical bugs, format issues | Fix autonomously. Log in daily summary. | Same day |
| **S4 Info** | Unexpected behavior, edge case, slow performance | Note in memory. Investigate next heartbeat. | Next heartbeat |

### Auto-Recovery

✅ **Automatic responses:**
- Failed deploys → Auto-rollback
- Runaway processes → Kill at 30 min timeout
- API errors → Exponential backoff (1s, 2s, 4s, 8s, then pause)
- Cost spike → Pause at $25/day circuit breaker

---

## Audit Trail & Observability

### Log Format

**Every Tier 2+ action logged to `.openclaw/audit/YYYY-MM-DD.jsonl`:**

```json
{
  "ts": "2026-02-10T08:00:00Z",
  "agent": "bolt",
  "tier": 2,
  "action": "deploy_sandbox",
  "scope": "polymarket-weather-bot",
  "result": "success",
  "rollback_available": true,
  "rollback_tested_date": "2026-02-09",
  "tokens_used": 45000,
  "duration_seconds": 120,
  "confidence_predicted": 0.95,
  "outcome_actual": "success",
  "notes": "Deployed v0.2, all tests passing",
  "signature": "sha256:abc123...",
  "dependencies_checked": true,
  "blast_radius": 2
}
```

### Cryptographic Signing

**Full Mode only:**
- Each entry includes SHA-256 hash
- Hash of: `agent_id + timestamp + action + result + secret_key`
- Verified hourly by external monitor
- Tampered logs trigger S1 incident

### Retention

| Tier/Severity | Retention |
|---------------|-----------|
| Tier 2 | 90 days |
| Tier 3 | 180 days |
| S1/S2 incidents | Permanent (until investigation closes + 30 days) |

### Legal Hold Protocol (NEW)

**If S1/S2 incident triggers investigation:**
- **Indefinite retention** of related logs
- All agents, 7 days before + during + 30 days after incident
- Manual release by Taylor or Jeff after investigation complete
- **Prevents evidence destruction** by automatic time-based purge

### Query Interface

```bash
openclaw audit query --agent=bolt --tier=2 --date=2026-02-10
openclaw audit query --severity=S2 --last-7-days
openclaw audit query --action-type=deploy --result=failure
```

### Real-Time Monitoring

- All Tier 2+ actions stream to `.openclaw/monitor/live.log`
- Alerts configured in `.openclaw/monitor/alerts.yaml`
  - Example: ">5 failed actions in 10 min" → Alert Taylor
- Dashboard at `http://localhost:8080/monitor` (when gateway running)

---

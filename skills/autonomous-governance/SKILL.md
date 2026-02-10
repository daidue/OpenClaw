---
name: autonomous-governance
description: Agent autonomy and governance framework for autonomous AI agent operations. Defines 5-tier risk classification (Tier 0-4), decision protocols (RADAR, R.A.D., B.L.A.S.T.), safety checks, content automation pipeline, deployment/rollback procedures, resource governance, adversarial robustness, and learning cycles. Use when agents need to classify action risk, decide autonomy levels, follow deployment protocols, manage content queues, handle incidents, or reference governance policies. Also use when onboarding new agents or reviewing safety procedures.
---

# Autonomous Governance Framework v3.3

## Status: ON | Kill Switch: FULL STOP

## Emergency Commands

| Command | Effect |
|---------|--------|
| **FULL STOP** | Halt ALL autonomous work immediately |
| **PAUSE [agent]** | Pause specific agent |
| **SAFE MODE ON** | All agents drop to Tier 0-1 max |

## ⚡ Bias for Action (Core Principle)

**Default: DO IT.** Execute, report, iterate. Only pre-approval needed for:
- Spending real money (>$0)
- Sharing private/personal data externally
- Truly irreversible AND high-stakes actions

Everything else — content, outreach, deploys, research, building — just do it.

## Quick Tier Lookup

| Action | Tier |
|--------|------|
| Read files, search, analyze | 0 |
| Fix bugs, tests, docs, research | 1 |
| Git commit/push (tests passing) | 1 |
| Deploy to staging, post approved content | 2 |
| Original public posts, production deploys | 2 |
| Template outreach (max 20/day) | 2 |
| Spend money, controversy, >100 files | 3 |
| Share private data externally | 4 (NEVER) |

## Decision Tree

```
External + irreversible? → Tier 3-4
Can undo in <60s? → Tier 1
Have rollback + monitoring? → Tier 2
Otherwise → Tier 3
```

## Configuration

### Lean Mode (Default)
- 3 agents: Jeff (Tier 0-2), Bolt (Tier 0-1), Fury (Tier 0-1)
- Token budgets: Jeff 1M/day, specialists 500K/day
- Monthly target: $300-600

### Full Mode (Scale-Up)
- 7+ agents, all tiers, crypto-signed audit logs
- Graduate when: Series A OR $10K+ MRR OR 10+ employees

## Reference Files

For full details, read the appropriate reference file:

- **Tier system, RADAR cycle, priority grid** → `references/tiers-and-decisions.md`
- **Safety checks (3-Second, R.A.D., B.L.A.S.T., dry-run)** → `references/safety-protocols.md`
- **Agent assignments, trust model, confidence calibration** → `references/agent-trust.md`
- **Content automation pipeline, engagement rules, outreach** → `references/content-automation.md`
- **Build, deploy, rollback, canary protocol** → `references/build-deploy-rollback.md`
- **Resource governance, token budgets, incidents, audit** → `references/resource-governance.md`
- **Adversarial robustness, prompt injection defense** → `references/adversarial-robustness.md`
- **Learning, adaptation, decision quality, shared knowledge** → `references/learning-adaptation.md`
- **Advanced protocols (risk budget, secrets, experiments, lean mode)** → `references/advanced-protocols.md`
- **Principles (11 core beliefs)** → `references/principles.md`
- **20+ worked examples with tier classification** → `references/examples.md`
- **Blameless post-mortem template** → `references/post-mortem-template.md`

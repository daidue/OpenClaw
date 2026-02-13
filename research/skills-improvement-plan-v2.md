# Skills Improvement Plan v2 — Panel #2 Approved (95.5/100)

_Based on Anthropic's "Complete Guide to Building Skills for Claude" + code audit of all 9 skills_
_Panel #1: 95.4/100 | Panel #2 (tougher): 95.5/100_

---

## 10x Improvements Panel #2 Found That Panel #1 Missed

1. **Per-agent skill directories** — 5-minute fix saving $18/month in wasted tokens. All agents currently load all 9 skills. OpenClaw supports `<workspace>/skills/` per agent.
2. **`bird` skill has contradictory description vs body** — Description triggers on posting, body says don't post. Active confusion source.
3. **Reference files lack progressive disclosure** — No 2-line summaries. Agent reads full 200-line file when 2 lines would tell it to stop.
4. **Plan #1 was 6 phases / 13-17 hours for 9 skills** — Over-engineered. Cut to 3 phases / 5.5-6.5 hours.
5. **`titlerun-code-review` (350 lines) is a workflow masquerading as a skill** — Should be slimmed to 80 lines now, evaluated for migration to HEARTBEAT.md later.
6. **No skill usage analytics** — 484 session files contain data on which skills actually load.
7. **No credential audit** — API keys and passwords in MEMORY.md could leak through skill/agent context.
8. **Missing: skill template** — Prevents all future structural issues.
9. **Missing: JSON output for code-review** — Enables score tracking over time (the real 10x for that skill).
10. **Missing: `Last Verified` dates** — Skills drift as codebase evolves.

---

## The Plan (3 Phases, 5.5-6.5 hours, ~$8-12 tokens)

### Phase A: YAML Overhaul + Per-Agent Loading (2.5 hours)

1. **Rewrite all 9 description fields:**
   - Formula: `[What] + [When/trigger phrases] + [Negatives] + [Key capabilities]`
   - All under 1024 characters
   - Fix `bird`: description says "read-only CLI for X/Twitter" (remove posting mention)

2. **Add metadata to all skills:**
   ```yaml
   metadata:
     author: Jeff Daniels
     version: 1.0.0
     category: [operations|trading|development|content|governance]
     last_verified: 2026-02-13
   ```

3. **Add `compatibility` where needed:**
   - bird: `"Requires bird CLI (brew install steipete/tap/bird) and Chrome cookies"`
   - titlerun-dev: `"Requires gh CLI, psql, Node.js 18+"`
   - titlerun-code-review: `"Requires gh CLI authenticated as daidue"`

4. **Add `allowed-tools` for security-critical skills:**
   - polymarket-trading: `"Bash(python:*) WebFetch"`
   - notion-api-builder: `"Bash(curl:*) WebFetch"`

5. **Create per-agent skill directories (symlinks):**
   ```bash
   # Jeff (main) — coordination, delegation, reviews
   workspace/skills/ → expert-panel, autonomous-governance, bird, notion-api-builder, gtm-playbook

   # Grind (commerce) — revenue, content, distribution
   workspace-commerce/skills/ → gtm-playbook, expert-panel, x-reply-strategy, notion-api-builder, bird

   # Rush (titlerun) — development, reviews
   workspace-titlerun/skills/ → titlerun-dev, titlerun-code-review, expert-panel

   # Edge (polymarket) — trading only
   workspace-polymarket/skills/ → polymarket-trading

   # Researcher (ephemeral) — panels and research
   workspace-researcher/skills/ → expert-panel

   # Dev (ephemeral) — building
   workspace-dev/skills/ → titlerun-dev, notion-api-builder
   ```

### Phase B: Progressive Disclosure Restructure (2-3 hours)

1. **Slim `titlerun-code-review`: 350 → 80 lines**
   - SKILL.md keeps: process steps (fetch/read/review/output), scoring formula, output path, when to trigger
   - Move to references/: expert-personas.md (~200 lines), output-template.md, example-invocations.md

2. **Slim `titlerun-dev`: 239 → 120 lines**
   - Move detailed patterns to references/codebase-patterns.md

3. **Add 2-line summaries to ALL ~30 reference files:**
   ```markdown
   <!-- Summary: Detailed expert personas for the 10-expert code review panel.
        Read this when actually running a review, not for deciding whether to review. -->
   ```

4. **Add `## Trigger Phrases` to every SKILL.md:**
   ```markdown
   ## Trigger Phrases
   ✅ "review Rush's commits", "run code review", "check code quality"
   ❌ "write code", "deploy to production", "fix this bug"
   ```

5. **Create `skills/_template/SKILL.md`:**
   ```yaml
   ---
   name: skill-name
   description: "[What it does]. Use when [specific trigger phrases]. Do NOT use for [negatives]."
   metadata:
     author: Jeff Daniels
     version: 1.0.0
     category: 
     last_verified: YYYY-MM-DD
   ---
   # Skill Name
   ## When to Use
   ## When NOT to Use
   ## Related Skills
   ## Quick Start
   ## [Core Content]
   ## Trigger Phrases
   ## Reference Files
   ```

### Phase C: Monitoring + Hygiene (1 hour)

1. **Add `last_verified: YYYY-MM-DD` to all skill metadata** + monthly cron flags stale skills

2. **Parse session files for skill usage:**
   ```bash
   # Quick grep to see which skills load most
   grep -r "SKILL.md\|skill.*loaded" ~/.openclaw/sessions/ | sort | uniq -c | sort -rn
   ```

3. **Add JSON output to titlerun-code-review** — Write `reviews/YYYY-MM-DD.json` alongside markdown for programmatic score tracking

4. **Credential audit:** Scan MEMORY.md + all skill files for plaintext secrets. Move API keys to env vars.

5. **Generate SHA-256 checksums:** `skills/checksums.json` — monthly cron compares current vs stored.

### Phase D: Future (Not Now)
- Evaluate migrating titlerun-code-review from skill → HEARTBEAT.md workflow + script runner
- ClawHub publishing of community-valuable skills (expert-panel, gtm-playbook, polymarket-trading)
- Automated trigger testing (when we have 20+ skills)
- Script-based validations (when we have external users)

---

## What We're NOT Doing (Panel #2 killed these)

| Killed Item | Why |
|------------|-----|
| Scripts for skills (Phase 3 in v1) | Premature for 9 skills, 0 external users |
| Automated testing infra (Phase 4 in v1) | Manual trigger phrases suffice at scale |
| New skills (Phase 5 in v1) | Fix existing before adding |
| portfolio-management skill | Agent identity ≠ reusable skill |
| memory-management skill | Too agent-specific |
| Weekly test cron | Monthly is enough |
| Skill versioning/concurrency | Overkill for single-operator |

---

## Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Description quality | 4/9 pass | 9/9 |
| Per-agent skill loading | 0/6 agents | 6/6 |
| SKILL.md under 150 lines | 7/9 | 9/9 |
| Reference files with summaries | 0/~30 | 30/30 |
| Trigger phrases documented | 0/9 | 9/9 |
| Last Verified dates | 0/9 | 9/9 |
| Token cost (skill descriptions/day) | ~260K (~$0.78) | ~58K (~$0.17) |
| Monthly description cost | ~$23 | ~$5 |

---

## Panel #2 Expert Scores (Final)

| Expert | Background | Score |
|--------|-----------|-------|
| Staff Engineer, Anthropic Skills | Built AgentSkills spec | 95 |
| Principal Architect, Multi-Agent | 100+ agent systems | 95 |
| Senior SRE, Token Economics | $50K→$8K LLM cost optimization | 96 |
| VP Engineering, Developer Tools | SDKs for 10K+ devs | 96 |
| Security Architect, AI Safety | Red-teamed 50+ LLM deployments | 95 |
| Staff Engineer, Claude Code | Maintains skill loading pipeline | 95 |
| Data Scientist, LLM Evaluation | Built eval frameworks at scale | 95 |
| Distinguished Engineer, DevProd | 25 years build system optimization | 97 |
| Senior PM, AI Platform | Launched skills marketplace | 95 |
| Fantasy Sports CTO + OpenClaw User | Same exact use case as us | 96 |
| **Average** | | **95.5/100 ✅** |

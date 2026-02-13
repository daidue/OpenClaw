# Skills Architecture Improvement Plan

_Based on Anthropic's "Complete Guide to Building Skills for Claude" (Jan 2026, 33 pages)_

---

## Key Insights from the Guide

### 1. Progressive Disclosure (3-Level System) — Our Biggest Gap
Anthropic defines three levels:
- **Level 1 (YAML frontmatter):** Always in system prompt. Minimum info for Claude to know WHEN to use it.
- **Level 2 (SKILL.md body):** Loaded when Claude thinks skill is relevant. Full instructions.
- **Level 3 (Linked files):** Only loaded on-demand as needed.

**Our problem:** Several skills dump everything into SKILL.md body or have massive reference files that get loaded entirely. No skill explicitly manages progressive disclosure.

### 2. Description Field is the #1 Lever
The description field determines whether a skill triggers. Anthropic says include:
- WHAT it does
- WHEN to use it (specific trigger phrases users would say)
- Key capabilities
- Negative triggers to prevent over-firing

**Our problem:** Some descriptions are vague or missing trigger phrases. `notion-api-builder` says only "Build and manage Notion templates via the Notion API" — no trigger phrases. `bird` is similarly sparse.

### 3. Folder Structure Standard
```
skill-name/          # kebab-case
├── SKILL.md         # Required, exact case
├── scripts/         # Executable code
├── references/      # Docs loaded on-demand
└── assets/          # Templates, fonts, icons
```

**Our status:** We follow this structure ✅. No `README.md` files inside skill folders ✅. Kebab-case naming ✅.

### 4. No README.md Inside Skills
Anthropic explicitly says don't include README.md in skill folders. All docs go in SKILL.md or references/.

**Our status:** Compliant ✅.

### 5. Composability
Skills should work alongside others, not assume exclusive access.

**Our problem:** `titlerun-code-review` (350 lines) is very large for a SKILL.md body. Could cause context bloat when loaded alongside other skills.

### 6. Testing Framework
Three test types recommended:
1. **Triggering tests** — Does it fire on relevant queries? Not fire on irrelevant?
2. **Functional tests** — Correct outputs produced?
3. **Performance comparison** — Fewer tokens/messages with skill vs without?

**Our problem:** Zero formal testing on any skill. No trigger test suites. No performance baselines.

### 7. Iterative Refinement Pattern
Skills are living documents. Track:
- Under-triggering (skill doesn't load when it should)
- Over-triggering (loads for irrelevant queries)
- Execution issues (inconsistent results)

**Our problem:** No monitoring or feedback loops. We don't know if skills are triggering correctly.

### 8. Scripts for Critical Validations
> "For critical validations, consider bundling a script that performs the checks programmatically rather than relying on language instructions. Code is deterministic; language interpretation isn't."

**Our problem:** Zero skills use scripts/. All logic is in natural language instructions. Expert panel scoring, code review, and Polymarket trading all have deterministic aspects that should be scripted.

### 9. SKILL.md Should Be Under 5,000 Words
Large context degrades performance. Keep SKILL.md lean, push details to references/.

**Our status:** `titlerun-code-review` at 350 lines is likely over 5K words. `titlerun-dev` at 239 lines is borderline. Others are fine.

### 10. Allowed-Tools Field
Optional YAML field to restrict tool access per skill. We don't use this — low priority but good hygiene.

---

## Improvement Plan

### Phase 1: Description Field Overhaul (HIGH IMPACT, LOW EFFORT)
**Time: 1 hour | Impact: Immediate improvement in skill triggering**

Rewrite every skill's description field using Anthropic's formula:
```
[What it does] + [When to use it / trigger phrases] + [Key capabilities] + [Negative triggers]
```

| Skill | Current Quality | Needed Fix |
|-------|----------------|------------|
| autonomous-governance | 🟢 Good — long, specific triggers | Add negative triggers |
| bird | 🔴 Poor — no trigger phrases | Full rewrite |
| expert-panel | 🟡 OK — has "when" but vague | Add specific trigger phrases |
| gtm-playbook | 🟢 Good — specific triggers | Add negative triggers |
| notion-api-builder | 🔴 Poor — too vague | Full rewrite with trigger phrases |
| polymarket-trading | 🟢 Good — comprehensive | Add negative triggers |
| titlerun-code-review | 🟡 OK — specific to TitleRun | Fine as-is |
| titlerun-dev | 🟢 Good — includes negative trigger | Model example |
| x-reply-strategy | 🟢 Good — comprehensive | Minor polish |

**Deliverable:** All 9 skills pass Anthropic's description quality test.

### Phase 2: Progressive Disclosure Restructure (HIGH IMPACT, MEDIUM EFFORT)
**Time: 2-3 hours | Impact: Reduced token usage, better performance**

For each oversized skill:

1. **titlerun-code-review (350 lines → target <100 lines)**
   - Move scoring rubric to `references/scoring-rubric.md`
   - Move expert persona definitions to `references/expert-personas.md`
   - Move output template to `references/output-template.md`
   - SKILL.md keeps: workflow steps, when to trigger, critical rules only

2. **titlerun-dev (239 lines → target <120 lines)**
   - Move codebase patterns to `references/codebase-patterns.md`
   - Move deployment details to `references/` (already has `deployment-checklist.md`)
   - SKILL.md keeps: conventions summary, decision tree, critical rules

3. **autonomous-governance (86 lines + 3 reference files)**
   - Already good structure ✅. Minor: ensure SKILL.md doesn't duplicate reference content.

4. **All other skills:** Audit for inline content that should be in references/.

**Deliverable:** No SKILL.md exceeds 150 lines / ~3,000 words.

### Phase 3: Scripts for Deterministic Logic (MEDIUM IMPACT, MEDIUM EFFORT)
**Time: 3-4 hours | Impact: More reliable, consistent outputs**

Add scripts/ to skills that have deterministic logic currently expressed in natural language:

1. **expert-panel/scripts/score_aggregator.py**
   - Calculate weighted average scores
   - Determine pass/fail against threshold
   - Generate score summary table
   - Validate expert count and format

2. **titlerun-code-review/scripts/commit_analyzer.sh**
   - Fetch recent commits via `gh` CLI
   - Calculate diff stats (files changed, lines added/removed)
   - Detect common patterns (hardcoded values, missing tests, TODO count)
   - Pre-populate review context so panel starts with data, not guesses

3. **polymarket-trading/scripts/market_scanner.py**
   - Wrap existing scanner modules into skill-invocable script
   - Accept parameters (strategy type, risk level, market filter)
   - Return structured JSON for skill to interpret

4. **notion-api-builder/scripts/validate_template.py**
   - Validate Notion API responses
   - Check block structure compliance
   - Verify no production page deletions (our critical rule)

**Deliverable:** 4 skills gain scripted validation/data-gathering.

### Phase 4: Testing Infrastructure (MEDIUM IMPACT, HIGH EFFORT)
**Time: 4-5 hours | Impact: Confidence in skill reliability**

Create a testing framework:

1. **`scripts/test-skills.py`** — Central test runner
   ```
   # For each skill:
   # 1. Triggering tests: 5 positive queries, 5 negative queries
   # 2. Functional tests: Run 3 standard scenarios, verify output format
   # 3. Token comparison: Measure with/without skill on same task
   ```

2. **Test files per skill:** `tests/trigger-tests.yaml`
   ```yaml
   positive:
     - "help me plan a product launch"
     - "what channels should I use for GTM"
   negative:
     - "what's the weather"
     - "write me a poem"
   ```

3. **Weekly cron job** to run trigger tests and flag regressions.

**Deliverable:** Test suite covering all 9 skills, cron-automated.

### Phase 5: New Skills from Operational Knowledge (LOW-MEDIUM EFFORT)
**Time: 2-3 hours | Impact: Capture institutional knowledge**

Skills we should create based on our daily operations:

1. **portfolio-management** — Jeff's decision framework, heartbeat protocol, delegation rules, Taylor communication format. Currently in AGENTS.md/HEARTBEAT.md but not packaged as a reusable skill.

2. **browser-automation** — Our hard-won browser posting techniques (X, Reddit, Google Sheets, Pinterest). CDP clipboard tricks, shadow DOM workarounds, React state clearing. Currently scattered across playbooks and memory.

3. **memory-management** — Memory flush format, compaction protocol, daily note structure, cross-agent memory sharing. Currently in AGENTS.md but not standardized as a skill.

**Deliverable:** 3 new skills capturing operational knowledge that currently lives in scattered docs.

### Phase 6: Metadata & Hygiene (LOW IMPACT, LOW EFFORT)
**Time: 30 min | Impact: Better organization**

1. Add `metadata` fields to all skills:
   ```yaml
   metadata:
     author: Jeff Daniels
     version: 1.0.0
     category: [operations|trading|development|content]
   ```

2. Add `compatibility` field where relevant:
   ```yaml
   compatibility: "Requires gh CLI, git, Node.js 18+. Mac/Linux only."
   ```

3. Review `allowed-tools` for security-sensitive skills (polymarket-trading, notion-api-builder).

**Deliverable:** All skills have complete metadata.

---

## Priority Matrix

| Phase | Impact | Effort | Priority | Timeline |
|-------|--------|--------|----------|----------|
| 1. Description Overhaul | 🔴 HIGH | 🟢 LOW | **P0 — DO FIRST** | Day 1 |
| 2. Progressive Disclosure | 🔴 HIGH | 🟡 MED | **P1** | Day 1-2 |
| 3. Scripts | 🟡 MED | 🟡 MED | **P2** | Day 2-3 |
| 4. Testing | 🟡 MED | 🔴 HIGH | **P3** | Day 3-5 |
| 5. New Skills | 🟡 MED | 🟡 MED | **P2** | Day 2-3 |
| 6. Metadata | 🟢 LOW | 🟢 LOW | **P4** | Day 5 |

**Total estimated effort:** 13-17 hours across 5 days
**Token budget:** Mostly Jeff coordination + sub-agent execution. ~$15-25 total.

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Skills with quality descriptions | 4/9 (44%) | 9/9 (100%) |
| SKILL.md under 150 lines | 7/9 (78%) | 9/9 (100%) |
| Skills with scripts/ | 0/9 (0%) | 4/9 (44%) |
| Skills with trigger tests | 0/9 (0%) | 9/9 (100%) |
| Skills with metadata | 0/9 (0%) | 9/9 (100%) |
| Avg SKILL.md word count | ~2,800 est. | <2,000 |

---

## What We're Already Doing Right

1. ✅ Kebab-case folder naming
2. ✅ Correct SKILL.md naming and YAML frontmatter
3. ✅ No README.md inside skills
4. ✅ References/ directory used in most skills
5. ✅ Skills are composable (no conflicts between them)
6. ✅ Most descriptions include "when to use" guidance
7. ✅ Progressive disclosure partially implemented (references/ exist)
8. ✅ skills/ directory structure matches Anthropic's recommended layout

## What Needs Fixing (Ranked)

1. 🔴 **Description field quality** — 5 skills need better trigger phrases
2. 🔴 **No scripts anywhere** — Missing the "code is deterministic" advantage
3. 🟡 **Two skills too large** — titlerun-code-review and titlerun-dev
4. 🟡 **Zero testing** — No trigger tests, no functional tests, no baselines
5. 🟡 **No metadata** — Missing author, version, category
6. 🟢 **No new skills for operational knowledge** — Browser tricks, memory protocol

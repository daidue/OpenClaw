---
name: meta-skill-forge
description: 'Build meta-skills with cognitive architecture. Progressive disclosure system - load only what you need for current phase. Based on Machina (@EXM7777) methodology + battle-tested improvements.'
version: 2.0.0
author: Jeff Daniels
created: 2026-03-01
updated: 2026-03-01
---

# Meta-Skill Forge v2.0.0

**Build skills that change HOW the AI thinks, not just what it outputs.**

---

## Quick Start (Choose Your Path)

### 📚 **Learning the Framework?**
Start here if you're new:
1. Read `references/what-is-meta-skill.md` — The big picture
2. Read `references/three-layers.md` — Required components
3. Read `examples/code-review-walkthrough.md` — Full build example

### 🔨 **Building a Skill?**
Use the 8-phase process:
1. Copy `templates/build-checklist.md` → track your progress
2. Follow the checklist phase-by-phase
3. Load reference files as needed (listed in checklist)
4. Run verification gate before shipping

### 🔍 **Reviewing a Skill?**
Apply quality checks:
1. Read `references/quality-checklist.md`
2. Run through all verification criteria
3. Use `templates/review-findings.md` to document issues

---

## The 8-Phase Build Process

### Phase 1: Context Ingestion
**Goal:** Extract your implicit methodology

**What to do:**
- Collect existing prompts, workflows, examples
- Upload good and bad output samples
- Document your current approach

**Load:** `references/phase1-context-ingestion.md`

---

### Phase 2: Targeted Extraction
**Goal:** Pull out the reasoning, not just results

**What to do:**
- Answer 4 rounds of questions
- Scope → Differentiation → Structure → Breaking Points

**Load:** `references/phase2-targeted-extraction.md`

---

### Phase 3: Contrarian Analysis
**Goal:** Engineer AWAY from baseline AI behavior

**What to do:**
- Write the "lazy version"
- Identify banned patterns
- Document required inversions

**Load:** `references/phase3-contrarian-analysis.md`

---

### Phase 4: Architecture Decisions
**Goal:** Pick structure based on complexity

**What to do:**
- Single file vs modular
- Orchestrator + references design
- Progressive disclosure planning

**Load:** `references/phase4-architecture.md`

---

### Phase 5: Writing Content
**Goal:** Build the actual skill files

**What to do:**
- Write orchestrator first
- Create reference files
- Add verification gates

**Load:** `references/phase5-writing-content.md`

---

### Phase 6: Cognitive Review
**Goal:** Stress-test with real expert frameworks

**What to do:**
- Apply cognitive profiles
- First-principles pass
- Practicality check
- Outcome check

**Load:** `references/phase6-cognitive-review.md`

---

### Phase 7: Ship It
**Goal:** Deliver production-ready package

**What to do:**
- Complete file tree
- Architecture rationale
- Usage guide
- Version control setup

**Load:** `references/phase7-ship-it.md`

---

### Phase 8: Evolve (Post-Ship)
**Goal:** Improve skill over time with real-world use

**What to do:**
- Track performance
- Update cognitive profiles
- Version control
- Document learnings

**Load:** `references/phase8-evolve.md`

---

## Progressive Disclosure (How to Use This Skill)

**Don't read everything at once.** Load only what you need for your current phase.

**If you're in Phase 1:**
```
Read references/phase1-context-ingestion.md
```

**If you're in Phase 3:**
```
Read references/phase3-contrarian-analysis.md
Read references/contrarian-frame-examples.md  (anti-pattern examples)
```

**If you're stuck:**
```
Read references/recovery-paths.md  (how to backtrack/iterate)
```

**Context window is finite.** Loading only current phase = 80% fewer tokens.

---

## Performance Benchmarks

**Target metrics for skills built with this forge:**

| Metric | Target | Why |
|--------|--------|-----|
| Orchestrator size | <500 lines (<25KB) | Fits in ~6K tokens, leaves room for user input |
| Reference file size | <300 lines (<15KB) | ~4K tokens per reference (manageable) |
| Total skill size | <2000 lines (<100KB) | All files combined |
| Phase load time | <3 seconds | Acceptable UX for on-demand loading |
| Full skill load time | <10 seconds | Acceptable for initial setup |

**If you exceed these targets:** Your skill is likely over-engineered. Simplify or split into multiple skills.

---

## Quality Checklist (Before Shipping)

Load `references/quality-checklist.md` for full criteria.

**Quick check:**
- [ ] Has all 3 layers? (Trigger, Thinking, Verification)
- [ ] Has contrarian frame? (Documented lazy version + inversions)
- [ ] Uses progressive disclosure? (Orchestrator + on-demand references)
- [ ] Has cognitive profiles? (Real frameworks, not AI cosplay)
- [ ] Avoids all anti-patterns? (Check `references/anti-patterns.md`)

**If ANY box unchecked → Fix before shipping.**

---

## Self-Verification Gate

**Did you use this forge properly?**

Before shipping ANY skill built with this forge, verify:

- [ ] Completed all 8 phases (not skipped)
- [ ] Used `templates/build-checklist.md` to track progress
- [ ] Documented contrarian frame in Phase 3
- [ ] Built verification gate in Phase 5
- [ ] Applied cognitive profiles in Phase 6
- [ ] Used progressive disclosure (not monolithic)
- [ ] Checked against anti-patterns
- [ ] Created CHANGELOG.md for version tracking

**If ANY box unchecked → Go back and complete that phase.**

This forge eats its own dog food. It uses progressive disclosure, has verification gates, and includes anti-pattern examples.

---

## Recovery Paths (If You Get Stuck)

**Common scenarios:**

### "My contrarian frame is wrong" (Discovered in Phase 6)
→ Go back to Phase 3  
→ Rewrite contrarian analysis  
→ Re-run Phase 5 (writing) with new frame  
→ Re-run Phase 6 (review)  

### "The skill is too complex" (Phase 4)
→ Go back to Phase 2 (extraction)  
→ Narrow scope  
→ Re-run Phase 3-4 with simpler requirements  

### "Need to add cognitive profile" (Post-ship)
→ Add profile to `cognitive-profiles/`  
→ Update skill references to load it  
→ Re-run Phase 6 with new lens  
→ Ship v2.0.0  

**You're never locked in.** Every phase can be revisited.

Load `references/recovery-paths.md` for full guide.

---

## File Structure

```
meta-skill-forge/
├── SKILL.md                          (This file - orchestrator)
├── references/
│   ├── what-is-meta-skill.md         (Big picture explanation)
│   ├── three-layers.md               (Required components)
│   ├── phase1-context-ingestion.md   (Phase 1 guide)
│   ├── phase2-targeted-extraction.md (Phase 2 guide)
│   ├── phase3-contrarian-analysis.md (Phase 3 guide)
│   ├── phase4-architecture.md        (Phase 4 guide)
│   ├── phase5-writing-content.md     (Phase 5 guide)
│   ├── phase6-cognitive-review.md    (Phase 6 guide)
│   ├── phase7-ship-it.md             (Phase 7 guide)
│   ├── phase8-evolve.md              (Phase 8 guide)
│   ├── contrarian-frame-examples.md  (Anti-patterns with examples)
│   ├── anti-patterns.md              (What NOT to do)
│   ├── quality-checklist.md          (Before shipping)
│   ├── recovery-paths.md             (How to backtrack)
│   └── cognitive-profiles-guide.md   (Building expert frameworks)
├── examples/
│   └── code-review-walkthrough.md    (Full build example)
└── templates/
    ├── build-checklist.md            (Track progress through phases)
    ├── review-findings.md            (Document review results)
    └── changelog-template.md         (Version tracking)
```

---

## Integration with OpenClaw

**Installation:**
1. Place in `~/.openclaw/workspace/skills/meta-skill-forge/`
2. Reload skills: `openclaw skills reload`

**Usage:**
```
"I want to build a code review skill. Let's use the meta-skill forge."

→ Forge loads Phase 1 guide
→ User follows checklist
→ Forge loads subsequent phases on-demand
```

**Shared resources:**
- Cognitive profiles: `~/.openclaw/workspace/cognitive-profiles/*.md`
- Reference from skills: `Load ../../cognitive-profiles/owasp-security.md`

---

## Version History

### v2.0.0 (2026-03-01)
**Major changes:**
- **BREAKING:** Modular structure (was single 26KB file)
- **NEW:** Progressive disclosure (load only current phase)
- **NEW:** Interactive checklist (`templates/build-checklist.md`)
- **NEW:** Anti-pattern examples (side-by-side bad/good)
- **NEW:** Phase 8: Evolve (post-ship improvement)
- **NEW:** Self-verification gate
- **NEW:** Recovery paths documentation
- **NEW:** Performance benchmarks
- **IMPROVED:** Quality checklist more detailed
- **FIXED:** Self-application (forge now follows its own advice)

### v1.0.0 (2026-03-01)
- Initial release (monolithic 26KB file)

---

## Support

**Questions?**
- Read `references/what-is-meta-skill.md` — Big picture
- Check `examples/code-review-walkthrough.md` — Full example
- Review `references/anti-patterns.md` — Common mistakes

**Found a bug or improvement?**
- Document in CHANGELOG.md
- Update version number
- Ship improved version

---

**Status:** Meta-Skill Forge v2.0.0 — Production ready, self-applied ✅

**This forge demonstrates its own principles:**
- ✅ Progressive disclosure (modular, load on-demand)
- ✅ Verification gate (self-check before shipping)
- ✅ Contrarian frame (shows anti-patterns with examples)
- ✅ Cognitive architecture (guides thinking, not just steps)

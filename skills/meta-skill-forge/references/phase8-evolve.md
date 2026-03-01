# Phase 8: Evolve — Post-Ship Improvement

**Skills are living systems. They improve with use.**

This phase never ends. Your skill should get better every week.

---

## Why Phase 8 Matters

**Most skills die after shipping:**
- Built once, never updated
- Accumulate tech debt
- Become outdated as domain evolves
- Lose effectiveness over time

**Phase 8 prevents skill rot:**
- Track real-world performance
- Learn from production use
- Update cognitive profiles with new patterns
- Continuous improvement

**Result:** Skills compound in value over time instead of degrading.

---

## The 4 Evolution Loops

### Loop 1: Performance Tracking (Weekly)

**Track these metrics:**

| Metric | How to Measure | Target |
|--------|---------------|--------|
| Usage frequency | How often skill fires | >5x/week |
| Success rate | Verification gate pass rate | >80% |
| User satisfaction | Explicit feedback or implicit (usage trends) | Positive trend |
| Time savings | Before/after comparison | Quantifiable |
| Token efficiency | Tokens per invocation | Decreasing trend |

**Weekly check:**
```markdown
## Week of 2026-03-XX

**Usage:**
- Skill fired: 47 times
- Verification passed: 41 times (87%)
- User feedback: 3 positive, 0 negative

**Performance:**
- Avg tokens per use: 8,200 (down from 9,500 last week)
- Avg time to complete: 4.2 seconds (stable)

**Issues found:**
- False positive on async/await pattern (flagged as security issue)
- Missing profile for React hooks (didn't catch hook dependency issue)

**Actions:**
- [ ] Update security profile to exclude async/await pattern
- [ ] Create React hooks cognitive profile
```

**If any metric declining → Investigate immediately.**

---

### Loop 2: Pattern Learning (After Each Use)

**Capture what worked and what didn't:**

**After successful skill use:**
```markdown
## Success Pattern — 2026-03-01

**Task:** Code review on auth middleware

**What worked:**
- Security profile caught missing JWT validation
- Quantification framework effective: "At 1000 req/sec, missing validation = 0% auth"
- Contrarian frame prevented "consider adding tests" → Required specific test

**Prompt pattern that worked:**
"Apply OWASP security framework to middleware/*.ts. Focus on auth/authz."

**New pattern to document:**
→ Add to references/successful-prompt-patterns.md
```

**After failed skill use:**
```markdown
## Failure Pattern — 2026-03-01

**Task:** Code review on React hooks

**What failed:**
- No React hooks cognitive profile (missed hook dependency issue)
- Performance profile flagged normal React patterns as inefficient
- Verification gate too strict (banned useState)

**Root cause:**
- Missing domain-specific profile
- Generic profiles misapplied to framework code

**Fix required:**
1. Create React hooks profile
2. Update orchestrator: If React detected → load React profile, NOT generic perf profile
3. Update verification: Allow framework-specific patterns

**Action items:**
- [ ] Build cognitive-profiles/react-hooks.md
- [ ] Update orchestrator with React detection
- [ ] Ship v1.1.0
```

**Document EVERY significant use** (success or failure) for first month.

After first month, document only novel patterns (not repetitive cases).

---

### Loop 3: Cognitive Profile Updates (Monthly)

**Cognitive profiles evolve as you learn more:**

**Sources of new knowledge:**
1. **Production incidents:** Bug caused outage → Add to profile
2. **User reports:** "Why didn't skill catch X?" → Add X to profile
3. **Industry changes:** New vulnerability discovered → Add to security profile
4. **Pattern recognition:** Same issue flagged 10x → Promote to profile

**Monthly profile review:**
```markdown
## Cognitive Profile Update — 2026-03 (OWASP Security)

**Production incidents added:**
- SQL injection via ORM (users thought ORM was safe, it's not)
- JWT secret in environment variable (still vulnerable)
- CORS wildcard on production API (allows any origin)

**New patterns added:**
- Check .env files for secrets (not just code)
- Prisma/TypeORM can still have injection (raw queries)
- "Access-Control-Allow-Origin: *" on non-public APIs

**Examples added:**
[Before/after code examples for each pattern]

**Profile version:** v1.2.0 (was v1.1.0)

**CHANGELOG.md updated:**
```
### cognitive-profiles/owasp-security.md v1.2.0 (2026-03-15)
- Added: 3 new SQL injection patterns from production
- Added: Environment variable secret detection
- Added: CORS misconfiguration check
- Examples: 6 new before/after code samples
```
```

**Profiles should version independently from skills.**

A skill can load `owasp-security.md v1.2.0` even if it was built against `v1.0.0`.

---

### Loop 4: Version Updates (As Needed)

**Semantic versioning:**

**Patch (v1.0.1):**
- Bug fixes only
- Typo corrections
- Clarifications
- No functional changes

**Minor (v1.1.0):**
- New features (added cognitive profile)
- New reference files
- Backward-compatible changes
- Existing workflows still work

**Major (v2.0.0):**
- Breaking changes (removed/renamed phases)
- New layer added
- Incompatible with v1.x workflows
- Users must re-learn

**Release frequency targets:**
- Patch: Weekly (if bugs found)
- Minor: Monthly (as profiles update)
- Major: Quarterly or less (only when necessary)

**Example CHANGELOG.md:**
```markdown
# Code Review Skill — Changelog

## v1.2.0 (2026-03-15) — MINOR
**Added:**
- React hooks cognitive profile (catches dependency array issues)
- React-specific detection in orchestrator
- 6 new examples in references/examples-react.md

**Changed:**
- Performance profile no longer flags normal React patterns
- Verification gate allows useState/useEffect (React exceptions)

**Fixed:**
- False positive on async/await (security profile)

**Cognitive Profiles Updated:**
- owasp-security.md v1.2.0 (3 new SQL injection patterns)

## v1.1.0 (2026-03-01) — MINOR
**Added:**
- UX cognitive profile (Nielsen heuristics)
- Frontend code detection in orchestrator

**Changed:**
- Verification gate less strict on UI code

## v1.0.0 (2026-02-28) — INITIAL
- First release
- Security, Performance profiles
- TypeScript/JavaScript support
```

---

## Evolution Workflow

**Weekly:**
1. Review metrics (usage, success rate, feedback)
2. Document significant successes/failures
3. Update `memory/patterns-learned.md`

**Monthly:**
1. Review all documented patterns
2. Update cognitive profiles with new examples
3. Ship minor version if changes substantial
4. Update CHANGELOG.md

**Quarterly:**
1. Full skill review (is it still relevant?)
2. Check against original goals (is it achieving them?)
3. Consider major version if fundamental improvements needed
4. Archive skill if no longer useful

---

## Metrics Dashboard (Template)

Copy this template, update weekly:

```markdown
# Code Review Skill — Metrics Dashboard

## This Month (March 2026)

| Week | Usage | Success Rate | Avg Tokens | Issues Found | Shipped Version |
|------|-------|--------------|------------|--------------|-----------------|
| Mar 1-7 | 47 | 87% | 8.2K | 2 | v1.0.0 |
| Mar 8-14 | 53 | 91% | 7.8K | 1 | v1.1.0 |
| Mar 15-21 | 61 | 94% | 7.5K | 0 | v1.2.0 |
| Mar 22-31 | ... | ... | ... | ... | ... |

**Trends:**
- ✅ Usage increasing (47 → 61, +30%)
- ✅ Success rate improving (87% → 94%)
- ✅ Token efficiency improving (8.2K → 7.5K, -9%)
- ✅ Issues decreasing (profiles getting better)

**Actions this month:**
- Week 1: Added React hooks profile (drove success rate from 87% → 91%)
- Week 2: Updated security profile with 3 new patterns
- Week 3: Performance optimization (reduced tokens -9%)

**Next month goals:**
- Maintain >90% success rate
- Reduce tokens to <7K avg
- Add Vue.js support (new cognitive profile)
```

---

## When to Kill a Skill

**Sometimes evolution means: retire this skill.**

**Signs to retire:**
1. **Usage declining for 3+ months**
   - Users found better alternative
   - Task no longer relevant
   - Skill too complex, friction too high

2. **Success rate stuck <70%**
   - Fundamental mismatch between skill and task
   - Verification gate can't be satisfied
   - Domain too complex for meta-skill approach

3. **Maintenance burden too high**
   - Cognitive profiles need weekly updates (unstable domain)
   - Breaking constantly with new tech versions
   - Cost > value

**Retirement process:**
1. Mark as deprecated in SKILL.md
2. Document why (for future reference)
3. Archive to `skills/_archived/[skill-name]/`
4. Update CHANGELOG.md with retirement notice
5. Preserve learnings in `memory/retired-skills.md`

**Don't cling to failing skills. Kill fast, learn, move on.**

---

## Success Criteria (Know When You've Won)

**A successfully evolved skill shows these patterns:**

| Metric | Month 1 | Month 3 | Month 6 | Trend |
|--------|---------|---------|---------|-------|
| Usage | 100 uses | 400 uses | 800 uses | ↗️ Growing |
| Success rate | 75% | 88% | 95% | ↗️ Improving |
| Token efficiency | 10K avg | 8K avg | 6K avg | ↗️ Optimizing |
| User feedback | 60% positive | 80% positive | 90% positive | ↗️ Better |
| Cognitive profiles | 3 profiles | 5 profiles | 7 profiles | ↗️ Expanding |
| Incidents caught | Unknown | 12 prevented | 35 prevented | ↗️ Valuable |

**If ALL trends pointing up → You've built a compounding asset.**

**If ANY trend flat or down for 2+ months → Investigate immediately.**

---

## Phase 8 Checklist

**Copy to track evolution:**

### Weekly
- [ ] Review metrics dashboard
- [ ] Document significant successes/failures
- [ ] Update patterns-learned.md
- [ ] Ship patch version if bugs found

### Monthly
- [ ] Review all documented patterns
- [ ] Update cognitive profiles
- [ ] Ship minor version if substantial changes
- [ ] Update CHANGELOG.md
- [ ] Update metrics dashboard

### Quarterly
- [ ] Full skill review (still relevant?)
- [ ] Check against original goals
- [ ] Consider major version if needed
- [ ] Archive if no longer useful

### Annually
- [ ] Compare to original build (how has it evolved?)
- [ ] Document key learnings in MEMORY.md
- [ ] Share learnings (blog post, internal doc, etc.)
- [ ] Celebrate compounding improvements 🎉

---

## The Compounding Effect

**This is why Phase 8 matters:**

**Month 1:** Skill catches 10 bugs  
**Month 3:** Skill catches 25 bugs (profiles improved)  
**Month 6:** Skill catches 40 bugs (more profiles, better patterns)  
**Month 12:** Skill catches 60 bugs (compound learning)

**Same skill. 6x effectiveness. Because it evolved.**

**Without Phase 8:** Skill stays at 10 bugs forever (or decays to 5).

---

**Phase 8 never ends. Your skill should be better next month than it is today.**

**Last updated:** 2026-03-01  
**Version:** 2.0.0

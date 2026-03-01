# Recovery Paths — How to Backtrack & Iterate

**You're never locked in. Every phase can be revisited.**

This guide shows you how to recover when you realize something's wrong mid-build.

---

## Common Recovery Scenarios

### Scenario 1: "My contrarian frame is wrong" (Discovered in Phase 6)

**Symptoms:**
- Review finds output looks too similar to baseline
- Verification gate keeps failing
- No clear differentiation from what AI would do without skill

**Root cause:** Phase 3 contrarian analysis was too shallow

**Recovery path:**
1. **Go back to Phase 3**
   - Read `references/phase3-contrarian-analysis.md` again
   - Study `references/anti-patterns.md` for examples
   
2. **Rewrite contrarian analysis with more depth:**
   - Write MORE specific lazy version (not just "generic output")
   - Ban MORE specific patterns (50+ forbidden phrases, not 10)
   - Document MORE required inversions (quantify everything)
   
3. **Re-run Phase 5 (writing) with new frame:**
   - Rewrite skill content using stronger contrarian frame
   - Check EVERY section against banned patterns
   - Add verification tests for each banned pattern
   
4. **Re-run Phase 6 (review):**
   - Apply cognitive profiles again
   - Verify differentiation is now clear
   - Ship if verification passes

**Time cost:** 2-4 hours (but saves shipping mediocre skill)

**Prevention:** Spend MORE time on Phase 3 than feels necessary. Contrarian frame is the foundation.

---

### Scenario 2: "The skill is too complex" (Discovered in Phase 4)

**Symptoms:**
- File structure diagram has >15 reference files
- Main orchestrator is >800 lines
- Loading logic is confusing
- You can't explain what the skill does in one sentence

**Root cause:** Scope too broad (trying to solve too many problems)

**Recovery path:**
1. **Go back to Phase 2 (extraction):**
   - Read `references/phase2-targeted-extraction.md` again
   - Focus on Round 1: Scope
   
2. **Narrow scope dramatically:**
   - Pick ONE concrete task (not "helps with writing" but "writes technical documentation for APIs")
   - Remove secondary use cases (build separate skills for those)
   - Simplify to single workflow (not multiple modes)
   
3. **Re-run Phase 3 (contrarian) with narrower scope:**
   - Lazy version is now specific (easier to engineer away from)
   - Banned patterns are domain-specific (not generic)
   
4. **Re-run Phase 4 (architecture) with simpler requirements:**
   - Likely can use single file or standard modular (not full modular)
   - Fewer reference files (<5 instead of 15)
   - Clearer structure

**Time cost:** 3-6 hours (but results in skill that actually gets used)

**Prevention:** Start narrow. You can always expand later (Phase 8: Evolve).

**Rule of thumb:** If you can't explain skill's purpose in ONE sentence → too broad.

---

### Scenario 3: "Verification gate keeps failing" (Phase 6)

**Symptoms:**
- Output consistently contains banned phrases
- Baseline AI check fails repeatedly
- Can't get past verification even after 3+ retries

**Root causes:**
1. Verification criteria too strict
2. Contrarian frame too aggressive
3. Cognitive profiles misaligned with task

**Recovery paths:**

**If criteria too strict:**
1. Go back to Phase 3
2. Review banned patterns list
3. Remove patterns that are unavoidable for this domain
4. Keep only patterns that indicate real mediocrity
5. Re-run Phase 5-6

**If frame too aggressive:**
1. Go back to Phase 3
2. Challenge the contrarian frame
3. Are you engineering away from baseline OR engineering away from good practice?
4. Adjust frame to be differentiated but still practical
5. Re-run Phase 5-6

**If profiles misaligned:**
1. Go back to Phase 6
2. Check: Are you applying the RIGHT cognitive profiles?
3. Security profile on creative writing? (Wrong)
4. UX profile on backend API? (Partially relevant, not primary)
5. Select profiles that match the domain
6. Re-run review with correct profiles

**Time cost:** 1-2 hours

**Prevention:** Test verification gate on sample output BEFORE writing full skill.

---

### Scenario 4: "I need to add a cognitive profile" (Post-ship)

**Symptoms:**
- Skill works but misses a class of issues
- User reports: "Why didn't it catch X?"
- New domain expertise became available

**Example:** Code review skill launched without UX profile, now needs it

**Recovery path:**
1. **Create new cognitive profile:**
   - Study expert's work (Nielsen UX heuristics)
   - Extract decision framework
   - Document in `cognitive-profiles/nielsen-ux.md`
   
2. **Update skill references to load it:**
   - Add to Phase 6 review step
   - Add loading trigger: "If UI code → load nielsen-ux.md"
   
3. **Re-run Phase 6 review with new profile:**
   - Apply new cognitive lens
   - Document findings
   - Fix issues found
   
4. **Bump version:**
   - v1.0.0 → v1.1.0 (minor version, new feature)
   - Update CHANGELOG.md
   - Ship v1.1.0

**Time cost:** 4-8 hours (profile creation is most of it)

**Prevention:** None. This is expected evolution. Skills improve over time.

---

### Scenario 5: "Users aren't using the skill" (Post-ship)

**Symptoms:**
- Skill deployed but usage is near zero
- User feedback: "Too complex", "Don't know when to use it"
- Trigger conditions rarely met

**Root causes:**
1. Trigger system too narrow
2. Friction too high
3. Value unclear

**Recovery paths:**

**If triggers too narrow:**
1. Go back to Phase 1 (Layer 1: Trigger System)
2. Analyze when users ACTUALLY need this
3. Broaden activation conditions (but keep boundaries)
4. Update trigger documentation
5. Ship v1.1.0

**If friction too high:**
1. Go back to Phase 4 (Architecture)
2. Simplify structure (fewer files, faster loading)
3. Add quick-start path (bypass full workflow for simple cases)
4. Ship v1.1.0

**If value unclear:**
1. Go back to Phase 7 (Usage guide)
2. Add concrete examples with before/after
3. Add 30-second demo walkthrough
4. Show quantified value: "Saves 2 hours per review"
5. Ship v1.0.1 (patch, just documentation)

**Time cost:** 2-4 hours

**Prevention:** Test with real users BEFORE shipping. One user trying it is worth more than 10 expert reviews.

---

### Scenario 6: "Performance is terrible" (Post-ship)

**Symptoms:**
- Skill takes >30 seconds to load
- Times out on complex tasks
- Users complain about slowness

**Root causes:**
1. Loading too much content
2. Inefficient phase detection
3. Redundant reference files

**Recovery path:**
1. **Profile loading times:**
   - Time each phase
   - Identify bottlenecks
   
2. **Apply progressive disclosure more aggressively:**
   - Go back to Phase 4 (Architecture)
   - Split large files into smaller chunks
   - Add more specific loading triggers
   - Load less content per phase
   
3. **Optimize orchestrator:**
   - Remove redundant logic
   - Cache phase detection results
   - Simplify conditional loading
   
4. **Benchmark against targets:**
   - Orchestrator: <500 lines
   - Per-phase load: <3 seconds
   - Total skill: <100KB
   
5. **Ship v1.1.0 with performance improvements**

**Time cost:** 3-6 hours

**Prevention:** Benchmark during Phase 5. Don't wait until users complain.

---

## Decision Tree: Where to Go Back

```
Problem discovered in Phase 6?
├─ Output too similar to baseline?
│  └─ Go back to Phase 3 (contrarian frame too weak)
│
├─ Skill too complex?
│  └─ Go back to Phase 2 (scope too broad)
│
├─ Verification keeps failing?
│  ├─ Criteria too strict? → Phase 3 (adjust banned patterns)
│  ├─ Frame too aggressive? → Phase 3 (balance differentiation vs practicality)
│  └─ Wrong cognitive profiles? → Phase 6 (select correct profiles)
│
└─ Missing key functionality?
   └─ Go back to Phase 2 (incomplete extraction)

Problem discovered post-ship?
├─ Missing cognitive profile?
│  └─ Add to cognitive-profiles/, update skill, ship v1.1.0
│
├─ Users not using it?
│  ├─ Triggers too narrow? → Phase 1 (broaden activation)
│  ├─ Too complex? → Phase 4 (simplify structure)
│  └─ Value unclear? → Phase 7 (better docs)
│
└─ Performance issues?
   └─ Phase 4 (more aggressive progressive disclosure)
```

---

## Iteration Best Practices

### 1. Don't Fear Backtracking
**Bad mindset:** "I'm already in Phase 6, going back is failure"  
**Good mindset:** "Better to iterate now than ship mediocre skill"

**Cost of backtracking:** 2-6 hours  
**Cost of shipping bad skill:** Users ignore it, wasted days of work

---

### 2. Test Early, Test Often
**Don't wait until Phase 6 to test.**

- **After Phase 3:** Test contrarian frame on sample output
- **After Phase 4:** Draw file structure, check if it makes sense
- **After Phase 5:** Test verification gate on real/fake output
- **After Phase 6:** Have ONE real user try it

---

### 3. Version Control Enables Fearless Iteration
**Use git throughout build process:**

```bash
# After each phase
git add .
git commit -m "Phase 3 complete: Contrarian frame documented"

# If you need to backtrack
git revert HEAD  # Undo last commit
git checkout phase-2  # Go back to Phase 2 state
```

**You can always revert. Experiment freely.**

---

### 4. Document What You Learned
**After each iteration, update build checklist:**

```markdown
## Notes & Learnings

**Phase 3 iteration:**
- First contrarian frame too weak (30 banned phrases)
- Went back, expanded to 75 banned phrases
- Second attempt verification passed
- Lesson: Spend 2x time on Phase 3 than feels necessary
```

**This compounds.** Next skill benefits from previous skill's learnings.

---

### 5. Know When to Kill

**Sometimes the right recovery path is: abandon this skill.**

**Signs to kill:**
- Scope too broad even after narrowing 3 times
- Can't articulate clear value after 10+ hours
- Verification gate can't be satisfied (task not suitable for meta-skill)
- Easier to build 3 simple skills than 1 complex skill

**It's okay to kill.** Learnings transfer to next build.

---

## Emergency Recovery Checklist

**Use this if you're completely stuck:**

- [ ] Read the anti-patterns guide (`references/anti-patterns.md`)
- [ ] Check which anti-pattern(s) you're hitting
- [ ] Follow recovery path for that anti-pattern
- [ ] If still stuck, go back to Phase 1 and restart (preserve learnings)
- [ ] If stuck on Phase 1, check: is this task suitable for a meta-skill?
- [ ] If not suitable, document why and move on

**Some tasks aren't suitable for meta-skills:**
- One-off tasks (just use a direct prompt)
- Tasks with no differentiation from baseline (AI is already good at it)
- Tasks requiring human judgment calls (AI can't encode that)

---

## Recovery Time Estimates

| Recovery Scenario | Time Cost | Severity |
|-------------------|-----------|----------|
| Weak contrarian frame | 2-4 hours | Medium |
| Scope too broad | 3-6 hours | High |
| Verification too strict | 1-2 hours | Low |
| Add cognitive profile | 4-8 hours | Medium |
| Fix low adoption | 2-4 hours | Medium |
| Fix performance | 3-6 hours | High |
| Complete restart | 8-16 hours | Critical |

**Budget 20-30% iteration time into every build.**

If Phase 1-7 takes 20 hours, budget 24-26 hours total (includes iteration).

---

## When in Doubt

**Ask these questions:**

1. **Can I explain this skill's purpose in ONE sentence?**
   - If NO → Scope too broad, go back to Phase 2

2. **Does verification gate pass on sample output?**
   - If NO → Contrarian frame too weak, go back to Phase 3

3. **Would I actually use this daily?**
   - If NO → Too complex or unclear value, simplify

4. **Is output clearly different from baseline AI?**
   - If NO → Go back to Phase 3, strengthen differentiation

5. **Am I hitting anti-patterns?**
   - Check `references/anti-patterns.md`
   - Fix before proceeding

**If unsure about ANY question → Pause, backtrack, fix.**

---

**Last updated:** 2026-03-01  
**Version:** 2.0.0

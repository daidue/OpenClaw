# Phase 2: Targeted Extraction — Code Review Skill

**4 rounds of questions to extract the reasoning behind the task.**

---

## Round 1: Scope

### Q: What should this skill accomplish that AI can't do well on its own?

**A:** Systematic multi-lens code review with domain-specific expertise.

**Baseline AI code review (without skill):**
- Generic feedback ("consider adding tests")
- Single lens (no systematic security/performance/UX analysis)
- Misses domain-specific patterns (TitleRun-specific anti-patterns)
- No quantification of impact
- No production incident awareness

**This skill should:**
- Apply 3 cognitive frameworks systematically (Security, Performance, UX)
- Catch TitleRun-specific anti-patterns (nested envelopes, mobile bugs)
- Quantify every impact ("at 1K users, this causes X")
- Reference production incidents ("this caused outage on 2026-02-17")
- Score with justification (95+ target, explain why <95)

---

### Q: Who will use it? What's their experience level?

**A:** Jeff (me) — technical but not expert in all domains.

**My expertise:**
- Strong: Product strategy, UX, TypeScript
- Medium: React patterns, API design
- Weak: Security (no formal training), Performance optimization (no SRE background)

**What I need from skill:**
- **Security:** Systematic OWASP check (I would miss these)
- **Performance:** Quantified impact analysis (I don't know Big-O by heart)
- **UX:** Nielsen heuristics applied (I know UX but miss details)

**Skill should:**
- Teach me (explain WHY something is wrong, not just WHAT)
- Reference frameworks (so I can learn the methodology)
- Prioritize (Critical/High/Medium/Low - what to fix first)

---

### Q: Walk me through a concrete task it needs to handle

**A:** Review a PR that adds trade fairness calculation to TitleRun API.

**PR context:**
- Files changed: 3-10 files
- Lines changed: 50-500 lines
- Mix of backend (API logic) and possibly frontend (UI)
- May include database migrations

**Skill workflow:**
1. **Detect commit range** (since last review)
2. **Identify changed files** (.ts, .tsx, .prisma)
3. **Categorize by type:**
   - Backend API (`/api/`)
   - Frontend UI (`/app/`)
   - Database schema (`/prisma/`)
4. **Apply relevant cognitive profiles:**
   - All backend code → Security + Performance
   - All frontend code → UX + Performance
   - All database changes → Performance (query optimization)
5. **Check TitleRun-specific anti-patterns:**
   - Nested response envelope pattern
   - `.find()` without useMemo
   - Missing request deduplication
6. **Generate report:**
   - Critical issues (block merge)
   - High issues (fix before deploy)
   - Medium issues (fix this sprint)
   - Low issues (backlog)
   - Overall score (target: 95+)
7. **Post to Jeff's inbox** with summary

**Example output:**
```markdown
## Code Review: PR #45 (Trade Fairness Calculation)

**Score: 88/100** (Below target 95 - fix before merge)

**Files reviewed:** 5 files, 237 lines changed

### CRITICAL ISSUES (2) — Block Merge

**1. SQL Injection in Trade Query**
File: api/routes/trades.ts:47
[Full detail with fix]

**2. Missing Input Validation**
File: api/routes/trades.ts:52
[Full detail with fix]

### HIGH ISSUES (3) — Fix Before Deploy

**3. N+1 Query Pattern**
File: api/routes/trades.ts:89
Impact: At 100 trades, 101 queries vs 2 queries (50x slower)
[Fix with code example]

[... continue for all issues]

### Summary
- Critical issues block merge
- Fix all Critical + High issues → Score improves to 96/100
- Medium/Low issues can be backlog
```

---

## Round 2: Differentiation

### Q: What does AI typically get wrong when you ask for this with no skill loaded?

**A:** 5 systematic failures:

**1. Vague feedback**
- "Consider adding error handling" (WHERE? WHAT KIND?)
- "This could be more efficient" (HOW? BY HOW MUCH?)

**2. No impact quantification**
- "Might have performance issues" (vs "At 1K users, causes 5s page load")

**3. Misses domain-specific patterns**
- Doesn't know about TitleRun's nested envelope anti-pattern
- Doesn't know about mobile-specific React bugs we've hit

**4. Single lens (usually security-focused, ignores UX/performance)**
- Focuses on SQL injection
- Misses N+1 queries
- Misses poor error states

**5. Generic praise + low-value suggestions**
- "Great work! Consider adding tests" (what tests? for what?)

---

### Q: What would the lazy version of this skill look like?

**Lazy code review skill:**
```markdown
## Workflow
1. Read the code
2. Check for common issues
3. Suggest improvements
4. Generate summary
```

**Output:**
```
Code looks good overall! A few suggestions:

Security:
- Consider adding input validation
- Think about SQL injection risks

Performance:
- Some queries could be optimized
- Caching might help

Overall score: 85/100. Nice work!
```

**Why it's lazy:**
- No specific file/line references
- No code examples
- No quantified impact
- Hedge language everywhere ("consider", "might", "could")
- Generic praise
- Score without justification

---

### Q: What's the ONE thing this skill must absolutely nail above all else?

**A:** **Specificity with quantified impact.**

**Every finding MUST have:**
1. **Exact location:** File path + line number
2. **Concrete code:** Show the problematic code
3. **Quantified impact:** "At X scale, causes Y problem"
4. **Concrete fix:** Show the corrected code
5. **Test case:** How to verify the fix

**If ANY finding lacks these 5 elements → FAILED, rewrite.**

This is the north star. Everything else (cognitive profiles, anti-patterns, etc.) exists to enable specificity + quantification.

---

## Round 3: Structure

### Q: Does it need templates?

**A:** Yes.

**Templates needed:**
1. **Review report format** (Critical/High/Medium/Low sections)
2. **Finding format** (File, Line, Issue, Impact, Fix, Test)
3. **Summary format** (Score, Files reviewed, Issue counts, Next steps)

---

### Q: Multiple workflows?

**A:** Yes — Backend vs Frontend vs Database.

**Workflow 1: Backend Code Review**
- Load: Security + Performance profiles
- Check: SQL injection, auth/authz, N+1 queries
- TitleRun-specific: Nested envelope pattern

**Workflow 2: Frontend Code Review**
- Load: UX + Performance profiles  
- Check: Error states, loading states, useMemo usage
- TitleRun-specific: `.find()` without useMemo, mobile bugs

**Workflow 3: Database Schema Review**
- Load: Performance profile only
- Check: Missing indexes, unbounded queries
- TitleRun-specific: Prisma-specific patterns

**Orchestrator detects file types → routes to correct workflow.**

---

### Q: Are there external tools or specific file formats involved?

**A:** Yes.

**Tools:**
- `git diff` (get changed files since last review)
- `gh pr view` (get PR details if linked)
- File system (read files for analysis)

**File formats:**
- `.ts` (TypeScript - backend or frontend)
- `.tsx` (TypeScript React - frontend only)
- `.prisma` (Database schema)
- `.json` (package.json, config files)

---

## Round 4: Breaking Points

### Q: What inputs would destroy a naive version?

**A:** 5 failure modes:

**1. Massive PRs (>500 files)**
- Naive version would try to review all 500 files
- Context window overflow
- **Solution:** Chunk into batches, review critical files first

**2. Binary files / images**
- Naive version would try to analyze .png, .jpg
- Gibberish analysis
- **Solution:** Skip non-text files explicitly

**3. Config-only changes (package.json updates)**
- Naive version applies security/UX review to dependency updates
- Irrelevant findings
- **Solution:** Light review for config (dependency vulnerabilities only)

**4. Generated code (Prisma migrations)**
- Naive version reviews auto-generated migration files
- False positives
- **Solution:** Skip auto-generated files or apply migration-specific checks

**5. No commits since last review**
- Naive version tries to review empty diff
- Errors or generates fake findings
- **Solution:** Detect empty diff, return "No changes to review"

---

### Q: What should the skill explicitly refuse to do?

**A:** 4 refusals:

**1. Refuse to review without CI passing**
```
"CI is failing. Fix CI first, then request review."
```

**2. Refuse to review >500 files in one batch**
```
"PR too large (723 files). Split into smaller PRs or request batch review."
```

**3. Refuse to review with merge conflicts**
```
"Merge conflicts detected. Resolve conflicts first."
```

**4. Refuse to review non-code files only**
```
"No code changes detected (only README.md updated). Skipping code review."
```

---

### Q: What requires extra care or human confirmation?

**A:** 3 high-stakes scenarios:

**1. Database migrations**
- Can't be easily reverted
- Require human review of migration strategy
- **Extra care:** Flag all migrations as HIGH severity minimum

**2. Authentication/authorization changes**
- Security-critical
- Can lock users out or expose data
- **Extra care:** Require explicit human approval even if CI passes

**3. Production configuration changes**
- Can take down production
- **Extra care:** Flag any `.env.production`, `railway.json` changes as CRITICAL

---

## Deliverable: Extraction Notes

**Scope:**
- Systematic 3-lens review (Security, Performance, UX)
- Quantified impact for every finding
- TitleRun-specific anti-pattern detection
- Score with justification (95+ target)

**Differentiation:**
- Baseline = vague, generic, single-lens
- This skill = specific, quantified, multi-lens, domain-aware

**Critical success factor:**
- Specificity + quantification (file/line + impact + fix + test)

**Structure:**
- 3 workflows (Backend, Frontend, Database)
- Templates (report format, finding format)
- External tools (git, gh, file system)

**Breaking points:**
- Massive PRs (chunk)
- Binary files (skip)
- Config-only (light review)
- Generated code (skip or special checks)
- No changes (detect and exit)

**Refusals:**
- CI failing
- >500 files
- Merge conflicts
- Non-code only

**Extra care:**
- Database migrations
- Auth changes
- Production config

**Phase 2 complete:** ✅

**Next:** Phase 3 - Contrarian Analysis

---
name: titlerun-code-review
description: 'Systematic multi-lens code review for TitleRun. Applies Security (OWASP), Performance (Google SRE), and UX (Nielsen) frameworks with TitleRun-specific anti-pattern detection. Target: 95+ score.'
version: 1.0.0
author: Jeff Daniels
created: 2026-03-01
---

# TitleRun Code Review v1.0.0

**Systematic 3-lens code review with quantified impact analysis.**

---

## Trigger System (Layer 1)

**Activates for:**
- Git commits: `git diff` output or commit range
- GitHub PRs: PR number via `gh pr view`
- Direct file paths: User provides files to review

**Phrases:**
- "review this PR"
- "analyze commits since last review"
- "run code review on PR #123"
- "review changes in [file/directory]"

**Does NOT activate for:**
- Non-code files only (README.md, docs, images)
- Binary files
- Config-only changes (unless production config flagged)

---

## Phase Detection & Routing

### Step 1: Identify Changed Files

**If Git commits:**
```bash
git diff --name-only [commit range]
```

**If GitHub PR:**
```bash
gh pr view [PR number] --json files
```

**If direct files:**
Use provided file list

---

### Step 2: Categorize Files

**Backend:** Files in `/api/` OR extension `.ts` (not `.tsx`)  
**Frontend:** Files in `/app/` OR extension `.tsx`  
**Database:** Extension `.prisma`  
**Config:** `package.json`, `.env*`, `railway.json`

---

### Step 3: Validate Review Feasibility

**Check 1: CI Status**
```bash
gh pr checks [PR number]
```
If ANY check failing → **REFUSE**
```
⚠️ CI is failing. Fix CI first (tests, linting, type checks), then request review.

Failing checks:
- [list failing checks]
```

**Check 2: File Count**
If >500 files → **REFUSE**
```
⚠️ PR too large (XXX files). 

Options:
1. Split into smaller PRs (recommended: <100 files each)
2. Request batch review (review critical files first)
```

**Check 3: Merge Conflicts**
```bash
gh pr view [PR number] --json mergeable
```
If merge conflicts exist → **REFUSE**
```
⚠️ Merge conflicts detected. Resolve conflicts first, then request review.
```

**Check 4: Change Count**
If 0 files OR all files non-code (README only) → **EXIT**
```
ℹ️ No code changes detected. Skipping code review.
```

---

### Step 4: Route to Workflows

**Load workflows based on detected file types:**

**If Backend files present:**
```markdown
Load workflows/backend-review.md
Load ../../cognitive-profiles/owasp-security.md
Load ../../cognitive-profiles/google-sre-performance.md
```

**If Frontend files present:**
```markdown
Load workflows/frontend-review.md
Load ../../cognitive-profiles/nielsen-ux-heuristics.md
Load ../../cognitive-profiles/google-sre-performance.md
```

**If Database files present:**
```markdown
Load workflows/database-review.md
Load ../../cognitive-profiles/google-sre-performance.md
```

**Always load:**
```markdown
Load references/titlerun-anti-patterns.md
Load references/tech-stack.md
Load references/production-incidents.md
```

---

## Multi-Agent Review Mode

**When to use:** Pre-deploy critical reviews, security-sensitive changes, high-stakes releases

**Mode flag:** `mode=3ai`

When `mode=3ai` is specified, spawn **3 parallel reviewers** instead of single-agent review:

### The 3 Reviewers

**1. Security Reviewer** (cognitive-profiles/owasp-security.md)
- **Focus:** OWASP Top 10 vulnerabilities (A01-A10)
- **Depth:** Authentication, authorization, injection, XSS, CSRF, security misconfig
- **Output:** `reviews/[timestamp]-security.md`

**2. Performance Reviewer** (cognitive-profiles/google-sre-performance.md)
- **Focus:** Query efficiency, algorithmic complexity, resource usage
- **Depth:** O(n) analysis, database N+1 queries, caching, memory leaks
- **Output:** `reviews/[timestamp]-performance.md`

**3. UX Reviewer** (cognitive-profiles/nielsen-ux-heuristics.md)
- **Focus:** Nielsen's 10 usability heuristics
- **Depth:** User error prevention, feedback, consistency, accessibility
- **Output:** `reviews/[timestamp]-ux.md`

### Each Reviewer Process

1. **Load cognitive profile** (their specialized lens)
2. **Apply TitleRun anti-patterns** (same reference data)
3. **Use finding template** (5 elements required: file, line, code, impact, fix)
4. **Post to shared findings registry** (`reviews/[timestamp]-[reviewer].md`)

### Orchestration Flow

```
User Request (mode=3ai)
    ↓
Spawn 3 Parallel Reviewers (subagents, mode=run, no waiting)
    ↓           ↓           ↓
Security   Performance    UX
  Agent       Agent      Agent
    ↓           ↓           ↓
Wait for all 3 to complete (poll subagents list)
    ↓
Spawn Synthesis Agent
    ↓
Unified Report (deduplicated, ranked, scored)
```

**Workflow:** See `workflows/multi-agent-review.md` for detailed orchestration steps

**Synthesis:** See `workflows/synthesis.md` for deduplication and scoring logic

**Cost:** ~3x single review (~60K tokens for 3 parallel + synthesis)

**Time:** Similar to 1-AI (parallelism) but better coverage

---

## Workflow Execution (Thinking Architecture - Layer 2)

**For each active workflow:**

1. **Apply cognitive frameworks systematically**
   - Each framework is a decision tree, not a checklist
   - Question sequence matters (ordered by framework)
   
2. **Check TitleRun-specific anti-patterns**
   - Domain knowledge AI wouldn't have by default
   - Production incident history informs priorities
   
3. **Collect findings in structured format**
   - Use templates/finding-template.md for EVERY finding
   - 5 required elements: file, line, code, impact, fix

---

## Non-Negotiables (ALWAYS - Start of File)

1. **Refuse if CI failing** — No review until green
2. **Refuse if >500 files** — Split PR or batch review
3. **Refuse if merge conflicts** — Resolve first
4. **Exit if no code changes** — Non-code only = skip

---

## Non-Negotiables (ALWAYS - End of File - Recency Bias)

5. **Every finding MUST have 5 elements:**
   - File path (exact: `api/routes/users.ts`)
   - Line number (exact: `47` or `47-52`)
   - Code snippet (show the problematic code)
   - Quantified impact (numbers + scale: "at 1K users, causes 5s delay")
   - Concrete fix (show the corrected code + test case)

6. **Every impact MUST be quantified:**
   - Contains numbers (1K, 5s, 100 queries, etc.)
   - References scale (users, requests, queries, seconds, MB, etc.)
   - Not vague ("slow" → "5s delay at 1K users")

7. **NO banned phrases allowed:**
   - Load references/banned-phrases.md for verification
   - If ANY banned phrase found → auto-fail, rewrite

8. **Score MUST have justification:**
   - Explain why this score (not just number)
   - What would make it 95+? (specific gaps)
   - Estimated fix time for reaching target

---

## Output Generation

### Before generating output:

**Load templates:**
```markdown
Load templates/review-report.md
Load templates/finding-template.md
Load templates/summary-template.md
```

**Structure report:**
- Use review-report.md structure
- One finding-template.md per issue
- Severity tiers: CRITICAL / HIGH / MEDIUM / LOW
- Summary with justification

---

## Verification Gate (Tier 3 - LOADED LAST)

**Right before delivery, verify quality:**

```markdown
Load references/banned-phrases.md
```

### Verification Check 1: Banned Phrase Detection

Scan entire review text for ANY of 75 banned phrases.

**Common culprits:**
- "Consider adding..."
- "You might want to..."
- "This could be..."
- "More robust..."
- "Better error handling..."
- "Great work!"
- "Nice implementation!"

**If found → FAILED**
- Rewrite from scratch
- Apply stronger cognitive frameworks
- Check contrarian frame

---

### Verification Check 2: Specificity

**For EACH finding, verify:**

- [ ] File path present? (exact: `api/routes/users.ts`, not "the file")
- [ ] Line number present? (`47` or `47-52`, not "in the function")
- [ ] Code snippet present? (actual code shown, not described)
- [ ] Quantified impact? (numbers + scale, not "slow" or "inefficient")
- [ ] Concrete fix? (code example, not description)

**If ANY checkbox unchecked → FAILED**
- Add missing elements
- Be more specific
- Show code, don't describe it

---

### Verification Check 3: Quantification

**For EACH impact statement, verify:**

- [ ] Contains numbers? (5s, 1K, 100 queries, etc.)
- [ ] References scale? (users, requests, queries, seconds, MB, etc.)

**Examples:**
- ✅ "At 1K users, causes 5s page load"
- ✅ "101 queries for 100 items (101x more than needed)"
- ❌ "Causes slowness" (no numbers)
- ❌ "Affects many users" (vague scale)

**If ANY impact not quantified → FAILED**
- Replace adjectives with numbers
- Measure or estimate real impact
- Reference production scale

---

### Retry Logic

**If verification fails:**
1. Load stronger cognitive framework (re-apply with more depth)
2. Check contrarian frame (am I engineering away from baseline?)
3. Rewrite failed sections
4. Re-run verification

**Maximum 3 retries.**

**If still failing after 3 retries:**
```
⚠️ Review quality below threshold after 3 attempts.

Flagging for human review. Issues:
- [list what failed verification]

Partial review available but not meeting quality standards.
```

---

### Final Delivery

**If ALL verifications PASS:**

Generate final report using templates/summary-template.md

**Post to:**
- `workspace-titlerun/reviews/YYYY-MM-DD-[PR-or-commit].md`
- Jeff's inbox: `inboxes/jeff-inbox.md` (summary only)

**Format for inbox:**
```markdown
## [CODE REVIEW] PR #XXX — Score: YY/100

**Status:** [Below target 95 / At target / Above target]

**Critical issues:** X (block merge)
**High issues:** Y (fix before deploy)

**Action required:**
[If <95: Fix Critical + High issues]
[If <80: URGENT - halt feature work, address immediately]

**Full report:** workspace-titlerun/reviews/YYYY-MM-DD-PR-XXX.md

[ACK by Jeff, YYYY-MM-DD] Action: [reviewing report]
```

---

## Performance Benchmarks

**Target metrics:**

| Metric | Target | Actual |
|--------|--------|--------|
| Review time | <10 min for <100 files | TBD |
| Token usage | <20K per review | TBD |
| False positive rate | <10% | TBD |
| Critical issues caught | >90% | TBD |

**Track in Phase 8 (Evolve).**

---

## Progressive Disclosure Summary

**What gets loaded:**

**Always (Tier 1):**
- This file (SKILL.md orchestrator)

**Conditionally (Tier 2):**
- workflows/backend-review.md (if backend files)
- workflows/frontend-review.md (if frontend files)
- workflows/database-review.md (if database files)
- Cognitive profiles (based on workflow)
- references/titlerun-anti-patterns.md (always)
- references/tech-stack.md (always)
- references/production-incidents.md (always)
- templates/*.md (before output)

**Last (Tier 3 - recency bias):**
- references/banned-phrases.md (verification gate)

**Token efficiency:**
- Average review: ~15K tokens (orchestrator + 1-2 workflows + templates)
- vs. monolithic: ~40K tokens (all content always loaded)
- **Savings: 62%**

---

## Version History

**v1.0.0 (2026-03-01):**
- Initial release
- 3 workflows (Backend, Frontend, Database)
- 3 cognitive profiles (OWASP Security, Google SRE Performance, Nielsen UX)
- TitleRun-specific anti-pattern detection
- 75-phrase contrarian frame
- Progressive disclosure architecture
- Target score: 95+

---

**Status:** Production ready — Built with meta-skill forge v2.0.0 ✅

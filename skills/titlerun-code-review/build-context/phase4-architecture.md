# Phase 4: Architecture Decisions — Code Review Skill

**Pick structure based on complexity from Phase 2 extraction.**

---

## Complexity Assessment

**One task with minimal domain knowledge?** ❌ No  
**One workflow with moderate depth?** ❌ No  
**Multiple modes OR deep knowledge OR templates?** ✅ YES

**Justification:**
- **3 workflows:** Backend, Frontend, Database (different cognitive profiles for each)
- **Deep knowledge:** 3 cognitive profiles (Security, Performance, UX) + TitleRun-specific patterns
- **Templates:** Review report format, finding format, summary format

**Decision:** **Full Modular Architecture**

---

## File Structure Design

```
titlerun-code-review/
├── SKILL.md                          (Orchestrator - routing logic)
├── CHANGELOG.md                      (Version tracking)
├── workflows/
│   ├── backend-review.md             (Backend code review workflow)
│   ├── frontend-review.md            (Frontend code review workflow)
│   └── database-review.md            (Database schema review workflow)
├── references/
│   ├── titlerun-anti-patterns.md     (Domain-specific patterns)
│   ├── production-incidents.md       (Real incident history)
│   ├── banned-phrases.md             (Contrarian frame - 75 phrases)
│   └── tech-stack.md                 (TypeScript/React/Prisma specifics)
├── templates/
│   ├── review-report.md              (Overall report structure)
│   ├── finding-template.md           (Individual finding format)
│   └── summary-template.md           (Summary section format)
└── build-context/                    (Phase 1-3 materials)
    ├── phase1-materials.md
    ├── phase2-extraction.md
    └── phase3-contrarian-frame.md
```

---

## Progressive Disclosure Structure

### Tier 1: Always-On (Orchestrator)

**SKILL.md (Main file) <500 lines**

**Contains:**
- Phase detection (Backend vs Frontend vs Database)
- File type detection (`.ts` vs `.tsx` vs `.prisma`)
- Workflow routing (which workflow to load)
- Loading triggers for ALL reference files (explicit, not "if relevant")
- Non-negotiable rules (Critical constraints)
- Final verification gate

**Does NOT contain:**
- Cognitive profile content (loaded from ../../cognitive-profiles/)
- Workflow details (loaded from workflows/)
- Templates (loaded from templates/)
- TitleRun patterns (loaded from references/)

**Target: ~400 lines**

---

### Tier 2: On-Demand (Workflows + References)

**Loaded based on phase detection:**

**If Backend code detected** (`.ts` files in `/api/`):
```markdown
Load workflows/backend-review.md
Load ../../cognitive-profiles/owasp-security.md
Load ../../cognitive-profiles/google-sre-performance.md
Load references/titlerun-anti-patterns.md (backend section)
Load references/tech-stack.md (TypeScript/Express/Prisma)
```

**If Frontend code detected** (`.tsx` files in `/app/`):
```markdown
Load workflows/frontend-review.md
Load ../../cognitive-profiles/nielsen-ux-heuristics.md
Load ../../cognitive-profiles/google-sre-performance.md
Load references/titlerun-anti-patterns.md (frontend section)
Load references/tech-stack.md (React/TanStack Query)
```

**If Database schema detected** (`.prisma` files):
```markdown
Load workflows/database-review.md
Load ../../cognitive-profiles/google-sre-performance.md
Load references/tech-stack.md (Prisma specifics)
```

**Always loaded before output generation:**
```markdown
Load templates/review-report.md
Load templates/finding-template.md
```

---

### Tier 3: Verification (Quality Gate - Loaded LAST)

**Loaded right before delivery:**
```markdown
Load references/banned-phrases.md (contrarian frame verification)
```

**Why last:** Recency bias. AI pays most attention to what it processed most recently. Loading verification last = maximum impact.

---

## Explicit Loading Triggers (No Hedging)

### ✅ Good Triggers (Deterministic)

```markdown
**Load workflows/backend-review.md IF:**
- File path contains `/api/`
- OR file extension is `.ts` AND NOT `.tsx`

**Load ../../cognitive-profiles/owasp-security.md IF:**
- Backend workflow active
- OR file contains authentication logic

**Load references/titlerun-anti-patterns.md ALWAYS**
(Contains both backend and frontend sections)

**Load templates/review-report.md BEFORE generating output**
(Not "if needed" - ALWAYS)

**Load references/banned-phrases.md BEFORE delivery**
(Final verification gate - recency bias)
```

---

### ❌ Bad Triggers (Vague - Will Be Ignored)

```markdown
❌ "Load security profile if relevant"
❌ "Check anti-patterns when needed"
❌ "Use templates if helpful"
```

**These WILL be ignored under token pressure. Always use deterministic conditions.**

---

## Orchestrator Design (SKILL.md)

### Section 1: Trigger System (Layer 1)

```markdown
## Trigger System

**Activates for:**
- Git commits (via `git diff`)
- GitHub PR numbers (via `gh pr view`)
- Direct file paths (user provides files to review)

**Phrases:**
- "review this PR"
- "analyze commits since last review"
- "run code review"

**Does NOT activate for:**
- Non-code files only (README.md, docs)
- Binary files (images, videos)
- Config-only changes (unless production config)
```

---

### Section 2: Phase Detection (Routing Logic)

```markdown
## Phase Detection

**Step 1: Identify changed files**
Run: `git diff --name-only [since last review]`

**Step 2: Categorize files**
- Backend: Files in `/api/`, extension `.ts` (not `.tsx`)
- Frontend: Files in `/app/`, extension `.tsx`
- Database: Files with extension `.prisma`
- Config: `package.json`, `.env`, `railway.json`

**Step 3: Route to workflows**
If Backend files → Load workflows/backend-review.md
If Frontend files → Load workflows/frontend-review.md
If Database files → Load workflows/database-review.md
If Mixed → Load ALL applicable workflows

**Step 4: Count files**
If >500 files → REFUSE ("PR too large, split into batches")
If 0 files → EXIT ("No changes to review")
```

---

### Section 3: Workflow Execution (Progressive Loading)

```markdown
## Workflow Execution

**For each detected workflow type:**

1. **Load cognitive profiles** (Tier 2)
   - Backend → owasp-security.md + google-sre-performance.md
   - Frontend → nielsen-ux-heuristics.md + google-sre-performance.md
   - Database → google-sre-performance.md

2. **Load domain knowledge** (Tier 2)
   - references/titlerun-anti-patterns.md
   - references/tech-stack.md
   - references/production-incidents.md

3. **Execute workflow** (loaded workflow file contains process)

4. **Collect findings** (structured format from templates/)
```

---

### Section 4: Verification Gate (Tier 3 - LOADED LAST)

```markdown
## Verification Gate (Final Quality Check)

**Load references/banned-phrases.md**

**Check 1: Banned Phrase Detection**
Scan entire review for any of 75 banned phrases.
If found → FAIL, rewrite from scratch.

**Check 2: Specificity Verification**
For EACH finding, verify presence of:
- [ ] File path
- [ ] Line number
- [ ] Code snippet
- [ ] Quantified impact
- [ ] Concrete fix with code

If ANY finding lacks these 5 elements → FAIL, add specificity.

**Check 3: Quantification Verification**
For EACH impact statement, verify:
- [ ] Contains numbers
- [ ] References scale (users, queries, seconds, etc.)

If ANY impact isn't quantified → FAIL, add numbers.

**If ALL checks PASS:**
Load templates/summary-template.md
Generate final report
Deliver

**If ANY check FAILS:**
Retry with stronger framework application
Maximum 3 retries
If still failing → Flag for human review
```

---

### Section 5: Non-Negotiables (Critical Constraints)

```markdown
## Non-Negotiables

**ALWAYS (at start of file):**
1. Refuse to review if CI failing
2. Refuse to review if >500 files
3. Refuse to review if merge conflicts exist
4. Exit if no code changes (non-code only)

**ALWAYS (at end of file - recency bias):**
5. Every finding MUST have file + line + code + impact + fix
6. Every impact MUST be quantified with numbers
7. NO banned phrases allowed (auto-fail)
8. Score MUST have justification (explain why)
```

---

## File Size Targets

| File | Target Size | Why |
|------|------------|-----|
| SKILL.md (orchestrator) | <500 lines (<25KB) | Routing only, loads everything else on-demand |
| workflows/*.md | <300 lines each | Specific process for that workflow type |
| references/*.md | <300 lines each | Domain knowledge, not process |
| templates/*.md | <100 lines each | Output format only |
| Cognitive profiles (shared) | Already created | In ../../cognitive-profiles/ |

**Total skill (all files):** ~2000 lines (~100KB)

**Per-phase load:** ~400-600 lines (orchestrator + 1-2 workflows + templates)

**Token efficiency:** 60-70% reduction vs monolithic (if all content in one file = ~150KB)

---

## Workflow Files Design

### workflows/backend-review.md

```markdown
# Backend Code Review Workflow

**Loaded when:** Backend files detected (`.ts` in `/api/`)

**Cognitive profiles to apply:**
- Load ../../cognitive-profiles/owasp-security.md
- Load ../../cognitive-profiles/google-sre-performance.md

**Review sequence:**

1. **Security Review (OWASP Framework)**
   [Apply OWASP Top 10 to each file]
   [Check for SQL injection, auth bypass, data exposure]
   
2. **Performance Review (Google SRE Framework)**
   [Check for N+1 queries, missing indexes, algorithmic complexity]
   
3. **TitleRun-Specific Anti-Patterns**
   [Load references/titlerun-anti-patterns.md (backend section)]
   [Check for nested response envelope pattern]
   
4. **Production Incident Check**
   [Load references/production-incidents.md]
   [Flag patterns that caused past outages]

**Output:** Findings list (using templates/finding-template.md)
```

---

### workflows/frontend-review.md

```markdown
# Frontend Code Review Workflow

**Loaded when:** Frontend files detected (`.tsx` in `/app/`)

**Cognitive profiles to apply:**
- Load ../../cognitive-profiles/nielsen-ux-heuristics.md
- Load ../../cognitive-profiles/google-sre-performance.md

**Review sequence:**

1. **UX Review (Nielsen Heuristics)**
   [Check for loading states, error states, user feedback]
   
2. **Performance Review (React-specific)**
   [Check for useMemo usage, unnecessary re-renders]
   
3. **TitleRun-Specific Anti-Patterns**
   [Check for .find() without useMemo]
   [Check for mobile-specific patterns]

**Output:** Findings list (using templates/finding-template.md)
```

---

### workflows/database-review.md

```markdown
# Database Schema Review Workflow

**Loaded when:** Prisma schema files detected (`.prisma`)

**Cognitive profiles to apply:**
- Load ../../cognitive-profiles/google-sre-performance.md (only)

**Review sequence:**

1. **Performance Review (Database-specific)**
   [Check for missing indexes on foreign keys]
   [Check for unbounded queries]
   
2. **Migration Safety Check**
   [Flag destructive migrations (DROP, DELETE)]
   [Verify rollback strategy exists]

**Output:** Findings list (using templates/finding-template.md)
```

---

## Template Files Design

### templates/review-report.md

```markdown
# Code Review Report Template

## Code Review: [PR/Commit Description]

**Score:** X/100 [Below/At/Above target 95]

**Files reviewed:** X files, Y lines changed

**Breakdown:**
- Backend: X files
- Frontend: Y files
- Database: Z files

---

### CRITICAL ISSUES (Count) — Block Merge
[List critical findings]

### HIGH ISSUES (Count) — Fix Before Deploy
[List high findings]

### MEDIUM ISSUES (Count) — Fix This Sprint
[List medium findings]

### LOW ISSUES (Count) — Backlog
[List low findings]

---

### Summary
[Score justification]
[Next steps]
[Estimated fix time]
```

---

### templates/finding-template.md

```markdown
# Finding Template

## [SEVERITY]: [One-line issue description]

**File:** `path/to/file.ts`
**Line:** XX or XX-YY

**Issue:**
[Code snippet showing the problem]

**Impact:**
[Quantified impact: "At X scale, causes Y problem"]

**Fix:**
[Code snippet showing the solution]

**Test:**
[Test case to verify fix]

**Reference:** [Cognitive profile used] - [Specific section]
```

---

## Deliverable: Architecture Diagram + File Structure

**Architecture chosen:** Full Modular

**File structure:** 
- Orchestrator (SKILL.md)
- 3 workflows (backend, frontend, database)
- 4 references (anti-patterns, incidents, banned-phrases, tech-stack)
- 3 templates (report, finding, summary)
- Shared cognitive profiles (in ../../cognitive-profiles/)

**Progressive disclosure:**
- Tier 1: Orchestrator (<500 lines, always loaded)
- Tier 2: Workflows + References (loaded based on file type detection)
- Tier 3: Verification (loaded last for recency bias)

**Loading triggers:** All explicit, deterministic (no "if relevant")

**Phase 4 complete:** ✅

**Next:** Phase 5 - Writing Content

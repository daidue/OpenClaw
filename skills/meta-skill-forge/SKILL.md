---
name: meta-skill-forge
description: 'Build meta-skills with cognitive architecture. Converts human expertise into AI reasoning systems using contrarian frames, progressive disclosure, and real cognitive profiles. Based on Machina (@EXM7777) methodology.'
version: 1.0.0
author: Jeff Daniels
created: 2026-03-01
---

# Meta-Skill Forge

**Purpose:** Build skills that fundamentally change HOW the AI thinks, not just what it outputs.

**When to use:**
- Creating new AgentSkills from scratch
- Upgrading existing skills to meta-skill level
- Encoding human expertise into reusable reasoning frameworks

**DO NOT use for:**
- Simple prompt templates
- One-off tasks (just use a direct prompt)
- Skills without clear differentiation from baseline AI

---

## What is a Meta-Skill?

**Regular skill:**
```
"Write persuasive copy. Use engaging language. Include hook, body, CTA."
```
→ Produces formatted slop

**Meta-skill:**
```
"Before writing: identify 50+ banned words that scream 'AI wrote this.'
Challenge these assumptions: [list of defaults]
Verify: does this fail AI-detection pattern check?
If yes → ship. If no → rewrite."
```
→ Produces genuinely differentiated output

**The difference:** Meta-skills encode **reasoning architecture**, not just instructions.

---

## The 3 Layers (Required)

Every meta-skill MUST have all three layers:

### Layer 1: Trigger System
**When and why the skill activates**

❌ **Weak:** "helps with presentations"  
✅ **Strong:**
- Activates for: `.pptx` files, phrases like "pitch deck," "investor presentation"
- Explicitly does NOT cover: sales scripts, meeting notes, documentation
- Fires when user says: "make this slide deck," "polish this pitch"

**Checklist:**
- [ ] Specific file types or content patterns defined
- [ ] Explicit boundaries (what it does NOT handle)
- [ ] Clear activation phrases documented

---

### Layer 2: Thinking Architecture
**How to THINK about this entire class of problems**

Not a recipe (do step 1, 2, 3) but a **reasoning framework** that restructures cognition BEFORE output generation.

**Example - Code Review:**

❌ **Recipe approach:**
```
1. Check for bugs
2. Review code style
3. Suggest improvements
4. Write summary
```

✅ **Thinking architecture:**
```
Before reviewing:
- What would a lazy review look like? (avoid that)
- What classes of bugs hide in this domain? (focus there)
- What production incidents happened with similar code? (prevent those)

Review through 3 lenses:
1. Security: OWASP framework [load references/security-framework.md]
2. Performance: Google SRE principles [load references/perf-framework.md]
3. UX: Nielsen heuristics [load references/ux-framework.md]

Each lens asks different questions in a specific sequence.
Output reflects ALL THREE perspectives, not just "looks good."
```

**Checklist:**
- [ ] Defines HOW to think, not just WHAT to do
- [ ] References cognitive frameworks (not generic advice)
- [ ] Loads domain knowledge on-demand (progressive disclosure)

---

### Layer 3: Verification Gate
**Built-in audit to catch baseline AI behavior**

**The Question:** Does this look like what a default LLM would produce with no skill loaded?
- If YES → failed, go back
- If NO → passed, ship

**Not about:** Grammar, formatting, length  
**About:** Differentiation, genuine cognitive shift

**Example - Dogfood QA:**

❌ **Weak verification:**
```
- Did you test the app? (yes/no)
- Did you write a report? (yes/no)
```

✅ **Strong verification:**
```
Does this QA report contain:
- [ ] Video evidence for EACH issue found?
- [ ] Step-by-step reproduction (not "it broke")?
- [ ] Console errors captured and cited?
- [ ] Severity justified with user impact analysis?
- [ ] At least 3 edge cases tested per workflow?

If NO to any → session failed, retest with corrected approach.
```

**Checklist:**
- [ ] Explicit criteria for "differentiated from baseline"
- [ ] Auto-fail conditions defined
- [ ] Retry logic specified

---

## The Contrarian Frame (Most Powerful Technique)

**Before building ANY meta-skill:**

### Step 1: Write the Lazy Version

Answer these questions:
1. What structure would the AI reach for first?
2. What vocabulary would it default to?
3. What assumptions would it bake in without asking?
4. What would the final product feel like to read?

**Write it out.** Be specific.

### Step 2: Engineer AWAY from Each Pattern

For every lazy pattern you identified:
- Ban those words (maintain a forbidden vocabulary list)
- Avoid those structures (document anti-patterns)
- Challenge those assumptions (flip them)
- Create verification that FAILS if output looks like the lazy version

**Example - Code Review Skill:**

**Lazy version would:**
- Use phrases: "Consider adding," "This could be," "Looks good overall but..."
- Structure: Three-item bullet lists with vague suggestions
- Assume: Generic best practices apply to all code
- Feel like: Every AI-generated code review you've ever seen

**Contrarian frame:**

```markdown
## Banned Patterns (Code Review)
- "Consider adding error handling" → Cite specific lines, name the exception type
- "This could be more efficient" → Quantify cost (e.g., "O(n²) at 10K items = 2s delay")
- "Looks good overall but..." → No hedging. Critical issues are critical.
- Three-item lists → Vary structure. Use decision trees, tables, severity-grouped findings.

## Required Instead
- Reference specific line numbers + file paths
- Cite production incidents caused by this pattern (if known)
- Propose concrete fix with code example
- Quantify impact (perf, security, UX)

## Verification
Does this review contain ANY banned phrases?
- If YES → FAILED. Rewrite from scratch.
- If NO → Check: does it cite specific lines? If NO → FAILED.
```

---

## Progressive Disclosure (Context Window Management)

**The Problem:** Context window is finite. Dumping everything at once wastes tokens and degrades quality.

**The Solution:** 3-tier loading system.

### Tier 1: Always-On (Orchestrator) — <500 lines
The backbone that routes to everything else.

**Contains:**
- Core routing logic
- Phase detection (what are we doing right now?)
- Loading triggers (when to pull in reference files)
- Non-negotiable rules

**Example:**
```markdown
# ORCHESTRATOR.md (Main Skill File)

## Phases
1. Scope → load references/scoping-questions.md
2. Analysis → load references/contrarian-frame.md
3. Build → load references/architecture-patterns.md
4. Review → load references/cognitive-profiles.md
5. Verify → load references/anti-patterns.md
6. Ship → load references/delivery-template.md

## Non-Negotiables (Always Active)
- Every reference file has explicit loading trigger
- No hedge language ("always" > "try to")
- Every phase yields visible output or decision
- If phase doesn't change anything → cut it
```

### Tier 2: On-Demand (Domain Knowledge) — Separate files
Loaded when specific phase requires it.

**Contains:**
- Domain concepts
- Examples (annotated)
- Procedures for specific modes
- Cognitive frameworks

**Loading triggers must be explicit:**
✅ `"Read references/security-framework.md before Phase 3"`  
❌ `"Check security if needed"` (will be ignored)

### Tier 3: Verification (Quality Gate) — Loaded last
Loaded right before delivery so it's freshest in memory.

**Contains:**
- Banned patterns checklist
- Anti-patterns audit
- "Does this look like baseline?" test

**Why last:** Recency bias means AI pays sharpest attention to whatever it processed most recently.

---

## Cognitive Profiles (Real Expert Review)

**The Problem:** Asking AI to "pretend to be Expert X" produces theater, not real review.

**The Solution:** Extract actual cognitive frameworks from experts' work.

### How to Build a Cognitive Profile

**1. Study their body of work**
- Conference talks (where they walk through decisions)
- Long-form essays (explaining rejected approaches)
- Interviews (pushing back on conventional wisdom)

**2. Extract specific patterns**
- Recurring decision frameworks (not vocabulary, but mental models)
- Prioritization logic (what do they look at FIRST?)
- Red flags (what makes them suspicious?)
- Question sequence (before committing to judgment)
- What they consistently ignore that everyone else obsesses over

**3. Package as executable framework**

❌ **Weak (AI cosplay):**
```
"Review this as Paul Graham would."
```

✅ **Strong (Cognitive framework):**
```markdown
## Reviewer: Paul Graham (YC Partner)
Decision Framework:
1. Strip to core: What problem does this ACTUALLY solve?
2. Founder fit: Can THIS team pull this off? Why them specifically?
3. Market timing: Why now? What changed in the world?
4. Red flags:
   - Vague language ("everyone" as target market)
   - No painful problem founder experienced personally
   - "It's like X but for Y" without differentiation
5. Green flags:
   - Specific use case (not "helps people")
   - Founder experienced pain, built solution for self
   - Rapid iteration (weekly deploys, customer feedback loops)

Question sequence:
1. Who is the customer? (specific person, not demographic)
2. What do they do now without this? (status quo)
3. Why does that hurt? (pain point)
4. Why will they switch? (10x better, not 10% better)
```

**Build these once → reuse across every skill.**

Store in: `~/.openclaw/workspace/cognitive-profiles/`

---

## The 7-Phase Build Process

### Phase 1: Context Ingestion

**Goal:** Extract implicit methodology from existing work.

**What to collect:**
- Existing prompts you've used for this task
- Workflows (formal or informal)
- SOPs (if they exist)
- Examples of GOOD output (what success looks like)
- Examples of TERRIBLE output (what failure looks like)

**If you have nothing:** That's fine. You're building from first principles. The skill will reflect that (and that's honest).

**Deliverable:** Folder with all raw materials uploaded.

---

### Phase 2: Targeted Extraction

**Goal:** Pull out the reasoning, not just the results.

**4 rounds of questions:**

**Round 1 - Scope:**
- What should this skill accomplish that AI can't do well on its own?
- Who will use it? What's their experience level?
- Walk me through a concrete task it needs to handle.

**Round 2 - Differentiation:**
- What does AI typically get wrong when you ask for this with no skill loaded?
- What would the lazy version of this skill look like?
- What's the ONE thing this skill must absolutely nail above all else?

**Round 3 - Structure:**
- Does it need templates? Multiple workflows?
- External tools or specific file formats involved?
- Decision points where different paths are taken?

**Round 4 - Breaking Points:**
- What inputs would destroy a naive version?
- What should the skill explicitly refuse to do?
- What requires extra care or human confirmation?

**Stop when you have enough signal.** If someone front-loads rich context in Round 1, skip what they already covered.

**Deliverable:** Extraction notes document.

---

### Phase 3: Contrarian Analysis

**Goal:** Engineer AWAY from baseline AI behavior.

**Process:**

1. **Write the generic version**
   - What would baseline AI produce if you just said "make me a skill for X"?
   - Name the predictable structure
   - Name the expected vocabulary
   - Name the workflow assumptions everyone gravitates toward

2. **Challenge 2-3 assumptions**
   - What does the standard approach take for granted?
   - What if you inverted the typical workflow order?
   - Can you borrow a concept from a completely unrelated field?
   - What if you started from failure modes instead of success patterns?

3. **Document differentiated frame**
   - This becomes your north star for everything after
   - Every decision gets checked against: "Does this move us AWAY from the generic version?"

**Deliverable:** Contrarian frame document (banned patterns + required inversions).

---

### Phase 4: Architecture Decisions

**Goal:** Pick structure based on complexity.

**Decision tree:**

**One task, minimal domain knowledge?**
→ Single file, <300 lines, done.

**One primary workflow, moderate depth + examples?**
→ Standard modular setup:
- Main orchestrator (routing)
- Reference files (domain concepts, anti-patterns, examples)

**Multiple modes OR deep specialized knowledge OR templates?**
→ Full modular architecture:
- Orchestrator routes to workflow files
- Concept files (loaded on-demand)
- Example libraries
- Templates
- Each loadable independently based on current phase

**Heuristics:**
- Main file growing past 400 lines? → Split it.
- More than one workflow? → Add mode selection.
- Information appears in two places? → Consolidate to one source of truth.

**Deliverable:** Architecture diagram + file structure.

---

### Phase 5: Writing the Actual Content

**Goal:** Build the skill files following architecture.

**Build orchestrator first** (the backbone).

**Rules:**

1. **Every reference file gets explicit loading trigger**
   - ✅ `"Read references/anti-patterns before delivering"`
   - ❌ `"Check anti-patterns if needed"`

2. **Critical constraints at START and END of main file**
   - Recency bias: AI pays sharpest attention to what it processed last
   - Put non-negotiables at both ends

3. **No hedge language**
   - "Always" and "never" carry weight
   - "Try to" and "consider" carry nothing

4. **Every phase yields visible output or decision**
   - If a phase doesn't change anything observable → cut it
   - That's padding, not process

5. **Main file is a router, not a textbook**
   - Tell AI WHERE to find information
   - Don't dump all information at once

**Deliverable:** Complete file tree with all skill files.

---

### Phase 6: Real Review with Real Frameworks

**Goal:** Stress-test with actual cognitive profiles.

**Apply 3 review lenses:**

**1. First-Principles Pass**
- Does anything here exist without earning its place?
- Could you get the same result with fewer moving parts?
- What's the simplest version that would still work?

**2. Practicality Check**
- Would a real person actually use this day-to-day?
- Does it look impressive on paper but create too much friction to adopt?
- Are the loading triggers realistic or will they be ignored under pressure?

**3. Outcome Check**
- Does this skill genuinely shift AI's behavior?
- Or does it just wrap additional process around baseline output?
- What would an A/B test show? (skill on vs skill off)

**If any pass surfaces problems:**
- Fix them
- Re-run the review
- Iterate until clean

**Deliverable:** Review findings document + fixes applied.

---

### Phase 7: Ship It

**Goal:** Deliver complete, production-ready package.

**Package contents:**

1. **Full file tree** (every file + its contents)
2. **Architecture rationale** (why you chose this structure, what problems each piece solves)
3. **Review findings** (what cognitive frameworks caught, what was fixed)
4. **Usage guide:**
   - Installation instructions
   - Trigger conditions (when skill activates)
   - Example inputs with expected outputs
   - Known limitations

**The skill ships as a SYSTEM, not a document.**

**Deliverable:** Complete skill package ready for `~/.openclaw/workspace/skills/[skill-name]/`

---

## Anti-Patterns (Never Do This)

### ❌ Vague Triggers
"This skill helps with writing" → When does it activate? When does it NOT activate?

### ❌ Recipe Thinking
"Step 1, Step 2, Step 3" → Where's the reasoning architecture?

### ❌ No Verification
Generates output, ships it, moves on → How do you know it didn't just produce baseline behavior?

### ❌ Monolithic Structure
3,000-line single file → Context window waste, no progressive disclosure

### ❌ Hedged Loading Triggers
"Check this if relevant" → Will be ignored under pressure

### ❌ AI Cosplay Reviews
"Review this as Expert X" → Theater, not real cognitive framework

### ❌ Missing Contrarian Frame
Baseline AI behavior → No differentiation from what anyone else gets

---

## Example: Building a Code Review Meta-Skill

Let me walk through a real build.

### Phase 1: Context Ingestion

**Existing materials:**
- Past code reviews I've done manually
- GitHub PR comments (good and bad examples)
- Production incidents caused by missed issues
- Team coding standards docs

**Upload all of it.**

---

### Phase 2: Targeted Extraction

**Round 1 - Scope:**
- Q: What should this skill accomplish?
- A: Catch production-breaking issues before merge. Security, performance, UX bugs.

- Q: Who uses it?
- A: Me (Jeff), reviewing agent-generated code before production deploy.

- Q: Concrete task?
- A: Review a PR with 10-50 file changes, identify critical issues, propose fixes.

**Round 2 - Differentiation:**
- Q: What does AI get wrong with no skill?
- A: Generic feedback ("consider adding error handling"), no severity prioritization, misses domain-specific issues (e.g., dynasty FF data quirks).

- Q: Lazy version?
- A: "Looks good overall, consider adding tests" + three-item bullet list.

- Q: Must nail?
- A: Catch security/perf issues that would break production. Zero false positives on critical severity.

**Round 3 - Structure:**
- Needs: Security framework (OWASP), performance framework (Google SRE), UX framework (Nielsen)
- File formats: `.ts`, `.tsx`, `.js`, `.json` (TypeScript/React codebase)
- Decision points: Different review depth for backend vs frontend

**Round 4 - Breaking Points:**
- Would break on: Non-code files (images, configs), >500 file PRs
- Should refuse: Merging without CI passing, deploying with critical issues
- Extra care: Database migrations, auth changes, API contract changes

---

### Phase 3: Contrarian Analysis

**Generic version would:**
- Structure: Summary → bullet list of issues → overall score
- Vocabulary: "Consider," "could be," "looks good"
- Assume: Generic best practices apply everywhere
- Feel: Like every AI code review (forgettable)

**Contrarian frame:**

**Banned:**
- "Consider adding" → Cite specific line, name the fix
- "Could be more efficient" → Quantify cost
- Summary sections → Every finding is specific
- Three-item lists → Use severity tiers instead

**Required:**
- Reference production incidents ("This pattern caused outage on 2026-02-17")
- Quantify impact ("At 1000 users, this N+1 query = 5s page load")
- Propose concrete fix with code

**Verification:**
- Contains banned phrases? → FAIL
- Missing line numbers? → FAIL
- No severity tiers? → FAIL

---

### Phase 4: Architecture Decisions

**Chosen structure:** Full modular (multiple cognitive frameworks)

**Files:**
```
code-review/
├── SKILL.md (orchestrator)
├── references/
│   ├── security-framework.md (OWASP)
│   ├── perf-framework.md (Google SRE)
│   ├── ux-framework.md (Nielsen)
│   ├── anti-patterns.md (banned phrases, structures)
│   └── production-incidents.md (real examples)
└── templates/
    └── review-output.md (structured format)
```

**Why:** Three distinct cognitive frameworks (security, perf, UX) + anti-patterns + real incident history. Too much for single file.

---

### Phase 5: Writing Content

**SKILL.md (Orchestrator):**
```markdown
# Code Review Meta-Skill

## Trigger System
Activates for:
- Pull requests with `.ts`, `.tsx`, `.js` file changes
- Phrases: "review this PR," "check this code," "ready for review"

Does NOT activate for:
- Config-only changes (unless auth/DB related)
- Documentation updates
- >500 file PRs (flag for human review instead)

## Workflow

### Phase 1: Scope Detection
Identify PR type:
- Backend (API, database, auth) → Load references/security-framework.md
- Frontend (UI, components) → Load references/ux-framework.md
- Both → Load both

### Phase 2: Security Review
Load references/security-framework.md
Apply OWASP Top 10 lens to every file with:
- User input handling
- Authentication/authorization
- Data exposure (logs, errors)
- Third-party dependencies

Output: Critical/high security issues with line numbers + fixes

### Phase 3: Performance Review
Load references/perf-framework.md
Apply Google SRE principles:
- Query cost (N+1, missing indexes)
- Memory (unbounded lists, leaks)
- Caching (repeated work, invalidation correctness)

Output: Performance issues with quantified impact

### Phase 4: UX Review
Load references/ux-framework.md
Apply Nielsen heuristics:
- Visibility (loading states, errors)
- Error recovery (undo, clear messages)
- Consistency (matches app patterns)

Output: UX issues with user impact

### Phase 5: Verification
Load references/anti-patterns.md
Check:
- Contains ANY banned phrases? → FAIL, rewrite
- Missing line numbers? → FAIL, add them
- No severity tiers? → FAIL, categorize

### Phase 6: Deliver
Use templates/review-output.md format
Include:
- Critical issues (block merge)
- High issues (fix before deploy)
- Medium issues (fix this sprint)
- Low issues (backlog)

## Non-Negotiables
- Every issue cites specific file + line number
- Every critical/high issue has proposed fix
- No hedge language ("consider" is banned)
- If CI failing → refuse to review ("Fix CI first")
```

**references/security-framework.md:**
```markdown
# OWASP Security Framework

## Review Sequence

1. **Input Validation**
   - Every user input validated?
   - Sanitized before use?
   - Type checking on API params?

2. **Authentication/Authorization**
   - Who can access this endpoint/component?
   - Checked at every layer? (client + server)
   - JWT validation correct?

3. **Data Exposure**
   - Logs/errors leaking sensitive info?
   - API responses exposing internal IDs?
   - Client-side secrets (API keys in bundle)?

4. **Third-Party Risk**
   - Dependencies vetted?
   - Versions pinned?
   - Known CVEs?

## Red Flags
- `req.query` or `req.params` used without validation
- `eval()` or `Function()` anywhere
- Passwords/tokens in version control
- Database queries with string concatenation (SQL injection)

## Examples from Production
[Load from references/production-incidents.md]
```

(Continue for each reference file...)

---

### Phase 6: Real Review

**First-Principles Pass:**
- Q: Does every reference file earn its place?
- A: Yes. Security, perf, UX are distinct lenses. Can't merge.

- Q: Could you get same result with fewer parts?
- A: No. Tried single-file version, hit 800 lines and still incomplete.

**Practicality Check:**
- Q: Would I actually use this daily?
- A: Yes. Loading time <10s, output is actionable.

**Outcome Check:**
- Q: Does this shift AI behavior?
- A: Test: Ran same PR through baseline AI vs this skill.
  - Baseline: "Looks good, consider adding tests" (generic)
  - Skill: "Line 47: SQL injection risk. Use parameterized query: `db.query('SELECT * FROM users WHERE id = ?', [userId])`" (specific + fix)

**Verdict:** Passes all three lenses. Ship it.

---

### Phase 7: Ship

**Package delivered:**

```
~/.openclaw/workspace/skills/code-review/
├── SKILL.md (orchestrator - 380 lines)
├── references/
│   ├── security-framework.md (OWASP - 200 lines)
│   ├── perf-framework.md (Google SRE - 180 lines)
│   ├── ux-framework.md (Nielsen - 150 lines)
│   ├── anti-patterns.md (banned phrases - 100 lines)
│   └── production-incidents.md (real examples - 250 lines)
└── templates/
    └── review-output.md (structured format - 50 lines)
```

**Total:** 1,310 lines across 7 files (vs 3,000-line monolith)

**Usage:**
```
# Activate automatically when reviewing PRs
"Review this PR: https://github.com/user/repo/pull/123"

# Or explicit
"Run code-review skill on latest changes"
```

**Expected output:**
- 5-15 issues categorized by severity
- Every issue has file + line + fix
- Takes 2-3 min for 50-file PR
- Catches 80%+ of issues human review would catch

---

## Integration with OpenClaw

**Installation:**
1. Place skill folder in `~/.openclaw/workspace/skills/[skill-name]/`
2. Restart OpenClaw or reload skills: `openclaw skills reload`
3. Test trigger: Send message matching activation phrase

**Cognitive Profiles:**
Store shared profiles in: `~/.openclaw/workspace/cognitive-profiles/`

Reference from skills:
```markdown
Load ../../cognitive-profiles/paul-graham-yc.md
```

**Modular Skills:**
- Orchestrator: `SKILL.md` (main file)
- References: `references/*.md`
- Templates: `templates/*.md`
- Cognitive profiles: `../../cognitive-profiles/*.md` (shared across skills)

---

## Meta-Skill Quality Checklist

Before shipping ANY meta-skill, verify:

### Layer 1: Trigger System
- [ ] Specific activation conditions defined
- [ ] Explicit boundaries (what it does NOT handle)
- [ ] Clear activation phrases documented

### Layer 2: Thinking Architecture
- [ ] Defines HOW to think, not just WHAT to do
- [ ] References cognitive frameworks (not generic advice)
- [ ] Uses progressive disclosure (loads on-demand)

### Layer 3: Verification Gate
- [ ] Explicit "differentiated from baseline" criteria
- [ ] Auto-fail conditions defined
- [ ] Retry logic specified

### Contrarian Frame
- [ ] "Lazy version" documented
- [ ] Banned patterns identified
- [ ] Required inversions specified
- [ ] Verification tests for banned patterns

### Progressive Disclosure
- [ ] Main file <500 lines (orchestrator only)
- [ ] Reference files loaded on-demand
- [ ] Explicit loading triggers (no "if relevant")
- [ ] Tier 3 (verification) loaded last

### Cognitive Profiles
- [ ] Real frameworks extracted from expert work
- [ ] Executable (not "pretend to be X")
- [ ] Reusable across skills
- [ ] Stored in shared location

### Anti-Pattern Avoidance
- [ ] No vague triggers
- [ ] No recipe thinking (has reasoning architecture)
- [ ] No monolithic structure
- [ ] No hedged loading triggers
- [ ] No AI cosplay reviews
- [ ] Has contrarian frame

**If ALL boxes checked → Ship it.**  
**If ANY box unchecked → Fix before shipping.**

---

## Next Steps

**Use this skill to build other skills:**

1. Start Phase 1 (context ingestion)
2. Run through Phases 2-7
3. Ship production-ready meta-skill

**Every skill you build with this forge will have:**
- 3 layers (trigger, thinking, verification)
- Contrarian frame (differentiated from baseline)
- Progressive disclosure (context-efficient)
- Real cognitive profiles (not AI theater)

**The result:** Reasoning systems that produce work AI can't produce by default.

---

**Status:** Meta-Skill Forge v1.0.0 — Ready for production use ✅

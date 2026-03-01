# Anti-Patterns — What NOT to Do

**Each anti-pattern shown with BAD and GOOD examples side-by-side.**

Learn to recognize these patterns in your own work by seeing what they look like in practice.

---

## Anti-Pattern #1: Vague Triggers

### ❌ BAD (Vague)

```markdown
## Trigger System
This skill helps with writing.
```

**Why it's bad:**
- When does it activate? On every message mentioning "write"?
- What kind of writing? Code? Essays? Emails? Shopping lists?
- User can't tell when skill will fire
- AI can't tell when to engage

**Result:** Skill fires randomly or never fires when needed.

---

### ✅ GOOD (Specific)

```markdown
## Trigger System

**Activates for:**
- File types: `.md`, `.txt` (markdown/text files)
- Phrases: "write essay", "draft article", "compose blog post"
- Content length: >500 words (not short messages)

**Does NOT activate for:**
- Code comments or commit messages
- Emails or chat messages
- Shopping lists or todo items
- Documentation (use docs skill instead)

**Fires when user says:**
- "Write essay on X"
- "Draft article about Y"
- "Compose blog post explaining Z"

**Explicit boundaries prevent conflicts with other skills.**
```

**Why it's good:**
- Clear activation conditions (file types, phrases, length)
- Explicit boundaries (what it doesn't handle)
- User knows exactly when it fires
- AI can confidently engage or defer

---

## Anti-Pattern #2: Recipe Thinking

### ❌ BAD (Recipe Steps)

```markdown
## Workflow

1. Read the input
2. Analyze it
3. Generate output
4. Deliver result
```

**Why it's bad:**
- These are steps, not thinking
- Doesn't change HOW AI reasons about the problem
- Could apply to literally anything (no differentiation)
- Produces baseline AI behavior with formatting

**Result:** Slightly better formatted slop, still slop.

---

### ✅ GOOD (Thinking Architecture)

```markdown
## Workflow

### Before analyzing (cognitive preparation):
**Load the right frameworks:**
- If code review → Load references/owasp-security.md, references/perf-framework.md
- If design review → Load references/nielsen-ux.md
- If architecture review → Load references/first-principles.md

**Challenge assumptions:**
- What would a naive approach miss? (focus there)
- What production incidents happened with this pattern? (avoid those)
- What class of problem is this? (apply domain-specific lens)

### Analysis framework (not just "analyze"):
1. **Strip to first principles** (loaded framework guides this)
   - What's the actual problem being solved?
   - What constraints are real vs assumed?
   - What's the simplest solution that could work?

2. **Apply contrarian lens**
   - What would baseline AI suggest?
   - How can we invert that?
   - What non-obvious insight exists?

3. **Quantify impact** (never vague)
   - Not "could be better" but "saves 2s per request"
   - Not "might have issues" but "causes OOM at 1000 users"
   - Not "consider refactoring" but "reduces complexity from O(n²) to O(n log n)"

### Output must demonstrate:
- [ ] Non-obvious insight (not what baseline would suggest)
- [ ] Quantified impact (numbers, not adjectives)
- [ ] Specific recommendations (with code examples, not descriptions)

**Verification:** If output looks like what baseline AI would produce → FAILED, retry with deeper framework application.
```

**Why it's good:**
- Changes reasoning process, not just output format
- Loads domain knowledge on-demand (progressive disclosure)
- Quantifies everything (no vague suggestions)
- Verifies differentiation from baseline

---

## Anti-Pattern #3: No Verification Gate

### ❌ BAD (No Quality Check)

```markdown
## Workflow

1. Generate output
2. Deliver
```

**Why it's bad:**
- No check if output is differentiated from baseline
- Baseline AI behavior slips through
- User gets "better formatted mediocrity"
- Skill provides no real value over no-skill

**Result:** Skill exists but doesn't actually shift quality.

---

### ✅ GOOD (Built-in Quality Gate)

```markdown
## Verification Gate (Loaded LAST - Tier 3)

### Before delivering, verify ALL criteria:

**Differentiation check:**
- [ ] Does this contain ANY banned phrases from references/anti-patterns.md?
      If YES → FAILED, rewrite from scratch
- [ ] Does this look like what baseline AI would produce?
      If YES → FAILED, rewrite with stronger framework application
- [ ] Does this demonstrate non-obvious insight?
      If NO → FAILED, apply contrarian lens

**Quality check:**
- [ ] Are all recommendations specific? (file + line number)
      If NO → FAILED, add specificity
- [ ] Are impacts quantified? (numbers, not adjectives)
      If NO → FAILED, quantify everything
- [ ] Are fixes provided with code examples?
      If NO → FAILED, add concrete examples

**If ANY check fails:**
1. Load stronger cognitive framework
2. Rewrite with deeper analysis
3. Re-run verification
4. Maximum 3 retries, then flag for human review

**Verification must be loaded LAST** (recency bias - AI pays most attention to what it processed most recently)
```

**Why it's good:**
- Explicit criteria for quality
- Auto-fail on banned patterns
- Retry logic with escalation
- Loaded last for maximum impact (recency bias)

---

## Anti-Pattern #4: Monolithic Structure

### ❌ BAD (Everything in One File)

```markdown
# Skill Name (3,000 lines)

## Trigger System
[500 lines of trigger logic]

## Domain Concepts
[800 lines of domain knowledge]

## Examples
[600 lines of examples]

## Anti-Patterns
[400 lines of what not to do]

## Templates
[300 lines of output formats]

## Workflow
[400 lines of process]
```

**Why it's bad:**
- All 3,000 lines loaded on EVERY invocation
- Wastes context window (user only needs 300 lines for current phase)
- Context pollution (unrelated info interferes)
- Slow loading (<10s target violated)
- Poor token efficiency (70-80% waste)

**Result:** At scale, costs 3-5x more tokens than necessary.

---

### ✅ GOOD (Progressive Disclosure)

```markdown
# Skill Name (Orchestrator - 500 lines)

## Phase Detection
Current phase: _____ (identified from user input)

## Loading Logic (Tier 2 - On-Demand)

**If Phase 1 (Scoping):**
- Load references/domain-concepts.md (800 lines)
- Load references/examples.md (600 lines)
- Do NOT load templates yet (not needed)

**If Phase 2 (Analysis):**
- Load references/domain-concepts.md (800 lines)
- Do NOT load examples or templates (not needed)

**If Phase 3 (Generation):**
- Load references/templates.md (300 lines)
- Do NOT load domain concepts (already internalized)

**If Phase 4 (Verification):**
- Load references/anti-patterns.md (400 lines)
- Do NOT load anything else

## Verification Gate (Tier 3 - Always Last)
[Loaded in final phase only]

---

**File structure:**
```
skill-name/
├── SKILL.md (orchestrator - 500 lines)
└── references/
    ├── domain-concepts.md (800 lines)
    ├── examples.md (600 lines)
    ├── anti-patterns.md (400 lines)
    └── templates.md (300 lines)
```

**Token usage:**
- Phase 1: 500 (orchestrator) + 800 (concepts) + 600 (examples) = 1,900 lines
- Phase 2: 500 + 800 = 1,300 lines
- Phase 3: 500 + 300 = 800 lines
- Phase 4: 500 + 400 = 900 lines

**Average: 1,225 lines vs 3,000 lines (60% reduction)**
```

**Why it's good:**
- Loads only what's needed for current phase
- 60-80% token reduction
- Faster loading (<3s per phase)
- Better focus (less context pollution)
- Scales efficiently

---

## Anti-Pattern #5: Hedged Loading Triggers

### ❌ BAD (Vague Triggers)

```markdown
## Reference Files

- `references/security-patterns.md` — Check if relevant
- `references/performance-tips.md` — Load when needed
- `references/examples.md` — Review if helpful
```

**Why it's bad:**
- "If relevant" = AI decides (unreliable)
- "When needed" = vague condition (ignored under pressure)
- "If helpful" = subjective (skipped)
- Under token pressure, vague triggers get ignored

**Result:** Reference files are never loaded, skill doesn't work.

---

### ✅ GOOD (Explicit Triggers)

```markdown
## Reference Files (Explicit Loading)

**ALWAYS load before Phase 1:**
- `references/trigger-system.md`

**Load before Phase 3 (Code Review) if file extension matches `.ts`, `.js`, `.tsx`:**
- `references/security-patterns.md`
- `references/performance-tips.md`

**Load before Phase 4 (Output Generation) ALWAYS:**
- `references/templates.md`

**Load before Phase 5 (Verification) ALWAYS:**
- `references/anti-patterns.md`

**Conditional loading must be deterministic:**
- File extension check (`.ts` = TypeScript)
- Phase number (Phase 3 = always load security)
- Explicit user request ("use security lens")

**Never use:**
- "If relevant"
- "When needed"
- "If helpful"
- "Check whether to load"
```

**Why it's good:**
- Deterministic conditions (file extension, phase, explicit request)
- No subjective judgment calls
- Reliable loading even under token pressure
- Clear to both AI and user when files load

---

## Anti-Pattern #6: AI Cosplay Reviews

### ❌ BAD (Pretend to Be Expert)

```markdown
## Review Step

Evaluate your work through the lens of:
- Paul Graham (YC founder)
- Linus Torvalds (Linux creator)
- Don Norman (UX expert)
```

**Why it's bad:**
- AI pattern-matches to "what sounds like something Expert X would say"
- No actual methodology applied
- Generic advice dressed in expert language
- Catches nothing of substance
- Theater, not real review

**Result:** Review provides no value, just vibes.

---

### ✅ GOOD (Real Cognitive Framework)

```markdown
## Review Step (Load Cognitive Profiles)

**Load `../../cognitive-profiles/paul-graham-yc.md`:**

### Paul Graham (YC) Decision Framework:
1. **Strip to core:** What problem does this ACTUALLY solve?
   - If vague → Flag for revision
   - If specific + painful → Green flag

2. **Founder fit:** Can THIS team pull this off?
   - If no domain expertise → Red flag
   - If experienced pain personally → Green flag

3. **Market timing:** Why now? What changed?
   - If no specific catalyst → Red flag
   - If recent regulatory/tech/behavior shift → Green flag

4. **Question sequence (in order):**
   - Who is the customer? (specific person, not demographic)
   - What do they do now without this? (status quo)
   - Why does that hurt? (pain point)
   - Why will they switch? (10x better, not 10%)

5. **Red flags to check:**
   - "Everyone" as target market
   - Vague problem statement
   - Solution without painful problem
   - No founder domain expertise

6. **Green flags to check:**
   - Specific use case
   - Founder experienced pain personally
   - Rapid iteration (weekly deploys)
   - Organic user growth

**If ANY red flag found:**
- Document specific concern
- Propose concrete fix
- Re-review after fix

**Output format:**
```
Paul Graham (YC) Review:
- Strip to core: [specific finding]
- Founder fit: [specific assessment]
- Market timing: [specific catalyst or lack thereof]
- Red flags: [list each with line reference]
- Green flags: [list each]
- Verdict: [Fund / Pass / Needs revision]
- Rationale: [specific reasoning, not generic]
```
```

**Why it's good:**
- Executable framework (not role-play)
- Specific question sequence
- Clear red/green flags
- Deterministic review process
- Catches real issues, not vibes

---

## Anti-Pattern #7: Missing Contrarian Frame

### ❌ BAD (No Differentiation Strategy)

```markdown
## Skill Goal

Write great code reviews.
```

**Why it's bad:**
- What does "great" mean?
- How is this different from baseline AI code review?
- No strategy to avoid generic output
- Will produce: "Consider adding tests, looks good overall"

**Result:** Baseline AI behavior, not differentiated.

---

### ✅ GOOD (Explicit Contrarian Frame)

```markdown
## Contrarian Frame (North Star)

### Step 1: Lazy Version (What to AVOID)

**Baseline AI code review looks like:**
- **Structure:** Summary → bullet list → overall score
- **Vocabulary:** "Consider adding", "This could be", "Looks good overall but..."
- **Assumptions:** Generic best practices apply everywhere
- **Feel:** Forgettable, like every AI code review

### Step 2: Banned Patterns (Explicit Prohibitions)

**Forbidden phrases (auto-fail if present):**
- "Consider adding error handling" → Cite specific line, name the exception type
- "This could be more efficient" → Quantify cost: "O(n²) at 10K items = 2s delay"
- "Looks good overall but..." → No hedging. Critical issues are critical.
- "You might want to..." → No suggestions. Requirements or recommendations.
- Three-item bullet lists → Vary structure. Use decision trees, severity tiers.

**Forbidden structures:**
- Generic summaries that restate what was just said
- Bullet lists without severity classification
- Vague recommendations without code examples

### Step 3: Required Inversions

**Must include:**
- Reference to specific line numbers + file paths (not "the code")
- Reference to production incidents caused by this pattern (if known)
- Proposed concrete fix with code example (not description)
- Quantified impact: "At 1000 users, this N+1 query = 5s page load"

### Step 4: Verification

**Does this review contain ANY banned phrases?**
- If YES → FAILED. Rewrite from scratch.

**Does it cite specific lines?**
- If NO → FAILED. Add file paths + line numbers.

**Are impacts quantified?**
- If NO → FAILED. Replace adjectives with numbers.

**Contrarian frame = North Star for ALL decisions.**
Every output checked against: "Does this move us AWAY from the lazy version?"
```

**Why it's good:**
- Explicit lazy version documented
- Banned patterns with required alternatives
- Verification tests for differentiation
- North star prevents drift back to baseline

---

## Recognition Test (Can You Spot Anti-Patterns?)

### Example 1

```markdown
## Skill Trigger

This skill helps with data analysis tasks.
```

**Question:** Which anti-pattern is this?

<details>
<summary>Answer</summary>

**Anti-Pattern #1: Vague Triggers**

**Problems:**
- What data? (CSV files? SQL queries? Excel sheets?)
- What analysis? (Descriptive stats? ML? Visualization?)
- When does it activate?

**Fix:**
```markdown
## Skill Trigger

**Activates for:**
- File types: `.csv`, `.xlsx`, `.json` (structured data)
- Phrases: "analyze this data", "run statistics on", "visualize"
- Data size: <10MB (larger files use big-data skill)

**Does NOT activate for:**
- Code analysis (use code-review skill)
- Text analysis (use nlp skill)
- Image data (use vision skill)
```
</details>

---

### Example 2

```markdown
## Workflow

1. Read the code
2. Find issues
3. Write report
```

**Question:** Which anti-pattern is this?

<details>
<summary>Answer</summary>

**Anti-Pattern #2: Recipe Thinking**

**Problems:**
- No thinking architecture (just steps)
- Doesn't change HOW AI reasons
- Will produce baseline behavior

**Fix:**
```markdown
## Workflow

### Before analyzing (load frameworks):
- If backend code → Load references/security-framework.md
- If frontend code → Load references/ux-framework.md
- If database queries → Load references/perf-framework.md

### Analysis (apply cognitive lenses):
1. Security lens (OWASP Top 10)
2. Performance lens (query cost, algorithmic complexity)
3. UX lens (error states, loading indicators)

### Output requirements:
- Cite specific lines + files
- Quantify impact ("2s delay at 1K users")
- Provide code examples for fixes
```
</details>

---

## Summary: Anti-Pattern Checklist

**Before shipping your skill, verify it avoids ALL anti-patterns:**

- [ ] **NOT vague triggers** — Specific activation conditions + boundaries
- [ ] **NOT recipe thinking** — Has thinking architecture, not just steps
- [ ] **HAS verification gate** — Built-in quality check with auto-fail
- [ ] **NOT monolithic** — Uses progressive disclosure (if >500 lines)
- [ ] **NOT hedged triggers** — Explicit, deterministic loading conditions
- [ ] **NOT AI cosplay** — Real cognitive frameworks, not role-play
- [ ] **HAS contrarian frame** — Documented lazy version + inversions

**If ANY anti-pattern present → Fix before shipping.**

---

**Last updated:** 2026-03-01  
**Version:** 2.0.0

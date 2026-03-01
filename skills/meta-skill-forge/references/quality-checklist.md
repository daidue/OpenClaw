# Quality Checklist — Before Shipping

**Run through this checklist before shipping ANY skill built with meta-skill forge.**

Every box must be checked. If ANY box unchecked → Fix before shipping.

---

## Layer Verification

### ✅ Layer 1: Trigger System

- [ ] **Specific activation conditions defined**
  - File types OR content patterns OR explicit phrases documented
  - Not vague ("helps with writing")
  
- [ ] **Explicit boundaries documented**
  - Lists what skill does NOT handle
  - Prevents conflicts with other skills
  
- [ ] **Clear activation phrases**
  - User knows when skill will fire
  - AI knows when to engage

**Example check:**
```markdown
Good: "Activates for .ts files when user says 'review this code'"
Bad: "This skill helps with code"
```

---

### ✅ Layer 2: Thinking Architecture

- [ ] **Defines HOW to think, not just WHAT to do**
  - Has reasoning framework (not just steps)
  - Changes cognitive approach before output
  
- [ ] **References cognitive frameworks**
  - Loads real expert methodologies (not generic advice)
  - Cites specific profiles by name
  
- [ ] **Uses progressive disclosure**
  - Orchestrator loads references on-demand
  - Not dumping everything at once
  - Explicit loading triggers (not "if relevant")

**Example check:**
```markdown
Good: "Before analyzing, load references/security-framework.md. Apply OWASP Top 10 lens."
Bad: "Step 1: Analyze the code. Step 2: Find issues."
```

---

### ✅ Layer 3: Verification Gate

- [ ] **Explicit differentiation criteria**
  - "Does this look like baseline AI?" test exists
  - Specific banned patterns documented
  
- [ ] **Auto-fail conditions defined**
  - Clear thresholds (not subjective)
  - Retry logic specified
  
- [ ] **Loaded LAST (Tier 3)**
  - Takes advantage of recency bias
  - AI pays most attention to what it processed last

**Example check:**
```markdown
Good: "If output contains ANY banned phrase → FAILED, rewrite"
Bad: "Make sure output is good"
```

---

## Contrarian Frame Verification

### ✅ Lazy Version Documented

- [ ] **"Baseline AI would produce X" written explicitly**
  - Structure described
  - Vocabulary identified
  - Assumptions named
  - Feel characterized

**Example:**
```markdown
Lazy version: "Consider adding tests, looks good overall but could be more efficient"
```

---

### ✅ Banned Patterns Identified

- [ ] **50+ forbidden words/phrases listed**
  - Specific to this domain
  - Not generic platitudes
  
- [ ] **Structural patterns to avoid documented**
  - Three-item bullet lists
  - Generic summaries
  - Hedge language ("consider", "might", "could")

**Example:**
```markdown
Banned: "Consider adding error handling" → Required: "Line 47: Add try/catch for SQLException"
```

---

### ✅ Required Inversions Documented

- [ ] **For each banned pattern, alternative specified**
  - Not just "don't do X" but "do Y instead"
  - Concrete examples provided

**Example:**
```markdown
Instead of: "This could be more efficient"
Required: "At 1000 items, O(n²) loop = 5s. Optimize to O(n log n) = 50ms"
```

---

### ✅ Verification Tests Created

- [ ] **Auto-check for banned patterns**
  - If ANY banned phrase found → auto-fail
  - Machine-verifiable (not subjective)

---

## Progressive Disclosure Verification

### ✅ Orchestrator Size

- [ ] **Main file <500 lines (<25KB)**
  - If larger → split into reference files
  - Target: ~400 lines ideal

---

### ✅ Reference Files

- [ ] **Each reference file <300 lines (<15KB)**
  - If larger → split further
  - Target: ~250 lines ideal
  
- [ ] **Explicit loading triggers for EVERY reference**
  - Not "if relevant" or "when needed"
  - Deterministic conditions (phase number, file type, explicit request)

**Example:**
```markdown
Good: "Load references/security.md before Phase 3 if file matches *.ts"
Bad: "Load security reference if relevant"
```

---

### ✅ Three-Tier Structure

- [ ] **Tier 1 (Always-On) defined**
  - Core routing logic
  - <500 lines
  
- [ ] **Tier 2 (On-Demand) defined**
  - Reference files with explicit triggers
  - Loaded only when needed for current phase
  
- [ ] **Tier 3 (Verification) defined**
  - Quality gate
  - Loaded LAST

---

## Cognitive Profiles Verification

### ✅ Real Frameworks (Not AI Cosplay)

- [ ] **Frameworks extracted from expert work**
  - Conference talks, essays, interviews analyzed
  - Not "pretend to be Expert X"
  
- [ ] **Executable decision sequences**
  - Step 1: Do X, Step 2: Check Y, Step 3: Flag Z
  - Not role-playing

**Example check:**
```markdown
Good: "Paul Graham framework: 1. Strip to core, 2. Founder fit, 3. Market timing"
Bad: "Review this as Paul Graham would"
```

---

### ✅ Profile Integration

- [ ] **Profiles loaded at correct phase**
  - Typically Phase 6 (Review)
  - Explicit loading triggers
  
- [ ] **Multiple profiles applied**
  - At least 2-3 different lenses
  - Each catches different issue classes

---

## Anti-Pattern Avoidance

### ✅ NOT Vague Triggers

- [ ] **Activation conditions specific**
- [ ] **Boundaries explicit**
- [ ] **User knows when skill fires**

---

### ✅ NOT Recipe Thinking

- [ ] **Has reasoning framework** (not just steps)
- [ ] **Changes HOW AI thinks** (not just WHAT to output)

---

### ✅ HAS Verification Gate

- [ ] **Built-in quality check**
- [ ] **Auto-fail conditions**
- [ ] **Retry logic**

---

### ✅ NOT Monolithic

- [ ] **Uses progressive disclosure** (if >500 lines)
- [ ] **Modular structure**
- [ ] **On-demand loading**

---

### ✅ NOT Hedged Triggers

- [ ] **All loading triggers explicit**
- [ ] **No "if relevant" or "when needed"**
- [ ] **Deterministic conditions**

---

### ✅ NOT AI Cosplay

- [ ] **Real cognitive frameworks**
- [ ] **Executable decision sequences**
- [ ] **Not role-playing**

---

### ✅ HAS Contrarian Frame

- [ ] **Lazy version documented**
- [ ] **Banned patterns listed**
- [ ] **Required inversions specified**

---

## Performance Benchmarks

### ✅ Size Targets

- [ ] **Orchestrator: <500 lines (<25KB)**
- [ ] **Reference files: <300 lines each (<15KB)**
- [ ] **Total skill: <2000 lines (<100KB)**

---

### ✅ Loading Targets

- [ ] **Per-phase load time: <3 seconds**
- [ ] **Full skill load time: <10 seconds**

Test with:
```bash
time openclaw skills reload
```

---

### ✅ Token Efficiency

- [ ] **Per-phase tokens: <10K**
  - Orchestrator (~2K) + max 2 references (~8K)
  
- [ ] **Not loading all references at once**

---

## Documentation Verification

### ✅ Architecture Rationale

- [ ] **Explains WHY this structure**
  - Why modular vs single file?
  - Why these specific reference files?
  - Why these loading triggers?

---

### ✅ Usage Guide

- [ ] **Installation instructions**
- [ ] **Trigger conditions documented**
- [ ] **Example inputs with expected outputs**
- [ ] **Known limitations documented**

---

### ✅ Version Control

- [ ] **CHANGELOG.md exists**
- [ ] **Version number assigned (v1.0.0)**
- [ ] **Git repo initialized**

---

## Testing Verification

### ✅ Real Task Test

- [ ] **Tested on actual task** (not just theory)
- [ ] **Output compared to baseline AI**
- [ ] **Differentiation verified**

---

### ✅ A/B Comparison

- [ ] **Same task, skill ON vs skill OFF**
- [ ] **Clear quality difference**
- [ ] **Not just formatting difference**

**Example test:**
```markdown
Task: Review authentication middleware

Baseline AI (skill OFF):
"Looks good, consider adding input validation and tests"

With skill (skill ON):
"Line 23: Missing JWT validation allows unauthorized access. 
At 1000 req/sec, missing validation = 0% auth coverage.
Fix: Add middleware.use(verifyJWT) before line 23.
Example: [code snippet]"

Difference: Specific line, quantified impact, concrete fix vs vague suggestion
```

---

### ✅ Verification Gate Test

- [ ] **Ran sample output through verification**
- [ ] **Banned patterns caught**
- [ ] **Baseline check works**

---

## Meta-Verification (Self-Application)

### ✅ Does This Skill Follow Its Own Advice?

- [ ] **Has all 3 layers**
- [ ] **Has contrarian frame**
- [ ] **Uses progressive disclosure**
- [ ] **Avoids anti-patterns**
- [ ] **Demonstrates principles it teaches**

**If skill teaches X but doesn't do X → Fix before shipping.**

---

## Final Go/No-Go

**Count your checkmarks:**

- **90-100% checked:** Ship it ✅
- **80-89% checked:** Fix gaps, then ship
- **70-79% checked:** Significant work needed, delay ship
- **<70% checked:** Not ready, go back to earlier phase

**Missing critical items?**
- No Layer 1, 2, or 3 → BLOCK (not a meta-skill)
- No contrarian frame → BLOCK (will produce baseline behavior)
- No verification gate → BLOCK (quality unverified)
- Missing anti-pattern checks → BLOCK (likely hitting anti-patterns)

**If ANY critical item unchecked → DO NOT SHIP.**

---

## Checklist Export

**Copy this summary for quick checks:**

```markdown
## Meta-Skill Quality Check

**Layers:**
- [ ] Layer 1: Trigger System (specific, boundaries, phrases)
- [ ] Layer 2: Thinking Architecture (framework, cognitive profiles, progressive disclosure)
- [ ] Layer 3: Verification Gate (differentiation check, auto-fail, loaded last)

**Contrarian Frame:**
- [ ] Lazy version documented
- [ ] 50+ banned patterns
- [ ] Required inversions specified
- [ ] Verification tests created

**Progressive Disclosure:**
- [ ] Orchestrator <500 lines
- [ ] Reference files <300 lines each
- [ ] Explicit loading triggers
- [ ] Three-tier structure

**Cognitive Profiles:**
- [ ] Real frameworks (not AI cosplay)
- [ ] 2-3 profiles applied
- [ ] Executable decision sequences

**Anti-Patterns:**
- [ ] NOT vague triggers
- [ ] NOT recipe thinking
- [ ] HAS verification gate
- [ ] NOT monolithic
- [ ] NOT hedged triggers
- [ ] NOT AI cosplay
- [ ] HAS contrarian frame

**Performance:**
- [ ] Orchestrator <25KB
- [ ] Per-phase load <3s
- [ ] Tested on real task

**Documentation:**
- [ ] Architecture rationale
- [ ] Usage guide
- [ ] CHANGELOG.md
- [ ] Version control

**Result:** _____ / _____ checks passed (need >90%)
```

---

**Last updated:** 2026-03-01  
**Version:** 2.0.0

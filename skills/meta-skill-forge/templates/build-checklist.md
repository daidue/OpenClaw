# Meta-Skill Build Checklist

**Copy this checklist to track your progress through all 8 phases.**

**Skill Name:** _________________  
**Started:** __________  
**Target Completion:** __________

---

## Phase 1: Context Ingestion

**Goal:** Extract your implicit methodology

- [ ] Collected existing prompts for this task
- [ ] Collected workflow documentation (if any)
- [ ] Collected examples of GOOD output
- [ ] Collected examples of BAD output
- [ ] Uploaded all materials to skill workspace
- [ ] Documented current approach (how you do this manually)

**If you have NO existing materials:** Check this box and note "Building from first principles"
- [ ] Building from first principles (no prior materials)

**Deliverable:** Folder with all raw materials

**Load next:** `references/phase2-targeted-extraction.md`

---

## Phase 2: Targeted Extraction

**Goal:** Pull out reasoning, not just results

### Round 1: Scope
- [ ] What should this skill accomplish that AI can't do well on its own?
- [ ] Who will use it? What's their experience level?
- [ ] Concrete task example documented

### Round 2: Differentiation
- [ ] What does AI get wrong with no skill loaded?
- [ ] Lazy version described (what would baseline AI produce?)
- [ ] ONE critical thing skill must nail identified

### Round 3: Structure
- [ ] Determined if templates needed
- [ ] Determined if multiple workflows needed
- [ ] Identified external tools or file formats
- [ ] Documented decision points

### Round 4: Breaking Points
- [ ] Identified inputs that would destroy naive version
- [ ] Documented what skill should refuse to do
- [ ] Documented what requires extra care/confirmation

**Deliverable:** Extraction notes document

**Load next:** `references/phase3-contrarian-analysis.md`

---

## Phase 3: Contrarian Analysis

**Goal:** Engineer AWAY from baseline AI behavior

- [ ] **Lazy version written:**
  - [ ] What structure would AI reach for first?
  - [ ] What vocabulary would it default to?
  - [ ] What assumptions would it bake in?
  - [ ] What would output feel like?

- [ ] **Banned patterns identified:**
  - [ ] Forbidden vocabulary list created (50+ words/phrases)
  - [ ] Structural patterns to avoid documented
  - [ ] Workflow assumptions challenged

- [ ] **Required inversions documented:**
  - [ ] For each banned pattern, documented alternative
  - [ ] Verification tests created (to catch banned patterns)

- [ ] **Contrarian frame documented:**
  - [ ] North star defined (what makes this different?)
  - [ ] All decisions will be checked against this frame

**Deliverable:** Contrarian frame document

**Load next:** `references/phase4-architecture.md`

---

## Phase 4: Architecture Decisions

**Goal:** Pick structure based on complexity

### Complexity Assessment
- [ ] Determined if one task with minimal domain knowledge
- [ ] Determined if one workflow with moderate depth
- [ ] Determined if multiple modes or deep knowledge needed

### Structure Decision
- [ ] **Single file** (chose this if <300 lines total)
- [ ] **Standard modular** (orchestrator + reference files)
- [ ] **Full modular** (orchestrator + workflows + concepts + examples + templates)

### File Structure Designed
- [ ] Main orchestrator designed (<500 lines target)
- [ ] Reference files identified (if modular)
- [ ] Loading triggers specified (explicit, not "if relevant")
- [ ] Tier 1 (always-on) content identified
- [ ] Tier 2 (on-demand) content identified
- [ ] Tier 3 (verification) content identified

**Deliverable:** Architecture diagram + file structure

**Load next:** `references/phase5-writing-content.md`

---

## Phase 5: Writing Content

**Goal:** Build the actual skill files

### Orchestrator Written
- [ ] Core routing logic written
- [ ] Phase detection logic written
- [ ] Explicit loading triggers for ALL reference files
- [ ] Critical constraints at START of file
- [ ] Critical constraints at END of file (recency bias)
- [ ] No hedge language ("always" > "try to")
- [ ] Every phase yields visible output or decision
- [ ] Main file <500 lines

### Reference Files Written (if modular)
- [ ] Domain concepts file(s) written
- [ ] Anti-patterns file written
- [ ] Examples file(s) written (annotated)
- [ ] Templates file(s) written (if needed)
- [ ] Each file <300 lines

### Verification Gate Built
- [ ] "Does this look like baseline AI?" check created
- [ ] Banned patterns check created
- [ ] Auto-fail conditions defined
- [ ] Retry logic specified
- [ ] Loaded LAST (Tier 3 - recency bias)

**Deliverable:** Complete skill file tree

**Load next:** `references/phase6-cognitive-review.md`

---

## Phase 6: Cognitive Review

**Goal:** Stress-test with real expert frameworks

### First-Principles Pass
- [ ] Does everything earn its place?
- [ ] Could you get same result with fewer parts?
- [ ] What's simplest version that would work?
- [ ] Cuts made if needed

### Practicality Check
- [ ] Would real person use this daily?
- [ ] Loading time acceptable (<10s)?
- [ ] Triggers realistic or will they be ignored?
- [ ] Friction level appropriate?

### Outcome Check
- [ ] Ran A/B test (skill on vs skill off)
- [ ] Measured genuine behavioral shift
- [ ] Verified differentiation from baseline
- [ ] Not just process wrapping around same output

### Cognitive Profiles Applied
- [ ] Selected relevant profiles (security, performance, UX, etc.)
- [ ] Applied each profile's decision framework
- [ ] Documented findings from each lens
- [ ] Fixed issues found
- [ ] Re-reviewed after fixes

**Deliverable:** Review findings document + fixes applied

**Load next:** `references/phase7-ship-it.md`

---

## Phase 7: Ship It

**Goal:** Deliver production-ready package

### Package Complete
- [ ] Full file tree with all files
- [ ] Architecture rationale written
- [ ] Review findings documented
- [ ] Usage guide written:
  - [ ] Installation instructions
  - [ ] Trigger conditions documented
  - [ ] Example inputs with expected outputs
  - [ ] Known limitations documented

### Version Control Setup
- [ ] CHANGELOG.md created (from `templates/changelog-template.md`)
- [ ] Version number assigned (v1.0.0)
- [ ] Git repo initialized (if not already)
- [ ] Initial commit made

### Quality Check
- [ ] All 3 layers present? (Trigger, Thinking, Verification)
- [ ] Contrarian frame documented?
- [ ] Progressive disclosure used?
- [ ] Cognitive profiles applied?
- [ ] Anti-patterns avoided?
- [ ] Self-verification gate passed?

**Deliverable:** Complete skill package in `~/.openclaw/workspace/skills/[skill-name]/`

**Load next:** `references/phase8-evolve.md`

---

## Phase 8: Evolve (Post-Ship)

**Goal:** Improve skill over time with real-world use

### Performance Tracking
- [ ] Skill deployed to production
- [ ] Success metrics defined
- [ ] Baseline performance measured
- [ ] Tracking system set up (manual or automated)

### Pattern Learning
- [ ] What worked documented
- [ ] What didn't work documented
- [ ] Prompt patterns that succeeded captured
- [ ] Production incidents linked to skill behavior

### Cognitive Profile Updates
- [ ] New examples added from production
- [ ] Decision frameworks refined
- [ ] What profile caught vs missed documented
- [ ] Profiles versioned separately

### Version Updates
- [ ] Bug fixes applied (patch version)
- [ ] New features added (minor version)
- [ ] Breaking changes made (major version)
- [ ] CHANGELOG.md updated
- [ ] New version shipped

**Deliverable:** Evolved skill with version history

---

## Final Verification (Before First Use)

Run through this checklist ONE MORE TIME before using skill in production:

- [ ] All 8 phases completed (none skipped)
- [ ] Build checklist fully checked (this document)
- [ ] Quality checklist passed (`references/quality-checklist.md`)
- [ ] Anti-patterns avoided (`references/anti-patterns.md`)
- [ ] Self-verification gate passed
- [ ] Version control set up (CHANGELOG.md exists)
- [ ] Usage guide complete
- [ ] Tested on real task (not just theory)

**If ANY box unchecked → Stop. Go back and complete it.**

---

## Build Statistics

**Time spent per phase:**
- Phase 1: _____ hours
- Phase 2: _____ hours
- Phase 3: _____ hours
- Phase 4: _____ hours
- Phase 5: _____ hours
- Phase 6: _____ hours
- Phase 7: _____ hours
- Phase 8: _____ hours (ongoing)

**Total:** _____ hours

**Files created:** _____  
**Total lines:** _____  
**Cognitive profiles used:** _____

---

## Notes & Learnings

**What went well:**


**What was difficult:**


**Would do differently next time:**


**Patterns to reuse:**


---

**Skill Status:** [ ] In Progress  /  [ ] Shipped v1.0.0  /  [ ] Evolved to v___

**Last updated:** __________

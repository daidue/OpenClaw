---
name: titlerun-code-review
description: 'Systematic multi-lens code review for TitleRun. Applies Security (OWASP), Performance (Google SRE), and UX (Nielsen) frameworks with TitleRun-specific anti-pattern detection. Target: 95+ score. Supports 3-AI parallel review pipeline for comprehensive coverage.'
version: 1.1.0
author: Jeff Daniels
created: 2026-03-01
updated: 2026-03-01
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

**CRITICAL:** Main agent (Jeff) must spawn reviewers directly. Subagents cannot spawn other subagents.

```
User: "Run 3-AI review on tradeEngine.js"
    ↓
Jeff (main agent) spawns 3 reviewers in parallel:
    ↓
sessions_spawn(runtime=subagent, mode=run, label=security-review, task=[security review task])
sessions_spawn(runtime=subagent, mode=run, label=performance-review, task=[performance review task])
sessions_spawn(runtime=subagent, mode=run, label=ux-review, task=[UX review task])
    ↓           ↓           ↓
Security   Performance    UX
  Agent       Agent      Agent
    ↓           ↓           ↓
All agents auto-announce completion (no polling needed)
    ↓
Jeff spawns synthesis agent:
    ↓
sessions_spawn(runtime=subagent, mode=run, label=synthesis, task=[synthesis task])
    ↓
Unified Report (deduplicated, ranked, scored)
```

**Example invocation:**

```javascript
// 1. Spawn Security Reviewer
sessions_spawn(
  runtime: "subagent",
  mode: "run",
  agentId: "main",
  label: "security-review",
  task: "Review src/routes/tradeEngine.js with OWASP security lens. Load cognitive-profiles/owasp-security.md. Apply TitleRun anti-patterns. Output to reviews/[timestamp]-security.md"
)

// 2. Spawn Performance Reviewer  
sessions_spawn(
  runtime: "subagent",
  mode: "run",
  agentId: "main",
  label: "performance-review",
  task: "Review src/routes/tradeEngine.js with Google SRE performance lens. Load cognitive-profiles/google-sre-performance.md. Apply TitleRun anti-patterns. Output to reviews/[timestamp]-performance.md"
)

// 3. Spawn UX Reviewer
sessions_spawn(
  runtime: "subagent",
  mode: "run",
  agentId: "main",
  label: "ux-review",
  task: "Review src/routes/tradeEngine.js with Nielsen UX heuristics lens. Load cognitive-profiles/nielsen-ux-heuristics.md. Apply TitleRun anti-patterns. Output to reviews/[timestamp]-ux.md"
)

// Wait for all 3 to complete (they auto-announce)
// Then spawn synthesis:

sessions_spawn(
  runtime: "subagent",
  mode: "run",
  agentId: "main",
  label: "synthesis",
  task: "Synthesize 3 reviewer outputs. Load reviews/*-security.md, *-performance.md, *-ux.md. Deduplicate findings (same file+line). Weighted scoring: Security 40%, Performance 35%, UX 25%. Output to reviews/[timestamp]-unified.md"
)
```

**Workflow:** See `workflows/multi-agent-review.md` for detailed orchestration steps

**Synthesis:** See `workflows/synthesis.md` for deduplication and scoring logic

**Cost:** ~60K tokens total (3 reviewers ~10K each + synthesis ~30K) = ~$3

**Time:** 10-15 min (parallel execution, depends on file size)

**Error handling:** If 1 reviewer fails, synthesis proceeds with 2/3 reviewers (degraded mode)

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

---

## Configuration (v1.1+)

**Production hardening parameters (all optional):**

### Chunking Configuration

**When:** Files >800 lines

```javascript
{
  chunk_threshold: 800,    // Lines before chunking trigger (default: 800)
  chunk_size: 700,         // Target lines per chunk (default: 700)
  chunk_overlap: 50,       // Overlap zone to prevent boundary issues (default: 50)
  chunk_method: 'logical'  // 'logical' (function/class) or 'arbitrary' (every N lines)
}
```

**Override example:**
```bash
# Review with custom chunking threshold
task: "Review index.js with chunk_threshold=1000, chunk_size=800"
```

**Supported languages:**
- JavaScript/TypeScript: Logical chunking (function/class boundaries)
- Python: Logical chunking (def/class boundaries)
- Others: Arbitrary chunking (every N lines)

---

### Timeout Configuration

**When:** Reviewer runs >10 min without completion

```javascript
{
  reviewer_timeout: 600,    // Seconds before killing reviewer (default: 600 = 10min)
  synthesis_timeout: 600,   // Seconds for synthesis (default: 600 = 10min)
  monitor_interval: 30      // Check interval for timeout monitoring (seconds)
}
```

**Override example:**
```bash
# Increase timeout for very large files
task: "Review with reviewer_timeout=900"  # 15 min
```

**Behavior:**
- At timeout: Kill reviewer, mark as FAILED
- Continue with remaining reviewers (graceful degradation)
- Log timeout with duration and reason

---

### Retry Configuration

**When:** Reviewer fails with transient error

```javascript
{
  max_retries: 1,           // Maximum retry attempts (default: 1)
  retry_delay: 30000,       // Milliseconds before retry (default: 30s)
  retry_on: [               // Failure types that trigger retry
    'timeout',
    'rate_limit',
    'network_error',
    'memory_pressure'       // First occurrence only
  ],
  no_retry_on: [            // Failure types that skip retry
    'user_cancelled',
    'invalid_input',
    'parse_error',
    'memory_crash'          // Second occurrence
  ]
}
```

**Override example:**
```bash
# Disable retries (fail fast)
task: "Review with max_retries=0"
```

**Behavior:**
- Retry once after delay
- If retry fails, proceed without that reviewer
- Annotate report with retry status

---

### Weighted Scoring Configuration

**Default weights (3/3 reviewers):**

```javascript
{
  weights: {
    security: 0.40,      // 40%
    performance: 0.35,   // 35%
    ux: 0.25             // 25%
  }
}
```

**Auto-adjusted (2/3 reviewers):**

| Missing Category | Adjusted Weights |
|------------------|------------------|
| Security         | Performance 58%, UX 42% |
| Performance      | Security 62%, UX 38% |
| UX               | Security 53%, Performance 47% |

**Formula:**
```javascript
const remaining_weight = categories.reduce((sum, c) => sum + c.original_weight, 0);
categories.forEach(c => {
  c.adjusted_weight = (c.original_weight / remaining_weight) * 100;
});
```

**1/3 reviewer:**
- Single category gets 100% weight
- Score = that category's score (not aggregated)
- Report flagged as PARTIAL REVIEW

---

### Graceful Degradation Configuration

**When:** <3 reviewers complete

```javascript
{
  min_reviewers: 1,         // Minimum to proceed (default: 1)
  fail_threshold: 0,        // Abort if all fail (default: 0)
  partial_confidence: {
    '3/3': 100,
    '2/3': 66,
    '1/3': 33,
    '0/3': 0
  }
}
```

**Behavior:**

| Scenario | Action | Confidence | Template |
|----------|--------|-----------|----------|
| 3/3 ✅   | Full review | 100% | review-report.md |
| 2/3 ⚠️   | Adjusted scoring | 66% | partial-results-report.md |
| 1/3 ❌   | Single-category | 33% | partial-results-report.md |
| 0/3 ❌   | Abort + error log | 0% | None (errors.log only) |

---

### Multi-Agent Review Configuration (3-AI mode)

**When:** `mode=3ai` flag specified

```javascript
{
  mode: '3ai',              // Enable 3-parallel-reviewer mode
  spawn_delay: 0,           // Delay between spawns (ms, default: 0 = parallel)
  synthesis_mode: 'auto',   // 'auto' (after reviewers) or 'manual'
  dedup_threshold: 5        // Line tolerance for deduplication (±N lines)
}
```

**Token budget (estimates):**

| File Size | Chunked? | Total Tokens | Cost (Sonnet) |
|-----------|----------|--------------|---------------|
| <800 lines | No | ~60K | ~$0.36 |
| 800-1200 | Yes (2 chunks) | ~85K | ~$0.51 |
| 1200-1600 | Yes (3 chunks) | ~110K | ~$0.66 |
| >1600 | Yes (4+ chunks) | ~140K+ | ~$0.84+ |

**Override example:**
```bash
# Review in 3-AI mode with custom deduplication threshold
task: "Review PR #123 mode=3ai dedup_threshold=10"
```

---

### Example: Full Custom Configuration

```javascript
{
  // Chunking
  chunk_threshold: 1000,
  chunk_size: 800,
  chunk_overlap: 75,
  
  // Timeouts
  reviewer_timeout: 900,     // 15 min
  synthesis_timeout: 900,
  monitor_interval: 45,
  
  // Retry
  max_retries: 2,            // Try up to 3 times total
  retry_delay: 60000,        // 1 min between retries
  
  // Scoring
  weights: {
    security: 0.50,          // Increase security weight
    performance: 0.30,
    ux: 0.20
  },
  
  // Degradation
  min_reviewers: 2,          // Require at least 2/3
  
  // 3-AI mode
  mode: '3ai',
  dedup_threshold: 3         // Stricter deduplication
}
```

**Pass via task:**
```javascript
task: `Review ${file_path} with config: ${JSON.stringify(config)}`
```

---

### Environment Variables (Alternative)

**Set via environment:**

```bash
export TITLERUN_REVIEW_CHUNK_THRESHOLD=1000
export TITLERUN_REVIEW_TIMEOUT=900
export TITLERUN_REVIEW_MAX_RETRIES=2
```

**Priority:** CLI args > environment vars > defaults

---

### Performance Tuning Recommendations

**For small files (<500 lines):**
- Disable chunking: `chunk_threshold=99999`
- Reduce timeout: `reviewer_timeout=300` (5 min)
- Disable retry: `max_retries=0` (fail fast)

**For large files (>1500 lines):**
- Increase chunk size: `chunk_size=900`
- Increase timeout: `reviewer_timeout=1200` (20 min)
- Increase retry: `max_retries=2`

**For slow networks:**
- Increase retry delay: `retry_delay=60000` (1 min)
- Enable retries on timeout: Add `'timeout'` to `retry_on`

**For high-reliability (production):**
- Require 2/3 minimum: `min_reviewers=2`
- Increase timeouts: `reviewer_timeout=1200`
- Enable retries: `max_retries=2`

---

**Configuration documentation updated:** 2026-03-01 (v1.1.0)

# Multi-Agent Code Review Workflow v1.1

**Purpose:** Orchestrate 3 parallel reviewers for comprehensive code analysis with production-grade reliability.

**When to use:** `mode=3ai` flag specified

**Cost:** ~60K-80K tokens (varies by file size + chunking)

**Time:** ~10-15 min (small files), ~20-30 min (large files with chunking)

**New in v1.1:**
- ✅ Large file support (>800 lines) via chunking
- ✅ Graceful degradation (2/3 or 1/3 reviewers)
- ✅ Timeout handling (10min per reviewer)
- ✅ Automatic retry on transient failures
- ✅ Partial results synthesis with confidence scoring

---

## Prerequisites

**Before spawning reviewers:**

1. **Validate input:**
   - File path(s) provided
   - Files exist and are readable
   - CI is green (if PR)
   - No merge conflicts (if PR)

2. **Prepare shared context:**
   - Generate timestamp: `YYYY-MM-DD-HHMM`
   - Create review directory: `workspace-titlerun/reviews/`
   - Ensure cognitive profiles exist
   - Ensure TitleRun references exist

3. **Check file sizes (NEW v1.1):**
   ```bash
   for file in "$@"; do
     lines=$(wc -l < "$file")
     if [ "$lines" -gt 800 ]; then
       echo "Large file detected: $file ($lines lines) — chunking enabled"
       needs_chunking=true
     fi
   done
   ```

4. **Check token budget:**
   - Base cost: 60K tokens (~$0.36 with Opus)
   - With chunking: +43% per chunked file (~$0.50-0.60)
   - Confirm budget available before spawning

---

## Step 0: Large File Handling (NEW v1.1)

**Trigger:** Any file >800 lines

**Workflow:** `skills/titlerun-code-review/checks/large-file-handling.md`

### Detection

```bash
file_path="$1"
line_count=$(wc -l < "$file_path")

if [ "$line_count" -gt 800 ]; then
  echo "Chunking required: $line_count lines"
  chunk_file "$file_path"
fi
```

### Chunking Process

**Algorithm:**
1. Parse file structure (detect function/class boundaries)
2. Create logical chunks (600-800 lines each)
3. Add 50-line overlap zones (prevents boundary issues)
4. Generate chunk files with metadata

**Example output (1048-line file):**
```
chunk-1.js: lines 1-750 (includes overlap 701-750)
chunk-2.js: lines 701-1048 (includes overlap 701-750)
chunk-manifest.json: metadata + line number mappings
```

**Modified reviewer tasks:**
```javascript
// Instead of single file:
task: "Review titlerun-api/src/index.js..."

// Spawn per-chunk reviewers:
task: "Review chunk 1 of 2 from titlerun-api/src/index.js (lines 1-750). 
       Use ORIGINAL line numbers in findings. 
       See chunk-manifest.json for context."
```

**Deduplication (cross-chunk):**
- Overlap zones (±50 lines) deduplicated in synthesis
- Findings merged by original line numbers
- Final report shows no chunk boundaries (seamless)

**See:** `checks/large-file-handling.md` for full algorithm

---

## Step 1: Main Agent Spawns 3 Parallel Reviewers

**CRITICAL:** Only the main agent can spawn reviewers via `sessions_spawn`.

**Spawn configuration (with timeout handling):**

```javascript
const reviewerConfig = {
  timeout: 600,  // 10 min per reviewer (NEW v1.1)
  retry_on_transient: true,  // NEW v1.1
  max_retries: 1  // NEW v1.1
};
```

### Reviewer 1 - Security

**Spawn with sessions_spawn:**
```javascript
sessions_spawn({
  runtime: "subagent",
  mode: "run",
  agentId: "main",
  label: "security-review",
  cwd: "/Users/jeffdaniels/.openclaw/workspace",
  runTimeoutSeconds: 600,  // 10 min (NEW)
  task: `Review ${file_or_chunk_path} for security vulnerabilities.
         Load cognitive-profiles/owasp-security.md.
         Apply TitleRun anti-patterns from skills/titlerun-code-review/references/titlerun-anti-patterns.md.
         Use skills/titlerun-code-review/templates/finding-template.md for every finding.
         ${chunking_instructions}
         Output to workspace-titlerun/reviews/${timestamp}-security.md.
         Focus: OWASP Top 10 (A01-A10).
         Required: 5 elements per finding (file, line, code, impact, fix).`
})
```

**Cognitive profile:** `cognitive-profiles/owasp-security.md`

**Focus areas:**
- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection
- A04: Insecure Design
- A05: Security Misconfiguration
- A06: Vulnerable Components
- A07: Authentication Failures
- A08: Software/Data Integrity
- A09: Logging/Monitoring Failures
- A10: Server-Side Request Forgery

**Output:** `workspace-titlerun/reviews/[timestamp]-security.md`

---

### Reviewer 2 - Performance

**Spawn with sessions_spawn:**
```javascript
sessions_spawn({
  runtime: "subagent",
  mode: "run",
  agentId: "main",
  label: "performance-review",
  cwd: "/Users/jeffdaniels/.openclaw/workspace",
  runTimeoutSeconds: 600,  // 10 min (NEW)
  task: `Review ${file_or_chunk_path} for performance issues.
         Load cognitive-profiles/google-sre-performance.md.
         Apply TitleRun anti-patterns from skills/titlerun-code-review/references/titlerun-anti-patterns.md.
         Use skills/titlerun-code-review/templates/finding-template.md for every finding.
         ${chunking_instructions}
         Output to workspace-titlerun/reviews/${timestamp}-performance.md.
         Focus: Query efficiency, algorithmic complexity (O(n) analysis), resource usage, caching.
         Required: 5 elements per finding with quantified performance impact.`
})
```

**Cognitive profile:** `cognitive-profiles/google-sre-performance.md`

**Focus areas:**
- Query efficiency (N+1, missing indexes)
- Algorithmic complexity (O(n²) → O(n log n))
- Resource usage (memory, CPU, network)
- Database optimization (batching, caching)
- API response times
- Frontend bundle size

**Output:** `workspace-titlerun/reviews/[timestamp]-performance.md`

---

### Reviewer 3 - UX

**Spawn with sessions_spawn:**
```javascript
sessions_spawn({
  runtime: "subagent",
  mode: "run",
  agentId: "main",
  label: "ux-review",
  cwd: "/Users/jeffdaniels/.openclaw/workspace",
  runTimeoutSeconds: 600,  // 10 min (NEW)
  task: `Review ${file_or_chunk_path} for UX issues.
         Load cognitive-profiles/nielsen-ux-heuristics.md.
         Apply TitleRun anti-patterns from skills/titlerun-code-review/references/titlerun-anti-patterns.md.
         Use skills/titlerun-code-review/templates/finding-template.md for every finding.
         ${chunking_instructions}
         Output to workspace-titlerun/reviews/${timestamp}-ux.md.
         Focus: Nielsen's 10 usability heuristics, user error prevention, clear feedback, accessibility.
         Required: 5 elements per finding with user impact analysis.`
})
```

**Cognitive profile:** `cognitive-profiles/nielsen-ux-heuristics.md`

**Focus areas:**
- Visibility of system status
- Match between system and real world
- User control and freedom
- Consistency and standards
- Error prevention
- Recognition over recall
- Flexibility and efficiency
- Aesthetic and minimalist design
- Help users recognize/diagnose errors
- Help and documentation

**Output:** `workspace-titlerun/reviews/[timestamp]-ux.md`

---

## Step 2: Monitor Completion with Timeout Handling (NEW v1.1)

**Auto-announcement:** All reviewers auto-announce completion. No active polling needed.

**Timeout monitoring (optional, for debugging):**
```javascript
// Check every 30s (non-blocking)
setInterval(() => {
  const reviewers = subagents({action: "list"});
  reviewers.forEach(r => {
    const age = Date.now() - r.start_time;
    if (age > 600000 && r.status === 'running') {  // >10 min
      console.warn(`Reviewer ${r.label} timeout — killing`);
      subagents({action: "kill", target: r.sessionId});
    }
  });
}, 30000);
```

**Success criteria:**
- All 3 reviewers announce completion OR timeout
- Output files checked for existence + validity
- No catastrophic crashes

**Timeout:** 10 minutes per reviewer (configurable)

---

## Step 3: Error Recovery & Retry Logic (NEW v1.1)

**Workflow:** `skills/titlerun-code-review/workflows/error-recovery.md`

### Check Completion Status

```javascript
const completed = reviewers.filter(r => 
  r.status === 'done' && 
  fileExists(`workspace-titlerun/reviews/${timestamp}-${r.category}.md`)
);

const failed = reviewers.filter(r => r.status !== 'done');
```

### Graceful Degradation Decision Tree

```
Completed reviewers:
├─ 3/3 ✅ → Proceed to synthesis (100% confidence)
├─ 2/3 ⚠️ → Proceed with adjusted weights (66% confidence)
├─ 1/3 ❌ → Partial review only (33% confidence)
└─ 0/3 ❌ → ABORT (critical failure)
```

### Retry Logic (Transient Failures Only)

**Retry triggers:**
- Network timeout (429 rate limit)
- Temporary file lock
- Memory pressure (first occurrence)

**NO retry for:**
- Invalid file path
- User cancellation (manual kill)
- Parse errors
- Memory crash (second occurrence)

**Retry process:**
```javascript
if (shouldRetry(failure_reason) && retry_count < 1) {
  console.log(`Retrying ${reviewer.label} after 30s...`);
  await sleep(30000);
  spawnReviewer({...config, retry: true});
} else {
  console.warn(`Skipping retry: ${failure_reason}`);
  proceedWithoutReviewer(reviewer.label);
}
```

### Logging Failures

**Log to:** `workspace-titlerun/reviews/[timestamp]-errors.log`

**Format:**
```
[2026-03-01 22:45:12] REVIEWER FAILURE
Label: performance-review
Status: timeout
Duration: 10min 0s
Reason: No response after timeout threshold
Output: Expected file NOT FOUND
Retry: No (timeout not retryable)
```

---

## Step 4: Spawn Synthesis Agent (Partial Results Support) (NEW v1.1)

**When:** At least 1 reviewer completes (even if <3)

**Spawn with sessions_spawn:**
```javascript
sessions_spawn({
  runtime: "subagent",
  mode: "run",
  agentId: "main",
  label: "synthesis",
  cwd: "/Users/jeffdaniels/.openclaw/workspace",
  runTimeoutSeconds: 600,
  task: `Synthesize code review findings.
         Load skills/titlerun-code-review/workflows/synthesis.md.
         Input files (if exist):
           - workspace-titlerun/reviews/${timestamp}-security.md
           - workspace-titlerun/reviews/${timestamp}-performance.md
           - workspace-titlerun/reviews/${timestamp}-ux.md
         
         Completed reviewers: ${completed_count}/3
         Failed reviewers: ${failed_categories.join(', ')}
         
         Process:
         1) Extract findings from available reports
         2) Deduplicate (same file + line ±5)
         3) Deduplicate overlap zones (if chunked)
         4) Rank by severity
         5) Calculate weighted score (adjust for missing categories)
         6) Generate unified report with confidence indicator
         
         Weighted scoring (${completed_count}/3):
         ${adjustedWeights}
         
         Use template: ${completed_count === 3 ? 'review-report.md' : 'partial-results-report.md'}
         
         Output to workspace-titlerun/reviews/${timestamp}-unified.md`
})
```

### Adjusted Weighted Scoring (NEW v1.1)

**Original weights:**
- Security: 40%
- Performance: 35%
- UX: 25%

**2/3 scenarios:**

| Missing | Adjusted Weights |
|---------|------------------|
| Security | Performance 58.33%, UX 41.67% |
| Performance | Security 61.54%, UX 38.46% |
| UX | Security 53.33%, Performance 46.67% |

_Weights sum to 100.00% (verified)_

**Formula:**
```javascript
const remaining_weight = categories.reduce((sum, c) => sum + c.original_weight, 0);
categories.forEach(c => {
  c.adjusted_weight = (c.original_weight / remaining_weight) * 100;
});
```

**1/3 scenario:**
- Single category gets 100% weight
- Score = that category's score
- Flag as PARTIAL REVIEW (not full 3-AI)

**0/3 scenario:**
- No synthesis (abort)
- Generate error report only

### Output Selection (NEW v1.1)

**Use different templates based on completion:**

| Completed | Template | Confidence |
|-----------|----------|------------|
| 3/3 | `templates/review-report.md` | 100% |
| 2/3 | `templates/partial-results-report.md` | 66% |
| 1/3 | `templates/partial-results-report.md` | 33% |
| 0/3 | Error log only | 0% |

---

## Step 5: Deliver Results (Enhanced Messaging) (NEW v1.1)

**When synthesis complete:**

### Scenario A: Full Review (3/3)

```markdown
## [3-AI CODE REVIEW] [File/PR] — Score: XX/100 ✅

**Full coverage:** All 3 reviewers completed

**Breakdown:**
- Security: XX/100 (40% weight)
- Performance: XX/100 (35% weight)
- UX: XX/100 (25% weight)

**Findings:**
- Critical: X (block merge)
- High: Y (fix before deploy)
- Medium: Z (fix when convenient)
- Low: N (optional)

**Coverage analysis:**
- All 3 reviewers agreed: M issues
- 2 reviewers found: N issues
- Single reviewer only: K issues

**Action required:**
[If <95: Fix Critical + High before deploy]
[If <80: URGENT - halt feature work]

**Confidence:** 100%

**Reports:**
- Unified: workspace-titlerun/reviews/[timestamp]-unified.md
- Security: [timestamp]-security.md
- Performance: [timestamp]-performance.md
- UX: [timestamp]-ux.md

[ACK by Jeff] Action: [approved / needs_fixes / rejected]
```

### Scenario B: Partial Review (2/3)

```markdown
## [3-AI CODE REVIEW] [File/PR] — Score: XX/100 ⚠️

⚠️ **Partial coverage:** 2/3 reviewers completed

**Available:**
- Security: XX/100 ✅
- Performance: XX/100 ✅
- UX: FAILED (timeout after 10min)

**Adjusted scoring:**
- Security: 62% weight (was 40%)
- Performance: 38% weight (was 35%)

**Findings:** X critical, Y high, Z medium

**Confidence:** 66% (2/3 reviewers)

**Recommendation:** 
[If non-critical: Acceptable to proceed]
[If production deploy: Re-run UX review for full coverage]

**Reports:**
- Unified: workspace-titlerun/reviews/[timestamp]-unified.md
- Error log: [timestamp]-errors.log

[ACK by Jeff] Action: [proceed / retry_failed / defer]
```

### Scenario C: Minimal Review (1/3)

```markdown
## [3-AI CODE REVIEW] [File/PR] — Score: XX/100 ❌

❌ **Critical:** Only 1/3 reviewers completed

**Available:**
- Security: XX/100 ✅
- Performance: FAILED (out of memory)
- UX: FAILED (invalid output)

**This is NOT a full 3-AI review.**
Score reflects Security category only.

**Confidence:** 33% (1/3 reviewers)

**Action required:**
1. Debug failed reviewers (see error log)
2. Re-run full 3-AI review
3. DO NOT deploy based on partial results

**Reports:**
- Partial: workspace-titlerun/reviews/[timestamp]-unified.md
- Error log: [timestamp]-errors.log

[ACK by Jeff] Action: [debug / abort]
```

### Scenario D: Complete Failure (0/3)

```markdown
## [3-AI CODE REVIEW] [File/PR] — FAILED ❌

❌ **Catastrophic failure:** All 3 reviewers failed

**Failures:**
- Security: Timeout after 10min
- Performance: Out of memory (exit code 137)
- UX: Parse error (malformed output)

**No results available.**

**Debugging:**
1. Check file size (enable chunking if >800 lines)
2. Check task configuration
3. Review error log: [timestamp]-errors.log

**Next steps:**
- Fix root cause
- Retry with 1-AI mode (fallback)
- Escalate if issue persists

[ACK by Jeff] Action: [debug_now / escalate]
```

---

## Configuration (NEW v1.1)

**Configurable parameters:**

```javascript
const config = {
  // Chunking
  chunk_threshold: 800,  // Lines before chunking
  chunk_size: 700,  // Target lines per chunk
  chunk_overlap: 50,  // Overlap zone (lines)
  
  // Timeouts
  reviewer_timeout: 600,  // 10 min per reviewer (seconds)
  synthesis_timeout: 600,  // 10 min for synthesis
  
  // Retry
  max_retries: 1,
  retry_delay: 30000,  // 30 seconds (ms)
  retry_on: ['timeout', 'rate_limit', 'network_error'],
  
  // Weights
  weights: {
    security: 0.40,
    performance: 0.35,
    ux: 0.25
  },
  
  // Graceful degradation
  min_reviewers: 1,  // Minimum to proceed (1-3)
  fail_threshold: 0  // Abort if all fail
};
```

**Override via task:**
```javascript
task: "Review with config: chunk_threshold=1000, reviewer_timeout=900"
```

---

## Performance Metrics (Updated v1.1)

**Track per review:**

| Metric | Target | Notes |
|--------|--------|-------|
| Total time | <15 min | Small files (<800 lines) |
| Total time (chunked) | <30 min | Large files (>800 lines) |
| Total tokens | 60K | No chunking |
| Total tokens (chunked) | 80K | +43% with chunking |
| Completion rate | 100% | All 3 reviewers finish |
| Partial rate | <10% | 2/3 reviewers finish |
| Failure rate | <1% | 0-1/3 reviewers finish |
| Retry success | >80% | Transient failures recover |
| Deduplication accuracy | >95% | Overlap zones handled |

**Log to:** `workspace-titlerun/reviews/metrics.json`

**Schema:**
```json
{
  "timestamp": "2026-03-01T22:45:00Z",
  "target": "titlerun-api/src/index.js",
  "file_size": 1048,
  "chunked": true,
  "chunks": 2,
  "reviewers_spawned": 3,
  "reviewers_completed": 3,
  "retries": 0,
  "total_time_ms": 780000,
  "total_tokens": 82000,
  "cost_usd": 0.49,
  "confidence": 100,
  "findings": {
    "critical": 2,
    "high": 5,
    "medium": 8,
    "low": 3
  }
}
```

---

## Token Budget Breakdown (Updated v1.1)

**Small files (<800 lines):**
- Security reviewer: ~15K tokens
- Performance reviewer: ~15K tokens
- UX reviewer: ~15K tokens
- Synthesis: ~12K tokens
- **Total:** ~57K tokens (~$0.34)

**Large files (>800 lines, chunked):**
- Security reviewer × 2 chunks: ~30K tokens
- Performance reviewer × 2 chunks: ~30K tokens
- UX reviewer × 2 chunks: ~30K tokens
- Synthesis (deduplication): ~18K tokens
- **Total:** ~108K tokens (~$0.65)

**Partial reviews (2/3):**
- Multiply by 2/3
- **Total:** ~40K-70K tokens

---

## Testing Checklist (NEW v1.1)

**Test 1: Large file (>1000 lines)**
- [x] File detection triggers chunking
- [x] Chunks generated with overlap
- [x] All reviewers get same chunks
- [x] Findings use original line numbers
- [x] No duplicates in overlap zones
- [x] Final report seamless (no chunk mentions)

**Test 2: Graceful degradation (2/3 reviewers)**
- [x] Spawn 3 reviewers
- [x] Manually kill 1 mid-execution
- [x] Review continues with 2/3
- [x] Weighted scoring adjusted
- [x] Report shows 66% confidence
- [x] Error logged

**Test 3: Graceful degradation (1/3 reviewer)**
- [x] Spawn 3 reviewers
- [x] Manually kill 2 mid-execution
- [x] Review continues with 1/3
- [x] Single-category score shown
- [x] Report shows 33% confidence
- [x] Flagged as PARTIAL REVIEW

**Test 4: Timeout handling**
- [x] Reviewer runs >10 min
- [x] Killed automatically
- [x] Degradation kicks in
- [x] Error logged with timeout reason

**Test 5: Retry logic**
- [x] Transient failure (rate limit)
- [x] Automatic retry after 30s
- [x] Success on 2nd attempt
- [x] Report annotates retry

**Test 6: Complete failure (0/3)**
- [x] All 3 reviewers fail
- [x] No synthesis spawned
- [x] Error report generated
- [x] Clear debugging guidance

---

## Migration from v1.0

**Breaking changes:**
- None (backward compatible)

**New optional parameters:**
- `chunk_threshold` (default: 800)
- `reviewer_timeout` (default: 600)
- `max_retries` (default: 1)

**Deprecated:**
- None

**Upgrade path:**
1. Update `SKILL.md` with new config section
2. Update `CHANGELOG.md` with v1.1.0 features
3. Test with large file (titlerun-api/src/index.js)
4. Test with simulated failures

---

**Status:** Production ready v1.1.0 ✅

**See also:**
- `checks/large-file-handling.md` — Chunking algorithm
- `workflows/error-recovery.md` — Degradation decision trees
- `templates/partial-results-report.md` — Partial review format
- `workflows/synthesis.md` — Deduplication logic

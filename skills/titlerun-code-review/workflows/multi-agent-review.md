# Multi-Agent Code Review Workflow

**Purpose:** Orchestrate 3 parallel reviewers for comprehensive code analysis

**When to use:** `mode=3ai` flag specified

**Cost:** ~3x single review (~60K tokens total)

**Time:** ~10-15 min (parallel execution)

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

3. **Check token budget:**
   - Estimated cost: 60K tokens (~$0.36 with Opus)
   - Confirm budget available before spawning

---

## Step 1: Main Agent Spawns 3 Parallel Reviewers

**CRITICAL:** Only the main agent (Jeff) can spawn reviewers. The `subagents` tool has NO spawn action - only list, kill, steer.

**Use `sessions_spawn` with `runtime=subagent, mode=run`:**

### Reviewer 1 - Security

**Spawn with sessions_spawn:**
```javascript
sessions_spawn({
  runtime: "subagent",
  mode: "run",
  agentId: "main",
  label: "security-review",
  cwd: "/Users/jeffdaniels/.openclaw/workspace",
  runTimeoutSeconds: 1800,
  task: "Review [file path] for security vulnerabilities. Load cognitive-profiles/owasp-security.md. Apply TitleRun anti-patterns from skills/titlerun-code-review/references/titlerun-anti-patterns.md. Use skills/titlerun-code-review/templates/finding-template.md for every finding. Output to workspace-titlerun/reviews/[timestamp]-security.md. Focus: OWASP Top 10 (A01-A10). Required: 5 elements per finding (file, line, code, impact, fix)."
})
```

**Cognitive profile:** `skills/titlerun-code-review/../../cognitive-profiles/owasp-security.md`

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
  runTimeoutSeconds: 1800,
  task: "Review [file path] for performance issues. Load cognitive-profiles/google-sre-performance.md. Apply TitleRun anti-patterns from skills/titlerun-code-review/references/titlerun-anti-patterns.md. Use skills/titlerun-code-review/templates/finding-template.md for every finding. Output to workspace-titlerun/reviews/[timestamp]-performance.md. Focus: Query efficiency, algorithmic complexity (O(n) analysis), resource usage, caching. Required: 5 elements per finding with quantified performance impact."
})
```

**Cognitive profile:** `skills/titlerun-code-review/../../cognitive-profiles/google-sre-performance.md`

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
  runTimeoutSeconds: 1800,
  task: "Review [file path] for UX issues. Load cognitive-profiles/nielsen-ux-heuristics.md. Apply TitleRun anti-patterns from skills/titlerun-code-review/references/titlerun-anti-patterns.md. Use skills/titlerun-code-review/templates/finding-template.md for every finding. Output to workspace-titlerun/reviews/[timestamp]-ux.md. Focus: Nielsen's 10 usability heuristics, user error prevention, clear feedback, accessibility. Required: 5 elements per finding with user impact analysis."
})
```

**Cognitive profile:** `skills/titlerun-code-review/../../cognitive-profiles/nielsen-ux-heuristics.md`

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

## Step 2: Wait for All 3 to Complete

**Auto-announcement:** All reviewers auto-announce completion. No active polling needed.

**Optional monitoring (for debugging):**
```javascript
subagents(action: "list")
// Check for security-review, performance-review, ux-review with status=done
```

**Success criteria:**
- All 3 reviewers announce completion
- All 3 output files exist
- No reviewer errors or crashes

**Timeout:** 30 minutes per reviewer (most files review in < 15 min)

**Error handling (degraded mode):**
- **If 1 reviewer fails:** Continue with 2/3 reviewers (log which failed)
- **If 2 reviewers fail:** Abort 3-AI mode, fall back to 1-AI review
- **If all 3 fail:** Alert critical failure, investigate

**Degraded mode notes:**
- Document which reviewers completed in synthesis
- Adjust weighted scoring (if Security missing, Performance + UX get higher weight)
- Flag partial coverage in final report

---

## Step 3: Spawn Synthesis Agent

**When:** All 3 reviewers complete (or 2/3 in degraded mode)

**Spawn with sessions_spawn:**
```javascript
sessions_spawn({
  runtime: "subagent",
  mode: "run",
  agentId: "main",
  label: "synthesis",
  cwd: "/Users/jeffdaniels/.openclaw/workspace",
  runTimeoutSeconds: 1800,
  task: "Synthesize code review findings from 3 reviewers. Load skills/titlerun-code-review/workflows/synthesis.md for deduplication logic. Input files: workspace-titlerun/reviews/[timestamp]-security.md, workspace-titlerun/reviews/[timestamp]-performance.md, workspace-titlerun/reviews/[timestamp]-ux.md. Process: 1) Extract all findings, 2) Deduplicate (same file + line ±5), 3) Rank by severity, 4) Calculate weighted score (Security 40%, Performance 35%, UX 25%), 5) Generate unified report. Output to workspace-titlerun/reviews/[timestamp]-unified.md."
})
```

**Workflow:** `skills/titlerun-code-review/workflows/synthesis.md`

**Process:**
1. Load all 3 review reports (or 2/3 if degraded)
2. Extract findings from each
3. Deduplicate (same file + line ±5 lines = same issue)
4. Rank by severity (CRITICAL → HIGH → MEDIUM → LOW)
5. Calculate weighted aggregate score
6. Generate unified report with coverage analysis

**Output:** `workspace-titlerun/reviews/[timestamp]-unified.md`

---

## Step 4: Deliver Results

**When synthesis complete:**

1. **Read unified report:**
   ```
   read workspace-titlerun/reviews/[timestamp]-unified.md
   ```

2. **Post to Jeff's inbox:**
   ```markdown
   ## [3-AI CODE REVIEW] [File/PR] — Aggregate Score: XX/100
   
   **Breakdown:**
   - Security: XX/100 (40% weight)
   - Performance: XX/100 (35% weight)
   - UX: XX/100 (25% weight)
   
   **Critical issues:** X (block merge)
   **High issues:** Y (fix before deploy)
   **Medium issues:** Z (fix when convenient)
   
   **Coverage:**
   - All 3 reviewers agreed: N issues
   - 2 reviewers found: M issues
   - Single reviewer only: K issues (potential blind spots)
   
   **Action required:**
   [If <95: Fix Critical + High issues before deploy]
   [If <80: URGENT - halt feature work, address immediately]
   
   **Full report:** workspace-titlerun/reviews/[timestamp]-unified.md
   **Individual reports:** [timestamp]-security.md, [timestamp]-performance.md, [timestamp]-ux.md
   
   [ACK by Jeff, YYYY-MM-DD] Action: [reviewing]
   ```

3. **Cleanup:**
   - Mark all subagents as complete
   - Archive individual reports (keep for audit trail)

---

## Error Handling

**If reviewer crashes:**
- Log error with stack trace
- Continue with remaining reviewers
- Note partial coverage in synthesis

**If synthesis crashes:**
- Fall back to individual reports
- Alert for manual synthesis

**If all reviewers crash:**
- Log catastrophic failure
- Alert immediately
- Fall back to 1-AI review mode

---

## Performance Metrics

**Track per review:**

| Metric | Target | Actual |
|--------|--------|--------|
| Total time | <15 min | TBD |
| Total tokens | ~60K | TBD |
| Security findings | Varies | TBD |
| Performance findings | Varies | TBD |
| UX findings | Varies | TBD |
| Duplicates found | <20% | TBD |
| Unique insights (vs 1-AI) | >30% | TBD |

**Log to:** `workspace-titlerun/reviews/metrics.json`

---

## Token Budget Breakdown

**Estimated per reviewer:**
- Load cognitive profile: ~2K tokens
- Load TitleRun references: ~3K tokens
- Read target file: ~1-5K tokens (varies by file size)
- Analysis: ~5-10K tokens
- Output generation: ~2K tokens
- **Total per reviewer:** ~15-20K tokens

**Synthesis agent:**
- Load 3 reports: ~6K tokens
- Deduplication logic: ~2K tokens
- Ranking + scoring: ~2K tokens
- Output generation: ~2K tokens
- **Total synthesis:** ~12K tokens

**Grand total:** ~60K tokens (~$0.36 with Opus)

---

**Status:** Production ready — awaits synthesis.md workflow ✅

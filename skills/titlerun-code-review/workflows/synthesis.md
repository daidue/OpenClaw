# Synthesis Workflow - 3-AI Code Review

**Purpose:** Deduplicate, rank, and unify findings from 3 parallel reviewers

**Input:** 3 review reports (security, performance, UX)

**Output:** Single unified report with weighted aggregate score

---

## Input Validation

**Required files:**
- `workspace-titlerun/reviews/[timestamp]-security.md`
- `workspace-titlerun/reviews/[timestamp]-performance.md`
- `workspace-titlerun/reviews/[timestamp]-ux.md`

**Validation:**
1. All 3 files exist
2. All 3 files are non-empty
3. All 3 files have valid structure (findings section present)

**If any missing:**
- Note partial coverage in output
- Proceed with available reports
- Flag missing reviewers in final report

---

## Step 1: Load All 3 Reports

**Read each report:**
```
read workspace-titlerun/reviews/[timestamp]-security.md
read workspace-titlerun/reviews/[timestamp]-performance.md
read workspace-titlerun/reviews/[timestamp]-ux.md
```

**Extract from each:**
- Overall score (X/100)
- Findings list (CRITICAL, HIGH, MEDIUM, LOW)
- Individual finding details:
  - File path
  - Line number(s)
  - Code snippet
  - Impact description
  - Severity
  - Fix recommendation

---

## Step 2: Extract Findings

**For each report, parse findings into structured format:**

```json
{
  "reviewer": "security|performance|ux",
  "score": 85,
  "findings": [
    {
      "id": "security-001",
      "file": "api/routes/users.ts",
      "line": "47-52",
      "severity": "CRITICAL",
      "issue_type": "SQL Injection",
      "code": "const query = `SELECT * FROM users WHERE id = ${userId}`",
      "impact": "At 1K users, allows full database dump via injection",
      "fix": "Use parameterized queries: db.query('SELECT * FROM users WHERE id = ?', [userId])",
      "evidence": "Raw SQL concatenation without sanitization"
    }
  ]
}
```

**Normalize severity:**
- CRITICAL (blocker, security vulnerability, data loss, production outage)
- HIGH (performance degradation >1s, UX confusion, auth bypass)
- MEDIUM (edge case bugs, minor UX friction, optimization opportunity)
- LOW (code style, documentation, nice-to-have improvements)

---

## Step 3: Deduplicate Findings

**Deduplication logic:**

Two findings are **duplicates** if:
1. **Same file path** (exact match)
2. **Overlapping line numbers** (within ±5 lines)
3. **Same issue type** (injection, N+1 query, error handling, etc.)

**When duplicate found:**

1. **Keep highest severity version:**
   - CRITICAL > HIGH > MEDIUM > LOW
   
2. **Merge evidence from all sources:**
   ```markdown
   **Found by:** Security Reviewer, Performance Reviewer
   
   **Security perspective:** Allows SQL injection, full DB dump possible
   **Performance perspective:** Unparameterized query bypasses query planner optimization
   
   **Combined impact:** Security vulnerability + 3x slower query execution
   ```

3. **Combine fix recommendations:**
   - If fixes identical → keep one
   - If fixes differ → list both with context
   - Prefer more specific/actionable fix

**Mark duplicates:**
- Original finding: `duplicate_of: null`
- Duplicate: `duplicate_of: "security-001"`
- Track which reviewers found it: `found_by: ["security", "performance"]`

---

## Step 4: Rank Findings

**Primary sort:** Severity (CRITICAL → HIGH → MEDIUM → LOW)

**Secondary sort (within severity):** Impact score

**Impact score calculation:**

```
Impact Score = (Users Affected × Severity Multiplier × Frequency) / Fix Effort

Where:
- Users Affected: 1 (edge case) to 10 (all users)
- Severity Multiplier:
  - CRITICAL: 10
  - HIGH: 5
  - MEDIUM: 2
  - LOW: 1
- Frequency: 1 (rare) to 10 (every request)
- Fix Effort: 1 (one line) to 10 (architecture change)
```

**Example:**
```
SQL Injection in login endpoint:
- Users: 10 (all users)
- Severity: CRITICAL (10x)
- Frequency: 8 (login happens often)
- Fix: 2 (one line to parameterize query)

Impact Score = (10 × 10 × 8) / 2 = 400 (VERY HIGH)
```

**Sort findings by impact score within each severity tier.**

---

## Step 5: Calculate Aggregate Score

**Weighted average of 3 reviewer scores:**

```
Aggregate Score = (Security × 0.40) + (Performance × 0.35) + (UX × 0.25)

Where:
- Security weight: 40% (critical for production, security failures = customer data at risk)
- Performance weight: 35% (user experience, retention, conversion)
- UX weight: 25% (usability, user satisfaction)
```

**Example:**
```
Security: 82/100
Performance: 91/100
UX: 88/100

Aggregate = (82 × 0.40) + (91 × 0.35) + (88 × 0.25)
          = 32.8 + 31.85 + 22
          = 86.65
          ≈ 87/100
```

**Round to nearest integer.**

**Justification (REQUIRED):**
- Why this score?
- What's holding it back from 95+?
- Which area needs most improvement?
- Estimated fix time to reach 95?

---

## Step 6: Coverage Analysis

**Track coverage patterns:**

### All 3 Reviewers Found (High Confidence)
- Count: N findings
- These are obvious issues, high confidence
- Priority: Fix immediately

### 2 Reviewers Found (Medium Confidence)
- Count: M findings
- Which pairs found them? (Security+Performance, Security+UX, Performance+UX)
- May indicate domain overlap or confirmation

### Single Reviewer Only (Potential Blind Spot)
- Count: K findings
- Which reviewer found it?
- **High K = potential blind spots in other reviewers**
- Indicates specialized knowledge needed

**Coverage health:**
```
If K > (N + M):
  → Blind spot risk: reviewers missing different issues
  → Consider adding more reviewers or deeper profiles

If N > (M + K):
  → High consensus: obvious issues dominate
  → Code needs significant improvement

Ideal: N ≈ M > K (consensus on major issues, some specialist findings)
```

---

## Step 7: Generate Unified Report

**Output structure:**

```markdown
# 3-AI Code Review - [File/PR Name]

**Reviewed:** [timestamp]
**Reviewers:** Security (OWASP), Performance (Google SRE), UX (Nielsen)

---

## Aggregate Score: XX/100

### Breakdown:
- **Security:** XX/100 (40% weight)
- **Performance:** XX/100 (35% weight)
- **UX:** XX/100 (25% weight)

### Score Justification:
[Why this score? What gaps exist? What would make it 95+?]

**Target:** 95/100
**Gap:** XX points
**Estimated fix time:** X hours

---

## Unified Findings: [N total, M unique after deduplication]

### CRITICAL Issues: N (BLOCK MERGE)

#### 1. [Issue Title]
**File:** `path/to/file.ts`
**Line:** 47-52
**Found by:** Security Reviewer, Performance Reviewer
**Impact Score:** 400

**Code:**
```typescript
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

**Impact:**
- **Security:** Allows SQL injection, full database dump at 1K users
- **Performance:** Unparameterized query 3x slower, bypasses query planner

**Fix:**
```typescript
const query = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
```

**Test case:**
```typescript
test('rejects SQL injection attempt', async () => {
  const malicious = "1 OR 1=1";
  await expect(getUser(malicious)).rejects.toThrow();
});
```

---

### HIGH Issues: N (FIX BEFORE DEPLOY)

[Same format as CRITICAL]

---

### MEDIUM Issues: N (FIX WHEN CONVENIENT)

[Same format, can be more concise]

---

### LOW Issues: N (OPTIONAL)

[Brief list, group similar issues]

---

## Coverage Analysis

**Findings by consensus:**
- ✅ **All 3 reviewers:** N issues (high confidence, obvious problems)
- ⚠️ **2 reviewers:** M issues (medium confidence, domain overlap)
- 🔍 **1 reviewer only:** K issues (specialist findings, potential blind spots)

**Breakdown by reviewer pairs:**
- Security + Performance: X issues
- Security + UX: Y issues
- Performance + UX: Z issues

**Single-reviewer findings:**
- Security only: A issues
- Performance only: B issues
- UX only: C issues

**Health assessment:**
```
[If K > (N+M): "⚠️ High blind spot risk - reviewers finding different issues"]
[If N > (M+K): "⚠️ Many obvious issues - code needs significant improvement"]
[Ideal state: "✅ Good consensus on major issues, specialist findings present"]
```

---

## Deduplication Summary

**Total raw findings:** [sum from 3 reports]
**Unique findings:** [after deduplication]
**Duplicates removed:** [total - unique]
**Deduplication rate:** [duplicates / total × 100]%

**Most commonly duplicated issues:**
1. [Issue type] - found by all 3 reviewers
2. [Issue type] - found by 2 reviewers

---

## Recommendation

**[SHIP / FIX FIRST / BLOCK]**

**SHIP** (score ≥95, no CRITICAL, <3 HIGH):
```
✅ Code meets quality bar. Safe to merge and deploy.

Optional improvements: [list MEDIUM/LOW if any]
```

**FIX FIRST** (score 80-94, <2 CRITICAL, <10 HIGH):
```
⚠️ Fix CRITICAL and HIGH issues before deploy.

Critical: [list]
High: [list]

Estimated fix time: X hours
Re-review recommended after fixes.
```

**BLOCK** (score <80, ≥2 CRITICAL, or ≥10 HIGH):
```
🔴 DO NOT MERGE. Significant quality issues.

Must fix:
- [N CRITICAL issues - security/data risks]
- [M HIGH issues - performance/UX problems]

Halt feature work. Focus on quality improvements.
Estimated fix time: X days

Required: Full re-review after fixes.
```

---

## Next Steps

1. **If CRITICAL issues:** Fix immediately, block deploy
2. **If HIGH issues:** Prioritize fixes, re-review before deploy
3. **If MEDIUM issues:** Add to backlog, fix when convenient
4. **If LOW issues:** Optional, consider for tech debt sprint

**Re-review trigger:** After fixing CRITICAL or HIGH issues

---

## Appendix: Individual Reports

**Full details available in:**
- `workspace-titlerun/reviews/[timestamp]-security.md` (Security Reviewer)
- `workspace-titlerun/reviews/[timestamp]-performance.md` (Performance Reviewer)
- `workspace-titlerun/reviews/[timestamp]-ux.md` (UX Reviewer)

---

**Generated:** [timestamp]
**Synthesis Agent:** titlerun-code-review v1.0.0 (3-AI mode)
```

---

## Output Validation

**Before delivering, verify:**

1. **All findings have 5 elements:**
   - [ ] File path (exact)
   - [ ] Line number (exact)
   - [ ] Code snippet (actual code)
   - [ ] Quantified impact (numbers + scale)
   - [ ] Concrete fix (code example)

2. **Aggregate score has justification:**
   - [ ] Why this score?
   - [ ] What gaps exist?
   - [ ] Estimated fix time?

3. **Coverage analysis present:**
   - [ ] Consensus findings counted
   - [ ] Blind spots identified
   - [ ] Health assessment provided

4. **Recommendation is actionable:**
   - [ ] SHIP / FIX FIRST / BLOCK chosen
   - [ ] Specific next steps listed
   - [ ] Re-review criteria defined

**If any checkbox unchecked → FAIL, fix before delivery.**

---

## Error Handling

**If report parsing fails:**
- Log error with details
- Attempt partial synthesis (available reports only)
- Flag parsing errors in output

**If deduplication fails:**
- Fall back to no deduplication (keep all findings)
- Note in report: "Deduplication failed, showing all findings"

**If scoring fails:**
- Use simple average instead of weighted
- Note in report: "Using simple average (weights failed)"

**If any step fails:**
- Document failure clearly
- Provide partial results
- Enable manual review to complete

---

**Status:** Production ready — awaits integration test ✅

# Partial Results Report Template

**Use when:** <3 reviewers completed successfully.

**Purpose:** Standardized format for incomplete 3-AI reviews with clear confidence indicators.

---

## Header Section

```markdown
# Code Review Report — PARTIAL COVERAGE

**Target:** [file path or PR #]
**Timestamp:** YYYY-MM-DD HH:MM
**Mode:** 3-AI (partial)
**Reviewers completed:** X/3 (XX% confidence)

---

## ⚠️ PARTIAL REVIEW NOTICE

This review is INCOMPLETE. Only X of 3 reviewers completed successfully.

**Available categories:**
- [✅ Security / ❌ Failed / ⏭️ Skipped]
- [✅ Performance / ❌ Failed / ⏭️ Skipped]
- [✅ UX / ❌ Failed / ⏭️ Skipped]

**Missing coverage:**
- [Category]: [reason for failure]

**Confidence level:** XX% (X/3 reviewers)

**Recommendation:** 
[If 2/3: "Acceptable for non-critical changes. Re-run full review for production deploys."]
[If 1/3: "NOT RECOMMENDED for production. Debug failures and re-run."]

---
```

---

## Score Section (2/3 Reviewers)

### Example 1: Security + Performance (UX missing)

```markdown
## Aggregate Score: XX/100 ⚠️

**Breakdown (adjusted weights):**

| Category    | Score | Weight (adjusted) | Contribution |
|-------------|-------|-------------------|--------------|
| Security    | XX/100| 58% (was 40%)     | XX points    |
| Performance | XX/100| 42% (was 35%)     | XX points    |
| UX          | —     | 0% (FAILED)       | —            |

**Weighted average:** XX/100

**Original weights:** Security 40%, Performance 35%, UX 25%  
**Adjusted weights:** Security 58%, Performance 42% (UX weight redistributed proportionally)

**Confidence:** 66% (2/3 reviewers)

---

### Interpretation

- **XX/100 = [PASS/WARN/FAIL]**
  - 95-100: Excellent (production ready)
  - 80-94: Good (minor issues)
  - 60-79: Needs work (fix before deploy)
  - <60: Critical issues (block merge)

**Note:** This score is based on 2/3 categories. UX issues may exist but are not reflected.

---
```

### Example 2: Security only (Performance + UX missing)

```markdown
## Score: XX/100 (Security only) ❌

**Single-category review:**

| Category | Score | Notes |
|----------|-------|-------|
| Security | XX/100| ✅ Completed |
| Performance | — | ❌ Failed (timeout) |
| UX | — | ❌ Failed (invalid output) |

**Confidence:** 33% (1/3 reviewers)

⚠️ **This is NOT a full 3-AI review.** 

The XX/100 score reflects Security analysis only. Performance and UX issues may exist but are not detected.

**Action required:**
1. Debug failed reviewers (see error logs below)
2. Re-run full 3-AI review
3. Do NOT deploy based on partial results

---
```

---

## Findings Section (Same as full report)

```markdown
## Findings Summary

**Total issues:** X (across Y available categories)

| Severity  | Count | Categories |
|-----------|-------|------------|
| CRITICAL  | X     | Security: X, Performance: X |
| HIGH      | X     | Security: X, Performance: X |
| MEDIUM    | X     | Security: X, Performance: X |
| LOW       | X     | Security: X, Performance: X |

---

## Detailed Findings

[Use standard finding template for all available findings]

[For each finding, include normal 5 elements:]
[File, Line, Code, Impact, Fix]

---
```

---

## Failed Reviewers Section

```markdown
## Failed Reviewers

**Performance reviewer:**
- **Status:** Timeout after 10min 0s
- **Reason:** No response after timeout threshold
- **Last known state:** Running (stuck in analysis loop?)
- **Output file:** Expected `2026-03-01-2245-performance.md` → NOT FOUND
- **Session ID:** subagent:titlerun:abc123
- **Log:** See `workspace-titlerun/reviews/2026-03-01-2245-errors.log`

**Debugging hints:**
- File size: XXX lines (may be too large → enable chunking)
- Check for infinite loops in performance analysis
- Review session logs for stack traces

---

**UX reviewer:**
- **Status:** Failed with exit code 1
- **Reason:** Invalid output format (could not parse findings)
- **Output file:** `2026-03-01-2245-ux.md` exists but malformed
- **Session ID:** subagent:titlerun:xyz789
- **Log:** See error log

**Debugging hints:**
- Check UX reviewer task configuration
- Validate finding template is accessible
- Review output file manually for parse errors

---
```

---

## Action Items Section

### For 2/3 reviewers (66% confidence):

```markdown
## Action Items

**Based on available findings:**

### Critical Issues (block merge)
1. [Issue description] — Fix immediately
2. [Issue description] — Fix immediately

### High Priority (fix before deploy)
1. [Issue description]
2. [Issue description]

### Medium Priority (fix when convenient)
1. [Issue description]

---

## Next Steps

**Immediate actions:**
1. ✅ Address CRITICAL findings above
2. ✅ Address HIGH findings before deployment
3. ⚠️ Optionally re-run UX review for full coverage

**Optional (for production deploys):**
- Re-run full 3-AI review after fixing failed reviewer
- This provides 100% confidence coverage

**Acceptable to proceed if:**
- All CRITICAL issues fixed
- All HIGH issues fixed
- Change is non-critical / not production deploy

**NOT acceptable to proceed if:**
- Production deployment
- User-facing feature
- Security-sensitive change

---
```

### For 1/3 reviewer (33% confidence):

```markdown
## Action Items

⚠️ **DO NOT PROCEED with deployment based on this partial review.**

**Detected issues (Security category only):**

### Critical Issues
1. [Issue description]

### High Priority
1. [Issue description]

---

## Next Steps (REQUIRED)

**Immediate actions:**
1. ❌ Debug failed reviewers (see error logs above)
2. ❌ Fix root cause of failures
3. ❌ Re-run full 3-AI review
4. ⏸️ PAUSE deployment until full review complete

**Known issues (from Security review):**
- [List critical/high issues]

**Unknown risk:**
- Performance issues may exist (not detected)
- UX issues may exist (not detected)

**Recommendation:** Treat this as preliminary findings only. Full review required.

---
```

---

## Footer Section

```markdown
---

## Review Metadata

**Configuration:**
- Mode: 3-AI (partial)
- Reviewers spawned: 3
- Reviewers completed: X
- Timeout: 10min per reviewer
- Chunking: [enabled/disabled]

**Timing:**
- Start: YYYY-MM-DD HH:MM:SS
- End: YYYY-MM-DD HH:MM:SS
- Duration: XXmin XXs

**Token usage:**
- Security: XXK tokens
- Performance: [failed]
- UX: [failed]
- Synthesis: XXK tokens
- Total: XXK tokens (~$X.XX)

**Files reviewed:**
- [file1.js] (XXX lines)
- [file2.ts] (XXX lines)

**Output files:**
- Unified report: `workspace-titlerun/reviews/YYYY-MM-DD-HHMM-unified.md`
- Security findings: `workspace-titlerun/reviews/YYYY-MM-DD-HHMM-security.md`
- Performance findings: [FAILED]
- UX findings: [FAILED]
- Error log: `workspace-titlerun/reviews/YYYY-MM-DD-HHMM-errors.log`

---

## Confidence Assessment

| Aspect | Coverage | Confidence |
|--------|----------|------------|
| Security | ✅ Full | High |
| Performance | ❌ Missing | None |
| UX | ❌ Missing | None |
| **Overall** | **33%** | **Low** |

**Interpretation:**
- Low confidence = Significant blind spots exist
- Not recommended for production deploys
- Suitable for preliminary feedback only

---

**Report generated:** YYYY-MM-DD HH:MM:SS  
**Agent:** Rush (TitleRun Owner/Operator)  
**Skill:** titlerun-code-review v1.1.0  

---
```

---

## Usage Examples

### Template Variables

```javascript
const reportData = {
  target: "titlerun-api/src/auth.ts",
  timestamp: "2026-03-01 22:45",
  completed_count: 2,
  confidence: 66,
  available_categories: ["Security", "Performance"],
  failed_categories: [{
    name: "UX",
    reason: "Timeout after 10min",
    status: "timeout",
    output_exists: false
  }],
  adjusted_weights: {
    security: 58,  // was 40
    performance: 42  // was 35
  },
  aggregate_score: 87,
  findings: [...],
  errors: [...]
};
```

### Rendering Logic

```javascript
function renderPartialReport(data) {
  if (data.completed_count === 3) {
    // Use full report template
    return renderFullReport(data);
  } else if (data.completed_count === 2) {
    // Use 2/3 partial template
    return render2of3Template(data);
  } else if (data.completed_count === 1) {
    // Use 1/3 partial template
    return render1of3Template(data);
  } else {
    // Use failure report
    return renderFailureReport(data);
  }
}
```

---

**Status:** Production ready ✅

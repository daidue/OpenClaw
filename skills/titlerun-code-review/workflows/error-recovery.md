# Error Recovery - Graceful Degradation Decision Trees

**Purpose:** Handle reviewer failures without aborting entire review.

**Philosophy:** Partial results > no results. Fail gracefully, continue when possible.

---

## Failure Types

### Type 1: Reviewer Crash (Session Exit Code ≠ 0)
**Causes:** Out of memory, timeout, unhandled exception
**Detection:** `sessions_list` shows status=failed or status=killed

### Type 2: Invalid Output (No Findings File)
**Causes:** Reviewer didn't write output, wrong file path
**Detection:** Expected output file doesn't exist after completion

### Type 3: Malformed Output (Unparseable Findings)
**Causes:** Reviewer wrote partial/corrupted JSON/markdown
**Detection:** Parse error when synthesis reads file

### Type 4: Timeout (>10 min without completion)
**Causes:** Stuck in infinite loop, waiting for external resource
**Detection:** Session age > timeout threshold, status still running

### Type 5: User Cancellation (Manual Kill)
**Causes:** User manually killed reviewer (subagents kill)
**Detection:** Status=killed + external kill signal

---

## Decision Tree: 3 Reviewers Spawned

```
┌─────────────────────────────┐
│ All 3 reviewers spawned     │
│ Wait for completion (10min) │
└────────────┬────────────────┘
             │
             ▼
     ┌───────────────────┐
     │ Check completion  │
     │ (auto-announce)   │
     └─────────┬─────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
 ┌─────────┐     ┌─────────┐
 │ 3/3 ✅  │     │ <3 ⚠️   │
 │ SUCCESS │     │ PARTIAL │
 └─────────┘     └────┬────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │ 2/3 ⚠️  │ │ 1/3 ❌  │ │ 0/3 ❌  │
    │ WARN    │ │ FAIL    │ │ ABORT   │
    │ Continue│ │ Partial │ │ Critical│
    └─────────┘ └─────────┘ └─────────┘
```

---

## Scenario 1: 3/3 Reviewers Complete

**Detection:**
```javascript
const completed = reviewers.filter(r => r.status === 'done' && r.output_exists);
if (completed.length === 3) {
  // All 3 succeeded
  proceedToSynthesis();
}
```

**Action:**
1. Validate all 3 output files exist
2. Proceed to synthesis (normal path)
3. Confidence: 100%

**Report footer:**
```markdown
✅ Full coverage: All 3 reviewers completed successfully.
Confidence: 100%
```

---

## Scenario 2: 2/3 Reviewers Complete

**Detection:**
```javascript
if (completed.length === 2) {
  const failed = reviewers.filter(r => r.status !== 'done');
  logWarning(`Reviewer ${failed[0].label} failed: ${failed[0].reason}`);
  proceedWithPartialReview(completed);
}
```

**Action:**
1. Log which reviewer failed + reason
2. Proceed to synthesis with 2 reviewers
3. Adjust weighted scoring (redistribute missing category weight)
4. Flag partial coverage in report

**Weighted scoring adjustment:**

| Missing Category | Redistribution |
|------------------|----------------|
| Security (40%)   | Performance 57%, UX 43% (proportional to original weights) |
| Performance (35%)| Security 62%, UX 38% |
| UX (25%)         | Security 53%, Performance 47% |

**Formula:**
```javascript
const total_remaining_weight = 100 - missing_weight;
const adjusted_weights = {
  category_A: (original_weight_A / total_remaining_weight) * 100,
  category_B: (original_weight_B / total_remaining_weight) * 100
};
```

**Example (Security missing):**
- Original: Security 40%, Performance 35%, UX 25%
- Remaining: Performance + UX = 60%
- Adjusted: Performance = (35/60) × 100 = 58.3%, UX = (25/60) × 100 = 41.7%

**Report footer:**
```markdown
⚠️ Partial coverage: Security reviewer failed (timeout after 10min).
Available: Performance ✅, UX ✅
Weighted scoring adjusted: Performance 58%, UX 42%
Confidence: 66% (2/3 reviewers)

Recommendation: Re-run Security review separately for full coverage.
```

---

## Scenario 3: 1/3 Reviewers Complete

**Detection:**
```javascript
if (completed.length === 1) {
  const failed = reviewers.filter(r => r.status !== 'done');
  logError(`Critical: 2/3 reviewers failed.`);
  proceedWithPartialReview(completed, partial=true);
}
```

**Action:**
1. Log all failures with reasons
2. Proceed to synthesis with 1 reviewer (NO aggregation)
3. Mark as PARTIAL REVIEW (not full 3-AI)
4. Provide single-category score only
5. Flag critical coverage gap

**Report footer:**
```markdown
❌ Critical: Only 1/3 reviewers completed.

Available: Performance ✅ (score: 85/100)
Failed: Security (crashed after 8min), UX (invalid output)

⚠️ This is a PARTIAL REVIEW. Score reflects Performance category only.
Confidence: 33% (1/3 reviewers)

**Action required:** 
1. Debug failed reviewers (see logs below)
2. Re-run full 3-AI review after fixes

Failure logs:
- Security: Out of memory error (file too large?)
- UX: Output file not found (task misconfiguration?)
```

---

## Scenario 4: 0/3 Reviewers Complete

**Detection:**
```javascript
if (completed.length === 0) {
  logCritical('CATASTROPHIC: All 3 reviewers failed.');
  abortReview();
}
```

**Action:**
1. Log all failures with full stack traces
2. DO NOT proceed to synthesis
3. Alert user immediately
4. Provide debugging guidance

**Report:**
```markdown
❌ CATASTROPHIC FAILURE: All 3 reviewers failed.

Failures:
1. Security: Timeout after 10min (stuck in loop?)
2. Performance: Crash exit code 137 (OOM?)
3. UX: Output parse error (malformed JSON)

**Review aborted.** No results available.

**Debugging steps:**
1. Check file size: Is target file too large? (Run chunking)
2. Check task syntax: Are reviewer tasks well-formed?
3. Check system resources: Memory/CPU constraints?
4. Check logs: subagents list → inspect each session log

**Next actions:**
- Fix root cause (likely: file too large → enable chunking)
- Retry with single-file 1-AI review mode
- Contact support if issue persists
```

---

## Error Logging Format

**Log to:** `workspace-titlerun/reviews/[timestamp]-errors.log`

**Format:**
```
[2026-03-01 22:45:12] REVIEWER FAILURE
Label: security-review
Session ID: subagent:titlerun:12345
Status: failed
Exit code: 137
Duration: 8min 23s
Reason: Out of memory (killed by system)
Task: Review titlerun-api/src/index.js for security...
Output file: Expected workspace-titlerun/reviews/2026-03-01-2245-security.md → NOT FOUND

Stack trace:
[full trace if available]

---
```

---

## Retry Decision Logic

**When to retry:**

```
┌─────────────────────┐
│ Reviewer failed     │
└──────────┬──────────┘
           │
           ▼
   ┌───────────────┐
   │ Check reason  │
   └───────┬───────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐   ┌────────┐
│Transient│   │Permanent│
│ RETRY  │   │ SKIP   │
└────────┘   └────────┘

Transient errors:
- Network timeout
- Rate limit (429)
- Temporary file lock
- Memory pressure (1st occurrence)

Permanent errors:
- Invalid file path
- Malformed task
- User cancellation
- Memory crash (2nd occurrence)
```

**Retry configuration:**
```javascript
const retryConfig = {
  max_retries: 1,  // Only 1 retry
  retry_delay: 30000,  // 30 seconds
  retry_on: ['timeout', 'network_error', 'rate_limit'],
  no_retry_on: ['user_cancelled', 'invalid_input', 'parse_error']
};
```

**Retry action:**
```javascript
if (shouldRetry(failure_reason) && retry_count < 1) {
  logInfo(`Retrying ${reviewer.label} (attempt 2/2) after ${retry_delay}ms`);
  await sleep(retry_delay);
  spawnReviewer(reviewer.config, retry=true);
} else {
  logWarn(`Skipping retry for ${reviewer.label}: ${failure_reason}`);
  proceedWithoutReviewer(reviewer.label);
}
```

**Report annotation (if retried):**
```markdown
⚠️ Security reviewer failed on first attempt (rate limit), retried successfully.
Duration: 12min (includes 30s retry delay)
```

---

## Graceful Degradation Matrix

| Scenario | Available | Action | Confidence | Synthesis |
|----------|-----------|--------|-----------|-----------|
| 3/3 ✅   | All       | Normal | 100%      | Full aggregation |
| 2/3 ⚠️   | Sec+Perf  | Continue | 66%     | Adjust weights |
| 2/3 ⚠️   | Sec+UX    | Continue | 66%     | Adjust weights |
| 2/3 ⚠️   | Perf+UX   | Continue | 66%     | Adjust weights |
| 1/3 ❌   | Sec only  | Partial | 33%      | Single-category score |
| 1/3 ❌   | Perf only | Partial | 33%      | Single-category score |
| 1/3 ❌   | UX only   | Partial | 33%      | Single-category score |
| 0/3 ❌   | None      | Abort   | 0%        | No synthesis |

---

## User Communication

**When 2/3 succeed:**
```
✅ Code review complete (partial coverage)

2/3 reviewers completed. Performance and UX analysis available.
Security review failed (timeout). 

Aggregate score: 88/100 (adjusted weights)
Confidence: 66%

View full report: workspace-titlerun/reviews/2026-03-01-2245-unified.md

[ACK by Jeff] Action: [acceptable / retry_security / defer]
```

**When 1/3 succeeds:**
```
⚠️ Code review INCOMPLETE

Only Performance reviewer completed. This is NOT a full 3-AI review.

Performance score: 85/100
Confidence: 33%

Failed reviewers:
- Security: Out of memory
- UX: Invalid output

**Action required:** Debug failures and re-run full review.

[ACK by Jeff] Action: [debug / proceed_with_partial / abort]
```

**When 0/3 succeed:**
```
❌ Code review FAILED

All 3 reviewers failed. No results available.

See error log: workspace-titlerun/reviews/2026-03-01-2245-errors.log

**Immediate action required:** Investigate root cause.

[ACK by Jeff] Action: [debug_now / defer / escalate]
```

---

## Testing Strategy

**Test case 1: Simulate 1 reviewer failure**
```bash
# Spawn 3 reviewers
# After 30s, manually kill security reviewer: subagents kill security-review
# Expected: Review continues with Performance + UX
# Expected: Report shows 66% confidence, adjusted weights
```

**Test case 2: Simulate 2 reviewer failures**
```bash
# Spawn 3 reviewers
# Kill security and UX reviewers
# Expected: Review continues with Performance only
# Expected: Report shows 33% confidence, single-category score
```

**Test case 3: Simulate all failures**
```bash
# Spawn 3 reviewers with invalid file path
# Expected: All 3 fail fast
# Expected: Abort with error log
```

**Test case 4: Retry logic**
```bash
# Spawn reviewer that fails with transient error (simulate rate limit)
# Expected: Automatic retry after 30s
# Expected: Success on 2nd attempt
# Expected: Report annotates retry
```

---

**Status:** Production ready for testing ✅

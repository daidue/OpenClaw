# 3-AI Pipeline Integration Test Plan

**Date:** 2026-03-01
**Target:** tradeEngine.js (ID normalization wrapper)
**Purpose:** Validate 3-AI parallel review pipeline

---

## Test Objectives

1. **Prove 3-AI pipeline works end-to-end**
2. **Compare coverage vs 1-AI review**
3. **Measure token usage and time**
4. **Validate synthesis deduplication logic**
5. **Identify any reviewer-specific blind spots**

---

## Test File Details

**File:** `workspace-titlerun/titlerun-api/src/routes/tradeEngine.js`
**Lines:** ~26 lines
**Complexity:** Low (thin wrapper)
**Components:**
- Import from @titlerun/validation library
- normalizeId function (error-throwing wrapper)
- Module export

**Known characteristics:**
- Recently refactored (2026-02-28)
- Uses external validation library
- Error handling present
- Backward compatibility maintained

---

## Test 1: Baseline 1-AI Review

**Method:** Standard single-agent review (existing v1.0.0)

**Expected focus areas:**
- Error handling
- Input validation
- Library integration
- Edge cases (null, undefined, invalid)
- Documentation quality

**Expected score:** 90-98/100 (simple, well-tested file)

**Estimated tokens:** ~15-20K
**Estimated time:** 3-5 minutes

**Output:** `reviews/2026-03-01-tradeEngine-1ai.md`

---

## Test 2: 3-AI Parallel Review

**Method:** Multi-agent pipeline (workflows/multi-agent-review.md)

**Reviewer 1 - Security:**
- Focus: Input validation, injection risks, type coercion
- Expected findings:
  - Null coercion behavior (== vs ===)
  - Type validation on input
  - Error message information disclosure
  - Library trust (external dependency)

**Reviewer 2 - Performance:**
- Focus: Function efficiency, library overhead, error handling cost
- Expected findings:
  - Function call overhead (wrapper adds layer)
  - Error creation cost (throw new TypeError)
  - Optimization opportunities
  - Library performance characteristics

**Reviewer 3 - UX:**
- Focus: Error messages, developer experience, API clarity
- Expected findings:
  - Error message clarity ("validation failed" too vague?)
  - Function documentation completeness
  - API ergonomics (consistent with rest of codebase?)
  - Developer debugging experience

**Expected synthesis:**
- Deduplication: Error handling might be found by 2+ reviewers
- Coverage: Should find 5-10 unique issues total
- Consensus: 2-3 issues found by multiple reviewers
- Specialist: Each reviewer finds 1-2 unique issues

**Estimated tokens:** ~60K total
- Security: 20K
- Performance: 18K
- UX: 18K
- Synthesis: 12K

**Estimated time:** 10-15 minutes (parallel execution)

**Output:** 
- `reviews/2026-03-01-1912-security.md`
- `reviews/2026-03-01-1912-performance.md`
- `reviews/2026-03-01-1912-ux.md`
- `reviews/2026-03-01-1912-unified.md`

---

## Test 3: Comparison Analysis

**Metrics to capture:**

| Metric | 1-AI | 3-AI | Delta | Notes |
|--------|------|------|-------|-------|
| Total findings | TBD | TBD | TBD | Unique issues found |
| Critical findings | TBD | TBD | TBD | Block-level issues |
| High findings | TBD | TBD | TBD | Pre-deploy fixes |
| Medium findings | TBD | TBD | TBD | Backlog items |
| Low findings | TBD | TBD | TBD | Nice-to-haves |
| Score | TBD | TBD | TBD | Aggregate vs single |
| Tokens used | ~18K | ~60K | ~3.3x | Expected ratio |
| Time (minutes) | TBD | TBD | TBD | Should be similar (parallel) |
| False positives | TBD | TBD | TBD | Noise vs signal |
| Unique insights | - | TBD | - | Issues 1-AI missed |

**Questions to answer:**
1. Did 3-AI find issues 1-AI missed?
2. Which reviewer specialization added most value?
3. Was deduplication effective? (How many duplicates?)
4. Were there reviewer-specific blind spots?
5. Did consensus findings align with known issues?
6. Was the token cost justified by coverage gain?

---

## Test 4: Known-Issue Validation

**Reference:** Check `workspace-titlerun/fixes/` for known tradeEngine issues

**Expected:**
- 3-AI should catch ALL known issues (from past incidents)
- 1-AI might miss some (depending on context loaded)

**Known issues to check for:**
1. Null coercion behavior (`id != null` vs `id !== null`)
2. Error message clarity
3. Library integration assumptions
4. Type safety edge cases

**Validation:**
- [ ] All known issues found by at least 1 reviewer
- [ ] Critical known issues found by 2+ reviewers
- [ ] No false negatives on production incidents

---

## Success Criteria

### Must Pass:
- ✅ All 3 reviewers complete successfully
- ✅ Synthesis generates unified report
- ✅ Aggregate score calculated correctly (weighted)
- ✅ Deduplication identifies at least 1 duplicate
- ✅ Coverage analysis shows consensus + specialist findings
- ✅ No banned phrases in any report
- ✅ All findings have 5 required elements

### Should Pass:
- ✅ 3-AI finds at least 2 issues 1-AI missed
- ✅ Token usage within budget (~60K)
- ✅ Time is comparable to 1-AI (within 2x)
- ✅ Each reviewer finds unique insights
- ✅ Synthesis correctly weights scores

### Nice to Have:
- ✅ Zero false positives
- ✅ All known issues detected
- ✅ Clear recommendation (SHIP/FIX/BLOCK)
- ✅ Coverage analysis identifies blind spots

---

## Execution Plan

### Step 1: Baseline 1-AI Review (5 min)
```bash
# Standard review
openclaw agent --message "Run titlerun-code-review on workspace-titlerun/titlerun-api/src/routes/tradeEngine.js"
```

**Output:** `reviews/2026-03-01-tradeEngine-1ai.md`

### Step 2: 3-AI Review (15 min)
```bash
# Multi-agent review
openclaw agent --message "Run titlerun-code-review mode=3ai on workspace-titlerun/titlerun-api/src/routes/tradeEngine.js"
```

**Spawns:**
1. Security reviewer (subagent)
2. Performance reviewer (subagent)
3. UX reviewer (subagent)
4. Synthesis agent (subagent)

**Outputs:**
- `reviews/2026-03-01-1912-security.md`
- `reviews/2026-03-01-1912-performance.md`
- `reviews/2026-03-01-1912-ux.md`
- `reviews/2026-03-01-1912-unified.md`

### Step 3: Comparison Report (10 min)
```bash
# Generate comparison
openclaw agent --message "Compare reviews/2026-03-01-tradeEngine-1ai.md vs reviews/2026-03-01-1912-unified.md, document in reviews/3ai-comparison-tradeEngine.md"
```

**Output:** `reviews/3ai-comparison-tradeEngine.md`

---

## Rollback Plan

**If 3-AI review fails:**
1. Check subagent logs for errors
2. Validate cognitive profiles exist
3. Ensure workflows loaded correctly
4. Fall back to 1-AI review
5. Document failure mode

**If synthesis fails:**
1. Deliver individual reviewer reports
2. Manual synthesis as fallback
3. Document synthesis failure
4. Fix synthesis.md workflow

**If comparison impossible:**
1. Document qualitatively
2. Note what worked vs. what didn't
3. Identify gaps for v2.0

---

## Risk Assessment

**Low Risk:**
- Small file (26 lines) - easy to review
- Well-tested code - known quality baseline
- Simple logic - clear evaluation criteria

**Medium Risk:**
- First 3-AI pipeline run - may have orchestration bugs
- Synthesis logic untested - deduplication might fail
- Token budget - might exceed 60K on first run

**High Risk:**
- None identified

**Mitigation:**
- Start with small file (tradeEngine.js) ✅
- Have 1-AI fallback ready ✅
- Monitor token usage actively ✅
- Document all failures for v2.0 ✅

---

## Timeline

**Total estimated time:** 30-40 minutes

| Phase | Time | Status |
|-------|------|--------|
| Setup + validation | 5 min | COMPLETE |
| 1-AI baseline review | 5 min | PENDING |
| 3-AI parallel review | 15 min | PENDING |
| Comparison report | 10 min | PENDING |
| Documentation | 5 min | PENDING |

**Expected completion:** 2026-03-01 20:00 EST

---

**Next:** Execute Test 2 (3-AI review) then Test 3 (comparison)

**Status:** Test plan ready — awaiting execution ✅

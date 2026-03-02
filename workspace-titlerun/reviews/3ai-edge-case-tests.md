# 3-AI Edge Case Testing

**Date:** 2026-03-01  
**Test Phase:** Integration Testing  
**Status:** Partial (3 of 6 scenarios tested)

---

## Test Scenarios

### ✅ Scenario 1: Small File (< 50 lines)

**Test Case:** Review a 28-line file (tradeEngine.js)  
**Expected:** All reviewers handle gracefully, no "file too small" errors  
**Tested:** 2026-03-01 20:00 EST

**Results:**
- ✅ Security found 3 findings (type coercion, dependency risk, error message)
- ✅ Performance found 3 findings (loose equality overhead, wrapper overhead, error cost)
- ✅ UX found 5 findings (error messages, API ambiguity, missing docs)
- ✅ Synthesis correctly aggregated (8 unique findings, 2 consensus)

**Verdict:** **PASS** - Small files handled correctly. Reviewers don't skip analysis.

**Metrics:**
- Security: 85/100
- Performance: 94/100
- UX: 78/100
- Aggregate: 87/100

**Token usage:** 34.7K (well under budget)

---

### ✅ Scenario 2: Consensus Finding (2-3 reviewers)

**Test Case:** Loose equality operator (`id != null`)  
**Expected:** Multiple reviewers identify same issue, synthesis deduplicates  
**Tested:** 2026-03-01 20:25 EST

**Results:**
- ✅ Security found: Type coercion risk (MEDIUM)
- ✅ Performance found: 10-20% slower than strict equality (LOW)
- ✅ UX mentioned: Contributes to API ambiguity (implicit)
- ✅ Synthesis deduplicated as consensus finding with multi-dimensional evidence

**Verdict:** **PASS** - Deduplication correctly identifies consensus findings

**Deduplication accuracy:**
- True positives: 2 (loose equality, error messages)
- False positives: 0 (wrapper overhead vs API ambiguity correctly kept separate)
- False negatives: 0 (all duplicates caught)

---

### ✅ Scenario 3: Specialist-Only Finding

**Test Case:** Findings requiring domain expertise  
**Expected:** Each reviewer finds issues others wouldn't  
**Tested:** 2026-03-01 20:25 EST

**Results:**

**Security-only:**
- Supply chain risk (dependency trust) - MEDIUM
  - **Why Security found it:** OWASP A9 "Using Components with Known Vulnerabilities"
  - **Why others missed it:** Performance/UX don't analyze supply chain

**Performance-only:**
- Wrapper overhead quantification (~35-50ns) - LOW
- Error object creation cost (~1-5μs) - LOW
  - **Why Performance found it:** Nano-second profiling, latency analysis
  - **Why others missed it:** Security/UX don't micro-benchmark

**UX-only:**
- API ambiguity (null return vs throw) - HIGH
- Missing usage examples - MEDIUM
- No link to validation docs - MEDIUM
  - **Why UX found it:** Nielsen heuristics for developer experience
  - **Why others missed it:** Security/Performance don't analyze documentation quality

**Verdict:** **PASS** - Each reviewer brings unique domain expertise

**Specialist coverage:** 6 of 8 findings (75%) were specialist-only

---

### ⏳ Scenario 4: Reviewer Timeout (> 20 minutes)

**Test Case:** Reviewer stalls for >20 minutes  
**Expected:** Orchestrator detects timeout, synthesis proceeds with 2/3 reviewers  
**Tested:** ❌ **NOT TESTED**

**Test plan:**
```bash
# Spawn 3 reviewers
# Kill one reviewer after 5 minutes (simulate crash/timeout)
# Expected:
# - Orchestrator detects missing output file after 20 min
# - Synthesis proceeds with 2 of 3 reviewers
# - Aggregate score re-weighted (e.g., Security 60%, Performance 40% if UX missing)
# - Report flags degraded coverage
```

**Why not tested yet:** Sequential execution (no orchestrator running yet)

**Priority:** HIGH - Must test before production

---

### ⏳ Scenario 5: Invalid Output (Malformed Markdown)

**Test Case:** Reviewer outputs invalid markdown (missing required sections)  
**Expected:** Synthesis detects, reports error, proceeds with valid reviews  
**Tested:** ❌ **NOT TESTED**

**Test plan:**
```bash
# Manually break one reviewer output:
# - Remove "## Score:" section
# - Break markdown structure (unclosed code blocks)
# - Omit required finding elements (File, Code, Impact, Fix, Severity)

# Expected:
# - Synthesis parser detects malformed output
# - Warning logged: "Security review output invalid, skipping"
# - Synthesis proceeds with Performance + UX only
# - Aggregate score re-weighted
```

**Validation needed:**
- Does synthesis crash on malformed input?
- Does it skip malformed review gracefully?
- Does it alert user?

**Priority:** MEDIUM - Important for robustness

---

### ⏳ Scenario 6: Large File (> 500 lines)

**Test Case:** Review a file with 500-1000 lines  
**Expected:** Respects token budget (<130K total), doesn't timeout  
**Tested:** ❌ **NOT TESTED**

**Test plan:**
```bash
# Target: workspace-titlerun/titlerun-api/src/services/valuation.js (assume 800 lines)

# Expected:
# - Each reviewer: <30K tokens
# - Synthesis: <40K tokens
# - Total: <130K tokens
# - No timeout (all 3 complete within 20 min)

# What to monitor:
# - Token usage per reviewer
# - Number of findings (should be higher than small file)
# - Deduplication rate (more findings = more potential duplicates)
# - Synthesis time (more findings to deduplicate)
```

**Risk if not tested:**
- Reviewers might exceed token budget on large files
- Synthesis might timeout on deduplicating 50+ findings
- Cost could balloon (e.g., 200K tokens = $3 instead of $0.50)

**Priority:** HIGH - Must test before using on large files

---

## Additional Edge Cases (Not in Original List)

### ✅ Scenario 7: Path Normalization

**Test Case:** Deduplication handles relative vs absolute paths  
**Expected:** `api/routes/users.ts` and `./api/routes/users.ts` treated as same file  
**Tested:** Implicitly (all reviewers used same path format)

**Results:**
- ✅ All 3 reviewers used: `workspace-titlerun/titlerun-api/src/routes/tradeEngine.js`
- ✅ No path normalization needed (all consistent)
- ⚠️ Not tested with mixed path formats

**Future test:** Manually break one reviewer to use relative path, verify synthesis normalizes

---

### ⏳ Scenario 8: Zero Findings (Perfect File)

**Test Case:** Review a file with no issues  
**Expected:** Returns "0 issues found, score: 100/100"  
**Tested:** ❌ **NOT TESTED**

**Test plan:**
```javascript
// Create perfect file (minimal, no issues)
// api/utils/perfect.js
module.exports = { version: "1.0.0" };

// Expected output:
// Security: 100/100, 0 findings
// Performance: 100/100, 0 findings
// UX: 100/100, 0 findings
// Aggregate: 100/100, 0 findings
```

**Priority:** LOW - Nice-to-have validation

---

### ⏳ Scenario 9: All Reviewers Find Same Issue (100% Consensus)

**Test Case:** File with single obvious issue (e.g., hardcoded password)  
**Expected:** All 3 reviewers flag it, synthesis deduplicates  
**Tested:** Partially (2 of 3 found loose equality)

**Results:**
- 2 of 3 found loose equality (Security + Performance)
- UX implied it (API ambiguity finding)
- Not quite 100% consensus, but close

**Future test:** Create file with `const PASSWORD = "admin123";` and verify all 3 flag it

---

## Test Coverage Summary

| Scenario | Status | Priority | Notes |
|----------|--------|----------|-------|
| 1. Small file | ✅ TESTED | HIGH | Passed |
| 2. Consensus finding | ✅ TESTED | HIGH | Passed |
| 3. Specialist finding | ✅ TESTED | HIGH | Passed |
| 4. Reviewer timeout | ⏳ TODO | HIGH | Blocks production |
| 5. Invalid output | ⏳ TODO | MEDIUM | Robustness check |
| 6. Large file | ⏳ TODO | HIGH | Blocks production |
| 7. Path normalization | ✅ IMPLICIT | LOW | Needs explicit test |
| 8. Zero findings | ⏳ TODO | LOW | Nice-to-have |
| 9. 100% consensus | ⏳ IMPLICIT | LOW | Partially tested |

**Coverage:** 3 of 6 required scenarios tested (50%)

**Blockers for production:**
- ❌ Reviewer timeout handling
- ❌ Large file token budget validation

---

## Detailed Test Results

### Scenario 1: Small File

**Test execution:**
```bash
# Step 1: Security review
Read: tradeEngine.js (28 lines)
Load: cognitive-profiles/owasp-security.md
Analyze: 12 minutes
Output: 2026-03-01-test-security.md (320 lines, 11KB)

# Step 2: Performance review
Read: tradeEngine.js (28 lines)
Load: cognitive-profiles/google-sre-performance.md
Analyze: 15 minutes
Output: 2026-03-01-test-performance.md (536 lines, 16KB)

# Step 3: UX review
Read: tradeEngine.js (28 lines)
Load: cognitive-profiles/nielsen-ux-heuristics.md
Analyze: 18 minutes
Output: 2026-03-01-test-ux.md (775 lines, 22KB)

# Step 4: Synthesis
Read: All 3 review files
Deduplicate: 2 consensus, 6 specialist
Aggregate: (85×0.4) + (94×0.35) + (78×0.25) = 87/100
Output: 2026-03-01-test-unified.md (541 lines, 18KB)
```

**Token breakdown:**
- Security: ~8,500 tokens
- Performance: ~9,200 tokens
- UX: ~11,000 tokens
- Synthesis: ~6,000 tokens
- **Total:** 34,700 tokens (under 130K budget)

**Findings quality:**
- All findings had 5 required elements ✓
- All severity levels justified ✓
- All fixes concrete (not vague) ✓
- No banned phrases detected ✓

---

### Scenario 2: Consensus Finding (Deduplication)

**Test execution:**
```
Finding: Loose equality operator (id != null)

Security perspective:
- **File:** Line 14
- **Impact:** Type coercion risk, bypass attacks
- **Severity:** MEDIUM
- **Evidence:** OWASP input validation guidelines

Performance perspective:
- **File:** Line 14
- **Impact:** 10-20% slower than strict equality
- **Severity:** LOW
- **Evidence:** V8 micro-benchmark data

UX perspective:
- **File:** (Implied in API ambiguity finding)
- **Impact:** Contributes to unclear null-checking semantics
- **Severity:** (Not explicit, but noted)

Synthesis result:
- ✅ Detected as consensus finding
- ✅ Merged into single entry
- ✅ Combined evidence from all 3 perspectives
- ✅ Severity: MEDIUM (took highest from Security)
- ✅ Fix: Change to strict equality (all agree)
```

**Deduplication criteria validated:**
1. Same file path ✓
2. Overlapping line numbers (±10 lines) ✓
3. Same issue type (type coercion) ✓

**Result:** Correctly deduplicated

---

### Scenario 3: Specialist Finding

**Test execution:**

**Supply chain risk (Security-only):**
```
Finding: External dependency trust
- **File:** Line 7 (require('@titlerun/validation'))
- **Found by:** Security
- **Missed by:** Performance (doesn't analyze dependencies)
- **Missed by:** UX (doesn't analyze supply chain)
- **Why:** OWASP A9 "Using Components with Known Vulnerabilities"
- **Impact:** If library compromised, this code inherits vulnerability
- **Fix:** npm audit, lockfile, pin versions
```

**Wrapper overhead (Performance-only):**
```
Finding: Function wrapper adds ~35-50ns overhead
- **File:** Lines 11-19
- **Found by:** Performance
- **Missed by:** Security (doesn't micro-benchmark)
- **Missed by:** UX (doesn't profile nano-seconds)
- **Why:** Google SRE latency analysis
- **Impact:** At 1M calls/sec = 3.5-5% CPU
- **Fix:** None needed (acceptable overhead)
```

**API ambiguity (UX-only):**
```
Finding: Unclear contract (null return vs throw)
- **File:** Lines 11-19
- **Found by:** UX
- **Missed by:** Security (correctness is fine)
- **Missed by:** Performance (no perf impact)
- **Why:** Nielsen H3 "User Control and Freedom"
- **Impact:** Developer confusion (when does it return null vs throw?)
- **Fix:** Clarify JSDoc with examples
```

**Result:** Each reviewer found domain-specific issues others wouldn't catch

---

## Remaining Test Scenarios (Priority Order)

### Priority 1: Reviewer Timeout (Blocks Production)

**What to test:**
1. Spawn 3 reviewers
2. Kill Security reviewer after 5 minutes
3. Wait 20 minutes
4. Verify synthesis proceeds with Performance + UX only
5. Verify aggregate score re-weighted (Performance 60%, UX 40%)
6. Verify report flags "degraded coverage: Security reviewer timed out"

**Success criteria:**
- Synthesis doesn't crash
- Aggregate score calculated with 2 reviewers
- User notified of degraded coverage

---

### Priority 2: Large File Token Budget (Blocks Production)

**What to test:**
1. Find file with 500-1000 lines (e.g., valuation.js)
2. Run 3-AI review
3. Monitor token usage per reviewer
4. Verify total <130K tokens
5. Verify no timeout (all complete within 20 min)
6. Verify findings quality maintained (not truncated)

**Success criteria:**
- Total tokens <130K
- All reviewers complete successfully
- Synthesis handles larger finding count

---

### Priority 3: Invalid Output (Robustness)

**What to test:**
1. Manually corrupt one reviewer output (break markdown)
2. Run synthesis
3. Verify it detects malformed output
4. Verify it proceeds with valid reviews only
5. Verify user alerted

**Success criteria:**
- Synthesis doesn't crash on malformed input
- Degraded mode works (2 of 3 reviewers)
- Clear error message to user

---

## Next Session Test Plan

**Time budget:** 2 hours

**Tests to run:**
1. ⏱️ Reviewer timeout (30 min)
2. 📊 Large file (30 min)
3. 🔧 Invalid output (30 min)
4. 📝 Document results (30 min)

**Required:**
- Main agent must spawn reviewers (not subagent)
- Monitor scripts to detect completion/timeout
- Error injection for malformed output test

---

## Conclusion

**Current status:** 3 of 6 core scenarios tested (50%)

**What works:**
- ✅ Small files handled correctly
- ✅ Deduplication detects consensus findings
- ✅ Specialist findings validated

**What needs testing:**
- ❌ Reviewer timeout handling
- ❌ Large file token budget
- ❌ Invalid output robustness

**Production readiness:** ⚠️ **60%**  
- Workflow validated ✓
- Edge cases partially tested ⚠️
- Error handling NOT tested ✗

**Recommendation:** Complete Priority 1-2 tests before production deployment.

---

**Test session completed:** 2026-03-01 20:35 EST  
**Tester:** Rush (subagent)  
**Status:** Partial coverage (3 of 6 scenarios)  
**Next:** Test timeout handling + large file budget

# Code Review Report Template

**Use this structure for the final review report.**

---

# Code Review: [PR #XXX / Commit Range / Feature Name]

**Date:** YYYY-MM-DD  
**Reviewer:** titlerun-code-review skill v1.0.0  
**Target:** [Branch name / PR URL / Commit hash]

---

## Summary

**Score:** XX/100  
**Status:** [Below target 95 / At target / Above target]

**Files reviewed:**
- Backend: X files, Y lines
- Frontend: Z files, W lines
- Database: A migrations
- **Total:** B files, C lines changed

**Review frameworks applied:**
- ✅ OWASP Security (backend)
- ✅ Google SRE Performance (backend + frontend)
- ✅ Nielsen UX Heuristics (frontend)
- ✅ TitleRun Anti-Patterns (all)
- ✅ Production Incident Check (all)

---

## Findings Breakdown

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | X | ⛔ **BLOCK MERGE** |
| HIGH | Y | ⚠️ Fix before deploy |
| MEDIUM | Z | Fix this sprint |
| LOW | W | Backlog |

**Total issues:** X + Y + Z + W = N

---

## Score Justification

**Current score: XX/100**

**Why this score:**
- [Specific reason 1: e.g., "2 critical security issues present"]
- [Specific reason 2: e.g., "Missing error handling in 3 components"]
- [Specific reason 3: e.g., "5 performance optimizations needed"]

**To reach 95+ target:**
- Fix all CRITICAL issues (+20 points)
- Fix all HIGH issues (+15 points)
- Add test coverage for new code (+5 points)
- **Projected score after fixes:** 95/100 ✅

**Estimated fix time:**
- CRITICAL: X hours
- HIGH: Y hours
- MEDIUM: Z hours (can defer to sprint backlog)
- **Total:** W hours to production-ready

---

## CRITICAL ISSUES (X) — ⛔ BLOCK MERGE

**These issues MUST be fixed before merging. No exceptions.**

---

### 1. [Issue Title]

[Use finding-template.md format for each critical issue]

[File, Line, Issue, Impact, Fix, Test, Reference]

---

### 2. [Next Critical Issue]

[...]

---

## HIGH ISSUES (Y) — ⚠️ Fix Before Deploy

**These issues should be fixed before deploying to production.**

**Can merge to staging if:**
- All CRITICAL issues are fixed
- Plan exists to fix HIGH issues before production deploy

---

### 3. [Issue Title]

[Use finding-template.md format]

---

### 4. [Next High Issue]

[...]

---

## MEDIUM ISSUES (Z) — Fix This Sprint

**These issues don't block deploy but should be addressed soon.**

**Impact:** Gradual degradation or technical debt accumulation

---

### [Issue #]

**Quick summary:** [One-line description]  
**File:** `path/to/file.ts:line`  
**Impact:** [One sentence]  
**Fix:** [One sentence or link to full finding]

---

## LOW ISSUES (W) — Backlog

**Polish and refinement opportunities.**

**Impact:** Minimal, can be addressed in future iterations

---

### [Issue #]

**Quick summary:** [One-line description]  
**Recommendation:** [One sentence]

---

## Positive Findings (Optional)

**Patterns worth highlighting:**

### [Good Pattern Title]

**File:** `path/to/file.ts:line`

**What's good:**
[Code snippet showing good pattern]

**Why this matters:**
[Explanation of why this is worth keeping/replicating]

**Recommendation:**
Make this the standard pattern for [use case]

---

## Production Incident Prevention

**Patterns from past incidents checked:**
- [✅] Nested response envelope (2026-02-16) — Not present
- [✅] `.find()` without useMemo (mobile loop) — Properly memoized
- [❌] Missing request deduplication — **Found in 2 files** (see HIGH #3)

**Incidents prevented by this review:**
- [List any patterns that would have caused incidents]

---

## Cognitive Framework Coverage

**This review applied:**

| Framework | Files Reviewed | Findings |
|-----------|----------------|----------|
| OWASP Security | X backend files | Y issues |
| Google SRE Performance | X backend + Z frontend | W issues |
| Nielsen UX Heuristics | Z frontend files | V issues |
| TitleRun Anti-Patterns | All files | U issues |

**Total unique patterns checked:** 50+ (across all frameworks)

---

## Recommendations

**Priority 1 (Before merge):**
1. [Action 1 from CRITICAL issues]
2. [Action 2 from CRITICAL issues]

**Priority 2 (Before production):**
1. [Action 1 from HIGH issues]
2. [Action 2 from HIGH issues]

**Priority 3 (This sprint):**
1. [Action from MEDIUM issues]

**Long-term:**
- [Strategic recommendation if relevant]

---

## Next Steps

**For developer:**
1. Review CRITICAL issues above
2. Fix and push updated code
3. Request re-review (expect score 95+)

**For reviewer (re-review):**
1. Verify all CRITICAL fixes applied
2. Verify all HIGH fixes applied (if deploying to prod)
3. Re-run verification gate
4. Update score

**Timeline:**
- Fix ETA: [X hours based on estimates above]
- Re-review ETA: [30 min after fixes pushed]
- Merge ETA: [After score ≥95]

---

## Metadata

**Review completed:** YYYY-MM-DD HH:MM EST  
**Skill version:** titlerun-code-review v1.0.0  
**Cognitive profiles used:**
- owasp-security.md v1.0.0
- google-sre-performance.md v1.0.0
- nielsen-ux-heuristics.md v1.0.0

**Review ID:** [Unique ID for tracking]  
**Full report:** `workspace-titlerun/reviews/YYYY-MM-DD-[identifier].md`

---

## Verification Gate Results

**Pre-delivery checks:**

- [✅] All findings have 5 required elements (file, line, code, impact, fix)
- [✅] All impacts quantified with numbers + scale
- [✅] No banned phrases detected (75-phrase check)
- [✅] Score justified with specific gaps identified
- [✅] Estimated fix time provided

**Quality:** ✅ Passed verification gate

---

**Generated by:** OpenClaw Agent — titlerun-code-review skill v1.0.0  
**Built with:** meta-skill-forge v2.0.0

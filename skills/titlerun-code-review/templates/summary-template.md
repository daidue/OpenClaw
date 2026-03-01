# Summary Template

**Use this format for Jeff's inbox summary (brief version of full report).**

---

## [CODE REVIEW] [PR #XXX / Feature Name] — Score: YY/100

**Status:** [⛔ Below target 95 / ✅ At target / 🎯 Above target]

**Files reviewed:** X files, Y lines changed  
**Date:** YYYY-MM-DD

---

### Issue Counts

| Severity | Count | Action Required |
|----------|-------|----------------|
| CRITICAL | X | ⛔ **BLOCK MERGE** |
| HIGH | Y | ⚠️ Fix before deploy |
| MEDIUM | Z | Fix this sprint |
| LOW | W | Backlog |

---

### Action Required

**If score <80 (CRITICAL threshold):**
```
🚨 URGENT — HALT FEATURE WORK

Score below 80. Critical issues present that could cause:
- [Impact 1: e.g., "Data breach via SQL injection"]
- [Impact 2: e.g., "Production outage from N+1 queries"]

STOP all other work. Fix these issues NOW.

Estimated fix time: X hours
```

**If score 80-94 (HIGH threshold):**
```
⚠️ HIGH PRIORITY — Fix before deploy

Score below target 95. Issues present that will cause problems in production.

Required actions:
1. Fix all CRITICAL issues (X issues)
2. Fix all HIGH issues (Y issues)
3. Request re-review

Estimated fix time: X hours
Score after fixes: ~95/100 ✅
```

**If score ≥95:**
```
✅ APPROVED — Ready to merge

Score at or above target. No blocking issues.

Optional improvements (MEDIUM/LOW) can be addressed in future iterations.
```

---

### Critical Issues Summary

**If CRITICAL issues present:**

1. **[Issue title]** — `file.ts:line`
   - Impact: [One sentence]
   - Fix time: [estimate]

2. **[Next critical issue]** — `file.ts:line`
   - Impact: [One sentence]
   - Fix time: [estimate]

**Total CRITICAL fix time:** X hours

---

### High Issues Summary

**If HIGH issues present:**

1. **[Issue title]** — `file.ts:line`
2. **[Next high issue]** — `file.ts:line`

**Total HIGH fix time:** Y hours

---

### Production Incident Prevention

**Patterns checked:**
- [✅] Pattern 1 — Clean
- [✅] Pattern 2 — Clean
- [❌] Pattern 3 — **Found** (see Issue #X)

**Incidents prevented:** [Count or "None" if all clean]

---

### Next Steps

**Developer actions:**
1. [If CRITICAL: Review full report immediately]
2. [If HIGH: Plan fixes before deploy]
3. [If ≥95: Merge when ready]

**Timeline:**
- Fix ETA: [X hours for CRITICAL + HIGH]
- Re-review: [30 min after fixes]
- Merge: [After score ≥95]

---

### Full Report

**Location:** `workspace-titlerun/reviews/YYYY-MM-DD-[identifier].md`

**Review frameworks applied:**
- OWASP Security
- Google SRE Performance
- Nielsen UX Heuristics
- TitleRun Anti-Patterns
- Production Incident Check

---

### Inbox Action Required

**Jeff:**
- [ ] Read summary above
- [ ] Review full report if score <95
- [ ] ACK this message
- [ ] Route to Taylor if CRITICAL issues present

**Format for ACK:**
```
[ACK by Jeff, YYYY-MM-DD] Action: [reviewing report / escalating to Taylor / approving merge]
```

---

**Generated:** YYYY-MM-DD HH:MM EST  
**Skill:** titlerun-code-review v1.0.0  
**Review ID:** [identifier]

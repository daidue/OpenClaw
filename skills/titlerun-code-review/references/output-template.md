<!-- Summary: Full markdown output template for code review reports with all sections and formatting.
     Read when: Generating the actual review output file for TitleRun commits. -->

# Code Review Output Template

Use this template for all review outputs. Write to: `/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/YYYY-MM-DD-HHmm.md`

**Keep under 10K tokens** — be concise, actionable, link to lines/files.

```markdown
# TitleRun Code Review — [YYYY-MM-DD HH:mm EST]

## Summary
**Commits Reviewed:** [count] ([earliest_hash]...[latest_hash])
**Files Changed:** [count] ([additions] additions, [deletions] deletions)
**Overall Health Score:** XX/100 [🟢 Healthy | 🟡 Needs Attention | 🟠 Concerning | 🔴 Emergency]

---

## 🔴 Critical Issues (Fix Immediately)
*[If none: "None found — excellent!"]*

### [Issue Title]
- **Expert:** [Name]
- **File:** `path/to/file.js` (line XX-YY)
- **Impact:** [Data loss | System crash | Security breach | ...]
- **Fix:** [Specific action to take]

---

## 🟡 Major Issues (Fix This Sprint)
*[If none: "None found."]*

### [Issue Title]
- **Expert:** [Name]
- **File:** `path/to/file.js` (line XX-YY)
- **Impact:** [Incorrect results | Performance degradation | ...]
- **Fix:** [Specific action]

---

## 🟢 Minor Issues (Fix When Convenient)
*[If none: "None found."]*

### [Issue Title]
- **Expert:** [Name]
- **File:** `path/to/file.js` (line XX-YY)
- **Impact:** [Edge case failure | Suboptimal UX | ...]
- **Fix:** [Specific action]

---

## 💡 Improvements Recommended

### High Impact
- **[Recommendation]** — [Expert] — [File] — [Why this matters]

### Medium Impact
- **[Recommendation]** — [Expert] — [File] — [Why this matters]

### Low Impact
- **[Recommendation]** — [Expert] — [File] — [Why this matters]

---

## ✅ What's Working Well
*Celebrate wins — positive reinforcement matters.*

- **[Strength]** — [Expert] — [File/pattern] — [Why this is good]

---

## Expert Breakdown
*Each expert's top finding (or "No issues" if clean)*

1. **Security Architect:** [Top finding or ✅ No issues]
2. **Database Engineer:** [Top finding or ✅ No issues]
3. **Node.js Performance Engineer:** [Top finding or ✅ No issues]
4. **API Design Specialist:** [Top finding or ✅ No issues]
5. **Testing Engineer:** [Top finding or ✅ No issues]
6. **Fantasy Sports Domain Expert:** [Top finding or ✅ No issues]
7. **DevOps/Reliability Engineer:** [Top finding or ✅ No issues]
8. **Data Pipeline Architect:** [Top finding or ✅ No issues]
9. **Bayesian/Statistical Methods Expert:** [Top finding or ✅ No issues]
10. **Frontend/UX Engineer:** [Top finding or ✅ No issues]

---

## Scoring Breakdown
| Category | Count | Deduction |
|----------|-------|-----------|
| Critical Bugs | [N] | -[N×15] |
| Major Bugs | [N] | -[N×8] |
| Minor Bugs | [N] | -[N×3] |
| Security Issues | [N] | -[N×20] |
| **Total Deductions** | | **-[sum]** |
| **Final Score** | | **[100-sum]/100** |

---

## Next Actions for Rush
*Prioritized checklist*

- [ ] **URGENT:** [Critical issue 1]
- [ ] **URGENT:** [Critical issue 2]
- [ ] **This Sprint:** [Major issue 1]
- [ ] **This Sprint:** [Major issue 2]
- [ ] **Backlog:** [Minor issue 1]
- [ ] **Consider:** [High-impact improvement 1]

---

**Review completed at [HH:mm:ss EST] by TitleRun Code Review Panel v1.0**
```

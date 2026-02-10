# Blameless Post-Mortem Template

**Use this template for all S1/S2 incidents and significant mistakes.**

**File:** `shared-learnings/mistakes/YYYY-MM-DD-[incident-name].md`

---

## Incident Summary

**Date:** YYYY-MM-DD  
**Severity:** S1 / S2  
**Duration:** [How long from start to resolution]  
**Impact:** [What broke? How many users/systems affected?]  
**Root Cause:** [One sentence: what fundamentally went wrong]

---

## Timeline (Minute-by-Minute)

| Time (EST) | Event |
|------------|-------|
| 08:00 | [Agent X attempted Y] |
| 08:05 | [Error detected: Z] |
| 08:10 | [Alert sent to Taylor] |
| 08:15 | [Rollback initiated] |
| 08:20 | [System restored] |

---

## Root Cause Analysis (5 Whys)

1. **Why did the incident happen?**  
   [Answer]

2. **Why did that happen?**  
   [Answer]

3. **Why did that happen?**  
   [Answer]

4. **Why did that happen?**  
   [Answer]

5. **Why did that happen?** (Root cause)  
   [Answer]

---

## Contributing Factors

**What else went wrong?** (Not the root cause, but made it worse)

1. [Factor 1]
2. [Factor 2]
3. [Factor 3]

---

## What Went Well

**Successes during incident response:**

1. [What we did right]
2. [What caught the issue quickly]
3. [What limited the blast radius]

---

## Action Items

| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
| 1 | [Specific change to prevent recurrence] | [Agent or Taylor] | YYYY-MM-DD | Open |
| 2 | [Process improvement] | [Agent or Taylor] | YYYY-MM-DD | Open |
| 3 | [Documentation update] | [Agent or Taylor] | YYYY-MM-DD | Open |

---

## Framework Updates

**Changes to AUTONOMOUS.md as a result:**

- [ ] [Specific protocol added/modified]
- [ ] [Guardrail strengthened]
- [ ] [New check added to deployment readiness]

---

## Lessons Learned

**What did we learn?**

1. [Key takeaway]
2. [Key takeaway]
3. [Key takeaway]

**What should other agents know?**

[Advice for agents to prevent similar issues]

---

_Post-mortem completed: YYYY-MM-DD_  
_Blameless: Focus on systems and processes, not individual blame._

---

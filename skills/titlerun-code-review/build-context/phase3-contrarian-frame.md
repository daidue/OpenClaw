# Phase 3: Contrarian Analysis — Code Review Skill

**Engineer AWAY from baseline AI behavior.**

---

## Step 1: The Lazy Version (Baseline AI Code Review)

**What would baseline AI produce if I just said "review this code"?**

### Structure
```markdown
## Code Review Summary

Overall assessment of the code quality with general observations.

### Security
- Generic security suggestions
- Boilerplate recommendations

### Performance
- Vague efficiency comments
- No quantification

### Code Quality
- Style suggestions
- Generic best practices

### Recommendations
- Bullet list of "consider doing X"
- No prioritization

### Score: 85/100
(No justification for score)
```

---

### Vocabulary (Words/Phrases That Scream "AI Wrote This")

**Hedge language:**
- "Consider adding..."
- "You might want to..."
- "This could be..."
- "It would be beneficial to..."
- "Think about..."

**Vague descriptors:**
- "More robust"
- "Better error handling"
- "Improved performance"
- "Enhanced security"
- "Optimized code"

**Generic praise:**
- "Great work!"
- "Nice implementation!"
- "Well done overall!"
- "Solid code!"
- "Good job!"

**Non-specific critiques:**
- "Some issues"
- "A few concerns"
- "Minor problems"
- "Could use improvement"
- "Needs attention"

---

### Assumptions Baked In

**1. All best practices apply universally**
- Example: "Add tests" (without knowing if testing infrastructure exists)

**2. Code review = finding problems**
- Focuses only on negatives
- Misses explaining WHY code is good when it is

**3. Security > everything else**
- Over-emphasizes security
- Under-emphasizes UX and performance

**4. Reader knows the context**
- Refers to "the function" without naming it
- Assumes reader knows which file/line

---

### Feel (What Reading It Is Like)

- **Forgettable** — Could apply to any codebase
- **Unhelpful** — Doesn't tell you HOW to fix issues
- **Generic** — Looks like every other AI code review
- **Wishy-washy** — Lots of "might" and "could", no definitives

---

## Step 2: Banned Patterns (Explicit Prohibitions)

### Forbidden Phrases (75 total)

**Category: Hedge Language (20)**
1. "Consider adding"
2. "You might want to"
3. "This could be"
4. "It would be beneficial"
5. "Think about"
6. "Perhaps consider"
7. "You may wish to"
8. "It might be wise"
9. "Potentially consider"
10. "You could improve"
11. "It's worth considering"
12. "You should probably"
13. "It may be helpful"
14. "Consider implementing"
15. "You might explore"
16. "It could benefit from"
17. "Consider refactoring"
18. "You may want to"
19. "It might help to"
20. "Think about adding"

**Category: Vague Descriptors (20)**
21. "More robust"
22. "Better error handling"
23. "Improved performance"
24. "Enhanced security"
25. "Optimized code"
26. "Cleaner implementation"
27. "More efficient"
28. "Stronger validation"
29. "Better practices"
30. "More maintainable"
31. "Increased reliability"
32. "Greater flexibility"
33. "Improved readability"
34. "More scalable"
35. "Enhanced user experience"
36. "Better structure"
37. "More comprehensive"
38. "Improved architecture"
39. "More elegant solution"
40. "Better organization"

**Category: Generic Statements (20)**
41. "Great work"
42. "Nice implementation"
43. "Well done"
44. "Good job"
45. "Solid code"
46. "Looks good overall"
47. "Some issues"
48. "A few concerns"
49. "Minor problems"
50. "Needs attention"
51. "Could use improvement"
52. "Generally good"
53. "Pretty solid"
54. "Mostly fine"
55. "Not bad"
56. "Fairly clean"
57. "Reasonable approach"
58. "Acceptable solution"
59. "Decent implementation"
60. "Standard practice"

**Category: Non-Specific References (15)**
61. "The function" (name it!)
62. "This file" (which file? path!)
63. "The code" (which line?)
64. "Here" (where is here?)
65. "There" (where is there?)
66. "This section" (which section?)
67. "That part" (which part?)
68. "This area" (which area?)
69. "The implementation" (which implementation?)
70. "This approach" (which approach?)
71. "The logic" (which logic?)
72. "These changes" (which changes?)
73. "The update" (which update?)
74. "This fix" (which fix?)
75. "The modification" (which modification?)

---

### Forbidden Structures

**1. Summary-then-bullets**
```markdown
## Summary
Overall the code is good.

### Issues
- Issue 1
- Issue 2
- Issue 3
```

**Why banned:** No severity, no priority, no action plan

---

**2. Generic section headers without specificity**
```markdown
## Security
Some security concerns to address.

## Performance
Performance could be improved.
```

**Why banned:** Says nothing actionable

---

**3. Bullet lists without severity classification**
```markdown
### Recommendations
- Add error handling
- Improve performance
- Add tests
```

**Why banned:** What's critical? What's nice-to-have?

---

**4. Scores without justification**
```markdown
### Score: 85/100
```

**Why banned:** Why 85? What would make it 95?

---

## Step 3: Required Inversions

**For each banned pattern, here's what's required instead:**

### Inversion 1: Hedge Language → Definitive Statements

❌ **Banned:**
```
"Consider adding input validation"
```

✅ **Required:**
```
**CRITICAL:** Missing input validation allows SQL injection

**File:** `api/routes/users.ts`
**Line:** 47

**Issue:**
No validation on `req.query.search` before database query.

**Impact:**
Attacker can inject SQL, extract all user data.
At production scale (10K users), database compromise = company-ending.

**Fix:**
```typescript
// Add validation
const schema = z.string().max(100).regex(/^[a-zA-Z0-9\s]+$/);
const search = schema.parse(req.query.search);
```

**Test:**
```typescript
expect(() => searchUsers("'; DROP TABLE users--")).toThrow();
```

**Reference:** OWASP A03:2021 - Injection
```

---

### Inversion 2: Vague Descriptors → Quantified Impact

❌ **Banned:**
```
"This could be more efficient"
```

✅ **Required:**
```
**HIGH:** N+1 query pattern causes 50x slowdown

**File:** `api/routes/trades.ts`
**Line:** 89-95

**Issue:**
```typescript
for (const trade of trades) {
  trade.players = await getPlayers(trade.id); // Query in loop!
}
```

**Impact:**
- Current: 101 queries for 100 trades (1 + 100)
- Load time: 5 seconds at 100 trades
- At 1000 trades: 50 seconds (unusable)

**Fix:**
```typescript
const trades = await prisma.trade.findMany({
  include: { players: true } // Single query with join
});
```

**Performance gain:**
- 101 queries → 1 query (101x reduction)
- 5s → 50ms (100x faster)

**Test:**
Verify single query:
```typescript
const queryCount = await countQueries(() => getTrades());
expect(queryCount).toBe(1); // Not 101
```

**Reference:** Google SRE - Query Optimization
```

---

### Inversion 3: Generic Praise → Specific Recognition

❌ **Banned:**
```
"Great work overall!"
```

✅ **Required (when code IS good):**
```
**POSITIVE:** Request deduplication prevents race condition

**File:** `app/hooks/useTrades.ts`
**Line:** 23-35

**What's good:**
```typescript
const inflightRequests = new Map();
if (inflightRequests.has(key)) {
  return inflightRequests.get(key);
}
```

**Why this matters:**
Prevents duplicate API calls when component re-renders rapidly.

**Production incident prevented:**
Without this, mobile users triggered 10+ concurrent identical requests.
This pattern prevents that.

**Learning:**
This is our standard pattern for all data hooks.
Reuse in future implementations.
```

---

### Inversion 4: Non-Specific References → Exact Locations

❌ **Banned:**
```
"The function has an issue"
```

✅ **Required:**
```
**Function:** `calculateTradeValue()`
**File:** `api/utils/valuation.ts`
**Lines:** 127-145
```

---

## Step 4: Verification Tests (Auto-Fail Conditions)

### Test 1: Banned Phrase Check

```python
def check_banned_phrases(review_text):
    banned = [
        "consider adding", "you might want", "this could be",
        "more robust", "better error handling", "improved performance",
        "great work", "nice implementation", "solid code",
        # ... all 75 banned phrases
    ]
    
    for phrase in banned:
        if phrase.lower() in review_text.lower():
            return FAIL(f"Contains banned phrase: '{phrase}'")
    
    return PASS
```

**If ANY banned phrase found → FAIL immediately, rewrite from scratch.**

---

### Test 2: Specificity Check

```python
def check_specificity(finding):
    required_elements = [
        "file_path",      # e.g., "api/routes/users.ts"
        "line_number",    # e.g., 47 or "47-52"
        "code_snippet",   # Actual code shown
        "quantified_impact", # e.g., "at 1K users, causes 5s delay"
        "fix_code",       # Concrete fix with code
    ]
    
    for element in required_elements:
        if element not in finding:
            return FAIL(f"Missing required element: {element}")
    
    return PASS
```

**If ANY finding lacks these 5 elements → FAIL, add specificity.**

---

### Test 3: Quantification Check

```python
def check_quantification(impact_statement):
    # Must contain numbers
    has_numbers = re.search(r'\d+', impact_statement)
    
    # Must reference scale
    has_scale = any(word in impact_statement.lower() for word in [
        "users", "requests", "items", "records", "queries",
        "seconds", "milliseconds", "mb", "gb"
    ])
    
    if not (has_numbers and has_scale):
        return FAIL("Impact not quantified")
    
    return PASS
```

**Examples:**
- ✅ "At 1000 users, causes 5s delay"
- ✅ "101 queries for 100 items"
- ❌ "Causes slowness" (no numbers)
- ❌ "Affects many users" (vague scale)

---

## Step 5: North Star (Contrarian Frame Summary)

**This skill's differentiation strategy:**

### We Engineer AWAY From:
- Hedge language → Definitive statements
- Vague descriptors → Quantified impact
- Generic praise → Specific recognition or silence
- Non-specific references → File + line + code

### We Engineer TOWARD:
- Every finding has 5 required elements (file, line, code, impact, fix)
- Every impact is quantified with numbers + scale
- Every banned phrase is a verification failure
- Every code example is concrete, not described

### Verification:
**Does this review contain ANY banned phrase?**
- If YES → FAILED, rewrite
- If NO → Check specificity
  - If ANY finding lacks 5 elements → FAILED, add details
  - If ALL findings have 5 elements → Check quantification
    - If ANY impact isn't quantified → FAILED, add numbers
    - If ALL impacts quantified → PASSED

---

## Deliverable: Contrarian Frame Document

**Lazy version:** Documented (structure, vocabulary, assumptions, feel)

**Banned patterns:** 75 forbidden phrases + 4 forbidden structures

**Required inversions:** 4 categories with before/after examples

**Verification tests:** 3 auto-fail checks (banned phrases, specificity, quantification)

**North star:** Specificity + quantification = differentiation from baseline

**Phase 3 complete:** ✅

**Next:** Phase 4 - Architecture Decisions

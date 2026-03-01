# Banned Phrases — Verification Gate

**75 forbidden phrases that indicate baseline AI behavior.**

If review contains ANY of these → **FAILED**, rewrite from scratch.

---

## Category 1: Hedge Language (20 phrases)

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

---

## Category 2: Vague Descriptors (20 phrases)

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

---

## Category 3: Generic Statements (20 phrases)

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

---

## Category 4: Non-Specific References (15 phrases)

61. "The function" (always name it!)
62. "This file" (which file? exact path!)
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

## Auto-Fail Detection

**If review contains ANY of these 75 phrases → FAILED immediately**

No second chances. Rewrite from scratch using stronger contrarian frame.

---

## Why These Are Banned

**Hedge language:** Makes review non-actionable ("consider" = maybe? required?)

**Vague descriptors:** Impossible to measure ("more robust" = how much more?)

**Generic statements:** Could apply to any codebase (not TitleRun-specific)

**Non-specific references:** Reader has to hunt for what you mean

---

## Required Replacements

**Instead of hedge language:** Definitive statements
- ❌ "Consider adding validation"
- ✅ "CRITICAL: Missing validation allows SQL injection"

**Instead of vague descriptors:** Quantified impact
- ❌ "This could be more efficient"
- ✅ "HIGH: N+1 pattern causes 50x slowdown (5s → 100ms fix)"

**Instead of generic statements:** Specific recognition or silence
- ❌ "Great work overall!"
- ✅ [Say nothing OR call out specific pattern worth keeping]

**Instead of non-specific references:** Exact locations
- ❌ "The function has an issue"
- ✅ "`calculateTradeValue()` at `api/utils/valuation.ts:127-145`"

---

**Last updated:** 2026-03-01  
**Version:** 1.0.0  
**Count:** 75 banned phrases total Human: Conversation info (untrusted metadata):
```json
{
  "timestamp": "Sun 2026-03-01 17:42 EST"
}
```

Okay I need to take a break. Let's finish up the final checklist in the morning. Write up a comprehensive audit checklist that I can review tomorrow based on our new meta skill process. This checklist should catch all gaps, bugs, and improvements that need to be made before we ship.

Before you do, summarize what you learned from this exercise, what went well, what didn't, and anything notable
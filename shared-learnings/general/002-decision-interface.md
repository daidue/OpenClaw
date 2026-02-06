# Decision Interface Pattern

**Date:** 2026-02-06
**Source:** Eric Siu's OpenClaw business patterns
**Confidence:** High

## Learning

Every recommendation should force a decision. Dead-end reports waste time.

Bad: "Here are 5 opportunities I found. Let me know what you think."
Good: "Here are 5 opportunities. Reply 'Approve 1,3,5' or 'Reject 2 - too risky'"

## Application

When presenting options to Taylor, always end with:
```
Reply: "Approve [#]" or "Reject [#] - [reason]"
```

When a rejection includes a reason:
1. Log the reason to feedback/
2. Extract the pattern (what made this unacceptable?)
3. Apply to future recommendations

This builds a feedback loop that makes recommendations better over time.

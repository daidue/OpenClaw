<!-- Summary: Implementation details for state management, token budgets, error handling, and delivery workflows.
     Read when: Actually implementing or debugging the code review skill execution. -->

# Implementation Guide

## State Management
Track last review timestamp in:
`/Users/jeffdaniels/.openclaw/workspace-titlerun/.last-review-timestamp`

Format: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)

On each run:
1. Read timestamp (or default to "8 hours ago" if missing)
2. Fetch commits since that timestamp
3. Write current timestamp after successful review

## Token Budget
- **Commit fetch & file read:** ~2K tokens
- **Expert analysis (10 experts):** ~6K tokens
- **Synthesis & output:** ~2K tokens
- **Total target:** <10K tokens

**Optimization strategies:**
- Truncate files >500 lines (note in output)
- Focus on changed lines ±10 context (not full file)
- Experts provide top 3 findings max
- Aggregate duplicate findings across experts

## Error Handling
- **No commits found:** Exit gracefully, log to memory, don't fail
- **Git errors:** Log, notify Jeff, skip review
- **File read errors (deleted files, binary):** Note in output, continue
- **gh CLI auth failure:** Alert Jeff immediately (cron will fail repeatedly)

## Delivery
**Automatic reviews (cron):**
Write to Jeff's inbox: `/Users/jeffdaniels/.openclaw/workspace/inboxes/jeff-inbox.md`
```markdown
## [YYYY-MM-DD HH:mm] TitleRun Code Review Complete
**From:** Rush (via titlerun-code-review skill)
**Score:** XX/100 [🟢/🟡/🟠/🔴]
**Critical Issues:** [N]
**Full Report:** `/Users/jeffdaniels/.openclaw/workspace-titlerun/reviews/YYYY-MM-DD-HHmm.md`

[If score <95: Tag agent to fix before continuing]
```

**On-demand reviews (Rush):**
Return summary + link to full report in response.

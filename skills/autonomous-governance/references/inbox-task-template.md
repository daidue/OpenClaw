<!-- Summary: Standard format for inter-agent inbox messages with metadata and action fields.
     Read when: Writing a message to another agent's inbox or parsing incoming tasks. -->

# Inbox Task Template

Standard format for all inter-agent inbox messages.

```markdown
## [TYPE] — [Title]
**From:** [Agent Name]
**Priority:** [URGENT / HIGH / NORMAL]
**Date:** YYYY-MM-DD

### Description
[What to do — be specific, actionable]

### Success Criteria
[How to know it's done — measurable outcomes]

### Context
[Any relevant background, links, prior decisions]
```

## Types
- **TASK** — Work to be done
- **DECISION** — Decision needed from recipient
- **FYI** — Information only, no action required
- **BLOCKER** — Something is blocked, need help
- **MILESTONE** — Achievement/completion notification

## Processing Protocol
- ACK: `[ACK by {name}, YYYY-MM-DD] Action: [what you're doing]`
- READ: `[READ by {name}, YYYY-MM-DD HH:MM]`
- DONE: `[DONE by {name}, YYYY-MM-DD] Result: [outcome]`
- Never delete inbox messages — audit trail
- Process newest first when backlogged
- Archive messages older than 7 days to `inboxes/archive/YYYY-MM.md`

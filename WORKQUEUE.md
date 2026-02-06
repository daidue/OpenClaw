# Work Queue

Tasks for Jeff and the squad. Processed during heartbeats and overnight shifts.

---

## 🌙 Tonight's Queue (Overnight)

Light work for the night shift. Research, drafts, organizing — no heavy generation.

### [ ] Research: Tailscale Setup for Mac Mini
**Priority:** Medium  
**Assigned:** Fury (researcher)  
**Added:** 2026-02-06

Research Tailscale installation and configuration for our Mac mini setup:
- Installation steps for macOS
- Best practices for single-node setup
- How to access the machine remotely via Tailscale
- Any gotchas or security considerations

**Acceptance Criteria:**
- [ ] Clear installation guide written to `shared-learnings/technical/tailscale-setup.md`
- [ ] Recommendation on whether we need Tailscale (we have no public ports currently)

---

### [ ] Research: Command Allowlist for Prompt Injection Protection
**Priority:** Medium  
**Assigned:** Fury (researcher)  
**Added:** 2026-02-06

Research how to implement command allowlists in OpenClaw to protect against prompt injection:
- What exec commands should be allowlisted vs blocked?
- How does OpenClaw's security model work for this?
- Best practices from the community/docs

**Acceptance Criteria:**
- [ ] Summary of OpenClaw's exec security options
- [ ] Recommended allowlist configuration
- [ ] Written to `shared-learnings/technical/command-allowlist.md`

---

## ☀️ Daytime Queue

Tasks for when Taylor's around or needs involvement.

_No daytime tasks queued._

---

## ✅ Completed

Tasks move here when done, with completion date.

_None yet._

---

## ⏸️ Blocked / On Hold

Tasks waiting on external input or dependencies.

_None._

---

## Format Reference

```markdown
### [ ] Task Title
**Priority:** high | medium | low
**Assigned:** Agent name (or "any")
**Added:** YYYY-MM-DD

Description of what needs to be done.

**Acceptance Criteria:**
- [ ] Specific outcome 1
- [ ] Specific outcome 2
```

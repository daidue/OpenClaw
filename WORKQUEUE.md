# Work Queue

Tasks for Jeff and the squad. Processed during heartbeats and overnight shifts.

---

## 🔥 Active Now

### [ ] Mission Control Enhancements
**Priority:** high  
**Assigned:** Jeff + Team  
**Added:** 2026-02-07

Implement and test Mission Control enhancements:

**1. Auto-sync memories on file change**
- Watch `~/.openclaw/workspace/*.md` and `memory/*.md`
- Sync to Convex `memories` table on change
- Options: file watcher daemon, cron job, or API endpoint

**2. Activity logging from OpenClaw actions → Convex**
- Integrate with OpenClaw to capture agent actions
- Log to Convex `activities` table in real-time
- Consider: hooks, middleware, or periodic sync

**3. Add all memory files to search index**
- Sync all .md files from workspace
- Keep index fresh

**4. Test cron jobs firing correctly**
- Verify morning-standup and evening-planning fire on schedule
- Confirm Telegram delivery works

**Acceptance Criteria:**
- [ ] Memory files auto-sync to Convex
- [ ] Agent activities appear in dashboard automatically
- [ ] All workspace .md files searchable
- [ ] Cron jobs fire and deliver correctly

---

## 🌙 Tonight's Queue (Overnight)

_No overnight tasks queued._

---

## ☀️ Daytime Queue

_No daytime tasks queued._

---

## ✅ Completed

### [✓] Research: Invoice Tracker Competitive Intel
**Completed:** 2026-02-07  
**Deliverable:** `research/invoice-tracker-competitive-intel.md`

### [✓] Research: Tailscale Setup for Mac Mini
**Completed:** 2026-02-06  
**Deliverable:** `research/tailscale-setup.md`

### [✓] Research: Command Allowlist for Prompt Injection Protection
**Completed:** 2026-02-06  
**Deliverable:** `research/command-allowlist.md`

### [✓] Mission Control + Convex Integration
**Completed:** 2026-02-07  
**Details:** All 3 pages wired to Convex, data synced

---

## ⏸️ Blocked / On Hold

_None._

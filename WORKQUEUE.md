# Work Queue

Tasks for Jeff and the squad. Processed during heartbeats and overnight shifts.

---

## 🔥 Active Now

### [ ] Mission Control Hardening
**Priority:** critical  
**Assigned:** Fury (research) + Bolt (implementation)  
**Added:** 2026-02-07  
**Review:** `research/mission-control-review.md`

Addressing 4 critical blockers + 6 important issues from Fury's design review.

**Critical Fixes (Bolt):**
- [ ] Convex authentication for daemons (env file + LaunchAgent config)
- [ ] SQLite for activity logging (replacing JSONL cursor to prevent corruption)
- [ ] Proper Convex schema + mutations (memories, activities tables)
- [ ] OpenClaw activity integration (waiting on Fury's research)

**Should Fix (Bolt):**
- [ ] Log rotation (archive when SQLite exceeds 10MB)
- [ ] Startup health checks + ThrottleInterval (prevent crash loops)
- [ ] Error handling (exponential backoff, graceful network failures)
- [ ] Status dashboard (/status page showing daemon health)
- [ ] Sanitize sensitive data in activity logs (scrub API keys, tokens)
- [ ] Rollback documentation
- [ ] Setup/teardown scripts for daemon installation

**Research (Fury):**
- [x] Verify OpenClaw activity logging feasibility ✅
- [x] Deliverable: `research/openclaw-activity-integration.md` ✅

**Acceptance Criteria:**
- [ ] Daemons authenticate with Convex properly
- [ ] Activity logging uses atomic SQLite (no cursor corruption)
- [ ] Convex schema validates correctly
- [ ] Health checks prevent crash loops
- [ ] /status page shows daemon health
- [ ] Rollback procedure documented and tested

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

# TitleRun Launch Roadmap — April 15, 2026

**Date Created:** 2026-03-01  
**Launch Date:** April 15, 2026 (6 weeks)  
**Status:** Phase 1 in progress

---

## Philosophy

**Systems → Product → Distribution**

1. Build the machine right (agent swarm infrastructure)
2. Use the machine to build great product (zero bugs, polished UX)
3. Scale what works (distribution with proven product)

---

## 6-Week Timeline

### **Weeks 1-2: SYSTEMS (March 1-14)**
**Goal:** Build full Elvis-level agent swarm infrastructure

**Deliverables:**
- [x] Task registry (`.clawdbot/active-tasks.json`)
- [x] Deterministic monitoring script (runs every 10 min)
- [ ] Rush as persistent agent (real session, real heartbeat)
- [ ] Worktree isolation for parallel coding agents
- [ ] 3-AI code review pipeline (GitHub Actions)
- [ ] Definition of Done checklist (automated verification)
- [ ] Pattern learning system (`memory/patterns.md`)
- [ ] Mid-task redirection capability
- [ ] Proactive task discovery (Jeff scans GitHub → spawns agents)

**Success Criteria:**
- Jeff can spawn 3+ coding agents in parallel (worktree isolation)
- Monitoring script catches agent failures within 10 min
- Every PR gets 3 AI reviews before human review
- Zero manual babysitting needed (agents run autonomously)

**Time Budget:** $200-300 in tokens

---

### **Weeks 3-4: PRODUCT (March 15-28)**
**Goal:** Zero critical bugs, polished UX, bulletproof core features

**Deliverables:**
- [ ] Weekly dogfood QA sessions (3 total: Mar 15, 22, 28)
- [ ] All critical bugs fixed
- [ ] High bugs < 3
- [ ] Onboarding flow polished (first-time user experience)
- [ ] Mobile responsive (all breakpoints tested)
- [ ] Performance optimized (<300ms interactions)
- [ ] Error states polished (empty states, loading, failures)
- [ ] Trade Builder flawless (core feature)
- [ ] Trade Finder working perfectly
- [ ] Report Cards polished

**Success Criteria:**
- Dogfood QA Week 4 finds <3 high bugs, 0 critical
- Every core workflow tested with video evidence
- New user can complete first trade in <2 min
- Zero console errors on any page
- 100% of automated tests passing

**Time Budget:** $300-400 in tokens (heavy agent spawning for bug fixes)

---

### **Weeks 5-6: DISTRIBUTION PREP + FINAL POLISH (March 29 - April 11)**
**Goal:** Build audience, create launch assets, final QA

**Deliverables:**
- [ ] X content calendar (daily posts for 2 weeks pre-launch)
- [ ] Email list growth strategy (lead magnets)
- [ ] Landing page optimized (titlerun.co with waitlist)
- [ ] Launch announcement drafted
- [ ] Demo videos created (core features)
- [ ] Screenshots for X/landing page
- [ ] Final dogfood QA (verify zero critical bugs)
- [ ] Production deploy tested
- [ ] Monitoring/alerts configured (Sentry, error tracking)
- [ ] Customer feedback pipeline ready (analytics, support)

**Success Criteria:**
- Waitlist: 200+ signups
- X followers: 500+ (organic growth from FF content)
- Landing page: 5%+ conversion rate
- Final QA: 0 critical, 0 high bugs
- Production environment stable

**Time Budget:** $100-200 in tokens (mostly content, final QA)

---

### **Week 7: LAUNCH (April 12-18)**
**Goal:** Go live, onboard first users, monitor closely

**Launch Date: April 15, 2026 (Tuesday)**

**Launch Week Schedule:**
- **April 12 (Sat):** Deploy to production, monitor for 24h
- **April 13 (Sun):** Announce launch date (2 days out)
- **April 14 (Mon):** Ramp hype (X thread, email preview)
- **April 15 (Tue):** 🚀 LAUNCH
  - Email waitlist
  - X launch thread
  - Open registration
- **April 16-18:** Monitor, support early users, collect feedback

**Success Criteria (First Week):**
- 50+ signups
- 10+ active users (completed a trade)
- 2+ paying users (if pricing ready)
- Zero critical bugs reported
- <1 hour response time on support

---

## Phase 1 Detailed Plan (Weeks 1-2)

### **This Week (March 1-7)**

**Monday (March 2):**
- [ ] Test monitoring script with Rush's current session
- [ ] Document task registry format
- [ ] Create template for spawning agents with worktree isolation

**Tuesday (March 3):**
- [ ] Build worktree isolation system
  - Script: `spawn-agent.sh <task-id> <description> <branch>`
  - Creates worktree in `.clawdbot/worktrees/<task-id>`
  - Updates task registry
  - Launches agent in tmux or openclaw session
- [ ] Test with 2 parallel agents

**Wednesday (March 4):**
- [ ] Set up 3-AI code review GitHub Actions
  - Codex reviewer
  - Gemini Code Assist reviewer
  - Claude Code reviewer
- [ ] Create review posting script

**Thursday (March 5):**
- [ ] Create Definition of Done automation
  - Script checks: tests passing, types passing, PR created, CI passing
  - Auto-updates task registry with checkboxes
  - Notifies when ALL checks pass

**Friday (March 6):**
- [ ] Implement pattern learning system
  - `memory/patterns.md` structure
  - Auto-append on task completion
  - Include: what worked, what didn't, prompt patterns

**Saturday-Sunday (March 7-8):**
- [ ] Test full system end-to-end
  - Spawn 3 agents in parallel
  - Monitor via cron
  - Verify all notifications
  - Review patterns learned

---

### **Next Week (March 9-14)**

**Monday (March 9):**
- [ ] Implement mid-task redirection
  - Monitor agent logs in real-time
  - Inject corrections via tmux or process tool
  - Document redirection patterns

**Tuesday (March 10):**
- [ ] Build proactive task discovery
  - Jeff scans GitHub issues daily
  - Spawns agents for bugs/features automatically
  - Updates task registry

**Wednesday (March 11):**
- [ ] Make Rush a persistent agent
  - Create `rush-heartbeat.sh` (runs every 30 min)
  - Rush checks titlerun-api + titlerun-app for issues
  - Spawns coding agents as needed

**Thursday (March 12):**
- [ ] Stress test the system
  - Spawn 5+ agents simultaneously
  - Verify worktree isolation prevents conflicts
  - Check RAM usage, optimize if needed

**Friday (March 13):**
- [ ] Document everything
  - Update AGENTS.md with new architecture
  - Write DEVELOPER-GUIDE.md for the system
  - Create runbook for common tasks

**Saturday-Sunday (March 14-15):**
- [ ] Buffer for fixes/polish
- [ ] Prepare for Phase 2 (product quality)
- [ ] First dogfood QA session scheduled for Sunday March 15

---

## Key Files

| File | Purpose |
|------|---------|
| `.clawdbot/active-tasks.json` | Task registry (all running agents) |
| `.clawdbot/scripts/monitor-agents.sh` | Deterministic monitoring (runs every 10 min) |
| `.clawdbot/scripts/spawn-agent.sh` | Create worktree + launch agent |
| `.clawdbot/scripts/check-done.sh` | Verify Definition of Done |
| `memory/patterns.md` | Pattern learning (what worked/didn't) |
| `LAUNCH-ROADMAP.md` | This file |

---

## Success Metrics

**Week 2 (March 14):**
- ✅ 3+ agents run in parallel without conflicts
- ✅ Monitoring catches failures within 10 min
- ✅ Every PR gets 3 AI reviews
- ✅ Pattern learning captures 5+ insights

**Week 4 (March 28):**
- ✅ Dogfood QA: 0 critical, <3 high bugs
- ✅ Core features work flawlessly
- ✅ New user completes first trade in <2 min

**Week 6 (April 11):**
- ✅ Waitlist: 200+ signups
- ✅ Final QA: 0 critical, 0 high bugs
- ✅ Production deploy stable

**Week 7 (April 18):**
- ✅ 50+ signups first week
- ✅ 10+ active users
- ✅ 2+ paying users

---

**Status:** Phase 1 Day 1 — Task registry + monitoring deployed ✅

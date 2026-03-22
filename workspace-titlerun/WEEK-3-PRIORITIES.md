# Week 3 Priorities — March 22-28, 2026

**Status:** Sunday March 22, 4:40pm EST  
**Launch:** April 15 (24 days)  
**Phase:** Product Quality

---

## Auto-Improve Status (Running Now)

**5 agents active (2-4 hour runtime each):**

1. ⏳ test-optimization (1h elapsed)
2. ⏳ performance-frontend (10 min elapsed)
3. ⏳ accessibility (10 min elapsed)
4. ⏳ error-handling (10 min elapsed)
5. ⏳ code-quality (10 min elapsed)

**Expected completion:** 6-8pm EST (2-4 hours from now)  
**Action:** Review results, merge PRs, deploy improvements

---

## Critical Path (Must Ship This Week)

### 1. Redraft Backend Wiring (Monday-Tuesday)
**Owner:** Rush  
**Time:** 8-12 hours  
**Goal:** Wire redraft frontend to real API endpoints

**Tasks:**
- [ ] Create `/api/redraft/rankings` endpoint (returns UTH-calibrated values)
- [ ] Implement position filtering (QB, RB, WR, TE, FLEX)
- [ ] Add scoring format support (PPR, Half-PPR, Standard)
- [ ] Wire frontend components to new endpoints
- [ ] Test with real draft scenarios
- [ ] Deploy to production

**Success:** Live Draft Companion works with real data

---

### 2. Mobile Optimization Pass (Wednesday)
**Owner:** Rush  
**Time:** 4-6 hours  
**Goal:** All features work perfectly on mobile (320px - 768px)

**Breakpoints to test:**
- [ ] Mobile portrait (320px-375px)
- [ ] Mobile landscape (568px-667px)
- [ ] Tablet portrait (768px)
- [ ] Tablet landscape (1024px)

**Critical flows:**
- [ ] Trade Engine (mobile-first)
- [ ] Report Cards (readable on small screens)
- [ ] Live Draft Companion (usable during draft)
- [ ] Navigation (hamburger menu)

**Success:** Zero horizontal scroll, all buttons tappable (44x44px min)

---

### 3. Error States Polish (Thursday)
**Owner:** Rush  
**Time:** 3-4 hours  
**Goal:** Every possible error shows a helpful, user-friendly message

**Error types:**
- [ ] Empty states (no trades, no players, no data)
- [ ] Loading states (skeletons, spinners)
- [ ] Network errors (offline, timeout, 500)
- [ ] Validation errors (form fields)
- [ ] Auth errors (session expired)

**Success:** Zero technical jargon, all errors actionable

---

### 4. Dogfood QA Session #2 (Friday Evening)
**Owner:** Jeff + Taylor  
**Time:** 1-2 hours  
**Goal:** Find <3 high bugs, 0 critical bugs

**Test scenarios:**
- [ ] New user onboarding (fresh account)
- [ ] Trade Engine (analyze 5 real trades)
- [ ] Report Cards (view 3 different rosters)
- [ ] Live Draft Companion (simulate a draft)
- [ ] Mobile experience (test on iPhone + Android)

**Deliverable:** Video evidence + bug report

---

## Secondary Priorities (Nice to Have)

### Performance Budget Enforcement
- [ ] Bundle size CI check (<500KB gzipped)
- [ ] Lighthouse CI gate (Performance >85)
- [ ] API response time alert (<300ms p95)

### Analytics Integration
- [ ] PostHog or Mixpanel setup
- [ ] Track core actions (trade analyzed, report card viewed)
- [ ] Funnel analysis (signup → first trade)

### Help Content
- [ ] FAQ page (common questions)
- [ ] Onboarding tooltips (first-time user guidance)
- [ ] Empty state CTAs ("Try analyzing a trade")

---

## Deferred to Week 4

**These are important but NOT blocking launch:**

- Advanced filters (trade finder, player search)
- Export/share features (screenshots, links)
- Dark mode polish
- Custom valuations (user overrides)
- League leaderboards

**Rationale:** Launch with core features working perfectly. Add these based on user feedback.

---

## Week 3 Success Criteria

**By Sunday March 29, 6pm EST:**

✅ **Product:**
- Redraft backend wired and working
- Mobile-optimized (all breakpoints)
- Error states polished
- Dogfood QA: <3 high bugs, 0 critical

✅ **Technical:**
- Auto-improve PRs merged
- Performance budget enforced
- Analytics tracking key actions
- All automated tests passing

✅ **Distribution Prep:**
- Landing page copy finalized
- X content calendar drafted (14 posts)
- Waitlist form tested
- Demo video scripts written

---

## Daily Standup Format (For Rush)

**Every morning, 9am EST:**

```markdown
## Rush Standup — YYYY-MM-DD

### Yesterday
- [x] Completed task 1
- [x] Completed task 2
- [ ] Blocked on task 3 (waiting for X)

### Today
- [ ] High priority task 1
- [ ] High priority task 2
- [ ] Medium priority task 3

### Blockers
- None / Waiting on X from Taylor / Need clarification on Y

### Metrics
- Tests: 319/319 passing
- Build time: Xs
- Bundle size: YKB
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Redraft wiring takes longer than expected | Delay Live Draft Companion launch | Start Monday AM, timebox to 12 hours, simplify scope if needed |
| Auto-improve agents find major issues | Delay Week 3 priorities | Review results Sunday night, prioritize critical fixes only |
| Mobile testing reveals UX breaks | Delay launch | Allocate full Wednesday to mobile, use browser DevTools responsive mode + real devices |
| Dogfood QA finds critical bugs | Delay launch | Fix immediately Friday night/Saturday, re-test Sunday |

---

**Next Review:** Sunday March 29, 6pm EST (Week 3 complete)

# TitleRun Product Vision — April 15, 2026 Launch

**Date:** 2026-03-22  
**Launch:** April 15, 2026 (24 days)  
**Status:** Week 3 — Product Quality Phase

---

## Core Vision

**TitleRun is the competitive edge for dynasty fantasy football managers.**

Not a data dump. Not another rankings site. A *competitive tool* that helps you win trades, dominate your league, and have more fun with your friends.

### The Hook: Competing With Friends

**NOT:** "Use our AI/data to get an edge"  
**YES:** "See how your team stacks up. Find trades that help both sides. Make your friends regret undervaluing your guy."

People play dynasty FF to compete with their friends. TitleRun makes that competition more fun, strategic, and social.

---

## Core Features (MVP for April 15)

### 1. Trade Engine ✅ (Production-Ready)
- **Mutual benefit algorithm:** Find trades where both sides win
- **10-source proprietary valuation** (NEVER mention publicly)
- **Trade fairness scoring:** Clear visual feedback
- **Trade history:** Learn from past trades

**Status:** Deployed, tested, working perfectly

### 2. Report Cards ✅ (Production-Ready)
- **Roster health:** See strengths/weaknesses at a glance
- **Positional grades:** QB, RB, WR, TE breakdown
- **Actionable insights:** What to target, what to sell

**Status:** Deployed, tested, working perfectly

### 3. Redraft Rankings 🟡 (90% Complete)
- **Live redraft companion:** Real-time pick value during drafts
- **Mobile-optimized:** Use on your phone during the draft
- **Sync with Sleeper:** Import your league settings

**Status:** Frontend complete, needs backend wiring (Week 3 task)

### 4. Trade Finder ✅ (Production-Ready)
- **Automated trade suggestions:** "You should offer X for Y"
- **League-aware:** Considers your leaguemates' needs
- **One-click sharing:** Send trade proposal directly

**Status:** Deployed, tested, working

### 5. Player Valuations 🔒 (Proprietary)
- **10-source Bayesian model:** KeepTradeCut, DLF, FantasyPros, DynastyNerds, ESPN, Yahoo, Sleeper, CBS, NFL.com, PFF
- **UTH-calibrated:** Uses Undroppable Touch Holdability metric for production-based valuation
- **Position-aware:** Different curves for QB/RB/WR/TE/PICK
- **Age-adjusted:** Decline curves built in

**Status:** Production-ready, SECRET SAUCE

---

## What Makes TitleRun Different

### 1. **Mutual Benefit Focus**
Most trade analyzers tell you if YOU win the trade. TitleRun finds trades where BOTH sides win. This makes you a better trade partner and helps you close more deals.

### 2. **Proprietary Valuation**
10 sources, Bayesian-weighted, production-calibrated. We don't just average rankings. We understand *why* each source matters and weight accordingly.

### 3. **Competitive Social Layer**
Dynasty FF is about competing with friends. TitleRun makes that *fun* instead of stressful. Clear grades, actionable insights, celebrate wins.

### 4. **Dead Simple UX**
No spreadsheets. No overwhelming data. Clean, mobile-first, instant feedback. If it takes more than 3 taps, it's too complex.

---

## Auto-Improve Program Results

**5 autonomous improvement agents running (2-4 hours each):**

### 1. Test Optimization
- **Goal:** Playwright E2E suite 20s → <10s
- **Status:** Running (50 min elapsed)
- **Expected:** Faster CI feedback loop

### 2. Performance
- **Goal:** Bundle 800KB → <500KB, Lighthouse 89 → >90
- **Strategies:** Remove moment.js, code-split routes, lazy-load images
- **Status:** Running (just spawned)

### 3. Accessibility
- **Goal:** Lighthouse a11y 85 → >95, WCAG 2.1 AA compliance
- **Strategies:** Semantic HTML, ARIA labels, keyboard nav, color contrast
- **Status:** Running (just spawned)

### 4. Error Handling
- **Goal:** 100% error boundary coverage, standardized errors, retry logic
- **Strategies:** ErrorBoundary on all routes, user-friendly messages, offline mode
- **Status:** Running (just spawned)

### 5. Code Quality
- **Goal:** TypeScript strict mode, complexity <10, duplication <3%
- **Strategies:** Fix type errors, extract components, simplify logic
- **Status:** Running (just spawned)

**Expected completion:** 2-4 hours  
**Deliverable:** 5 auto-improve PRs with full metrics/reports

---

## Remaining Work (24 Days to Launch)

### Week 3: Product Polish (March 15-28)

**High Priority:**
- [ ] Wire redraft to real endpoints (backend integration)
- [ ] Mobile optimization pass (all breakpoints tested)
- [ ] Error states polish (empty, loading, failures)
- [ ] Performance optimization (<300ms interactions)
- [ ] Weekly dogfood QA (3 sessions total)

**Medium Priority:**
- [ ] Onboarding flow polish (first-time user experience)
- [ ] Settings page improvements (preferences, notifications)
- [ ] Help/FAQ content
- [ ] Analytics integration (track usage patterns)

**Low Priority:**
- [ ] Advanced filters (trade finder, player search)
- [ ] Export/share features (screenshots, links)
- [ ] Dark mode polish

### Week 4: Final QA (March 29 - April 4)

**Critical:**
- [ ] Dogfood QA: 0 critical bugs, <3 high bugs
- [ ] All core workflows tested with video evidence
- [ ] New user can complete first trade in <2 min
- [ ] Zero console errors on any page
- [ ] 100% of automated tests passing

**Nice to Have:**
- [ ] Performance budget enforced (bundle size, Lighthouse)
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Error tracking configured (Sentry)

### Weeks 5-6: Distribution (April 5-11)

**Pre-Launch Content:**
- [ ] X content calendar (daily posts, 2 weeks)
- [ ] Landing page optimized (titlerun.co with waitlist)
- [ ] Email list growth (lead magnets, FF content)
- [ ] Demo videos (Trade Engine, Report Cards, Live Draft)
- [ ] Screenshots for social/landing page

**Pre-Launch Audience:**
- [ ] Waitlist: 200+ signups
- [ ] X followers: 500+ organic (FF Twitter)
- [ ] Landing page: 5%+ conversion
- [ ] Email subscribers: 300+

**Production Readiness:**
- [ ] Monitoring/alerts configured
- [ ] Customer feedback pipeline ready
- [ ] Support system ready (email, Discord)
- [ ] Pricing finalized (if applicable)

### Week 7: Launch (April 12-18)

**Launch Schedule:**
- **April 12 (Sat):** Deploy to production, monitor 24h
- **April 13 (Sun):** Announce launch date (2 days out)
- **April 14 (Mon):** Ramp hype (X thread, email preview)
- **April 15 (Tue):** 🚀 **LAUNCH**
  - Email waitlist
  - X launch thread
  - Open registration
  - Monitor closely
- **April 16-18:** Support early users, collect feedback, iterate

**Success Metrics (First Week):**
- 50+ signups
- 10+ active users (completed a trade)
- 2+ paying users (if pricing live)
- Zero critical bugs reported
- <1 hour response time on support

---

## Feature Priorities (Post-Launch)

### Phase 2 (May 2026): Social + Competitive

- **League Leaderboards:** See how your team ranks in your league
- **Trade History Feed:** Public stream of trades (privacy-aware)
- **Challenge Mode:** "Bet" your friend you'll win the week
- **Rivalry Tracking:** Head-to-head stats with specific opponents

### Phase 3 (June-July 2026): Advanced Tools

- **Custom Valuations:** Override our valuations with your own
- **Dynasty Calculator:** Project future value (rookies, aging vets)
- **What-If Simulator:** Model trades before proposing
- **Power Rankings:** Full league strength analysis

### Phase 4 (Aug 2026+): AI Features

- **Trade Negotiation Bot:** "Counter-offer this trade for me"
- **Waiver Wire Assistant:** "Who should I pick up?"
- **Lineup Optimizer:** "Who should I start this week?"
- **Dynasty Draft Assistant:** Real-time rookie draft help

---

## Metrics & KPIs

### Product Metrics (Weekly)
- **Active users:** # of users who load a page
- **Engaged users:** # of users who complete a core action (trade analysis, report card)
- **Retention:** % of users who return Week 2
- **Core action completion:** % of users who analyze ≥1 trade

### Business Metrics (Monthly)
- **Signups:** Total registered users
- **Conversion:** % of signups → paying (if applicable)
- **Churn:** % of users who stop using
- **NPS:** Net Promoter Score (how likely to recommend)

### Technical Metrics (Daily)
- **Uptime:** % of time API is available
- **P95 latency:** 95th percentile API response time
- **Error rate:** % of requests that fail
- **Lighthouse scores:** Performance, Accessibility, Best Practices, SEO

---

## Positioning & Messaging

### Tagline
**"The competitive edge for dynasty fantasy football."**

### Value Props
1. **Win more trades** — Mutual benefit algorithm finds deals that work for both sides
2. **Dominate your league** — Clear insights into roster strengths/weaknesses
3. **Have more fun** — Competitive social layer makes dynasty more engaging

### Target Audience
- **Primary:** Dynasty FF managers (experienced, 2+ years playing)
- **Secondary:** Redraft players curious about dynasty
- **Demographics:** 25-45, male-skewing, tech-comfortable, competitive

### Competitive Landscape
- **KeepTradeCut:** Trade values only, no mutual benefit focus
- **DynastyLeagueFootball:** Content/community, not a tool
- **FantasyPros:** Broad FF content, not dynasty-specific
- **Sleeper:** League management, not trade analysis

**TitleRun differentiator:** Only tool focused on *mutual benefit trades* with proprietary 10-source valuation.

---

## Open Questions

### Pricing (Decide by April 1)
- **Option 1:** Freemium (free basic, $5/mo premium)
- **Option 2:** Free for now, monetize later (email list growth)
- **Option 3:** One-time payment ($20 lifetime access)

**Recommendation:** Free for now, focus on product-market fit. Monetize once we have 1,000+ users.

### Branding
- **Logo:** Need final version for launch
- **Color scheme:** Current blue/purple, consider refinement
- **Voice:** Friendly, competitive, not overly serious

### Distribution Channels
- **X (Twitter):** Primary channel for FF audience
- **Reddit:** r/DynastyFF (strict self-promotion rules)
- **Discord:** FF Discord servers (organic community building)
- **Podcasts:** Sponsor FF podcasts? (Post-launch if budget allows)

---

## Success Definition

**TitleRun is successful if:**

1. **Users love it:** NPS >50, <5% churn in first 30 days
2. **They use it:** 50%+ of users analyze ≥1 trade per week
3. **It grows:** 10% week-over-week growth in signups
4. **It works:** 99%+ uptime, <200ms p95 latency
5. **It's sustainable:** Path to $5K MRR within 6 months (if monetizing)

---

**Next Review:** March 29 (post-auto-improve results)

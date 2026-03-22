# Rush Inbox

## [TASK] — Trade Builder/Finder: Before/After Roster Display
**From:** Jeff (Taylor request)
**Priority:** HIGH
**Date:** 2026-03-21

### Description
Add before/after roster comparison to **Trade Builder** and **Trade Finder**. When a user is building or evaluating a proposed trade, show their roster BEFORE and AFTER the trade.

**BEFORE (Current Roster):**
- Starters by position
- Key bench players
- Current depth chart

**AFTER (With Proposed Trade):**
- New starters by position (highlight changes)
- New bench composition
- Updated depth chart
- Visual indicators: who's added (green), who's removed (red)

**Visual Treatment:**
- Side-by-side comparison (desktop) OR stacked before/after (mobile)
- Highlight the players involved in the trade
- Show positional impact clearly (e.g., "You lose your RB2, gain a WR1")
- Clean, scannable layout

### Success Criteria
- User can instantly see roster impact before accepting a trade
- Clear visualization of who's coming/going and where they slot in
- Helps users understand depth chart changes (not just value)
- Works in both Trade Builder (manual) and Trade Finder (suggested trades)
- No performance lag when toggling players in/out

### Context
- Trade Builder: User manually constructs trades with drag/drop or selection
- Trade Finder: AI suggests mutual-benefit trades
- Both currently show value analysis and fairness score
- This adds a **roster visualization layer** — see the actual lineup impact

### Technical Notes
- Use existing roster data from Sleeper sync
- Calculate hypothetical roster state: `currentRoster - givingPlayers + receivingPlayers`
- Determine starter vs bench based on league settings (starters, flex, bench)
- Update in real-time as user modifies trade proposal
- Consider caching for Trade Finder (pre-calculate for suggested trades)

### Priority Rationale
HIGH because:
1. Core UX improvement — users need to SEE the trade impact on their roster
2. Differentiates from competitors (most just show value numbers)
3. Helps users make smarter decisions (lineup fit matters as much as value)
4. Complements existing Trade Builder/Finder features

Taylor's instruction: **"Make no mistakes"** — this needs to be accurate, tested, and polished.

---

[ACK by Jeff, 2026-03-21 17:58] Action: Delegated to Rush. Corrected scope (Trade Builder/Finder, not Report Card).

---

## [INFRASTRUCTURE] — Implement Autoresearch Autonomous Improvement System
**From:** Jeff (Taylor directive)
**Priority:** CRITICAL
**Date:** 2026-03-21

### Taylor's Directive
**"I want you to integrate this into everything we do."**

### What This Means
Build the autonomous improvement loop infrastructure based on the Autoresearch pattern. This becomes a core part of how we develop TitleRun — not a one-off experiment.

### Full Design Document
**Location:** `workspace-titlerun/docs/AUTORESEARCH-WORKFLOW-DESIGN.md` (748 lines)

### Implementation Phases

**Phase 1: Core Infrastructure (Week 1-2)**
1. Create `.clawdbot/programs/` directory structure
2. Build `auto-improve.sh` orchestration script
3. Create `improvement-program.md` template system
4. Build metric evaluation framework
5. Integrate with task registry
6. Set up improvement-log.jsonl logging

**Phase 2: Pilot — Test Suite Optimization (Week 2-3)**
1. Create first improvement program: Playwright test optimization
2. Run first autonomous overnight session
3. Review results, iterate on infrastructure
4. Document learnings

**Phase 3: Expand Scope (Week 3-4)**
1. Add performance optimization programs
2. Add accessibility improvement programs
3. Add bundle size reduction programs
4. Create monitoring dashboard

**Phase 4: Production Integration (Week 4-6)**
1. Add to HEARTBEAT.md (Rush daily checks)
2. Create weekly improvement report for Taylor
3. Build PR review workflow for auto-improve branches
4. Document best practices

### Success Criteria
- ✅ Infrastructure runs autonomously overnight
- ✅ Generates PRs with measurable improvements
- ✅ All changes pass through human review
- ✅ Metrics show steady improvement over time
- ✅ No production incidents from auto-improve changes

### Integration Points

**HEARTBEAT.md (Rush):**
```markdown
### Auto-Improve Check (1x daily, evening)
- Review overnight improvement runs
- Check improvement-log.jsonl for results
- Create PRs for successful experiments
- Flag failures for investigation
```

**Task Registry:**
```bash
# Auto-improve runs register as tasks
register-task.sh "auto-improve-tests-2026-03-21" "improvement" "titlerun" "Overnight test optimization"
```

**.clawdbot/programs/ Structure:**
```
.clawdbot/programs/
├── test-optimization.md
├── performance-api.md
├── performance-frontend.md
├── accessibility.md
├── bundle-size.md
└── README.md
```

### Taylor's Approval Required For:
1. Scope boundaries (which files can auto-improve touch?)
2. Budget allocation (token spend for overnight runs)
3. Pilot timing (start next week or wait?)
4. Risk tolerance (how aggressive on production code?)

### Immediate Actions (This Weekend)
1. ✅ Design doc created (748 lines)
2. ⏳ Build core infrastructure (auto-improve.sh, metrics framework)
3. ⏳ Create first improvement program (test optimization)
4. ⏳ Test run (manual, not overnight)
5. ⏳ Review results with Taylor before enabling cron

### Timeline
- **Weekend (Mar 21-22):** Infrastructure build
- **Week of Mar 24:** First manual test runs
- **Week of Mar 31:** First autonomous overnight runs
- **Week of Apr 7:** Expand to 3+ improvement programs
- **Week of Apr 14:** Production-ready for launch

### Budget Impact
- Overnight runs: ~$10-20/night (Sonnet for iterations, Opus for review)
- Expected ROI: 100+ experiments = faster development, better quality
- Taylor approved high spend through March — this fits budget

---

[ACK by Jeff, 2026-03-21 20:22] Action: Delegating infrastructure build to Rush. This is now a core workflow component, not an experiment.

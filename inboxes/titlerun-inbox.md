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

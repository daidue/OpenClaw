# Part 5: Content Automation Pipeline

## The Flow

```
IDEA → DRAFT → REVIEW → APPROVE → SCHEDULE → POST → ANALYZE → LEARN
  ↓      ↓       ↓        ↓         ↓         ↓       ↓        ↓
Auto  Agent  Taylor   Agent     Agent     Agent   Agent   Feedback
scan  write   batch  schedule  publish  monitor   score     loop
```

## Phase-by-Phase

### 1. Ideas (Tier 1 — Autonomous)

**Agents monitor:**
- Trending topics in target audience spaces
- Audience questions (Reddit, forums, comments)
- Competitor activity
- Past performance patterns

**Scoring (0-100):**
- Timeliness: Is this trending now?
- Audience fit: Does our audience care?
- Strategic value: Does this serve goals?

**Saved to:** `content-queue/ideas/YYYY-MM-DD-[topic].md`

### 2. Drafts (Tier 1 — Autonomous)

**Process:**
1. Select high-scoring ideas (>70)
2. Research (check facts, find sources)
3. Generate platform-specific drafts (X = 280 char, LinkedIn = longer)
4. Self-review against brand guidelines
5. Move to review queue

**Saved to:** `content-queue/review/[draft-id].md`

### 3. Review (Human — Taylor)

**Batch review 2-3x per week (~15 min per session):**

**Taylor actions:**
- ✅ **Approve** → Moves to approved queue
- ✏️ **Edit + Approve** → Agent applies edits → approved queue
- ❌ **Reject** → Logged for learning
- 🔄 **Request Revision** → Specific feedback → agent revises

**Agent surfaces:**
- High-priority items first (timeliness, strategic value)
- Context (why this topic, what data supports it)
- Expected performance (based on similar past posts)

### 4. Approved → Posted (Tier 2 — Autonomous)

**Agent:**
1. Schedules for optimal timing per platform
   - Data from `_meta/posting-schedule.json` (updated weekly from performance data)
2. Posts within approved time window
3. Monitors initial response (first 2 hours)

**If negative response:**
- Pause similar content
- Alert Taylor
- Draft incident report

### 5. Analyzed (Tier 1 — Autonomous)

**7 days post-publish, calculate:**

- **Engagement rate:** Likes, comments, shares per view
- **Conversion rate:** Clicks → website, signups, purchases
- **Sentiment:** Positive/neutral/negative ratio

**Saved to:** `posted/YYYY-MM/[post-id]-metrics.json`

### 6. Learned (Tier 1 — Autonomous)

**Performance Feedback Loop (NEW):**

#### Bottom 20% (Underperformers)
- Trigger post-mortem analysis
- **Questions:**
  - Was it topic mismatch?
  - Poor timing?
  - Weak hook?
  - Wrong format?
- **Write to:** `shared-learnings/content/underperformers/YYYY-MM-DD-[topic].md`
- **Tag failure mode** for pattern recognition

#### Top 20% (High Performers)
- Extract success patterns
- **Questions:**
  - What made this work?
  - Can we replicate the format?
  - Was it topic, timing, or hook?
- **Write to:** `shared-learnings/content/winners/YYYY-MM-DD-[topic].md`
- **Extract templates** if format is reusable

**All learnings inform future idea scoring and draft generation.**

---

## Engagement Rules

| Trigger | Action | Tier |
|---------|--------|------|
| Positive mention | Thank-you reply (template-based) | 2 |
| Question we've answered | Helpful reply + link to resource | 2 |
| Complaint or controversy | Escalate to Taylor | 3 |
| Multi-reply thread | Human judgment needed | 3 |
| Negative response to reply | Stop, flag for Taylor | — |

---

## Outreach (Template-Based)

### Process

1. **Taylor pre-approves:**
   - Outreach templates (3-5 variants per campaign)
   - Target criteria (role, company size, interests)

2. **Agent researches targets:**
   - Recent activity, interests, relevance
   - Must score ≥7/10 on personalization quality
   - Uses documented patterns from past successes

3. **Agent sends:**
   - From template library
   - Fills personalization fields
   - Daily cap: **20 messages max**

4. **Follow-up cadence:**
   - Day 3, Day 7, Day 14
   - **Only after positive signals:**
     - Reply received
     - Profile view
     - Link click
     - "Thanks" or positive keyword

5. **Daily report:**
   - "Sent X outreach (template: Y)"
   - "Z replies so far"
   - "N conversions (meeting booked, customer signed)"

---

## Directory Structure

```
content-queue/
├── ideas/              # Raw ideas, scored, not yet drafted
├── review/             # Drafted, awaiting Taylor's batch review
├── approved/           # Approved, not yet scheduled
├── scheduled/          # Queued for specific posting times
├── posted/YYYY-MM/     # Published archive + performance data
├── rejected/           # Rejected content (for learning)
├── templates/          # Content and reply templates
└── _meta/
    ├── calendar.json              # Themes, campaigns, schedule
    ├── performance-summary.json
    ├── posting-schedule.json      # Platform-specific optimal windows
    └── conversion-funnel.json     # NEW: Reply → Meeting → Customer tracking
```

---

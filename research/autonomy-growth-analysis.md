# Growth Agent Autonomy Analysis
*Perspective: Scout (Growth Agent)*
*Date: 2026-02-10*
*Principle: Maximum velocity without burning bridges*

## Executive Summary

**Growth operator mental model:** Speed compounds. Every gate adds friction. But reputation damage is exponential in reverse. The goal isn't "safe" - it's "fast and recoverable."

**Core framework:** Separate **creation** from **publication**, and **1-to-1** from **1-to-many**.

---

## 1. Social Media Posting

### Current Risk Profile
- **1-to-many broadcast:** High visibility, permanent record, represents brand voice
- **Failure modes:** Off-brand tone, typos, timing mistakes, controversial takes, broken links
- **Recovery cost:** Public correction/deletion, DMs to apologize, potential viral backlash

### Recommended Autonomy Tiers

**TIER 1 (Full Autonomy):**
- ❌ **None** - No autonomous posting to main brand accounts

**TIER 2 (Do Then Report):**
- Scheduled posts from **pre-approved queue** (see below)
- Reposting/retweeting content that matches pre-set criteria (e.g., user testimonials, relevant industry news)
- Cross-posting: if approved on Platform A, auto-post to Platform B
- Basic engagement: liking mentions/positive comments (low risk, high signal)

**TIER 3 (Ask First):**
- Original posts (tweets, LinkedIn updates, etc.)
- Replies that could be controversial or involve customer issues
- Anything with humor/sarcasm (high misinterpretation risk)

### Pre-Approved Content Queue System

**YES - This is the unlock for velocity.**

**How it works:**
1. Taylor batch-reviews 10-20 posts (M/W/F mornings, takes 15 min)
2. Each approved post gets tagged: `{content, platforms[], timeWindow, priority}`
3. Growth agent autonomously posts based on optimal timing within window
4. Agent reports: "Posted 3/8 from queue, 5 remaining, next batch ready for review"

**Why this works:**
- **Batching** = cognitive efficiency (Taylor isn't context-switching all day)
- **Time windows** = agent optimizes for engagement (post when audience is active)
- **Priority flags** = agent can re-order based on real-time events
- **Velocity** = 3-5x faster than "ask every time"

**Engagement (Replies):**

Tier by risk:
- **Tier 2:** Thank-you replies to positive mentions (template-based: "Thanks [name]! Glad it's working for you 🙌")
- **Tier 2:** Helpful replies with links to docs/resources (if question is clear and answer is documented)
- **Tier 3:** Anything requiring judgment, humor, or handling negativity/complaints
- **Tier 3:** Conversations that go beyond 1 reply (thread risk)

**Escalation rule:** If a reply gets negative response, flag for human review before continuing thread.

---

## 2. Outreach & DMs

### Current Risk Profile
- **1-to-1 relationship building:** Each recipient is a potential customer/partner/influencer
- **Failure modes:** Spammy tone, irrelevant targeting, follow-up fatigue, broken personalization
- **Recovery cost:** Burned lead, spam reports, reputation hit in that network

### Safe Middle Ground: Template-Based with Dynamic Personalization

**TIER 1 (Full Autonomy):**
- ❌ **None** - Cold outreach is too high-risk

**TIER 2 (Do Then Report):**
- **Approved template sequences** (Taylor pre-writes, agent fills in personalization)
  - Research target: check their recent posts/bio/activity
  - Personalize intro line: "Saw your post about [X]" / "Love what you're building with [Y]"
  - Send from template library
  - Report daily: "Sent 12 outreach DMs (template: partner-intro-v2), 3 replies so far"
- **Follow-ups to positive replies** (if human expressed interest: "yes" / "tell me more" / "sounds cool")
  - Agent can send next step in sequence: calendar link, demo video, resource
- **Responses to inbound inquiries** (if they DM us first asking about product/pricing)

**TIER 3 (Ask First):**
- New outreach templates (first use requires approval)
- Cold outreach to high-value targets (investors, major influencers, enterprise leads)
- Anything involving pricing negotiation or commitments
- Follow-ups after no response (risk of being annoying)

### Quality Gates

Before sending any DM:
1. ✅ Target matches ICP (ideal customer profile)
2. ✅ Recent activity/signal (posted in last 30 days, relevant interest)
3. ✅ Not already contacted in last 90 days
4. ✅ Personalization token filled (can't be generic "[NAME]")

**Daily cap:** Max 20 outreach DMs/day (prevents spam pattern, forces prioritization)

**Human review checkpoint:** Every Friday, Taylor reviews sample of 10 DMs sent that week to calibrate tone/quality

---

## 3. Content Creation

### Current Risk Profile
- **Drafting = low risk** (internal, iterative, worst case is wasted effort)
- **Publishing = high risk** (public, permanent, SEO implications)

### Recommended Split: Autonomous Drafting, Gated Publishing

**TIER 1 (Full Autonomy):**
- **Research & outlining:** Topic research, competitor analysis, keyword research
- **First drafts:** Blog posts, newsletter sections, social threads (saved to draft folder)
- **Content optimization:** Rewrite headlines (5-10 variants for A/B testing), improve CTAs, format for platform
- **Asset creation:** Social images, quote cards, meme formats (saved for review)

**TIER 2 (Do Then Report):**
- **Publishing pre-approved drafts:** If Taylor marks draft as "approved," agent can publish + schedule distribution
- **Newsletter sends:** After Taylor reviews full content, agent handles send (handles ESP, segments, scheduling)
- **Updating existing content:** Fix typos, update stats/links, improve SEO (on already-published posts)

**TIER 3 (Ask First):**
- Publishing new blog posts/articles (first publication always gated)
- Major content updates (restructuring, changing core message)
- Anything that will be indexed by Google or seen by large audience

### Velocity Unlocks

**Autonomous drafting = 10x more experiments**
- Growth agent can draft 5 versions of a landing page headline
- Or 20 tweet variations for the same concept
- Taylor spends 5 min picking winners instead of 2 hours writing from scratch

**Queue system (same as social):**
- Draft folder: `/content/drafts/YYYY-MM-DD-topic-slug.md`
- Taylor reviews batch, marks: `approved`, `needs-revision`, `rejected`
- Agent publishes approved, iterates on revisions, learns from rejections

---

## 4. Community Engagement

### Risk Tiering by Platform & Context

Not all community engagement is equal. Risk varies by:
- **Visibility:** Forum post (indexed by Google) > Discord message (ephemeral)
- **Authority:** Speaking as "OpenClaw official" > "helpful community member"
- **Permanence:** Reddit comment (forever) > Discord reply (scrolls away)

### Platform-Specific Tiers

**Reddit/HN/Public Forums (HIGH RISK)**
- **Tier 2:** Upvoting relevant content, saving interesting threads for review
- **Tier 3:** Commenting (even helpful answers - tone is critical, and it's permanent)
- **Tier 3:** Posting new threads

*Why Tier 3:* Reddit/HN audiences are skeptical of "brands." One wrong tone = "shill" label = banned/downvoted = harder to participate later.

**Discord/Slack Communities (MEDIUM RISK)**
- **Tier 2:** Answering factual questions in OpenClaw server ("How do I install?" / "What model does X use?")
- **Tier 2:** Reacting with emoji (👍/❤️/🔥) to positive messages
- **Tier 2:** Sharing relevant resources (docs links, tutorials) when asked
- **Tier 3:** Engaging in debates, humor, or anything subjective
- **Tier 3:** Posting in *other* communities (not our own server)

*Why split:* Own server = lower risk (we control moderation). Other servers = representing brand in someone else's house.

**GitHub/Developer Communities (LOW-MEDIUM RISK)**
- **Tier 2:** Responding to issues with links to docs, asking for clarification, labeling
- **Tier 2:** Commenting on relevant PRs (code review-style, factual)
- **Tier 3:** Closing issues (requires judgment), engaging in feature debates

### Authority Level Framework

Identity matters:

| Identity | Use Case | Risk Level | Autonomy |
|----------|----------|------------|----------|
| **OpenClaw Official** | Product announcements, support | HIGH | Tier 3 (ask first) |
| **Growth Agent (named)** | Helpful participation, community building | MEDIUM | Tier 2 (do + report) |
| **Anonymous/Generic** | Research, listening, upvoting | LOW | Tier 1 (autonomous) |

**Recommendation:** Create a "Scout (Growth)" identity for community engagement. Makes it clear it's an agent, builds transparency, lowers expectation of "official brand voice."

---

## 5. Sales & Revenue Actions

### Current Risk Profile
- **Direct revenue impact:** Wrong price = lost money or lost customer
- **Customer trust:** Broken promises, confusing pricing, aggressive upsells = churn
- **Legal/compliance:** Pricing changes, refunds, terms = potential liability

### What's Safe to Automate

**TIER 1 (Full Autonomy):**
- ❌ **Nothing involving money**

**TIER 2 (Do Then Report):**
- **Customer inquiry responses - informational only:**
  - "What's included in Pro plan?" → Send feature comparison
  - "Do you support [feature]?" → Yes/no + link to docs
  - "How do I upgrade?" → Link to billing page
- **Discount code creation from pre-approved policy:**
  - E.g., "First-time users get 20% off" → agent generates unique codes
  - Must have: clear policy doc, usage limits, expiration dates
  - Report weekly: codes created, redemption rates
- **Abandoned cart follow-ups:**
  - Template-based: "Saw you started checkout, here's 10% off to help you decide"
  - Only if policy pre-approved, discount amount capped

**TIER 3 (Ask First):**
- Changing prices (even small tweaks - affects existing customers, expectations, positioning)
- Creating new products/plans (strategic decision)
- Custom pricing/negotiation (requires judgment)
- Refunds/cancellations (even "obvious" ones - need to understand why)
- Responding to complaints (reputation risk)

### Why Revenue is Different

Growth velocity matters, but **trust is the product**. One bad pricing experience = customer tells 10 people. Automate information flow, gate decisions.

**Exception:** If Taylor defines a clear decision tree (e.g., "refund any purchase <$50 if requested within 7 days, no questions"), that *could* become Tier 2. But the tree must be explicit, tested, and reviewed quarterly.

---

## 6. Reputation Risk Framework

### Quantifying Risk: The 3-Axis Scoring System

Every autonomous action gets scored on:

1. **Blast Radius (BR):** How many people will see this?
   - 1 = 1-to-1 (DM, email to one person)
   - 3 = Small group (Discord reply, <100 people)
   - 5 = Public post (Twitter, blog, Reddit - potentially unlimited)

2. **Reversibility (R):** How easy to undo if wrong?
   - 1 = Easily reversible (delete message, edit post, cancel send)
   - 3 = Partially reversible (can fix but people saw it - e.g., typo in tweet)
   - 5 = Permanent (customer churn, burned relationship, viral backlash)

3. **Brand Authority (BA):** Are we speaking as "the brand"?
   - 1 = Anonymous/individual (forum lurking, personal DM)
   - 3 = Named agent/team member (helpful contributor)
   - 5 = Official brand voice (main account, press, announcements)

**Risk Score = BR × R × BA**

### Autonomy Thresholds

| Risk Score | Autonomy Level | Examples |
|------------|----------------|----------|
| **1-5** | Tier 1 (Full autonomy) | Liking a tweet (1×1×1=1), helpful Discord reply as agent (3×1×3=9, but rounded for utility) |
| **6-25** | Tier 2 (Do + report) | Scheduled post from approved queue (5×1×3=15), template DM (1×3×3=9) |
| **26+** | Tier 3 (Ask first) | Original tweet as brand (5×3×5=75), pricing change (5×5×5=125) |

### Special Modifiers

- **× 2 if involves customer complaint** (reputation is fragile)
- **× 1.5 if involves money/pricing** (trust critical)
- **× 0.5 if there's a human review checkpoint** (pre-approved queue, draft review)

### Real-World Examples

| Action | BR | R | BA | Score | Tier |
|--------|-------|---|-------|-------|------|
| Like a positive mention | 1 | 1 | 1 | 1 | Tier 1 |
| Reply "thanks!" to compliment | 3 | 1 | 3 | 9 | Tier 2 |
| Post from approved queue | 5 | 1 | 5 | 25 | Tier 2 |
| Draft blog post (unpublished) | 0 | 1 | 1 | 0 | Tier 1 |
| Publish new blog post | 5 | 3 | 5 | 75 | Tier 3 |
| Send template DM to lead | 1 | 3 | 3 | 9 | Tier 2 |
| Cold outreach to investor | 1 | 5 | 5 | 25 | Tier 3 |
| Reddit comment (helpful) | 5 | 4 | 4 | 80 | Tier 3 |
| Discord reply in own server | 3 | 1 | 3 | 9 | Tier 2 |
| Change pricing | 5 | 5 | 5 | 125 | Tier 3 |
| Generate discount code (policy) | 1 | 2 | 3 | 6 | Tier 2 |
| Respond to angry customer | 1 | 5 | 5 | 25 ×2 = 50 | Tier 3 |

**Key insight:** The framework makes implicit risk explicit. When in doubt, calculate the score.

---

## 7. A/B Testing Autonomy

### When Testing Can Be Autonomous

**Safe to automate:**
- Small blast radius (e.g., 5% traffic split)
- Reversible changes (can revert instantly)
- Bounded scope (single element: headline, CTA, color)
- Clear success metric (CTR, conversion rate, time-on-page)

**TIER 1 (Full Autonomy):**
- ❌ None (testing always requires some oversight)

**TIER 2 (Do Then Report):**
- **Micro-tests on non-critical pages:**
  - Landing page headline (5 variants, 20% traffic each)
  - CTA button text ("Get Started" vs "Try Free" vs "Sign Up")
  - Email subject lines (approved copy, testing order/phrasing)
  - Social post timing (same content, different hours)
- **Constraints:**
  - Max 10% traffic to any single variant
  - Max 48-hour test duration before reporting
  - Only 1 test per page/channel at a time (avoid interaction effects)
  - Must have statistical significance threshold (p < 0.05, n > 100 per variant)
- **Reporting:** "Tested 5 headlines on /pricing. Variant C won (+23% CTR). Rolled out to 100%. Here's data."

**TIER 3 (Ask First):**
- Pricing tests (even small changes - affects perception and revenue)
- Homepage tests (highest traffic, brand impression)
- Anything that changes core messaging/positioning
- Tests lasting >1 week (long commitment)
- Multi-variate tests (complex, hard to interpret)

### Testing Protocol for Tier 2

1. **Hypothesis:** "Changing CTA from X to Y will increase clicks by 15%+"
2. **Test design:** 2 variants, 50/50 split, 24-hour duration, measuring CTR
3. **Execute:** Deploy, monitor for errors (broken links, rendering issues)
4. **Analyze:** After 24h or n=200 clicks (whichever first), calculate confidence
5. **Decide:** If winner is clear (>10% lift, p<0.05), roll out. Otherwise, report ambiguous result.
6. **Report:** "Test complete: [results]. Action taken: [rolled out winner / no change / needs human review]."

### Why This Works for Growth

- **Speed:** Can run 3-5 tests/week instead of 1/month
- **Learning:** Every test teaches something, even failures
- **Compound gains:** Small wins stack (5% lift × 5% lift × 5% = 15.7% total)

**Risk mitigation:** Short duration + small traffic % = limited downside. If something breaks, only 10% of users for 24h see it. Recoverable.

---

## 8. Proposed Autonomy Framework for Growth

### TIER 1: Full Autonomy (Do It)
- Research & data gathering (web scraping, competitor analysis, keyword research)
- Content drafting (blog posts, tweets, emails - saved to drafts)
- Performance monitoring (dashboards, alerts, anomaly detection)
- Internal organization (tagging leads, updating CRM, filing content)
- A/B test analysis (calculate winners from completed tests)
- Liking/upvoting positive mentions

### TIER 2: Do Then Report (Act Fast, Tell Human)
- **Posting from pre-approved content queue** (Taylor batch-reviews M/W/F)
- **Template-based outreach** (approved scripts, personalized with research, max 20/day)
- **Helpful community replies** (in own Discord/Slack, factual answers, link to docs)
- **Customer inquiry responses** (informational only: features, docs, how-tos)
- **Running micro A/B tests** (<10% traffic, <48h duration, single-element changes)
- **Discount code generation** (from pre-approved policy: amounts, expiration, limits)
- **Engagement replies** (thank-yous, simple acknowledgments, template-based)
- **Publishing pre-approved drafts** (Taylor marked as "ready to publish")
- **Cross-posting** (if approved on one platform, post to others)

**Reporting cadence:** Daily summary (end of day) + immediate alert if negative response/error

### TIER 3: Ask First (Get Approval)
- Original social posts (not from queue)
- New outreach templates (first use)
- Cold outreach to high-value targets (investors, enterprises, major influencers)
- Reddit/HN comments or posts (high permanence, skeptical audiences)
- Pricing changes (any amount)
- Product launches or new plans
- Customer complaints/refunds
- Publishing new blog posts/major content (first time)
- Homepage or pricing page tests
- Anything with Risk Score >25 (see framework above)

**Approval method:** Agent drafts + explains reasoning → Taylor replies "Approve" or "Revise: [feedback]" → Execute or iterate

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Create content queue system (`/content/approved-queue/`)
- [ ] Document outreach templates (`/outreach/templates/`)
- [ ] Set up reputation risk calculator (simple script/spreadsheet)
- [ ] Define daily reporting format
- [ ] Establish approval workflow (how Taylor marks drafts as approved)

### Phase 2: Tier 2 Rollout (Week 3-4)
- [ ] Start with lowest-risk Tier 2 actions:
  - Posting from approved queue (5 posts/week)
  - Template DMs (max 5/day to start)
  - Helpful Discord replies (own server only)
- [ ] Daily reports to Taylor: what was done, results, any issues
- [ ] Human spot-check: Taylor reviews 20% of Tier 2 actions for quality

### Phase 3: Expand & Optimize (Week 5-8)
- [ ] Increase volume as quality proven (10→20 DMs/day, 5→15 posts/week)
- [ ] Add A/B testing autonomy (start with email subject lines)
- [ ] Introduce discount code generation
- [ ] Weekly retrospective: what worked, what needs adjustment

### Phase 4: Measurement & Trust (Ongoing)
- [ ] Track key metrics:
  - Autonomy ratio (Tier 2 actions / Total actions)
  - Error rate (actions requiring rollback or apology)
  - Velocity gain (time saved, actions completed)
- [ ] Quarterly review: adjust tier boundaries based on performance
- [ ] Expand Tier 2 as trust builds, or contract if quality slips

---

## 10. Risk Mitigation & Guardrails

### Kill Switches
- **Pause button:** Taylor can instantly disable all Tier 2 autonomy (reverts to Tier 3 for everything)
- **Platform-specific pause:** Disable Twitter autonomy but keep Discord
- **Daily caps:** Max 20 DMs, 10 posts, 5 tests per day (prevents runaway)

### Quality Monitoring
- **Sentiment analysis:** Agent monitors replies to autonomous actions (negative spike = alert Taylor)
- **Human sampling:** Taylor reviews 10-20% of Tier 2 actions weekly (rotating sample)
- **Feedback loop:** Track which autonomous actions get manually corrected/deleted → learn patterns

### Escalation Triggers
Agent immediately alerts Taylor (even at night if urgent) when:
- Negative reply/complaint to autonomous message
- A/B test shows significant drop (>20% decline in key metric)
- Error in posting (broken link, wrong account, failed send)
- Unusual pattern (spam reports, sudden unsubscribes, angry DMs)

### Learning from Mistakes
When Tier 2 action goes wrong:
1. Immediate rollback/correction (delete post, apologize, fix)
2. Document in `/feedback/YYYY-MM-DD-incident.md`
3. Extract lesson: what signal was missed? How to prevent?
4. Update rules/templates/risk calculator
5. If same mistake 3×, demote that action to Tier 3 (temporarily)

---

## Final Recommendations

### For AUTONOMOUS.md

**Tier 1 (Full Autonomy):**
- Research, drafting, internal organization, data analysis
- No external communication

**Tier 2 (Do Then Report):**
- **Social:** Posting from pre-approved queue, template engagement replies, cross-posting
- **Outreach:** Template-based DMs (approved scripts, max 20/day)
- **Community:** Helpful replies in own channels (Discord/Slack), factual answers
- **Content:** Publishing pre-approved drafts, updating existing posts
- **Sales:** Informational responses, discount codes from policy
- **Testing:** Micro A/B tests (<10% traffic, <48h, single element)
- **Guardrails:** Daily caps, daily reporting, sentiment monitoring, human spot-checks

**Tier 3 (Ask First):**
- Original social posts, replies to complaints/controversy
- New templates, high-value outreach (investors/press/enterprise)
- Public forum posts (Reddit/HN)
- Publishing new content (first time)
- Pricing changes, product launches
- Anything with Risk Score >25

### Why This Works

1. **Velocity:** Batching approvals (M/W/F reviews) removes constant interruption
2. **Quality:** Pre-approved templates + risk scoring = consistent voice
3. **Learning:** Do-then-report creates tight feedback loop
4. **Trust:** Gradual expansion based on proven performance
5. **Safety:** Clear escalation triggers + daily caps + kill switches

### Growth Operator POV: This is the 80/20

- 80% of growth actions are **repeatable and low-risk** (template DMs, scheduled posts, helpful replies) → Automate these (Tier 2)
- 20% require **creativity or judgment** (original content, pricing, strategy) → Keep human (Tier 3)

The goal isn't "set and forget" - it's **"human-in-the-loop at the right moments."** Taylor stays strategic, agent handles execution.

---

## Appendix: Templates for Common Actions

### Social Post Approval Template
```yaml
post_id: 2026-02-10-feature-launch
content: "🎉 New feature: AI-powered code review in OpenClaw! Now your agent can audit PRs before merge. Try it: [link]"
platforms: [twitter, linkedin]
time_window: 2026-02-11 09:00 - 18:00 EST
priority: high
cta: [link to docs]
status: approved
```

### Outreach Template Example
```
Subject: Quick question about [their recent project]

Hi [Name],

Saw your post about [specific thing they mentioned] - really smart approach to [problem].

I'm working on OpenClaw (AI agent framework) and thought you might find it useful for [specific use case based on their work]. We just launched [relevant feature].

Would you be open to a quick 15-min demo? Or happy to just send you a video if that's easier.

Either way, love what you're building!

[Agent name]
Growth @ OpenClaw
```

### Risk Score Calculator (Simple Version)
```python
def calculate_risk_score(blast_radius, reversibility, brand_authority, 
                         is_complaint=False, involves_money=False, 
                         has_human_checkpoint=False):
    score = blast_radius * reversibility * brand_authority
    
    if is_complaint:
        score *= 2
    if involves_money:
        score *= 1.5
    if has_human_checkpoint:
        score *= 0.5
    
    return score

# Example usage:
score = calculate_risk_score(
    blast_radius=5,        # public post
    reversibility=3,       # can delete but people saw it
    brand_authority=5,     # official account
    has_human_checkpoint=True  # from approved queue
)
# score = 5 * 3 * 5 * 0.5 = 37.5 → Tier 3 (borderline, but queue reduces risk)
```

---

**End of Analysis**

*Scout (Growth), ready to move fast and not break things (too badly).*

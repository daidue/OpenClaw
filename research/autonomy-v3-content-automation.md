# AUTONOMY v3: Content Automation System Design

**Date:** 2026-02-10  
**Status:** Design Document  
**Purpose:** Practical, implementable automation for content, posts, and outreach

---

## Overview: The Automation Philosophy

**Core Principle:** Agents generate and optimize. Humans approve in batches and set direction.

**Taylor's Role:** 
- Review content 2-3x per week (batch approval)
- Set strategic direction (themes, campaigns, priorities)
- Handle escalations (sensitive replies, complaints, opportunities)
- Review performance reports and adjust strategy

**Agent's Role:**
- Generate content ideas from multiple sources
- Draft posts optimized per platform
- Schedule and publish approved content
- Engage with comments/replies using templates
- Conduct outreach campaigns
- Track performance and learn

---

## 1. Content Creation Pipeline: Idea → Published Post

### The Full Journey

```
[IDEA] → [DRAFT] → [REVIEW QUEUE] → [APPROVED] → [SCHEDULED] → [POSTED] → [ANALYZED]
   ↓         ↓            ↓              ↓            ↓             ↓           ↓
 Auto     Agent      Taylor Batch    Agent       Agent         Agent       Agent
Generate  Writes     Reviews        Schedules    Publishes     Monitors    Learns
```

### Stage-by-Stage Breakdown

#### Stage 1: IDEA (Automated)
**Sources:**
- Trending topics in target communities (Reddit, HN, X)
- User questions/pain points from support channels
- Product updates/releases
- Industry news and competitor activity
- Performance data (what worked before)
- Strategic themes from content calendar

**Process:**
1. Agent monitors sources via heartbeat (2-4x daily)
2. Identifies relevant topics using filters: relevance, engagement potential, strategic fit
3. Creates idea record in `content-queue/ideas/`
4. Scores idea (0-100) based on: timeliness, audience fit, strategic value

**Output:** `content-queue/ideas/YYYY-MM-DD-{slug}.json`

#### Stage 2: DRAFT (Automated)
**Triggers:**
- Idea score >60 and strategic fit
- Manual request from Taylor
- Scheduled content needs (fill gaps in calendar)

**Process:**
1. Agent selects idea from queue
2. Researches topic (web search, past content, audience data)
3. Generates platform-specific drafts
4. Self-reviews against brand guidelines
5. Moves to review queue

**Output:** `content-queue/review/{priority}-{slug}.json`

#### Stage 3: REVIEW QUEUE (Human Batch Review)
**Taylor's Review Interface:**
- Views pending content grouped by priority
- Reviews 10-30 pieces in one sitting
- Actions: Approve / Edit+Approve / Reject / Request Revision

**Review Schedule:** Monday, Wednesday, Friday mornings (flexible)

**Agent Support During Review:**
- Surfaces high-priority items first
- Shows context (why this topic, trending data, strategic fit)
- Provides performance predictions based on similar past content
- Flags any risks (controversial, time-sensitive, technical complexity)

#### Stage 4: APPROVED (Automated Scheduling)
**Process:**
1. Approved content moves to `content-queue/approved/`
2. Agent calculates optimal posting time per platform
3. Content moves to `content-queue/scheduled/`
4. Agent sets up posting job (cron or heartbeat-based)

**Scheduling Algorithm:**
- Platform-specific optimal windows
- Audience timezone analysis
- Avoid clustering (space out similar content)
- Strategic timing (product launches, events)
- Fallback: default platform windows if no data

#### Stage 5: SCHEDULED (Waiting for Post Time)
**Content sits here until posting time arrives**

**Agent Monitors:**
- Time to post
- Any breaking news that invalidates content
- Platform status (is X down?)
- Last-minute edits from Taylor

#### Stage 6: POSTED (Automated Publishing)
**Process:**
1. Agent posts to target platform(s)
2. Records post IDs, URLs, timestamps
3. Moves content to `content-queue/posted/YYYY-MM/`
4. Initializes performance tracking
5. Sets up engagement monitoring

**Multi-Platform Handling:**
- Master content in markdown
- Platform adapters transform content:
  - X: 280 char, hashtags, thread if needed
  - LinkedIn: Professional tone, longer form
  - Reddit: Community-specific adaptation, value-first
  - Substack: Full article with SEO

#### Stage 7: ANALYZED (Continuous Learning)
**Metrics Tracked:**
- Impressions, reach, engagement rate
- Comments/replies (count, sentiment)
- Clicks, conversions (if applicable)
- Share/repost count
- Time-to-peak engagement

**Learning Loop:**
1. Agent collects metrics 24h, 7d, 30d post-publish
2. Compares to benchmarks and predictions
3. Extracts lessons: what worked, what didn't
4. Updates content strategy models
5. Writes learnings to `shared-learnings/content/`

---

## 2. File Structure: content-queue/

```
content-queue/
├── ideas/                          # Raw ideas, not yet drafted
│   ├── 2026-02-10-ai-agent-security.json
│   └── 2026-02-10-local-first-software.json
│
├── review/                         # Drafted, awaiting Taylor's review
│   ├── high-priority-openai-gpt5-news.json
│   ├── medium-local-llm-tutorial.json
│   └── low-weekend-thought-leadership.json
│
├── approved/                       # Approved, not yet scheduled
│   └── ready-to-schedule-[slug].json
│
├── scheduled/                      # Scheduled for specific times
│   ├── 2026-02-11-09-00-x-thread.json
│   └── 2026-02-12-14-30-linkedin-post.json
│
├── posted/                         # Published content archive
│   ├── 2026-01/
│   │   ├── 2026-01-15-successful-launch-post.json
│   │   └── 2026-01-22-viral-x-thread.json
│   └── 2026-02/
│       └── 2026-02-08-reddit-ama-style.json
│
├── rejected/                       # Rejected content for learning
│   └── 2026-02-09-off-brand-attempt.json
│
├── templates/                      # Content templates by type
│   ├── product-launch.md
│   ├── thought-leadership.md
│   ├── tutorial-thread.md
│   └── community-engagement.md
│
└── _meta/
    ├── calendar.json               # Content calendar with themes
    ├── performance-summary.json    # Aggregate metrics
    └── posting-schedule.json       # Platform-specific optimal times
```

### Content Record Schema

```json
{
  "id": "2026-02-10-ai-agent-security",
  "status": "review",
  "created_at": "2026-02-10T08:30:00Z",
  "updated_at": "2026-02-10T09:15:00Z",
  
  "metadata": {
    "title": "How AI Agents Handle Security: Beyond API Keys",
    "slug": "ai-agent-security",
    "priority": "high",
    "platforms": ["x", "linkedin", "reddit"],
    "primary_platform": "x",
    "content_type": "thread",
    "strategic_theme": "product-education",
    "campaign": "february-security-focus"
  },
  
  "source": {
    "type": "trending_topic",
    "origin": "hackernews",
    "url": "https://news.ycombinator.com/item?id=...",
    "relevance_score": 85,
    "reasoning": "High engagement on HN, aligns with OpenClaw's security features"
  },
  
  "timing": {
    "time_sensitivity": "medium",
    "optimal_window_start": "2026-02-11T09:00:00Z",
    "optimal_window_end": "2026-02-12T18:00:00Z",
    "scheduled_for": null,
    "posted_at": null
  },
  
  "content": {
    "master": "content/master-draft.md",
    "adaptations": {
      "x": "content/x-thread.md",
      "linkedin": "content/linkedin-post.md",
      "reddit": "content/reddit-post.md"
    }
  },
  
  "targeting": {
    "audience": ["developers", "indie-hackers", "ai-builders"],
    "tone": "educational-casual",
    "cta": "try-product",
    "cta_url": "https://openclaw.com/security",
    "hashtags": ["AI", "Security", "Automation", "DevTools"]
  },
  
  "review": {
    "reviewed_by": null,
    "reviewed_at": null,
    "feedback": null,
    "revision_count": 0
  },
  
  "performance": {
    "predictions": {
      "x": {"impressions": 5000, "engagements": 250},
      "linkedin": {"impressions": 2000, "engagements": 80}
    },
    "actual": null,
    "lessons_learned": null
  }
}
```

---

## 3. Automated Posting System

### When Does the Agent Post?

**Posting Triggers:**
1. **Scheduled Time Reached** (primary method)
   - Cron job checks `scheduled/` every 5 minutes
   - Posts content when current time >= scheduled_for
   
2. **Opportunistic Posting** (advanced)
   - Breaking news creates immediate opportunity
   - High-value engagement window opens
   - Requires: priority=urgent + approval=auto-approved

3. **Manual Trigger**
   - Taylor: "Post the AI security thread now"
   - Agent confirms and executes

### Optimal Timing Algorithm

**Data Sources:**
1. Historical performance by post time
2. Platform-specific best practices
3. Audience timezone distribution
4. Current trending cycles

**Per-Platform Windows:**

```json
{
  "x": {
    "optimal_windows": [
      {"day": "weekday", "start": "09:00", "end": "11:00", "timezone": "America/New_York", "score": 95},
      {"day": "weekday", "start": "13:00", "end": "15:00", "timezone": "America/New_York", "score": 90},
      {"day": "weekend", "start": "10:00", "end": "14:00", "timezone": "America/New_York", "score": 75}
    ],
    "avoid": [
      {"day": "any", "start": "00:00", "end": "06:00"},
      {"day": "friday", "start": "17:00", "end": "23:59"}
    ]
  },
  
  "linkedin": {
    "optimal_windows": [
      {"day": "tuesday-thursday", "start": "08:00", "end": "10:00", "timezone": "America/New_York", "score": 95},
      {"day": "weekday", "start": "12:00", "end": "13:00", "timezone": "America/New_York", "score": 85}
    ]
  },
  
  "reddit": {
    "optimal_windows": [
      {"day": "weekday", "start": "07:00", "end": "09:00", "timezone": "America/Los_Angeles", "score": 90},
      {"day": "any", "start": "19:00", "end": "22:00", "timezone": "America/Los_Angeles", "score": 85}
    ],
    "notes": "Reddit timing varies heavily by subreddit. Monitor per-community patterns."
  }
}
```

### Multi-Platform Publishing Flow

**Master → Adaptation → Publish**

```
1. Master Content (Platform-Agnostic)
   ├─ Core message
   ├─ Key points (3-5)
   ├─ Supporting data
   ├─ CTA
   └─ Media assets

2. Platform Adaptation (Automated)
   ├─ X: 
   │   ├─ Break into thread (280 char chunks)
   │   ├─ Add hashtags strategically (2-3 max)
   │   ├─ Lead with hook
   │   └─ End with CTA
   │
   ├─ LinkedIn:
   │   ├─ Professional tone
   │   ├─ Longer paragraphs OK
   │   ├─ Industry context
   │   ├─ Ask engaging question at end
   │   └─ Use line breaks for readability
   │
   ├─ Reddit:
   │   ├─ Match subreddit culture
   │   ├─ Value-first (no hard sell)
   │   ├─ Anticipate questions
   │   ├─ Be authentic
   │   └─ Engage in comments immediately
   │
   └─ Substack:
       ├─ Full article format
       ├─ SEO optimization
       ├─ Internal links
       └─ Newsletter-friendly structure

3. Platform-Specific Posting
   ├─ API calls per platform
   ├─ Handle rate limits
   ├─ Capture post IDs/URLs
   └─ Verify successful publication

4. Cross-Platform Linking (Optional)
   ├─ Post on X: "Just published a deep dive..."
   ├─ Share in Reddit: "Wrote this guide..."
   └─ LinkedIn shares Substack article
```

### Approval → Posting → Reporting Workflow

**Workflow Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│ BATCH REVIEW SESSION (Taylor, Mon/Wed/Fri)                  │
│                                                              │
│ Review Queue: 15 items                                       │
│ ┌──────────────────────────────────────┐                   │
│ │ [1] AI Security Thread (HIGH)        │                   │
│ │     X + LinkedIn, Feb 11 9am         │                   │
│ │     [Approve] [Edit] [Reject]        │ ←─ Taylor clicks │
│ └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                    ↓ APPROVE
┌─────────────────────────────────────────────────────────────┐
│ AGENT: Scheduling Engine                                    │
│                                                              │
│ 1. Move to approved/                                         │
│ 2. Calculate optimal post time                               │
│    - Check platform windows                                  │
│    - Avoid conflicts with other scheduled posts              │
│    - Result: Feb 11, 9:15am EST                             │
│ 3. Create scheduled record                                   │
│ 4. Set up cron job or heartbeat reminder                     │
└─────────────────────────────────────────────────────────────┘
                    ↓ WAIT FOR SCHEDULED TIME
┌─────────────────────────────────────────────────────────────┐
│ AGENT: Publishing Engine (Feb 11, 9:15am)                   │
│                                                              │
│ 1. Load scheduled content                                    │
│ 2. Apply platform adaptations                                │
│ 3. POST to X API (thread, 8 tweets)                         │
│    └─ Success: IDs [123, 124, 125...]                       │
│ 4. POST to LinkedIn API                                      │
│    └─ Success: ID [abc123]                                   │
│ 5. Move to posted/2026-02/                                   │
│ 6. Update record with post IDs, URLs                         │
│ 7. Initialize performance tracking                           │
└─────────────────────────────────────────────────────────────┘
                    ↓ MONITOR PERFORMANCE
┌─────────────────────────────────────────────────────────────┐
│ AGENT: Analytics Engine                                     │
│                                                              │
│ Collection Schedule:                                         │
│ - 1 hour post: Early engagement                             │
│ - 24 hours: First-day performance                            │
│ - 7 days: Week-long reach                                    │
│ - 30 days: Final performance data                            │
│                                                              │
│ Reporting:                                                   │
│ - Daily digest: Yesterday's posts                            │
│ - Weekly report: Top performers, insights                    │
│ - Monthly: Strategic review, trend analysis                  │
└─────────────────────────────────────────────────────────────┘
                    ↓ LEARN & ADAPT
┌─────────────────────────────────────────────────────────────┐
│ AGENT: Learning Loop                                        │
│                                                              │
│ AI Security Thread Results:                                  │
│ - X: 12K impressions, 450 engagements (3.75% rate) ✓        │
│ - LinkedIn: 3K impressions, 120 engagements (4% rate) ✓     │
│                                                              │
│ Lessons:                                                     │
│ - "Security" topic performs 40% above avg                    │
│ - Morning posts on X outperform afternoon by 25%             │
│ - Thread format > single tweet (2.3x engagement)             │
│                                                              │
│ Actions:                                                     │
│ - Increase security content priority                         │
│ - Adjust X posting window preference to mornings             │
│ - Write to shared-learnings/content/                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Engagement Automation

**Philosophy:** Respond thoughtfully, not robotically. Quality over quantity.

### Template Library Structure

```
engagement-templates/
├── acknowledgment/
│   ├── thanks-simple.md
│   ├── thanks-detailed-feedback.md
│   └── appreciation-share.md
│
├── helpful/
│   ├── answer-technical-question.md
│   ├── provide-resource.md
│   ├── clarify-misunderstanding.md
│   └── offer-help.md
│
├── product-redirect/
│   ├── soft-intro.md               # "Have you tried...?"
│   ├── solution-fit.md             # "This sounds like exactly what X does"
│   └── community-invite.md         # "Join our Discord, we solve this"
│
├── conversation-starter/
│   ├── ask-follow-up.md
│   ├── share-related-insight.md
│   └── curious-about-use-case.md
│
├── escalation/
│   ├── complaint-acknowledge.md
│   ├── bug-report-thanks.md
│   └── flag-for-human.md
│
└── _meta/
    ├── template-performance.json   # Which templates work best
    └── usage-guidelines.md         # When to use each
```

### Template Examples

**File:** `engagement-templates/helpful/answer-technical-question.md`

```markdown
---
template: answer-technical-question
category: helpful
tone: technical-friendly
escalate_if: sentiment=negative OR complexity=high
---

# Answer Template: Technical Question

## Detection Pattern
- Contains question mark or "how to" / "why does"
- Mentions technical terms
- Sentiment: neutral or positive
- User context: developer/technical

## Response Structure

{{ if user_context_available }}
Hey {{ username }}, great question!

{{ answer_main_point }}

{{ if code_example_needed }}
Here's a quick example:
```{{ language }}
{{ code_snippet }}
```
{{ endif }}

{{ if relevant_docs }}
More details: {{ docs_link }}
{{ endif }}

{{ if appropriate_to_offer_help }}
If you're trying to {{ inferred_goal }}, happy to help troubleshoot!
{{ endif }}

{{ if natural_product_fit }}
(This is actually something {{ product_name }} handles well — {{ brief_value_prop }})
{{ endif }}

## Variables
- username: extract from comment
- answer_main_point: generated based on question
- code_example_needed: boolean, infer from question
- language: detect from context
- code_snippet: generate or pull from docs
- relevant_docs: search docs for matching content
- inferred_goal: what they're trying to accomplish
- natural_product_fit: boolean, only if >80% fit
- product_name: "OpenClaw"
- brief_value_prop: one-sentence value prop

## Rate Limits
- Max 3 technical answers per hour per platform
- Must vary wording (don't copy-paste)
- If 4+ similar questions in short time → escalate (might be bigger issue)
```

**File:** `engagement-templates/product-redirect/soft-intro.md`

```markdown
---
template: soft-intro
category: product-redirect
tone: casual-helpful
success_rate: 0.68
escalate_if: sentiment=negative OR previous_interaction=ignored_us
---

# Soft Product Introduction

## When to Use
- User describes a problem our product solves
- No explicit mention of competitors
- Sentiment: frustrated or curious
- Natural fit score >70%

## Response Structure

{{ empathize_with_problem }}

{{ brief_solution_hint }}

{{ if appropriate }}
I built {{ product_name }} for exactly this — {{ one_line_value_prop }}.

{{ if specific_feature_matches }}
The {{ feature_name }} feature handles {{ their_pain_point }} by {{ how_it_helps }}.
{{ endif }}

{{ soft_cta }}
{{ endif }}

## Examples

User: "Ugh, managing API keys across multiple agents is such a pain..."

Response:
"Yeah, it gets messy fast, especially when you're running multiple agents or testing.

I built OpenClaw for exactly this — secure credential management for AI agents without exposing keys in code.

The credential vault lets you store keys once and reference them by name. Agents authenticate via tokens, never see the actual keys.

Happy to share more if you're interested! (No pressure, just relating to the pain 😅)"

## Guidelines
- NEVER hard sell
- Only mention product if fit is >70%
- Always provide value first (empathy, insight, or tip)
- Respect if they don't engage
- Track: if user ignores 2+ mentions, stop mentioning product to them
```

### Sentiment Detection & Escalation

**Sentiment Classifier:**

```json
{
  "sentiment_model": "simple-rule-based + LLM fallback",
  
  "rules": {
    "positive": {
      "keywords": ["thanks", "great", "awesome", "love", "helpful", "exactly"],
      "emoji": ["❤️", "🙏", "🔥", "👍", "✅"],
      "score_threshold": 0.6
    },
    "negative": {
      "keywords": ["doesn't work", "broken", "hate", "terrible", "worst", "scam"],
      "emoji": ["😡", "👎", "💩"],
      "score_threshold": 0.6
    },
    "neutral": {
      "default": true
    }
  },
  
  "escalation_triggers": {
    "immediate": [
      "sentiment=negative AND mentions_product=true",
      "profanity_detected=true",
      "legal_threat=true",
      "security_concern=true"
    ],
    "review_before_responding": [
      "sentiment=negative",
      "controversial_topic=true",
      "high_profile_user=true",
      "complex_technical_question=true"
    ]
  }
}
```

**Engagement Decision Tree:**

```
New Comment/Reply Detected
    ↓
┌───────────────────────────────┐
│ Analyze Comment               │
│ - Sentiment                   │
│ - Intent (question/rant/etc)  │
│ - Topic relevance             │
│ - User context                │
└───────────────────────────────┘
    ↓
    Decision Point: Should we respond?
    ↓
    ├─→ [NO] ───→ sentiment=positive AND simple_thanks → React with emoji ❤️
    │              (no text response needed)
    │
    ├─→ [NO] ───→ off_topic OR spam → Ignore
    │
    ├─→ [ESCALATE] ───→ negative OR complex → Flag for Taylor
    │                    Log to engagement-queue/escalated/
    │                    Notify: "Comment needs review"
    │
    └─→ [YES] ───→ Proceed to template selection
                    ↓
               ┌────────────────────────────┐
               │ Select Template            │
               │ - Match intent to category │
               │ - Check rate limits        │
               │ - Personalize              │
               └────────────────────────────┘
                    ↓
               ┌────────────────────────────┐
               │ Generate Response          │
               │ - Fill template variables  │
               │ - Vary wording             │
               │ - Add personality          │
               └────────────────────────────┘
                    ↓
               ┌────────────────────────────┐
               │ Quality Check              │
               │ - Not too salesy?          │
               │ - Grammatically correct?   │
               │ - Appropriate tone?        │
               └────────────────────────────┘
                    ↓
               POST RESPONSE
                    ↓
               ┌────────────────────────────┐
               │ Track & Learn              │
               │ - Did they reply back?     │
               │ - Positive reaction?       │
               │ - Conversation length      │
               │ - Conversion event?        │
               └────────────────────────────┘
```

### Rate Limits (Don't Look Like a Bot)

**Platform-Specific Limits:**

```json
{
  "rate_limits": {
    "x": {
      "max_replies_per_hour": 5,
      "max_replies_per_day": 30,
      "min_delay_between_replies": 180,
      "max_replies_to_same_user_per_day": 2
    },
    "reddit": {
      "max_replies_per_hour": 3,
      "max_replies_per_day": 15,
      "max_replies_per_subreddit_per_day": 3,
      "min_delay_between_replies": 300
    },
    "linkedin": {
      "max_replies_per_hour": 4,
      "max_replies_per_day": 20,
      "min_delay_between_replies": 240
    }
  },
  
  "behavioral_patterns": {
    "vary_response_times": {
      "min": 120,
      "max": 900,
      "distribution": "human-like (peaks at 5-15 min)"
    },
    "active_hours": {
      "start": "08:00",
      "end": "22:00",
      "timezone": "America/New_York"
    },
    "response_ratio": {
      "engagement_to_response": 0.3,
      "description": "Respond to ~30% of engagements, not everything"
    }
  }
}
```

### Quality Tracking

**File:** `engagement-queue/_meta/quality-metrics.json`

```json
{
  "period": "2026-02-01 to 2026-02-07",
  
  "volume": {
    "total_engagements_detected": 142,
    "agent_responses": 38,
    "escalated_to_human": 8,
    "ignored": 96
  },
  
  "response_quality": {
    "reply_back_rate": 0.61,
    "positive_sentiment_replies": 0.82,
    "conversation_length_avg": 2.3,
    "conversion_events": 4
  },
  
  "by_template": {
    "helpful/answer-technical-question": {
      "used": 12,
      "reply_back_rate": 0.75,
      "avg_conversation_length": 3.1,
      "conversions": 2
    },
    "product-redirect/soft-intro": {
      "used": 8,
      "reply_back_rate": 0.50,
      "avg_conversation_length": 1.8,
      "conversions": 2
    }
  },
  
  "lessons": [
    "Technical answers perform best (75% reply rate)",
    "Soft product intros work when problem-fit is obvious",
    "Avoid responding to pure rants (0% positive outcomes)"
  ]
}
```

---

## 5. Outreach Automation

**Philosophy:** Personalized, value-first, patient follow-up. No spam.

### Template Sequence System

**Structure:**

```
outreach-templates/
├── sequences/
│   ├── cold-outreach-founder.json
│   ├── cold-outreach-developer.json
│   ├── warm-intro-from-community.json
│   └── partnership-proposal.json
│
├── messages/
│   ├── initial/
│   │   ├── founder-initial.md
│   │   ├── developer-initial.md
│   │   └── community-initial.md
│   │
│   ├── follow-up-1/  (3 days later)
│   │   ├── founder-followup-1.md
│   │   └── developer-followup-1.md
│   │
│   ├── follow-up-2/  (7 days later)
│   │   └── value-add-followup.md
│   │
│   └── follow-up-3/  (14 days later)
│       └── final-check-in.md
│
└── _meta/
    ├── sequence-performance.json
    └── personalization-rules.json
```

### Sequence Definition Example

**File:** `outreach-templates/sequences/cold-outreach-founder.json`

```json
{
  "sequence_id": "cold-outreach-founder",
  "name": "Cold Outreach: Indie Founder/Builder",
  "target_persona": "indie_founder",
  
  "qualification_criteria": {
    "has_product": true,
    "building_with_ai": true,
    "likely_pain_point": ["automation", "agent_management", "security"],
    "engagement_level": "active"
  },
  
  "steps": [
    {
      "step": 1,
      "template": "messages/initial/founder-initial.md",
      "delay_days": 0,
      "subject": "{{ personalized_subject }}",
      "required_research": ["recent_work", "pain_points", "tech_stack"]
    },
    {
      "step": 2,
      "template": "messages/follow-up-1/founder-followup-1.md",
      "delay_days": 3,
      "condition": "no_response",
      "subject": "Re: {{ original_subject }}"
    },
    {
      "step": 3,
      "template": "messages/follow-up-2/value-add-followup.md",
      "delay_days": 7,
      "condition": "no_response AND not_opened",
      "include_value_add": true,
      "value_add_options": ["relevant_article", "tool_recommendation", "insight"]
    },
    {
      "step": 4,
      "template": "messages/follow-up-3/final-check-in.md",
      "delay_days": 14,
      "condition": "no_response",
      "subject": "Last note",
      "final": true
    }
  ],
  
  "exit_conditions": [
    "response_received",
    "unsubscribe_requested",
    "bounce_or_invalid_email",
    "final_step_completed"
  ],
  
  "success_metrics": {
    "response_rate_target": 0.15,
    "positive_response_rate_target": 0.10,
    "meeting_booked_rate_target": 0.05
  }
}
```

### Message Template Example

**File:** `outreach-templates/messages/initial/founder-initial.md`

```markdown
---
template: founder-initial
sequence: cold-outreach-founder
step: 1
tone: casual-founder-to-founder
personalization_level: high
---

# Initial Outreach: Founder/Builder

## Required Research (Agent must complete before sending)
1. Recent work/project (last 30 days)
2. Known pain points (from posts, comments, github issues)
3. Tech stack (if available)
4. Mutual connections (if any)
5. Recent achievements or launches

## Subject Line Variations
- {{ first_name }}, saw your work on {{ recent_project }}
- Quick thought on {{ pain_point_you_mentioned }}
- {{ mutual_connection }} mentioned you might find this useful

## Message Body

Hey {{ first_name }},

{{ personalized_opener }}

{{ why_im_reaching_out }}

{{ openclaw_value_prop_specific_to_their_need }}

{{ soft_cta }}

{{ signature }}

---

## Variable Guidelines

### personalized_opener
**Must reference something specific:**
- Recent project/launch
- Problem they mentioned publicly
- Shared interest/community
- Mutual connection

**Examples:**
- "Saw your post about managing API keys for multiple agents — that's exactly the pain point that led me to build OpenClaw."
- "Your LangChain integration for [project] is really clever. Curious if you've run into credential management issues scaling it?"

### why_im_reaching_out
**Keep it honest and brief:**
- "I'm reaching out because..."
- "Building in a similar space and thought you'd relate..."
- "{{ mutual_connection }} mentioned you're working on agent automation..."

### openclaw_value_prop_specific_to_their_need
**Match their pain point:**
- If struggling with API keys → credential vault feature
- If coordinating agents → agent orchestration
- If security concerns → sandboxing + permission model

**One paragraph max. Specific, not generic.**

### soft_cta
**Never pushy:**
- "Happy to share more if you're curious — no pressure!"
- "Would love to hear how you're handling this, even if OpenClaw isn't a fit."
- "Let me know if you'd like to try it or if I can help with {{ their_problem }} in any way."

### signature
- {{ your_name }}
- {{ title }}
- {{ openclaw_url }}

---

## Full Example Output

Subject: Jeff, saw your work on LocalLLM

Hey Jeff,

Saw your post about managing API keys for multiple LLM agents — that's exactly the pain point that led me to build OpenClaw.

I'm reaching out because you mentioned wanting better isolation between agents without manually managing credentials for each one. OpenClaw handles this with a credential vault: agents authenticate via tokens, fetch keys at runtime, and never see the actual secrets.

Happy to share more if you're curious — no pressure! Would also love to hear how you're handling it now.

Taylor  
Founder, OpenClaw  
https://openclaw.com

---

## Quality Checks (Agent must pass before sending)
- [ ] Personalization is specific, not generic
- [ ] Subject references something real about recipient
- [ ] Value prop matches their stated pain point
- [ ] No salesy language or hype
- [ ] CTA is low-pressure
- [ ] Grammar and tone feel natural
- [ ] Email length <150 words
```

### Personalization Engine

**Research Checklist (Agent performs before sending):**

```json
{
  "recipient_research": {
    "required": [
      {
        "field": "recent_activity",
        "sources": ["x_timeline", "github_activity", "blog_posts"],
        "lookback_days": 30,
        "extract": "projects, launches, problems mentioned"
      },
      {
        "field": "pain_points",
        "sources": ["social_posts", "forum_comments", "github_issues"],
        "extract": "explicit problems, frustrations, feature requests"
      },
      {
        "field": "tech_stack",
        "sources": ["github_repos", "blog_posts", "linkedin"],
        "extract": "languages, frameworks, tools used"
      }
    ],
    
    "optional": [
      {
        "field": "mutual_connections",
        "sources": ["social_graph"],
        "value": "increases trust"
      },
      {
        "field": "achievements",
        "sources": ["social_posts", "product_hunt", "hackernews"],
        "extract": "launches, milestones, notable work"
      }
    ]
  },
  
  "personalization_score_required": 7,
  "personalization_scoring": {
    "10": "Mutual connection + recent relevant pain point + specific project reference",
    "7-9": "Recent pain point + specific project OR achievement",
    "4-6": "Generic pain point + industry/role",
    "1-3": "No personalization (DO NOT SEND)"
  }
}
```

**Personalization Process:**

```
1. Identify Target
   ↓
2. Run Research Checklist
   ↓
3. Score Personalization Potential (1-10)
   ↓
4. If score <7 → Skip or find more data
   ↓
5. Generate Personalized Subject + Opener
   ↓
6. Match Value Prop to Pain Point
   ↓
7. Quality Check (passes all criteria?)
   ↓
8. Add to Outreach Queue
```

### Follow-Up Cadence

**Timeline:**

```
Day 0: Initial Email Sent
   ↓
   Wait 3 days
   ↓
Day 3: Follow-Up #1 (if no response)
   Subject: Re: [original subject]
   Content: Brief, assumes they're busy, adds one new insight
   ↓
   Wait 4 days
   ↓
Day 7: Follow-Up #2 (if no response + not opened)
   Subject: Something useful regardless
   Content: Value-add (article, tool, insight) with no ask
   ↓
   Wait 7 days
   ↓
Day 14: Follow-Up #3 (final)
   Subject: Last note
   Content: "Breaking up" email, respectful close
   ↓
   End sequence (unless they respond)
```

**Conditions for Skipping Steps:**

- Email opened but not replied → skip to follow-up #3 (they saw it, not interested)
- Bounce/invalid → exit sequence immediately
- Unsubscribe/negative reply → exit sequence, mark as "do not contact"
- Out of office reply → pause sequence, resume after return date

### CRM-Lite: Contact Tracking

**File:** `outreach-crm/contacts/[contact-id].json`

```json
{
  "contact_id": "c_20260210_jeff_indie_founder",
  "email": "jeff@example.com",
  "name": "Jeff Daniels",
  
  "profile": {
    "persona": "indie_founder",
    "company": "LocalLLM",
    "role": "Founder",
    "twitter": "@jeffdaniels",
    "github": "jeffdaniels",
    "linkedin": "linkedin.com/in/jeffdaniels"
  },
  
  "qualification": {
    "fit_score": 85,
    "pain_points": ["api_key_management", "agent_coordination"],
    "tech_stack": ["python", "langchain", "openai"],
    "activity_level": "high"
  },
  
  "sequence": {
    "sequence_id": "cold-outreach-founder",
    "status": "active",
    "current_step": 2,
    "started_at": "2026-02-10T09:00:00Z",
    "next_action_at": "2026-02-13T09:00:00Z"
  },
  
  "interaction_history": [
    {
      "date": "2026-02-10T09:00:00Z",
      "type": "email_sent",
      "step": 1,
      "subject": "Jeff, saw your work on LocalLLM",
      "opened": false,
      "clicked": false
    }
  ],
  
  "status": "in_sequence",
  "tags": ["indie_founder", "ai_builder", "high_priority"],
  
  "notes": [
    {
      "date": "2026-02-10",
      "note": "Recently tweeted about API key rotation being a pain. Strong fit for OpenClaw."
    }
  ],
  
  "outcomes": {
    "response_received": false,
    "meeting_booked": false,
    "trial_started": false,
    "converted": false
  }
}
```

**CRM Dashboard (Agent View):**

```
outreach-crm/
├── contacts/              # Individual contact records
├── sequences/             # Active sequence tracking
│   ├── active.json       # Currently running sequences
│   ├── completed.json    # Finished sequences (success or exit)
│   └── paused.json       # Paused for manual review
│
├── pipelines/
│   ├── leads.json        # Potential contacts (pre-outreach)
│   ├── contacted.json    # In sequence
│   ├── responded.json    # Replied positively
│   ├── qualified.json    # Interested, next step: demo/trial
│   └── converted.json    # Became customers
│
└── _meta/
    ├── performance.json   # Outreach metrics
    └── do-not-contact.json  # Unsubscribes, bounces, negatives
```

**Performance Tracking:**

```json
{
  "period": "2026-02-01 to 2026-02-10",
  
  "volume": {
    "leads_identified": 45,
    "sequences_started": 38,
    "total_emails_sent": 52,
    "sequences_completed": 12
  },
  
  "response_metrics": {
    "response_rate": 0.18,
    "positive_response_rate": 0.13,
    "negative_response_rate": 0.03,
    "no_response_rate": 0.79
  },
  
  "conversion_metrics": {
    "meetings_booked": 4,
    "trials_started": 2,
    "converted_to_customer": 0
  },
  
  "by_sequence": {
    "cold-outreach-founder": {
      "started": 25,
      "response_rate": 0.20,
      "positive_rate": 0.16
    },
    "cold-outreach-developer": {
      "started": 13,
      "response_rate": 0.15,
      "positive_rate": 0.08
    }
  },
  
  "best_performing": {
    "subject_line": "{{ first_name }}, saw your work on {{ project }}",
    "opener": "pain_point_mention",
    "send_time": "Tuesday 9-11am EST"
  }
}
```

---

## 6. Content Calendar & Strategic Planning

### Content Calendar Structure

**File:** `content-queue/_meta/calendar.json`

```json
{
  "calendar_version": "2026-Q1",
  "updated_at": "2026-02-10",
  
  "weekly_themes": {
    "2026-W06": {
      "theme": "Security & Privacy",
      "campaign": "february-security-focus",
      "goal": "Position OpenClaw as security-first",
      "target_posts": 8,
      "platforms": ["x", "linkedin", "reddit"],
      "content_types": ["educational", "thought-leadership", "product-feature"],
      "hashtags": ["Security", "AI", "Privacy", "DevTools"]
    },
    "2026-W07": {
      "theme": "Agent Orchestration",
      "campaign": "february-security-focus",
      "goal": "Showcase multi-agent capabilities",
      "target_posts": 8,
      "platforms": ["x", "linkedin"],
      "content_types": ["tutorial", "use-case", "demo"]
    }
  },
  
  "monthly_goals": {
    "2026-02": {
      "content_posts": 32,
      "engagement_replies": 100,
      "outreach_sequences": 40,
      "focus_areas": ["security", "agent_orchestration", "community_building"]
    }
  },
  
  "campaigns": {
    "february-security-focus": {
      "start": "2026-02-01",
      "end": "2026-02-28",
      "objective": "Establish thought leadership in AI agent security",
      "key_messages": [
        "AI agents need better security than traditional apps",
        "API key exposure is a massive risk",
        "Sandboxing + credentials vault = best practice"
      ],
      "content_pillars": [
        "Educational: How agent security works",
        "Product: OpenClaw's security features",
        "Community: Share security tips, engage with builders"
      ]
    }
  },
  
  "recurring_content": {
    "monday": {
      "type": "week_kickoff",
      "content": "Thought leadership or industry insight"
    },
    "wednesday": {
      "type": "tutorial",
      "content": "How-to or educational thread"
    },
    "friday": {
      "type": "community_engagement",
      "content": "Ask questions, polls, conversation starters"
    }
  }
}
```

### Campaign Planning Process

**1. Strategic Input (Taylor):**
- Set monthly/quarterly themes
- Define campaigns with objectives
- Approve focus areas

**2. Agent Planning (Automated):**
- Break themes into weekly content
- Generate content ideas aligned to campaign
- Schedule across platforms
- Monitor progress vs. goals

**3. Execution (Agent + Batch Review):**
- Draft content
- Submit for review
- Publish approved content
- Track performance

**4. Performance Review (Weekly):**
- What's working? (engagement, conversions)
- What's not? (low performers, timing issues)
- Adjust strategy for next week

### Performance Feedback Loop

**Weekly Performance Report Template:**

```markdown
# Weekly Content Performance Report
**Week:** 2026-W06 (Feb 03-09)  
**Theme:** Security & Privacy

## Content Performance

### Top Performers
1. **"How AI Agents Handle Secrets" Thread**
   - Platform: X
   - Posted: Feb 05, 9:15am
   - Metrics: 12K impressions, 450 engagements (3.75%)
   - Why it worked: Timely (HN discussion), educational, practical examples

2. **"5 Security Mistakes Developers Make"**
   - Platform: LinkedIn
   - Posted: Feb 07, 8:30am
   - Metrics: 5K impressions, 280 engagements (5.6%)
   - Why it worked: List format, professional audience, actionable

### Low Performers
1. **"Weekend Thought: The Future of Agents"**
   - Platform: X
   - Posted: Feb 08, 11am (Saturday)
   - Metrics: 800 impressions, 12 engagements (1.5%)
   - Why it didn't work: Too abstract, weekend timing

## Engagement Summary
- Total replies: 28
- Agent responses: 12
- Escalated to human: 3
- Conversations started: 7
- Conversion events: 2 (trial signups from X thread)

## Strategic Insights
- **Security content is resonating:** 40% above average engagement
- **Morning posts outperform afternoon:** Especially on X
- **Educational > promotional:** "How to" beats "Here's our product"
- **Threads > single posts:** 2.3x engagement on multi-tweet threads

## Recommendations for Next Week
1. Double down on security content (theme extends through W07)
2. Focus on morning posting windows (8-11am EST)
3. More educational threads, fewer standalone tweets
4. Test Reddit: r/LocalLLaMA, r/LangChain (security angle)

## Campaign Progress: February Security Focus
- Posts published: 12 / 32 (38% of monthly goal)
- Engagement rate: 3.2% (above 2.5% target)
- Thought leadership mentions: 3 (external references to our content)
- On track: ✅
```

### Calendar Integration & Automation

**Heartbeat Task (2x daily):**

```
Check content calendar:
1. Are there content gaps this week?
   → Yes: Generate ideas to fill gaps
   
2. Is today a "recurring content" day?
   → Yes: Draft the scheduled content type
   
3. Are we behind on monthly goals?
   → Yes: Prioritize content creation
   
4. Any campaigns ending soon?
   → Yes: Plan wrap-up content + performance review
```

**Monthly Strategy Review (Automated Report):**

```markdown
# Monthly Strategy Review: February 2026

## Performance vs. Goals
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Content Posts | 32 | 34 | ✅ 106% |
| Engagement Replies | 100 | 87 | ⚠️ 87% |
| Outreach Sequences | 40 | 42 | ✅ 105% |
| New Trials | 10 | 8 | ⚠️ 80% |

## What Worked
- Security theme resonated (3.2% avg engagement vs. 2.1% baseline)
- X threads significantly outperformed single tweets
- Morning posting windows (8-11am EST) optimal

## What Didn't Work
- Weekend posts underperformed (save for weekdays)
- LinkedIn engagement lower than expected (need more testing)
- Promotional content flopped (stick to educational)

## Top Content
1. "How AI Agents Handle Secrets" (X thread) - 12K impressions
2. "5 Security Mistakes" (LinkedIn) - 5K impressions
3. "Agent Security Best Practices" (Reddit r/LocalLLaMA) - 180 upvotes

## Strategic Adjustments for March
1. **Theme:** Agent Orchestration & Use Cases
2. **Focus platforms:** X (primary), Reddit (growing), LinkedIn (test more)
3. **Content mix:** 60% educational, 30% use cases, 10% product
4. **Posting schedule:** Weekday mornings only, no weekends
5. **Engagement:** Increase reply target to 120/month
```

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Set up directory structure (`content-queue/`, `engagement-templates/`, `outreach-crm/`)
- [ ] Create content record schema
- [ ] Build basic content pipeline (idea → draft → review → post)
- [ ] Implement posting to one platform (X)
- [ ] Set up performance tracking basics

### Phase 2: Automation (Week 3-4)
- [ ] Automated posting with optimal timing
- [ ] Multi-platform adaptation (X, LinkedIn, Reddit)
- [ ] Engagement template library (5-10 templates)
- [ ] Basic sentiment detection
- [ ] Rate limiting for engagement

### Phase 3: Outreach (Week 5-6)
- [ ] Outreach template sequences
- [ ] Personalization engine research checklist
- [ ] CRM-lite tracking system
- [ ] Automated follow-up cadence

### Phase 4: Intelligence (Week 7-8)
- [ ] Performance analytics and reporting
- [ ] Learning loop (extract lessons → update strategy)
- [ ] Content calendar integration
- [ ] Weekly/monthly automated reports
- [ ] Feedback loop: performance → content strategy

### Phase 5: Optimization (Ongoing)
- [ ] A/B testing for subject lines, timing, templates
- [ ] Advanced personalization (deeper research)
- [ ] Cross-platform analytics
- [ ] Conversion attribution
- [ ] Template performance optimization

---

## 8. Key Principles & Guidelines

### Quality Over Quantity
- Better to post 1 great piece than 5 mediocre ones
- Only engage when you can add value
- Personalize outreach deeply or don't send it

### Human in the Loop
- Taylor approves content in batches (review queue)
- Agent escalates complex/sensitive engagement
- Never fully autonomous on controversial topics

### Learn & Adapt
- Every post is a data point
- Track what works, double down
- Track what doesn't, stop doing it
- Write lessons to `shared-learnings/`

### Don't Be Annoying
- Rate limits exist for a reason
- Respect people's time and inboxes
- "No response" is a response (stop following up)
- Quality engagement > volume

### Platform-Native
- X: Casual, punchy, threads
- LinkedIn: Professional, longer, thoughtful
- Reddit: Value-first, community-specific, authentic
- Substack: Deep dives, SEO, newsletter-friendly

### Transparency
- Don't hide that you're an AI agent (in bio/about)
- Be helpful, not deceptive
- If asked, be honest about automation level

---

## 9. Metrics That Matter

### Content Performance
- Engagement rate (not just impressions)
- Conversation starts (replies that lead somewhere)
- Conversion events (trials, signups, product interest)
- Share/repost rate (amplification)

### Engagement Quality
- Reply-back rate (did they respond to our response?)
- Positive sentiment ratio
- Escalation rate (lower is better, means agent handled it)
- Conversation length (deeper = better)

### Outreach Effectiveness
- Response rate (target: 15%+)
- Positive response rate (target: 10%+)
- Meeting/demo booked rate (target: 5%+)
- Conversion rate (target: 2%+)

### Strategic Health
- Content calendar adherence (are we shipping planned content?)
- Theme/campaign consistency (staying on message?)
- Learning velocity (lessons captured per week?)
- Automation coverage (what % runs without human intervention?)

---

## 10. Taylor's Dashboard (What Taylor Sees)

**Daily View:**
- 🟢 Posts scheduled today (3)
- 📥 Review queue (8 items pending)
- ⚠️ Escalations (2 comments flagged for review)
- 📊 Yesterday's performance (1 post, 2.8K impressions, 3.4% engagement)

**Weekly View:**
- 📅 This week's theme: Agent Orchestration
- 🎯 Progress: 6/8 posts done
- 💬 Engagement summary: 28 replies, 12 by agent, 3 escalated
- 📈 Top performer: "Multi-Agent Tutorial Thread"

**Monthly View:**
- 🏆 Campaign status: February Security Focus - on track
- 📊 Performance vs. goals (table view)
- 💡 Strategic insights (what's working, what's not)
- 🔄 Adjustments recommended for next month

**Actions Taylor Takes:**
- Batch review content (Mon/Wed/Fri mornings)
- Approve/edit/reject drafts
- Handle escalated engagements
- Review weekly/monthly reports
- Adjust strategy, themes, campaigns
- Give feedback to agent (agent learns from it)

---

## Appendix: File Templates

### content-record-template.json
```json
{
  "id": "YYYY-MM-DD-{slug}",
  "status": "idea|draft|review|approved|scheduled|posted|rejected",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "metadata": {
    "title": "",
    "slug": "",
    "priority": "high|medium|low",
    "platforms": [],
    "primary_platform": "",
    "content_type": "",
    "strategic_theme": "",
    "campaign": ""
  },
  "source": {
    "type": "",
    "origin": "",
    "url": "",
    "relevance_score": 0,
    "reasoning": ""
  },
  "timing": {
    "time_sensitivity": "urgent|high|medium|low",
    "optimal_window_start": "ISO8601",
    "optimal_window_end": "ISO8601",
    "scheduled_for": null,
    "posted_at": null
  },
  "content": {
    "master": "path/to/master.md",
    "adaptations": {}
  },
  "targeting": {
    "audience": [],
    "tone": "",
    "cta": "",
    "cta_url": "",
    "hashtags": []
  },
  "review": {
    "reviewed_by": null,
    "reviewed_at": null,
    "feedback": null,
    "revision_count": 0
  },
  "performance": {
    "predictions": {},
    "actual": null,
    "lessons_learned": null
  }
}
```

---

**END OF DOCUMENT**

*This is a living design doc. Implement, test, learn, iterate.*

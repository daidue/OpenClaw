## Automation Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                   MONITORING LAYER                      │
│  (Watch target accounts for new posts)                 │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│               OPPORTUNITY DETECTION                     │
│  (Filter for high-value reply opportunities)           │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│                 DRAFT GENERATION                        │
│  (Jeff: Generate contextual reply based on frameworks)  │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│                 HUMAN APPROVAL                          │
│  (Taylor: Approve/edit/reject)                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              RATE-LIMITED POSTING                       │
│  (2-5 minute randomized delay, post via bird CLI)      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              ENGAGEMENT TRACKING                        │
│  (Log results, measure what works)                     │
└─────────────────────────────────────────────────────────┘
```

---

### Technical Stack

**Core Tools:**
- **bird CLI** (`@steipete/bird`): X/Twitter command-line interface
  - Uses cookie auth (no API keys needed)
  - GraphQL-based, accesses X's internal endpoints
  - Commands: `bird mentions`, `bird search`, `bird reply`, `bird tweet`
  - Installation: `npm install -g @steipete/bird`

**Monitoring:**
- **bird search**: Monitor specific accounts/keywords
  - `bird search "from:@username" -n 20 --json`
  - `bird user-tweets @username -n 10 --json`
- **Cron job**: Run every 5-10 minutes to check for new posts
- **Storage**: SQLite database to track processed tweets (avoid duplicate replies)

**Notification System:**
- **OpenClaw Gateway**: Push notifications to Taylor's device
- **Priority queue**: High-value opportunities (viral potential, direct questions) flagged for immediate review

**Drafting System:**
- **Jeff (AI Agent)**: Analyzes tweet context, generates 2-3 reply options
- **Context inputs:**
  - Original tweet text
  - Thread context (if reply to another tweet)
  - Author's recent tweets (tone/topic continuity)
  - Our reply history (avoid repetitive patterns)
  - Relevant pillar/framework from playbook

**Approval Workflow:**
- **Option 1 (High-touch):** Taylor reviews every draft before posting
  - Best for early days (learning phase)
  - Telegram bot sends options, Taylor picks/edits/approves
  
- **Option 2 (Medium-touch):** Auto-post low-risk, Taylor reviews high-value
  - Low-risk: Simple insight adds, questions, resource shares
  - High-risk: Controversial takes, mentions of our product, complex threads
  
- **Option 3 (Low-touch):** AI posts most replies, Taylor reviews metrics
  - Once Jeff has learned Taylor's preferences (50-100 approved replies)
  - Taylor does weekly review of posted replies + metrics
  - Can always override or delete if something misses the mark

**Rate Limiting:**
```bash
# Randomized delay between replies (2-5 minutes)
post_reply() {
  tweet_id=$1
  reply_text=$2
  
  # Random delay: 120-300 seconds
  delay=$((120 + RANDOM % 180))
  echo "Waiting $delay seconds before posting..."
  sleep $delay
  
  # Post reply
  bird reply "$tweet_id" "$reply_text"
  
  # Log to database
  log_reply "$tweet_id" "$reply_text" "$(date +%s)"
}
```

**Engagement Tracking:**
- Store in database:
  - Tweet ID replied to
  - Our reply text and timestamp
  - OP's account and follower count
  - Reply performance after 1 hour, 24 hours, 7 days
    - Likes
    - Retweets
    - Replies to our reply
    - Profile visits (if measurable)
    - New followers (correlation analysis)

---

### Implementation Phases

#### Phase 1: Manual Baseline (Week 1-2)
**Goal:** Establish patterns, train Jeff's understanding

**Process:**
1. Taylor manually finds 5-10 reply opportunities per day
2. Taylor writes replies manually
3. Log what worked (engagement metrics)
4. Jeff observes and learns patterns

**Success metric:** 5-10 quality replies/day, 1-2 with good engagement (5+ likes)

---

#### Phase 2: AI-Assisted Drafting (Week 3-4)
**Goal:** Speed up drafting, maintain quality

**Process:**
1. Jeff monitors feeds via bird CLI
2. Jeff flags opportunities and generates 2-3 draft replies
3. Taylor reviews/edits/approves all replies (via Telegram)
4. Jeff posts via bird CLI with rate limiting
5. Track which draft options Taylor chooses (learning signal)

**Success metric:** 20-30 replies/day, 80%+ approval rate on first drafts

---

#### Phase 3: Semi-Automated (Week 5-8)
**Goal:** Scale volume, preserve authenticity

**Process:**
1. Jeff monitors feeds continuously
2. Jeff auto-posts low-risk replies (simple insight adds, questions)
3. Jeff flags high-risk replies for Taylor's approval (controversial, product mentions)
4. Taylor reviews high-risk + spot-checks low-risk replies
5. Weekly review session: what's working, what to adjust

**Success metric:** 40-50 replies/day, <5% require post-deletion, measurable follower growth

---

#### Phase 4: Optimized Automation (Week 9+)
**Goal:** Efficient, authentic, data-driven

**Process:**
1. Jeff handles 90% of replies autonomously
2. Taylor reviews weekly dashboards and metrics
3. Jeff learns from engagement data (double down on what works)
4. Taylor provides strategic direction (new accounts to target, topic pivots)

**Success metric:** 50+ replies/day, 10-20% generate meaningful engagement, steady follower growth

---

### Monitoring Workflow (Technical Detail)

**Cron Job (Every 10 minutes):**
```bash
#!/bin/bash
# monitor_targets.sh

# Load target accounts from config
TARGETS=(
  "@OpenClawAI"
  "@hwchase17"
  "@marc_louvion"
  # ... rest of target list
)

# Check each target for new tweets
for handle in "${TARGETS[@]}"; do
  # Fetch latest tweets (JSON output)
  tweets=$(bird user-tweets "$handle" -n 5 --json)
  
  # Parse tweets, check against database for new ones
  echo "$tweets" | jq -r '.[] | @json' | while read tweet; do
    tweet_id=$(echo "$tweet" | jq -r '.id')
    
    # Check if already processed
    if ! sqlite3 replies.db "SELECT 1 FROM processed WHERE tweet_id='$tweet_id'" 2>/dev/null; then
      # New tweet! Add to opportunity queue
      sqlite3 replies.db "INSERT INTO opportunities (tweet_id, handle, text, created_at, priority) 
        VALUES ('$tweet_id', '$handle', '$(echo "$tweet" | jq -r '.text')', '$(date +%s)', 'normal')"
      
      # Send notification to Taylor (via OpenClaw)
      notify_opportunity "$tweet_id" "$handle"
    fi
  done
done

# Process opportunity queue (highest priority first)
process_opportunities
```

**Opportunity Scoring (Priority Queue):**
```python
def score_opportunity(tweet):
    """Score reply opportunity (higher = more important)"""
    score = 50  # baseline
    
    # Boost for high-value accounts
    if tweet['author_followers'] > 100000:
        score += 30
    elif tweet['author_followers'] > 50000:
        score += 20
    
    # Boost for questions (explicit asks)
    if '?' in tweet['text']:
        score += 20
    
    # Boost for recent posts (time-sensitive)
    age_minutes = (now() - tweet['created_at']) / 60
    if age_minutes < 15:
        score += 30
    elif age_minutes < 60:
        score += 10
    
    # Boost for topics in our pillars
    if any(keyword in tweet['text'].lower() for keyword in 
           ['agent', 'automation', 'llm', 'prompt', 'workflow']):
        score += 25
    
    # Penalty for already crowded (too many replies)
    if tweet['reply_count'] > 50:
        score -= 20
    
    return score

# Process opportunities with score > 70 first
```

---

### Draft Generation (Jeff's Process)

**Input Context:**
```python
context = {
    'original_tweet': {
        'text': "...",
        'author': "@handle",
        'thread_context': [...],  # if part of thread
    },
    'author_profile': {
        'recent_tweets': [...],  # last 10 tweets
        'bio': "...",
        'followers': 50000,
    },
    'our_reply_history': {
        'to_this_author': [...],  # past replies to this person
        'recent_topics': [...],   # what we've been replying about
    },
    'playbook_frameworks': {
        'relevant_patterns': [...],  # which reply framework applies
        'topic_pillar': 'AI agents',
        'voice_guidelines': {...},
    }
}
```

**Generation Prompt (Simplified):**
```
You are Jeff, an AI agent helping Taylor build authority in AI/automation on Twitter.

CONTEXT:
- Original tweet: {tweet_text}
- Author: {author_name} ({author_followers} followers)
- Thread context: {thread_context}
- Our focus pillars: AI agents, automation, indie building

REPLY FRAMEWORKS (choose most relevant):
1. Insight Add: Agree + add new dimension with specifics
2. Experience Share: "Here's what we learned" with concrete details
3. Thoughtful Question: Deepen conversation with smart question
4. Devil's Advocate: Respectful counterpoint with nuance
5. Resource Pointer: Share valuable resource (not ours) + takeaway
6. "Yes, And" Riff: Build on their idea with related observation

VOICE & TONE:
- Technical + accessible + honest
- Specific (tools, numbers, timelines, examples)
- No corporate BS, no fake hype, no mansplaining
- Share failures and learnings openly

CONSTRAINTS:
- Max 280 characters (single reply preferred)
- Only mention our work if genuinely best answer (rare)
- No empty agreement ("Great post!")
- No naked self-promotion
- Must add unique value

Generate 2-3 reply options following these frameworks. For each:
- Label which framework you're using
- Explain why this approach fits the context
- Include the reply text
```

**Output Format:**
```json
{
  "options": [
    {
      "framework": "Experience Share",
      "reasoning": "OP is struggling with agent memory—we recently solved this.",
      "reply_text": "We hit this too. Switched from pure vector search to hybrid (vector + time-series). Cost went up 15% but error rate dropped 60%. Worth it for reliability.",
      "confidence": 0.85,
      "risk_level": "low"
    },
    {
      "framework": "Thoughtful Question",
      "reasoning": "Could deepen the conversation about memory tradeoffs.",
      "reply_text": "Interesting. At what scale does pure vector search break down for you? We found the inflection point around 10K stored interactions. Curious if that's universal or context-dependent.",
      "confidence": 0.75,
      "risk_level": "low"
    }
  ]
}
```

---

### Approval Interface (Telegram Bot)

**Message Format to Taylor:**
```
🔔 New Reply Opportunity

👤 @hwchase17 (85K followers)
⏱️ Posted 3 minutes ago
⭐ Priority: HIGH (viral potential)

📝 Original Tweet:
"Still trying to figure out the best way to handle long-term 
memory in LangChain agents. Vector stores feel like a hack."

---

💡 Option 1 (Experience Share - Confidence: 85%):
"We hit this too. Switched from pure vector search to hybrid 
(vector + time-series). Cost went up 15% but error rate dropped 60%. 
Worth it for reliability."

💡 Option 2 (Thoughtful Question - Confidence: 75%):
"Interesting. At what scale does pure vector search break down 
for you? We found the inflection point around 10K stored 
interactions. Curious if that's universal or context-dependent."

---

Actions:
[Post Option 1] [Post Option 2] [Edit] [Skip]
```

**Taylor's Response:**
- Tap button → posts immediately (with 2-5 min delay)
- Tap "Edit" → text field appears for modifications
- Tap "Skip" → marks opportunity as passed, logs reason (for learning)

---

### Engagement Tracking Dashboard

**Metrics to Track:**

**Reply-Level Metrics:**
- Likes, retweets, replies to our reply
- Original poster engagement (did OP respond?)
- Time to first like (speed of engagement)
- Third-party engagement (others engaging beyond OP)

**Account-Level Metrics:**
- New followers per day/week
- Profile visits per day/week
- Follower source attribution (if trackable)
- Engagement rate on our original posts (are replies driving authority?)

**Topic-Level Metrics:**
- Which pillars generate most engagement?
- Which frameworks (Insight Add, Experience Share, etc.) perform best?
- Which target accounts yield best ROI (engagement per reply)?

**Weekly Dashboard (Generated Automatically):**
```
📊 Weekly Reply Report (Feb 1-7, 2026)

Replies Posted: 287
Avg Engagement per Reply: 3.2 likes, 0.4 retweets
Top Performer: Reply to @marc_louvion (48 likes, 12 retweets)

📈 Growth:
- New Followers: +142 (vs +97 prior week)
- Profile Visits: 1,247 (vs 856 prior week)
- Follower:Visit Ratio: 11.4% (GOOD)

🎯 Topic Performance:
1. AI agents: 3.8 avg engagement ⭐
2. Automation: 3.1 avg engagement
3. Indie building: 2.7 avg engagement

🏆 Best Frameworks:
1. Experience Share: 4.2 avg engagement
2. Insight Add: 3.5 avg engagement
3. Thoughtful Question: 2.9 avg engagement

⚠️ Red Flags:
- 8 replies with 0 engagement (review for quality)
- 3 replies generated negative sentiment (review for tone)

💡 Recommendations:
1. Double down on AI agent topics (highest engagement)
2. More Experience Share replies (performing best)
3. Review low-engagement replies for pattern recognition
```

---

### Tools & Dependencies

**Required:**
- **bird CLI**: `npm install -g @steipete/bird`
- **jq**: JSON parsing (`brew install jq`)
- **SQLite**: Local database for tracking
- **cron**: Job scheduling (built-in on macOS/Linux)
- **OpenClaw Gateway**: Notification system to Taylor

**Optional:**
- **Python/Node.js**: For more complex opportunity scoring and analysis
- **Airtable/Notion**: Alternative to SQLite for opportunity tracking (if preferred)
- **Zapier/n8n**: Alternative workflow automation (if not using custom scripts)

**Database Schema (SQLite):**
```sql
-- Processed tweets (avoid duplicate replies)
CREATE TABLE processed (
  tweet_id TEXT PRIMARY KEY,
  handle TEXT,
  processed_at INTEGER
);

-- Opportunity queue
CREATE TABLE opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tweet_id TEXT UNIQUE,
  handle TEXT,
  text TEXT,
  created_at INTEGER,
  priority TEXT,
  score INTEGER,
  processed BOOLEAN DEFAULT 0
);

-- Our replies (engagement tracking)
CREATE TABLE replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tweet_id TEXT,
  reply_id TEXT,
  reply_text TEXT,
  posted_at INTEGER,
  framework TEXT,
  likes INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  last_updated INTEGER
);

-- Target accounts (performance tracking)
CREATE TABLE targets (
  handle TEXT PRIMARY KEY,
  follower_count INTEGER,
  replies_to_them INTEGER DEFAULT 0,
  avg_engagement REAL DEFAULT 0,
  active BOOLEAN DEFAULT 1
);
```

---
